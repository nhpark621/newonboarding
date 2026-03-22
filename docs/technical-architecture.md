# Technical Architecture — UNDERWATCH

> Developer reference for understanding how the codebase is structured, how data flows through the system, and why key decisions were made.

---

## 1. Overall Architecture Overview

UNDERWATCH is a **monorepo full-stack TypeScript application** served from a single port. The Express backend and the Vite-powered React frontend coexist in the same process — Express serves the API, and Vite's dev middleware (or the compiled static build in production) serves the frontend. There is no separate frontend server, no proxy configuration, and no CORS concerns.

```
┌─────────────────────────────────────────────────────┐
│                   Port 5000 (single)                 │
│                                                     │
│  ┌─────────────────┐     ┌───────────────────────┐  │
│  │  Express Server  │     │    Vite Middleware     │  │
│  │  /api/* routes  │     │  (dev) / static files  │  │
│  │                 │     │  (prod) — React SPA    │  │
│  └────────┬────────┘     └───────────────────────┘  │
│           │                                         │
│  ┌────────▼────────┐                               │
│  │    IStorage     │◄── MemStorage (dev)            │
│  │   interface     │◄── PostgreSQL (prod, future)   │
│  └─────────────────┘                               │
└─────────────────────────────────────────────────────┘
```

### Key architectural decisions

| Decision | Rationale |
|----------|-----------|
| Single port for API + frontend | Simplifies deployment; no CORS, no proxy |
| Shared `schema.ts` for both sides | Single source of truth for types; eliminates drift between frontend contracts and backend validation |
| In-memory storage in development | Zero setup friction for rapid iteration; swap to PostgreSQL for production via the same `IStorage` interface |
| No authentication system | Explicit product choice — business context only, not user identity |
| `staleTime: Infinity` on queries | API results (e.g. AI recommendations) are intentionally not re-fetched mid-session |

---

## 2. Monorepo Structure

```
/
├── client/                  # React SPA (Vite)
│   ├── index.html           # Entry HTML
│   └── src/
│       ├── main.tsx         # React mount point
│       ├── App.tsx          # Router definition
│       ├── index.css        # Design tokens (CSS custom properties) + Tailwind
│       ├── pages/           # Route-level components
│       ├── components/      # UI components (onboarding, shadcn/ui)
│       ├── lib/             # Shared utilities (queryClient, tracking)
│       └── hooks/           # Custom React hooks
│
├── server/                  # Express backend
│   ├── index.ts             # Server bootstrap, middleware, error handling
│   ├── routes.ts            # All API route handlers
│   ├── storage.ts           # IStorage interface + MemStorage implementation
│   ├── brandstore-service.ts # Domain discovery engine
│   └── vite.ts              # Vite dev middleware + static file serving
│
├── shared/
│   └── schema.ts            # Drizzle ORM schema + Zod validators + TypeScript types
│
├── vite.config.ts           # Vite build config + path aliases
├── tailwind.config.ts       # Tailwind + custom tokens
├── tsconfig.json            # Single TS config covering all three layers
└── drizzle.config.ts        # Drizzle Kit (DB migration tool)
```

### Path aliases (configured in both `vite.config.ts` and `tsconfig.json`)

```ts
"@/*"       → ./client/src/*        // Frontend components, hooks, pages
"@shared/*" → ./shared/*            // Types and schema (used on both sides)
"@assets/*" → ./attached_assets/*   // Static brand assets (logo, icons)
```

---

## 3. Main Modules and Their Roles

### `server/index.ts` — Bootstrap & Middleware

Entry point for the entire server process. Responsibilities:

1. Creates the Express app
2. Mounts JSON body parsing (`express.json()`, `express.urlencoded()`)
3. Attaches **request logging middleware** that intercepts all `/api/*` calls and logs method, path, status code, duration, and truncated response body
4. Calls `registerRoutes()` to attach API handlers
5. Attaches the global **error handling middleware** (must come after routes)
6. Starts either Vite dev middleware (development) or static file serving (production)
7. Binds to `0.0.0.0:PORT` (default `5000`)

```ts
// Request logger — monkey-patches res.json to capture response body
const originalResJson = res.json;
res.json = function (bodyJson, ...args) {
  capturedJsonResponse = bodyJson;
  return originalResJson.apply(res, [bodyJson, ...args]);
};
```

