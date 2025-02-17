"use client";

import { Button } from "@heroui/react";
import { Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";

export function ThemeToggler() {
  const { theme, setTheme } = useTheme();

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
