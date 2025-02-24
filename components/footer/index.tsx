'use client'

import { useConfig } from "@/app/config";
import { ThemeToggler } from "../theme-toggler";

export function Footer() {
  const config = useConfig();

  return (
    <footer className="border-t border-slate-200 py-4 w-full">
      <div className="max-w-[1536px] px-4 mx-auto flex items-center justify-between">
        <p className="text-slate-500 dark:text-slate-200 text-sm">
          &copy; { config.copyright_year } { config.company_name }. All rights reserved.
        </p>
        <ThemeToggler />
      </div>
    </footer>
  );
}
