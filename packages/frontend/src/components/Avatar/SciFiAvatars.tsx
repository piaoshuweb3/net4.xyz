'use client';

/**
 * 科幻 NFT 风格虚拟头像 — SVG 生成，无版权问题
 * 每个头像都是独特的几何/电路图案组合
 */

const designs = [
  // Design 1: Circuit mask
  { bg: ['#1a0533', '#0d0d2b'], accent: '#b026ff', pattern: 'circuit' },
  // Design 2: Hex crystals
  { bg: ['#0a1628', '#0d1b2a'], accent: '#00d4ff', pattern: 'hex' },
  // Design 3: Geometric mask
  { bg: ['#1a0a2e', '#0f0a1e'], accent: '#ec4899', pattern: 'geo' },
  // Design 4: Digital grid
  { bg: ['#0f1b2d', '#0a1520'], accent: '#22c55e', pattern: 'grid' },
  // Design 5: Pulse rings
  { bg: ['#1a0a1e', '#120a16'], accent: '#f59e0b', pattern: 'pulse' },
  // Design 6: Data stream
  { bg: ['#0d1a2d', '#0a1320'], accent: '#06b6d4', pattern: 'data' },
  // Design 7: Core node
  { bg: ['#1a0525', '#0f0520'], accent: '#f97316', pattern: 'core' },
  // Design 8: Matrix
  { bg: ['#0d200d', '#0a150a'], accent: '#14b8a6', pattern: 'matrix' },
  // Design 9: Neural web
  { bg: ['#1a0d2d', '#0f0a20'], accent: '#6366f1', pattern: 'neural' },
  // Design 10: Void star
  { bg: ['#0d0d1a', '#0a0a15'], accent: '#eab308', pattern: 'star' },
];

