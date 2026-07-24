'use client';

import { AreaChart, Area, ResponsiveContainer, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts';

export interface ChartPoint {
  label: string;
  value: number;
}

interface PriceChartProps {
  data: ChartPoint[];
  color?: string;
  valuePrefix?: string;
  height?: number;
}

export default function PriceChart({ data, color = 'var(--color-primary)', valuePrefix = '', height = 260 }: PriceChartProps) {
  if (!data || data.length === 0) {
    return (
      <div style={{ height }} className="flex items-center justify-center text-sm text-[var(--color-text-muted)]">
        Not enough data yet
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={height}>
      <AreaChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
        <defs>
          <linearGradient id="priceChartFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor={color} stopOpacity={0.35} />
            <stop offset="95%" stopColor={color} stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border-light)" vertical={false} />
        <XAxis
          dataKey="label"
          tick={{ fontSize: 11, fill: 'var(--color-text-muted)' }}
          axisLine={false}
          tickLine={false}
          minTickGap={30}
        />
        <YAxis
          tick={{ fontSize: 11, fill: 'var(--color-text-muted)' }}
          axisLine={false}
          tickLine={false}
          width={48}
        />
        <Tooltip
          formatter={(value: any) => [`${valuePrefix}${Number(value || 0).toLocaleString()}`, '']}
          contentStyle={{
            background: 'var(--color-surface)',
            border: '1px solid var(--color-border)',
            borderRadius: 8,
            fontSize: 12,
          }}
        />
        <Area type="monotone" dataKey="value" stroke={color} strokeWidth={2} fill="url(#priceChartFill)" />
      </AreaChart>
    </ResponsiveContainer>
  );
}
