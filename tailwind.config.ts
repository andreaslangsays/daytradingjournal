import type { Config } from "tailwindcss";

export default {
  darkMode: ["class"],
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
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
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        success: "hsl(var(--success))",
        danger: "hsl(var(--danger))",
        card: "hsl(var(--card))",
      },
      borderRadius: {
        lg: "0.85rem",
        md: "0.7rem",
        sm: "0.45rem",
      },
      boxShadow: {
        glow: "0 0 0 1px rgba(15, 23, 42, 0.06), 0 18px 60px rgba(15, 23, 42, 0.08)",
      },
      fontFamily: {
        sans: ["IBM Plex Sans", "ui-sans-serif", "system-ui"],
      },
      backgroundImage: {
        mesh: "radial-gradient(circle at top left, rgba(0, 196, 255, 0.12), transparent 30%), radial-gradient(circle at 85% 10%, rgba(255, 166, 0, 0.12), transparent 25%), linear-gradient(180deg, rgba(255,255,255,0.02), rgba(255,255,255,0))",
      },
    },
  },
  plugins: [],
} satisfies Config;