function getSvg(index: number, size: number) {
  const d = designs[index];
  const s = size;
  const cx = s / 2;
  const cy = s / 2;
  const r = s * 0.4;

  const parts: string[] = [
    `<defs>`,
    `<linearGradient id="bg${index}" x1="0" y1="0" x2="1" y2="1">`,
    `<stop offset="0%" stop-color="${d.bg[0]}"/>`,
    `<stop offset="100%" stop-color="${d.bg[1]}"/>`,
    `</linearGradient>`,
    `<radialGradient id="glow${index}" cx="50%" cy="50%" r="50%">`,
    `<stop offset="0%" stop-color="${d.accent}" stop-opacity="0.3"/>`,
    `<stop offset="100%" stop-color="transparent"/>`,
    `</radialGradient>`,
    `</defs>`,
    `<rect width="${s}" height="${s}" fill="url(#bg${index})" rx="${s * 0.15}"/>`,
    `<circle cx="${cx}" cy="${cy}" r="${r}" fill="url(#glow${index})"/>`,
  ];

  switch (d.pattern) {
    case 'circuit': {
      parts.push(
        `<rect x="${s * 0.15}" y="${cy - s * 0.03}" width="${s * 0.7}" height="${s * 0.06}" rx="${s * 0.03}" fill="${d.accent}" opacity="0.8"/>`,
        `<rect x="${s * 0.3}" y="${s * 0.15}" width="${s * 0.06}" height="${s * 0.3}" rx="${s * 0.03}" fill="${d.accent}" opacity="0.6"/>`,
        `<rect x="${s * 0.65}" y="${cy + s * 0.05}" width="${s * 0.06}" height="${s * 0.25}" rx="${s * 0.03}" fill="${d.accent}" opacity="0.5"/>`,
        `<circle cx="${cx - s * 0.12}" cy="${cy - s * 0.15}" r="${s * 0.04}" fill="${d.accent}" opacity="0.7"/>`,
        `<circle cx="${cx + s * 0.18}" cy="${cy - s * 0.1}" r="${s * 0.03}" fill="${d.accent}" opacity="0.5"/>`,
        `<circle cx="${cx + s * 0.08}" cy="${cy + s * 0.2}" r="${s * 0.05}" fill="${d.accent}" opacity="0.6"/>`,
        `<circle cx="${cx}" cy="${cy}" r="${s * 0.07}" fill="${d.accent}" opacity="0.9"/>`,
        `<circle cx="${cx}" cy="${cy}" r="${s * 0.15}" fill="none" stroke="${d.accent}" stroke-width="${s * 0.02}" opacity="0.3"/>`,
      );
      break;
    }
    case 'hex': {
      for (let i = 0; i < 5; i++) {
        const angle = (i / 5) * Math.PI * 2;
        const hx = cx + Math.cos(angle) * r * 0.55;
        const hy = cy + Math.sin(angle) * r * 0.55;
        const hs = r * 0.25;
        parts.push(
          `<polygon points="${hx},${hy - hs} ${hx + hs * 0.87},${hy - hs * 0.5} ${hx + hs * 0.87},${hy + hs * 0.5} ${hx},${hy + hs} ${hx - hs * 0.87},${hy + hs * 0.5} ${hx - hs * 0.87},${hy - hs * 0.5}"`,
          ` fill="none" stroke="${d.accent}" stroke-width="${s * 0.015}" opacity="${0.3 + i * 0.12}"/>`,
        );
      }
      parts.push(`<polygon points="${cx},${cy - r * 0.3} ${cx + r * 0.26},${cy - r * 0.15} ${cx + r * 0.26},${cy + r * 0.15} ${cx},${cy + r * 0.3} ${cx - r * 0.26},${cy + r * 0.15} ${cx - r * 0.26},${cy - r * 0.15}" fill="${d.accent}" opacity="0.7"/>`);
      break;
    }
    case 'geo': {
      parts.push(
        `<polygon points="${cx},${cy - r * 0.7} ${cx + r * 0.6},${cy + r * 0.35} ${cx - r * 0.6},${cy + r * 0.35}" fill="none" stroke="${d.accent}" stroke-width="${s * 0.02}" opacity="0.5"/>`,
        `<polygon points="${cx},${cy - r * 0.35} ${cx + r * 0.3},${cy + r * 0.17} ${cx - r * 0.3},${cy + r * 0.17}" fill="${d.accent}" opacity="0.8"/>`,
        `<circle cx="${cx}" cy="${cy}" r="${s * 0.05}" fill="#ffffff" opacity="0.9"/>`,
        `<line x1="${s * 0.1}" y1="${s * 0.8}" x2="${s * 0.3}" y2="${cy}" stroke="${d.accent}" stroke-width="${s * 0.01}" opacity="0.3"/>`,
        `<line x1="${s * 0.9}" y1="${s * 0.8}" x2="${s * 0.7}" y2="${cy}" stroke="${d.accent}" stroke-width="${s * 0.01}" opacity="0.3"/>`,
      );
      break;
    }
    case 'grid': {
      const step = s * 0.12;
      for (let x = s * 0.1; x < s * 0.9; x += step) {
        for (let y = s * 0.1; y < s * 0.9; y += step) {
          const dist = Math.sqrt((x - cx) ** 2 + (y - cy) ** 2);
          if (dist < r) {
            parts.push(`<rect x="${x}" y="${y}" width="${step * 0.4}" height="${step * 0.4}" rx="1" fill="${d.accent}" opacity="${Math.max(0.1, 0.6 - dist / (r * 2))}"/>`);
          }
        }
      }
      parts.push(`<rect x="${cx - s * 0.15}" y="${cy - s * 0.15}" width="${s * 0.3}" height="${s * 0.3}" rx="${s * 0.04}" fill="none" stroke="${d.accent}" stroke-width="${s * 0.03}" opacity="0.7"/>`);
      break;
    }
    case 'pulse': {
      for (let i = 0; i < 3; i++) {
        const rr = r * (0.35 + i * 0.25);
        parts.push(`<circle cx="${cx}" cy="${cy}" r="${rr}" fill="none" stroke="${d.accent}" stroke-width="${s * 0.015}" opacity="${0.2 + i * 0.15}"/>`);
      }
      parts.push(`<circle cx="${cx}" cy="${cy}" r="${r * 0.15}" fill="${d.accent}" opacity="0.8"/>`);
      for (let i = 0; i < 4; i++) {
        const angle = (i / 4) * Math.PI * 2 + Math.PI / 4;
        parts.push(`<line x1="${cx}" y1="${cy}" x2="${cx + Math.cos(angle) * r * 0.7}" y2="${cy + Math.sin(angle) * r * 0.7}" stroke="${d.accent}" stroke-width="${s * 0.02}" opacity="0.4"/>`);
      }
      break;
    }
    case 'data': {
      const bars = 7;
      for (let i = 0; i < bars; i++) {
        const bx = cx - r * 0.6 + (i / (bars - 1)) * r * 1.2;
        const bh = r * (0.3 + Math.sin(i * 1.2) * 0.35);
        parts.push(`<rect x="${bx - s * 0.02}" y="${cy + s * 0.1 - bh}" width="${s * 0.04}" height="${bh}" rx="${s * 0.01}" fill="${d.accent}" opacity="${0.3 + i * 0.08}"/>`);
      }
      parts.push(`<line x1="${s * 0.15}" y1="${cy + s * 0.12}" x2="${s * 0.85}" y2="${cy + s * 0.12}" stroke="${d.accent}" stroke-width="${s * 0.01}" opacity="0.3"/>`);
      break;
    }
    case 'core': {
      const rays = 8;
      for (let i = 0; i < rays; i++) {
        const angle = (i / rays) * Math.PI * 2;
        parts.push(`<line x1="${cx}" y1="${cy}" x2="${cx + Math.cos(angle) * r * 0.8}" y2="${cy + Math.sin(angle) * r * 0.8}" stroke="${d.accent}" stroke-width="${s * 0.01}" opacity="0.3"/>`);
      }
      parts.push(`<circle cx="${cx}" cy="${cy}" r="${r * 0.4}" fill="none" stroke="${d.accent}" stroke-width="${s * 0.04}" opacity="0.6"/>`);
      parts.push(`<circle cx="${cx}" cy="${cy}" r="${r * 0.15}" fill="${d.accent}" opacity="0.9"/>`);
      break;
    }
    case 'matrix': {
      const cols = 5;
      for (let i = 0; i < cols * 4; i++) {
        const mx = cx - r * 0.6 + (i % cols) * (r * 1.2 / (cols - 1));
        const my = s * 0.2 + Math.floor(i / cols) * (s * 0.2);
        const ch = String.fromCharCode(0x4e00 + i * 17);
        if (Math.sqrt((mx - cx) ** 2 + (my - cy) ** 2) < r * 0.9) {
          parts.push(`<text x="${mx}" y="${my}" text-anchor="middle" fill="${d.accent}" font-size="${s * 0.12}" opacity="${0.1 + i * 0.03}" font-family="monospace">${ch}</text>`);
        }
      }
      break;
    }
    case 'neural': {
      const nodes = 6;
      for (let i = 0; i < nodes; i++) {
        const a1 = (i / nodes) * Math.PI * 2;
        const x1 = cx + Math.cos(a1) * r * 0.65;
        const y1 = cy + Math.sin(a1) * r * 0.65;
        for (let j = i + 1; j < nodes; j++) {
          const a2 = (j / nodes) * Math.PI * 2;
          const x2 = cx + Math.cos(a2) * r * 0.65;
          const y2 = cy + Math.sin(a2) * r * 0.65;
          parts.push(`<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${d.accent}" stroke-width="${s * 0.008}" opacity="0.25"/>`);
        }
        parts.push(`<circle cx="${x1}" cy="${y1}" r="${s * 0.03}" fill="${d.accent}" opacity="0.7"/>`);
      }
      parts.push(`<circle cx="${cx}" cy="${cy}" r="${s * 0.05}" fill="${d.accent}" opacity="0.9"/>`);
      break;
    }
    case 'star': {
      const spikes = 16;
      for (let i = 0; i < spikes; i++) {
        const a = (i / spikes) * Math.PI * 2;
        const rr = r * (i % 2 === 0 ? 0.55 : 0.18);
        if (i === 0) parts.push(`<path d="M${cx + Math.cos(a) * rr},${cy + Math.sin(a) * rr}`);
        else parts.push(` L${cx + Math.cos(a) * rr},${cy + Math.sin(a) * rr}`);
      }
      parts.push(`Z" fill="${d.accent}" opacity="0.6"/>`);
      parts.push(`<circle cx="${cx}" cy="${cy}" r="${r * 0.12}" fill="#ffffff" opacity="0.8"/>`);
      break;
    }
  }

  // Border glow
  parts.push(`<rect width="${s}" height="${s}" rx="${s * 0.15}" fill="none" stroke="${d.accent}" stroke-width="${s * 0.025}" opacity="0.3"/>`);

  return `data:image/svg+xml,${encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" width="${s}" height="${s}" viewBox="0 0 ${s} ${s}">${parts.join('')}</svg>`)}`;
}

export const sciFiAvatars = designs.map((_, i) => ({
  dataUri: (size: number) => getSvg(i, size),
}));
