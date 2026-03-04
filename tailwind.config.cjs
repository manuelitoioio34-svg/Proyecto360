// tailwind.config.cjs
const tailwindcssAnimate = require('tailwindcss-animate')
const { fontFamily } = require('tailwindcss/defaultTheme')
const { fonts } = require('./src/config/fonts')

/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: ['class'],
  content: ['./index.html', './src/**/*.{ts,tsx,js,jsx}'],
  safelist: Array.isArray(fonts) ? fonts.map((f) => `font-${f}`) : [],
  theme: {
    container: {
      center: true,
      padding: { DEFAULT: '0.75rem', sm: '1rem', md: '1.5rem', lg: '1rem', xl: '2.5rem', '2xl': '3rem' },
      screens: { sm: '640px', md: '768px', lg: '1024px', xl: '1280px', '2xl': '1536px' },
    },
    extend: {
      spacing: { sm: 'var(--space-sm)', md: 'var(--space-md)' },
      fontSize: { base: 'var(--font-base)' },

      // Fuente base para body -> font-sans
      fontFamily: {
        sans: ['Inter', ...fontFamily.sans],
        inter: ['Inter', ...fontFamily.sans],
        manrope: ['Manrope', ...fontFamily.sans],
      },

      borderRadius: {
        lg: 'var(--radius)',
        md: 'calc(var(--radius) - 2px)',
        sm: 'calc(var(--radius) - 4px)',
      },

      // Animaciones que ya tenías
      animation: {
        gradient: 'gradient 10s linear infinite',
        'gradient-subtle': 'gradient-subtle 8s ease-in-out infinite',
      },
      keyframes: {
        gradient: { '0%': { backgroundPosition: '300% 50%' }, '100%': { backgroundPosition: '0% 50%' } },
        'gradient-subtle': {
          '0%,100%': { backgroundPosition: '0% 50%', backgroundSize: '200% auto', opacity: 0.9 },
          '50%': { backgroundPosition: '100% 50%', backgroundSize: '200% auto', opacity: 1 },
        },
      },

      // ← mapeo de tokens con alpha-value para bg-*/text-*/ring-*/…/10
      colors: {
        // Paleta de colores corporativos de Choucair
        // Colores Primarios
        primary: '#222222', // HEX: #222222 | RGB: 34, 34, 34 (Negro principal)
        secondary: '#93D500', // HEX: #93D500 | RGB: 147, 213, 0 (Verde lima secundario)
        
        // Colores de Acción
        success: '#9ED919', // HEX: #9ED919 | RGB: 158, 217, 15 (Éxito/Verde)
        warning: '#E47E3D', // HEX: #E47E3D | RGB: 228, 126, 61 (Advertencia/Naranja)
        danger: '#EA0029', // HEX: #EA0029 | RGB: 234, 0, 41 (Error/Rojo)
        info: '#0075C9', // HEX: #0075C9 | RGB: 0, 117, 201 (Información/Azul)
        
        // Colores Neutros
        neutral: {
          900: '#383838', // Gris 900 - Títulos, texto principal
          700: '#4E4E4E', // Gris 700 - Subtítulos, descripciones
          500: '#646464', // Gris 500 - Texto inactivo
          300: '#7A7A7A', // Gris 300 - Divisores, bordes
          100: '#919191', // Gris 100 - Fondos alternos
          0: '#FFFFFF', // Blanco - Fondo contenido
        },
        
        // Legacy support (sin cambios)
        border: 'hsl(var(--border) / <alpha-value>)',
        input: 'hsl(var(--input) / <alpha-value>)',
        ring: 'hsl(var(--ring) / <alpha-value>)',
        background: 'hsl(var(--background) / <alpha-value>)',
        foreground: 'hsl(var(--foreground) / <alpha-value>)',
        'primary-legacy': {
          DEFAULT: 'hsl(var(--primary) / <alpha-value>)',
          foreground: 'hsl(var(--primary-foreground) / <alpha-value>)',
        },
        'secondary-legacy': {
          DEFAULT: 'hsl(var(--secondary) / <alpha-value>)',
          foreground: 'hsl(var(--secondary-foreground) / <alpha-value>)',
        },
        destructive: {
          DEFAULT: 'hsl(var(--destructive) / <alpha-value>)',
          foreground: 'hsl(var(--destructive-foreground) / <alpha-value>)',
        },
        muted: {
          DEFAULT: 'hsl(var(--muted) / <alpha-value>)',
          foreground: 'hsl(var(--muted-foreground) / <alpha-value>)',
        },
        accent: {
          DEFAULT: 'hsl(var(--accent) / <alpha-value>)',
          foreground: 'hsl(var(--accent-foreground) / <alpha-value>)',
        },
        popover: {
          DEFAULT: 'hsl(var(--popover) / <alpha-value>)',
          foreground: 'hsl(var(--popover-foreground) / <alpha-value>)',
        },
        card: {
          DEFAULT: 'hsl(var(--card) / <alpha-value>)',
          foreground: 'hsl(var(--card-foreground) / <alpha-value>)',
        },
        chart: {
          1: 'hsl(var(--chart-1) / <alpha-value>)',
          2: 'hsl(var(--chart-2) / <alpha-value>)',
          3: 'hsl(var(--chart-3) / <alpha-value>)',
          4: 'hsl(var(--chart-4) / <alpha-value>)',
          5: 'hsl(var(--chart-5) / <alpha-value>)',
        },
        sidebar: {
          DEFAULT: 'hsl(var(--sidebar-background) / <alpha-value>)',
          foreground: 'hsl(var(--sidebar-foreground) / <alpha-value>)',
          primary: 'hsl(var(--sidebar-primary) / <alpha-value>)',
          'primary-foreground': 'hsl(var(--sidebar-primary-foreground) / <alpha-value>)',
          accent: 'hsl(var(--sidebar-accent) / <alpha-value>)',
          'accent-foreground': 'hsl(var(--sidebar-accent-foreground) / <alpha-value>)',
          border: 'hsl(var(--sidebar-border) / <alpha-value>)',
          ring: 'hsl(var(--sidebar-ring) / <alpha-value>)',
        },
      },

      boxShadow: { card: '0 1px 2px rgba(0,0,0,.06)' },
    },
  },
  plugins: [tailwindcssAnimate],
}