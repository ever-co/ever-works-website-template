'use client';

import { useConfig } from '@/app/[locale]/config';
import {
	Navbar,
	NavbarBrand,
	NavbarContent,
	NavbarItem,
	NavbarMenuToggle,
	NavbarMenu,
	NavbarMenuItem
} from '@heroui/react';
import { useLocale, useTranslations } from 'next-intl';
import { Link, usePathname } from '@/i18n/navigation';
import { useMemo, useCallback, useState, useRef } from 'react';
import { useCurrentUser } from '@/hooks/use-current-user';
import { LayoutSwitcher } from '../layout-switcher';
import { NavigationControls } from '../navigation-controls';
import { ProfileButton } from './profile-button';
import { NotificationBell } from '@/components/notifications';
import { MoreMenu } from './more-menu';
import { SettingsButton } from '../settings-button';
import { Container, useContainerWidth } from '../ui/container';
import { SiteLogo } from '../shared/site-logo';
import { useFeatureFlagsWithSimulation } from '@/hooks/use-feature-flags-with-simulation';
import { useHasGlobalSurveys } from '@/hooks/use-has-global-surveys';
import { useCategoriesEnabled } from '@/hooks/use-categories-enabled';
import { useSurveysEnabled } from '@/hooks/use-surveys-enabled';
import { useTagsEnabled } from '@/hooks/use-tags-enabled';
import { useHeaderSettings } from '@/hooks/use-header-settings';
import { useLocationSettings } from '@/hooks/use-location-settings';
import { useCategoriesExists } from '@/hooks/use-categories-exists';
import { useCollectionsExists } from '@/hooks/use-collections-exists';
import { useComparisonsExists } from '@/hooks/use-comparisons-exists';
import { useBlogExists } from '@/hooks/use-blog-exists';
import { useTagsExists } from '@/hooks/use-tags-exists';
import { isDemoMode } from '@/lib/utils';
import { isExternalUrl, resolveLabel } from '@/lib/utils/custom-navigation';
import type { CustomNavigationItem } from '@/lib/content';

interface NavigationItem {
	key: string;
	label: string;
	href: string;
	translationKey?: string;
	translationNamespace?: 'common' | 'listing' | 'survey';
	isExternal?: boolean;
}

interface ChevronProps {
	fill?: string;
	size?: number;
	height?: number;
	width?: number;
	className?: string;
	[key: string]: any;
}

const NAVIGATION_CONFIG: Array<{
	key: string;
	href: string;
	translationKey?: string;
	translationNamespace?: 'common' | 'listing' | 'survey';
	staticLabel?: string;
}> = [
	{
		key: 'home',
		href: '/',
		translationKey: 'HOME',
		translationNamespace: 'common'
	},
	// {
	//   key: "discover",
	//   href: "/discover",
	//   translationKey: "DISCOVER",
	//   translationNamespace: "common",
	// },
	// {
	//   key: "about",
	//   href: "#",
	//   translationKey: "ABOUT",
	//   translationNamespace: "common",
	// },
	// {
	//   key: "github",
	//   href: "#",
	//   staticLabel: "GitHub",
	// },
	{
		key: 'collections',
		href: '/collections',
		translationKey: 'COLLECTION',
		translationNamespace: 'common'
	},
	{
		key: 'comparisons',
		href: '/comparisons',
		translationKey: 'COMPARISONS',
		translationNamespace: 'common'
	},
	{
		key: 'blog',
		href: '/blog',
		translationKey: 'BLOG',
		translationNamespace: 'common'
	},
	{
		key: 'favorites',
		href: '/favorites',
		translationKey: 'FAVORITES',
		translationNamespace: 'common'
	},
	{
		key: 'categories',
		href: '/categories',
		translationKey: 'CATEGORY',
		translationNamespace: 'common'
	},
	{
		key: 'tags',
		href: '/tags',
		translationKey: 'TAG',
		translationNamespace: 'common'
	},
	{
		key: 'surveys',
		href: '/surveys',
		translationKey: 'SURVEYS',
		translationNamespace: 'survey'
	},
	{
		key: 'pricing',
		href: '/pricing',
		translationKey: 'PRICING',
		translationNamespace: 'common'
	},
	{
		key: 'map',
		href: '/map',
		translationKey: 'HEADER_MAP',
		translationNamespace: 'common'
	},
	{
		key: 'submit',
		href: '/submit',
		translationKey: 'SUBMIT',
		translationNamespace: 'common'
	}
];

