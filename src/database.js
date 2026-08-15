const { Pool } = require("pg");
const { formatUserId } = require("./playerProfile");

let pool;
let schemaPromise;

function getPool() {
  if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL is not configured");
  }

  if (!pool) {
    pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: process.env.DATABASE_SSL === "true" ? { rejectUnauthorized: false } : undefined,
      max: 10,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 10000,
    });
  }
  return pool;
}

async function initializeSchema() {
  const database = getPool();
  await database.query(`
    CREATE SEQUENCE IF NOT EXISTS dx_user_number_seq
      AS BIGINT
      MINVALUE 1
      MAXVALUE 999999999
      NO CYCLE;

    CREATE TABLE IF NOT EXISTS players (
      id BIGSERIAL PRIMARY KEY,
      player_number BIGINT NOT NULL UNIQUE,
      user_id VARCHAR(14) NOT NULL UNIQUE,
      device_key_hash CHAR(64) NOT NULL UNIQUE,
      username VARCHAR(24) NOT NULL,
      address VARCHAR(120),
      city VARCHAR(80) NOT NULL,
      state CHAR(2) NOT NULL,
      zip CHAR(5) NOT NULL,
      photo_data BYTEA,
      photo_mime VARCHAR(32),
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    ALTER TABLE players ADD COLUMN IF NOT EXISTS photo_data BYTEA;
    ALTER TABLE players ADD COLUMN IF NOT EXISTS photo_mime VARCHAR(32);
    ALTER TABLE players ADD COLUMN IF NOT EXISTS address VARCHAR(120);

    CREATE UNIQUE INDEX IF NOT EXISTS players_username_lower_unique
      ON players (LOWER(username));
  `);
}

async function ensureDatabaseReady() {
  if (!schemaPromise) {
    schemaPromise = initializeSchema().catch((error) => {
      schemaPromise = undefined;
      throw error;
    });
  }
  return schemaPromise;
}

async function findPlayerByDeviceHash(deviceKeyHash) {
  const result = await getPool().query(
    `SELECT user_id, username, address, city, state, zip, photo_data, photo_mime, created_at
       FROM players
      WHERE device_key_hash = $1`,
    [deviceKeyHash]
  );
  return result.rows[0] || null;
}

async function createPlayer({ deviceKeyHash, username, address, city, state, zip, photoData, photoMime }) {
  const database = getPool();
  const client = await database.connect();

  try {
    await client.query("BEGIN");

    const existing = await client.query(
      `SELECT user_id, username, address, city, state, zip, photo_data, photo_mime, created_at
         FROM players
        WHERE device_key_hash = $1
        FOR UPDATE`,
      [deviceKeyHash]
    );

    if (existing.rows[0]) {
      await client.query("COMMIT");
      return { alreadyExisted: true, player: existing.rows[0] };
    }

    const sequenceResult = await client.query(
      "SELECT nextval('dx_user_number_seq')::BIGINT AS player_number"
    );
    const playerNumber = Number(sequenceResult.rows[0].player_number);
    const userId = formatUserId(playerNumber);

    const inserted = await client.query(
      `INSERT INTO players
        (player_number, user_id, device_key_hash, username, address, city, state, zip, photo_data, photo_mime)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
       RETURNING user_id, username, address, city, state, zip, photo_data, photo_mime, created_at`,
      [playerNumber, userId, deviceKeyHash, username, address, city, state, zip, photoData, photoMime]
    );

    await client.query("COMMIT");
    return { alreadyExisted: false, player: inserted.rows[0] };
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

async function closeDatabase() {
  if (pool) {
    await pool.end();
    pool = undefined;
    schemaPromise = undefined;
  }
}

module.exports = {
  ensureDatabaseReady,
  findPlayerByDeviceHash,
  createPlayer,
  closeDatabase,
};
