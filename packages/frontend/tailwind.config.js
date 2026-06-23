/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        // 主色
        primary: {
          dark: '#0A0A0A',    // 深空黑
          brand: '#B026FF',   // 全息紫
          neon: '#FF10F0',    // 霓虹粉
        },
        // 辅助色
        secondary: {
          electric: '#00FFFF', // 电光蓝
          gold: '#FFD700',     // 金色
          orange: '#FAAD14',   // 橙色
          green: '#52C41A',    // 绿色
        },
        // 赛博朋克专属色
        cyber: {
          grid: '#B026FF20',     // 网格线颜色（低透明度）
          glow: '#B026FF80',     // 光晕颜色
          'deep-space': '#0a0a0f',
          'dark-purple': '#1a1a2e',
        },
        // 文字色
        text: {
          primary: '#FFFFFF',
          secondary: '#8C8C8C',
          accent: '#B026FF',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
        display: ['Orbitron', 'Rajdhani', 'sans-serif'], // 未来感字体
      },
      animation: {
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'glow': 'glow 2s ease-in-out infinite alternate',
        'fade-in': 'fadeIn 0.3s ease-out',
        'float': 'float 3s ease-in-out infinite',
        'grid-flow': 'gridFlow 20s linear infinite',
        'neon-flicker': 'neonFlicker 3s ease-in-out infinite',
        'data-stream': 'dataStream 15s linear infinite',
        'glitch': 'glitch 0.3s ease-in-out infinite',
      },
      keyframes: {
        glow: {
          '0%': { 
            boxShadow: '0 0 5px #B026FF, 0 0 10px #B026FF, 0 0 15px #B026FF' 
          },
          '100%': { 
            boxShadow: '0 0 10px #B026FF, 0 0 20px #B026FF, 0 0 30px #B026FF, 0 0 40px #B026FF' 
          },
        },
        fadeIn: {
          '0%': { opacity: '0', transform: 'translateY(10px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        float: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-10px)' },
        },
        gridFlow: {
          '0%': { backgroundPosition: '0 0' },
          '100%': { backgroundPosition: '50px 50px' },
        },
        neonFlicker: {
          '0%, 19%, 21%, 23%, 25%, 54%, 56%, 100%': { opacity: '1' },
          '20%, 24%, 55%': { opacity: '0.7' },
        },
        dataStream: {
          '0%': { transform: 'translateY(-50%)' },
          '100%': { transform: 'translateY(0)' },
        },
        glitch: {
          '0%': { transform: 'translate(0)' },
          '20%': { transform: 'translate(-2px, 2px)' },
          '40%': { transform: 'translate(-2px, -2px)' },
          '60%': { transform: 'translate(2px, 2px)' },
          '80%': { transform: 'translate(2px, -2px)' },
          '100%': { transform: 'translate(0)' },
        },
      },
      backgroundImage: {
        'cyber-grid': "url('data:image/svg+xml,...')", // 将在CSS中定义
        'holographic': 'linear-gradient(45deg, #B026FF 0%, #00FFFF 50%, #FF10F0 100%)',
      },
      backdropBlur: {
        xs: '2px',
      },
    },
  },
  plugins: [],
}