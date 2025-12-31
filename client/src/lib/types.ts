export interface RedisConfig {
  id: string;
  name: string;
  host: string;
  port: number;
  password?: string;
  db?: number;
}

export interface KeyItem {
  key: string;
  type: string;
}

export type RedisValue =
  | string
  | number
  | boolean
  | null
  | Record<string, unknown>
  | Array<unknown>;

export interface ValueResponse {
  type: string;
  value: RedisValue;
  ttl: number;
  meta?: Record<string, unknown>;
}
