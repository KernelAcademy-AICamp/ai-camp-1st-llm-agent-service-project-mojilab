'use client';

import { createContext, useContext, useEffect, useState, ReactNode } from 'react';

type Theme = 'light' | 'dark';

interface ThemeColors {
  background: string;
  panel: string;
  panelHover: string;
  border: string;
  text: string;
  textSecondary: string;
  accent: string;
  accentHover: string;
  activeLayer: string;
  selectedLayer: string;
  canvas: string;
}

const lightTheme: ThemeColors = {
  background: '#ffffff',
  panel: '#f4f4f5',
  panelHover: '#e4e4e7',
  border: '#e4e4e7',
  text: '#18181b',
  textSecondary: '#71717a',
  accent: '#10b981',
  accentHover: '#059669',
  activeLayer: '#d1fae5',
  selectedLayer: '#10b981',
  canvas: '#ffffff',
};

const darkTheme: ThemeColors = {
  background: '#18181b',
  panel: '#27272a',
  panelHover: '#3f3f46',
  border: '#3f3f46',
  text: '#fafafa',
  textSecondary: '#a1a1aa',
  accent: '#10b981',
  accentHover: '#34d399',
  activeLayer: '#064e3b',
  selectedLayer: '#10b981',
  canvas: '#27272a',
};

interface ThemeContextType {
  theme: Theme;
  colors: ThemeColors;
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setTheme] = useState<Theme>('light');
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    // Load theme from localStorage
    const savedTheme = localStorage.getItem('mojilab-theme') as Theme;
    if (savedTheme) {
      setTheme(savedTheme);
    } else {
      // Check system preference
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      setTheme(prefersDark ? 'dark' : 'light');
    }
  }, []);

  const toggleTheme = () => {
    const newTheme = theme === 'light' ? 'dark' : 'light';
    setTheme(newTheme);
    localStorage.setItem('mojilab-theme', newTheme);
  };

  const colors = theme === 'light' ? lightTheme : darkTheme;

  // Prevent flash of wrong theme
  if (!mounted) {
    return null;
  }

  return (
    <ThemeContext.Provider value={{ theme, colors, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}
