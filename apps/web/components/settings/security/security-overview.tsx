"use client";

import React from "react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useSecuritySettings, useSecurityCache } from "@/hooks/use-security-settings";
import { Shield, Clock, Monitor, Smartphone, AlertTriangle, CheckCircle2, XCircle, RefreshCw, Mail } from "lucide-react";
import { cn } from "@/lib/utils";
import { useTranslations } from "next-intl";
import { EmailVerificationDialog } from "@/components/profile/sections/email-verification-dialog";

// ─── Skeleton ──────────────────────────────────────────────────────────────────

function SecurityOverviewSkeleton() {
	return (
		<div className="bg-white dark:bg-white/3 border border-neutral-200 dark:border-white/8 rounded-xl shadow-sm animate-pulse divide-y divide-neutral-100 dark:divide-white/6">
			<div className="px-6 py-5 flex items-center justify-between">
				<div className="space-y-1.5">
					<Skeleton className="h-3 w-28 bg-neutral-200 dark:bg-white/10" />
					<Skeleton className="h-3 w-36 bg-neutral-200 dark:bg-white/10" />
				</div>
				<Skeleton className="w-10 h-10 rounded-full bg-neutral-200 dark:bg-white/10" />
			</div>
			{[1, 2, 3, 4].map((i) => (
				<div key={i} className="px-6 py-3.5 flex items-center justify-between">
					<div className="flex items-center gap-3">
						<Skeleton className="w-3.5 h-3.5 rounded bg-neutral-200 dark:bg-white/10" />
						<div className="space-y-1.5">
							<Skeleton className="h-3 w-24 bg-neutral-200 dark:bg-white/10" />
							<Skeleton className="h-2.5 w-32 bg-neutral-200 dark:bg-white/10" />
						</div>
					</div>
					<Skeleton className="h-5 w-16 rounded-full bg-neutral-200 dark:bg-white/10" />
				</div>
			))}
		</div>
	);
}

// ─── Status badge ──────────────────────────────────────────────────────────────

type Status = "good" | "warning" | "danger";

const BADGE_VARIANTS: Record<Status, string> = {
	good:    "bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400 ring-1 ring-emerald-200 dark:ring-emerald-800/50",
	warning: "bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-400 ring-1 ring-amber-200 dark:ring-amber-800/50",
	danger:  "bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400 ring-1 ring-red-200 dark:ring-red-800/50",
};

function StatusBadge({ status, label }: { status: Status; label: string }) {
	return (
		<span className={cn(
			"inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold shrink-0",
			BADGE_VARIANTS[status]
		)}>
			{status === "good"    && <CheckCircle2 className="w-3 h-3" />}
			{status === "warning" && <AlertTriangle className="w-3 h-3" />}
			{status === "danger"  && <XCircle className="w-3 h-3" />}
			{label}
		</span>
	);
}

// ─── Score ring ────────────────────────────────────────────────────────────────

function ScoreRing({ score, total = 4 }: { score: number; total?: number }) {
	const r = 17;
	const circ = 2 * Math.PI * r;
	const offset = circ - (score / total) * circ;
	const color =
		score <= 1 ? "#ef4444" :
		score <= 2 ? "#f59e0b" :
		score <= 3 ? "#3b82f6" :
		             "#10b981";

	return (
		<div className="relative flex items-center justify-center w-10 h-10 shrink-0">
			<svg className="w-10 h-10 -rotate-90" viewBox="0 0 42 42">
				<circle cx="21" cy="21" r={r} fill="none" stroke="currentColor" strokeWidth="3"
					className="text-neutral-100 dark:text-white/8" />
				<circle cx="21" cy="21" r={r} fill="none" stroke={color} strokeWidth="3"
					strokeDasharray={circ} strokeDashoffset={offset} strokeLinecap="round"
					style={{ transition: "stroke-dashoffset 0.5s ease" }} />
			</svg>
			<span className="absolute text-[10px] font-bold tabular-nums" style={{ color }}>
				{score}/{total}
			</span>
		</div>
	);
}

// ─── Metric row ────────────────────────────────────────────────────────────────

interface MetricRowProps {
	icon: React.ReactNode;
	label: string;
	description: string;
	badge: { status: Status; label: string };
}