---

### `server/routes.ts` — API Route Handlers

All API endpoints are defined here via `registerRoutes(app)`. The module is intentionally thin — it validates inputs with Zod, delegates persistence to `storage`, and delegates complex logic to service modules.

**Pattern followed by every route:**
```ts
app.post("/api/example", async (req, res) => {
  try {
    const data = schema.parse(req.body);    // 1. Validate with Zod
    const result = await storage.doThing(data); // 2. Delegate to storage
    res.json(result);                       // 3. Return result
  } catch (error) {
    res.status(400).json({ message: "..." }); // 4. Consistent error shape
  }
});
```

---

### `server/storage.ts` — Storage Abstraction

Defines the `IStorage` interface and `MemStorage` implementation.

**Why an interface?**

The `IStorage` interface decouples all route handlers from the underlying storage mechanism. Swapping from in-memory to PostgreSQL requires only providing a new class implementing the same interface — no route changes needed.

```ts
export interface IStorage {
  getUser(id: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  createOnboardingSession(session: InsertOnboardingSession): Promise<OnboardingSession>;
  getOnboardingSessionByUserId(userId: string): Promise<OnboardingSession | undefined>;
  createChannel(channel: InsertChannel): Promise<Channel>;
  getChannelsByType(type: string): Promise<Channel[]>;
  createEventPage(eventPage: InsertEventPage): Promise<EventPage>;
  getEventPagesByChannelId(channelId: string): Promise<EventPage[]>;
}
```

**`MemStorage` implementation:**

- Uses four `Map<string, T>` objects as in-memory stores
- Generates UUIDs via Node's built-in `crypto.randomUUID()`
- Fills in nullable fields and timestamps on write (mirrors what a real DB would do)
- Data is lost on server restart — intentional for development/demo

```ts
export class MemStorage implements IStorage {
  private users: Map<string, User> = new Map();
  private onboardingSessions: Map<string, OnboardingSession> = new Map();
  private channels: Map<string, Channel> = new Map();
  private eventPages: Map<string, EventPage> = new Map();
}

export const storage = new MemStorage(); // Singleton exported for use in routes
```

---

### `server/brandstore-service.ts` — Domain Discovery Engine

A pure-function service module with no dependencies on Express or storage. All exported functions are independently testable.

**Function responsibilities:**

| Function | Type | Description |
|----------|------|-------------|
| `generateDomainCandidates(name)` | Pure | Generates 9 domain URL candidates from a competitor name (strips Korean legal suffixes, applies TLD/subdomain variations) |
| `probeDomain(url)` | Async | Sends a `HEAD` request with 5s timeout; returns `{ url, isValid }` |
| `detectPlatform(html, url)` | Pure | Classifies e-commerce platform from HTML fingerprints |
| `generateEventRoutes(baseUrl, platform)` | Pure | Returns a list of candidate event URL paths, generic + platform-specific |
| `fetchAndExtractLinks(url)` | Async | Fetches a page and extracts all `href` links via regex; 10s timeout |
| `scoreEventRoute(url, baseUrl, competitor)` | Pure | Scores a URL 0–8 based on domain match, event keywords, platform paths, competitor name |
| `discoverEventRoutes(baseUrl, competitor)` | Async | Orchestrates platform detection + route generation + link extraction + scoring |
| `mockPickCompetitors(product)` | Pure | Returns industry-specific competitor defaults when user skips the field |

---

### `shared/schema.ts` — Single Source of Truth

The schema file is the **contract layer** shared between frontend and backend. It is imported by both `server/routes.ts` (for Zod validation) and `client/src` (for TypeScript types).

**Schema layers for each entity:**

```ts
// 1. Drizzle ORM table definition (maps to DB columns)
export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  company: text("company").notNull(),
  team: text("team").notNull(),
  product: text("product").notNull(),
  competitors: text("competitors").array(),
  createdAt: timestamp("created_at").defaultNow(),
});

// 2. Insert schema — Zod validator for incoming data (omits auto-generated fields)
export const insertUserSchema = createInsertSchema(users).pick({
  company: true,
  team: true,
  product: true,
  competitors: true,
});

// 3. TypeScript types inferred from the schema
export type InsertUser = z.infer<typeof insertUserSchema>; // For POST bodies
export type User = typeof users.$inferSelect;              // For DB reads
```

