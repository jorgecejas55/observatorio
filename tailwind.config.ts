import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        primary: { DEFAULT: '#db2777', hover: '#be185d' },
        secondary: '#f97316',
        accent: '#0ea5e9',
        background: '#FFFFFF',
        'text-primary': '#1f2937',
        'text-secondary': '#6b7280',
      },
      fontFamily: {
        sans: ['Roboto', 'sans-serif'],
      },
    },
  },
  safelist: [
    {
      pattern: /(bg|text)-(cyan|orange|pink|gray|green|blue|red|lime|purple|yellow)-(50|100|500|600)/,
      variants: ['hover', 'group-hover'],
    },
  ],
  plugins: [require('@tailwindcss/typography')],
}

export default config
