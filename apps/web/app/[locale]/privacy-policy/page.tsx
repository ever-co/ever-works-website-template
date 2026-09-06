export const revalidate = 3600;

import { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import Link from 'next/link';
import { PageContainer } from '@/components/ui/container';
import { MDX } from '@/components/mdx';
import { getCachedPageContent } from '@/lib/content';
import { buildStaticPageMetadata } from '@/lib/seo/static-page-metadata';
import { frontmatterString } from '@/lib/seo/frontmatter';
import { DEFAULT_LOCALE } from '@/lib/constants';
import { BreadcrumbJsonLd } from '@/components/seo/breadcrumb-json-ld';

interface PageProps {
  params: Promise<{ locale: string }>;
}

// Default privacy policy content when no MDX file exists in .content/pages/
const DEFAULT_PRIVACY_POLICY_CONTENT = `No content yet. Add a \`privacy-policy.en.md\` file to your content repository's \`pages/\` directory to customize this page.`;

/**
 * SEO metadata comes from the Markdown frontmatter (`title` / `description` in
 * `pages/privacy-policy.<locale>.md`) so a directory that customised its
 * privacy copy also gets its own SERP snippet. The i18n strings stay as the
 * fallback for Works whose data repository has no `pages/` content.
 */
export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { locale } = await params;
  const tFooter = await getTranslations({ locale, namespace: 'footer' });
  const tPages = await getTranslations({ locale, namespace: 'pages' });

  return buildStaticPageMetadata({
    slug: 'privacy-policy',
    path: '/privacy-policy',
    locale,
    fallbackTitle: tFooter('PRIVACY_POLICY'),
    fallbackDescription: tPages('PRIVACY_POLICY_META_DESCRIPTION')
  });
}

