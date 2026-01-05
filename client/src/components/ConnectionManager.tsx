import React, { useState, useEffect, useCallback } from "react";
import { useTranslation } from "react-i18next";
import { useStore } from "../store/useStore";
import { api } from "../lib/api";
import { Button } from "./ui/button";
import { Card, CardContent } from "./ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "./ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "./ui/dropdown-menu";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Trash2, Database, Globe, Plus, Pencil } from "lucide-react";
import { toast } from "sonner";

import { Skeleton } from "./ui/skeleton";

export const ConnectionManager: React.FC = () => {
  const { t, i18n } = useTranslation();
  const {
    connections,
    setConnections,
    connectionsLoadStatus,
    setConnectionsLoadStatus,
    setActiveConnection,
    activeConnectionId,
  } = useStore();
  const parseIntOrZero = (value: string): number => {
    const parsed = Number.parseInt(value, 10);
    return Number.isFinite(parsed) ? parsed : 0;
  };
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [mode, setMode] = useState<"create" | "edit">("create");
  const [formData, setFormData] = useState<{
    id?: string;
    name: string;
    host: string;
    port: number;
    password: string;
    db: number;
  }>({
    name: "Localhost",
    host: "127.0.0.1",
    port: 6379,
    password: "",
    db: 0,
  });

  const loadConnections = useCallback(async () => {
    setIsLoading(true);
    try {
      const data = await api.getConnections();
      setConnections(data);
    } catch (error) {
      console.error(error);
      setConnectionsLoadStatus("idle");
      toast.error(t("common.error"));
    } finally {
      setIsLoading(false);
    }
  }, [setConnections, setConnectionsLoadStatus, t]);

  useEffect(() => {
    if (connectionsLoadStatus !== "idle") return;
    setConnectionsLoadStatus("loading");
    loadConnections();
  }, [connectionsLoadStatus, loadConnections, setConnectionsLoadStatus]);

  const openCreateDialog = () => {
    setMode("create");
    setFormData({
      name: "Localhost",
      host: "127.0.0.1",
      port: 6379,
      password: "",
      db: 0,
    });
    setIsOpen(true);
  };

  const openEditDialog = (conn: {
    id: string;
    name: string;
    host: string;
    port: number;
    db?: number;
  }) => {
    setMode("edit");
    setFormData({
      id: conn.id,
      name: conn.name,
      host: conn.host,
      port: conn.port,
      password: "",
      db: conn.db ?? 0,
    });
    setIsOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const payloadBase = {
        id: formData.id,
        name: formData.name,
        host: formData.host,
        port: formData.port,
        db: formData.db,
      };
      const payload =
        formData.password.trim().length > 0
          ? { ...payloadBase, password: formData.password }
          : payloadBase;

      const newConnection = await api.saveConnection(payload);
      setConnectionsLoadStatus("loading");
      await loadConnections();
      setIsOpen(false);
      setActiveConnection(newConnection.id);
      toast.success(t("connections.save") + " " + t("editor.saveSuccess"));
    } catch (error) {
      console.error(error);
      toast.error(t("editor.saveError"));
    }
  };

  const handleRemove = async (id: string) => {
    try {
      await api.deleteConnection(id);
      setConnectionsLoadStatus("loading");
      await loadConnections();
      if (activeConnectionId === id) {
        setActiveConnection(null);
      }
      toast.success(t("editor.deleteSuccess"));
    } catch (error) {
      console.error(error);
      toast.error(t("editor.deleteError"));
    }
  };

  return (
    <div className="h-full flex flex-col bg-background">
      <div className="h-[52px] flex items-center justify-between px-4 border-b bg-muted/20 shrink-0">
        <div className="flex items-center gap-2">
          <h2 className="text-sm font-semibold">{t("connections.title")}</h2>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-6 w-6">
                <Globe className="h-3.5 w-3.5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              <DropdownMenuItem onClick={() => i18n.changeLanguage("en")}>
                English
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => i18n.changeLanguage("zh")}>
                中文
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
          <Button
            size="icon"
            variant="ghost"
            className="h-7 w-7"
            onClick={openCreateDialog}
          >
            <Plus className="h-4 w-4" />
          </Button>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {mode === "edit"
                  ? t("connections.editTitle")
                  : t("connections.addTitle")}
              </DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label>{t("connections.name")}</Label>
                <Input
                  value={formData.name}
                  onChange={(e) =>
                    setFormData({ ...formData, name: e.target.value })
                  }
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>{t("connections.host")}</Label>
                  <Input
                    value={formData.host}
                    onChange={(e) =>
                      setFormData({ ...formData, host: e.target.value })
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label>{t("connections.port")}</Label>
                  <Input
                    type="number"
                    value={formData.port}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        port: parseIntOrZero(e.target.value),
                      })
                    }
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label>{t("connections.dbIndex")}</Label>
                <Input
                  type="number"
                  value={formData.db}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      db: parseIntOrZero(e.target.value),
                    })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label>{t("connections.password")}</Label>
                <Input
                  type="password"
                  placeholder={
                    mode === "edit" ? t("connections.passwordKeep") : ""
                  }
                  value={formData.password}
                  onChange={(e) =>
                    setFormData({ ...formData, password: e.target.value })
                  }
                />
              </div>
              <Button type="submit" className="w-full">
                {t("connections.save")}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="flex-1 overflow-auto p-2 space-y-2">
        {isLoading ? (
          Array.from({ length: 3 }).map((_, i) => (
            <Card key={i} className="bg-accent/10">
              <CardContent className="p-3">
                <div className="flex items-center gap-2">
                  <Skeleton className="h-4 w-4 rounded-full" />
                  <div className="space-y-1 flex-1">
                    <Skeleton className="h-4 w-24" />
                    <Skeleton className="h-3 w-32" />
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        ) : (
          <>
            {connections.map((conn) => (
              <Card
                key={conn.id}
                className={`group cursor-pointer transition-all hover:shadow-sm border ${
                  activeConnectionId === conn.id
                    ? "border-primary/50 bg-primary/5 shadow-sm"
                    : "border-transparent hover:border-border hover:bg-accent/50"
                }`}
                onClick={() => setActiveConnection(conn.id)}
              >
                <CardContent className="p-3 flex items-center gap-3">
                  <div
                    className={`flex items-center justify-center w-8 h-8 rounded-md shrink-0 transition-colors ${
                      activeConnectionId === conn.id
                        ? "bg-primary/10 text-primary"
                        : "bg-muted/50 text-muted-foreground group-hover:bg-background"
                    }`}
                  >
                    <Database className="w-4 h-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div
                      className={`font-medium text-sm truncate transition-colors ${
                        activeConnectionId === conn.id
                          ? "text-primary"
                          : "text-foreground"
                      }`}
                      title={conn.name}
                    >
                      {conn.name}
                    </div>
                    <div
                      className="text-xs text-muted-foreground truncate font-mono"
                      title={`${conn.host}:${conn.port}`}
                    >
                      {conn.host}:{conn.port}
                    </div>
                  </div>
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 text-muted-foreground hover:text-primary hover:bg-primary/10"
                      onClick={(e) => {
                        e.stopPropagation();
                        openEditDialog(conn);
                      }}
                    >
                      <Pencil className="w-3.5 h-3.5" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleRemove(conn.id);
                      }}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
            {connections.length === 0 && (
              <div className="text-center text-sm text-muted-foreground py-4">
                {t("connections.noConnections")}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};
