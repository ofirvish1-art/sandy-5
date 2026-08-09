const LABELS = {
  sand: "חול",
  hamra: "חמרה",
  matza: "מצע",
  other: "אחר",
};

export function materialLabel(type) {
  return LABELS[type] || "אחר";
}

export default function MaterialBadge({ type }) {
  return (
    <span className="inline-flex items-center rounded-lg bg-stone-100 px-2.5 py-1 text-xs font-bold text-stone-700">
      {materialLabel(type)}
    </span>
  );
}
