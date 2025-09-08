type ThresholdRowProps = {
  title: string;
  threshold: number;
  onChange?: (v: number) => void;
  min?: number;
  max?: number;
  step?: number;
};

export function ThresholdRow({
  title,
  threshold,
  onChange,
  min = 0,
  max = 1,
  step = 0.01,
}: ThresholdRowProps) {
  const id = `id-${title}`;
  return (
    <div className="flex items-center justify-between">
      <span className="mb-1 block text-sm font-medium">{title}</span>
      <input
        id={id}
        name="title"
        type="number"
        className="w-20 text-right rounded border px-3 py-2"
        required
        min={min}
        max={max}
        step={step}
        value={threshold}
        onChange={(e) => onChange?.(Number(e.target.value))}
      />
    </div>
  );
}
