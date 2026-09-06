"use client";

import { memo, useCallback, useState, useRef, useEffect } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import {
  BookOpen,
  HelpCircle,
  MessageCircleQuestion,
  FileText,
  Code,
  Building,
  Mail,
  LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { ChevronDown } from "./index";

interface MoreMenuItem {
  key: string;
  label: string;
  href: string;
  isExternal: boolean;
  icon: LucideIcon;
}

const MENU_ITEMS_CONFIG: Array<{
  key: string;
  href: string;
  translationKey: string;
  isExternal: boolean;
  icon: LucideIcon;
}> = [
    {
      key: "blog",
      href: "https://blog.ever.works",
      translationKey: "BLOG",
      isExternal: true,
      icon: BookOpen,
    },
    {
      key: "help",
      href: "/help",
      translationKey: "HELP",
      isExternal: false,
      icon: HelpCircle,
    },
    {
      key: "faq",
      href: "/faq",
      translationKey: "FAQ",
      isExternal: false,
      icon: MessageCircleQuestion,
    },
    {
      key: "docs",
      href: "https://docs.ever.works",
      translationKey: "DOCS",
      isExternal: true,
      icon: FileText,
    },
    {
      key: "api-docs",
      href: "/docs",
      translationKey: "API_DOCS",
      isExternal: true,
      icon: Code,
    },
    {
      key: "about",
      href: "/about",
      translationKey: "ABOUT",
      isExternal: false,
      icon: Building,
    },
    {
      key: "contacts",
      href: "https://ever.co/contacts",
      translationKey: "CONTACTS",
      isExternal: true,
      icon: Mail,
    },
  ];

const STYLES = {
  button: cn(
    "flex items-center gap-1",
    "transition-colors duration-150 font-medium whitespace-nowrap text-sm lg:text-sm xl:text-sm mt-1",
    "text-gray-700 dark:text-gray-300",
    "cursor-pointer hover:text-theme-primary",
    "outline-none focus:outline-none focus-visible:outline-none",
    "border-none focus:ring-0"
  ),
  dropdownContent: cn(
    "min-w-[5rem]", 
    "bg-white/95 dark:bg-[#141414]/95",
    "backdrop-blur-sm",
    "border border-gray-200/50 dark:border-white/6",
    "rounded-lg",
    "shadow-2xl shadow-gray-900/10 dark:shadow-black/30",
    "p-1",
    "z-50",
    "data-[state=open]:animate-in data-[state=closed]:animate-out",
    "data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0",
    "data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95",
    "data-[side=bottom]:slide-in-from-top-2",
    "data-[side=top]:slide-in-from-bottom-2"
  ),
  dropdownItem: cn(
    "flex items-center gap-2", 
    "px-3 py-2", 
    "rounded-md",
    "text-xs font-medium", 
    "text-gray-700 dark:text-gray-300/70",
    "hover:bg-theme-primary/10 dark:hover:bg-white/6",
    "hover:text-theme-primary dark:hover:text-white",
    "cursor-pointer outline-none",
    "transition-colors duration-150",
    "group"
  ),
  icon: cn(
    "w-4 h-4", // reduced from w-5 h-5
    "text-gray-400 dark:text-gray-500",
    "group-hover:text-theme-primary",
    "transition-colors duration-150"
  ),
  mobileButton: cn(
    "flex items-center justify-between w-full px-3 py-2 text-xs font-medium rounded-md", // reduced from text-sm
    "text-gray-700 dark:text-gray-200",
    "hover:bg-gray-100 dark:hover:bg-white/6",
    "transition-colors duration-150",
    "cursor-pointer"
  ),
  mobileMenuContainer: cn(
    "mt-1 ml-4 space-y-1"
  ),
  mobileMenuItem: cn(
    "flex items-center gap-2 w-full px-3 py-2 text-xs rounded-md", // reduced gap and text
    "text-gray-600 dark:text-gray-400",
    "hover:bg-gray-100 dark:hover:bg-white/6",
    "hover:text-theme-primary",
    "transition-colors duration-150"
  ),
};

interface MoreMenuProps {
  inline?: boolean;
  onItemClick?: () => void;
}

function MoreMenuComponent({ inline = false, onItemClick }: MoreMenuProps) {
  const t = useTranslations("common");
  const [isOpen, setIsOpen] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const hoverTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const menuItems: MoreMenuItem[] = MENU_ITEMS_CONFIG.map((item) => ({
    key: item.key,
    label: t(item.translationKey as keyof IntlMessages["common"]),
    href: item.href,
    isExternal: item.isExternal,
    icon: item.icon,
  }));

  const toggleMenu = useCallback(() => {
    setIsOpen((prev) => !prev);
  }, []);

  const handleItemClick = useCallback(() => {
    setIsOpen(false);
    setIsHovered(false);
    onItemClick?.();
  }, [onItemClick]);

  const handlePointerEnter = useCallback(() => {
    if (hoverTimeoutRef.current) {
      clearTimeout(hoverTimeoutRef.current);
    }
    setIsHovered(true);
  }, []);

  const handlePointerLeave = useCallback(() => {
    hoverTimeoutRef.current = setTimeout(() => {
      setIsHovered(false);
    }, 300);
  }, []);

  useEffect(() => {
    return () => {
      if (hoverTimeoutRef.current) {
        clearTimeout(hoverTimeoutRef.current);
      }
    };
  }, []);

  const renderMobileMenuItem = (item: MoreMenuItem) => {
    const Icon = item.icon;
    const commonProps = {
      className: STYLES.mobileMenuItem,
      onClick: handleItemClick,
    };

    if (item.isExternal) {
      return (
        <a
          key={item.key}
          href={item.href}
          target="_blank"
          rel="noopener noreferrer"
          {...commonProps}
        >
          <Icon className={STYLES.icon} />
          {item.label}
        </a>
      );
    }

    return (
      <Link key={item.key} href={item.href} {...commonProps}>
        <Icon className={STYLES.icon} />
        {item.label}
      </Link>
    );
  };

  if (inline) {
    return (
      <div>
        <button
          type="button"
          className={STYLES.mobileButton}
          onClick={toggleMenu}
          aria-expanded={isOpen}
          aria-haspopup="menu"
        >
          {t("MORE")}
          <ChevronDown
            className={cn(
              "w-3.5 h-3.5 transition-transform duration-200", // reduced from w-4 h-4
              isOpen && "rotate-180"
            )}
          />
        </button>
        {isOpen && (
          <div className={STYLES.mobileMenuContainer}>
            {menuItems.map(renderMobileMenuItem)}
          </div>
        )}
      </div>
    );
  }

  return (
    <div onPointerEnter={handlePointerEnter} onPointerLeave={handlePointerLeave}>
      <DropdownMenu.Root open={isHovered} onOpenChange={(open) => setIsHovered(open)} modal={false}>
        <DropdownMenu.Trigger asChild>
          <button
            type="button"
            className={STYLES.button}
            aria-label={t("MORE")}
          >
            {t("MORE")}
            <ChevronDown
              className={cn(
                "w-3.5 h-3.5 transition-transform duration-300 mt-0.5", // reduced from w-4 h-4
                isHovered && "rotate-180"
              )}
            />
          </button>
        </DropdownMenu.Trigger>

        <DropdownMenu.Portal>
          <DropdownMenu.Content
            className={STYLES.dropdownContent}
            sideOffset={4}
            align="center"
            onPointerEnter={handlePointerEnter}
            onPointerLeave={handlePointerLeave}
          >
            {menuItems.map((item) => {
              const Icon = item.icon;
              return (
                <DropdownMenu.Item
                  key={item.key}
                  className={STYLES.dropdownItem}
                  asChild
                >
                  {item.isExternal ? (
                    <a
                      href={item.href}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={handleItemClick}
                    >
                      <Icon className={STYLES.icon} />
                      {item.label}
                    </a>
                  ) : (
                    <Link href={item.href} onClick={handleItemClick}>
                      <Icon className={STYLES.icon} />
                      {item.label}
                    </Link>
                  )}
                </DropdownMenu.Item>
              );
            })}
          </DropdownMenu.Content>
        </DropdownMenu.Portal>
      </DropdownMenu.Root>
    </div>
  );
}

export const MoreMenu = memo(MoreMenuComponent);
MoreMenu.displayName = "MoreMenu";