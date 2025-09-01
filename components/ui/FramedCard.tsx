type FramedCardProps = {
  title: string;
  children: React.ReactNode;
  align?: "left" | "center" | "right";
};

export function FramedCard({
  title,
  children,
  align = "left",
}: FramedCardProps) {
  const alignMap = {
    left: "left-4",
    center: "left-1/2 -translate-x-1/2",
    right: "right-4",
  } as const;

  return (
    <div className="relative bg-white border-2 border-black rounded-md p-4 shadow-[2px_2px_0_#000]">
      {/* 二重枠 */}
      <div className="pointer-events-none absolute inset-1 rounded border-2 border-black" />
      <div
        className={[
          "absolute -top-2 inline-block px-2 text-sm font-semibold text-black",
          "bg-white dark:bg-slate-900 rounded", // 枠線の上に載せるため背景色でborderを隠す
          alignMap[align],
        ].join(" ")}
      >
        {title}
      </div>

      {children}
    </div>
  );
}
