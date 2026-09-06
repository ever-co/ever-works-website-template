'use client';

import { createContext, useContext, useMemo, PropsWithChildren } from 'react';
import type { HeaderSettings, FooterSettings, LocationConfigSettings } from '@/lib/content';
import {
	type LocationSettings,
	DEFAULT_LOCATION_SETTINGS,
	mapLocationConfigToRuntime
} from '@/lib/types/location';

const DEFAULT_HEADER_SETTINGS: HeaderSettings = {
	submitEnabled: true,
	pricingEnabled: true,
	layoutEnabled: true,
	languageEnabled: true,
	themeEnabled: true,
	moreEnabled: true,
	settingsEnabled: true,
	mapEnabled: false,
	layoutDefault: 'home1',
	paginationDefault: 'standard',
	themeDefault: 'light'
};

const DEFAULT_FOOTER_SETTINGS: FooterSettings = {
	subscribeEnabled: true,
	versionEnabled: true,
	themeSelectorEnabled: true
};

interface SettingsContextValue {
	// Feature enabled flags (from config)
	categoriesEnabled: boolean;
	tagsEnabled: boolean;
	companiesEnabled: boolean;
	surveysEnabled: boolean;
	// Data existence flags (from database/content)
	hasCategories: boolean;
	hasTags: boolean;
	hasCollections: boolean;
	hasComparisons: boolean;
	hasPosts: boolean;
	hasGlobalSurveys: boolean;
	// Header settings
	headerSettings: HeaderSettings;
	// Footer settings
	footerSettings: FooterSettings;
	// Location settings (camelCase runtime type)
	locationSettings: LocationSettings;
}

const SettingsContext = createContext<SettingsContextValue | null>(null);

interface SettingsProviderProps extends PropsWithChildren {
	categoriesEnabled: boolean;
	tagsEnabled: boolean;
	companiesEnabled: boolean;
	surveysEnabled: boolean;
	hasCategories: boolean;
	hasTags: boolean;
	hasCollections: boolean;
	hasComparisons: boolean;
	hasPosts: boolean;
	hasGlobalSurveys: boolean;
	headerSettings: HeaderSettings;
	footerSettings: FooterSettings;
	locationSettings?: LocationConfigSettings;
}

export function SettingsProvider({
	children,
	categoriesEnabled,
	tagsEnabled,
	companiesEnabled,
	surveysEnabled,
	hasCategories,
	hasTags,
	hasCollections,
	hasComparisons,
	hasPosts,
	hasGlobalSurveys,
	headerSettings,
	footerSettings,
	locationSettings: locationConfigSettings
}: SettingsProviderProps) {
	// Map snake_case config to camelCase runtime settings
	const locationSettings = useMemo(
		() => mapLocationConfigToRuntime(locationConfigSettings),
		[locationConfigSettings]
	);

	return (
		<SettingsContext.Provider
			value={{
				categoriesEnabled,
				tagsEnabled,
				companiesEnabled,
				surveysEnabled,
				hasCategories,
				hasTags,
				hasCollections,
				hasComparisons,
				hasPosts,
				hasGlobalSurveys,
				headerSettings,
				footerSettings,
				locationSettings
			}}
		>
			{children}
		</SettingsContext.Provider>
	);
}

export function useSettings(): SettingsContextValue {
	const context = useContext(SettingsContext);
	if (!context) {
		// Fallback for components rendered outside provider (backward compatibility)
		return {
			categoriesEnabled: true,
			tagsEnabled: true,
			companiesEnabled: true,
			surveysEnabled: true,
			hasCategories: true,
			hasTags: true,
			hasCollections: true,
			hasComparisons: true,
			// Fallback for components rendered outside the provider. Blog is
			// opt-in on content, so default it OFF here: showing a Blog link
			// on a site with no posts is worse than briefly hiding one.
			hasPosts: false,
			hasGlobalSurveys: false,
			headerSettings: DEFAULT_HEADER_SETTINGS,
			footerSettings: DEFAULT_FOOTER_SETTINGS,
			locationSettings: DEFAULT_LOCATION_SETTINGS
		};
	}
	return context;
}
