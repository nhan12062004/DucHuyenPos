import React from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';

interface RevenueChartProps {
  data: { name: string; total: number }[];
  formatCompact: (value: number) => string;
  formatFull: (value: number) => string;
}

export default function RevenueChart({ data, formatCompact, formatFull }: RevenueChartProps) {
  return (
    <ResponsiveContainer
      width="100%"
      height="100%"
      minWidth={0}
      minHeight={1}
      initialDimension={{ width: 1, height: 1 }}
    >
      <LineChart data={data} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" />
        <XAxis dataKey="name" tick={{ fontSize: 12, fill: '#94A3B8' }} axisLine={false} tickLine={false} />
        <YAxis
          tick={{ fontSize: 12, fill: '#94A3B8' }}
          axisLine={false}
          tickLine={false}
          tickFormatter={formatCompact}
        />
        <Tooltip
          formatter={(value: number) => [formatFull(value), 'Doanh thu']}
          contentStyle={{ borderRadius: 12, border: '1px solid #E2E8F0', fontSize: 13 }}
        />
        <Line
          type="monotone"
          dataKey="total"
          stroke="#2563EB"
          strokeWidth={2.5}
          dot={{ r: 4, fill: '#2563EB', strokeWidth: 0 }}
          activeDot={{ r: 6 }}
        />
      </LineChart>
    </ResponsiveContainer>
  );
}
