export function GameSwitch({
  checked,
  onChange,
  disabled,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-disabled={disabled}
      onClick={() => !disabled && onChange(!checked)}
      className={[
        "relative h-6 w-11 rounded transition-all duration-150",
        checked ? "bg-sky-500" : "bg-slate-300",
        disabled ? "opacity-50 cursor-not-allowed" : "hover:brightness-110",
        "shadow-[inset_0_-2px_0_rgba(0,0,0,.15)]",
      ].join(" ")}
    >
      <span
        className={[
          "absolute top-0.5 h-5 w-5 rounded bg-white",
          "transition-transform duration-150 will-change-transform",
          checked ? "" : "-translate-x-5",
          "shadow",
        ].join(" ")}
      />
    </button>
  );
}
