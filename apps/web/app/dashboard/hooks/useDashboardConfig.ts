"use client";

import { useState, useEffect } from "react";

export type DashboardWidget = "kpis" | "trends" | "actionable" | "recent";

export interface DashboardConfig {
  widgets: DashboardWidget[];
  hidden: DashboardWidget[];
}

const STORAGE_KEY = "tenaxis-dashboard-config-v1";

const DEFAULT_CONFIG: DashboardConfig = {
  widgets: ["kpis", "trends", "actionable", "recent"],
  hidden: [],
};

export function useDashboardConfig() {
  const [config, setConfig] = useState<DashboardConfig>(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        try {
          return JSON.parse(saved);
        } catch (e) {
          console.error("Error parsing dashboard config", e);
        }
      }
    }
    return DEFAULT_CONFIG;
  });

  const isLoaded = true; // Since we initialize from localStorage, it's effectively loaded on mount in client

  const updateConfig = (newConfig: DashboardConfig) => {
    setConfig(newConfig);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(newConfig));
  };

  const moveWidget = (id: DashboardWidget, direction: "up" | "down") => {
    const currentIndex = config.widgets.indexOf(id);
    if (currentIndex === -1) return;

    const newWidgets = [...config.widgets];
    const targetIndex = direction === "up" ? currentIndex - 1 : currentIndex + 1;

    if (targetIndex >= 0 && targetIndex < newWidgets.length) {
      [newWidgets[currentIndex], newWidgets[targetIndex]] = [
        newWidgets[targetIndex]!,
        newWidgets[currentIndex]!,
      ];
      updateConfig({ ...config, widgets: newWidgets });
    }
  };

  const toggleVisibility = (id: DashboardWidget) => {
    if (config.widgets.includes(id)) {
      updateConfig({
        widgets: config.widgets.filter((w) => w !== id),
        hidden: [...config.hidden, id],
      });
    } else {
      updateConfig({
        widgets: [...config.widgets, id],
        hidden: config.hidden.filter((w) => w !== id),
      });
    }
  };

  return { config, updateConfig, moveWidget, toggleVisibility, isLoaded };
}
