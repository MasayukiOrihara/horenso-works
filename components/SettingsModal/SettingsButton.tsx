import * as React from "react";

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
                 border-2 border-black bg-white shadow-[3px_3px_0_#000]
                 hover:translate-y-px active:translate-y-1
                 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500"
    >
      {/* ギアアイコン（SVG） */}
      <svg viewBox="0 0 24 24" aria-hidden="true" className="h-5 w-5">
        <path
          d="M12 8a4 4 0 100 8 4 4 0 000-8zm9.1 3.5l-1.7-.3a7.4 7.4 0 00-.7-1.6l1-1.4a.8.8 0 00-.1-1.1l-1.2-1.2a.8.8 0 00-1.1-.1l-1.4 1a7.4 7.4 0 00-1.6-.7l-.3-1.7a.8.8 0 00-.8-.7h-1.7a.8.8 0 00-.8.7l-.3 1.7a7.4 7.4 0 00-1.6.7l-1.4-1a.8.8 0 00-1.1.1L3.4 7.1a.8.8 0 00-.1 1.1l1 1.4c-.3.5-.5 1.1-.7 1.6l-1.7.3a.8.8 0 00-.7.8v1.7c0 .4.3.7.7.8l1.7.3c.2.6.4 1.1.7 1.6l-1 1.4a.8.8 0 00.1 1.1l1.2 1.2c.3.3.8.3 1.1.1l1.4-1c.5.3 1.1.5 1.6.7l.3 1.7c.1.4.4.7.8.7h1.7c.4 0 .7-.3.8-.7l.3-1.7c.6-.2 1.1-.4 1.6-.7l1.4 1c.3.2.8.2 1.1-.1l1.2-1.2c.3-.3.3-.8.1-1.1l-1-1.4c.3-.5.5-1.1.7-1.6l1.7-.3c.4-.1.7-.4.7-.8v-1.7a.8.8 0 00-.7-.8z"
          fill="currentColor"
        />
      </svg>
      <span className="sr-only">設定を開く</span>
    </button>
  );
}
