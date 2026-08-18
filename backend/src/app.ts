import express from "express";
import cors from "cors";
import { authRouter } from "./routes/auth.js";
import { insuranceCompaniesRouter } from "./routes/insurance-companies.js";
import { searchRouter } from "./routes/search.js";
import { workOrdersRouter } from "./routes/work-orders.js";
import { teamNotesRouter } from "./routes/team-notes.js";
import { jobTypesRouter } from "./routes/job-types.js";

export function createApp() {
  const app = express();

  app.use(
    cors({
      origin: process.env.CORS_ORIGIN?.split(",") ?? ["http://localhost:3000"],
      credentials: true,
    })
  );
  app.use(express.json({ limit: "10mb" }));

  app.get("/health", (_req, res) => {
    res.json({ ok: true, service: "asist-crm-backend" });
  });

  app.use("/api/auth", authRouter);
  app.use("/api/insurance-companies", insuranceCompaniesRouter);
  app.use("/api/search", searchRouter);
  app.use("/api/work-orders", workOrdersRouter);
  app.use("/api/team-notes", teamNotesRouter);
  app.use("/api/job-types", jobTypesRouter);

  app.use((_req, res) => {
    res.status(404).json({ error: "Endpoint bulunamadı" });
  });

  app.use((err: unknown, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
    console.error(err);
    res.status(500).json({ error: "Sunucu hatası" });
  });

  return app;
}
