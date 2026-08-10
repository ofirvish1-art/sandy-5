// Small circular "two overlapping arcs" mark, matching the reference design's logo.
export default function Logo({ size = 40, light = false }) {
  return (
    <svg width={size} height={size} viewBox="0 0 40 40" fill="none">
      <circle cx="20" cy="20" r="19" stroke={light ? "#B2D8A2" : "#3A523D"} strokeWidth="2.5" strokeDasharray="70 40" />
      <circle cx="20" cy="20" r="11" stroke={light ? "#B2D8A2" : "#3A523D"} strokeWidth="2.5" strokeDasharray="45 25" />
    </svg>
  );
}
