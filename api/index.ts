import type { VercelRequest, VercelResponse } from "@vercel/node";
import express from "express";

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

let initialized = false;

async function ensureInitialized() {
  if (!initialized) {
    try {
      const { registerRoutes } = await import("../server/routes");
      await registerRoutes(app);
      initialized = true;
    } catch (error) {
      console.error("Failed to initialize routes:", error);
      throw error;
    }
  }
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    await ensureInitialized();
    return app(req as any, res as any);
  } catch (error: any) {
    console.error("Handler error:", error);
    res.status(500).json({
      message: "Internal server error",
      error: error?.message || "Unknown error"
    });
  }
}
