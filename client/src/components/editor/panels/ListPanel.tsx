import React, { useCallback, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "../../ui/button";
import { Label } from "../../ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../../ui/select";
import { Textarea } from "../../ui/textarea";
import type { CollectionMeta } from "../types";
import { parseLinesOrComma } from "../utils";

type ListPanelProps = {
  meta: CollectionMeta | null;
  baseStart: number;
  nextStart: number;
  items: string[];
  onLoadMore: () => Promise<void>;
  onPush: (values: string[], direction: "left" | "right") => Promise<void>;
  onSetAt: (index: number, value: string) => Promise<void>;
  onDeleteAt: (index: number) => Promise<void>;
};

export const ListPanel: React.FC<ListPanelProps> = ({
  meta,
  baseStart,
  nextStart,
  items,
  onLoadMore,
  onPush,
  onSetAt,
  onDeleteAt,
}) => {
  const { t } = useTranslation();
  const [pushValuesInput, setPushValuesInput] = useState("");
  const [pushDirection, setPushDirection] = useState<"left" | "right">("right");
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [editingValue, setEditingValue] = useState("");

  const canLoadMore = useMemo(() => {
    if (!meta?.truncated) return false;
    if (typeof meta.total !== "number") return false;
    return nextStart < meta.total;
  }, [meta, nextStart]);

  const handlePush = useCallback(async () => {
    const values = parseLinesOrComma(pushValuesInput);
    await onPush(values, pushDirection);
    setPushValuesInput("");
  }, [pushValuesInput, pushDirection, onPush]);

  const startEdit = useCallback(
    (idx: number) => {
      const current = items[idx] ?? "";
      setEditingIndex(idx);
      setEditingValue(current);
    },
    [items]
  );

  const cancelEdit = useCallback(() => {
    setEditingIndex(null);
    setEditingValue("");
  }, []);

  const saveEdit = useCallback(async () => {
    if (editingIndex === null) return;
    const absoluteIndex = baseStart + editingIndex;
    await onSetAt(absoluteIndex, editingValue);
    setEditingIndex(null);
    setEditingValue("");
  }, [baseStart, editingIndex, editingValue, onSetAt]);

  return (
    <div className="p-3 h-full overflow-auto space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div className="text-sm text-muted-foreground">
          {typeof meta?.total === "number"
            ? `${meta.previewCount}/${meta.total}`
            : ""}
          {meta?.truncated ? ` · ${t("common.truncated")}` : ""}
        </div>
        <Button
          size="sm"
          variant="outline"
          onClick={onLoadMore}
          disabled={!canLoadMore}
        >
          {t("editor.collection.loadMore")}
        </Button>
      </div>

      <div className="space-y-2">
        <Label>{t("editor.collection.add")}</Label>
        <Textarea
          value={pushValuesInput}
          onChange={(e) => setPushValuesInput(e.target.value)}
          placeholder={t("editor.collection.membersPlaceholder")}
        />
        <div className="flex gap-2 items-center">
          <Select
            value={pushDirection}
            onValueChange={(v) =>
              setPushDirection(v === "left" ? "left" : "right")
            }
          >
            <SelectTrigger className="w-[210px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="left">{t("editor.list.lpush")}</SelectItem>
              <SelectItem value="right">{t("editor.list.rpush")}</SelectItem>
            </SelectContent>
          </Select>
          <Button size="sm" onClick={handlePush}>
            {t("editor.collection.add")}
          </Button>
        </div>
      </div>

      <div className="space-y-2">
        {items.length === 0 ? (
          <div className="text-sm text-muted-foreground">
            {t("keys.noKeys")}
          </div>
        ) : (
          <div className="space-y-2">
            {items.map((item, idx) => (
              <div
                key={`${baseStart + idx}`}
                className="border rounded-md p-2 space-y-2"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="text-xs text-muted-foreground">
                    {baseStart + idx}
                  </div>
                  <div className="flex gap-2">
                    {editingIndex === idx ? (
                      <>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={cancelEdit}
                        >
                          {t("common.cancel")}
                        </Button>
                        <Button size="sm" onClick={saveEdit}>
                          {t("editor.collection.update")}
                        </Button>
                      </>
                    ) : (
                      <>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => startEdit(idx)}
                        >
                          {t("editor.collection.update")}
                        </Button>
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => onDeleteAt(baseStart + idx)}
                        >
                          {t("editor.collection.remove")}
                        </Button>
                      </>
                    )}
                  </div>
                </div>

                {editingIndex === idx ? (
                  <Textarea
                    value={editingValue}
                    onChange={(e) => setEditingValue(e.target.value)}
                    placeholder={t("editor.collection.valuePlaceholder")}
                  />
                ) : (
                  <div className="text-sm break-words whitespace-pre-wrap">
                    {item}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
