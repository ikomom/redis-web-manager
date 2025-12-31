import React from "react";
import Editor from "@monaco-editor/react";

type TextValuePanelProps = {
  viewMode: "text" | "json" | "hex" | "base64";
  language: string;
  value: string;
  displayValue: string;
  onChange: (value: string) => void;
};

export const TextValuePanel: React.FC<TextValuePanelProps> = ({
  viewMode,
  language,
  value,
  displayValue,
  onChange,
}) => {
  return (
    <Editor
      key={viewMode}
      height="100%"
      defaultLanguage="plaintext"
      language={language}
      value={viewMode === "text" ? value : displayValue}
      onChange={viewMode === "text" ? (val) => onChange(val || "") : undefined}
      options={{
        readOnly: viewMode !== "text",
        minimap: { enabled: false },
        scrollBeyondLastLine: false,
        wordWrap: "on",
        automaticLayout: true,
      }}
      theme="vs-light"
    />
  );
};

