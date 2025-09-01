export function ThresholdRow({
  title,
  threshold,
}: {
  title: string;
  threshold?: number;
}) {
  const id = `id-${title}`;
  return (
    <div className="flex items-center justify-between">
      <span className="mb-1 block text-sm font-medium">{title}</span>
      <input
        id={id}
        name="title"
        className="w-20 text-right rounded border px-3 py-2"
        required
        defaultValue={threshold}
      />
    </div>
  );
}
