// src/shared/useDarkMode.ts
// Toggles `dark` class on <html> and persists choice to localStorage.
// Light mode  → white backgrounds normal
// Dark mode   → only white/light page backgrounds flip to dark (#111)
import { useEffect, useState } from "react";

const STORAGE_KEY = "choucair-dark-mode";
const EVENT_KEY   = "choucair-dark-mode-change";

export function useDarkMode() {
  const [dark, setDark] = useState<boolean>(() => {
    try {
      // DOM class is set synchronously by the inline script in index.html
      // so it's always the ground truth on first render.
      return document.documentElement.classList.contains("dark");
    } catch {
      return false;
    }
  });

  useEffect(() => {
    document.documentElement.classList.toggle("dark", dark);
    // Fix body/html background immediately (before CSS kicks in)
    document.documentElement.style.background = dark ? '#111111' : '#f0f0f0';
    try {
      localStorage.setItem(STORAGE_KEY, String(dark));
    } catch {
      /* noop */
    }
    // Broadcast to all other useDarkMode instances on this page
    window.dispatchEvent(new CustomEvent(EVENT_KEY, { detail: dark }));
  }, [dark]);

  useEffect(() => {
    // Listen for changes broadcast by other instances
    const handler = (e: Event) => {
      const val = (e as CustomEvent<boolean>).detail;
      setDark((prev) => (prev !== val ? val : prev));
    };
    window.addEventListener(EVENT_KEY, handler);
    return () => window.removeEventListener(EVENT_KEY, handler);
  }, []);

  const toggle = () => setDark((d) => !d);

  return { dark, toggle };
}
