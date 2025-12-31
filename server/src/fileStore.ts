import fs from "fs";
import path from "path";
import { StoredConnection } from "./types";

export class FileStore {
  private filePath: string;
  private templatePath: string;

  constructor() {
    this.filePath = this.resolveConnectionsFilePath();
    this.templatePath = this.resolveTemplateFilePath();
    this.init();
  }

  private resolveConnectionsFilePath(): string {
    const envPathRaw = process.env.CONNECTIONS_FILE?.trim();
    const basePath = envPathRaw
      ? path.isAbsolute(envPathRaw)
        ? envPathRaw
        : path.join(process.cwd(), envPathRaw)
      : path.join(process.cwd(), "connections.json");

    try {
      if (fs.existsSync(basePath) && fs.statSync(basePath).isDirectory()) {
        return path.join(basePath, "connections.json");
      }
    } catch {}

    return basePath;
  }

  private resolveTemplateFilePath(): string {
    const envPathRaw = process.env.CONNECTIONS_TEMPLATE_FILE?.trim();
    const templateBase =
      envPathRaw && envPathRaw.length > 0
        ? envPathRaw
        : "connections.template.json";
    return path.isAbsolute(templateBase)
      ? templateBase
      : path.join(process.cwd(), templateBase);
  }

  private init() {
    const dir = path.dirname(this.filePath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    const shouldInitFromTemplate = !fs.existsSync(this.filePath);
    if (shouldInitFromTemplate) {
      const allowTemplate =
        typeof process.env.CONNECTIONS_FILE === "string" ||
        typeof process.env.CONNECTIONS_TEMPLATE_FILE === "string";

      if (allowTemplate) {
        const canCopyTemplate =
          fs.existsSync(this.templatePath) &&
          (() => {
            try {
              return fs.statSync(this.templatePath).isFile();
            } catch {
              return false;
            }
          })();

        if (canCopyTemplate) {
          fs.copyFileSync(this.templatePath, this.filePath);
          return;
        }
      }

      fs.writeFileSync(this.filePath, JSON.stringify([], null, 2));
    }
  }

  getAll(): StoredConnection[] {
    try {
      const data = fs.readFileSync(this.filePath, "utf-8");
      const parsed: unknown = JSON.parse(data);
      if (Array.isArray(parsed)) return parsed as StoredConnection[];
      return [];
    } catch (error) {
      console.error("Failed to read connections file:", error);
      return [];
    }
  }

  get(id: string): StoredConnection | undefined {
    const connections = this.getAll();
    return connections.find((c) => c.id === id);
  }

  add(connection: StoredConnection): void {
    const connections = this.getAll();
    connections.push(connection);
    this.save(connections);
  }

  remove(id: string): void {
    const connections = this.getAll();
    const filtered = connections.filter((c) => c.id !== id);
    this.save(filtered);
  }

  update(connection: StoredConnection): void {
    const connections = this.getAll();
    const index = connections.findIndex((c) => c.id === connection.id);
    if (index !== -1) {
      connections[index] = connection;
      this.save(connections);
    }
  }

  private save(connections: StoredConnection[]): void {
    try {
      fs.writeFileSync(this.filePath, JSON.stringify(connections, null, 2));
    } catch (error) {
      console.error("Failed to save connections file:", error);
    }
  }
}

export const fileStore = new FileStore();
