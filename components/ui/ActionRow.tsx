export function ActionRow({
  title,
  subtitle,
  onClick,
}: {
  title: string;
  subtitle?: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-haspopup="dialog"
      className="group w-full rounded-md px-2 py-2 text-left transition
                 hover:bg-slate-100 active:translate-y-px
                 flex items-center justify-between"
    >
      <div>
        <div className="font-medium">{title}</div>
        {subtitle && <div className="text-sm text-slate-500">{subtitle}</div>}
      </div>
      <span className="text-slate-400 group-hover:text-slate-600">›</span>
    </button>
  );
}
