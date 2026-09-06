'use client';

import React, { useState } from 'react';
import { useTranslations } from 'next-intl';
import { AlertTriangle, Info, KeyRound, Loader2 } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { useDisableTwoFactor, useEnableTwoFactor, useSecuritySettings } from '@/hooks/use-security-settings';

/**
 * "Two-Factor Authentication" section of `/client/settings/security`
 * (EW-136, with the OAuth gate from EW-142).
 *
 * Shows the current status and a switch that turns email 2FA on or off.
 * For accounts that signed up through an OAuth provider the switch is
 * disabled and an explanatory notice is shown — matching the amber
 * no-password notice pattern already used by the connected-accounts
 * card. The same restriction is enforced by
 * `POST /api/auth/security/2fa/enable`, so the disabled control is a
 * courtesy, not the security boundary.
 *
 * Layout mirrors `security-notifications-card.tsx` (rounded card, 6/5
 * padding, divided header) so the security page reads as one system, and
 * it reflows to a stacked layout under `sm` for narrow screens.
 */
export function TwoFactorCard() {
	const t = useTranslations('settings.SECURITY_PAGE.TWO_FACTOR');
	const { data: settings, isLoading, error } = useSecuritySettings();
	const { mutate: enable, isPending: enabling } = useEnableTwoFactor();
	const { mutate: disable, isPending: disabling } = useDisableTwoFactor();
	const [actionError, setActionError] = useState<string | null>(null);

	if (isLoading) {
		return (
			<div className="bg-white dark:bg-white/3 border border-neutral-200 dark:border-white/8 rounded-xl shadow-sm animate-pulse">
				<div className="px-6 py-5 space-y-2">
					<Skeleton className="h-3 w-44 bg-neutral-200 dark:bg-white/10" />
					<Skeleton className="h-3 w-64 bg-neutral-200 dark:bg-white/10" />
				</div>
			</div>
		);
	}

	if (error || !settings) {
		return (
			<div className="flex items-start gap-3 rounded-xl border border-red-200 dark:border-red-800/50 bg-red-50 dark:bg-red-900/10 px-5 py-4 shadow-sm">
				<AlertTriangle className="w-4 h-4 mt-0.5 text-red-500 shrink-0" aria-hidden="true" />
				<p className="text-xs font-semibold text-red-700 dark:text-red-300">{t('LOAD_ERROR')}</p>
			</div>
		);
	}

	const enabled = !!settings.twoFactorEnabled;
	// Absent on older deployments → treat as "not allowed" rather than
	// offering a control the backend would refuse.
	const canEnable = settings.canEnableTwoFactor ?? false;
	const pending = enabling || disabling;
	// Turning 2FA OFF is always allowed for the account that owns it; only
	// turning it ON is gated on having a password (EW-142).
	const switchDisabled = pending || (!enabled && !canEnable);

	const handleToggle = () => {
		if (switchDisabled) return;
		setActionError(null);
		const onError = (err: unknown) => setActionError(err instanceof Error ? err.message : t('ERROR'));
		if (enabled) {
			disable(undefined, { onError });
		} else {
			enable(undefined, { onError });
		}
	};

	return (
		<div
			className="bg-white dark:bg-white/3 border border-neutral-200 dark:border-white/8 rounded-xl shadow-sm divide-y divide-neutral-100 dark:divide-white/6"
			data-testid="two-factor-card"
		>
			{/* Header */}
			<div className="px-6 py-5">
				<p className="text-xs font-semibold text-neutral-500 dark:text-neutral-400 uppercase tracking-wide">
					{t('TITLE')}
				</p>
				<p className="text-xs text-neutral-400 dark:text-neutral-500 mt-0.5">{t('DESCRIPTION')}</p>
			</div>

			{/* Status + toggle */}
			<div className="px-6 py-4 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
				<div className="flex items-center gap-3 min-w-0">
					<div
						className={cn(
							'w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ring-1',
							enabled
								? 'bg-emerald-50 dark:bg-emerald-900/20 ring-emerald-200 dark:ring-emerald-800/40'
								: 'bg-neutral-100 dark:bg-white/6 ring-neutral-200 dark:ring-white/6'
						)}
						aria-hidden="true"
					>
						<KeyRound
							className={cn(
								'w-4 h-4',
								enabled ? 'text-emerald-600 dark:text-emerald-400' : 'text-neutral-400'
							)}
						/>
					</div>
					<div className="min-w-0">
						<p className="text-xs font-medium text-neutral-700 dark:text-neutral-300">
							{t('EMAIL_METHOD')}
						</p>
						<p
							className={cn(
								'text-[11px] mt-0.5',
								enabled
									? 'text-emerald-600 dark:text-emerald-400'
									: 'text-neutral-400 dark:text-neutral-500'
							)}
							data-testid="two-factor-status"
						>
							{enabled ? t('ENABLED') : t('DISABLED')}
						</p>
					</div>
				</div>

				<div className="flex items-center gap-3 shrink-0">
					{pending && <Loader2 className="w-3.5 h-3.5 animate-spin text-neutral-400" aria-hidden="true" />}
					<button
						type="button"
						role="switch"
						aria-checked={enabled}
						aria-label={t('TOGGLE_LABEL')}
						disabled={switchDisabled}
						onClick={handleToggle}
						data-testid="two-factor-toggle"
						className={cn(
							'relative inline-flex h-5 w-9 items-center rounded-full transition-colors duration-200 shrink-0',
							'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-theme-primary-500',
							'disabled:opacity-50 disabled:cursor-not-allowed',
							enabled ? 'bg-emerald-500 dark:bg-emerald-500' : 'bg-neutral-200 dark:bg-white/15'
						)}
					>
						<span
							className={cn(
								'inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform duration-200',
								enabled ? 'translate-x-4' : 'translate-x-0.5'
							)}
						/>
					</button>
				</div>
			</div>

			{/* EW-142: OAuth sign-ups cannot enable email 2FA. Shown only when the
			    account really is OAuth-only — `canEnableTwoFactor` is also false
			    for an unknown auth method or an older deployment that does not
			    send the field, and telling those users they "signed up with
			    OAuth" would simply be wrong. They still get a disabled switch. */}
			{!canEnable && !enabled && settings.authMethod === 'oauth' && (
				<div
					className="px-6 py-3 flex items-start gap-2 text-xs text-amber-600 dark:text-amber-400 bg-amber-50/50 dark:bg-amber-900/10 rounded-b-xl"
					data-testid="two-factor-oauth-notice"
				>
					<AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-0.5" aria-hidden="true" />
					<span>{t('OAUTH_BLOCKED')}</span>
				</div>
			)}

			{/* How it works, once the factor is on. */}
			{enabled && (
				<div className="px-6 py-3 flex items-start gap-2 text-xs text-neutral-500 dark:text-neutral-400">
					<Info className="w-3.5 h-3.5 shrink-0 mt-0.5" aria-hidden="true" />
					<span>{t('ENABLED_HINT')}</span>
				</div>
			)}

			{actionError && (
				<div className="px-6 py-3 flex items-start gap-2 text-xs text-red-600 dark:text-red-400" role="alert">
					<AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-0.5" aria-hidden="true" />
					<span data-testid="two-factor-error">{actionError}</span>
				</div>
			)}
		</div>
	);
}