This pattern is repeated for all four entities: `users`, `onboardingSessions`, `channels`, `eventPages`.

---

### `client/src/lib/queryClient.ts` — HTTP Client Foundation

All frontend API calls flow through two exports from this file.

**`apiRequest(method, url, data?)`** — Used in `useMutation` calls for state-changing operations:

```ts
export async function apiRequest(
  method: string,
  url: string,
  data?: unknown,
): Promise<Response> {
  const res = await fetch(url, {
    method,
    headers: data ? { "Content-Type": "application/json" } : {},
    body: data ? JSON.stringify(data) : undefined,
    credentials: "include",
  });
  await throwIfResNotOk(res); // Throws on non-2xx; caller handles the error
  return res;                  // Caller calls .json() themselves
}
```

**`queryClient`** — TanStack Query instance with hardened defaults:

```ts
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      queryFn: getQueryFn({ on401: "throw" }), // Default GET fetcher using queryKey as URL
      refetchInterval: false,       // No background polling
      refetchOnWindowFocus: false,  // No refetch on tab focus
      staleTime: Infinity,          // Cache never goes stale mid-session
      retry: false,                 // Fail fast; don't retry API errors
    },
    mutations: { retry: false },
  },
});
```

---

## 4. Component Structure

### Hierarchy

```
App.tsx  (QueryClientProvider + TooltipProvider + Router)
├── /        → Home.tsx  (onboarding orchestrator)
│   ├── ProgressIndicator
│   ├── Step1  (concern input)
│   ├── [Loading screen — inline JSX in Home]
│   ├── Step2  (service selection)
│   └── Step3  (business info form + success modal)
│
└── /dashboard → Dashboard.tsx  (demo dashboard)
```

### Component communication pattern

Components communicate **upward via callback props** only. There is no Context, no event bus, and no shared store. The parent (`Home`) owns all cross-step state.

```
Home
  ├── state: currentStep, onboardingData, showMatching, matchingStage
  │
  ├── Step1 ──onComplete(userConcern)──────────► Home updates onboardingData.userConcern
  ├── Step2 ──onComplete(selectedServices)──────► Home updates onboardingData.selectedServices
  └── Step3 ──onComplete(userData)──────────────► Home navigates to /dashboard
```

---

## 5. Data Flow and State Handling

### State categories

| Category | Mechanism | Scope | Persistence |
|----------|-----------|-------|-------------|
| Step navigation | `useState` in `Home` | Session | Lost on refresh |
| User's typed concern | `useState` in `Home` (via callback) | Session | Lost on refresh |
| Selected services | `useState` in `Home` (via callback) | Session | Lost on refresh |
| AI recommendations | TanStack Query cache | Session | Lost on refresh |
| Business form values | React Hook Form (controlled) | Step 3 | Lost on navigation |
| Dashboard user context | `localStorage` | Browser | Persists across refreshes |
| Discovered brand stores | `useState` in `Dashboard` | Session | Lost on refresh |

### Cross-page data passing

When Step 3 submits successfully, user data is written to `localStorage` before navigating to `/dashboard`:

```ts
// Step3.tsx — on "대시보드 시작하기" click
localStorage.setItem('onboarding_user_data', JSON.stringify({
  company, team, product, competitors
}));
```

```ts
// Dashboard.tsx — at component initialization
const userData = JSON.parse(
  localStorage.getItem('onboarding_user_data') || '{}'
);
const competitors = userData.competitors || [];
const productOrService = userData.product || '';
```

This avoids passing data via URL params or query strings while keeping the implementation simple for an MLP.

### Onboarding state accumulation in `Home`

```ts
// Home.tsx internal state
const [onboardingData, setOnboardingData] = useState<OnboardingData>({
  userConcern: "",
  selectedServices: [],
});

// Step 1 completion
const handleStep1Complete = (userConcern: string) => {
  setOnboardingData(prev => ({ ...prev, userConcern }));
  // triggers loading animation, then transitions to Step 2
};

// Step 2 completion
const handleStep2Complete = (selectedServices: string[]) => {
  setOnboardingData(prev => ({ ...prev, selectedServices }));
  setCurrentStep(3);
};
```

