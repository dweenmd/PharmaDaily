import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "PharmaDaily - Authentication",
};

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <main className="min-h-screen bg-background text-foreground">
      {children}
    </main>
  );
}