export default async function PrivacyPolicyPage({ params }: PageProps) {
  const { locale } = await params;
  const pageData = await getCachedPageContent('privacy-policy', locale);

  // Use default content if no MDX file exists
  const content = pageData?.content || DEFAULT_PRIVACY_POLICY_CONTENT;
  const metadata = pageData?.metadata || {};
  const tCommon = await getTranslations({ locale, namespace: 'common' });
  const tFooter = await getTranslations({ locale, namespace: 'footer' });
  const tPages = await getTranslations({ locale, namespace: 'pages' });

  // Same non-empty-string rule as `generateMetadata`: frontmatter is
  // author-supplied YAML, so `title:` can parse to a number or a mapping.
  // A bare cast would hand React a non-string child and crash the route.
  const title = frontmatterString(metadata, 'title') ?? tFooter('PRIVACY_POLICY');
  const lastUpdated = frontmatterString(metadata, 'lastUpdated');
  const localePrefix = locale === DEFAULT_LOCALE ? '' : `/${locale}`;

  return (
    <div className="min-h-screen bg-linear-to-br from-slate-50 via-white to-slate-100 dark:from-[#0a0a0a] dark:via-[#0a0a0a] dark:to-[#0a0a0a] overflow-hidden">
      <BreadcrumbJsonLd
        items={[
          { name: tCommon('HOME'), url: `${localePrefix || '/'}` },
          { name: title }
        ]}
      />
      {/* Animated Floating Blobs */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-20 left-10 w-72 h-72 bg-blue-500/10 rounded-full blur-3xl animate-float"></div>
        <div className="absolute top-40 right-20 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl animate-float-delayed"></div>
        <div className="absolute bottom-20 left-1/3 w-80 h-80 bg-cyan-500/10 rounded-full blur-3xl animate-float-slow"></div>
      </div>

      <PageContainer className="relative z-10 max-w-7xl mx-auto px-4 py-12">
        {/* Breadcrumbs */}
        <nav className="flex mb-8 animate-fade-in" aria-label="Breadcrumb">
          <ol className="inline-flex items-center space-x-2">
            <li className="inline-flex items-center">
              <Link
                href="/"
                className="inline-flex items-center text-sm font-medium text-slate-600 dark:text-slate-400 hover:text-theme-primary-600 dark:hover:text-theme-primary-400 transition-colors duration-300"
              >
                <svg
                  className="w-4 h-4 mr-2"
                  aria-hidden="true"
                  focusable="false"
                  xmlns="http://www.w3.org/2000/svg"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path d="m19.707 9.293-2-2-7-7a1 1 0 0 0-1.414 0l-7 7-2 2a1 1 0 0 0 1.414 1.414L2 10.414V18a2 2 0 0 0 2 2h3a1 1 0 0 0 1-1v-4a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1v4a1 1 0 0 0 1 1h3a2 2 0 0 0 2-2v-7.586l.293.293a1 1 0 0 0 1.414-1.414Z" />
                </svg>
                {tCommon('HOME')}
              </Link>
            </li>
            <li>
              <div className="flex items-center">
                <svg
                  className="w-4 h-4 text-slate-400 dark:text-slate-500 mx-1"
                  aria-hidden="true"
                  focusable="false"
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 6 10"
                >
                  <path
                    stroke="currentColor"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="m1 9 4-4-4-4"
                  />
                </svg>
                <span className="ml-1 text-sm font-medium text-slate-700 dark:text-slate-300">
                  {title}
                </span>
              </div>
            </li>
          </ol>
        </nav>

        {/* Hero Section */}
        <div className="mb-12 animate-fade-in">
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-white/80 dark:bg-white/3 backdrop-blur-xs border border-slate-200 dark:border-white/6 rounded-full text-sm font-medium text-slate-700 dark:text-slate-300 mb-6">
            <span className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></span>
            {tPages('LEGAL_BADGE')}
          </div>

          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-slate-900 dark:text-white mb-4 leading-tight">
            <span className="bg-linear-to-r from-theme-primary-600 via-theme-primary-500 to-theme-primary-400 dark:from-theme-primary-400 dark:via-theme-primary-500 dark:to-theme-primary-600 bg-clip-text text-transparent">
              {title}
            </span>
          </h1>

          {lastUpdated && (
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-slate-100 dark:bg-white/5 rounded-lg">
              <svg
                className="w-4 h-4 text-slate-600 dark:text-slate-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                xmlns="http://www.w3.org/2000/svg"
                aria-hidden="true"
                focusable="false"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
              <span className="text-sm font-medium text-slate-700 dark:text-slate-300">
                {tPages('LAST_UPDATED')} {lastUpdated}
              </span>
            </div>
          )}
        </div>

        {/* Main Content Card */}
        <div className="bg-white/90 dark:bg-white/3 backdrop-blur-xl rounded-2xl border border-slate-200 dark:border-white/6 shadow-2xl overflow-hidden mb-12 animate-fade-in">
          {/* Content */}
          <div className="px-6 sm:px-8 lg:px-12 py-8 lg:py-12">
            <div className="prose prose-slate dark:prose-invert max-w-none prose-headings:text-slate-900 dark:prose-headings:text-white prose-headings:font-bold prose-h2:text-3xl prose-h2:mt-12 prose-h2:mb-6 prose-h2:bg-linear-to-r prose-h2:from-theme-primary-600 prose-h2:to-theme-primary-500 dark:prose-h2:from-theme-primary-400 dark:prose-h2:to-theme-primary-500 prose-h2:bg-clip-text prose-h2:text-transparent prose-h3:text-xl prose-h3:mt-8 prose-h3:mb-4 prose-p:text-slate-700 dark:prose-p:text-slate-300 prose-p:leading-relaxed prose-p:text-base prose-a:text-theme-primary-600 dark:prose-a:text-theme-primary-400 prose-a:font-medium prose-a:no-underline prose-a:hover:underline prose-strong:text-slate-900 dark:prose-strong:text-white prose-strong:font-semibold prose-ul:text-slate-700 dark:prose-ul:text-slate-300 prose-ol:text-slate-700 dark:prose-ol:text-slate-300 prose-li:my-2 prose-code:text-theme-primary-600 dark:prose-code:text-theme-primary-400 prose-code:bg-slate-100 dark:prose-code:bg-slate-800 prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded-sm prose-code:font-mono prose-code:text-sm">
              <MDX source={content} />
            </div>
          </div>
        </div>

        {/* Related Links Section */}
        <div className="bg-linear-to-r from-slate-50 to-slate-100 dark:from-white/3 dark:to-white/4 backdrop-blur-xs rounded-2xl border border-slate-200 dark:border-white/6 p-8 animate-fade-in">
          <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-6">
            {tPages('RELATED_INFORMATION')}
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Link
              href={`/${locale}/terms-of-service`}
              className="group flex items-center gap-4 p-6 bg-white/80 dark:bg-white/3 backdrop-blur-xs rounded-xl border border-slate-200 dark:border-white/6 hover:border-theme-primary-500 dark:hover:border-theme-primary-500 transition-all duration-300 hover:shadow-lg hover:scale-105"
            >
              <div className="w-12 h-12 bg-linear-to-r from-green-500 to-emerald-500 rounded-lg flex items-center justify-center text-white text-xl shadow-lg group-hover:scale-110 transition-transform duration-300">
                📜
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-slate-900 dark:text-white mb-1 group-hover:text-theme-primary-600 dark:group-hover:text-theme-primary-400 transition-colors">
                  {tFooter('TERMS_OF_SERVICE')}
                </h3>
                <p className="text-sm text-slate-600 dark:text-slate-400">
                  {tPages('TERMS_OF_SERVICE_DESCRIPTION')}
                </p>
              </div>
              <svg
                className="w-5 h-5 text-slate-400 group-hover:text-theme-primary-600 dark:group-hover:text-theme-primary-400 group-hover:translate-x-1 transition-all duration-300"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                aria-hidden="true"
                focusable="false"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 5l7 7-7 7"
                />
              </svg>
            </Link>

            <Link
              href={`/${locale}/about`}
              className="group flex items-center gap-4 p-6 bg-white/80 dark:bg-white/3 backdrop-blur-xs rounded-xl border border-slate-200 dark:border-white/6 hover:border-theme-primary-500 dark:hover:border-theme-primary-500 transition-all duration-300 hover:shadow-lg hover:scale-105"
            >
              <div className="w-12 h-12 bg-linear-to-r from-orange-500 to-red-500 rounded-lg flex items-center justify-center text-white text-xl shadow-lg group-hover:scale-110 transition-transform duration-300">
                ℹ️
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-slate-900 dark:text-white mb-1 group-hover:text-theme-primary-600 dark:group-hover:text-theme-primary-400 transition-colors">
                  {tFooter('ABOUT_US')}
                </h3>
                <p className="text-sm text-slate-600 dark:text-slate-400">
                  {tPages('ABOUT_US_DESCRIPTION')}
                </p>
              </div>
              <svg
                className="w-5 h-5 text-slate-400 group-hover:text-theme-primary-600 dark:group-hover:text-theme-primary-400 group-hover:translate-x-1 transition-all duration-300"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                aria-hidden="true"
                focusable="false"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 5l7 7-7 7"
                />
              </svg>
            </Link>
          </div>
        </div>
      </PageContainer>
    </div>
  );
}
