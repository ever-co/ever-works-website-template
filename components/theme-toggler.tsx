"use client";

import { Button } from "@heroui/react";
import { Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import { useEffect, useState } from "react";

export function ThemeToggler() {
  const [mounted, setMounted] = useState(false);
  const { theme, setTheme } = useTheme();

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) return null;

  return (
    <div>
      <Button
        onPress={() => setTheme(theme === "light" ? "dark" : "light")}
        color="default"
        variant="bordered"
        className="rounded-full h-10 w-10 min-w-10 p-0"
      >
        {theme === "light" ? (
          <Moon className="opacity-70" />
        ) : (
          <Sun className="opacity-70" />
        )}
      </Button>
    </div>
  );
}
