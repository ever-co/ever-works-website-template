'use client';
import { useConfig } from '@/app/[locale]/config';
import { useTranslations } from 'next-intl';
import { Newsletter } from './news-letter';
import { BrandLink } from './brand-link';
import { SocialLinks } from './social-link-item';
import { footerNavigation, categoryLabels, resolveSocialLinks } from './social-links';
import { FooterLinkGroup } from './footer-link-group';
import { FooterBottom } from './footer-bottom';
import { Container } from '../ui/container';
import { useCategoriesEnabled } from '@/hooks/use-categories-enabled';
import { useTagsEnabled } from '@/hooks/use-tags-enabled';
import { useCategoriesExists } from '@/hooks/use-categories-exists';
import { useCollectionsExists } from '@/hooks/use-collections-exists';
import { useComparisonsExists } from '@/hooks/use-comparisons-exists';
import { useBlogExists } from '@/hooks/use-blog-exists';
import { useTagsExists } from '@/hooks/use-tags-exists';
import { useFooterSettings } from '@/hooks/use-footer-settings';

export function Footer() {
	const t = useTranslations();
	const config = useConfig();
	const { categoriesEnabled } = useCategoriesEnabled();
	const { tagsEnabled } = useTagsEnabled();
	const { data: categoriesData } = useCategoriesExists();
	const { data: collectionsData } = useCollectionsExists();
	const { data: comparisonsData } = useComparisonsExists();
	const { data: blogData } = useBlogExists();
	const { data: tagsData } = useTagsExists();
	const { settings: footerSettings } = useFooterSettings();

	// Extract existence flags from React Query data
	const hasCategories = categoriesData?.exists ?? false;
	const hasCollections = collectionsData?.exists ?? false;
	const hasComparisons = comparisonsData?.exists ?? false;
	const hasPosts = blogData?.exists ?? false;
	const hasTags = tagsData?.exists ?? false;

	return (
		<footer className="relative w-full overflow-hidden">
			<div className="relative z-10">
				{/* Main footer content with glassmorphism */}
				<div className="backdrop-blur-xl bg-white/50 dark:bg-white/[0.02] border-t border-gray-200/50 dark:border-white/6">
					<Container
						maxWidth="7xl"
						padding="default"
						useGlobalWidth
						className="px-4 sm:px-6 lg:px-8 pt-20 pb-12"
					>
						<div className="grid grid-cols-1 lg:grid-cols-5 gap-8 lg:gap-12">
							{/* Enhanced Brand and social section */}
							<div className="lg:col-span-2 space-y-8">
								<BrandLink t={t} />
								<SocialLinks t={t} socialLinks={resolveSocialLinks(hasPosts)} />
								{footerSettings.subscribeEnabled && <Newsletter t={t} />}
							</div>

							{/* Enhanced Navigation links section */}
							<div className="lg:col-span-3 grid grid-cols-2 md:grid-cols-4 gap-6 md:gap-8">
								{Object.entries(
									footerNavigation(t as (key: string) => string, {
										categoriesEnabled,
										tagsEnabled,
										hasCategories,
										hasTags,
										hasCollections,
										hasComparisons,
										hasPosts,
										customFooterItems: config.custom_footer || []
									})
								).map(([category, links]) => (
									<FooterLinkGroup
										key={category}
										links={links}
										categoryLabel={
											categoryLabels(t as (key: string) => string)[
												category as keyof typeof categoryLabels
											]
										}
									/>
								))}
							</div>
						</div>
					</Container>
				</div>
				<FooterBottom config={config} t={t} footerSettings={footerSettings} />
			</div>
		</footer>
	);
}
