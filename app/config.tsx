'use client'

import type { Config } from "@/lib/content";
import { createContext, useContext } from "react";

const ConfigContext = createContext<Config>({});

export function ConfigProvider({ config, children }: { config: Config, children: React.ReactNode }) {
    return <ConfigContext.Provider value={config}>{children}</ConfigContext.Provider>;
}

export function useConfig() {
    const context = useContext<Config>(ConfigContext);
    if (!context) {
        throw new Error("useConfig must be used within a ConfigProvider");
    }
    return context;
}
