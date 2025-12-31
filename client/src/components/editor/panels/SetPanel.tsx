import React, { useCallback, useState } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "../../ui/button";
import { Label } from "../../ui/label";
import { Textarea } from "../../ui/textarea";
import type { CollectionMeta } from "../types";
import { parseLinesOrComma } from "../utils";

type SetPanelProps = {
  meta: CollectionMeta | null;
  nextCursor: string;
  members: string[];
  onLoadMore: () => Promise<void>;
  onAdd: (members: string[]) => Promise<void>;
  onRem: (members: string[]) => Promise<void>;
};

export const SetPanel: React.FC<SetPanelProps> = ({
  meta,
  nextCursor,
  members,
  onLoadMore,
  onAdd,
  onRem,
}) => {
  const { t } = useTranslation();
  const [addMembersInput, setAddMembersInput] = useState("");
  const [selected, setSelected] = useState<Record<string, boolean>>({});

  const handleAdd = useCallback(async () => {
    const values = parseLinesOrComma(addMembersInput);
    await onAdd(values);
    setAddMembersInput("");
  }, [addMembersInput, onAdd]);

  const toggleSelected = useCallback((member: string, checked: boolean) => {
    setSelected((prev) => ({ ...prev, [member]: checked }));
  }, []);

  const clearSelected = useCallback(() => {
    setSelected({});
  }, []);

  const handleRemoveSelected = useCallback(async () => {
    const toRemove = Object.entries(selected)
      .filter(([, v]) => v)
      .map(([k]) => k);
    await onRem(toRemove);
    clearSelected();
  }, [clearSelected, onRem, selected]);

  const handleRemoveOne = useCallback(
    async (member: string) => {
      await onRem([member]);
      setSelected((prev) => {
        const next = { ...prev };
        delete next[member];
        return next;
      });
    },
    [onRem]
  );

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
        <Label>{t("editor.collection.add")}</Label>
        <Textarea
          value={addMembersInput}
          onChange={(e) => setAddMembersInput(e.target.value)}
          placeholder={t("editor.collection.membersPlaceholder")}
        />
        <Button size="sm" onClick={handleAdd}>
          {t("editor.collection.add")}
        </Button>
      </div>

      <div className="space-y-2">
        {members.length === 0 ? (
          <div className="text-sm text-muted-foreground">
            {t("keys.noKeys")}
          </div>
        ) : (
          <>
            <div className="flex items-center justify-between gap-2">
              <Label>{t("editor.collection.member")}</Label>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant="destructive"
                  onClick={handleRemoveSelected}
                  disabled={Object.values(selected).every((v) => !v)}
                >
                  {t("editor.collection.remove")}
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={clearSelected}
                  disabled={Object.values(selected).every((v) => !v)}
                >
                  {t("common.cancel")}
                </Button>
              </div>
            </div>

            <div className="space-y-2">
              {members.map((m) => (
                <div
                  key={m}
                  className="border rounded-md p-2 flex items-start justify-between gap-2"
                >
                  <label className="flex items-start gap-2 min-w-0 flex-1">
                    <input
                      type="checkbox"
                      className="mt-1"
                      checked={!!selected[m]}
                      onChange={(e) => toggleSelected(m, e.target.checked)}
                    />
                    <span className="text-sm break-words whitespace-pre-wrap">
                      {m}
                    </span>
                  </label>
                  <Button
                    size="sm"
                    variant="destructive"
                    onClick={() => handleRemoveOne(m)}
                  >
                    {t("editor.collection.remove")}
                  </Button>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
};
