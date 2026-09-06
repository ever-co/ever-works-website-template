import { Container } from '@/components/ui/container';
import { FiArrowLeft } from 'react-icons/fi';
import { ShieldCheck, Shield } from 'lucide-react';
import { Link } from '@/i18n/navigation';
import { getTranslations } from 'next-intl/server';
import { ChangePasswordForm } from '@/components/settings/security';
import { SecurityOverview } from '@/components/settings/security/security-overview';
import { ActiveSessionsCard } from '@/components/settings/security/active-sessions-card';
import { LoginHistoryCard } from '@/components/settings/security/login-history-card';
import { ConnectedAccountsCard } from '@/components/settings/security/connected-accounts-card';
import { SecurityNotificationsCard } from '@/components/settings/security/security-notifications-card';
import { TwoFactorCard } from '@/components/settings/security/two-factor-card';

export default async function SecuritySettingsPage() {
	const t = await getTranslations('settings.SECURITY_PAGE');

	return (
		<div className="min-h-screen bg-neutral-50 dark:bg-[#0a0a0a]">
			<Container maxWidth="7xl" padding="default" useGlobalWidth>
				<div className="py-10 max-w-3xl mx-auto space-y-8">

					{/* Back link */}
					<Link
						href="/client/settings"
						className="inline-flex items-center gap-1.5 text-xs text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 transition-colors duration-150"
					>
						<FiArrowLeft className="w-3.5 h-3.5" aria-hidden="true" />
						{t('BACK_TO_SETTINGS')}
					</Link>

					{/* Page header */}
					<header className="space-y-3">
						<div className="flex items-center gap-2.5">
							<div
								className="w-8 h-8 rounded-lg bg-gray-100 dark:bg-white/6 flex items-center justify-center ring-1 ring-inset ring-gray-200/60 dark:ring-white/6"
								aria-hidden="true"
							>
								<ShieldCheck className="w-4 h-4 text-gray-500 dark:text-gray-400" />
							</div>
							<h1 className="text-lg font-semibold text-gray-900 dark:text-gray-100 tracking-tight">
								{t('CHANGE_PASSWORD.TITLE')}
							</h1>
						</div>
						<p className="text-sm text-gray-500 dark:text-gray-400 leading-relaxed max-w-prose">
							{t('CHANGE_PASSWORD.DESCRIPTION')}
						</p>
					</header>

					{/* Security overview */}
					<SecurityOverview />

					{/* Two-factor authentication (spec 053) */}
					<TwoFactorCard />

					{/* Change password form */}
					<ChangePasswordForm />

					{/* Active sessions */}
					<ActiveSessionsCard />

					{/* Login history */}
					<LoginHistoryCard />

					{/* Connected OAuth accounts */}
					<ConnectedAccountsCard />

					{/* Security notification toggles */}
					<SecurityNotificationsCard />

					{/* Security tips */}
					<aside
						role="note"
						className="flex items-start gap-3 rounded-xl border border-gray-200 dark:border-white/8 bg-white dark:bg-[#111111] px-5 py-4 shadow-sm"
					>
						<Shield className="w-4 h-4 mt-0.5 text-gray-400 dark:text-gray-500 shrink-0" aria-hidden="true" />
						<div>
							<p className="text-xs font-semibold text-gray-700 dark:text-gray-200">
								{t('SECURITY_TIPS.TITLE')}
							</p>
							<ul className="mt-2 space-y-1.5">
								{([1, 2, 3, 4] as const).map((n) => (
									<li key={n} className="flex items-start gap-2 text-xs text-gray-500 dark:text-gray-400">
										<span className="w-1 h-1 rounded-full bg-gray-300 dark:bg-gray-600 mt-1.5 shrink-0" />
										{t(`SECURITY_TIPS.TIP_${n}`)}
									</li>
								))}
							</ul>
						</div>
					</aside>

				</div>
			</Container>
		</div>
	);
}
