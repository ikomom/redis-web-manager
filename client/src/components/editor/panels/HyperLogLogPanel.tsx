import React, { useCallback, useState } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "../../ui/button";
import { Input } from "../../ui/input";
import { Label } from "../../ui/label";
import { Textarea } from "../../ui/textarea";
import type { HllMeta } from "../types";
import { parseLinesOrComma } from "../utils";

type HyperLogLogPanelProps = {
  meta: HllMeta | null;
  onAdd: (elements: string[]) => Promise<void>;
  onReset: (elements?: string[]) => Promise<void>;
  onRefresh: () => Promise<void>;
  onMerge: (sourceKeys: string[]) => Promise<void>;
};

export const HyperLogLogPanel: React.FC<HyperLogLogPanelProps> = ({
  meta,
  onAdd,
  onReset,
  onRefresh,
  onMerge,
}) => {
  const { t } = useTranslation();
  const [elementsInput, setElementsInput] = useState("");
  const [mergeSourcesInput, setMergeSourcesInput] = useState("");

  const handleAdd = useCallback(async () => {
    const elements = parseLinesOrComma(elementsInput);
    await onAdd(elements);
    setElementsInput("");
  }, [elementsInput, onAdd]);

  const handleReset = useCallback(async () => {
    const elements = parseLinesOrComma(elementsInput);
    await onReset(elements.length > 0 ? elements : undefined);
  }, [elementsInput, onReset]);

  const handleMerge = useCallback(async () => {
    const sources = parseLinesOrComma(mergeSourcesInput);
    await onMerge(sources);
    setMergeSourcesInput("");
  }, [mergeSourcesInput, onMerge]);

  return (
    <div className="p-3 h-full overflow-auto space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1">
          <Label>{t("editor.hll.count")}</Label>
          <Input value={String(meta?.count ?? 0)} readOnly />
        </div>
        <div className="space-y-1">
          <Label>{t("editor.hll.bytes")}</Label>
          <Input value={String(meta?.bytes ?? 0)} readOnly />
        </div>
      </div>

      <div className="space-y-2">
        <Label>{t("editor.hll.elements")}</Label>
        <Textarea
          value={elementsInput}
          onChange={(e) => setElementsInput(e.target.value)}
          placeholder={t("editor.hll.elementsPlaceholder")}
        />
        <div className="flex gap-2">
          <Button size="sm" onClick={handleAdd}>
            {t("editor.hll.add")}
          </Button>
          <Button size="sm" variant="outline" onClick={handleReset}>
            {t("editor.hll.reset")}
          </Button>
          <Button size="sm" variant="outline" onClick={onRefresh}>
            {t("editor.hll.refresh")}
          </Button>
        </div>
      </div>

      <div className="space-y-2">
        <Label>{t("editor.hll.merge")}</Label>
        <Textarea
          value={mergeSourcesInput}
          onChange={(e) => setMergeSourcesInput(e.target.value)}
          placeholder={t("editor.hll.sourceKeysPlaceholder")}
        />
        <div className="flex gap-2">
          <Button size="sm" onClick={handleMerge}>
            {t("editor.hll.mergeButton")}
          </Button>
        </div>
      </div>
    </div>
  );
};

