import { useTranslation } from 'react-i18next';
import type { TableChart } from '../../../shared/table-chart';
import {
  pieSlices,
  shortLabel,
  slicePath,
  valueAxis,
} from '../../utils/chart-layout';

const WIDTH = 640;
const HEIGHT = 320;

/**
 * Farben der Stücke eines Kreisdiagramms: Das größte Stück bekommt den Akzent, alle anderen
 * Graustufen (die Legende und der Tooltip sagen, welches Stück was ist).
 */
const PIE_NEUTRALS = [
  '#9a9aa0',
  '#76767c',
  '#b5b5ba',
  '#5f5f65',
  '#cdcdd1',
  '#85858b',
  '#a6a6ab',
  '#6b6b71',
  '#c0c0c5',
  '#8f8f95',
  '#b0b0b5',
];
const PIE_ACCENT = 'var(--color-accent)';

/** Farbe je Stück: Rang 1 = Akzent, die übrigen der Reihe nach grau. */
function pieColors(values: number[]): string[] {
  const lead = values.indexOf(Math.max(...values));
  let next = 0;
  return values.map((_, i) =>
    i === lead ? PIE_ACCENT : PIE_NEUTRALS[next++ % PIE_NEUTRALS.length],
  );
}

/**
 * Ein Diagramm aus einer Tabelle (Werkzeug `table_chart`): Balken, Linie oder Kreis als SVG.
 * Gezeichnet wird nur aus dem geprüften Diagramm (Beschriftungen und Zahlen), nie aus Text des
 * Modells als Markup. Zu jedem Wert gibt es einen Tooltip.
 */
export function TableChartView({ chart }: { chart: TableChart }) {
  const { t, i18n } = useTranslation();
  const title = chart.title || t('chat.chart.untitled');
  const full = new Intl.NumberFormat(i18n.language, {
    maximumFractionDigits: 4,
  });
  const compact = new Intl.NumberFormat(i18n.language, {
    notation: 'compact',
    maximumFractionDigits: 2,
  });

  return (
    <figure
      className="space-y-2"
      role="img"
      aria-label={t('chat.chart.label', { title })}
    >
      <figcaption className="text-xs font-medium text-muted">
        {title}
      </figcaption>
      {chart.type === 'pie' ? (
        <Pie chart={chart} format={(n) => full.format(n)} />
      ) : (
        <Axes
          chart={chart}
          full={(n) => full.format(n)}
          compact={(n) => compact.format(n)}
        />
      )}
    </figure>
  );
}

