'use client';

import React, { useState, useMemo } from 'react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer
} from 'recharts';

interface ChartDataPoint {
  date: string;
  cost: number;
  requests: number;
}

export default function DashboardChart({ data }: { data: ChartDataPoint[] }) {
  const [daysFilter, setDaysFilter] = useState<number>(30); // Default 30 ngày

  // Lọc dữ liệu dựa trên N ngày gần nhất
  const filteredData = useMemo(() => {
    if (!data || data.length === 0) return [];
    // Tính toán mốc ngày bắt đầu filter
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysFilter);
    cutoffDate.setHours(0,0,0,0);

    const filtered = data.filter(d => new Date(d.date) >= cutoffDate);
    
    // Format lại ngày cho gọn
    return filtered.map((item) => {
      const d = new Date(item.date);
      return {
        ...item,
        displayDate: d.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' })
      };
    });
  }, [data, daysFilter]);

  const FilterButton = ({ days, label }: { days: number, label: string }) => {
    const isActive = daysFilter === days;
    return (
      <button
        onClick={() => setDaysFilter(days)}
        className={`px-3 py-1.5 text-[10px] font-bold rounded-xl transition-all duration-300 select-none flex items-center gap-1.5
          ${isActive 
            ? 'bg-gradient-to-r from-purple-500/20 to-indigo-500/20 text-purple-300 border border-purple-500/50 shadow-[0_0_15px_rgba(139,92,246,0.3)]' 
            : 'bg-white/5 text-gray-400 border border-white/5 hover:bg-white/10 hover:text-gray-200'
          }
        `}
      >
        {isActive && <div className="w-1.5 h-1.5 rounded-full bg-purple-400 shadow-[0_0_5px_#a855f7] animate-pulse" />}
        {label}
      </button>
    );
  };

  return (
    <div className="w-full h-full flex flex-col">
      {/* Filters - Glassmorphism style */}
      <div className="flex justify-end items-center gap-2 mb-4 z-10 relative">
        <div className="flex p-1 bg-black/20 rounded-2xl border border-white/5 backdrop-blur-sm">
          <FilterButton days={7} label="7 Ngày" />
          <FilterButton days={14} label="14 Ngày" />
          <FilterButton days={30} label="30 Ngày" />
          <FilterButton days={90} label="3 Tháng" />
        </div>
      </div>

      {/* Chart */}
      <div className="flex-1 w-full min-h-0 relative">
        {filteredData.length === 0 ? (
          <div className="absolute inset-0 flex items-center justify-center text-xs text-gray-500 bg-white/[0.01] rounded-xl border border-dashed border-white/5">
            Chưa có dữ liệu thống kê trong kỳ
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={filteredData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="colorCost" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.8} />
                  <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="colorReq" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#06b6d4" stopOpacity={0.8} />
                  <stop offset="95%" stopColor="#06b6d4" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#ffffff08" vertical={false} />
              <XAxis 
                dataKey="displayDate" 
                stroke="#ffffff40" 
                fontSize={10} 
                tickLine={false} 
                axisLine={false} 
                dy={10}
                minTickGap={20}
              />
              <YAxis 
                yAxisId="left"
                stroke="#ffffff40" 
                fontSize={10} 
                tickLine={false} 
                axisLine={false} 
                tickFormatter={(value) => `$${value}`}
              />
              <YAxis 
                yAxisId="right"
                orientation="right"
                stroke="#ffffff40" 
                fontSize={10} 
                tickLine={false} 
                axisLine={false} 
              />
              <Tooltip 
                contentStyle={{ backgroundColor: '#111827', borderColor: '#ffffff20', borderRadius: '12px', fontSize: '12px', boxShadow: '0 8px 32px rgba(0, 0, 0, 0.4)', backdropFilter: 'blur(10px)' }}
                itemStyle={{ color: '#fff', padding: '2px 0' }}
                formatter={(value: number, name: string) => {
                  if (name === 'cost') return [`$${value.toFixed(4)}`, 'Chi phí USD'];
                  if (name === 'requests') return [value, 'Số Request'];
                  return [value, name];
                }}
                labelStyle={{ color: '#9ca3af', marginBottom: '8px', fontWeight: 'bold' }}
                cursor={{ stroke: '#ffffff20', strokeWidth: 1, strokeDasharray: '5 5' }}
              />
              <Area 
                yAxisId="left"
                type="monotone" 
                dataKey="cost" 
                stroke="#8b5cf6" 
                strokeWidth={3}
                fillOpacity={1} 
                fill="url(#colorCost)" 
                activeDot={{ r: 6, fill: '#8b5cf6', stroke: '#fff', strokeWidth: 2, boxShadow: '0 0 10px #8b5cf6' }}
              />
              <Area 
                yAxisId="right"
                type="monotone" 
                dataKey="requests" 
                stroke="#06b6d4" 
                strokeWidth={2}
                fillOpacity={1} 
                fill="url(#colorReq)" 
              />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
}