const STYLES = {
	navbar: 'bg-white/75 dark:bg-[#0a0a0a]/75 backdrop-blur-md border-b border-gray-200/50 dark:border-white/6 sticky top-0 z-50',
	container: 'flex items-center justify-between w-full min-h-[60px] sm:min-h-[64px] md:min-h-[68px] lg:min-h-[65px]',
	navContent: 'hidden lg:flex gap-5 xl:gap-6 2xl:gap-6 mr-6 xl:mr-8 2xl:mr-10',
	navbarMenuToggle: 'lg:hidden transition-transform duration-150',
	brand: 'flex items-center group transition-transform duration-150',
	brandIcon: 'relative font-bold mr-2 sm:mr-3 md:mr-4 lg:mr-5',
	brandIconSvg:
		'w-6 h-6 sm:w-7 sm:h-7 md:w-8 md:h-8 lg:w-9 lg:h-9 xl:w-10 xl:h-10 2xl:w-11 2xl:h-11 transition-transform duration-150 group-',
	brandText:
		'font-bold text-xs sm:text-sm md:text-base lg:text-lg xl:text-xl 2xl:text-2xl transition-colors duration-200 group-hover:text-theme-primary',
	linkBase:
		'transition-colors duration-150 pb-2.5 font-medium whitespace-nowrap text-xs lg:text-sm dark:text-gray-300',
	linkActive:
		'text-theme-primary dark:text-theme-primary pb-2.5 font-medium relative after:content-[""] after:absolute after:bottom-0 after:left-1/2 after:-translate-x-1/2 after:w-1 after:h-1 after:bg-theme-primary after:rounded-full',
	linkInactive: 'text-gray-700 dark:text-gray-300 hover:text-theme-primary',
	rightSection:
		'flex items-center gap-1 sm:gap-2 md:gap-2 pl-8 py-1 relative lg:before:content-[""] lg:before:absolute lg:before:left-0 lg:before:h-[20px] lg:before:w-px lg:before:bg-gray-200 dark:lg:before:bg-gray-700',
	mobileMenu: 'mt-6 flex flex-col gap-2 px-4 pb-6',
	mobileMenuItem:
		'text-gray-700 dark:text-gray-200 hover:text-blue-600 dark:hover:text-blue-400 transition-colors duration-200',
	mobileLink:
		'block w-full text-sm sm:text-base md:text-lg py-2 px-3 rounded-md hover:bg-gray-100 dark:hover:bg-white/6 transition-colors duration-150',
	mobileControls: 'py-4 flex flex-col gap-4 border-t border-gray-200/50 dark:border-white/6 mt-4',
	mobileOnly: 'lg:hidden',
	desktopOnly: 'hidden lg:block',
	tabletUp: 'hidden md:block',
	mobileDown: 'lg:hidden',
	largeUp: 'hidden xl:block'
};

// Skeleton component for header navigation while loading
function HeaderNavSkeleton() {
	return (
		<div className="hidden lg:flex gap-4 xl:gap-6 2xl:gap-8 mr-6 xl:mr-8 2xl:mr-10">
			{/* Show skeleton placeholders for nav items */}
			{[1, 2, 3, 4, 5].map((i) => (
				<div key={i} className="h-5 w-16 bg-gray-200/50 dark:bg-white/4 rounded animate-pulse" />
			))}
		</div>
	);
}

