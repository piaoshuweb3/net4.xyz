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
        // === Web4.0 Design System ===
        // 深空底色
        space: {
          900: '#050507',
          800: '#0a0a0f',
          700: '#0f0f17',
          600: '#15151f',
          500: '#1a1a2e',
          400: '#252535',
          300: '#3a3a4e',
        },
        // 流光金 — 品牌主色
        gold: {
          50: '#FFF9E0',
          100: '#FFF0B8',
          200: '#FFE580',
          300: '#FFD700',
          400: '#E6C200',
          500: '#B89800',
          600: '#8A7300',
        },
        // 量子蓝 — 科技强调
        quantum: {
          50: '#E0FAFF',
          100: '#B0F0FF',
          200: '#80E5FF',
          300: '#4OD9FF',
          400: '#00D4FF',
          500: '#00A8CC',
          600: '#007A99',
          700: '#005C73',
        },
        // 意识紫 — 创新标记
        consciousness: {
          50: '#F0EBFF',
          100: '#E0D0FF',
          200: '#C8A0FF',
          300: '#B078FF',
          400: '#8B5CF6',
          500: '#7C3AED',
          600: '#6D28D9',
          700: '#5B21B6',
        },
        // 生命绿 — 状态/成功
        vital: {
          400: '#34D399',
          500: '#10B981',
          600: '#059669',
        },
        // 文字色
        ink: {
          primary: '#FFFFFF',
          secondary: '#A1A1AA',
          tertiary: '#71717A',
          muted: '#52525B',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        serif: ['"Noto Serif SC"', 'Georgia', 'serif'],
        mono: ['"JetBrains Mono"', 'monospace'],
      },
      fontSize: {
        'hero': ['clamp(3rem, 8vw, 7rem)', { lineHeight: '1.05', letterSpacing: '-0.02em' }],
        'display': ['clamp(2rem, 5vw, 4rem)', { lineHeight: '1.1', letterSpacing: '-0.01em' }],
        'headline': ['clamp(1.5rem, 3vw, 2.5rem)', { lineHeight: '1.2' }],
      },
      animation: {
        'fade-in-up': 'fadeInUp 0.8s ease-out forwards',
        'fade-in': 'fadeIn 0.6s ease-out forwards',
        'scale-in': 'scaleIn 0.5s ease-out forwards',
        'slide-in-right': 'slideInRight 0.6s ease-out forwards',
        'glow-pulse': 'glowPulse 3s ease-in-out infinite',
        'float': 'float 4s ease-in-out infinite',
        'shimmer': 'shimmer 3s linear infinite',
        'gradient-shift': 'gradientShift 8s ease infinite',
      },
      keyframes: {
        fadeInUp: {
          '0%': { opacity: '0', transform: 'translateY(30px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        scaleIn: {
          '0%': { opacity: '0', transform: 'scale(0.95)' },
          '100%': { opacity: '1', transform: 'scale(1)' },
        },
        slideInRight: {
          '0%': { opacity: '0', transform: 'translateX(40px)' },
          '100%': { opacity: '1', transform: 'translateX(0)' },
        },
        glowPulse: {
          '0%, 100%': { boxShadow: '0 0 20px rgba(255, 215, 0, 0.15)' },
          '50%': { boxShadow: '0 0 40px rgba(255, 215, 0, 0.3)' },
        },
        float: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-12px)' },
        },
        shimmer: {
          '0%': { backgroundPosition: '-200% center' },
          '100%': { backgroundPosition: '200% center' },
        },
        gradientShift: {
          '0%, 100%': { backgroundPosition: '0% 50%' },
          '50%': { backgroundPosition: '100% 50%' },
        },
      },
      backgroundImage: {
        'gold-gradient': 'linear-gradient(135deg, #FFD700 0%, #FFA500 50%, #FFD700 100%)',
        'quantum-gradient': 'linear-gradient(135deg, #00D4FF 0%, #8B5CF6 100%)',
        'space-gradient': 'linear-gradient(180deg, #050507 0%, #0a0a0f 50%, #0f0f17 100%)',
        'shimmer-gold': 'linear-gradient(90deg, transparent, rgba(255,215,0,0.4), transparent)',
      },
      backdropBlur: {
        xs: '2px',
        sm: '4px',
      },
    },
  },
  plugins: [],
}