function Axes({
  chart,
  full,
  compact,
}: {
  chart: TableChart;
  full: (n: number) => string;
  compact: (n: number) => string;
}) {
  const count = chart.values.length;
  const isBar = chart.type === 'bar';
  const axis = valueAxis(chart.values, { includeZero: isBar });
  // Viele oder lange Beschriftungen: schräg stellen, dafür mehr Platz unten.
  const rotate = count > 8 || chart.labels.some((l) => l.length > 10);
  const left = 64;
  const right = 16;
  const top = 16;
  const bottom = rotate ? 96 : 36;
  const plotW = WIDTH - left - right;
  const plotH = HEIGHT - top - bottom;
  const y = (value: number) =>
    top + plotH - ((value - axis.min) / (axis.max - axis.min)) * plotH;
  const band = plotW / count;
  const x = (index: number) => left + band * (index + 0.5);
  // Bei vielen Werten nur jede n-te Beschriftung.
  const every = Math.max(1, Math.ceil(count / 14));
  const zero = y(Math.max(axis.min, Math.min(0, axis.max)));

  return (
    <svg
      viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
      className="h-auto w-full max-w-[640px]"
      aria-hidden="true"
    >
      {axis.ticks.map((tick) => (
        <g key={tick}>
          <line
            x1={left}
            x2={WIDTH - right}
            y1={y(tick)}
            y2={y(tick)}
            className="stroke-border"
            strokeWidth={1}
          />
          <text
            x={left - 8}
            y={y(tick)}
            textAnchor="end"
            dominantBaseline="middle"
            className="fill-muted"
            fontSize={11}
          >
            {compact(tick)}
          </text>
        </g>
      ))}
      {isBar ? (
        chart.values.map((value, i) => {
          const barW = Math.min(band * 0.7, 56);
          const barTop = Math.min(y(value), zero);
          return (
            <g key={i}>
              <rect
                x={x(i) - barW / 2}
                y={barTop}
                width={barW}
                height={Math.max(1, Math.abs(y(value) - zero))}
                rx={2}
                className="fill-accent"
              >
                <title>{`${chart.labels[i]}: ${full(value)}`}</title>
              </rect>
              {count <= 8 && (
                <text
                  x={x(i)}
                  y={
                    value >= 0
                      ? barTop - 4
                      : barTop + Math.abs(y(value) - zero) + 12
                  }
                  textAnchor="middle"
                  className="fill-text"
                  fontSize={11}
                >
                  {compact(value)}
                </text>
              )}
            </g>
          );
        })
      ) : (
        <>
          <polyline
            fill="none"
            className="stroke-accent"
            strokeWidth={2}
            strokeLinejoin="round"
            points={chart.values.map((v, i) => `${x(i)},${y(v)}`).join(' ')}
          />
          {chart.values.map((value, i) => (
            <circle
              key={i}
              cx={x(i)}
              cy={y(value)}
              r={count > 30 ? 2 : 3.5}
              className="fill-accent"
            >
              <title>{`${chart.labels[i]}: ${full(value)}`}</title>
            </circle>
          ))}
        </>
      )}
      {chart.labels.map((label, i) =>
        i % every === 0 ? (
          <text
            key={i}
            x={x(i)}
            y={top + plotH + 14}
            textAnchor={rotate ? 'end' : 'middle'}
            transform={
              rotate ? `rotate(-40 ${x(i)} ${top + plotH + 14})` : undefined
            }
            className="fill-muted"
            fontSize={11}
          >
            {shortLabel(label, rotate ? 18 : 10)}
          </text>
        ) : null,
      )}
      <text x={left} y={10} className="fill-subtle" fontSize={10}>
        {shortLabel(chart.valueName, 40)}
      </text>
    </svg>
  );
}

function Pie({
  chart,
  format,
}: {
  chart: TableChart;
  format: (n: number) => string;
}) {
  const slices = pieSlices(chart.values);
  const colors = pieColors(chart.values);
  const cx = 150;
  const cy = 150;
  const r = 120;
  const percent = (share: number) =>
    `${(share * 100).toFixed(share < 0.1 ? 1 : 0)} %`;
  return (
    <svg
      viewBox={`0 0 ${WIDTH} 300`}
      className="h-auto w-full max-w-[640px]"
      aria-hidden="true"
    >
      {slices.map((slice) => (
        <path
          key={slice.index}
          d={slicePath(cx, cy, r, slice.start, slice.end)}
          style={{ fill: colors[slice.index] }}
          className="stroke-bg"
          strokeWidth={1.5}
        >
          <title>{`${chart.labels[slice.index]}: ${format(chart.values[slice.index])} (${percent(slice.share)})`}</title>
        </path>
      ))}
      {slices.map((slice, row) => (
        <g key={slice.index} transform={`translate(300 ${24 + row * 22})`}>
          <rect
            width={12}
            height={12}
            rx={2}
            style={{ fill: colors[slice.index] }}
          />
          <text x={20} y={10} className="fill-text" fontSize={12}>
            {shortLabel(chart.labels[slice.index], 28)}
          </text>
          <text
            x={270}
            y={10}
            textAnchor="end"
            className="fill-muted"
            fontSize={12}
          >
            {percent(slice.share)}
          </text>
        </g>
      ))}
    </svg>
  );
}