function MetricRow({ icon, label, description, badge }: MetricRowProps) {
	return (
		<div className="px-6 py-3.5 flex items-center justify-between gap-4">
			<div className="flex items-center gap-3 min-w-0">
				<span className="text-neutral-400 dark:text-neutral-500 shrink-0">{icon}</span>
				<div className="min-w-0">
					<p className="text-xs font-medium text-neutral-700 dark:text-neutral-300 truncate">
						{label}
					</p>
					<p className="text-[11px] text-neutral-400 dark:text-neutral-500 mt-0.5 truncate">
						{description}
					</p>
				</div>
			</div>
			<StatusBadge status={badge.status} label={badge.label} />
		</div>
	);
}

// ─── Main component ────────────────────────────────────────────────────────────

export function SecurityOverview() {
	const { data: settings, isLoading, error, refetch, isRefetching } = useSecuritySettings();
	const { invalidateSecuritySettings } = useSecurityCache();
	const t = useTranslations("profile");

	const handleRefresh = () => {
		invalidateSecuritySettings();
		refetch();
	};

	if (isLoading) return <SecurityOverviewSkeleton />;

	if (error) {
		return (
			<div className="flex items-start gap-3 rounded-xl border border-red-200 dark:border-red-800/50 bg-red-50 dark:bg-red-900/10 px-5 py-4 shadow-sm">
				<AlertTriangle className="w-4 h-4 mt-0.5 text-red-500 dark:text-red-400 shrink-0" />
				<div className="flex-1 min-w-0">
					<p className="text-xs font-semibold text-red-700 dark:text-red-300">
						Failed to load security data
					</p>
					<p className="text-xs text-red-600/80 dark:text-red-400/80 mt-0.5 leading-relaxed">
						{error instanceof Error ? error.message : "An unexpected error occurred"}
					</p>
					<Button
						variant="outline"
						size="sm"
						onClick={handleRefresh}
						disabled={isRefetching}
						className="mt-2.5 h-7 text-xs border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 hover:bg-red-50 dark:hover:bg-red-900/20"
					>
						<RefreshCw className={cn("w-3 h-3 mr-1.5", isRefetching && "animate-spin")} />
						{isRefetching ? "Retrying…" : "Try again"}
					</Button>
				</div>
			</div>
		);
	}

	if (!settings) return null;

	// ── Derived values ─────────────────────────────────────────────────────────
	const daysOld = settings.lastPasswordChange
		? Math.floor((Date.now() - new Date(settings.lastPasswordChange).getTime()) / 86_400_000)
		: null;

	const scorePoints = [
		settings.emailVerified,
		!settings.accountLocked && settings.loginAttemptsCount <= 3,
		settings.twoFactorEnabled,
		daysOld !== null && daysOld <= 90,
		settings.activeSessionsCount <= 5,
	];
	const score = scorePoints.filter(Boolean).length;

	// ── Badge derivations ──────────────────────────────────────────────────────
	const accountBadge: { status: Status; label: string } =
		settings.accountLocked                    ? { status: "danger",  label: "Locked" }  :
		settings.loginAttemptsCount > 3           ? { status: "warning", label: "At risk" } :
		                                            { status: "good",    label: "Secure" };

	const twoFaBadge: { status: Status; label: string } = settings.twoFactorEnabled
		? { status: "good",    label: "Enabled" }
		: { status: "warning", label: "Disabled" };

	const passwordBadge: { status: Status; label: string } =
		daysOld === null ? { status: "warning", label: "Never set" } :
		daysOld > 90     ? { status: "danger",  label: `${daysOld}d old` } :
		daysOld > 30     ? { status: "warning", label: `${daysOld}d ago` } :
		                   { status: "good",    label: `${daysOld}d ago` };

	const sessionsBadge: { status: Status; label: string } = settings.activeSessionsCount > 5
		? { status: "warning", label: `${settings.activeSessionsCount} sessions` }
		: { status: "good",    label: `${settings.activeSessionsCount} session${settings.activeSessionsCount !== 1 ? "s" : ""}` };

	const emailBadge: { status: Status; label: string } = settings.emailVerified
		? { status: "good",    label: "Verified" }
		: { status: "warning", label: "Unverified" };

	const rows: MetricRowProps[] = [
		{
			icon: <Mail className="w-3.5 h-3.5" />,
			label: "Email verification",
			description: settings.emailVerified
				? "Your email address is verified"
				: "Verify your email to secure your account",
			badge: emailBadge,
		},
		{
			icon: <Shield className="w-3.5 h-3.5" />,
			label: "Account status",
			// Spec 047 made `accountLocked` / `loginAttemptsCount` real (they were
			// hardcoded false / 0). The lock they now report is the TEMPORARY 2FA
			// brute-force lockout, which lifts on its own — so telling the user to
			// contact support would be wrong. Deliberately no timestamp: this file
			// renders every string as hardcoded English (no `useTranslations`), and
			// a formatted clock time would be both untranslated AND ambiguous once
			// the lock crosses midnight. `accountLockedUntil` is on the API
			// response for callers that want to render an exact deadline.
			description: settings.accountLocked
				? "Temporarily locked after too many verification attempts - try again shortly"
				: settings.loginAttemptsCount > 3
				? `${settings.loginAttemptsCount} failed verification attempts`
				: "No issues detected",
			badge: accountBadge,
		},
		{
			icon: <Smartphone className="w-3.5 h-3.5" />,
			label: "Two-factor auth",
			description: settings.twoFactorEnabled
				? "Extra sign-in protection is active"
				: "Enable for stronger account security",
			badge: twoFaBadge,
		},
		{
			icon: <Clock className="w-3.5 h-3.5" />,
			label: "Password age",
			description: daysOld === null
				? "Password has never been changed"
				: daysOld > 90
				? "Consider updating your password soon"
				: "Recently updated",
			badge: passwordBadge,
		},
		{
			icon: <Monitor className="w-3.5 h-3.5" />,
			label: "Active sessions",
			description: `${settings.activeSessionsCount} device${settings.activeSessionsCount !== 1 ? "s" : ""} currently signed in`,
			badge: sessionsBadge,
		},
	];

	return (
		<div className="bg-white dark:bg-white/3 border border-neutral-200 dark:border-white/8 rounded-xl shadow-sm divide-y divide-neutral-100 dark:divide-white/6">

			{/* Header */}
			<div className="px-6 py-5 flex items-center justify-between">
				<div>
					<p className="text-xs font-semibold text-neutral-500 dark:text-neutral-400 uppercase tracking-wide">
						Security overview
					</p>
					<p className="text-xs text-neutral-400 dark:text-neutral-500 mt-0.5">
						{score === 5
							? "All checks passed"
							: `${5 - score} item${5 - score !== 1 ? "s" : ""} need${5 - score === 1 ? "s" : ""} attention`}
					</p>
				</div>
				<div className="flex items-center gap-1.5">
					<ScoreRing score={score} total={5} />
					<button
						onClick={handleRefresh}
						disabled={isRefetching}
						className="p-1.5 rounded-md text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-white/8 disabled:opacity-40 transition-all duration-150"
						aria-label="Refresh security data"
					>
						<RefreshCw className={cn("w-3.5 h-3.5", isRefetching && "animate-spin")} />
					</button>
				</div>
			</div>

			{/* Metric rows */}
			{rows.map((row) => (
				<MetricRow key={row.label} {...row} />
			))}

			{/* Email verification CTA — visible only when unverified */}
			{!settings.emailVerified && (
				<EmailVerificationDialog
					labelTrigger={t("EMAIL_VERIFY_TRIGGER")}
					labelTitle={t("EMAIL_VERIFY_DIALOG_TITLE")}
					labelDesc={t("EMAIL_VERIFY_DIALOG_DESC")}
					labelSend={t("EMAIL_VERIFY_DIALOG_SEND")}
					labelSending={t("EMAIL_VERIFY_DIALOG_SENDING")}
					labelCancel={t("EMAIL_VERIFY_DIALOG_CANCEL")}
					labelSuccessTitle={t("EMAIL_VERIFY_DIALOG_SUCCESS_TITLE")}
					labelSuccessDesc={t("EMAIL_VERIFY_DIALOG_SUCCESS_DESC")}
					labelClose={t("EMAIL_VERIFY_DIALOG_CLOSE")}
					labelErrorTitle={t("EMAIL_VERIFY_DIALOG_ERROR_TITLE")}
					labelTryAgain={t("EMAIL_VERIFY_DIALOG_TRY_AGAIN")}
				/>
			)}

			{/* Password expiry notice */}
			{settings.passwordExpiresAt && (
				<div className="px-6 py-3 flex items-center gap-2 text-xs text-blue-600 dark:text-blue-400 bg-blue-50/50 dark:bg-blue-900/10 rounded-b-xl">
					<Clock className="w-3.5 h-3.5 shrink-0" />
					<span>
						Password expires {new Date(settings.passwordExpiresAt).toLocaleDateString()}
					</span>
				</div>
			)}
		</div>
	);
}
