const express = require("express");
const cors = require("cors");
require("dotenv").config();

const app = express();

/*
  Railway provides PORT automatically.
  Do NOT hardcode 3000 only, or Railway can crash.
*/
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

/*
  Root route.
  This prevents Railway/browser checks from hitting a blank app.
*/
app.get("/", (req, res) => {
  res.status(200).json({
    ok: true,
    message: "DeedXchange Railway backend is running",
    service: "deedxchange-backend"
  });
});

/*
  Health check route.
*/
app.get("/health", (req, res) => {
  res.status(200).json({
    ok: true,
    status: "healthy"
  });
});

/*
  Test API route.
*/
app.get("/api/test", (req, res) => {
  res.status(200).json({
    ok: true,
    message: "API test route works"
  });
});

/*
  Catch-all for unknown routes.
  This prevents confusing crashes/errors from random bad URLs.
*/
app.use((req, res) => {
  res.status(404).json({
    ok: false,
    error: "Route not found",
    path: req.originalUrl
  });
});

/*
  Start server.
*/
app.listen(PORT, "0.0.0.0", () => {
  console.log(`DeedXchange backend running on port ${PORT}`);
});
