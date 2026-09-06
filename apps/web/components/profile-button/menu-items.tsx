
import { memo, useMemo } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import {
  User,
  Settings,
  FolderTree,
  Tag,
  Package,
  Shield,
  Users,
  Zap,
  Star,
  Activity,
  MessageSquare,
  Building2,
  FileText,
  Sliders,
  Flag,
  Layers,
  DollarSign,
  LayoutDashboard,
  ShieldAlert,
  Receipt,
  type LucideIcon
} from "lucide-react";
import type { ExtendedUser } from "@/types/profile-button.types";

interface MenuItemsComponentProps {
  user: ExtendedUser;
  profilePath: string;
  onItemClick: () => void;
  onNavigationStart?: () => void;
  onNavigationEnd?: () => void;
  isNavigating?: boolean;
}

function MenuItems({ user, profilePath, onItemClick, onNavigationStart, isNavigating }: MenuItemsComponentProps) {
  // Derive isAdmin from user prop
  const isAdmin = user.isAdmin === true;
  const t = useTranslations();
  const router = useRouter();

  // Navigation handler — routes via next-intl so the active locale prefix is preserved.
  const handleNavigation = (href: string) => {
    onNavigationStart?.();
    onItemClick(); // Close menu immediately
    router.push(href);
  };

  // Memoize translations to prevent unnecessary re-renders
  const translations = useMemo(() => ({
    analyticsDashboard: t("common.ANALYTICS_DASHBOARD"),
    category: t("common.CATEGORY"),
    tag: t("common.TAG"),
    items: t("common.ITEMS"),
    comments: t("common.COMMENTS"),
    userManagement: t("common.USER_MANAGEMENT"),
    settings: t("settings.SETTINGS"),
    yourProfile: t("common.YOUR_PROFILE"),
    yourProfileDesc: t("common.YOUR_PROFILE_DESC"),
    accountSettingsDesc: t("settings.ACCOUNT_SETTINGS_DESC"),
    communityTitle: t("usersDirectory.HERO_TITLE"),
    communityDesc: t("usersDirectory.HERO_SUBTITLE"),
  }), [t]);

  // Simplified menu item component
  const MenuItem = ({
    href,
    icon: Icon,
    title,
    description,
    gradientFrom,
    gradientTo,
    iconColor,
    endIcon: EndIcon = Zap
  }: {
    href: string;
    icon: LucideIcon;
    title: string;
    description: string;
    gradientFrom: string;
    gradientTo: string;
    iconColor: string;
    endIcon?: LucideIcon;
  }) => {
    return (
      <button
        type="button"
        onClick={() => handleNavigation(href)}
        disabled={isNavigating}
        className="group cursor-pointer flex items-center px-3 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-white/4 transition-colors duration-150 focus:outline-hidden w-full text-left disabled:opacity-50 disabled:cursor-not-allowed"
        role="menuitem"
      >
        <div
          className={`flex items-center justify-center w-6 h-6 mr-3 rounded-md bg-gray-100 dark:bg-white/5 shrink-0`}
        >
          <Icon aria-hidden="true" className={`h-3 w-3 ${iconColor}`} />
        </div>
        <div className="flex-1 min-w-0">
          <span className="font-medium text-xs">{title}</span>
          <p className="text-[11px] text-gray-500 dark:text-gray-400 truncate">{description}</p>
        </div>
      </button>
    );
  }
  if (isAdmin) {
    return (
      <div className="max-h-100 overflow-y-auto scrollbar-thin scrollbar-track-transparent scrollbar-thumb-gray-400/40 dark:scrollbar-thumb-gray-500/40 scrollbar-thumb-rounded-full [&::-webkit-scrollbar]:w-1"
      >
        <MenuItem
          href={profilePath}
          icon={User}
          title={translations.yourProfile}
          description={translations.yourProfileDesc}
          gradientFrom="from-blue-100"
          gradientTo="to-indigo-100 dark:from-blue-900/30 dark:to-indigo-900/30"
          iconColor="text-theme-primary-600 dark:text-theme-primary-400"
        />

        <MenuItem
          href="/admin"
          icon={Settings}
          title={translations.analyticsDashboard}
          description={t("common.ANALYTICS_DASHBOARD_DESC")}
          gradientFrom="from-blue-100"
          gradientTo="to-indigo-100 dark:from-blue-900/30 dark:to-indigo-900/30"
          iconColor="text-theme-primary-600 dark:text-theme-primary-400"
        />

        <MenuItem
          href="/admin/clients"
          icon={Users}
          title={t("common.MANAGE_CLIENTS")}
          description={t("common.MANAGE_CLIENTS_DESC")}
          gradientFrom="from-green-100"
          gradientTo="to-emerald-100 dark:from-green-900/30 dark:to-emerald-900/30"
          iconColor="text-green-600 dark:text-green-400"
          endIcon={Activity}
        />

        <MenuItem
          href="/admin/companies"
          icon={Building2}
          title={t("common.MANAGE_COMPANIES")}
          description={t("common.MANAGE_COMPANIES_DESC")}
          gradientFrom="from-cyan-100"
          gradientTo="to-sky-100 dark:from-cyan-900/30 dark:to-sky-900/30"
          iconColor="text-cyan-600 dark:text-cyan-400"
          endIcon={Star}
        />

        <MenuItem
          href="/admin/collections"
          icon={Layers}
          title={t("common.MANAGE_COLLECTIONS")}
          description={t("common.MANAGE_COLLECTIONS_DESC")}
          gradientFrom="from-pink-100"
          gradientTo="to-rose-100 dark:from-pink-900/30 dark:to-rose-900/30"
          iconColor="text-pink-600 dark:text-pink-400"
          endIcon={Star}
        />

        <MenuItem
          href="/admin/categories"
          icon={FolderTree}
          title={translations.category}
          description={t("common.MANAGE_CATEGORIES_DESC")}
          gradientFrom="from-purple-100"
          gradientTo="to-violet-100 dark:from-purple-900/30 dark:to-violet-900/30"
          iconColor="text-purple-600 dark:text-purple-400"
          endIcon={Star}
        />

        <MenuItem
          href="/admin/tags"
          icon={Tag}
          title={translations.tag}
          description={t("common.MANAGE_TAGS_DESC")}
          gradientFrom="from-indigo-100"
          gradientTo="to-blue-100 dark:from-indigo-900/30 dark:to-blue-900/30"
          iconColor="text-indigo-600 dark:text-indigo-400"
        />

        <MenuItem
          href="/admin/items"
          icon={Package}
          title={translations.items}
          description={t("common.MANAGE_ITEMS_DESC")}
          gradientFrom="from-orange-100"
          gradientTo="to-amber-100 dark:from-orange-900/30 dark:to-amber-900/30"
          iconColor="text-orange-600 dark:text-orange-400"
          endIcon={Activity}
        />

        <MenuItem
          href="/admin/surveys"
          icon={FileText}
          title={t("survey.SURVEYS")}
          description={t("survey.MANAGE_SURVEYS_DESC")}
          gradientFrom="from-yellow-100"
          gradientTo="to-orange-100 dark:from-yellow-900/30 dark:to-orange-900/30"
          iconColor="text-yellow-600 dark:text-yellow-400"
        />

        <MenuItem
          href="/admin/comments"
          icon={MessageSquare}
          title={translations.comments}
          description={t("common.MANAGE_COMMENTS_DESC")}
          gradientFrom="from-blue-100"
          gradientTo="to-cyan-100 dark:from-blue-900/30 dark:to-cyan-900/30"
          iconColor="text-blue-600 dark:text-blue-400"
        />

        <MenuItem
          href="/admin/reports"
          icon={Flag}
          title={t("common.REPORTS")}
          description={t("common.MANAGE_REPORTS_DESC")}
          gradientFrom="from-red-100"
          gradientTo="to-orange-100 dark:from-red-900/30 dark:to-orange-900/30"
          iconColor="text-red-600 dark:text-red-400"
        />

        <MenuItem
          href="/admin/billing-issues"
          icon={ShieldAlert}
          title={t("admin.ADMIN_BILLING_ISSUES_PAGE.TITLE")}
          description={t("admin.ADMIN_BILLING_ISSUES_PAGE.SUBTITLE")}
          gradientFrom="from-rose-100"
          gradientTo="to-orange-100 dark:from-rose-900/30 dark:to-orange-900/30"
          iconColor="text-rose-600 dark:text-rose-400"
        />

        <MenuItem
          href="/admin/payment-reports"
          icon={Receipt}
          title={t("admin.ADMIN_PAYMENT_REPORTS_PAGE.TITLE")}
          description={t("admin.ADMIN_PAYMENT_REPORTS_PAGE.SUBTITLE")}
          gradientFrom="from-emerald-100"
          gradientTo="to-teal-100 dark:from-emerald-900/30 dark:to-teal-900/30"
          iconColor="text-emerald-600 dark:text-emerald-400"
        />

        <MenuItem
          href="/admin/roles"
          icon={Shield}
          title={t("common.ROLES")}
          description={t("common.MANAGE_USER_ROLES_DESC")}
          gradientFrom="from-red-100"
          gradientTo="to-pink-100 dark:from-red-900/30 dark:to-pink-900/30"
          iconColor="text-red-600 dark:text-red-400"
          endIcon={Star}
        />

        <MenuItem
          href="/admin/users"
          icon={Users}
          title={translations.userManagement}
          description={t("common.USER_MANAGEMENT_DESC")}
          gradientFrom="from-teal-100"
          gradientTo="to-cyan-100 dark:from-teal-900/30 dark:to-cyan-900/30"
          iconColor="text-teal-600 dark:text-teal-400"
        />

        <MenuItem
          href="/admin/settings"
          icon={Sliders}
          title={translations.settings}
          description={t("settings.ADMIN_SETTINGS_DESC")}
          gradientFrom="from-slate-100"
          gradientTo="to-gray-100 dark:from-[#0a0a0a]/30 dark:to-[#0a0a0a]/30"
          iconColor="text-slate-600 dark:text-slate-400"
          endIcon={Star}
        />
      </div>
    );
  }

  return (
    <div className="max-h-80 overflow-y-auto scrollbar-thin scrollbar-track-transparent scrollbar-thumb-gray-400/40 dark:scrollbar-thumb-gray-500/40 scrollbar-thumb-rounded-full [&::-webkit-scrollbar]:w-1"
    >
      <MenuItem
        href="/client/dashboard"
        icon={LayoutDashboard}
        title={t("common.DASHBOARD")}
        description={t("common.CLIENT_DASHBOARD_DESC")}
        gradientFrom="from-blue-100"
        gradientTo="to-indigo-100 dark:from-blue-900/30 dark:to-indigo-900/30"
        iconColor="text-theme-primary-600 dark:text-theme-primary-400"
      />

      <MenuItem
        href={profilePath}
        icon={User}
        title={translations.yourProfile}
        description={translations.yourProfileDesc}
        gradientFrom="from-blue-100"
        gradientTo="to-indigo-100 dark:from-blue-900/30 dark:to-indigo-900/30"
        iconColor="text-theme-primary-600 dark:text-theme-primary-400"
      />

      <MenuItem
        href="/client/users"
        icon={Users}
        title={translations.communityTitle}
        description={translations.communityDesc}
        gradientFrom="from-indigo-100"
        gradientTo="to-purple-100 dark:from-indigo-900/30 dark:to-purple-900/30"
        iconColor="text-indigo-600 dark:text-indigo-400"
      />

      <MenuItem
        href="/client/submissions"
        icon={FileText}
        title={t("settings.SETTINGS_CARDS.SUBMISSIONS.TITLE")}
        description={t("settings.SETTINGS_CARDS.SUBMISSIONS.DESCRIPTION")}
        gradientFrom="from-purple-100"
        gradientTo="to-violet-100 dark:from-purple-900/30 dark:to-violet-900/30"
        iconColor="text-purple-600 dark:text-purple-400"
        endIcon={Activity}
      />

      <MenuItem
        href="/client/sponsorships"
        icon={DollarSign}
        title={t("settings.SETTINGS_CARDS.SPONSORSHIPS.TITLE")}
        description={t("settings.SETTINGS_CARDS.SPONSORSHIPS.DESCRIPTION")}
        gradientFrom="from-emerald-100"
        gradientTo="to-green-100 dark:from-emerald-900/30 dark:to-green-900/30"
        iconColor="text-emerald-600 dark:text-emerald-400"
        endIcon={Activity}
      />

      <MenuItem
        href="/client/settings"
        icon={Settings}
        title={translations.settings}
        description={translations.accountSettingsDesc}
        gradientFrom="from-gray-100"
        gradientTo="to-slate-100 dark:from-white/6 dark:to-white/6 cursor-pointer"
        iconColor="text-gray-600 dark:text-gray-400"
        endIcon={Activity}
      />
    </div>
  );
}

// Export memoized component for better performance
export default memo(MenuItems);
