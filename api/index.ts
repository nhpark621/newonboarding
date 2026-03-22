import type { VercelRequest, VercelResponse } from "@vercel/node";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    const express = await import("express");
    const app = express.default();
    app.use(express.default.json());
    app.use(express.default.urlencoded({ extended: false }));

    const { registerRoutes } = await import("../server/routes.js");
    await registerRoutes(app);

    return app(req as any, res as any);
  } catch (error: any) {
    console.error("Handler error:", error);
    res.status(500).json({
      message: "Internal server error",
      error: error?.message || "Unknown error",
      stack: error?.stack?.split("\n").slice(0, 5),
    });
  }
}
