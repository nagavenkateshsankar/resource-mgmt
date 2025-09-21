/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{vue,js,ts,jsx,tsx}",
  ],
  darkMode: ['class'], // Modern Tailwind dark mode syntax
  safelist: [
    // Modern Design Token Classes - Industry Standard
    'bg-background', 'bg-foreground', 'bg-card', 'bg-card-foreground',
    'bg-popover', 'bg-popover-foreground', 'bg-primary', 'bg-primary-foreground',
    'bg-secondary', 'bg-secondary-foreground', 'bg-muted', 'bg-muted-foreground',
    'bg-accent', 'bg-accent-foreground', 'bg-destructive', 'bg-destructive-foreground',
    'bg-success', 'bg-success-foreground', 'bg-warning', 'bg-warning-foreground',
    'bg-info', 'bg-info-foreground',

    // Text Colors - Semantic
    'text-background', 'text-foreground', 'text-card', 'text-card-foreground',
    'text-popover', 'text-popover-foreground', 'text-primary', 'text-primary-foreground',
    'text-secondary', 'text-secondary-foreground', 'text-muted', 'text-muted-foreground',
    'text-accent', 'text-accent-foreground', 'text-destructive', 'text-destructive-foreground',
    'text-success', 'text-success-foreground', 'text-warning', 'text-warning-foreground',
    'text-info', 'text-info-foreground',

    // Border Colors - Semantic
    'border', 'border-input', 'border-ring', 'border-primary', 'border-secondary',
    'border-muted', 'border-accent', 'border-destructive', 'border-success',
    'border-warning', 'border-info',

    // Button Classes - Modern
    'btn', 'btn-primary', 'btn-secondary', 'btn-destructive', 'btn-outline',
    'btn-ghost', 'btn-link', 'btn-success', 'btn-warning', 'btn-info',
    'btn-sm', 'btn-lg', 'btn-icon',

    // Form Classes - Modern
    'form-input', 'form-textarea', 'form-label',

    // Card Classes - Modern
    'card', 'card-header', 'card-title', 'card-description', 'card-content', 'card-footer',

    // Hover States - Semantic
    'hover:bg-primary/90', 'hover:bg-secondary/80', 'hover:bg-destructive/90',
    'hover:bg-accent', 'hover:text-accent-foreground', 'hover:bg-success/90',
    'hover:bg-warning/90', 'hover:bg-info/90',

    // Focus States - Modern
    'focus-visible:outline-none', 'focus-visible:ring-2', 'focus-visible:ring-ring',
    'focus-visible:ring-offset-2', 'ring-offset-background',

    // Legacy classes for transition period
    'bg-white', 'bg-gray-50', 'bg-gray-100', 'bg-gray-200', 'bg-gray-300',
    'bg-gray-700', 'bg-gray-800', 'bg-gray-900', 'text-white', 'text-gray-100',
    'text-gray-200', 'text-gray-300', 'text-gray-400', 'text-gray-500',
    'text-gray-600', 'text-gray-700', 'text-gray-800', 'text-gray-900',

    // Layout and spacing
    'flex', 'items-center', 'justify-center', 'gap-2', 'gap-3', 'space-y-1.5',
    'w-3', 'w-4', 'w-5', 'w-6', 'w-10', 'h-3', 'h-4', 'h-5', 'h-6', 'h-10',
    'p-1', 'p-2', 'p-3', 'p-6', 'px-3', 'px-4', 'px-8', 'py-1.5', 'py-2', 'py-3', 'pt-0',

    // Shadows and effects
    'shadow-sm', 'shadow', 'shadow-md', 'shadow-lg', 'shadow-xl',

    // Transitions and animations
    'transition-colors', 'duration-200', 'ease-in-out',

    // Typography
    'text-xs', 'text-sm', 'text-base', 'text-lg', 'text-xl', 'text-2xl',
    'font-medium', 'font-semibold', 'leading-none', 'leading-tight', 'tracking-tight',

    // Border radius
    'rounded', 'rounded-md', 'rounded-lg',

    // Positioning
    'relative', 'absolute', 'fixed', 'sticky',

    // Display
    'block', 'inline-block', 'inline-flex', 'hidden',

    // Opacity and visibility
    'opacity-50', 'opacity-90',

    // Cursor and interaction
    'cursor-pointer', 'cursor-not-allowed', 'pointer-events-none',
    'select-none', 'user-select-none',

    // Accessibility
    'sr-only', 'not-sr-only'
  ],
  theme: {
    container: {
      center: true,
      padding: "2rem",
      screens: {
        "2xl": "1400px",
      },
    },
    extend: {
      // Design Token Colors - Industry Standard HSL approach
      colors: {
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
        // Status Colors
        success: {
          DEFAULT: "hsl(var(--success))",
          foreground: "hsl(var(--success-foreground))",
        },
        warning: {
          DEFAULT: "hsl(var(--warning))",
          foreground: "hsl(var(--warning-foreground))",
        },
        info: {
          DEFAULT: "hsl(var(--info))",
          foreground: "hsl(var(--info-foreground))",
        },
        // Chart Colors
        chart: {
          1: "hsl(var(--chart-1))",
          2: "hsl(var(--chart-2))",
          3: "hsl(var(--chart-3))",
          4: "hsl(var(--chart-4))",
          5: "hsl(var(--chart-5))",
        },
      },
      // Typography using Design Tokens
      fontFamily: {
        sans: "var(--font-sans)",
        mono: "var(--font-mono)",
      },
      fontSize: {
        xs: "var(--text-xs)",
        sm: "var(--text-sm)",
        base: "var(--text-base)",
        lg: "var(--text-lg)",
        xl: "var(--text-xl)",
        "2xl": "var(--text-2xl)",
        "3xl": "var(--text-3xl)",
        "4xl": "var(--text-4xl)",
      },
      // Spacing using Design Tokens
      spacing: {
        0: "var(--spacing-0)",
        px: "var(--spacing-px)",
        0.5: "var(--spacing-0-5)",
        1: "var(--spacing-1)",
        1.5: "var(--spacing-1-5)",
        2: "var(--spacing-2)",
        2.5: "var(--spacing-2-5)",
        3: "var(--spacing-3)",
        3.5: "var(--spacing-3-5)",
        4: "var(--spacing-4)",
        5: "var(--spacing-5)",
        6: "var(--spacing-6)",
        7: "var(--spacing-7)",
        8: "var(--spacing-8)",
        9: "var(--spacing-9)",
        10: "var(--spacing-10)",
        11: "var(--spacing-11)",
        12: "var(--spacing-12)",
        14: "var(--spacing-14)",
        16: "var(--spacing-16)",
        20: "var(--spacing-20)",
        24: "var(--spacing-24)",
        28: "var(--spacing-28)",
        32: "var(--spacing-32)",
      },
      // Border Radius using Design Tokens
      borderRadius: {
        lg: "var(--radius)",
        md: "var(--radius-md)",
        sm: "var(--radius-sm)",
        none: "var(--radius-none)",
        xl: "var(--radius-xl)",
        "2xl": "var(--radius-2xl)",
        "3xl": "var(--radius-3xl)",
        full: "var(--radius-full)",
      },
      // Shadows using Design Tokens
      boxShadow: {
        sm: "var(--shadow-sm)",
        DEFAULT: "var(--shadow)",
        md: "var(--shadow-md)",
        lg: "var(--shadow-lg)",
        xl: "var(--shadow-xl)",
        "2xl": "var(--shadow-2xl)",
        inner: "var(--shadow-inner)",
      },
      // Animation & Transitions
      transitionDuration: {
        75: "var(--duration-75)",
        100: "var(--duration-100)",
        150: "var(--duration-150)",
        200: "var(--duration-200)",
        300: "var(--duration-300)",
        500: "var(--duration-500)",
        700: "var(--duration-700)",
        1000: "var(--duration-1000)",
      },
      // Z-Index Scale
      zIndex: {
        0: "var(--z-0)",
        10: "var(--z-10)",
        20: "var(--z-20)",
        30: "var(--z-30)",
        40: "var(--z-40)",
        50: "var(--z-50)",
        auto: "var(--z-auto)",
        dropdown: "var(--z-dropdown)",
        sticky: "var(--z-sticky)",
        fixed: "var(--z-fixed)",
        "modal-backdrop": "var(--z-modal-backdrop)",
        modal: "var(--z-modal)",
        popover: "var(--z-popover)",
        tooltip: "var(--z-tooltip)",
        toast: "var(--z-toast)",
      },
      // Responsive breakpoints (industry standard)
      screens: {
        xs: "475px",
      },
      // Animation keyframes
      keyframes: {
        "accordion-down": {
          from: { height: "0" },
          to: { height: "var(--radix-accordion-content-height)" },
        },
        "accordion-up": {
          from: { height: "var(--radix-accordion-content-height)" },
          to: { height: "0" },
        },
        "fade-in": {
          "0%": { opacity: "0" },
          "100%": { opacity: "1" },
        },
        "fade-out": {
          "0%": { opacity: "1" },
          "100%": { opacity: "0" },
        },
        "slide-in-from-top": {
          "0%": { transform: "translateY(-100%)" },
          "100%": { transform: "translateY(0)" },
        },
        "slide-in-from-bottom": {
          "0%": { transform: "translateY(100%)" },
          "100%": { transform: "translateY(0)" },
        },
        "slide-in-from-left": {
          "0%": { transform: "translateX(-100%)" },
          "100%": { transform: "translateX(0)" },
        },
        "slide-in-from-right": {
          "0%": { transform: "translateX(100%)" },
          "100%": { transform: "translateX(0)" },
        },
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
        "fade-in": "fade-in 0.2s ease-in-out",
        "fade-out": "fade-out 0.2s ease-in-out",
        "slide-in-from-top": "slide-in-from-top 0.3s ease-out",
        "slide-in-from-bottom": "slide-in-from-bottom 0.3s ease-out",
        "slide-in-from-left": "slide-in-from-left 0.3s ease-out",
        "slide-in-from-right": "slide-in-from-right 0.3s ease-out",
      },
    },
  },
  plugins: [],
}