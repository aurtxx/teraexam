import React, { useState } from 'react';

export function BarChart({
  data = [],
  height = 200,
  barColor = '#4f46e5',
  className = '',
}) {
  const [hoveredIdx, setHoveredIdx] = useState(null);

  if (!data || data.length === 0) {
    return (
      <div className="flex items-center justify-center h-40 text-xs text-slate-400">
        No chart data available
      </div>
    );
  }

  const maxValue = Math.max(...data.map((d) => d.value), 1);
  const chartHeight = height - 40; // reserving space for labels

  return (
    <div className={`w-full ${className}`}>
      <div className="relative flex items-end gap-2 pt-6" style={{ height }}>
        {data.map((item, idx) => {
          const barH = Math.max(4, Math.round((item.value / maxValue) * chartHeight));
          const isHovered = hoveredIdx === idx;
          const color = item.color || barColor;

          return (
            <div
              key={item.label || idx}
              className="flex-1 flex flex-col items-center group relative cursor-pointer"
              onMouseEnter={() => setHoveredIdx(idx)}
              onMouseLeave={() => setHoveredIdx(null)}
            >
              {/* Tooltip */}
              {isHovered && (
                <div className="absolute -top-8 z-10 px-2 py-1 bg-slate-900 text-white text-[11px] font-mono rounded shadow-md whitespace-nowrap pointer-events-none">
                  {item.label}: <span className="font-bold">{item.value}</span>
                </div>
              )}

              {/* Bar */}
              <div
                className="w-full max-w-[42px] rounded-t-md transition-all duration-300"
                style={{
                  height: barH,
                  backgroundColor: color,
                  opacity: isHovered ? 1 : 0.85,
                }}
              />

              {/* Axis Label */}
              <span className="text-[11px] font-medium text-slate-500 mt-2 truncate max-w-full px-0.5 text-center">
                {item.label}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export function LineTrendChart({
  data = [], // [{ label, value }]
  height = 180,
  strokeColor = '#4f46e5',
  areaColor = 'rgba(79, 70, 229, 0.1)',
  unit = '',
  className = '',
}) {
  const [activePoint, setActivePoint] = useState(null);

  if (!data || data.length === 0) {
    return (
      <div className="flex items-center justify-center h-40 text-xs text-slate-400">
        No trend data available
      </div>
    );
  }

  const width = 500;
  const paddingX = 40;
  const paddingY = 25;
  const chartW = width - paddingX * 2;
  const chartH = height - paddingY * 2;

  const values = data.map((d) => d.value);
  const minVal = Math.min(...values, 0);
  const maxVal = Math.max(...values, 10);
  const valRange = maxVal - minVal || 1;

  const points = data.map((d, i) => {
    const x = paddingX + (i / (data.length - 1 || 1)) * chartW;
    const y = paddingY + chartH - ((d.value - minVal) / valRange) * chartH;
    return { x, y, ...d };
  });

  const pathD = points.reduce((acc, pt, i) => `${acc} ${i === 0 ? 'M' : 'L'} ${pt.x},${pt.y}`, '');
  const areaD = `${pathD} L ${points[points.length - 1].x},${height - paddingY} L ${points[0].x},${height - paddingY} Z`;

  return (
    <div className={`w-full relative ${className}`}>
      {activePoint && (
        <div
          className="absolute z-10 px-2 py-1 bg-slate-900 text-white text-xs rounded shadow pointer-events-none transform -translate-x-1/2 -translate-y-full"
          style={{
            left: `${(activePoint.x / width) * 100}%`,
            top: `${(activePoint.y / height) * 100}%`,
          }}
        >
          <div className="font-semibold">{activePoint.label}</div>
          <div className="font-mono text-indigo-300">
            {activePoint.value} {unit}
          </div>
        </div>
      )}

      <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-auto overflow-visible">
        <defs>
          <linearGradient id="areaGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={strokeColor} stopOpacity="0.25" />
            <stop offset="100%" stopColor={strokeColor} stopOpacity="0.0" />
          </linearGradient>
        </defs>

        {/* Horizontal gridlines */}
        {[0, 0.5, 1].map((pct, idx) => {
          const y = paddingY + chartH * (1 - pct);
          const val = Math.round(minVal + valRange * pct);
          return (
            <g key={idx}>
              <line
                x1={paddingX}
                y1={y}
                x2={width - paddingX}
                y2={y}
                stroke="#e2e8f0"
                strokeDasharray="4 4"
              />
              <text
                x={paddingX - 8}
                y={y + 3}
                textAnchor="end"
                className="text-[10px] fill-slate-400 font-mono"
              >
                {val}
              </text>
            </g>
          );
        })}

        {/* Gradient fill */}
        <path d={areaD} fill="url(#areaGradient)" />

        {/* Line stroke */}
        <path d={pathD} fill="none" stroke={strokeColor} strokeWidth="2.5" strokeLinecap="round" />

        {/* Points */}
        {points.map((pt, i) => (
          <circle
            key={i}
            cx={pt.x}
            cy={pt.y}
            r={activePoint?.label === pt.label ? 6 : 4}
            className="cursor-pointer transition-all"
            fill={activePoint?.label === pt.label ? strokeColor : '#ffffff'}
            stroke={strokeColor}
            strokeWidth="2.5"
            onMouseEnter={() => setActivePoint(pt)}
            onMouseLeave={() => setActivePoint(null)}
          />
        ))}

        {/* Bottom labels */}
        {points.map((pt, i) => (
          <text
            key={i}
            x={pt.x}
            y={height - 6}
            textAnchor="middle"
            className="text-[10px] fill-slate-400 font-medium"
          >
            {pt.label}
          </text>
        ))}
      </svg>
    </div>
  );
}

export function RadialScoreChart({
  percentage = 0,
  size = 120,
  strokeWidth = 10,
  color = '#4f46e5',
  label,
  sublabel,
  className = '',
}) {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (Math.min(100, Math.max(0, percentage)) / 100) * circumference;

  return (
    <div className={`inline-flex flex-col items-center justify-center ${className}`}>
      <div className="relative" style={{ width: size, height: size }}>
        <svg width={size} height={size} className="transform -rotate-90">
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            stroke="#f1f5f9"
            strokeWidth={strokeWidth}
            fill="transparent"
          />
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            stroke={color}
            strokeWidth={strokeWidth}
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            strokeLinecap="round"
            fill="transparent"
            className="transition-all duration-700 ease-out"
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
          <span className="text-xl font-bold font-mono text-slate-900 tracking-tight">
            {percentage}%
          </span>
          {sublabel && <span className="text-[10px] text-slate-500 uppercase">{sublabel}</span>}
        </div>
      </div>
      {label && <span className="text-xs font-semibold text-slate-700 mt-2">{label}</span>}
    </div>
  );
}
