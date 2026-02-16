import React from "react";
import { Sidebar } from "./Sidebar";
import { Header } from "./Header";

export function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-[#F5F1EB] dark:bg-zinc-950">
      <Sidebar />
      <div className="pl-72">
        <Header />
        <main className="p-10">{children}</main>
      </div>
    </div>
  );
}