### Candidate selection in Dashboard (`Set<string>`)

```ts
// Key format: `${competitor}-${baseUrl}`
const [selectedCandidates, setSelectedCandidates] = useState<Set<string>>(new Set());

const handleToggleCandidate = (key: string) => {
  const newSelected = new Set(selectedCandidates);
  newSelected.has(key) ? newSelected.delete(key) : newSelected.add(key);
  setSelectedCandidates(newSelected);
};
```

---

## 6. API Communication Logic

### GET requests — TanStack Query with automatic URL-as-key

TanStack Query's default `queryFn` (configured in `queryClient.ts`) uses the `queryKey` array joined as a URL path. This means GET endpoints are called simply by providing the path as the key:

```ts
// Step2.tsx — fires automatically on mount
const { data: recommendations, isLoading } = useQuery({
  queryKey: ['/api/recommend-services'],
  queryFn: async () => {
    // Manual override for POST-based "GET" (AI recommendation is a POST)
    const response = await apiRequest('POST', '/api/recommend-services', {
      userInput: userConcern
    });
    return response.json();
  }
});
```

Note: The AI recommendation call is technically a `POST` (because it sends a body), but it is treated as a query (read operation with caching) since the result should not change mid-session.

### POST/mutation requests — `useMutation` + `apiRequest`

```ts
// Step3.tsx — submit business information
const registerMutation = useMutation({
  mutationFn: async (userData: FormData) => {
    const response = await apiRequest('POST', '/api/register', {
      company: userData.company,
      team: userData.team,
      product: userData.product,
      competitors,
    });
    return response.json();
  },
  onSuccess: (user) => {
    // Fire-and-forget: create session record, then show success modal
    apiRequest('POST', '/api/onboarding-session', {
      userConcern: onboardingData.userConcern,
      selectedServices: onboardingData.selectedServices,
      userId: user.id,
    });
    setShowSuccessModal(true);
  },
  onError: (error) => {
    console.error('Registration failed:', error);
  },
});
```

### Mutation loading state drives UI

The `isPending` flag from mutations is used directly in the UI to disable buttons and show spinners. No extra `isLoading` state variables are needed:

```ts
// Dashboard.tsx — discovery button
<Button
  onClick={() => discoverMutation.mutate()}
  disabled={discoverMutation.isPending}
>
  {discoverMutation.isPending ? "탐색 중..." : "브랜드 스토어 탐색"}
</Button>
```

**Important:** Using `isPending` instead of a manual `isLoading` flag means the button correctly re-enables after both success *and* error, preventing permanent disabled states.

### Error handling strategy

| Layer | Strategy |
|-------|----------|
| `apiRequest` | Throws on non-2xx via `throwIfResNotOk` |
| `useMutation.onError` | Currently logs to console; can be extended to show toast |
| AI recommendation endpoint | Returns hardcoded fallback on any error — never returns 500 to the client |
| Brand store discovery | Returns `candidates: []` on error — graceful empty state |
| All other endpoints | Returns `400`/`500` with `{ message: string }` |

---

## 7. Brand Store Discovery Pipeline

This is the most complex backend subsystem. The pipeline runs **sequentially per competitor** (no parallelism currently):

```
For each competitor:
  1. generateDomainCandidates(name)
     → ["https://name.com", "https://name.co.kr", ...]

  2. For each candidate domain:
     probeDomain(url)  [HEAD request, 5s timeout]
     → { url, isValid: boolean }
     → Collect up to 3 valid domains, then break

  3. For each valid domain:
     discoverEventRoutes(baseUrl, competitor)
       a. Fetch homepage HTML  [GET, 10s timeout]
       b. detectPlatform(html) → "cafe24" | "godomall" | ...
       c. generateEventRoutes(baseUrl, platform)
          → platform-specific paths + 9 generic paths
       d. fetchAndExtractLinks(baseUrl)
          → All href links from homepage
       e. Filter extracted links by event keywords
       f. Combine + deduplicate (Set) + score each URL
       g. Return top 10 by score

  4. Compute average score across routes for this domain
  5. Push to candidates[]

Sort all candidates by score descending → return
```

