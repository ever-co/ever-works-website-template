import { ThemeToggler } from "../theme-toggler";

export function Footer({ companyName }: { companyName?: string }) {
  const year = new Date().getFullYear();

  return (
    <footer className="border-t border-slate-200 py-4 w-full">
      <div className="max-w-[1536px] px-4 mx-auto flex items-center justify-between">
        <p className="text-slate-500 dark:text-slate-200 text-sm">
          &copy; {year} { companyName }. All rights reserved.
        </p>
        <ThemeToggler />
      </div>
    </footer>
  );
}
