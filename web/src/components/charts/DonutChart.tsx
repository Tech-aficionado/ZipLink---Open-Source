import type { Bucket } from "@/lib/api";

interface DonutChartProps {
  data: Bucket[];
  className?: string;
  centerLabel?: string;
}

const PALETTE = ["#635bff", "#22d3ee", "#a855f7", "#e451ff", "#34d399", "#f59e0b"];

/**
 * Dependency-free donut chart with a legend. Pure SVG; no hooks.
 */
export default function DonutChart({ data, className = "", centerLabel }: DonutChartProps) {
  const total = data.reduce((s, d) => s + d.value, 0);

  if (total === 0) {
    return (
      <div className={`flex h-40 items-center justify-center text-sm text-muted ${className}`}>
        No data yet
      </div>
    );
  }

  const size = 120;
  const stroke = 18;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  let offset = 0;

  return (
    <div className={`flex items-center gap-5 ${className}`}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="shrink-0" role="img" aria-label="Breakdown">
        <g transform={`rotate(-90 ${size / 2} ${size / 2})`}>
          <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--surface-muted)" strokeWidth={stroke} />
          {data.map((d, i) => {
            const frac = d.value / total;
            const dash = frac * c;
            const seg = (
              <circle
                key={d.label}
                cx={size / 2}
                cy={size / 2}
                r={r}
                fill="none"
                stroke={PALETTE[i % PALETTE.length]}
                strokeWidth={stroke}
                strokeDasharray={`${dash} ${c - dash}`}
                strokeDashoffset={-offset}
              />
            );
            offset += dash;
            return seg;
          })}
        </g>
        {centerLabel ? (
          <text x="50%" y="50%" textAnchor="middle" dominantBaseline="central" className="fill-foreground text-[0.9rem] font-semibold">
            {centerLabel}
          </text>
        ) : null}
      </svg>
      <ul className="min-w-0 flex-1 space-y-1.5 text-sm">
        {data.map((d, i) => (
          <li key={d.label} className="flex items-center gap-2">
            <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: PALETTE[i % PALETTE.length] }} />
            <span className="min-w-0 flex-1 truncate capitalize text-muted-strong">{d.label}</span>
            <span className="tabular-nums text-muted">{Math.round((d.value / total) * 100)}%</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
