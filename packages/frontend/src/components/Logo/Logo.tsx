'use client';

/**
 * net4.xyz 动态 Logo 组件
 * 基于金色碎片 + 电路路径 + 神经网络节点的品牌视觉设计
 */
export default function Logo({ size = 40, showText = true }: { size?: number; showText?: boolean }) {
  const h = size;
  const w = showText ? size * 4.5 : size;
  const innerPad = h * 0.15;
  const innerSize = h - innerPad * 2;
  const cx = innerPad + innerSize / 2;
  const cy = innerPad + innerSize / 2;

  return (
    <div className="flex items-center gap-2 select-none" style={{ height: h }}>
      {/* 图标区域 */}
      <svg
        width={h}
        height={h}
        viewBox={`0 0 ${h} ${h}`}
        className="flex-shrink-0"
        style={{ filter: 'drop-shadow(0 0 6px rgba(176,38,255,0.5))' }}
      >
        <defs>
          <linearGradient id="logoGold" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#FFD700" />
            <stop offset="100%" stopColor="#B8860B" />
          </linearGradient>
          <linearGradient id="logoPurple" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#b026ff" />
            <stop offset="100%" stopColor="#ec4899" />
          </linearGradient>
        </defs>

        {/* 外层光环 */}
        <circle cx={cx} cy={cy} r={innerSize / 2 + 2} fill="none" stroke="url(#logoPurple)"
          strokeWidth={h * 0.04} opacity={0.3}>
          <animate attributeName="opacity" values="0.3;0.6;0.3" dur="2s" repeatCount="indefinite" />
        </circle>

        {/* 内部圆形背景 */}
        <circle cx={cx} cy={cy} r={innerSize / 2} fill="rgba(176,38,255,0.15)"
          stroke="url(#logoPurple)" strokeWidth={h * 0.025} />

        {/* 电路路径 — 十字形 */}
        <line x1={cx} y1={innerPad} x2={cx} y2={innerPad + innerSize}
          stroke="#00CED1" strokeWidth={h * 0.025} opacity={0.6}>
          <animate attributeName="opacity" values="0.4;0.8;0.4" dur="3s" repeatCount="indefinite" />
        </line>
        <line x1={innerPad} y1={cy} x2={innerPad + innerSize} y2={cy}
          stroke="#00CED1" strokeWidth={h * 0.025} opacity={0.6}>
          <animate attributeName="opacity" values="0.6;0.4;0.6" dur="3s" repeatCount="indefinite" />
        </line>

        {/* 对角连接线 */}
        <line x1={innerPad + 2} y1={innerPad + 2} x2={innerPad + innerSize - 2} y2={innerPad + innerSize - 2}
          stroke="url(#logoGold)" strokeWidth={h * 0.015} opacity={0.4} />
        <line x1={innerPad + innerSize - 2} y1={innerPad + 2} x2={innerPad + 2} y2={innerPad + innerSize - 2}
          stroke="url(#logoGold)" strokeWidth={h * 0.015} opacity={0.4} />

        {/* 四角金色碎片 */}
        {[[innerPad, innerPad], [innerPad + innerSize, innerPad],
          [innerPad, innerPad + innerSize], [innerPad + innerSize, innerPad + innerSize]].map(([x, y], i) => (
          <rect key={i} x={x - h * 0.06} y={y - h * 0.06}
            width={h * 0.12} height={h * 0.12} rx={h * 0.02}
            fill="url(#logoGold)" opacity={0.7}>
            <animate attributeName="opacity" values="0.5;0.9;0.5" dur={`${1.5 + i * 0.3}s`} repeatCount="indefinite" />
          </rect>
        ))}

        {/* 中心节点 */}
        <circle cx={cx} cy={cy} r={h * 0.06} fill="#9B59B6">
          <animate attributeName="r" values={`${h * 0.05};${h * 0.08};${h * 0.05}`} dur="2s" repeatCount="indefinite" />
        </circle>

        {/* 字母 N */}
        <text x={cx} y={cy + h * 0.12} textAnchor="middle" fontSize={h * 0.35}
          fontWeight="900" fill="#ffffff" fontFamily="system-ui, sans-serif">N</text>
      </svg>

      {/* 文字部分 */}
      {showText && (
        <span className="text-xl md:text-2xl font-bold bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent whitespace-nowrap"
          style={{ fontSize: h * 0.48 }}>
          net4.xyz
        </span>
      )}
    </div>
  );
}
