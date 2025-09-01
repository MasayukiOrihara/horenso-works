import { GameSwitch } from "./GameSwitch";

// 行：トグル
export function ToggleRow({
  title,
  desc,
  checked,
  onChange,
  disabled,
}: {
  title: string;
  desc?: string;
  checked: boolean;
  onChange: (v: boolean) => void;
  disabled?: boolean;
}) {
  const id = `id-${title}`;
  return (
    <div className="flex items-start justify-between gap-4 py-2">
      <label htmlFor={id} className="cursor-pointer select-none">
        <div className="">{title}</div>
        {desc && <div className="text-sm text-slate-500">{desc}</div>}
      </label>
      {/* ラベルクリックで切替できるように隠しチェックボックス + Switch */}
      <input
        id={id}
        type="checkbox"
        className="sr-only"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        disabled={disabled}
      />
      <GameSwitch checked={checked} onChange={onChange} disabled={disabled} />
    </div>
  );
}
