import express from "express";
import { fileURLToPath } from "node:url";
import applicationsRouter from "./routes/applications.routes.js";

const app = express();

app.use(express.json({ limit: "16kb" }));

app.get("/api/health", (req, res) => {
  res.status(200).json({
    status: "ok",
    service: "Job Application Tracker",
  });
});

app.use("/api/applications", applicationsRouter);

app.use("/api", (req, res) => {
  res.status(404).json({
    message: "API endpoint not found.",
  });
});

const frontendPath = fileURLToPath(
  new URL("../frontend/", import.meta.url)
);

app.use(express.static(frontendPath));

app.use((error, req, res, next) => {
  if (res.headersSent) {
    return next(error);
  }

  if (error.type === "entity.parse.failed") {
    return res.status(400).json({
      message: "Request body must contain valid JSON.",
    });
  }

  if (error.type === "entity.too.large") {
    return res.status(413).json({
      message: "Request body is too large.",
    });
  }

  console.error("Request failed:", error.code || error.message);

  res.status(500).json({
    message: "An unexpected server error occurred.",
  });
});

export default app;