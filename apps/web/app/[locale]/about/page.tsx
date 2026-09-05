export const revalidate = 3600;

import { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import Link from 'next/link';
import { PageContainer } from '@/components/ui/container';
import { MDX } from '@/components/mdx';
import { getCachedPageContent } from '@/lib/content';
import { resolveStaticPageBody } from '@/lib/default-page-content';
import { getBaseUrl } from '@/lib/utils/url-cleaner';
import { generateHreflangAlternates, getLocalizedUrl } from '@/lib/seo/hreflang';
import { Locale, DEFAULT_LOCALE } from '@/lib/constants';
import { BreadcrumbJsonLd } from '@/components/seo/breadcrumb-json-ld';

import { getSiteName } from '@/lib/seo/site-identity';
interface PageProps {
  params: Promise<{ locale: string }>;
}

const appUrl = getBaseUrl();

// Default about page content when no MDX file exists in .content/pages/
const DEFAULT_ABOUT_CONTENT = `No content yet. Add an \`about.en.md\` file to your content repository's \`pages/\` directory to customize this page.`;

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { locale } = await params;
  const tFooter = await getTranslations({ locale, namespace: 'footer' });
  const tPages = await getTranslations({ locale, namespace: 'pages' });

  // Include the site name so the rendered <title> clears the SEO 10-char
  // floor enforced by `each-page-document-title-length.spec.ts` even when
  // the translated label (e.g. "About Us") is short.
  return {
    metadataBase: new URL(appUrl),
    title: `${tFooter('ABOUT_US')} | ${await getSiteName()}`,
    description: tPages('ABOUT_PAGE_META_DESCRIPTION'),
    alternates: {
      canonical: getLocalizedUrl('/about', locale as Locale),
      languages: generateHreflangAlternates('/about'),
      types: { 'text/markdown': `${appUrl}${getLocalizedUrl('/about', locale as Locale)}.md` }
    }
  };
}

export default async function AboutPage({ params }: PageProps) {
  const { locale } = await params;
  const pageData = await getCachedPageContent('about', locale);

  // Use default content if no MDX file exists
  // Same emptiness rule as this page's `/about.md` mirror
  // (`lib/seo/markdown-mirror.ts#renderStaticPageMarkdown`), which calls the
  // same helper. A body of nothing but blank lines is truthy, so a bare `||`
  // left this page blank while the alternate it advertises to crawlers served
  // the built-in default.
  const content = resolveStaticPageBody(pageData?.content, DEFAULT_ABOUT_CONTENT);
  const metadata = pageData?.metadata || {};
  const tCommon = await getTranslations({ locale, namespace: 'common' });
  const tFooter = await getTranslations({ locale, namespace: 'footer' });
  const tPages = await getTranslations({ locale, namespace: 'pages' });

  const title = (metadata.title as string) || tFooter('ABOUT_US');
  const lastUpdated = metadata.lastUpdated as string | undefined;

  const localePrefix = locale === DEFAULT_LOCALE ? '' : `/${locale}`;

  return (
    <div className="min-h-screen bg-white dark:bg-[#0a0a0a]">
      <BreadcrumbJsonLd
        items={[
          { name: tCommon('HOME'), url: `${localePrefix || '/'}` },
          { name: title }
        ]}
      />

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
            <span className="w-2 h-2 bg-neutral-400 rounded-full"></span>
            {tFooter('ABOUT_US')}
          </div>

          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-neutral-900 dark:text-white mb-4 leading-tight">
            {title}
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
            <div className="prose prose-slate dark:prose-invert max-w-none prose-headings:text-slate-900 dark:prose-headings:text-white prose-headings:font-bold prose-h2:text-3xl prose-h2:mt-12 prose-h2:mb-6 prose-h3:text-xl prose-h3:mt-8 prose-h3:mb-4 prose-p:text-slate-700 dark:prose-p:text-slate-300 prose-p:leading-relaxed prose-p:text-base prose-a:text-theme-primary-600 dark:prose-a:text-theme-primary-400 prose-a:font-medium prose-a:no-underline prose-a:hover:underline prose-strong:text-slate-900 dark:prose-strong:text-white prose-strong:font-semibold prose-ul:text-slate-700 dark:prose-ul:text-slate-300 prose-ol:text-slate-700 dark:prose-ol:text-slate-300 prose-li:my-2 prose-code:text-theme-primary-600 dark:prose-code:text-theme-primary-400 prose-code:bg-slate-100 dark:prose-code:bg-slate-800 prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded-sm prose-code:font-mono prose-code:text-sm">
              <MDX source={content} />
            </div>
          </div>
        </div>

        {/* Related Links Section */}
        <div className="bg-neutral-50 dark:bg-white/3 rounded-2xl border border-slate-200 dark:border-white/6 p-8 animate-fade-in">
          <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-6">
            {tPages('RELATED_INFORMATION')}
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Link
              href={`/${locale}/privacy-policy`}
              className="group flex items-center gap-4 p-6 bg-white/80 dark:bg-white/3 backdrop-blur-xs rounded-xl border border-slate-200 dark:border-white/6 hover:border-neutral-300 dark:hover:border-white/15 transition-all duration-300 hover:shadow-sm"
            >
              <div className="w-12 h-12 bg-neutral-900 dark:bg-white/10 rounded-lg flex items-center justify-center text-white dark:text-neutral-400 text-xl">
                🔒
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-slate-900 dark:text-white mb-1 group-hover:text-theme-primary-600 dark:group-hover:text-theme-primary-400 transition-colors">
                  {tFooter('PRIVACY_POLICY')}
                </h3>
                <p className="text-sm text-slate-600 dark:text-slate-400">
                  {tPages('PRIVACY_POLICY_DESCRIPTION')}
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
              href={`/${locale}/terms-of-service`}
              className="group flex items-center gap-4 p-6 bg-white/80 dark:bg-white/3 backdrop-blur-xs rounded-xl border border-slate-200 dark:border-white/6 hover:border-neutral-300 dark:hover:border-white/15 transition-all duration-300 hover:shadow-sm"
            >
              <div className="w-12 h-12 bg-neutral-900 dark:bg-white/10 rounded-lg flex items-center justify-center text-white dark:text-neutral-400 text-xl">
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
          </div>
        </div>
      </PageContainer>
    </div>
  );
}
