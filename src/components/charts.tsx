import { useEffect, useRef, useState, type ReactNode } from 'react';

const SURFACE = '#18181b'; // zinc-900, the card background
const GRID = '#27272a'; // zinc-800
const AXIS_TEXT = '#71717a'; // zinc-500

/** Width of an element, kept up to date. */
function useWidth<T extends HTMLElement>() {
  const ref = useRef<T>(null);
  const [width, setWidth] = useState(0);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    setWidth(el.clientWidth);
    const ro = new ResizeObserver(([e]) => setWidth(e.contentRect.width));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  return [ref, width] as const;
}

export interface BarDatum {
  label: string;
  /** 0–1, or null when there is nothing to show. */
  value: number | null;
  /** Text shown when the bar is selected. */
  detail: string;
}

interface BarChartProps {
  data: BarDatum[];
  color: string;
  height?: number;
  /** Show every n-th x label. */
  labelEvery?: number;
  /** Caption when nothing is selected. */
  hint: ReactNode;
  /** Name for screen readers. */
  title: string;
}

/** Percentage columns from a single baseline. Tap a column to read its value. */
export function BarChart({ data, color, height = 160, labelEvery = 1, hint, title }: BarChartProps) {
  const [ref, width] = useWidth<HTMLDivElement>();
  const [selected, setSelected] = useState<number | null>(null);
  useEffect(() => setSelected(null), [data.length]);

  const left = 34;
  const bottom = 20;
  const top = 6;
  const plotW = Math.max(0, width - left);
  const plotH = height - bottom - top;
  const band = data.length ? plotW / data.length : 0;
  const barW = Math.max(2, Math.min(24, band - 2));
  const y = (v: number) => top + plotH * (1 - v);
  const r = Math.min(4, barW / 2);

  return (
    <figure>
      <figcaption className="mb-2 min-h-5 text-sm text-zinc-400" aria-live="polite">
        {selected !== null ? <span className="text-zinc-100">{data[selected].detail}</span> : hint}
      </figcaption>
      <div ref={ref} className="w-full">
        {width > 0 && (
          <svg width={width} height={height} role="img" aria-label={title}>
            {[0, 0.5, 1].map((t) => (
              <g key={t}>
                <line x1={left} x2={width} y1={y(t)} y2={y(t)} stroke={GRID} strokeWidth={1} />
                <text x={left - 6} y={y(t)} dy="0.32em" textAnchor="end" fontSize={10} fill={AXIS_TEXT} className="tabular-nums">
                  {t * 100}%
                </text>
              </g>
            ))}
            {data.map((d, i) => {
              const cx = left + band * i + band / 2;
              const x = cx - barW / 2;
              const v = d.value ?? 0;
              const h = plotH * v;
              const dim = selected !== null && selected !== i;
              return (
                <g key={i}>
                  {d.value !== null && h > 0 && (
                    <path
                      d={`M${x},${y(0)} V${y(v) + Math.min(r, h)} Q${x},${y(v)} ${x + Math.min(r, h)},${y(v)} H${x + barW - Math.min(r, h)} Q${x + barW},${y(v)} ${x + barW},${y(v) + Math.min(r, h)} V${y(0)} Z`}
                      fill={color}
                      opacity={dim ? 0.35 : 1}
                      style={{ transition: 'opacity 150ms' }}
                    />
                  )}
                  {(i % labelEvery === 0 || i === data.length - 1) && (
                    <text x={cx} y={height - 6} textAnchor="middle" fontSize={10} fill={AXIS_TEXT}>
                      {d.label}
                    </text>
                  )}
                  {/* Hit target wider than the bar */}
                  <rect
                    x={left + band * i}
                    y={0}
                    width={band}
                    height={height}
                    fill="transparent"
                    onClick={() => setSelected(selected === i ? null : i)}
                    aria-label={d.detail}
                    role="button"
                  />
                </g>
              );
            })}
          </svg>
        )}
      </div>
    </figure>
  );
}

export interface PointDatum {
  /** Position along the x axis, 0–1. */
  x: number;
  /** 1–5 */
  value: number;
  detail: string;
}

interface MoodChartProps {
  points: PointDatum[];
  color: string;
  yLabels: string[];
  startLabel: string;
  endLabel: string;
  hint: ReactNode;
  title: string;
  height?: number;
}

/** Mood over time on a 1–5 scale: a 2px line with ringed dots. Tap a dot to read it. */
export function MoodChart({ points, color, yLabels, startLabel, endLabel, hint, title, height = 150 }: MoodChartProps) {
  const [ref, width] = useWidth<HTMLDivElement>();
  const [selected, setSelected] = useState<number | null>(null);
  useEffect(() => setSelected(null), [points.length]);

  const left = 28;
  const right = 8;
  const bottom = 20;
  const top = 10;
  const plotW = Math.max(0, width - left - right);
  const plotH = height - bottom - top;
  const px = (x: number) => left + plotW * x;
  const py = (v: number) => top + plotH * (1 - (v - 1) / 4);
  const path = points.map((p, i) => `${i ? 'L' : 'M'}${px(p.x)},${py(p.value)}`).join(' ');
  const dense = points.length > 40;

  return (
    <figure>
      <figcaption className="mb-2 min-h-5 text-sm text-zinc-400" aria-live="polite">
        {selected !== null ? <span className="text-zinc-100">{points[selected].detail}</span> : hint}
      </figcaption>
      <div ref={ref} className="w-full">
        {width > 0 && (
          <svg width={width} height={height} role="img" aria-label={title}>
            {yLabels.map((l, i) => (
              <g key={i}>
                <line x1={left} x2={width - right} y1={py(i + 1)} y2={py(i + 1)} stroke={GRID} strokeWidth={1} />
                <text x={left - 8} y={py(i + 1)} dy="0.35em" textAnchor="end" fontSize={12}>
                  {l}
                </text>
              </g>
            ))}
            <text x={left} y={height - 6} fontSize={10} fill={AXIS_TEXT}>
              {startLabel}
            </text>
            <text x={width - right} y={height - 6} fontSize={10} fill={AXIS_TEXT} textAnchor="end">
              {endLabel}
            </text>
            {points.length > 1 && (
              <path d={path} fill="none" stroke={color} strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />
            )}
            {points.map((p, i) => (
              <g key={i} onClick={() => setSelected(selected === i ? null : i)} role="button" aria-label={p.detail}>
                <circle cx={px(p.x)} cy={py(p.value)} r={14} fill="transparent" />
                <circle
                  cx={px(p.x)}
                  cy={py(p.value)}
                  r={selected === i ? 6 : dense ? 3 : 4}
                  fill={color}
                  stroke={SURFACE}
                  strokeWidth={2}
                />
              </g>
            ))}
          </svg>
        )}
      </div>
    </figure>
  );
}
