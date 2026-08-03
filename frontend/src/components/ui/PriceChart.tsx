'use client';

import { AreaChart, Area, BarChart, Bar, ResponsiveContainer, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts';

export interface ChartPoint {
  label: string;
  value: number;
}

interface PriceChartProps {
  data: ChartPoint[];
  color?: string;
  valuePrefix?: string;
  valueSuffix?: string;
  height?: number;
  chartType?: 'area' | 'bar';
  yDomain?: [number, number] | ['auto', 'auto'];
}

export default function PriceChart({
  data,
  color = 'var(--color-primary)',
  valuePrefix = '',
  valueSuffix = '%',
  height = 280,
  chartType = 'area',
  yDomain = [0, 100]
}: PriceChartProps) {
  if (!data || data.length === 0) {
    return (
      <div style={{ height }} className="flex flex-col items-center justify-center text-sm text-[var(--color-text-muted)] bg-[var(--color-bg-secondary)]/30 rounded-lg border border-dashed border-[var(--color-border)]">
        <svg className="w-8 h-8 mb-2 text-[var(--color-text-muted)] opacity-60" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 12l3-3 3 3 4-4M8 21l4-4 4 4M3 4h18M4 4h16v12a1 1 0 01-1 1H5a1 1 0 01-1-1V4z" />
        </svg>
        <span>No price history points recorded for this range</span>
      </div>
    );
  }

  const gradientId = `chartFill_${color.replace(/[^a-zA-Z0-9]/g, '')}`;

  return (
    <ResponsiveContainer width="100%" height={height}>
      {chartType === 'bar' ? (
        <BarChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border-light)" vertical={false} />
          <XAxis
            dataKey="label"
            tick={{ fontSize: 11, fill: 'var(--color-text-muted)' }}
            axisLine={false}
            tickLine={false}
            minTickGap={25}
          />
          <YAxis
            tick={{ fontSize: 11, fill: 'var(--color-text-muted)' }}
            axisLine={false}
            tickLine={false}
            width={48}
          />
          <Tooltip
            formatter={(value: any) => [`${valuePrefix}${Number(value || 0).toLocaleString()}${valueSuffix}`, 'Value']}
            contentStyle={{
              background: 'var(--color-surface)',
              border: '1px solid var(--color-border)',
              borderRadius: 8,
              fontSize: 12,
              boxShadow: '0 4px 12px rgba(0,0,0,0.08)'
            }}
          />
          <Bar dataKey="value" fill={color} radius={[4, 4, 0, 0]} />
        </BarChart>
      ) : (
        <AreaChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor={color} stopOpacity={0.4} />
              <stop offset="95%" stopColor={color} stopOpacity={0.02} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border-light)" vertical={false} />
          <XAxis
            dataKey="label"
            tick={{ fontSize: 11, fill: 'var(--color-text-muted)' }}
            axisLine={false}
            tickLine={false}
            minTickGap={25}
          />
          <YAxis
            tick={{ fontSize: 11, fill: 'var(--color-text-muted)' }}
            axisLine={false}
            tickLine={false}
            width={48}
            domain={yDomain}
          />
          <Tooltip
            formatter={(value: any) => [`${valuePrefix}${Number(value || 0).toFixed(1)}${valueSuffix}`, 'Probability']}
            contentStyle={{
              background: 'var(--color-surface)',
              border: '1px solid var(--color-border)',
              borderRadius: 8,
              fontSize: 12,
              boxShadow: '0 4px 12px rgba(0,0,0,0.08)'
            }}
          />
          <Area type="monotone" dataKey="value" stroke={color} strokeWidth={2.5} fill={`url(#${gradientId})`} />
        </AreaChart>
      )}
    </ResponsiveContainer>
  );
}
