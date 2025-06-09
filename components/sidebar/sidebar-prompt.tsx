import { useEffect, useState } from "react";

export const SidebarPrompt: React.FC = () => {
  const [text, setText] = useState("");

  // APIを通して読み込み
  useEffect(() => {
    fetch("/api/text-reader")
      .then((response) => response.json())
      .then((data) => setText(data.text));
  });

  return (
    <div>
      <nav className="p-4 space-y-1 text-sm text-zinc-500 whitespace-pre-line">
        {text}
      </nav>
    </div>
  );
};
