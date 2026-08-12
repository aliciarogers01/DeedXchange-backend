# DeedXchange Backend

Railway-hosted backend for the DeedXchange game.

## Current player flow

- `GET /` confirms that the service is running.
- `GET /health` confirms that the service and PostgreSQL database are ready.
- `GET /api/test` provides a simple Unity connection test.
- `POST /api/players/lookup` checks whether an installation already has a player profile.
- `POST /api/players` creates a player with a required picture and assigns a sequential ID in the `DX-000-00-0000` format.

The app stores a SHA-256 hash of the Unity installation ID instead of storing the raw device key. Usernames are case-insensitively unique. Player pictures are validated JPEG or PNG files with a 1 MB limit.

## Railway setup

1. Add a PostgreSQL service to the same Railway project.
2. In the backend service, add a `DATABASE_URL` variable that references the PostgreSQL service's `DATABASE_URL`.
3. Redeploy the backend.
4. Open `/health`. A ready deployment returns `{"ok":true,"status":"healthy","database":"connected"}`.

The tables and the player-number sequence are created automatically. Do not manually create them.

## Local development

Copy `.env.example` to `.env`, enter a PostgreSQL connection string, then run:

```bash
npm install
npm test
npm start
```
