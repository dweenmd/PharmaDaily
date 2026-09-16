import { Pill } from "lucide-react";

/** Centred, chrome-free layout for the unauthenticated screens. */
export default function AuthLayout({ children }: LayoutProps<"/">) {
  return (
    <main className="bg-muted/40 flex min-h-svh flex-col items-center justify-center gap-6 px-4 py-10">
      <div className="flex items-center gap-2.5">
        <div className="bg-primary text-primary-foreground flex size-9 items-center justify-center rounded-lg">
          <Pill className="size-5" />
        </div>
        <span className="text-xl font-semibold tracking-tight">PharmaDaily</span>
      </div>

      <div className="w-full max-w-sm">{children}</div>

      <p className="text-muted-foreground text-xs">
        Pharmacy management system · Authorised staff only
      </p>
    </main>
  );
}
