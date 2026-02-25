"use client";

import React, { useState, useEffect } from "react";
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
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);

  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth < 1024) {
        setIsSidebarOpen(false);
      } else {
        setIsSidebarOpen(true);
      }
    };

    // Set initial state
    handleResize();

    // Optional: listen for resize if we want it to auto-close/open
    // window.addEventListener('resize', handleResize);
    // return () => window.removeEventListener('resize', handleResize);
  }, []);

  return (
    <div className="h-screen bg-[#F5F1EB] dark:bg-zinc-950">
      <Sidebar isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} />
      <div className={cn(
        "h-full flex flex-col transition-all duration-300",
        isSidebarOpen ? "lg:pl-72" : "pl-0"
      )}>
        <Header onMenuClick={() => setIsSidebarOpen(!isSidebarOpen)} isSidebarOpen={isSidebarOpen} />
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
