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
          500: '#3b82f6', // AstroWind 主蓝色
          600: '#2563eb',
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
          600: '#7c3aed', // AstroWind 强调紫色
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
          900: '#0f172a',
          950: '#020617'
        }
      },
      fontFamily: {
        sans: ['Inter Variable', 'Inter', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        serif: ['Inter Variable', 'Inter', 'ui-serif', 'Georgia', 'serif'],
        mono: ['JetBrains Mono', 'ui-monospace', 'SFMono-Regular', 'Consolas', 'monospace']
      },
      typography: (theme) => ({
        DEFAULT: {
          css: {
            maxWidth: 'none',
            color: theme('colors.gray.700'),
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
            color: theme('colors.gray.300'),
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