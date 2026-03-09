"use client";

import React from "react";
import { cn } from "@/components/ui/utils";
import { toBogotaYmd } from "@/utils/date-utils";

// Utility to sanitize strings from potential XSS or unwanted characters
export const sanitizeString = (str: string) => {
  if (!str) return "";
  // Basic sanitization: remove potential HTML tags and trim
  return str.replace(/<[^>]*>?/gm, '').trim();
};

export const GlassCard = ({ children, className, onClick }: { children: React.ReactNode; className?: string; onClick?: () => void }) => (
  <div 
    onClick={onClick}
    className={cn(
      "relative overflow-hidden rounded-3xl border border-border bg-card/40 p-6 shadow-sm backdrop-blur-md transition-all duration-300",
      onClick ? "hover:shadow-md hover:scale-[1.02] cursor-pointer active:scale-95" : "cursor-default",
      className
    )}
  >
    {children}
  </div>
);

/**
 * Utility to export data to CSV and trigger download
 */
export const exportToCSV = (data: Record<string, string | number | null | undefined>[], filename: string) => {
  if (!data || data.length === 0) return;

  const headers = Object.keys(data[0]!).join(",");
  const rows = data.map(obj => 
    Object.values(obj)
      .map(val => {
        const str = String(val ?? "").replace(/"/g, '""');
        return `"${str}"`;
      })
      .join(",")
  );

  const csvContent = [headers, ...rows].join("\n");
  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const link = document.createElement("a");
  
  if (link.download !== undefined) {
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", `${filename}_${toBogotaYmd()}.csv`);
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }
};
