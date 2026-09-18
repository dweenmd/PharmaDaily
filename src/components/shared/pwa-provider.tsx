"use client";

import * as React from "react";
import { SerwistProvider } from "@serwist/next/react";

export function PwaProvider({ children }: { children: React.ReactNode }) {
  React.useEffect(() => {
    if (typeof window !== "undefined" && "serviceWorker" in navigator) {
      if (process.env.NODE_ENV === "development") {
        navigator.serviceWorker.getRegistrations().then((registrations) => {
          for (const registration of registrations) {
            registration.unregister();
          }
        });
        if ("caches" in window) {
          caches.keys().then((names) => {
            for (const name of names) {
              caches.delete(name);
            }
          });
        }
      }
    }
  }, []);

  return (
    <SerwistProvider
      swUrl="/sw.js"
      disable={process.env.NODE_ENV === "development"}
      register={process.env.NODE_ENV !== "development"}
      cacheOnNavigation={false}
      reloadOnOnline
    >
      {children}
    </SerwistProvider>
  );
}
