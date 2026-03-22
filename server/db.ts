import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "../shared/schema";

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  console.warn("DATABASE_URL not set — falling back to in-memory storage");
}

const client = connectionString
  ? postgres(connectionString, { prepare: false })
  : (null as any);

export const db = client ? drizzle(client, { schema }) : null;
