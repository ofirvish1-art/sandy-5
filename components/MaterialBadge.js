// material_type is now free text (chosen from lib/materials.js or custom
// "אחר" text), not a fixed enum — so this just displays it as-is.
export function materialLabel(type) {
  return type || "אחר";
}

export default function MaterialBadge({ type }) {
  return (
    <span className="inline-flex items-center rounded-lg bg-sage/40 px-2.5 py-1 text-xs font-bold text-olive">
      {materialLabel(type)}
    </span>
  );
}