export default function Header() {
	const [_isMenuOpen, setIsMenuOpen] = useState(false);
	const { user } = useCurrentUser();
	const { features } = useFeatureFlagsWithSimulation();
	const { hasGlobalSurveys, isPending: _surveysPending } = useHasGlobalSurveys();
	const { categoriesEnabled } = useCategoriesEnabled();
	const { surveysEnabled } = useSurveysEnabled();
	const { tagsEnabled } = useTagsEnabled();
	const { settings: headerSettings } = useHeaderSettings();
	const { settings: locationSettings } = useLocationSettings();
	const { data: categoriesData, isLoading: categoriesLoading } = useCategoriesExists();
	const { data: collectionsData, isLoading: collectionsLoading } = useCollectionsExists();
	const { data: comparisonsData, isLoading: comparisonsLoading } = useComparisonsExists();
	const { data: blogData, isLoading: blogLoading } = useBlogExists();
	const { data: tagsData, isLoading: tagsLoading } = useTagsExists();
	const isDemo = isDemoMode();

	const _locale = useLocale();
	const t = useTranslations('common');
	const tListing = useTranslations('listing');
	const tSurvey = useTranslations('survey');
	const tGlobal = useTranslations();
	const config = useConfig();
	const pathname = usePathname();

	// Stable refs for translation functions to avoid defeating useMemo
	// (translation functions are new references on every render)
	const tRef = useRef(t);
	const tListingRef = useRef(tListing);
	const tSurveyRef = useRef(tSurvey);
	const tGlobalRef = useRef(tGlobal);
	tRef.current = t;
	tListingRef.current = tListing;
	tSurveyRef.current = tSurvey;
	tGlobalRef.current = tGlobal;

	// Check if we're still loading essential data for navigation
	const isNavigationLoading =
		categoriesLoading || collectionsLoading || comparisonsLoading || tagsLoading || blogLoading;

	// Extract existence flags from React Query data
	const hasCategories = categoriesData?.exists ?? false;
	const hasCollections = collectionsData?.exists ?? false;
	const hasComparisons = comparisonsData?.exists ?? false;
	const hasPosts = blogData?.exists ?? false;
	const hasTags = tagsData?.exists ?? false;

	const navigationItems = useMemo((): NavigationItem[] => {
		const defaultItems = NAVIGATION_CONFIG.filter((item) => {
			// Hide collections link when no collections exist
			// Note: During loading, skeleton is shown, so this filter only applies after data is loaded
			if (item.key === 'collections' && !hasCollections) {
				return false;
			}
			if (item.key === 'comparisons' && !hasComparisons) {
				return false;
			}
			// Hide the blog link when the data repository ships no posts
			if (item.key === 'blog' && !hasPosts) {
				return false;
			}
			// Hide categories link when categories are disabled or no categories exist
			if (item.key === 'categories' && (!categoriesEnabled || !hasCategories)) {
				return false;
			}
			// Hide tags link when tags are disabled or no tags exist
			if (item.key === 'tags' && (!tagsEnabled || !hasTags)) {
				return false;
			}
			// Hide favorites link when feature is disabled or user is not logged in
			if (item.key === 'favorites' && (!features.favorites || !user?.id)) {
				return false;
			}
			// Hide surveys link when surveys are disabled or there are no global surveys
			if (item.key === 'surveys' && (!surveysEnabled || !hasGlobalSurveys)) {
				return false;
			}
			// Hide pricing link when header pricing is disabled
			if (item.key === 'pricing' && !headerSettings.pricingEnabled) {
				return false;
			}
			// Hide map link unless both the feature toggle and location features are on
			if (item.key === 'map' && (!headerSettings.mapEnabled || !locationSettings.enabled)) {
				return false;
			}
			// Hide submit link when header submit is disabled
			if (item.key === 'submit' && !headerSettings.submitEnabled) {
				return false;
			}
			return true;
		}).map((item) => ({
			key: item.key,
			href: item.href,
			label: item.translationKey
				? item.translationNamespace === 'listing'
					? tListingRef.current(item.translationKey as any)
					: item.translationNamespace === 'survey'
						? tSurveyRef.current(item.translationKey as any)
						: tRef.current(item.translationKey as any)
				: item.staticLabel || item.key,
			isExternal: false
		}));

		// Process custom header items from config
		const customItems: NavigationItem[] = [];
		if (config.custom_header && Array.isArray(config.custom_header)) {
			config.custom_header.forEach((item: CustomNavigationItem, index: number) => {
				// Validate item structure
				if (!item || typeof item !== 'object' || !item.label || !item.path) {
					console.warn(`Invalid custom_header item at index ${index}:`, item);
					return;
				}

				const isExternal = isExternalUrl(item.path);
				customItems.push({
					key: `custom-header-${index}`,
					href: item.path,
					label: resolveLabel(item.label, tGlobalRef.current),
					isExternal
				});
			});
		}

		// Combine default and custom items
		return [...defaultItems, ...customItems];
	}, [
		config.custom_header,
		user?.id,
		features.favorites,
		hasGlobalSurveys,
		categoriesEnabled,
		tagsEnabled,
		surveysEnabled,
		headerSettings.pricingEnabled,
		headerSettings.submitEnabled,
		headerSettings.mapEnabled,
		locationSettings.enabled,
		hasCategories,
		hasCollections,
		hasComparisons,
		hasPosts,
		hasTags
	]);

	const isActiveLink = useCallback(
		(href: string): boolean => {
			const cleanedPathname = pathname.split('?')[0];
			const cleanedHref = href.split('?')[0];
			if (cleanedHref === '/') {
				return cleanedPathname === '/' || cleanedPathname === '';
			}
			if (cleanedHref === '#') return false;
			return cleanedPathname === cleanedHref || cleanedPathname.startsWith(`${cleanedHref}/`);
		},
		[pathname]
	);

	const getLinkClasses = useCallback(
		(href: string): string => {
			const isActive = isActiveLink(href);
			const baseClasses = STYLES.linkBase;

			return isActive ? `${baseClasses} ${STYLES.linkActive}` : `${baseClasses} ${STYLES.linkInactive}`;
		},
		[isActiveLink]
	);

	const renderBrand = useCallback(
		() => (
			<NavbarBrand>
				<SiteLogo size="sm" showText={true} />
			</NavbarBrand>
		),
		[]
	);

	const renderNavigationItem = useCallback(
		(item: NavigationItem) => {
			const linkClasses = item.isExternal
				? STYLES.linkBase + ' ' + STYLES.linkInactive
				: getLinkClasses(item.href);

			if (item.isExternal) {
				return (
					<NavbarItem key={item.key}>
						<a href={item.href} target="_blank" rel="noopener noreferrer" className={linkClasses}>
							{item.label}
						</a>
					</NavbarItem>
				);
			}

			return (
				<NavbarItem key={item.key}>
					<Link
						className={linkClasses}
						href={item.href}
						{...(isActiveLink(item.href) && { 'aria-current': 'page' })}
					>
						{item.label}
					</Link>
				</NavbarItem>
			);
		},
		[getLinkClasses, isActiveLink]
	);

	const renderNavigationItems = useCallback(
		() => (
			<>
				{navigationItems.map(renderNavigationItem)}
				{headerSettings.moreEnabled && (
					<NavbarItem key="more">
						<MoreMenu />
					</NavbarItem>
				)}
			</>
		),
		[navigationItems, renderNavigationItem, headerSettings.moreEnabled]
	);

	const renderRightSection = useCallback(
		() => (
			<NavbarContent justify="end" className={STYLES.rightSection}>
				{headerSettings.settingsEnabled && (
					<NavbarItem className={STYLES.largeUp}>
						<SettingsButton />
					</NavbarItem>
				)}
				<NavbarItem className={STYLES.largeUp}>
					<NavigationControls />
				</NavbarItem>
				<NavbarItem className={STYLES.largeUp}>
					<NotificationBell />
				</NavbarItem>
				<NavbarItem>
					<div className="scale-90 sm:scale-95 md:scale-100 lg:scale-105 xl:scale-110 transition-transform duration-200">
						<ProfileButton />
					</div>
				</NavbarItem>
			</NavbarContent>
		),
		[headerSettings.settingsEnabled]
	);

	const _containerWidth = useContainerWidth();

	return (
		<Navbar maxWidth="full" className={STYLES.navbar} disableAnimation isBordered>
			<Container maxWidth="7xl" padding="default" useGlobalWidth className={STYLES.container}>
				{/* Mobile: Toggle (Left) */}
				<NavbarContent className="lg:hidden" justify="start">
					<NavbarMenuToggle />
				</NavbarContent>

				{/* Mobile: Brand (Center) */}
				<NavbarContent className="lg:hidden pr-3" justify="center">
					{renderBrand()}
				</NavbarContent>

				{/* Desktop: Three-column flex layout */}
				<div className="hidden lg:flex w-full flex-row items-center justify-between">
					{/* Left: Logo (Brand) */}
					<div className="shrink-0 flex items-center min-w-0">{renderBrand()}</div>

					{/* Center: Navigation Links with gap */}
					<div className="flex flex-1 justify-start min-w-0 gap-6 pl-16">
						{isNavigationLoading ? <HeaderNavSkeleton /> : renderNavigationItems()}
					</div>

					{/* Right: Profile, Settings, etc. */}
					<div className="shrink-0 flex items-center min-w-0 justify-end">{renderRightSection()}</div>
				</div>

				{/* Mobile: Right Section */}
				<NavbarContent className="lg:hidden" justify="end">
					<NavbarItem>
						<NotificationBell />
					</NavbarItem>
					<NavbarItem>
						<div className="scale-90 transition-transform duration-200">
							<ProfileButton />
						</div>
					</NavbarItem>
				</NavbarContent>
			</Container>

			<NavbarMenu>
				<div className={STYLES.mobileMenu}>
					{navigationItems.map((item) => {
						const linkClasses = item.isExternal
							? `${STYLES.linkBase} ${STYLES.linkInactive} ${STYLES.mobileLink}`
							: `${getLinkClasses(item.href)} ${STYLES.mobileLink}`;

						if (item.isExternal) {
							return (
								<NavbarMenuItem key={item.key} className={STYLES.mobileMenuItem}>
									<a
										href={item.href}
										target="_blank"
										rel="noopener noreferrer"
										className={linkClasses}
										onClick={() => setIsMenuOpen(false)}
									>
										{item.label}
									</a>
								</NavbarMenuItem>
							);
						}

						return (
							<NavbarMenuItem key={item.key} className={STYLES.mobileMenuItem}>
								<Link
									className={linkClasses}
									href={item.href}
									onClick={() => setIsMenuOpen(false)}
									{...(isActiveLink(item.href) && { 'aria-current': 'page' })}
								>
									{item.label}
								</Link>
							</NavbarMenuItem>
						);
					})}

					{headerSettings.moreEnabled && (
						<NavbarMenuItem className={STYLES.mobileMenuItem}>
							<MoreMenu inline onItemClick={() => setIsMenuOpen(false)} />
						</NavbarMenuItem>
					)}

					{headerSettings.settingsEnabled && (
						<NavbarMenuItem className={STYLES.mobileMenuItem}>
							<SettingsButton />
						</NavbarMenuItem>
					)}

					<div className={STYLES.mobileControls}>
						{headerSettings.layoutEnabled && isDemo && (
							<div className="py-2 flex justify-center">
								<div className="scale-90 sm:scale-95 md:scale-100 transition-transform duration-200">
									<LayoutSwitcher inline />
								</div>
							</div>
						)}

						<div className={`py-2 flex justify-center ${STYLES.mobileOnly}`}>
							<div className="scale-90 sm:scale-95 md:scale-100 transition-transform duration-200">
								<NavigationControls />
							</div>
						</div>
					</div>
				</div>
			</NavbarMenu>
		</Navbar>
	);
}

export const ChevronDown = ({ fill = 'currentColor', size, height, width, className, ...props }: ChevronProps) => {
	const iconSize = size || 24;

	return (
		<svg
			fill="none"
			height={height || iconSize}
			viewBox="0 0 24 24"
			width={width || iconSize}
			xmlns="http://www.w3.org/2000/svg"
			className={className}
			{...props}
		>
			<path
				d="m19.92 8.95-6.52 6.52c-.77.77-2.03.77-2.8 0L4.08 8.95"
				stroke={fill}
				strokeLinecap="round"
				strokeLinejoin="round"
				strokeMiterlimit={10}
				strokeWidth={1.5}
			/>
		</svg>
	);
};