### Platform detection fingerprints

```ts
function detectPlatform(html: string, url: string): string {
  // Cafe24: generator meta tag OR class prefix "xans-" OR path patterns
  if (html.includes('class="xans-') || html.includes('/product/list.html')) return "cafe24";

  // Godomall: path pattern or vendor strings
  if (html.includes('/event/event.html') || html.includes('godosoft')) return "godomall";

  // MakeShop: makeshop.co.kr reference or path prefix
  if (html.includes('makeshop.co.kr') || html.includes('_makeshop')) return "makeshop";

  // Shopify: CDN domain
  if (html.includes('cdn.shopify.com')) return "shopify";

  // WordPress: generator meta or wp-content path
  if (html.includes('wp-content') || html.includes('woocommerce')) return "wordpress";

  return "generic";
}
```

### Scoring rubric

```ts
function scoreEventRoute(url: string, baseUrl: string, competitorName: string): number {
  let score = 0;
  if (url.startsWith(baseUrl))                          score += 3; // Same domain
  if (["event","promo","sale","campaign"].some(...))    score += 2; // Event keyword
  if (["/board/event","/event/event",...].some(...))    score += 2; // Platform path
  if (url.includes(sanitizedCompetitorName))            score += 1; // Name in URL
  return score; // Max: 8
}
```

---

## 8. Styling and Design System

### CSS custom properties (design tokens)

All color and spacing values are defined as CSS custom properties in `client/src/index.css` and referenced by Tailwind through `tailwind.config.ts`. This means all shadcn/ui components automatically inherit the brand palette.

```css
:root {
  --primary:   hsl(207, 100%, 48.8%);   /* Brand blue — rgb(0, 91, 249) approx */
  --accent:    hsl(42, 100%, 50%);      /* Brand orange — rgb(255, 179, 0) approx */
  --secondary: hsl(210, 40%, 96.1%);   /* Light blue-grey background panels */
  --radius:    0.75rem;                 /* Global border radius */
}
```

Dark mode tokens are defined in the `.dark` class (toggled via `darkMode: ["class"]` in Tailwind config).

### Component animation classes

```css
.fade-in  { animation: fadeIn 0.5s ease-in; }     /* Page transitions */
.slide-up { animation: slideUp 0.3s ease-out; }   /* Step entry animations */
.service-card:hover { transform: translateY(-4px); } /* Card lift effect */
```

---

## 9. Build System

### Development

```
npm run dev
→ tsx server/index.ts
→ Express starts on :5000
→ setupVite() mounts Vite in middleware mode
→ HMR via WebSocket over the same server
```

The Vite dev server runs **inside the Express process** (not as a separate process). This is why no proxy configuration is needed and API calls from the frontend just work as same-origin requests.

### Production build

```
npm run build
→ vite build          # Compiles React to dist/public/
→ esbuild server/...  # Compiles Express server to dist/index.js

npm run start
→ node dist/index.js
→ Express serves dist/public/ as static files
→ SPA catch-all serves index.html for any non-API route
```

### TypeScript configuration

A single `tsconfig.json` covers all three layers (client, server, shared):

```json
{
  "include": ["client/src/**/*", "shared/**/*", "server/**/*"],
  "compilerOptions": {
    "strict": true,
    "module": "ESNext",
    "moduleResolution": "bundler",
    "paths": {
      "@/*": ["./client/src/*"],
      "@shared/*": ["./shared/*"]
    }
  }
}
```

The `noEmit: true` flag means TypeScript is used for type-checking only. Actual compilation is handled by Vite (frontend) and esbuild (backend).

---

## 10. Key Design Decisions

### Decision 1: No authentication

**Choice:** The entire app operates without user accounts, sessions, or passwords.

**Rationale:** The product is an MLP designed to minimize conversion friction. Requiring email/password would reduce completion rates. Business context (company, team, product) is sufficient to personalize the demo experience.

**Implications:**
- No `express-session`, `passport`, or JWT required despite these packages being present in `package.json` (legacy from the initial template)
- `localStorage` is used for cross-page data transfer instead of a session store
- Data is not tied to a persistent identity — each submission creates a new user record

### Decision 2: `shared/schema.ts` as the type contract

