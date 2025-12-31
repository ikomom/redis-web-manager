import "dotenv/config";
import express from "express";
import cors from "cors";
import bodyParser from "body-parser";
import path from "path";
import { v4 as uuidv4 } from "uuid";
import swaggerJsdoc from "swagger-jsdoc";
import swaggerUi from "swagger-ui-express";
import { RedisManager } from "./redisManager";
import { fileStore } from "./fileStore";
import { RedisConfig } from "./types";

const app = express();
const port = Number(process.env.PORT ?? 3000);

const corsOrigin = process.env.CORS_ORIGIN;
app.use(
  cors(
    corsOrigin
      ? {
          origin: corsOrigin.split(",").map((origin) => origin.trim()),
        }
      : undefined
  )
);
app.use(bodyParser.json());

// Swagger Setup
const swaggerOptions = {
  definition: {
    openapi: "3.0.0",
    info: {
      title: "Redis Web Manager API",
      version: "1.0.0",
      description: "API for Redis Web Manager",
    },
    servers: [
      {
        url: `http://localhost:${port}`,
      },
    ],
    tags: [
      { name: "Connections", description: "Manage Redis connection configs" },
      { name: "Keys", description: "Scan and inspect keys" },
      { name: "Values", description: "Read and write key values" },
      { name: "HyperLogLog", description: "HyperLogLog operations" },
      { name: "Collections", description: "Hash/List/Set operations" },
    ],
  },
  apis: [path.join(__dirname, "../src/index.ts")],
};

const swaggerDocs = swaggerJsdoc(swaggerOptions);
app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(swaggerDocs));

const redisManager = RedisManager.getInstance();

// Helper to extract connection ID
const getConnectionId = (req: express.Request): string => {
  const { connectionId } = req.body;
  if (!connectionId) {
    throw new Error("Connection ID is required");
  }
  return connectionId;
};

// --- Connection Management APIs ---

/**
 * @swagger
 * /api/connections:
 *   get:
 *     summary: Get all saved connections
 *     tags: [Connections]
 *     responses:
 *       200:
 *         description: List of connections
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: string
 *                       name:
 *                         type: string
 *                       host:
 *                         type: string
 *                       port:
 *                         type: number
 */
// Get all connections (without password)
app.get("/api/connections", (req, res) => {
  const connections = fileStore.getAll();
  const safeConnections = connections.map(({ password, ...rest }) => rest);
  res.json({ success: true, data: safeConnections });
});

/**
 * @swagger
 * /api/connections:
 *   post:
 *     summary: Create a new connection
 *     tags: [Connections]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - host
 *               - port
 *             properties:
 *               name:
 *                 type: string
 *               host:
 *                 type: string
 *               port:
 *                 type: number
 *               password:
 *                 type: string
 *               db:
 *                 type: number
 *     responses:
 *       200:
 *         description: Connection created successfully
 *       500:
 *         description: Connection failed
 */
// Create/Save connection
app.post("/api/connections", async (req, res) => {
  try {
    const config: RedisConfig = req.body;
    if (!config.host || !config.port) {
      throw new Error("Invalid Redis Configuration");
    }

    // Validate connection
    const client = await redisManager.getConnection({ ...config, db: 0 }); // Default check on DB 0
    await client.ping();

    // Save to file
    const id = uuidv4();
    fileStore.add({
      ...config,
      db: 0, // Default to DB 0
      id,
      createdAt: Date.now(),
    });

    res.json({ success: true, data: { id, ...config, password: undefined } });
  } catch (error: unknown) {
    console.error("Connection error:", error);
    const message =
      error instanceof Error ? error.message : "Connection failed";
    res.status(500).json({ success: false, message });
  }
});

// Update connection
app.put("/api/connections/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const config: RedisConfig & { password?: string } = req.body;
    if (!id) throw new Error("Connection ID is required");
    if (!config.host || !config.port) {
      throw new Error("Invalid Redis Configuration");
    }

    const existing = fileStore.get(id);
    if (!existing) {
      return res.status(404).json({ success: false, message: "Not found" });
    }

    const password =
      typeof config.password === "string" ? config.password : existing.password;

    const db = typeof config.db === "number" ? config.db : existing.db ?? 0;

    const updated = {
      ...existing,
      ...config,
      password,
      db,
      id: existing.id,
      createdAt: existing.createdAt,
    };

    const client = await redisManager.getConnection({
      host: updated.host,
      port: updated.port,
      password: updated.password,
      db: 0,
      name: updated.name,
    });
    await client.ping();

    fileStore.update(updated);

    const { password: _password, ...safe } = updated;
    res.json({ success: true, data: safe });
  } catch (error: unknown) {
    console.error("Connection update error:", error);
    const message =
      error instanceof Error ? error.message : "Connection failed";
    res.status(500).json({ success: false, message });
  }
});

