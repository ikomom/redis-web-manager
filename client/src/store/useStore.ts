import { create } from "zustand";
import type { RedisConfig } from "../lib/types";

interface AppState {
  connections: RedisConfig[];
  activeConnectionId: string | null;
  setConnections: (connections: RedisConfig[]) => void;
  updateConnection: (config: RedisConfig) => void;
  setActiveConnection: (id: string | null) => void;
  getActiveConnection: () => RedisConfig | undefined;
}

export const useStore = create<AppState>((set, get) => ({
  connections: [],
  activeConnectionId: null,
  setConnections: (connections) => set({ connections }),
  updateConnection: (config) =>
    set((state) => ({
      connections: state.connections.map((c) =>
        c.id === config.id ? config : c
      ),
    })),
  setActiveConnection: (id) => set({ activeConnectionId: id }),
  getActiveConnection: () =>
    get().connections.find((c) => c.id === get().activeConnectionId),
}));