**Choice:** Drizzle ORM table definitions, Zod validators, and TypeScript types are all derived from a single source in `shared/schema.ts`.

**Rationale:** Eliminates the common problem of frontend types drifting from what the backend actually accepts. Any schema change automatically propagates type errors to both sides.

**Pattern:**
```
pgTable definition
  → createInsertSchema (drizzle-zod)     ← used in routes.ts for validation
  → z.infer<typeof insertSchema>         ← InsertUser, InsertChannel, etc.
  → typeof table.$inferSelect            ← User, Channel, etc.
```

### Decision 3: `staleTime: Infinity` on queries

**Choice:** TanStack Query is configured to never consider cached data stale.

**Rationale:** The AI recommendation result for Step 2 should not be re-fetched if the user navigates back and forward between steps. The data is only valid for the current session context anyway.

**Implication:** To force a re-fetch, the component must explicitly call `queryClient.invalidateQueries()` — it will not happen automatically.

### Decision 4: Sequential (not parallel) domain probing

**Choice:** The brand store discovery endpoint processes competitors and their domains sequentially using `for...of` loops.

**Rationale:** Simplicity and safety. Parallel probing would require managing concurrency limits (rate limiting against target sites). Sequential processing makes timeout behavior predictable.

**Implication:** Discovery time scales linearly: `N competitors × M domain candidates × ~5s timeout`. For 3 competitors with 9 candidates each, worst case is 135 seconds if all domains time out. Practically, most invalid domains fail fast with connection refused.

### Decision 5: `discoverMutation.isPending` for button state

**Choice:** The discovery button's disabled state is driven by `mutation.isPending` rather than a separate `isDiscovering` state variable.

**Rationale:** A manual `useState` flag that is set on click and cleared only on success will leave the button permanently disabled if the API call fails. `isPending` is automatically `false` after any terminal state (success, error, or cancellation).

---

## 11. Assumptions and Limitations

### Current limitations

| Area | Limitation |
|------|-----------|
| **Storage** | All data is in-memory — lost on server restart. No persistence between sessions |
| **Discovery** | Domain probing runs sequentially; no concurrency. Times out with no result in restricted network environments (e.g. test/sandbox containers) |
| **Platform detection** | HTML fingerprint matching is heuristic, not definitive. Some platforms may be misidentified or classified as `generic` |
| **Domain generation** | Competitor name sanitization only handles basic Latin + Hangul. Names with special characters or acronyms may not produce valid domain guesses |
| **Error surfacing** | Mutation errors are currently logged to console only. No UI toast or error message is shown to the user on registration failure |
| **Session isolation** | `localStorage` stores only the most recent onboarding session. Multiple tabs or sessions overwrite each other |
| **OpenAI dependency** | The `/api/recommend-services` endpoint has a silent fallback to hardcoded services, but production reliability depends on API key availability |
| **No auth** | Any user can reach `/dashboard` directly without completing onboarding |

### Assumed deployment environment

- **Node.js 20+** with ESM support (`"type": "module"` in package.json)
- **Single instance** — MemStorage is not shared across multiple processes. Horizontal scaling requires replacing MemStorage with a real database
- **Single port exposed** — the entire application (API + frontend) must be reachable on one port (default 5000, configurable via `PORT` env var)
- **`OPENAI_API_KEY`** — must be set in the environment for AI recommendations to work

### PostgreSQL migration path

To migrate from MemStorage to PostgreSQL:

1. Set `DATABASE_URL` environment variable (Neon Serverless connection string)
2. Run `npm run db:push` to push the Drizzle schema
3. Implement a `PgStorage` class that satisfies `IStorage` using Drizzle ORM queries
4. Replace `export const storage = new MemStorage()` with `export const storage = new PgStorage(db)` in `storage.ts`
5. No changes required in `routes.ts` or anywhere else

```ts
// Future PgStorage skeleton
import { drizzle } from "drizzle-orm/neon-serverless";
import { Pool } from "@neondatabase/serverless";

class PgStorage implements IStorage {
  private db = drizzle(new Pool({ connectionString: process.env.DATABASE_URL }));

  async createUser(insertUser: InsertUser): Promise<User> {
    const [user] = await this.db.insert(users).values(insertUser).returning();
    return user;
  }
  // ...
}
```