/**
 * @swagger
 * /api/connections/{id}:
 *   delete:
 *     summary: Delete a connection
 *     tags: [Connections]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Connection deleted
 */
// Delete connection
app.delete("/api/connections/:id", (req, res) => {
  const { id } = req.params;
  fileStore.remove(id);
  res.json({ success: true });
});

// --- Business APIs ---

// Helper to extract DB index
const getDbIndex = (req: express.Request): number | undefined => {
  const { db } = req.body;
  return db !== undefined ? parseInt(db) : undefined;
};

/**
 * @swagger
 * /api/keys:
 *   post:
 *     summary: Scan keys with their types
 *     tags: [Keys]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               connectionId:
 *                 type: string
 *               db:
 *                 type: integer
 *               pattern:
 *                 type: string
 *                 example: "*"
 *     responses:
 *       200:
 *         description: List of keys and types
 */
// Get Keys (SCAN with Type pipeline)
app.post("/api/keys", async (req, res) => {
  try {
    const connectionId = getConnectionId(req);
    const db = getDbIndex(req);
    const pattern = req.body.pattern || "*";
    const client = await redisManager.getConnection(connectionId, db);

    // Scan up to 1000 keys
    const keys: string[] = [];
    let cursor = "0";
    let count = 0;

    do {
      const [newCursor, scannedKeys] = await client.scan(
        cursor,
        "MATCH",
        pattern,
        "COUNT",
        100
      );
      cursor = newCursor;
      keys.push(...scannedKeys);
      count += scannedKeys.length;
      if (count >= 1000) break;
    } while (cursor !== "0");

    // Remove duplicates if any (scan might return duplicates)
    const uniqueKeys = Array.from(new Set(keys));

    if (uniqueKeys.length === 0) {
      return res.json({ success: true, data: [] });
    }

    // Pipeline to get types
    const pipeline = client.pipeline();
    uniqueKeys.forEach((k) => pipeline.type(k));
    const typeResults = await pipeline.exec();

    const result = uniqueKeys.map((key, index) => {
      const typeRes = typeResults ? typeResults[index] : null;
      // ioredis pipeline result is [err, result]
      const type = typeRes && !typeRes[0] ? (typeRes[1] as string) : "unknown";
      return { key, type };
    });

    res.json({ success: true, data: result });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * @swagger
 * /api/value:
 *   post:
 *     summary: Get detailed value information for a key
 *     tags: [Values]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - connectionId
 *               - key
 *             properties:
 *               connectionId:
 *                 type: string
 *               db:
 *                 type: integer
 *               key:
 *                 type: string
 *               previewLimit:
 *                 type: integer
 *               cursor:
 *                 type: string
 *               start:
 *                 type: integer
 *     responses:
 *       200:
 *         description: Value, type and metadata for a key
 */
// Get Value
app.post("/api/value", async (req, res) => {
  try {
    const connectionId = getConnectionId(req);
    const db = getDbIndex(req);
    const { key } = req.body;
    const previewLimitRaw = (req.body as { previewLimit?: unknown })
      .previewLimit;
    const previewLimit =
      typeof previewLimitRaw === "number" &&
      Number.isFinite(previewLimitRaw) &&
      previewLimitRaw > 0
        ? Math.min(Math.floor(previewLimitRaw), 1000)
        : 200;

    const cursorRaw = (req.body as { cursor?: unknown }).cursor;
    const cursor = typeof cursorRaw === "string" && cursorRaw ? cursorRaw : "0";

    const listStartRaw = (req.body as { start?: unknown }).start;
    const listStart =
      typeof listStartRaw === "number" &&
      Number.isFinite(listStartRaw) &&
      Number.isInteger(listStartRaw) &&
      listStartRaw >= 0
        ? listStartRaw
        : 0;
    if (!key) throw new Error("Key is required");

    const client = await redisManager.getConnection(connectionId, db);

    let type = await client.type(key);
    let value: unknown = null;
    let meta: Record<string, unknown> | undefined;
    const ttl = await client.ttl(key);
    let memoryBytes: number | null = null;
    try {
      const mem = (await client.call("MEMORY", "USAGE", key)) as unknown;
      if (typeof mem === "number") memoryBytes = mem;
      if (typeof mem === "string") {
        const parsed = Number(mem);
        if (!Number.isNaN(parsed)) memoryBytes = parsed;
      }
    } catch {
      // ignore
    }

    switch (type) {
      case "string":
        value = await client.get(key);
        try {
          const count = await client.pfcount(key);
          const hllBytes = await client.strlen(key);
          type = "hyperloglog";
          value = null;
          meta = { count, bytes: hllBytes, hllBytes, memoryBytes };
        } catch {
          // ignore if not a valid HyperLogLog value
        }
        break;
      case "hash":
        {
          const total = await client.hlen(key);
          const scanRes = await client.hscan(
            key,
            cursor,
            "COUNT",
            previewLimit
          );
          const nextCursor =
            Array.isArray(scanRes) && typeof scanRes[0] === "string"
              ? scanRes[0]
              : "0";
          const fields = Array.isArray(scanRes) ? scanRes[1] : [];
          const obj: Record<string, string> = {};
          let pairs = 0;
          for (let i = 0; i < fields.length && pairs < previewLimit; i += 2) {
            const f = fields[i];
            const v = fields[i + 1];
            if (typeof f === "string" && typeof v === "string") {
              obj[f] = v;
              pairs += 1;
            }
          }
          value = obj;
          const previewCount = Object.keys(obj).length;
          meta = {
            total,
            previewCount,
            truncated: total > previewCount || nextCursor !== "0",
            cursor,
            nextCursor,
            memoryBytes,
          };
        }
        break;
      case "list":
        {
          const total = await client.llen(key);
          const end = listStart + previewLimit - 1;
          const items = await client.lrange(key, listStart, end);
          value = items;
          const previewCount = items.length;
          meta = {
            total,
            previewCount,
            truncated: listStart + previewCount < total,
            start: listStart,
            end: listStart + previewCount - 1,
            memoryBytes,
          };
        }
        break;
      case "set":
        {
          const total = await client.scard(key);
          const scanRes = await client.sscan(
            key,
            cursor,
            "COUNT",
            previewLimit
          );
          const nextCursor =
            Array.isArray(scanRes) && typeof scanRes[0] === "string"
              ? scanRes[0]
              : "0";
          const members = Array.isArray(scanRes) ? scanRes[1] : [];
          const previewMembers = members
            .filter((m): m is string => typeof m === "string")
            .slice(0, previewLimit);
          value = previewMembers;
          const previewCount = previewMembers.length;
          meta = {
            total,
            previewCount,
            truncated: total > previewCount || nextCursor !== "0",
            cursor,
            nextCursor,
            memoryBytes,
          };
        }
        break;
      case "zset":
        value = await client.zrange(key, 0, -1, "WITHSCORES");
        meta = { memoryBytes };
        break;
      case "ReJSON-RL":
      case "json":
        // @ts-ignore
        value = await client.call("JSON.GET", key);
        // JSON.GET returns stringified JSON, we want to return it as parsed object if possible
        // or just string. Let's return parse object so frontend can display it nicely
        if (typeof value === "string") {
          try {
            value = JSON.parse(value);
          } catch (e) {
            // keep as string
          }
        }
        meta = { memoryBytes };
        break;
      case "none":
        value = null;
        meta = { memoryBytes };
        break;
      default:
        value = "Unsupported type for viewing";
        meta = { memoryBytes };
    }

    if (!meta && memoryBytes !== null) meta = { memoryBytes };
    res.json({ success: true, data: { type, value, ttl, meta } });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * @swagger
 * /api/hll/add:
 *   post:
 *     summary: Add elements to a HyperLogLog key
 *     tags: [HyperLogLog]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - connectionId
 *               - key
 *               - elements
 *             properties:
 *               connectionId:
 *                 type: string
 *               db:
 *                 type: integer
 *               key:
 *                 type: string
 *               elements:
 *                 type: array
 *                 items:
 *                   type: string
 *               ttl:
 *                 type: integer
 *     responses:
 *       200:
 *         description: Updated HyperLogLog stats
 */
// HyperLogLog: Add elements
app.post("/api/hll/add", async (req, res) => {
  try {
    const connectionId = getConnectionId(req);
    const db = getDbIndex(req);
    const { key, elements, ttl } = req.body as {
      key?: string;
      elements?: unknown;
      ttl?: unknown;
    };
    if (!key) throw new Error("Key is required");
    if (
      !Array.isArray(elements) ||
      elements.some((e) => typeof e !== "string")
    ) {
      throw new Error("Elements must be a string array");
    }

    const client = await redisManager.getConnection(connectionId, db);
    const changed = await client.pfadd(key, ...elements);
    if (typeof ttl === "number" && ttl > 0) {
      await client.expire(key, ttl);
    }
    const count = await client.pfcount(key);
    const bytes = await client.strlen(key);
    res.json({
      success: true,
      data: { changed: Boolean(changed), count, bytes },
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Start ServerHyperLogLog: Count
app.post("/api/hll/count", async (req, res) => {
  try {
    const connectionId = getConnectionId(req);
    const db = getDbIndex(req);
    const { key } = req.body as { key?: string };
    if (!key) throw new Error("Key is required");
    const client = await redisManager.getConnection(connectionId, db);
    const count = await client.pfcount(key);
    const bytes = await client.strlen(key);
    res.json({ success: true, data: { count, bytes } });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// HyperLogLog: Reset (recreate)
app.post("/api/hll/reset", async (req, res) => {
  try {
    const connectionId = getConnectionId(req);
    const db = getDbIndex(req);
    const { key, elements, ttl } = req.body as {
      key?: string;
      elements?: unknown;
      ttl?: unknown;
    };
    if (!key) throw new Error("Key is required");
    if (
      elements !== undefined &&
      (!Array.isArray(elements) || elements.some((e) => typeof e !== "string"))
    ) {
      throw new Error("Elements must be a string array");
    }

    const client = await redisManager.getConnection(connectionId, db);
    await client.del(key);
    if (Array.isArray(elements) && elements.length > 0) {
      await client.pfadd(key, ...elements);
    }
    if (typeof ttl === "number" && ttl > 0) {
      await client.expire(key, ttl);
    }
    const count = await client.pfcount(key);
    const bytes = await client.strlen(key);
    res.json({ success: true, data: { count, bytes } });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// HyperLogLog: Merge source keys into destination key
app.post("/api/hll/merge", async (req, res) => {
  try {
    const connectionId = getConnectionId(req);
    const db = getDbIndex(req);
    const { destinationKey, sourceKeys, ttl } = req.body as {
      destinationKey?: string;
      sourceKeys?: unknown;
      ttl?: unknown;
    };
    if (!destinationKey) throw new Error("Destination key is required");
    if (
      !Array.isArray(sourceKeys) ||
      sourceKeys.some((k) => typeof k !== "string")
    ) {
      throw new Error("Source keys must be a string array");
    }
    if (sourceKeys.length === 0) throw new Error("Source keys is empty");

    const client = await redisManager.getConnection(connectionId, db);
    await client.pfmerge(destinationKey, ...sourceKeys);
    if (typeof ttl === "number" && ttl > 0) {
      await client.expire(destinationKey, ttl);
    }
    const count = await client.pfcount(destinationKey);
    const bytes = await client.strlen(destinationKey);
    res.json({ success: true, data: { count, bytes } });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * @swagger
 * /api/set:
 *   post:
 *     summary: Set value for a key
 *     description: Supports string, hash and JSON (ReJSON) types
 *     tags: [Values]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - connectionId
 *               - key
 *               - type
 *             properties:
 *               connectionId:
 *                 type: string
 *               db:
 *                 type: integer
 *               key:
 *                 type: string
 *               type:
 *                 type: string
 *                 enum: [string, hash, json, ReJSON-RL]
 *               value:
 *                 description: String value or structured JSON/hash object
 *               ttl:
 *                 type: integer
 *                 description: Expiration time in seconds
 *     responses:
 *       200:
 *         description: Value saved
 */
// Set Value
app.post("/api/set", async (req, res) => {
  try {
    const connectionId = getConnectionId(req);
    const db = getDbIndex(req);
    const { key, value, type, ttl } = req.body; // value can be string or object

    if (!key || !type) throw new Error("Key and Type are required");

    const client = await redisManager.getConnection(connectionId, db);

    // Basic implementation for String and Hash
    if (type === "string") {
      if (typeof value !== "string")
        throw new Error("Value must be string for string type");
      if (ttl && ttl > 0) {
        await client.set(key, value, "EX", ttl);
      } else {
        await client.set(key, value);
      }
    } else if (type === "hash") {
      if (typeof value !== "object")
        throw new Error("Value must be object for hash type");
      // Delete first to clear old fields if overwriting, or just hset
      // Usually management tools might want to replace.
      // For safety, let's just HSET (merge/update).
      // If user wants to replace, they should delete first.
      await client.hset(key, value);
      if (ttl && ttl > 0) {
        await client.expire(key, ttl);
      }
    } else if (type === "json" || type === "ReJSON-RL") {
      // @ts-ignore
      await client.call(
        "JSON.SET",
        key,
        "$",
        typeof value === "string" ? value : JSON.stringify(value)
      );
      if (ttl && ttl > 0) {
        await client.expire(key, ttl);
      }
    } else {
      throw new Error(`Setting type ${type} is not yet supported in this demo`);
    }

    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * @swagger
 * /api/hash/set-field:
 *   post:
 *     summary: Set a field in a hash
 *     tags: [Collections]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - connectionId
 *               - key
 *               - field
 *               - value
 *             properties:
 *               connectionId:
 *                 type: string
 *               db:
 *                 type: integer
 *               key:
 *                 type: string
 *               field:
 *                 type: string
 *               value:
 *                 type: string
 *               ttl:
 *                 type: integer
 *     responses:
 *       200:
 *         description: Field set
 */
app.post("/api/hash/set-field", async (req, res) => {
  try {
    const connectionId = getConnectionId(req);
    const db = getDbIndex(req);
    const { key, field, value, ttl } = req.body as {
      key?: string;
      field?: string;
      value?: string;
      ttl?: unknown;
    };
    if (!key) throw new Error("Key is required");
    if (!field) throw new Error("Field is required");
    if (typeof value !== "string") throw new Error("Value must be string");

    const client = await redisManager.getConnection(connectionId, db);
    await client.hset(key, field, value);
    if (typeof ttl === "number" && ttl > 0) {
      await client.expire(key, ttl);
    }
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

app.post("/api/hash/del-field", async (req, res) => {
  try {
    const connectionId = getConnectionId(req);
    const db = getDbIndex(req);
    const { key, field } = req.body as { key?: string; field?: string };
    if (!key) throw new Error("Key is required");
    if (!field) throw new Error("Field is required");

    const client = await redisManager.getConnection(connectionId, db);
    await client.hdel(key, field);
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * @swagger
 * /api/list/push:
 *   post:
 *     summary: Push values to a list
 *     tags: [Collections]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - connectionId
 *               - key
 *               - values
 *             properties:
 *               connectionId:
 *                 type: string
 *               db:
 *                 type: integer
 *               key:
 *                 type: string
 *               values:
 *                 type: array
 *                 items:
 *                   type: string
 *               direction:
 *                 type: string
 *                 enum: [left, right]
 *               ttl:
 *                 type: integer
 *     responses:
 *       200:
 *         description: Values pushed
 */
app.post("/api/list/push", async (req, res) => {
  try {
    const connectionId = getConnectionId(req);
    const db = getDbIndex(req);
    const { key, values, direction, ttl } = req.body as {
      key?: string;
      values?: unknown;
      direction?: unknown;
      ttl?: unknown;
    };
    if (!key) throw new Error("Key is required");
    if (!Array.isArray(values) || values.some((v) => typeof v !== "string")) {
      throw new Error("Values must be a string array");
    }
    const dir = direction === "left" ? "left" : "right";

    const client = await redisManager.getConnection(connectionId, db);
    if (dir === "left") {
      await client.lpush(key, ...values);
    } else {
      await client.rpush(key, ...values);
    }
    if (typeof ttl === "number" && ttl > 0) {
      await client.expire(key, ttl);
    }
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

app.post("/api/list/set-at", async (req, res) => {
  try {
    const connectionId = getConnectionId(req);
    const db = getDbIndex(req);
    const { key, index, value } = req.body as {
      key?: string;
      index?: unknown;
      value?: string;
    };
    if (!key) throw new Error("Key is required");
    if (typeof index !== "number" || !Number.isInteger(index)) {
      throw new Error("Index must be integer");
    }
    if (typeof value !== "string") throw new Error("Value must be string");

    const client = await redisManager.getConnection(connectionId, db);
    await client.lset(key, index, value);
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

app.post("/api/list/rem", async (req, res) => {
  try {
    const connectionId = getConnectionId(req);
    const db = getDbIndex(req);
    const { key, value, count } = req.body as {
      key?: string;
      value?: string;
      count?: unknown;
    };
    if (!key) throw new Error("Key is required");
    if (typeof value !== "string") throw new Error("Value must be string");
    const c = typeof count === "number" && Number.isInteger(count) ? count : 0;

    const client = await redisManager.getConnection(connectionId, db);
    await client.lrem(key, c, value);
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

app.post("/api/list/del-at", async (req, res) => {
  try {
    const connectionId = getConnectionId(req);
    const db = getDbIndex(req);
    const { key, index } = req.body as { key?: string; index?: unknown };
    if (!key) throw new Error("Key is required");
    if (typeof index !== "number" || !Number.isInteger(index)) {
      throw new Error("Index must be integer");
    }

    const client = await redisManager.getConnection(connectionId, db);
    const marker = `__redis_ui_del__:${uuidv4()}`;
    await client.lset(key, index, marker);
    await client.lrem(key, 1, marker);
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * @swagger
 * /api/set/add:
 *   post:
 *     summary: Add members to a set
 *     tags: [Collections]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - connectionId
 *               - key
 *               - members
 *             properties:
 *               connectionId:
 *                 type: string
 *               db:
 *                 type: integer
 *               key:
 *                 type: string
 *               members:
 *                 type: array
 *                 items:
 *                   type: string
 *               ttl:
 *                 type: integer
 *     responses:
 *       200:
 *         description: Members added
 */
app.post("/api/set/add", async (req, res) => {
  try {
    const connectionId = getConnectionId(req);
    const db = getDbIndex(req);
    const { key, members, ttl } = req.body as {
      key?: string;
      members?: unknown;
      ttl?: unknown;
    };
    if (!key) throw new Error("Key is required");
    if (!Array.isArray(members) || members.some((m) => typeof m !== "string")) {
      throw new Error("Members must be a string array");
    }

    const client = await redisManager.getConnection(connectionId, db);
    await client.sadd(key, ...members);
    if (typeof ttl === "number" && ttl > 0) {
      await client.expire(key, ttl);
    }
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

app.post("/api/set/rem", async (req, res) => {
  try {
    const connectionId = getConnectionId(req);
    const db = getDbIndex(req);
    const { key, members } = req.body as { key?: string; members?: unknown };
    if (!key) throw new Error("Key is required");
    if (!Array.isArray(members) || members.some((m) => typeof m !== "string")) {
      throw new Error("Members must be a string array");
    }

    const client = await redisManager.getConnection(connectionId, db);
    await client.srem(key, ...members);
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * @swagger
 * /api/delete:
 *   post:
 *     summary: Delete a key
 *     tags: [Values]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - connectionId
 *               - key
 *             properties:
 *               connectionId:
 *                 type: string
 *               db:
 *                 type: integer
 *               key:
 *                 type: string
 *     responses:
 *       200:
 *         description: Key deleted
 */
// Delete Key
app.post("/api/delete", async (req, res) => {
  try {
    const connectionId = getConnectionId(req);
    const db = getDbIndex(req);
    const { key } = req.body;
    const client = await redisManager.getConnection(connectionId, db);
    await client.del(key);
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * @swagger
 * /api/rename:
 *   post:
 *     summary: Rename a key
 *     tags: [Keys]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - connectionId
 *               - oldKey
 *               - newKey
 *             properties:
 *               connectionId:
 *                 type: string
 *               db:
 *                 type: integer
 *               oldKey:
 *                 type: string
 *               newKey:
 *                 type: string
 *     responses:
 *       200:
 *         description: Key renamed
 */
app.post("/api/rename", async (req, res) => {
  try {
    const connectionId = getConnectionId(req);
    const db = getDbIndex(req);
    const { oldKey, newKey } = req.body as { oldKey?: string; newKey?: string };
    if (!oldKey || !newKey) throw new Error("Old key and new key are required");
    const client = await redisManager.getConnection(connectionId, db);
    await client.rename(oldKey, newKey);
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
});
