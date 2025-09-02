/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/webview/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        // Light theme colors
        light: {
          background: {
            primary: '#ffffff',
            secondary: '#f8f9fa',
            elevated: '#ffffff',
          },
          foreground: {
            primary: '#1a1a1a',
            secondary: '#6b7280',
            muted: '#9ca3af',
          },
          border: {
            DEFAULT: '#e5e7eb',
            muted: '#f3f4f6',
          },
          primary: {
            DEFAULT: '#3b82f6',
            hover: '#2563eb',
            active: '#1d4ed8',
          },
          success: '#10b981',
          warning: '#f59e0b',
          error: '#ef4444',
        },
        // Dark theme colors
        dark: {
          background: {
            primary: '#0f0f0f',
            secondary: '#1a1a1a',
            elevated: '#262626',
          },
          foreground: {
            primary: '#ffffff',
            secondary: '#d1d5db',
            muted: '#9ca3af',
          },
          border: {
            DEFAULT: '#374151',
            muted: '#1f2937',
          },
          primary: {
            DEFAULT: '#60a5fa',
            hover: '#3b82f6',
            active: '#2563eb',
          },
          success: '#34d399',
          warning: '#fbbf24',
          error: '#f87171',
        },
        // Semantic colors that adapt to theme
        background: {
          primary: 'rgb(var(--bg-primary))',
          secondary: 'rgb(var(--bg-secondary))',
          elevated: 'rgb(var(--bg-elevated))',
        },
        foreground: {
          primary: 'rgb(var(--fg-primary))',
          secondary: 'rgb(var(--fg-secondary))',
          muted: 'rgb(var(--fg-muted))',
        },
        border: {
          DEFAULT: 'rgb(var(--border-default))',
          muted: 'rgb(var(--border-muted))',
        },
        primary: {
          DEFAULT: 'rgb(var(--color-primary))',
          hover: 'rgb(var(--color-primary-hover))',
          active: 'rgb(var(--color-primary-active))',
        },
        success: 'rgb(var(--color-success))',
        warning: 'rgb(var(--color-warning))',
        error: 'rgb(var(--color-error))',
        // Additional semantic colors for shadcn components
        muted: {
          DEFAULT: 'rgb(var(--bg-secondary))',
          foreground: 'rgb(var(--fg-secondary))',
        },
        accent: {
          DEFAULT: 'rgb(var(--bg-elevated))',
          foreground: 'rgb(var(--fg-primary))',
        },
        ring: 'rgb(var(--color-primary))',
        input: 'rgb(var(--bg-secondary))',
      },
      borderRadius: {
        lg: "8px",
        md: "6px",
        sm: "4px",
      },
      fontFamily: {
        sans: ['Inter', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'sans-serif'],
        mono: ['JetBrains Mono', 'Fira Code', 'Consolas', 'Monaco', 'monospace'],
      },
    },
  },
  plugins: [],
}