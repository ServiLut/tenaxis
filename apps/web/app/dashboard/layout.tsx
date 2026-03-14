import type { Metadata } from "next";
import { PersistentChatwootPanel } from "@/components/dashboard/PersistentChatwootPanel";

export const metadata: Metadata = {
  title: "Dashboard | Tenaxis",
  description: "Panel de control administrativo de Tenaxis.",
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <>
      {children}
      <PersistentChatwootPanel />
    </>
  );
}
