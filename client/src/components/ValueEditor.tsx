import React, {
  useCallback,
  useEffect,
  useMemo,
  useState,
  useRef,
} from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { RefreshCw, Save, Trash } from "lucide-react";

import { useStore } from "../store/useStore";
import { api } from "../lib/api";
import type { RedisValue } from "../lib/types";

import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Skeleton } from "./ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "./ui/select";

import {
  COLLECTION_PREVIEW_LIMIT,
  MAX_PREVIEW_BYTES,
} from "./editor/constants";
import type { CollectionMeta, HllMeta } from "./editor/types";
import { bytesToBase64, bytesToHex, toIntOr } from "./editor/utils";
import { HashPanel } from "./editor/panels/HashPanel";
import { HyperLogLogPanel } from "./editor/panels/HyperLogLogPanel";
import { ListPanel } from "./editor/panels/ListPanel";
import { SetPanel } from "./editor/panels/SetPanel";
import { TextValuePanel } from "./editor/panels/TextValuePanel";

type ViewMode = "text" | "json" | "hex" | "base64";

interface ValueEditorProps {
  currentKey: string | null;
  onKeyDeleted: () => void;
  onKeyUpdated: () => void;
  onKeyRenamed?: (newKey: string) => void;
}

export const ValueEditor: React.FC<ValueEditorProps> = ({
  currentKey,
  onKeyDeleted,
  onKeyUpdated,
  onKeyRenamed,
}) => {
  const { t } = useTranslation();
  const { getActiveConnection } = useStore();
  const activeConnection = getActiveConnection();

  const [type, setType] = useState<string>("string");
  const [value, setValue] = useState<string>("");
  const [ttl, setTtl] = useState<number>(-1);
  const [newKeyName, setNewKeyName] = useState<string>("");
  const [viewMode, setViewMode] = useState<ViewMode>("text");

  const [hllMeta, setHllMeta] = useState<HllMeta | null>(null);
  const [collectionMeta, setCollectionMeta] = useState<CollectionMeta | null>(
    null
  );
  const [hashRows, setHashRows] = useState<
    Array<{ field: string; value: string }>
  >([]);
  const [listItems, setListItems] = useState<string[]>([]);
  const [setMembers, setSetMembers] = useState<string[]>([]);

  const [hashNextCursor, setHashNextCursor] = useState<string>("0");
  const [setNextCursor, setSetNextCursor] = useState<string>("0");
  const [listBaseStart, setListBaseStart] = useState<number>(0);
  const [listNextStart, setListNextStart] = useState<number>(0);

  const lastRenamedTo = useRef<string | null>(null);
  const loadingKeyRef = useRef<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);

  const isNew = !currentKey;
  const isCollectionType = type === "hash" || type === "list" || type === "set";
  const isStructuredEditor = type === "hyperloglog" || isCollectionType;
  const saveDisabled =
    type === "hyperloglog" ||
    type === "hash" ||
    type === "list" ||
    type === "set" ||
    type === "zset";

  const loadValue = useCallback(
    async (key: string) => {
      if (!activeConnection) return;

      loadingKeyRef.current = key;
      setIsLoading(true);

      try {
        const data = await api.getValue(activeConnection, key, {
          previewLimit: COLLECTION_PREVIEW_LIMIT,
        });

        setNewKeyName(key);
        setTtl(data.ttl);

        if (data.type === "hyperloglog") {
          setType("hyperloglog");
          setHllMeta({
            count: typeof data.meta?.count === "number" ? data.meta.count : 0,
            bytes:
              typeof data.meta?.bytes === "number"
                ? data.meta.bytes
                : typeof data.meta?.hllBytes === "number"
                ? data.meta.hllBytes
                : 0,
          });
          setCollectionMeta(null);
          setHashRows([]);
          setListItems([]);
          setSetMembers([]);
          setHashNextCursor("0");
          setSetNextCursor("0");
          setListBaseStart(0);
          setListNextStart(0);
          setValue("");
          setViewMode("text");
          return;
        }

        setHllMeta(null);

        if (data.type === "string") {
          setType("string");
          setCollectionMeta(null);
          setHashRows([]);
          setListItems([]);
          setSetMembers([]);
          setHashNextCursor("0");
          setSetNextCursor("0");
          setListBaseStart(0);
          setListNextStart(0);
          setValue(typeof data.value === "string" ? data.value : "");
          return;
        }

        if (data.type === "json" || data.type === "ReJSON-RL") {
          setType("json");
          setCollectionMeta(null);
          setHashRows([]);
          setListItems([]);
          setSetMembers([]);
          setHashNextCursor("0");
          setSetNextCursor("0");
          setListBaseStart(0);
          setListNextStart(0);
          setValue(JSON.stringify(data.value, null, 2));
          return;
        }

        if (data.type === "hash") {
          setType("hash");
          const obj =
            data.value &&
            typeof data.value === "object" &&
            !Array.isArray(data.value)
              ? (data.value as Record<string, unknown>)
              : {};
          const entries = Object.entries(obj)
            .filter(([, v]) => typeof v === "string")
            .map(([field, v]) => ({ field, value: v as string }))
            .sort((a, b) => a.field.localeCompare(b.field));

          const total = toIntOr(data.meta?.total, entries.length);
          const truncated =
            typeof data.meta?.truncated === "boolean"
              ? data.meta.truncated
              : total > entries.length;

          const nextCursor =
            typeof data.meta?.nextCursor === "string"
              ? data.meta.nextCursor
              : "0";

          setCollectionMeta({
            total,
            truncated,
            previewCount: entries.length,
          });
          setHashRows(entries);
          setListItems([]);
          setSetMembers([]);
          setHashNextCursor(nextCursor);
          setSetNextCursor("0");
          setListBaseStart(0);
          setListNextStart(0);
          setValue(JSON.stringify(obj, null, 2));
          setViewMode("text");
          return;
        }

        if (data.type === "list") {
          setType("list");
          const items = Array.isArray(data.value)
            ? data.value.filter((v): v is string => typeof v === "string")
            : [];
          const total = toIntOr(data.meta?.total, items.length);
          const truncated =
            typeof data.meta?.truncated === "boolean"
              ? data.meta.truncated
              : total > items.length;
          const baseStart = toIntOr(data.meta?.start, 0);
          const end = toIntOr(data.meta?.end, baseStart + items.length - 1);

          setCollectionMeta({
            total,
            truncated,
            previewCount: items.length,
          });
          setHashRows([]);
          setListItems(items);
          setSetMembers([]);
          setHashNextCursor("0");
          setSetNextCursor("0");
          setListBaseStart(baseStart);
          setListNextStart(end + 1);
          setValue(JSON.stringify(items, null, 2));
          setViewMode("text");
          return;
        }

        if (data.type === "set") {
          setType("set");
          const members = Array.isArray(data.value)
            ? data.value.filter((v): v is string => typeof v === "string")
            : [];
          const total = toIntOr(data.meta?.total, members.length);
          const truncated =
            typeof data.meta?.truncated === "boolean"
              ? data.meta.truncated
              : total > members.length;
          const nextCursor =
            typeof data.meta?.nextCursor === "string"
              ? data.meta.nextCursor
              : "0";

          setCollectionMeta({
            total,
            truncated,
            previewCount: members.length,
          });
          setHashRows([]);
          setListItems([]);
          setSetMembers(members);
          setHashNextCursor("0");
          setSetNextCursor(nextCursor);
          setListBaseStart(0);
          setListNextStart(0);
          setValue(JSON.stringify(members, null, 2));
          setViewMode("text");
          return;
        }

        setType(data.type);
        setCollectionMeta(null);
        setHashRows([]);
        setListItems([]);
        setSetMembers([]);
        setHashNextCursor("0");
        setSetNextCursor("0");
        setListBaseStart(0);
        setListNextStart(0);
        setValue(JSON.stringify(data.value, null, 2));
      } catch (error) {
        console.error(error);
        toast.error(t("editor.loadError"));
      } finally {
        if (loadingKeyRef.current === key) {
          setIsLoading(false);
        }
      }
    },
    [activeConnection, t]
  );

  useEffect(() => {
    if (currentKey !== null && activeConnection) {
      setNewKeyName(currentKey);
      setValue("");
      setTtl(-1);
      setType("string");
      setViewMode("text");
      setHllMeta(null);
      setCollectionMeta(null);
      setHashRows([]);
      setListItems([]);
      setSetMembers([]);
      setHashNextCursor("0");
      setSetNextCursor("0");
      setListBaseStart(0);
      setListNextStart(0);

      loadValue(currentKey);
      if (currentKey === lastRenamedTo.current) {
        lastRenamedTo.current = null;
      }
      return;
    }
    if (currentKey === null) {
      setNewKeyName("");
      setValue("");
      setTtl(-1);
      setType("string");
      setViewMode("text");
      setHllMeta(null);
      setCollectionMeta(null);
      setHashRows([]);
      setListItems([]);
      setSetMembers([]);
      setHashNextCursor("0");
      setSetNextCursor("0");
      setListBaseStart(0);
      setListNextStart(0);
    }
  }, [currentKey, activeConnection, loadValue]);

  useEffect(() => {
    if (isStructuredEditor && viewMode !== "text") setViewMode("text");
  }, [isStructuredEditor, viewMode]);

  const byteLength = useMemo(() => {
    if (type === "hyperloglog" && hllMeta) return hllMeta.bytes;
    return new TextEncoder().encode(value).length;
  }, [type, hllMeta, value]);

  const bitLength = useMemo(() => byteLength * 8, [byteLength]);

  const displayValue = useMemo(() => {
    try {
      if (viewMode === "json") {
        try {
          const parsed = JSON.parse(value) as unknown;
          return JSON.stringify(parsed, null, 2);
        } catch {
          return value;
        }
      }

      if (viewMode === "hex") {
        const bytes = new TextEncoder().encode(value);
        const truncated = bytes.length > MAX_PREVIEW_BYTES;
        const preview = truncated
          ? bytes.subarray(0, MAX_PREVIEW_BYTES)
          : bytes;
        const hex = bytesToHex(preview);
        return truncated ? `${hex}\n...\n(${t("common.truncated")})` : hex;
      }

      if (viewMode === "base64") {
        const bytes = new TextEncoder().encode(value);
        const truncated = bytes.length > MAX_PREVIEW_BYTES;
        const preview = truncated
          ? bytes.subarray(0, MAX_PREVIEW_BYTES)
          : bytes;
        const base64 = bytesToBase64(preview);
        return truncated
          ? `${base64}\n...\n(${t("common.truncated")})`
          : base64;
      }

      return value;
    } catch {
      return t("common.error");
    }
  }, [value, viewMode, t]);

  const editorLanguage = useMemo(() => {
    if (viewMode === "json") return "json";
    if (type === "json") return "json";
    return "plaintext";
  }, [type, viewMode]);

  const handleRefresh = useCallback(async () => {
    if (!currentKey) return;
    await loadValue(currentKey);
    toast.success(t("editor.refreshSuccess"));
  }, [currentKey, loadValue, t]);

  const handleSave = useCallback(async () => {
    if (!activeConnection) return;
    const keyToUse = isNew ? newKeyName : currentKey;
    if (!newKeyName) {
      toast.error(t("editor.keyRequired"));
      return;
    }

    // Handle Rename
    if (!isNew && currentKey && newKeyName !== currentKey) {
      if (lastRenamedTo.current === newKeyName) {
        if (saveDisabled) {
          toast.success(t("editor.saveSuccess"));
          return;
        }
      } else {
        try {
          await api.renameKey(activeConnection, currentKey, newKeyName);
          lastRenamedTo.current = newKeyName;

          if (onKeyRenamed) {
            onKeyRenamed(newKeyName);
          } else {
            onKeyUpdated();
          }

          // If type is complex, we stop here (value saving is handled by specific actions)
          if (saveDisabled) {
            toast.success(t("editor.saveSuccess"));
            return;
          }
        } catch (error) {
          console.error(error);
          toast.error(t("editor.saveError")); // Using saveError as generic error for rename failure
          return;
        }
      }
    }

    // For complex types without rename, we return (should be handled by button disabled state, but good for safety)
    if (saveDisabled && (!currentKey || newKeyName === currentKey)) {
      if (type === "hyperloglog") toast.error(t("editor.hll.saveDisabled"));
      else toast.error(t("editor.unsupportedSave"));
      return;
    }

    try {
      let valToSend: RedisValue = value;
      if (type !== "string") {
        try {
          valToSend = JSON.parse(value) as RedisValue;
        } catch (e) {
          console.error(e);
          toast.error(t("editor.invalidJson"));
          return;
        }
      }

      // If we renamed, keyToUse should be newKeyName (which is what we want for setValue)
      // But wait, keyToUse logic above was: const keyToUse = isNew ? newKeyName : currentKey;
      // If we renamed, currentKey is still old name until parent updates props.
      // So we should use newKeyName for setValue if we renamed.

      const targetKey =
        !isNew && newKeyName !== currentKey ? newKeyName : keyToUse;

      if (!targetKey) return;

      await api.setValue(activeConnection, targetKey, valToSend, type, ttl);
      toast.success(t("editor.saveSuccess"));
      onKeyUpdated();
    } catch (error) {
      console.error(error);
      toast.error(t("editor.saveError"));
    }
  }, [
    activeConnection,
    currentKey,
    isNew,
    newKeyName,
    onKeyUpdated,
    onKeyRenamed,
    saveDisabled,
    t,
    ttl,
    type,
    value,
  ]);

  const handleDelete = useCallback(async () => {
    if (!activeConnection || !currentKey) return;
    if (!confirm(t("editor.deleteConfirm"))) return;
    try {
      await api.deleteKey(activeConnection, currentKey);
      toast.success(t("editor.deleteSuccess"));
      onKeyDeleted();
    } catch (error) {
      console.error(error);
      toast.error(t("editor.deleteError"));
    }
  }, [activeConnection, currentKey, onKeyDeleted, t]);

  const handleHashSetField = useCallback(
    async (field: string, fieldValue: string) => {
      if (!activeConnection) return;
      if (!newKeyName) {
        toast.error(t("editor.keyRequired"));
        return;
      }
      if (!field) {
        toast.error(t("editor.collection.fieldPlaceholder"));
        return;
      }
      try {
        await api.hashSetField(
          activeConnection,
          newKeyName,
          field,
          fieldValue,
          ttl
        );
        await loadValue(newKeyName);
        toast.success(t("editor.saveSuccess"));
        onKeyUpdated();
      } catch (error) {
        console.error(error);
        toast.error(t("common.error"));
      }
    },
    [activeConnection, loadValue, newKeyName, onKeyUpdated, t, ttl]
  );

  const handleHashDeleteField = useCallback(
    async (field: string) => {
      if (!activeConnection) return;
      if (!newKeyName) {
        toast.error(t("editor.keyRequired"));
        return;
      }
      try {
        await api.hashDelField(activeConnection, newKeyName, field);
        await loadValue(newKeyName);
        toast.success(t("editor.deleteSuccess"));
        onKeyUpdated();
      } catch (error) {
        console.error(error);
        toast.error(t("common.error"));
      }
    },
    [activeConnection, loadValue, newKeyName, onKeyUpdated, t]
  );

  const handleHashLoadMore = useCallback(async () => {
    if (!activeConnection || !newKeyName) return;
    if (hashNextCursor === "0") return;
    try {
      const data = await api.getValue(activeConnection, newKeyName, {
        previewLimit: COLLECTION_PREVIEW_LIMIT,
        cursor: hashNextCursor,
      });
      if (data.type !== "hash") return;

      const obj =
        data.value &&
        typeof data.value === "object" &&
        !Array.isArray(data.value)
          ? (data.value as Record<string, unknown>)
          : {};
      const entries = Object.entries(obj)
        .filter(([, v]) => typeof v === "string")
        .map(([field, v]) => ({ field, value: v as string }));

      const nextCursor =
        typeof data.meta?.nextCursor === "string" ? data.meta.nextCursor : "0";

      setHashNextCursor(nextCursor);
      setHashRows((prev) => {
        const merged = new Map<string, string>();
        prev.forEach((row) => merged.set(row.field, row.value));
        entries.forEach((row) => merged.set(row.field, row.value));
        return Array.from(merged.entries())
          .map(([field, value]) => ({ field, value }))
          .sort((a, b) => a.field.localeCompare(b.field));
      });
    } catch (error) {
      console.error(error);
      toast.error(t("common.error"));
    }
  }, [activeConnection, hashNextCursor, newKeyName, t]);

  const handleListPush = useCallback(
    async (values: string[], direction: "left" | "right") => {
      if (!activeConnection) return;
      if (!newKeyName) {
        toast.error(t("editor.keyRequired"));
        return;
      }
      if (values.length === 0) {
        toast.error(t("editor.collection.membersPlaceholder"));
        return;
      }
      try {
        await api.listPush(
          activeConnection,
          newKeyName,
          values,
          direction,
          ttl
        );
        await loadValue(newKeyName);
        toast.success(t("editor.saveSuccess"));
        onKeyUpdated();
      } catch (error) {
        console.error(error);
        toast.error(t("common.error"));
      }
    },
    [activeConnection, loadValue, newKeyName, onKeyUpdated, t, ttl]
  );

  const handleListSetAt = useCallback(
    async (index: number, itemValue: string) => {
      if (!activeConnection) return;
      if (!newKeyName) {
        toast.error(t("editor.keyRequired"));
        return;
      }
      if (!Number.isInteger(index)) {
        toast.error(t("editor.collection.indexPlaceholder"));
        return;
      }
      try {
        await api.listSetAt(activeConnection, newKeyName, index, itemValue);
        await loadValue(newKeyName);
        toast.success(t("editor.saveSuccess"));
        onKeyUpdated();
      } catch (error) {
        console.error(error);
        toast.error(t("common.error"));
      }
    },
    [activeConnection, loadValue, newKeyName, onKeyUpdated, t]
  );

  const handleListDeleteAt = useCallback(
    async (index: number) => {
      if (!activeConnection) return;
      if (!newKeyName) {
        toast.error(t("editor.keyRequired"));
        return;
      }
      if (!Number.isInteger(index)) {
        toast.error(t("editor.collection.indexPlaceholder"));
        return;
      }
      try {
        await api.listDelAt(activeConnection, newKeyName, index);
        await loadValue(newKeyName);
        toast.success(t("editor.deleteSuccess"));
        onKeyUpdated();
      } catch (error) {
        console.error(error);
        toast.error(t("common.error"));
      }
    },
    [activeConnection, loadValue, newKeyName, onKeyUpdated, t]
  );

  const handleListLoadMore = useCallback(async () => {
    if (!activeConnection || !newKeyName) return;
    if (listNextStart <= 0) return;
    try {
      const data = await api.getValue(activeConnection, newKeyName, {
        previewLimit: COLLECTION_PREVIEW_LIMIT,
        start: listNextStart,
      });
      if (data.type !== "list") return;

      const items = Array.isArray(data.value)
        ? data.value.filter((v): v is string => typeof v === "string")
        : [];
      const end = toIntOr(data.meta?.end, listNextStart + items.length - 1);

      setListNextStart(end + 1);
      setListItems((prev) => [...prev, ...items]);

      const total = toIntOr(data.meta?.total, 0);
      const nextPreviewCount =
        (collectionMeta?.previewCount ?? 0) + items.length;
      const truncated =
        typeof data.meta?.truncated === "boolean"
          ? data.meta.truncated
          : total > listNextStart + items.length;
      setCollectionMeta({
        total: total > 0 ? total : collectionMeta?.total ?? 0,
        previewCount: nextPreviewCount,
        truncated,
      });
    } catch (error) {
      console.error(error);
      toast.error(t("common.error"));
    }
  }, [activeConnection, collectionMeta, listNextStart, newKeyName, t]);

  const handleSetAdd = useCallback(
    async (members: string[]) => {
      if (!activeConnection) return;
      if (!newKeyName) {
        toast.error(t("editor.keyRequired"));
        return;
      }
      if (members.length === 0) {
        toast.error(t("editor.collection.membersPlaceholder"));
        return;
      }
      try {
        await api.setAdd(activeConnection, newKeyName, members, ttl);
        await loadValue(newKeyName);
        toast.success(t("editor.saveSuccess"));
        onKeyUpdated();
      } catch (error) {
        console.error(error);
        toast.error(t("common.error"));
      }
    },
    [activeConnection, loadValue, newKeyName, onKeyUpdated, t, ttl]
  );

  const handleSetRem = useCallback(
    async (members: string[]) => {
      if (!activeConnection) return;
      if (!newKeyName) {
        toast.error(t("editor.keyRequired"));
        return;
      }
      if (members.length === 0) {
        toast.error(t("editor.collection.membersPlaceholder"));
        return;
      }
      try {
        await api.setRem(activeConnection, newKeyName, members);
        await loadValue(newKeyName);
        toast.success(t("editor.deleteSuccess"));
        onKeyUpdated();
      } catch (error) {
        console.error(error);
        toast.error(t("common.error"));
      }
    },
    [activeConnection, loadValue, newKeyName, onKeyUpdated, t]
  );

  const handleSetLoadMore = useCallback(async () => {
    if (!activeConnection || !newKeyName) return;
    if (setNextCursor === "0") return;
    try {
      const data = await api.getValue(activeConnection, newKeyName, {
        previewLimit: COLLECTION_PREVIEW_LIMIT,
        cursor: setNextCursor,
      });
      if (data.type !== "set") return;

      const members = Array.isArray(data.value)
        ? data.value.filter((v): v is string => typeof v === "string")
        : [];
      const nextCursor =
        typeof data.meta?.nextCursor === "string" ? data.meta.nextCursor : "0";

      setSetNextCursor(nextCursor);
      setSetMembers((prev) => Array.from(new Set([...prev, ...members])));
    } catch (error) {
      console.error(error);
      toast.error(t("common.error"));
    }
  }, [activeConnection, newKeyName, setNextCursor, t]);

  const handleHllRefresh = useCallback(async () => {
    if (!activeConnection) return;
    if (!newKeyName) {
      toast.error(t("editor.keyRequired"));
      return;
    }
    try {
      const data = await api.hllCount(activeConnection, newKeyName);
      setHllMeta({ count: data.count, bytes: data.bytes });
      toast.success(t("editor.hll.refreshSuccess"));
    } catch (error) {
      console.error(error);
      toast.error(t("common.error"));
    }
  }, [activeConnection, newKeyName, t]);

  const handleHllAdd = useCallback(
    async (elements: string[]) => {
      if (!activeConnection) return;
      if (!newKeyName) {
        toast.error(t("editor.keyRequired"));
        return;
      }
      if (elements.length === 0) {
        toast.error(t("editor.hll.elementsRequired"));
        return;
      }
      try {
        const data = await api.hllAdd(
          activeConnection,
          newKeyName,
          elements,
          ttl
        );
        setHllMeta({ count: data.count, bytes: data.bytes });
        toast.success(t("editor.hll.addSuccess"));
        onKeyUpdated();
      } catch (error) {
        console.error(error);
        toast.error(t("common.error"));
      }
    },
    [activeConnection, newKeyName, onKeyUpdated, t, ttl]
  );

  const handleHllReset = useCallback(
    async (elements?: string[]) => {
      if (!activeConnection) return;
      if (!newKeyName) {
        toast.error(t("editor.keyRequired"));
        return;
      }
      try {
        const data = await api.hllReset(
          activeConnection,
          newKeyName,
          elements && elements.length > 0 ? elements : undefined,
          ttl
        );
        setHllMeta({ count: data.count, bytes: data.bytes });
        toast.success(t("editor.hll.resetSuccess"));
        onKeyUpdated();
      } catch (error) {
        console.error(error);
        toast.error(t("common.error"));
      }
    },
    [activeConnection, newKeyName, onKeyUpdated, t, ttl]
  );

  const handleHllMerge = useCallback(
    async (sourceKeys: string[]) => {
      if (!activeConnection) return;
      if (!newKeyName) {
        toast.error(t("editor.keyRequired"));
        return;
      }
      if (sourceKeys.length === 0) {
        toast.error(t("editor.hll.sourceKeysRequired"));
        return;
      }
      try {
        const data = await api.hllMerge(
          activeConnection,
          newKeyName,
          sourceKeys,
          ttl
        );
        setHllMeta({ count: data.count, bytes: data.bytes });
        toast.success(t("editor.hll.mergeSuccess"));
        onKeyUpdated();
      } catch (error) {
        console.error(error);
        toast.error(t("common.error"));
      }
    },
    [activeConnection, newKeyName, onKeyUpdated, t, ttl]
  );

  if (!activeConnection) {
    return (
      <div className="p-10 text-center text-muted-foreground">
        {t("editor.selectConnection")}
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col bg-background">
      <div className="h-[52px] flex items-center justify-between px-4 border-b bg-muted/20 shrink-0">
        <div className="font-semibold text-sm">
          {isNew ? t("editor.newKey") : t("editor.editKey")}
        </div>
        <div className="flex gap-2">
          {!isNew && (
            <>
              <Button
                variant="ghost"
                size="icon"
                onClick={handleRefresh}
                disabled={isLoading}
                title={t("editor.refresh")}
              >
                <RefreshCw className="w-4 h-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={handleDelete}
                disabled={isLoading}
                className="text-destructive hover:text-destructive"
              >
                <Trash className="w-4 h-4" />
              </Button>
            </>
          )}
          {(!saveDisabled || (!isNew && newKeyName !== currentKey)) && (
            <Button size="sm" onClick={handleSave} disabled={isLoading}>
              <Save className="w-4 h-4 mr-2" />
              {t("editor.save")}
            </Button>
          )}
        </div>
      </div>

      <div
        className={`relative flex-1 flex flex-col gap-4 overflow-hidden p-4 transition-all duration-300 ${
          isLoading
            ? "opacity-60 blur-[1px]"
            : "opacity-100 animate-in fade-in-0 zoom-in-95"
        }`}
      >
        {isLoading && (
          <div className="pointer-events-none absolute inset-0 z-10 flex flex-col gap-4 p-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Skeleton className="h-4 w-24 animate-none bg-muted/35" />
                <Skeleton className="h-9 w-full animate-none bg-muted/35" />
              </div>
              <div className="space-y-2">
                <Skeleton className="h-4 w-20 animate-none bg-muted/35" />
                <Skeleton className="h-9 w-full animate-none bg-muted/35" />
              </div>
            </div>
            <div className="flex items-center gap-4">
              <Skeleton className="h-9 flex-1 animate-none bg-muted/35" />
              <Skeleton className="h-9 flex-1 animate-none bg-muted/35" />
              <Skeleton className="h-9 flex-1 animate-none bg-muted/35" />
            </div>
            <div className="flex-1 flex flex-col space-y-2">
              <Skeleton className="h-4 w-24 animate-none bg-muted/35" />
              <Skeleton className="h-full w-full animate-none bg-muted/35" />
            </div>
          </div>
        )}
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>{t("editor.key")}</Label>
            <Input
              value={newKeyName}
              onChange={(e) => setNewKeyName(e.target.value)}
              disabled={isLoading}
              className="font-mono"
              placeholder={t("editor.keyName")}
            />
          </div>
          <div className="space-y-2">
            <Label>{t("editor.type")}</Label>
            <Select value={type} onValueChange={setType} disabled={!isNew}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="string">
                  {t("editor.types.string")}
                </SelectItem>
                <SelectItem value="json">{t("editor.types.json")}</SelectItem>
                <SelectItem value="hyperloglog">
                  {t("editor.types.hyperloglog")}
                </SelectItem>
                <SelectItem value="hash">{t("editor.types.hash")}</SelectItem>
                <SelectItem value="list">{t("editor.types.list")}</SelectItem>
                <SelectItem value="set">{t("editor.types.set")}</SelectItem>
                <SelectItem value="zset">{t("editor.types.zset")}</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div className="flex-1 flex items-center gap-2">
            <Label className="whitespace-nowrap">{t("editor.ttl")}</Label>
            <Input
              type="number"
              value={ttl}
              onChange={(e) => setTtl(parseInt(e.target.value))}
              placeholder={t("editor.noExpiry")}
            />
          </div>
          <div className="flex-1 flex items-center gap-2">
            <Label className="whitespace-nowrap">{t("editor.viewAs")}</Label>
            <Select
              value={viewMode}
              onValueChange={(v) =>
                setViewMode(
                  v === "json" || v === "hex" || v === "base64" ? v : "text"
                )
              }
              disabled={isStructuredEditor}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="text">
                  {t("editor.viewModes.text")}
                </SelectItem>
                <SelectItem value="json">
                  {t("editor.viewModes.json")}
                </SelectItem>
                <SelectItem value="hex">{t("editor.viewModes.hex")}</SelectItem>
                <SelectItem value="base64">
                  {t("editor.viewModes.base64")}
                </SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex-1 flex items-center gap-2">
            <Label className="whitespace-nowrap">{t("editor.bits")}</Label>
            <Input value={String(bitLength)} readOnly />
          </div>
        </div>

        <div className="flex-1 flex flex-col space-y-2 overflow-hidden">
          <Label>{t("editor.value")}</Label>

          <div className="flex-1 overflow-hidden border rounded-md">
            {type === "hyperloglog" ? (
              <HyperLogLogPanel
                meta={hllMeta}
                onAdd={handleHllAdd}
                onReset={handleHllReset}
                onRefresh={handleHllRefresh}
                onMerge={handleHllMerge}
              />
            ) : type === "hash" ? (
              <HashPanel
                meta={collectionMeta}
                nextCursor={hashNextCursor}
                rows={hashRows}
                onLoadMore={handleHashLoadMore}
                onSetField={handleHashSetField}
                onDeleteField={handleHashDeleteField}
              />
            ) : type === "list" ? (
              <ListPanel
                meta={collectionMeta}
                baseStart={listBaseStart}
                nextStart={listNextStart}
                items={listItems}
                onLoadMore={handleListLoadMore}
                onPush={handleListPush}
                onSetAt={handleListSetAt}
                onDeleteAt={handleListDeleteAt}
              />
            ) : type === "set" ? (
              <SetPanel
                meta={collectionMeta}
                nextCursor={setNextCursor}
                members={setMembers}
                onLoadMore={handleSetLoadMore}
                onAdd={handleSetAdd}
                onRem={handleSetRem}
              />
            ) : (
              <TextValuePanel
                viewMode={viewMode}
                language={editorLanguage}
                value={value}
                displayValue={displayValue}
                onChange={setValue}
              />
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
