"use client";

import * as React from "react";
import { Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";

export function ModeToggle() {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = React.useState(false);

  // Avoid hydration mismatch
  React.useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <div className="flex h-10 w-10 lg:h-12 lg:w-12 items-center justify-center rounded-xl bg-zinc-50 border border-zinc-100 animate-pulse" />
    );
  }

  return (
    <button
      onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
      aria-label="Cambiar tema"
      className="relative flex h-10 w-10 lg:h-12 lg:w-12 items-center justify-center rounded-xl bg-zinc-50 text-zinc-400 transition-all hover:bg-azul-1 hover:text-white hover:shadow-lg hover:shadow-azul-1/20 border border-zinc-100 dark:bg-zinc-900 dark:border-zinc-800"
    >
      <Sun className="h-4 w-4 lg:h-5 lg:w-5 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
      <Moon className="absolute h-4 w-4 lg:h-5 lg:w-5 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
      <span className="sr-only">Cambiar tema</span>
    </button>
  );
}
