import { useState } from "react";
import { useTranslation } from "react-i18next";
import { ConnectionManager } from "./components/ConnectionManager";
import { KeyList } from "./components/KeyList";
import { ValueEditor } from "./components/ValueEditor";
import { Toaster } from "./components/ui/sonner";
import { Button } from "./components/ui/button";
import { Plus } from "lucide-react";
import { ResizableThreeColumns } from "./components/layout/ResizableThreeColumns";

function App() {
  const { t } = useTranslation();
  const [selectedKey, setSelectedKey] = useState<string | null>(null);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  const handleKeyUpdated = () => {
    setRefreshTrigger((prev) => prev + 1);
  };

  const handleKeyDeleted = () => {
    setRefreshTrigger((prev) => prev + 1);
    setSelectedKey(null);
  };

  const handleKeyRenamed = (newKey: string) => {
    setRefreshTrigger((prev) => prev + 1);
    setSelectedKey(newKey);
  };

  return (
    <div className="h-screen w-screen bg-background text-foreground overflow-hidden">
      <ResizableThreeColumns
        left={<ConnectionManager />}
        middle={
          <div className="h-full flex flex-col">
            <div className="p-2 border-b flex justify-between items-center bg-muted/20 h-[52px]">
              <span className="text-sm font-semibold pl-2">
                {t("keys.title")}
              </span>
              <Button
                size="sm"
                variant="outline"
                className="h-7 text-xs"
                onClick={() => setSelectedKey(null)}
              >
                <Plus className="h-3 w-3 mr-1" /> {t("keys.newKey")}
              </Button>
            </div>
            <div className="flex-1 overflow-hidden">
              <KeyList
                onSelectKey={setSelectedKey}
                selectedKey={selectedKey}
                refreshTrigger={refreshTrigger}
              />
            </div>
          </div>
        }
        right={
          <ValueEditor
            currentKey={selectedKey}
            onKeyUpdated={handleKeyUpdated}
            onKeyDeleted={handleKeyDeleted}
            onKeyRenamed={handleKeyRenamed}
          />
        }
      />
      <Toaster />
    </div>
  );
}

export default App;
