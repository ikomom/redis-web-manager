import React, { useCallback, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "../../ui/button";
import { Input } from "../../ui/input";
import type { CollectionMeta } from "../types";

type HashRow = { field: string; value: string };

type HashPanelProps = {
  meta: CollectionMeta | null;
  nextCursor: string;
  rows: HashRow[];
  onLoadMore: () => Promise<void>;
  onSetField: (field: string, value: string) => Promise<void>;
  onDeleteField: (field: string) => Promise<void>;
};

export const HashPanel: React.FC<HashPanelProps> = ({
  meta,
  nextCursor,
  rows,
  onLoadMore,
  onSetField,
  onDeleteField,
}) => {
  const { t } = useTranslation();
  const [fieldInput, setFieldInput] = useState("");
  const [valueInput, setValueInput] = useState("");
  const [editingField, setEditingField] = useState<string | null>(null);
  const [editingValue, setEditingValue] = useState("");

  const editingOriginalValue = useMemo(() => {
    if (!editingField) return "";
    return rows.find((r) => r.field === editingField)?.value ?? "";
  }, [editingField, rows]);

  const handleSet = useCallback(async () => {
    await onSetField(fieldInput, valueInput);
    setFieldInput("");
    setValueInput("");
  }, [fieldInput, valueInput, onSetField]);

  const startEdit = useCallback(
    (field: string) => {
      const current = rows.find((r) => r.field === field)?.value ?? "";
      setEditingField(field);
      setEditingValue(current);
    },
    [rows]
  );

  const cancelEdit = useCallback(() => {
    setEditingField(null);
    setEditingValue("");
  }, []);

  const saveEdit = useCallback(async () => {
    if (!editingField) return;
    await onSetField(editingField, editingValue);
    setEditingField(null);
    setEditingValue("");
  }, [editingField, editingValue, onSetField]);

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
          disabled={!meta?.truncated || nextCursor === "0"}
        >
          {t("editor.collection.loadMore")}
        </Button>
      </div>

      <div className="space-y-2">
        <div className="grid grid-cols-2 gap-2">
          <Input
            value={fieldInput}
            onChange={(e) => setFieldInput(e.target.value)}
            placeholder={t("editor.collection.fieldPlaceholder")}
          />
          <Input
            value={valueInput}
            onChange={(e) => setValueInput(e.target.value)}
            placeholder={t("editor.collection.valuePlaceholder")}
          />
        </div>
        <Button size="sm" onClick={handleSet} disabled={!fieldInput}>
          {t("editor.collection.add")}
        </Button>
      </div>

      <div className="space-y-2">
        {rows.length === 0 ? (
          <div className="text-sm text-muted-foreground">
            {t("keys.noKeys")}
          </div>
        ) : (
          <div className="space-y-2">
            {rows.map((row) => (
              <div key={row.field} className="border rounded-md p-2 space-y-2">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-medium truncate">
                      {row.field}
                    </div>
                  </div>
                  <div className="flex gap-2">
                    {editingField === row.field ? (
                      <>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={cancelEdit}
                        >
                          {t("common.cancel")}
                        </Button>
                        <Button
                          size="sm"
                          onClick={saveEdit}
                          disabled={editingValue === editingOriginalValue}
                        >
                          {t("editor.collection.update")}
                        </Button>
                      </>
                    ) : (
                      <>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => startEdit(row.field)}
                        >
                          {t("editor.collection.update")}
                        </Button>
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => onDeleteField(row.field)}
                        >
                          {t("editor.collection.remove")}
                        </Button>
                      </>
                    )}
                  </div>
                </div>

                {editingField === row.field ? (
                  <Input
                    value={editingValue}
                    onChange={(e) => setEditingValue(e.target.value)}
                    placeholder={t("editor.collection.valuePlaceholder")}
                  />
                ) : (
                  <div className="text-xs text-muted-foreground break-words whitespace-pre-wrap">
                    {row.value}
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
