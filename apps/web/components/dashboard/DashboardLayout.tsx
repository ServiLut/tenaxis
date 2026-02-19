"use client";

import React, { useState } from "react";
import { Sidebar } from "./Sidebar";
import { Header } from "./Header";
import { cn } from "@/components/ui/utils";

export function DashboardLayout({ 
  children,
  overflowHidden = false 
}: { 
  children: React.ReactNode;
  overflowHidden?: boolean;
}) {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  return (
    <div className="h-screen bg-[#F5F1EB] dark:bg-zinc-950 overflow-hidden">
      <Sidebar isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} />
      <div className="lg:pl-72 h-full flex flex-col transition-all duration-300">
        <Header onMenuClick={() => setIsSidebarOpen(true)} />
        <main className={cn(
          "flex-1 min-h-0",
          overflowHidden ? "overflow-hidden" : "p-4 sm:p-6 lg:p-10 overflow-y-auto"
        )}>
          {children}
        </main>
      </div>
    </div>
  );
}
