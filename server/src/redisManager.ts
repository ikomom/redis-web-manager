import Redis from 'ioredis';
import { RedisConfig } from './types';
import { fileStore } from './fileStore';

export class RedisManager {
  private static instance: RedisManager;
  // Cache connections based on connection ID
  private connections: Map<string, Redis> = new Map();

  private constructor() {}

  static getInstance(): RedisManager {
    if (!RedisManager.instance) {
      RedisManager.instance = new RedisManager();
    }
    return RedisManager.instance;
  }

  public async getConnection(configOrId: RedisConfig | string, dbIndex?: number): Promise<Redis> {
    let config: RedisConfig;
    let connectionId: string | undefined;

    if (typeof configOrId === 'string') {
        connectionId = configOrId;
        const storedConfig = fileStore.get(connectionId);
        if (!storedConfig) {
            throw new Error(`Connection with ID ${connectionId} not found`);
        }
        config = storedConfig;
    } else {
        config = configOrId;
    }

    // Override DB index if provided
    const targetDb = dbIndex !== undefined ? dbIndex : (config.db || 0);

    // Generate a unique key for the actual Redis connection parameters
    // This allows different IDs to share the same physical connection if configs are identical
    const connectionKey = `${config.host}:${config.port}:${targetDb}:${config.password || ''}`;
    const safeConnectionKey = `${config.host}:${config.port}:${targetDb}`;
    
    // Check if existing connection is alive
    if (this.connections.has(connectionKey)) {
      const client = this.connections.get(connectionKey)!;
      if (client.status === 'ready' || client.status === 'connect') {
        return client;
      }
      // Cleanup dead connection
      try {
        client.disconnect();
      } catch (e) {}
      this.connections.delete(connectionKey);
    }

    // Create new connection
    const client = new Redis({
      host: config.host,
      port: config.port,
      password: config.password,
      db: targetDb,
      lazyConnect: true,
      retryStrategy: (times) => {
        // Limit retries to avoid hanging requests too long
        if (times > 2) return null;
        return 200;
      }
    });

    try {
      client.on('error', (err: unknown) => {
        const message = err instanceof Error ? err.message : String(err);
        console.error(`Redis error (${safeConnectionKey}): ${message}`);
      });
      await client.connect();
      this.connections.set(connectionKey, client);
      return client;
    } catch (error) {
      // Ensure we don't leak the client if connection fails
      client.disconnect(); 
      throw error;
    }
  }
}
