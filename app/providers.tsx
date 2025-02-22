"use client";

import type { Config } from '@/lib/content'
import { HeroUIProvider } from '@heroui/react'
import { ConfigProvider } from './config'
import { ThemeProvider } from 'next-themes';

export function Providers({ config, children}: { config: Config, children: React.ReactNode }) {
  return (
    <ConfigProvider config={config}>
      <ThemeProvider enableSystem={true} attribute="class" defaultTheme="dark">
        <HeroUIProvider>{children}</HeroUIProvider>
      </ThemeProvider>
    </ConfigProvider>
  )
}
