/** @type {import('tailwindcss').Config} */
export default {
  content: ['./src/**/*.{astro,html,js,jsx,md,mdx,svelte,ts,tsx,vue}'],
  theme: {
    extend: {
      typography: {
        DEFAULT: {
          css: {
            maxWidth: 'none',
            color: 'rgb(55, 65, 81)',
            '[class~="lead"]': {
              color: 'rgb(107, 114, 128)'
            },
            a: {
              color: 'rgb(59, 130, 246)',
              textDecoration: 'none',
              '&:hover': {
                color: 'rgb(37, 99, 235)'
              }
            },
            strong: {
              color: 'rgb(17, 24, 39)'
            },
            'ol > li::marker': {
              color: 'rgb(107, 114, 128)'
            },
            'ul > li::marker': {
              color: 'rgb(107, 114, 128)'
            },
            hr: {
              borderColor: 'rgb(229, 231, 235)'
            },
            blockquote: {
              color: 'rgb(107, 114, 128)',
              borderLeftColor: 'rgb(229, 231, 235)'
            },
            h1: {
              color: 'rgb(17, 24, 39)'
            },
            h2: {
              color: 'rgb(17, 24, 39)'
            },
            h3: {
              color: 'rgb(17, 24, 39)'
            },
            h4: {
              color: 'rgb(17, 24, 39)'
            },
            'figure figcaption': {
              color: 'rgb(107, 114, 128)'
            },
            code: {
              color: 'rgb(17, 24, 39)',
              backgroundColor: 'rgb(243, 244, 246)',
              paddingLeft: '0.25rem',
              paddingRight: '0.25rem',
              paddingTop: '0.125rem',
              paddingBottom: '0.125rem',
              borderRadius: '0.25rem',
              fontSize: '0.875em'
            },
            'code::before': {
              content: '""'
            },
            'code::after': {
              content: '""'
            },
            pre: {
              backgroundColor: 'rgb(31, 41, 55)',
              color: 'rgb(229, 231, 235)'
            }
          }
        }
      }
    }
  },
  plugins: [
    require('@tailwindcss/typography')
  ]
}