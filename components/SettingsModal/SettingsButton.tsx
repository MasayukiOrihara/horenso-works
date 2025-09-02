import * as React from "react";
import { Settings } from "lucide-react";

export function SettingsButton({
  onOpen,
  controlsId = "settings-modal",
  withShortcut = true,
}: {
  onOpen: () => void;
  controlsId?: string; // モーダルの id と結びつける
  withShortcut?: boolean; // Ctrl+, で開く
}) {
  // Ctrl+, で開く（Macは⌘+,）
  React.useEffect(() => {
    if (!withShortcut) return;
    const onKey = (e: KeyboardEvent) => {
      const isMeta = e.metaKey || e.ctrlKey;
      if (isMeta && e.key === ",") {
        e.preventDefault();
        onOpen();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [withShortcut, onOpen]);

  return (
    <button
      type="button"
      onClick={onOpen}
      aria-haspopup="dialog"
      aria-controls={controlsId}
      title="設定 (Ctrl+,)"
      className="inline-flex h-10 w-10 items-center justify-center rounded-full
                 border border-gray-400 bg-white
                 hover:translate-y-px active:translate-y-1
                 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500"
    >
      {/* ギアアイコン（SVG） */}
      <Settings className="h-5 w-5 text-gray-400" />
      <span className="sr-only">設定を開く</span>
    </button>
  );
}
