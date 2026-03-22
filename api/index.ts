import express from "express";
import { registerRoutes } from "../server/routes";

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// Register all API routes
let initialized = false;

async function ensureInitialized() {
  if (!initialized) {
    await registerRoutes(app);
    initialized = true;
  }
}

// Vercel serverless handler
export default async function handler(req: any, res: any) {
  await ensureInitialized();
  return app(req, res);
}
