# Replit AI — Brand **Direct Store** Event Finder (Step D · Events)

## Context
- Onboarding steps (1–4) are already implemented.
- Among the six competitor‑analysis items on the dashboard, we are starting with **Events Monitoring**.
- **Scope of this task:** Automatically discover and save **event pages on brand-operated direct stores** for the monitored competitors. (No detail parsing yet.)

## Inputs
- From Onboarding Step 4: `company`, `team`, `productOrService`, `competitors[]`
- If `competitors[]` is empty, use `mockPickCompetitors(productOrService)` to populate defaults.

## What to Build (Scope)
1) **Generate brand direct‑store domain candidates**
   - For each competitor name, generate base URL candidates:
     - `brand.com`, `brand.co.kr`, `brand.kr`
     - `store.brand.com`, `shop.brand.com`, `brandstore.brand.com`, `brand.co.kr/shop`
   - Probe candidates and keep those returning HTTP 200 with HTML content.

2) **Lightweight platform detection (heuristics)**
   - **Cafe24:** `meta[name*="generator"][content*="Cafe24"]`, class prefix `xans-`, paths like `/board/`, `/product/list.html`
   - **Godomall:** paths `/event/event.html` or `/event/event.php`, `godo`/`eclog` scripts
   - **MakeShop:** paths under `/shop/`, `_makeshop` scripts
   - **Shopify:** `cdn.shopify.com`, `meta[name^="shopify-"]`
   - **WordPress / WooCommerce:** `meta[name="generator"][content*="WordPress"]`, `woocommerce` artifacts
   - If none match, mark as **Generic**.

3) **Discover event/promotion routes on the direct store**
   - Global keywords to probe: `/event`, `/events`, `/promotion`, `/promo`, `/benefit`, `/campaign`, `/sale`, `/notice`, `/news`
   - **Cafe24-specific:** `/board/event/list.html`, `/board/free/list.html?board_no=*`
   - **Godomall-specific:** `/event/event.html`, `/event/event.php`
   - **MakeShop-specific:** `/shop/event.html`, `/shop/event.php`
   - **Shopify / WordPress:** `/pages/events`, `/blogs/events`, `/category/event(s)`, `/tag/event`
   - Crawl navigation, footer, sitemap, and mega‑menus; collect anchors → normalize to absolute URLs.

4) **Scoring & approval UI**
   - Score = **Official domain(+3)** + **Event keyword match(+2)** + **Platform‑specific match(+2)** + **Competitor name match(+1)**
   - Show top N (e.g., 3–5) candidates with scores; user can approve selected ones.

5) **Persist approved results**
   - `Channel { id, type: "brand_store", competitorId, name, baseUrl, createdAt }`
   - `EventPage { id, channelId, url, status: "new", discoveredAt }`
     *(Do not run detail extraction here.)*

6) **Minimal UI in Dashboard (Step D · Events)**
   - Section: **“Find event routes on brand direct stores”**
   - Table with: base domain, detected platform, candidate event paths, score, checkbox
   - Button **[Save selections]** → upsert `Channel` + `EventPage[]` and show success toast

## APIs
```
POST /api/brandstore/discover
  body: { competitors: string[], productOrService?: string }
  resp: { candidates: [{ competitor, baseUrl, platform, eventPaths: string[], score }] }

POST /api/brandstore/approve
  body: { selections: [{ competitor, baseUrl, eventPaths: string[] }] }
  resp: { channels: [...], eventPages: [...] }
```

## Acceptance Criteria
- For each competitor, propose **≥ 1 direct‑store candidate** and **≥ 1 event route**.
- Approved selections are persisted as `Channel(type="brand_store")` and `EventPage(status="new")`.
- After page refresh, the saved selections are restored from storage.

## Notes
- Respect **robots.txt** and the site’s **Terms of Service**. If a route is behind login, **store the link only**.
- For infinite‑scroll or client‑side rendered lists, **collect only the route** in this step; detail extraction is a later phase.
- This step feeds into the Events flow (Link → Detail 7‑fields extraction) to be implemented next.
