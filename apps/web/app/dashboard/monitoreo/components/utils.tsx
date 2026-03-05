"use client";

import React from "react";
import { cn } from "@/components/ui/utils";

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
