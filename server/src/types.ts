export interface RedisConfig {
  host: string;
  port: number;
  password?: string;
  db?: number;
  name?: string;
}

export interface StoredConnection extends RedisConfig {
  id: string;
  createdAt: number;
}

export interface KeyInfo {
  key: string;
  type: string;
}
