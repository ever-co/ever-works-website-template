"use client";

import { HeroUIProvider } from "@heroui/react";
import { ThemeProvider } from "next-themes";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider enableSystem={true} attribute="class" defaultTheme="dark">
      <HeroUIProvider>{children}</HeroUIProvider>
    </ThemeProvider>
  );
}
