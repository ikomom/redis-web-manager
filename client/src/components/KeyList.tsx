import React, { useCallback, useEffect, useState, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { useStore } from "../store/useStore";
import { api } from "../lib/api";
import type { KeyItem } from "../lib/types";
import { Input } from "./ui/input";
import { ScrollArea } from "./ui/scroll-area";
import {
  RefreshCw,
  Search,
  Key as KeyIcon,
  ChevronRight,
  ChevronDown,
  Folder,
  FolderOpen,
  Database,
} from "lucide-react";
import { Button } from "./ui/button";
import { toast } from "sonner";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "./ui/select";

interface KeyListProps {
  onSelectKey: (key: string) => void;
  selectedKey: string | null;
  refreshTrigger: number; // to force refresh
}

interface TreeNode {
  name: string;
  fullPath: string;
  isKey: boolean;
  type?: string;
  children: Record<string, TreeNode>;
}

const buildTree = (keys: KeyItem[]) => {
  const root: Record<string, TreeNode> = {};

  keys.forEach((keyItem) => {
    const parts = keyItem.key.split(":");
    let currentLevel = root;

    parts.forEach((part, index) => {
      if (!currentLevel[part]) {
        currentLevel[part] = {
          name: part,
          fullPath: parts.slice(0, index + 1).join(":"),
          isKey: false,
          children: {},
        };
      }

      if (index === parts.length - 1) {
        currentLevel[part].isKey = true;
        currentLevel[part].type = keyItem.type;
      }

      currentLevel = currentLevel[part].children;
    });
  });

  return root;
};

const TreeNodeComponent: React.FC<{
  node: TreeNode;
  level: number;
  onSelectKey: (key: string) => void;
  selectedKey: string | null;
  forceExpand?: boolean;
}> = ({ node, level, onSelectKey, selectedKey, forceExpand }) => {
  const [isExpanded, setIsExpanded] = useState(!!forceExpand);
  const hasChildren = Object.keys(node.children).length > 0;

  const isSelected = node.isKey && selectedKey === node.fullPath;

  useEffect(() => {
    if (forceExpand) {
      setIsExpanded(true);
    }
  }, [forceExpand]);

  return (
    <div>
      <div
        className={`flex items-center gap-1 py-1 px-2 rounded cursor-pointer hover:bg-accent/50 ${
          isSelected ? "bg-accent text-accent-foreground" : ""
        }`}
        style={{ paddingLeft: `${level * 12 + 8}px` }}
        onClick={() => {
          if (hasChildren && !node.isKey) {
            setIsExpanded(!isExpanded);
          } else if (node.isKey) {
            onSelectKey(node.fullPath);
          } else {
            setIsExpanded(!isExpanded);
          }
        }}
      >
        {hasChildren ? (
          <button
            onClick={(e) => {
              e.stopPropagation();
              setIsExpanded(!isExpanded);
            }}
            className="p-0.5 hover:bg-muted rounded"
          >
            {isExpanded ? (
              <ChevronDown className="h-3 w-3 text-muted-foreground" />
            ) : (
              <ChevronRight className="h-3 w-3 text-muted-foreground" />
            )}
          </button>
        ) : (
          <div className="w-4" />
        )}

        {node.isKey ? (
          <KeyIcon className="h-3.5 w-3.5 text-blue-500" />
        ) : isExpanded ? (
          <FolderOpen className="h-3.5 w-3.5 text-yellow-500" />
        ) : (
          <Folder className="h-3.5 w-3.5 text-yellow-500" />
        )}

        <span className="text-sm truncate flex-1">{node.name}</span>

        {node.isKey && node.type && (
          <span className="text-[10px] bg-secondary px-1 rounded text-secondary-foreground">
            {node.type}
          </span>
        )}
      </div>

      {isExpanded && hasChildren && (
        <div>
          {Object.values(node.children)
            .sort((a, b) => {
              // Folders first, then keys
              const aIsFolder = Object.keys(a.children).length > 0 && !a.isKey;
              const bIsFolder = Object.keys(b.children).length > 0 && !b.isKey;
              if (aIsFolder && !bIsFolder) return -1;
              if (!aIsFolder && bIsFolder) return 1;
              return a.name.localeCompare(b.name);
            })
            .map((child) => (
              <TreeNodeComponent
                key={child.fullPath}
                node={child}
                level={level + 1}
                onSelectKey={onSelectKey}
                selectedKey={selectedKey}
                forceExpand={forceExpand}
              />
            ))}
        </div>
      )}
    </div>
  );
};

export const KeyList: React.FC<KeyListProps> = ({
  onSelectKey,
  selectedKey,
  refreshTrigger,
}) => {
  const { t } = useTranslation();
  const { getActiveConnection, updateConnection } = useStore();
  const activeConnection = getActiveConnection();
  const [keys, setKeys] = useState<KeyItem[]>([]);
  const [filter, setFilter] = useState("");
  const [loading, setLoading] = useState(false);

  const fetchKeys = useCallback(async () => {
    if (!activeConnection) {
      setKeys([]);
      return;
    }
    setLoading(true);
    try {
      const data = await api.getKeys(
        activeConnection,
        filter ? `*${filter}*` : "*"
      );
      setKeys(data);
    } catch (error) {
      toast.error(t("editor.loadError"));
      console.error(error);
    } finally {
      setLoading(false);
    }
  }, [activeConnection, filter, t]);

  useEffect(() => {
    fetchKeys();
  }, [activeConnection, refreshTrigger, fetchKeys]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    fetchKeys();
  };

  const treeData = useMemo(() => buildTree(keys), [keys]);

  if (!activeConnection) {
    return (
      <div className="p-4 text-muted-foreground text-center">
        {t("editor.selectConnection")}
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      <div className="p-2 border-b space-y-2">
        {/* DB Selector */}
        <div className="flex items-center gap-2">
          <Database className="w-4 h-4 text-muted-foreground" />
          <Select
            value={String(activeConnection.db || 0)}
            onValueChange={(val) => {
              updateConnection({ ...activeConnection, db: parseInt(val) });
              setFilter("");
            }}
          >
            <SelectTrigger className="h-8 text-xs">
              <SelectValue placeholder={t("keys.selectDB")} />
            </SelectTrigger>
            <SelectContent>
              {Array.from({ length: 16 }).map((_, i) => (
                <SelectItem key={i} value={String(i)}>
                  {t("keys.dbPrefix")} {i}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <form onSubmit={handleSearch} className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder={t("keys.search")}
              className="pl-8"
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
            />
          </div>
          <Button type="submit" size="icon" variant="outline">
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          </Button>
        </form>
        <div className="flex justify-between items-center text-xs text-muted-foreground px-1">
          <span>
            {keys.length} {t("keys.title")}
          </span>
        </div>
      </div>
      <ScrollArea className="flex-1">
        <div className="p-2 pb-10">
          {Object.values(treeData).length > 0
            ? Object.values(treeData)
                .sort((a, b) => {
                  const aIsFolder =
                    Object.keys(a.children).length > 0 && !a.isKey;
                  const bIsFolder =
                    Object.keys(b.children).length > 0 && !b.isKey;
                  if (aIsFolder && !bIsFolder) return -1;
                  if (!aIsFolder && bIsFolder) return 1;
                  return a.name.localeCompare(b.name);
                })
                .map((node) => (
                  <TreeNodeComponent
                    key={node.fullPath}
                    node={node}
                    level={0}
                    onSelectKey={onSelectKey}
                    selectedKey={selectedKey}
                    forceExpand={!!filter}
                  />
                ))
            : !loading && (
                <div className="text-center text-sm text-muted-foreground py-8">
                  {t("keys.noKeys")}
                </div>
              )}
        </div>
      </ScrollArea>
    </div>
  );
};
