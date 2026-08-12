const crypto = require("crypto");
const express = require("express");
const cors = require("cors");
const rateLimit = require("express-rate-limit");
require("dotenv").config();

const {
  ensureDatabaseReady,
  findPlayerByDeviceHash,
  createPlayer,
  closeDatabase,
} = require("./src/database");
const {
  normalizeProfile,
  validateInstallationId,
  validateProfile,
  validateProfilePhoto,
} = require("./src/playerProfile");

const app = express();
const PORT = process.env.PORT || 3000;

app.set("trust proxy", 1);
app.use(cors());
app.use(express.json({ limit: "2mb" }));
app.use(
  "/api/players",
  rateLimit({
    windowMs: 60 * 1000,
    limit: 60,
    standardHeaders: "draft-7",
    legacyHeaders: false,
  })
);

function hashInstallationId(installationId) {
  return crypto.createHash("sha256").update(installationId).digest("hex");
}

function publicPlayer(player) {
  return {
    userId: player.user_id,
    username: player.username,
    city: player.city,
    state: player.state,
    zip: player.zip,
    createdAt: player.created_at,
    photoMimeType: player.photo_mime,
    photoBase64: player.photo_data ? player.photo_data.toString("base64") : null,
  };
}

app.get("/", (req, res) => {
  res.status(200).json({
    ok: true,
    message: "DeedXchange Railway backend is running",
    service: "deedxchange-backend",
  });
});

app.get("/health", async (req, res) => {
  try {
    await ensureDatabaseReady();
    res.status(200).json({ ok: true, status: "healthy", database: "connected" });
  } catch (error) {
    res.status(503).json({ ok: false, status: "degraded", database: "unavailable" });
  }
});

app.get("/api/test", (req, res) => {
  res.status(200).json({ ok: true, message: "DeedXchange API test route works" });
});

app.post("/api/players/lookup", async (req, res, next) => {
  try {
    const installationId = String(req.body.installationId || "").trim();
    const validationError = validateInstallationId(installationId);
    if (validationError) {
      return res.status(400).json({ ok: false, error: validationError });
    }

    await ensureDatabaseReady();
    const player = await findPlayerByDeviceHash(hashInstallationId(installationId));
    if (!player) {
      return res.status(200).json({ ok: true, found: false });
    }

    return res.status(200).json({ ok: true, found: true, player: publicPlayer(player) });
  } catch (error) {
    return next(error);
  }
});

app.post(
  "/api/players",
  rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 10,
    standardHeaders: "draft-7",
    legacyHeaders: false,
  }),
  async (req, res, next) => {
    try {
      const installationId = String(req.body.installationId || "").trim();
      const installationError = validateInstallationId(installationId);
      if (installationError) {
        return res.status(400).json({ ok: false, error: installationError });
      }

      const profile = normalizeProfile(req.body);
      const profileError = validateProfile(profile);
      if (profileError) {
        return res.status(400).json({ ok: false, error: profileError });
      }

      const photoResult = validateProfilePhoto(req.body.photoBase64, req.body.photoMimeType);
      if (photoResult.error) {
        return res.status(400).json({ ok: false, error: photoResult.error });
      }

      await ensureDatabaseReady();
      const result = await createPlayer({
        deviceKeyHash: hashInstallationId(installationId),
        ...profile,
        photoData: photoResult.data,
        photoMime: photoResult.mimeType,
      });

      return res.status(result.alreadyExisted ? 200 : 201).json({
        ok: true,
        created: !result.alreadyExisted,
        player: publicPlayer(result.player),
      });
    } catch (error) {
      if (error.code === "23505") {
        return res.status(409).json({
          ok: false,
          error: "That username is already in use. Please choose another.",
        });
      }
      return next(error);
    }
  }
);

app.use((req, res) => {
  res.status(404).json({ ok: false, error: "Route not found", path: req.originalUrl });
});

app.use((error, req, res, next) => {
  console.error(error);
  res.status(500).json({ ok: false, error: "The server could not complete the request." });
});

const server = app.listen(PORT, "0.0.0.0", () => {
  console.log(`DeedXchange backend running on port ${PORT}`);
  ensureDatabaseReady()
    .then(() => console.log("DeedXchange database is ready"))
    .catch((error) => console.warn(`Database not ready: ${error.message}`));
});

async function shutdown() {
  server.close(async () => {
    await closeDatabase();
    process.exit(0);
  });
}

process.on("SIGTERM", shutdown);
process.on("SIGINT", shutdown);
