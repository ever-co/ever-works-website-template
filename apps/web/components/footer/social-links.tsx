import { FiBookOpen, FiFacebook, FiLinkedin, FiMail } from 'react-icons/fi';
import { IconGithub, IconX } from '../icons/Icons';
import { siteConfig } from '@/lib/config/client';
import { isExternalUrl, resolveLabel } from '@/lib/utils/custom-navigation';
import type { CustomNavigationItem } from '@/lib/content';

export const socialLinks = [
	{
		icon: IconGithub,
		href: siteConfig.social.github,
		label: 'GitHub',
		target: '_blank',
		rel: 'noopener noreferrer',
		isExternal: true
	},
	{
		icon: IconX,
		href: siteConfig.social.x,
		label: 'X',
		target: '_blank',
		rel: 'noopener noreferrer',
		isExternal: true
	},
	{
		icon: FiLinkedin,
		href: siteConfig.social.linkedin,
		label: 'LinkedIn',
		target: '_blank',
		rel: 'noopener noreferrer',
		isExternal: true
	},
	{
		icon: FiFacebook,
		href: siteConfig.social.facebook,
		label: 'Facebook',
		target: '_blank',
		rel: 'noopener noreferrer',
		isExternal: true
	},
	{
		icon: FiBookOpen,
		href: siteConfig.social.blog,
		label: 'Blog',
		target: '_blank',
		rel: 'noopener noreferrer',
		isExternal: true
	},
	{
		icon: FiMail,
		href: `mailto:${siteConfig.social.email}`,
		label: 'Email',
		isMailto: true
	}
].filter((link) => link.href && link.href !== '');

export interface FooterNavigationOptions {
	categoriesEnabled?: boolean;
	tagsEnabled?: boolean;
	hasCategories?: boolean;
	hasTags?: boolean;
	hasCollections?: boolean;
	hasComparisons?: boolean;
	customFooterItems?: CustomNavigationItem[];
}

export function footerNavigation(t: (key: string) => string, options: FooterNavigationOptions = {}) {
	const {
		categoriesEnabled = true,
		tagsEnabled = true,
		hasCategories = true,
		hasTags = true,
		hasCollections = true,
		hasComparisons = true,
		customFooterItems = []
	} = options;

	const productLinks = [
		{ label: t('common.COLLECTION'), href: '/collections' },
		{ label: t('common.COMPARISONS'), href: '/comparisons' },
		{ label: t('common.CATEGORY'), href: '/categories' },
		{ label: t('common.TAG'), href: '/tags' },
		{ label: t('common.PRICING'), href: '/pricing' },
		{ label: t('footer.HELP'), href: '/help' },
		{ label: t('footer.FAQ'), href: '/faq' }
	];

	const filteredProductLinks = productLinks.filter((link) => {
		// Hide collections link if no collections exist
		if (link.href === '/collections' && !hasCollections) return false;
		if (link.href === '/comparisons' && !hasComparisons) return false;
		// Hide categories link when categories are disabled or no categories exist
		if (link.href === '/categories' && (!categoriesEnabled || !hasCategories)) return false;
		// Hide tags link when tags are disabled or no tags exist
		if (link.href === '/tags' && (!tagsEnabled || !hasTags)) return false;
		return true;
	});

	// Process custom footer items
	const customLinks = customFooterItems
		.filter((item): item is CustomNavigationItem => {
			// Validate item structure
			if (!item || typeof item !== 'object' || !item.label || !item.path) {
				console.warn('Invalid custom_footer item:', item);
				return false;
			}
			return true;
		})
		.map((item) => {
			const isExternal = isExternalUrl(item.path);
			return {
				label: resolveLabel(item.label, t),
				href: item.path,
				...(isExternal && {
					target: '_blank',
					rel: 'noopener noreferrer',
					isExternal: true
				})
			};
		});

	const footerNav = {
		product: filteredProductLinks,
		clients: [
			{ label: t('auth.SIGN_IN'), href: '/auth/signin' },
			{ label: t('footer.REGISTER'), href: '/auth/register' },
			{ label: t('auth.FORGOT_PASSWORD'), href: '/auth/forgot-password' }
		],
		company: [
			{ label: t('footer.ABOUT_US'), href: '/about' },
			{ label: t('footer.ADMIN'), href: '/admin' },
			{
				label: t('footer.SITEMAP'),
				href: '/sitemap.xml',
				target: '_blank',
				rel: 'noopener noreferrer',
				isExternal: true
			}
		],
		resources: [
			{
				label: t('footer.BLOG'),
				href: siteConfig.social.blog,
				target: '_blank',
				rel: 'noopener noreferrer',
				isExternal: true
			},
			{ label: t('common.SUBMIT'), href: '/submit?step=details&plan=free' },
			{ label: t('help.DOCS_PAGE_TITLE'), href: '/docs' }
		] as Array<{
			label: string;
			href: string;
			target?: string;
			rel?: string;
			isExternal?: boolean;
		}>
	};

	// Add custom links to resources section if they exist
	if (customLinks.length > 0) {
		footerNav.resources = [...footerNav.resources, ...customLinks];
	}

	return footerNav;
}

export function categoryLabels(t: (key: string) => string) {
	return {
		product: t('footer.PRODUCT'),
		clients: t('footer.CLIENTS'),
		company: t('footer.COMPANY'),
		resources: t('footer.RESOURCES')
	};
}
