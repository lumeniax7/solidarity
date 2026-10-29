import React, { createContext, useContext, useEffect, useMemo, useState } from "react";

type Theme = "light" | "dark";

interface ThemeContextType {
  theme: Theme;
  toggleTheme?: () => void;
  switchable: boolean;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

interface ThemeProviderProps {
  children: React.ReactNode;
  defaultTheme?: Theme;
  switchable?: boolean;
}

function readTheme(defaultTheme: Theme): Theme {
  try {
    const stored = localStorage.getItem("caisse-theme");
    return stored === "dark" || stored === "light" ? stored : defaultTheme;
  } catch {
    return defaultTheme;
  }
}

function applyTheme(theme: Theme, persist: boolean) {
  const root = document.documentElement;
  root.classList.toggle("dark", theme === "dark");
  root.style.colorScheme = theme;
  const themeColor = document.querySelector<HTMLMetaElement>('meta[name="theme-color"]');
  if (themeColor) themeColor.content = theme === "dark" ? "#0b1517" : "#0e5b49";
  if (persist) {
    try {
      localStorage.setItem("caisse-theme", theme);
    } catch {
      // Le thème courant reste appliqué même si le stockage est indisponible.
    }
  }
}

export function ThemeProvider({
  children,
  defaultTheme = "light",
  switchable = false,
}: ThemeProviderProps) {
  const [theme, setTheme] = useState<Theme>(() => switchable ? readTheme(defaultTheme) : defaultTheme);

  useEffect(() => {
    applyTheme(theme, switchable);
  }, [theme, switchable]);

  const toggleTheme = useMemo(() => {
    if (!switchable) return undefined;
    return () => {
      const next = theme === "light" ? "dark" : "light";
      applyTheme(next, true);
      setTheme(next);
    };
  }, [switchable, theme]);

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme, switchable }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error("useTheme must be used within ThemeProvider");
  }
  return context;
}
