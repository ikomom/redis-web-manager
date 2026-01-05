import { create } from "zustand";
import type { RedisConfig } from "../lib/types";

type ConnectionsLoadStatus = "idle" | "loading" | "loaded";

interface AppState {
  connections: RedisConfig[];
  activeConnectionId: string | null;
  connectionsLoadStatus: ConnectionsLoadStatus;
  setConnectionsLoadStatus: (status: ConnectionsLoadStatus) => void;
  setConnections: (connections: RedisConfig[]) => void;
  updateConnection: (config: RedisConfig) => void;
  setActiveConnection: (id: string | null) => void;
  getActiveConnection: () => RedisConfig | undefined;
}

export const useStore = create<AppState>((set, get) => ({
  connections: [],
  activeConnectionId: null,
  connectionsLoadStatus: "idle",
  setConnectionsLoadStatus: (status) => set({ connectionsLoadStatus: status }),
  setConnections: (connections) =>
    set({ connections, connectionsLoadStatus: "loaded" }),
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
