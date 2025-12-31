import axios from "axios";
import type { RedisConfig, KeyItem, ValueResponse, RedisValue } from "./types";

const API_URL = "/api";

export const api = {
  getConnections: async () => {
    const res = await axios.get<{ success: boolean; data: RedisConfig[] }>(
      `${API_URL}/connections`
    );
    return res.data.data;
  },

  saveConnection: async (config: {
    id?: string;
    name: string;
    host: string;
    port: number;
    password?: string;
    db?: number;
  }) => {
    if (config.id) {
      const { id, ...rest } = config;
      const res = await axios.put<{ success: boolean; data: RedisConfig }>(
        `${API_URL}/connections/${id}`,
        rest
      );
      return res.data.data;
    }

    const res = await axios.post<{ success: boolean; data: RedisConfig }>(
      `${API_URL}/connections`,
      config
    );
    return res.data.data;
  },

  deleteConnection: async (id: string) => {
    await axios.delete(`${API_URL}/connections/${id}`);
  },

  getKeys: async (config: RedisConfig, pattern: string = "*") => {
    if (!config.id) throw new Error("Connection ID required");
    const res = await axios.post<{ success: boolean; data: KeyItem[] }>(
      `${API_URL}/keys`,
      {
        connectionId: config.id,
        pattern,
        db: config.db, // Pass current DB selection
      }
    );
    return res.data.data;
  },
  getValue: async (
    config: RedisConfig,
    key: string,
    options?: { previewLimit?: number; cursor?: string; start?: number }
  ) => {
    if (!config.id) throw new Error("Connection ID required");
    const res = await axios.post<{ success: boolean; data: ValueResponse }>(
      `${API_URL}/value`,
      {
        connectionId: config.id,
        key,
        db: config.db, // Pass current DB selection
        previewLimit: options?.previewLimit,
        cursor: options?.cursor,
        start: options?.start,
      }
    );
    return res.data.data;
  },
  setValue: async (
    config: RedisConfig,
    key: string,
    value: RedisValue,
    type: string,
    ttl?: number
  ) => {
    if (!config.id) throw new Error("Connection ID required");
    const res = await axios.post(`${API_URL}/set`, {
      connectionId: config.id,
      key,
      value,
      type,
      ttl,
      db: config.db, // Pass current DB selection
    });
    return res.data;
  },
  deleteKey: async (config: RedisConfig, key: string) => {
    if (!config.id) throw new Error("Connection ID required");
    const res = await axios.post(`${API_URL}/delete`, {
      connectionId: config.id,
      key,
      db: config.db, // Pass current DB selection
    });
    return res.data;
  },

  renameKey: async (config: RedisConfig, oldKey: string, newKey: string) => {
    if (!config.id) throw new Error("Connection ID required");
    const res = await axios.post(`${API_URL}/rename`, {
      connectionId: config.id,
      oldKey,
      newKey,
      db: config.db,
    });
    return res.data;
  },

  hllAdd: async (
    config: RedisConfig,
    key: string,
    elements: string[],
    ttl?: number
  ) => {
    if (!config.id) throw new Error("Connection ID required");
    const res = await axios.post<{
      success: boolean;
      data: { changed: boolean; count: number; bytes: number };
    }>(`${API_URL}/hll/add`, {
      connectionId: config.id,
      key,
      elements,
      ttl,
      db: config.db,
    });
    return res.data.data;
  },

  hllCount: async (config: RedisConfig, key: string) => {
    if (!config.id) throw new Error("Connection ID required");
    const res = await axios.post<{
      success: boolean;
      data: { count: number; bytes: number };
    }>(`${API_URL}/hll/count`, {
      connectionId: config.id,
      key,
      db: config.db,
    });
    return res.data.data;
  },

  hllReset: async (
    config: RedisConfig,
    key: string,
    elements?: string[],
    ttl?: number
  ) => {
    if (!config.id) throw new Error("Connection ID required");
    const res = await axios.post<{
      success: boolean;
      data: { count: number; bytes: number };
    }>(`${API_URL}/hll/reset`, {
      connectionId: config.id,
      key,
      elements,
      ttl,
      db: config.db,
    });
    return res.data.data;
  },

  hllMerge: async (
    config: RedisConfig,
    destinationKey: string,
    sourceKeys: string[],
    ttl?: number
  ) => {
    if (!config.id) throw new Error("Connection ID required");
    const res = await axios.post<{
      success: boolean;
      data: { count: number; bytes: number };
    }>(`${API_URL}/hll/merge`, {
      connectionId: config.id,
      destinationKey,
      sourceKeys,
      ttl,
      db: config.db,
    });
    return res.data.data;
  },

  hashSetField: async (
    config: RedisConfig,
    key: string,
    field: string,
    value: string,
    ttl?: number
  ) => {
    if (!config.id) throw new Error("Connection ID required");
    const res = await axios.post<{ success: boolean }>(
      `${API_URL}/hash/set-field`,
      {
        connectionId: config.id,
        key,
        field,
        value,
        ttl,
        db: config.db,
      }
    );
    return res.data;
  },

  hashDelField: async (config: RedisConfig, key: string, field: string) => {
    if (!config.id) throw new Error("Connection ID required");
    const res = await axios.post<{ success: boolean }>(
      `${API_URL}/hash/del-field`,
      {
        connectionId: config.id,
        key,
        field,
        db: config.db,
      }
    );
    return res.data;
  },

  listPush: async (
    config: RedisConfig,
    key: string,
    values: string[],
    direction: "left" | "right",
    ttl?: number
  ) => {
    if (!config.id) throw new Error("Connection ID required");
    const res = await axios.post<{ success: boolean }>(`${API_URL}/list/push`, {
      connectionId: config.id,
      key,
      values,
      direction,
      ttl,
      db: config.db,
    });
    return res.data;
  },

  listSetAt: async (
    config: RedisConfig,
    key: string,
    index: number,
    value: string
  ) => {
    if (!config.id) throw new Error("Connection ID required");
    const res = await axios.post<{ success: boolean }>(
      `${API_URL}/list/set-at`,
      {
        connectionId: config.id,
        key,
        index,
        value,
        db: config.db,
      }
    );
    return res.data;
  },

  listRem: async (
    config: RedisConfig,
    key: string,
    value: string,
    count: number
  ) => {
    if (!config.id) throw new Error("Connection ID required");
    const res = await axios.post<{ success: boolean }>(`${API_URL}/list/rem`, {
      connectionId: config.id,
      key,
      value,
      count,
      db: config.db,
    });
    return res.data;
  },

  listDelAt: async (config: RedisConfig, key: string, index: number) => {
    if (!config.id) throw new Error("Connection ID required");
    const res = await axios.post<{ success: boolean }>(
      `${API_URL}/list/del-at`,
      {
        connectionId: config.id,
        key,
        index,
        db: config.db,
      }
    );
    return res.data;
  },

  setAdd: async (
    config: RedisConfig,
    key: string,
    members: string[],
    ttl?: number
  ) => {
    if (!config.id) throw new Error("Connection ID required");
    const res = await axios.post<{ success: boolean }>(`${API_URL}/set/add`, {
      connectionId: config.id,
      key,
      members,
      ttl,
      db: config.db,
    });
    return res.data;
  },

  setRem: async (config: RedisConfig, key: string, members: string[]) => {
    if (!config.id) throw new Error("Connection ID required");
    const res = await axios.post<{ success: boolean }>(`${API_URL}/set/rem`, {
      connectionId: config.id,
      key,
      members,
      db: config.db,
    });
    return res.data;
  },
};
