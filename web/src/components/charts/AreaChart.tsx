import type { SeriesPoint } from "@/lib/api";

interface AreaChartProps {
  data: SeriesPoint[];
  className?: string;
  height?: number;
}

/**
 * Dependency-free area+line chart for a daily time series. Pure SVG, scales to
 * its container width via viewBox. No hooks — safe in server or client trees.
 */
export default function AreaChart({ data, className = "", height = 180 }: AreaChartProps) {
  const W = 640;
  const H = height;
  const pad = 6;
  const n = data.length;

  if (n === 0) {
    return (
      <div className={`flex h-40 items-center justify-center text-sm text-muted ${className}`}>
        No data yet
      </div>
    );
  }

  const max = Math.max(1, ...data.map((d) => d.count));
  const stepX = n > 1 ? (W - pad * 2) / (n - 1) : 0;
  const y = (c: number) => H - pad - (c / max) * (H - pad * 2);
  const x = (i: number) => pad + i * stepX;

  const line = data.map((d, i) => `${i === 0 ? "M" : "L"}${x(i).toFixed(1)},${y(d.count).toFixed(1)}`).join(" ");
  const area = `${line} L${x(n - 1).toFixed(1)},${H - pad} L${x(0).toFixed(1)},${H - pad} Z`;
  const gid = `area-grad-${n}-${max}`;

  const first = data[0]?.date;
  const last = data[n - 1]?.date;

  return (
    <div className={className}>
      <svg viewBox={`0 0 ${W} ${H}`} className="h-auto w-full" role="img" aria-label="Clicks over time" preserveAspectRatio="none">
        <defs>
          <linearGradient id={gid} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#635bff" stopOpacity="0.35" />
            <stop offset="1" stopColor="#635bff" stopOpacity="0" />
          </linearGradient>
        </defs>
        <path d={area} fill={`url(#${gid})`} />
        <path d={line} fill="none" stroke="#7c5cff" strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" vectorEffect="non-scaling-stroke" />
      </svg>
      <div className="mt-1 flex justify-between text-[0.7rem] text-muted">
        <span>{first}</span>
        <span>{last}</span>
      </div>
    </div>
  );
}
