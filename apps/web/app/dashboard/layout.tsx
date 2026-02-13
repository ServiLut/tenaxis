import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Dashboard | Tenaxis",
  description: "Panel de control administrativo de Tenaxis.",
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
