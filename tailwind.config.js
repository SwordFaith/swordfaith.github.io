/** @type {import('tailwindcss').Config} */
export default {
  content: ['./src/**/*.{astro,html,js,jsx,md,mdx,svelte,ts,tsx,vue}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        primary: {
          50: '#eff6ff',
          100: '#dbeafe', 
          200: '#bfdbfe',
          300: '#93c5fd',
          400: '#60a5fa',
          500: 'rgb(1 97 239)', // AstroWind exact primary blue
          600: 'rgb(1 84 207)', // AstroWind darker blue
          700: '#1d4ed8',
          800: '#1e40af',
          900: '#1e3a8a',
          950: '#172554'
        },
        secondary: {
          50: '#f5f3ff',
          100: '#ede9fe',
          200: '#ddd6fe', 
          300: '#c4b5fd',
          400: '#a78bfa',
          500: '#8b5cf6',
          600: 'rgb(109 40 217)', // AstroWind exact accent purple
          700: '#6d28d9',
          800: '#5b21b6',
          900: '#4c1d95',
          950: '#2e1065'
        },
        dark: {
          50: '#f8fafc',
          100: '#f1f5f9',
          200: '#e2e8f0',
          300: '#cbd5e1',
          400: '#94a3b8',
          500: '#64748b',
          600: '#475569',
          700: '#334155',
          800: '#1e293b',
          900: 'rgb(3 6 32)', // AstroWind exact dark background
          950: 'rgb(3 6 32)'
        },
        // AstroWind color system
        page: {
          DEFAULT: 'rgb(255 255 255)',
          dark: 'rgb(3 6 32)'
        },
        muted: {
          DEFAULT: 'rgba(16 16 16 / 0.66)',
          dark: 'rgba(229 236 246 / 0.66)'
        }
      },
      fontFamily: {
        sans: ['Inter Variable', 'Inter', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        serif: ['Inter Variable', 'Inter', 'ui-serif', 'Georgia', 'serif'],
        mono: ['JetBrains Mono', 'ui-monospace', 'SFMono-Regular', 'Consolas', 'monospace']
      },
      fontSize: {
        xs: ['0.75rem', { lineHeight: '1rem' }],
        sm: ['0.875rem', { lineHeight: '1.25rem' }],
        base: ['1rem', { lineHeight: '1.5rem' }],
        lg: ['1.125rem', { lineHeight: '1.75rem' }],
        xl: ['1.25rem', { lineHeight: '1.75rem' }],
        '2xl': ['1.5rem', { lineHeight: '2rem' }],
        '3xl': ['1.875rem', { lineHeight: '2.25rem' }],
        '4xl': ['2.25rem', { lineHeight: '2.5rem' }],
        '5xl': ['3rem', { lineHeight: '1' }],
        '6xl': ['3.75rem', { lineHeight: '1' }],
        '7xl': ['4.5rem', { lineHeight: '1' }],
        '8xl': ['6rem', { lineHeight: '1' }],
        '9xl': ['8rem', { lineHeight: '1' }],
      },
      letterSpacing: {
        tighter: '-0.05em',
        tight: '-0.025em',
        normal: '0em',
        wide: '0.025em',
        wider: '0.05em',
        widest: '0.1em',
      },
      lineHeight: {
        3: '.75rem',
        4: '1rem',
        5: '1.25rem',
        6: '1.5rem',
        7: '1.75rem',
        8: '2rem',
        9: '2.25rem',
        10: '2.5rem',
        none: '1',
        tight: '1.25',
        snug: '1.375',
        normal: '1.5',
        relaxed: '1.625',
        loose: '2',
        tighter: '1.125',
      },
      typography: (theme) => ({
        DEFAULT: {
          css: {
            maxWidth: 'none',
            color: 'rgb(16 16 16)', // AstroWind default text
            fontSize: '1rem',
            lineHeight: '1.75',
            fontFamily: theme('fontFamily.sans'),
            '[class~="lead"]': {
              color: theme('colors.gray.600'),
              fontSize: '1.125rem'
            },
            a: {
              color: theme('colors.primary.600'),
              textDecoration: 'none',
              fontWeight: '500',
              '&:hover': {
                color: theme('colors.primary.700'),
                textDecoration: 'underline'
              }
            },
            strong: {
              color: theme('colors.gray.900'),
              fontWeight: '600'
            },
            'ol > li::marker': {
              color: theme('colors.gray.500')
            },
            'ul > li::marker': {
              color: theme('colors.gray.500')
            },
            hr: {
              borderColor: theme('colors.gray.200'),
              marginTop: '3rem',
              marginBottom: '3rem'
            },
            blockquote: {
              color: theme('colors.gray.600'),
              borderLeftColor: theme('colors.primary.200'),
              borderLeftWidth: '4px',
              fontStyle: 'italic',
              paddingLeft: '1.5rem'
            },
            h1: {
              color: theme('colors.gray.900'),
              fontWeight: '700',
              fontSize: '2.25rem',
              marginTop: '0',
              marginBottom: '2rem'
            },
            h2: {
              color: theme('colors.gray.900'),
              fontWeight: '600',
              fontSize: '1.875rem',
              marginTop: '2.5rem',
              marginBottom: '1.5rem'
            },
            h3: {
              color: theme('colors.gray.900'),
              fontWeight: '600',
              fontSize: '1.5rem',
              marginTop: '2rem',
              marginBottom: '1rem'
            },
            h4: {
              color: theme('colors.gray.900'),
              fontWeight: '600',
              fontSize: '1.25rem',
              marginTop: '1.5rem',
              marginBottom: '0.75rem'
            },
            'figure figcaption': {
              color: theme('colors.gray.500'),
              fontSize: '0.875rem',
              textAlign: 'center',
              marginTop: '0.5rem'
            },
            code: {
              color: theme('colors.secondary.700'),
              backgroundColor: theme('colors.gray.100'),
              paddingLeft: '0.375rem',
              paddingRight: '0.375rem',
              paddingTop: '0.25rem',
              paddingBottom: '0.25rem',
              borderRadius: '0.375rem',
              fontSize: '0.875em',
              fontWeight: '500'
            },
            'code::before': {
              content: '""'
            },
            'code::after': {
              content: '""'
            },
            pre: {
              backgroundColor: theme('colors.dark.800'),
              color: theme('colors.gray.100'),
              borderRadius: '0.75rem',
              padding: '1.5rem',
              marginTop: '2rem',
              marginBottom: '2rem',
              border: `1px solid ${theme('colors.gray.700')}`
            }
          }
        },
        dark: {
          css: {
            color: 'rgb(229 236 246)', // AstroWind dark text
            '[class~="lead"]': {
              color: theme('colors.gray.400')
            },
            a: {
              color: theme('colors.primary.400'),
              '&:hover': {
                color: theme('colors.primary.300')
              }
            },
            strong: {
              color: theme('colors.gray.100')
            },
            'ol > li::marker': {
              color: theme('colors.gray.400')
            },
            'ul > li::marker': {
              color: theme('colors.gray.400')
            },
            hr: {
              borderColor: theme('colors.gray.700')
            },
            blockquote: {
              color: theme('colors.gray.400'),
              borderLeftColor: theme('colors.primary.600')
            },
            h1: {
              color: theme('colors.gray.100')
            },
            h2: {
              color: theme('colors.gray.100')
            },
            h3: {
              color: theme('colors.gray.100')
            },
            h4: {
              color: theme('colors.gray.100')
            },
            'figure figcaption': {
              color: theme('colors.gray.400')
            },
            code: {
              color: theme('colors.secondary.300'),
              backgroundColor: theme('colors.gray.800')
            },
            pre: {
              backgroundColor: theme('colors.dark.900'),
              color: theme('colors.gray.200'),
              border: `1px solid ${theme('colors.gray.700')}`
            }
          }
        }
      })
    }
  },
  plugins: [
    require('@tailwindcss/typography')
  ]
}