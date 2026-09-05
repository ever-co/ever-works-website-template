'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { signInAction, signUp } from '../actions';
import { ActionState } from '@/lib/auth/middleware';
import { PropsWithChildren, useActionState, useEffect, useRef, useState, useTransition } from 'react';
import { User, Lock, Mail, Eye, EyeOff, ShieldCheck } from 'lucide-react';
import { Button, cn } from '@heroui/react';
import { useConfig } from '../../config';
import { useTranslations, useLocale } from 'next-intl';
import { Link } from '@/i18n/navigation';
import ReCAPTCHA from 'react-google-recaptcha';
import { RECAPTCHA_SITE_KEY } from '@/lib/constants';
import { useAutoRecaptchaVerification } from '../hooks/useRecaptchaVerification';
import { useUserCache } from '@/hooks/use-current-user';
import { AuthErrorCode } from '@/lib/auth/auth-error-codes';
import { isValidCallbackUrl } from '@/lib/auth/validate-callback-url';
import { useSession } from 'next-auth/react';
import { useAnalytics } from '@/hooks/use-analytics';
import { AnalyticsEvent } from '@/lib/analytics/types';
import { isDemoMode } from '@/lib/utils';

export function CredentialsForm({
	type,
	children,
	hideSwitchButton = false,
	onSuccess,
	clientMode = false,
	callbackUrl: callbackUrlProp
}: PropsWithChildren<{
	type: 'login' | 'signup';
	hideSwitchButton?: boolean;
	onSuccess?: () => void;
	clientMode?: boolean;
	callbackUrl?: string;
}>) {
	const isLogin = type === 'login';
	const t = useTranslations('auth');
	const tCred = useTranslations('admin.CREDENTIALS_FORM');
	const tTwoFactor = useTranslations('auth.TWO_FACTOR');
	const locale = useLocale();
	const searchParams = useSearchParams();
	const rawRedirect = searchParams.get('redirect') || searchParams.get('callbackUrl');
	const redirect = isValidCallbackUrl(rawRedirect) ? rawRedirect : null;
	const router = useRouter();
	const config = useConfig();
	const auth = config.auth || {};
	const [showPassword, setShowPassword] = useState(false);
	const [showPasswordTips, setShowPasswordTips] = useState(false);
	const [captchaToken, setCaptchaToken] = useState<string | null>(null);
	const [captchaError, setCaptchaError] = useState<string | null>(null);
	const { verifyToken, isLoading: isVerifying, error: verificationError } = useAutoRecaptchaVerification();
	const { invalidateAllUserData } = useUserCache();
	const { update: refreshSession } = useSession();
	const [isPending, startTransition] = useTransition();
	const { track, identify } = useAnalytics();

	const [state, formAction, pending] = useActionState<ActionState, FormData>(isLogin ? signInAction : signUp, {});

	// Local state used only in clientMode for login
	const [clientPending, setClientPending] = useState(false);
	const [clientError, setClientError] = useState<string | null>(null);
	const [clientSuccess, setClientSuccess] = useState(false);
	const [authSyncError, setAuthSyncError] = useState<string | null>(null);
	// Store password locally for autoLogin - NEVER returned from server for security
	const [pendingPassword, setPendingPassword] = useState<string | null>(null);
	// ── Email 2FA second step (EW-139) ───────────────────────────────────────
	// The sign-in action answers TWO_FACTOR_REQUIRED after a correct password
	// when the account has 2FA on; the form then swaps the password step for a
	// code step and re-submits email + password + code. The password stays in
	// component state (`pendingPassword`) so the second submit can prove it
	// again without asking the user to retype it.
	const [twoFactorStep, setTwoFactorStep] = useState(false);
	const [twoFactorCode, setTwoFactorCode] = useState('');
	const [pendingCode, setPendingCode] = useState<string | null>(null);
	const [twoFactorExpiresAt, setTwoFactorExpiresAt] = useState<number | null>(null);
	const [secondsLeft, setSecondsLeft] = useState<number | null>(null);
	const [resendPending, setResendPending] = useState(false);
	const [resendNotice, setResendNotice] = useState<string | null>(null);
	// Once-only guard for the auto-login useEffect. Without this, identity-unstable
	// deps (refreshSession, invalidateAllUserData, tCred) re-fire the effect after a
	// successful signIn, kicking off a second signIn fetch that gets aborted by the
	// subsequent navigation and surfaces as `TypeError: Failed to fetch` in console.
	const autoLoginFiredRef = useRef(false);
	// Same idea for the post-success navigation: avoid double-navigating if the effect
	// re-fires after we've already started window.location.href / router.push.
	const successHandledRef = useRef(false);

	// Helper to get translated error message based on error code
	const getTranslatedErrorMessage = (errorCode: string | undefined): string => {
		if (!errorCode) return tCred('GENERIC_ERROR_MESSAGE');

		switch (errorCode) {
			case AuthErrorCode.ACCOUNT_NOT_FOUND:
				return tCred('ACCOUNT_NOT_FOUND');
			case AuthErrorCode.INVALID_PASSWORD:
				return tCred('INVALID_PASSWORD');
			case AuthErrorCode.PROFILE_NOT_FOUND:
				return tCred('PROFILE_NOT_FOUND');
			case AuthErrorCode.RATE_LIMITED:
				return tCred('RATE_LIMITED');
			case AuthErrorCode.USE_OAUTH_PROVIDER:
				return tCred('USE_OAUTH_PROVIDER');
			case AuthErrorCode.SESSION_REFRESH_FAILED:
				return tCred('SESSION_REFRESH_FAILED');
			case AuthErrorCode.PAGE_REFRESH_FAILED:
				return tCred('PAGE_REFRESH_FAILED');
			case AuthErrorCode.TWO_FACTOR_REQUIRED:
				return tTwoFactor('CODE_SENT');
			case AuthErrorCode.TWO_FACTOR_INVALID:
				return tTwoFactor('INVALID_CODE');
			case AuthErrorCode.TWO_FACTOR_EXPIRED:
				return tTwoFactor('EXPIRED_CODE');
			case AuthErrorCode.TWO_FACTOR_LOCKED:
				return tTwoFactor('LOCKED');
			case AuthErrorCode.TWO_FACTOR_SEND_FAILED:
				return tTwoFactor('SEND_FAILED');
			case AuthErrorCode.GENERIC_ERROR:
			default:
				return tCred('GENERIC_ERROR_MESSAGE');
		}
	};

	// TWO_FACTOR_REQUIRED is not a failure — it is "we emailed you a code".
	// Render it as a neutral notice on the code step, never as a red error.
	const isTwoFactorPrompt = (errorCode: string | undefined): boolean =>
		errorCode === AuthErrorCode.TWO_FACTOR_REQUIRED;

	useEffect(() => {
		if (!state.success) return;

		// Track success
		track(isLogin ? AnalyticsEvent.USER_LOGGED_IN : AnalyticsEvent.USER_SIGNED_UP, {
			method: 'credentials',
			email: state.email || state.credentials?.email
		});

		if (state.email || state.credentials?.email) {
			identify(state.userId || state.email || state.credentials?.email, {
				email: state.email || state.credentials?.email,
				name: state.name || state.credentials?.name,
				avatar: config.logo,
				app_name: config.company_name,
				is_tester: isDemoMode()
			});
		}

		// New (preferred) path: server action already established the session — the
		// Set-Cookie was attached to this response. All we need is to refresh useSession's
		// cache and navigate. No second signIn fetch, no race against navigation.
		if (state.autoLoggedIn) {
			if (successHandledRef.current) return;
			successHandledRef.current = true;
			const doRedirect = async () => {
				setAuthSyncError(null);
				try {
					await refreshSession();
				} catch (err) {
					console.error('Post-signup session refresh failed:', err);
					// Don't block the redirect — server cookie is already set.
				}
				invalidateAllUserData();

				const redirectPath = redirect || callbackUrlProp || state.redirect || '/client/dashboard';
				const shouldPrefixLocale =
					state.preserveLocale && locale !== 'en' && !redirectPath.startsWith(`/${locale}`);
				const finalRedirectPath = shouldPrefixLocale ? `/${locale}${redirectPath}` : redirectPath;

				if (onSuccess) onSuccess();
				window.location.href = finalRedirectPath;
			};
			void doRedirect();
			return;
		}

		// Legacy path: server returned `autoLogin: true` and expects the client to call
		// signIn() itself. Used by signInAction (the login form). The ref guard is the
		// fix for the production bug where this effect double-fired and the second fetch
		// was aborted by navigation — leaving a "Failed to fetch" in console and an
		// inconsistent cookie state.
		const autoLoginEmail = state.email || state.credentials?.email;
		const autoLoginPassword = pendingPassword || state.credentials?.password;

		if (state.autoLogin && autoLoginEmail && autoLoginPassword) {
			if (autoLoginFiredRef.current) return;
			autoLoginFiredRef.current = true;
			const doAutoLogin = async () => {
				setAuthSyncError(null);
				try {
					const { signIn } = await import('next-auth/react');
					const res = await signIn('credentials', {
						email: autoLoginEmail,
						password: autoLoginPassword,
						// `authorize` re-verifies the 2FA code and consumes it —
						// the server action's check deliberately left it unspent.
						// Omitted entirely when the account has no 2FA.
						...(pendingCode ? { code: pendingCode } : {}),
						redirect: false
					});

					if (res?.error) {
						console.error('Auto-login failed:', res.error);
						setAuthSyncError(tCred('SESSION_REFRESH_FAILED'));
						autoLoginFiredRef.current = false; // allow a retry on user resubmit
						return;
					}

					// Await session refresh to ensure cookies are properly set before navigation
					await refreshSession();

					invalidateAllUserData();

					const redirectPath = redirect || callbackUrlProp || state.redirect || '/client/dashboard';
					const shouldPrefixLocale =
						state.preserveLocale && locale !== 'en' && !redirectPath.startsWith(`/${locale}`);
					const finalRedirectPath = shouldPrefixLocale ? `/${locale}${redirectPath}` : redirectPath;

					// Use window.location.href for reliable navigation on Vercel
					// router.push() can fail if middleware doesn't see session immediately
					if (onSuccess) onSuccess();
					window.location.href = finalRedirectPath;
				} catch (err) {
					console.error('Auto-login error:', err);
					setAuthSyncError(tCred('SESSION_REFRESH_FAILED'));
					autoLoginFiredRef.current = false; // allow a retry on user resubmit
				}
			};
			void doAutoLogin();
			return;
		}

		// Modal success flow - refresh session and handle errors
		if (onSuccess) {
			const doModalSuccess = async () => {
				setAuthSyncError(null);
				invalidateAllUserData();
				try {
					await refreshSession();
				} catch (err) {
					console.error('Failed to refresh session after auth', err);
					setAuthSyncError(tCred('SESSION_REFRESH_FAILED'));
					return;
				}
				router.refresh();
				onSuccess();
			};
			void doModalSuccess();
			return;
		}

		// Default redirect logic with callback URL priority and double-prefix prevention
		const redirectPath = redirect || state.redirect || '/client/dashboard';
		// Handle locale preservation for redirects (avoid double prefix if path already has locale)
		const shouldPrefixLocale = state.preserveLocale && locale !== 'en' && !redirectPath.startsWith(`/${locale}`);
		const finalRedirectPath = shouldPrefixLocale ? `/${locale}${redirectPath}` : redirectPath;
		invalidateAllUserData();

		router.push(finalRedirectPath);
	}, [
		state.success,
		state.redirect,
		state.preserveLocale,
		state.autoLogin,
		state.autoLoggedIn,
		state.credentials,
		state.email,
		redirect,
		callbackUrlProp,
		pendingPassword,
		pendingCode,
		router,
		onSuccess,
		locale,
		invalidateAllUserData,
		refreshSession,
		tCred
	]);

	// Enter (or stay on) the 2FA code step whenever the sign-in action reports
	// that the account needs one. `twoFactorRequired` accompanies both the
	// initial TWO_FACTOR_REQUIRED prompt and every subsequent
	// invalid/expired/locked answer, so the user is never bounced back to the
	// password step by a wrong code.
	useEffect(() => {
		if (!state?.twoFactorRequired) return;
		setTwoFactorStep(true);
		setResendNotice(null);
		if (typeof state.twoFactorExpiresAt === 'string') {
			setTwoFactorExpiresAt(new Date(state.twoFactorExpiresAt).getTime());
		}
		// A rejected code must be retyped; keeping it would let the user
		// re-submit the same wrong value and spend another attempt by accident.
		if (state.error && state.error !== AuthErrorCode.TWO_FACTOR_REQUIRED) {
			setTwoFactorCode('');
		}
	}, [state?.twoFactorRequired, state?.twoFactorExpiresAt, state?.error]);

	// Countdown for the current code (EW-140). Purely informational — the
	// server is the one that enforces the 10-minute window.
	useEffect(() => {
		if (!twoFactorStep || !twoFactorExpiresAt) {
			setSecondsLeft(null);
			return;
		}
		const tick = () => setSecondsLeft(Math.max(0, Math.ceil((twoFactorExpiresAt - Date.now()) / 1000)));
		tick();
		const id = setInterval(tick, 1000);
		return () => clearInterval(id);
	}, [twoFactorStep, twoFactorExpiresAt]);

	useEffect(() => {
		if (RECAPTCHA_SITE_KEY.value || process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY) {
			const timeout = setTimeout(() => {
				console.log('ReCAPTCHA loading timeout - hiding loader');
			}, 3000);

			return () => clearTimeout(timeout);
		}
	}, []);
	// The reCAPTCHA gate applies to the password step only. Tokens are
	// single-use, so re-verifying on the 2FA submit would always fail.
	const isRecaptchaRequired = !!(RECAPTCHA_SITE_KEY.value || process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY);
	const isRecaptchaGateActive = isRecaptchaRequired && !(isLogin && twoFactorStep);
	const isRecaptchaBlocking = isRecaptchaGateActive && !captchaToken;

	const handleFormAction = async (formData: FormData) => {
		if (isRecaptchaGateActive) {
			if (!captchaToken) {
				setCaptchaError(tCred('PLEASE_COMPLETE_CAPTCHA'));

				return;
			}
			try {
				setCaptchaError(null);
				console.log('Verifying ReCAPTCHA token before submission...');

				const isValid = await verifyToken(captchaToken);
				if (!isValid) {
					setCaptchaError(tCred('RECAPTCHA_VERIFICATION_FAILED'));
					return;
				}

				console.log('ReCAPTCHA verified successfully');
			} catch (error: unknown) {
				console.error('ReCAPTCHA verification error:', error);
				setCaptchaError(tCred('RECAPTCHA_VERIFICATION_FAILED'));
				return;
			}
		}

		if (captchaToken && isRecaptchaGateActive) {
			formData.append('captchaToken', captchaToken);
		}

		formData.append('authProvider', config.authConfig?.provider || 'next-auth');

		// Store password locally for autoLogin (never sent back from server for security)
		const passwordValue = formData.get('password') as string;
		if (passwordValue) {
			setPendingPassword(passwordValue);
		}

		// On the 2FA step the password input is no longer rendered, so replay
		// the value the user already typed and attach the code (EW-139).
		if (isLogin && twoFactorStep) {
			if (!passwordValue && pendingPassword) {
				formData.set('password', pendingPassword);
			}
			const code = twoFactorCode.trim();
			formData.set('code', code);
			setPendingCode(code);
			// Clear the input HERE rather than in the response effect: two
			// consecutive wrong codes produce an identical action state, so the
			// effect's dependencies do not change and it never re-runs — the
			// rejected value would sit in the box and could be resubmitted,
			// spending another attempt on a code already known to be wrong.
			setTwoFactorCode('');
		}

		startTransition(() => {
			formAction(formData);
		});
	};

	/**
	 * Ask for a fresh code (EW-140's "request a new one" path). The endpoint
	 * re-checks the password because there is no session yet mid-login. Every
	 * outcome that would reveal whether the address exists, whether the password
	 * was right or whether 2FA is on shares one generic 200, so it cannot be
	 * used to probe for accounts. Once the credentials have checked out it does
	 * report the truth — 429 when a budget is spent, 502 when the code could not
	 * be emailed — and both are surfaced here rather than being shown as
	 * "a new code is on its way" over a code that was never sent.
	 */
	const handleResendCode = async () => {
		const emailValue = state?.email || (document.getElementById('email') as HTMLInputElement | null)?.value;
		// Refuse while a submission (or the auto-login that follows a successful
		// one) is in flight: issuing a new code rotates away the one currently
		// being verified, which would turn a correct code into "expired".
		if (!emailValue || !pendingPassword || resendPending || isResendBlocked) return;

		setResendPending(true);
		setResendNotice(null);
		try {
			const res = await fetch('/api/auth/2fa/resend', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ email: emailValue, password: pendingPassword })
			});
			if (res.status === 429) {
				setResendNotice(tTwoFactor('RESEND_RATE_LIMITED'));
				return;
			}
			const body = await res.json().catch(() => null);
			if (!res.ok || !body?.success) {
				setResendNotice(tTwoFactor('RESEND_FAILED'));
				return;
			}
			const minutes = Number(body?.data?.expiresInMinutes) || 10;
			setTwoFactorExpiresAt(Date.now() + minutes * 60_000);
			setTwoFactorCode('');
			setResendNotice(tTwoFactor('RESEND_SUCCESS'));
		} catch {
			setResendNotice(tTwoFactor('RESEND_FAILED'));
		} finally {
			setResendPending(false);
		}
	};

	// A resend must not race a verification in flight — see `handleResendCode`.
	const isResendBlocked = pending || isPending || isVerifying || !!state?.success;

	/** Abandon the code step and go back to email + password. */
	const handleBackToPassword = () => {
		setTwoFactorStep(false);
		setTwoFactorCode('');
		setPendingCode(null);
		setTwoFactorExpiresAt(null);
		setResendNotice(null);
		// The token solved for the first password submit has been spent, and the
		// widget remounts unsolved. Keeping it would let the form submit with a
		// token the server then rejects, so drop it and make the user solve the
		// freshly rendered challenge.
		setCaptchaToken(null);
		setCaptchaError(null);
	};

	// Client-side submit when clientMode is true (admin login path)
	const handleClientSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
		e.preventDefault();
		if (!isLogin) return;

		const form = e.currentTarget;
		const email = (form.elements.namedItem('email') as HTMLInputElement).value;
		const password = (form.elements.namedItem('password') as HTMLInputElement).value;

		setClientPending(true);
		setClientError(null);

		try {
			const { signIn } = await import('next-auth/react');
			const res = await signIn('credentials', {
				email,
				password,
				isAdmin: clientMode,
				redirect: false
			});

			if (res && !res.error) {
				setClientSuccess(true);

				// Track success for client-side login
				track(AnalyticsEvent.USER_LOGGED_IN, {
					method: 'credentials',
					email,
					isAdmin: clientMode
				});

				identify(email, {
					email,
					app_name: config.company_name,
					is_tester: isDemoMode(),
					is_admin: clientMode
				});

				// Await session refresh to ensure cookies are properly set before navigation
				await refreshSession();

				invalidateAllUserData();

				// If onSuccess is provided (e.g., admin login page), let it handle the redirect
				if (onSuccess) {
					onSuccess();
					return;
				}

				// Default redirect using window.location.href for reliable navigation on Vercel
				// router.push() can fail if middleware doesn't see the session immediately
				const redirectPath = redirect || (clientMode ? '/admin' : '/client/dashboard');
				const shouldPrefixLocale = locale !== 'en' && !redirectPath.startsWith(`/${locale}`);
				const finalRedirectPath = shouldPrefixLocale ? `/${locale}${redirectPath}` : redirectPath;
				window.location.href = finalRedirectPath;
			} else {
				setClientError(res?.error || 'Authentication failed');
			}
		} catch (error: unknown) {
			const errorMessage =
				error instanceof Error ? error.message : typeof error === 'string' ? error : 'Authentication failed';
			setClientError(errorMessage);
			track(AnalyticsEvent.API_ERROR, {
				context: 'client_login',
				error: errorMessage
			});
		} finally {
			setClientPending(false);
		}
	};
	return (
		<div className="w-full">
			{/* Header */}
			<div className="mb-5">
				<h1 className="text-lg font-semibold text-gray-900 dark:text-white">
					{isLogin ? t('SIGN_IN') : t('CREATE_ACCOUNT')}
				</h1>
				<p className="text-gray-500 dark:text-gray-400 text-xs mt-0.5">
					{isLogin ? tCred('WELCOME_BACK_MESSAGE') : tCred('CREATE_ACCOUNT_MESSAGE')}
				</p>
			</div>

			{auth.credentials && (
				<form
					{...(clientMode ? { onSubmit: handleClientSubmit } : { action: handleFormAction as any })}
					className="space-y-4"
					aria-label={isLogin ? t('SIGN_IN') : t('CREATE_ACCOUNT')}
				>
					{/* Name field (signup only) */}
					{!isLogin && (
						<div className="space-y-1.5">
							<label
								htmlFor="name"
								className="block text-xs font-medium text-gray-600 dark:text-gray-400"
							>
								{t('FULL_NAME')}
								<span className="text-red-500 ml-1">*</span>
							</label>
							<div className="relative group">
								<div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none z-10">
									<User className="h-4 w-4 text-gray-400 group-focus-within:text-theme-primary transition-colors" />
								</div>
								<input
									id="name"
									type="text"
									className="pl-9 pr-4 w-full py-2 text-sm border border-gray-200 dark:border-white/8 rounded-sm bg-white dark:bg-white/5 text-gray-900 dark:text-gray-100 focus:outline-none focus:border-theme-primary focus:ring-1 focus:ring-theme-primary/20 placeholder:text-gray-400 transition-colors"
									placeholder={t('ENTER_YOUR_FULL_NAME')}
									name="name"
									defaultValue={state?.name}
									required
									autoComplete="name"
									aria-describedby="name-error"
									aria-required="true"
									aria-invalid={!!state?.error || !!clientError}
								/>
							</div>
						</div>
					)}

					{authSyncError && (
						<div className="flex items-center gap-2 p-2.5 bg-red-50 dark:bg-red-900/20 border border-red-100 dark:border-red-800/50 rounded-lg">
							<svg
								className="shrink-0 w-4 h-4 text-red-500 dark:text-red-400"
								fill="currentColor"
								viewBox="0 0 20 20"
								aria-hidden="true"
							>
								<path
									fillRule="evenodd"
									d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z"
									clipRule="evenodd"
								/>
							</svg>
							<p className="text-xs text-red-700 dark:text-red-300">{authSyncError}</p>
						</div>
					)}

					{/* Email field — read-only on the 2FA step so the user can see
					    which account the code was sent to but cannot change it
					    without going back. */}
					<div className="space-y-1.5">
						<label htmlFor="email" className="block text-xs font-medium text-gray-600 dark:text-gray-400">
							{t('EMAIL_ADDRESS')}
							<span className="text-red-500 ml-1">*</span>
						</label>
						<div className="relative group">
							<div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none z-10">
								<Mail className="h-4 w-4 text-gray-400 group-focus-within:text-theme-primary transition-colors" />
							</div>
							<input
								id="email"
								type="email"
								className={cn(
									'pl-9 pr-4 w-full py-2 text-sm border border-gray-200 dark:border-white/8 rounded-sm bg-white dark:bg-white/5 text-gray-900 dark:text-gray-100 focus:outline-none focus:border-theme-primary focus:ring-1 focus:ring-theme-primary/20 placeholder:text-gray-400 transition-colors',
									twoFactorStep && 'opacity-70 cursor-not-allowed'
								)}
								placeholder={t('ENTER_YOUR_EMAIL')}
								name="email"
								defaultValue={state?.email}
								required
								readOnly={twoFactorStep}
								autoComplete="email"
								aria-describedby="email-error"
								aria-required="true"
								aria-invalid={!!state?.error || !!clientError}
							/>
						</div>
					</div>

					{/* Password field — kept mounted but hidden during the 2FA step
					    so its value is still submitted with the code. */}
					<div className={cn('space-y-1.5', twoFactorStep && 'hidden')}>
						<label
							htmlFor="password"
							className="block text-xs font-medium text-gray-600 dark:text-gray-400"
						>
							{t('PASSWORD')}
							<span className="text-red-500 ml-1">*</span>
						</label>
						<div className="relative group">
							<div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none z-10">
								<Lock className="h-4 w-4 text-gray-400 group-focus-within:text-theme-primary transition-colors" />
							</div>
							<input
								id="password"
								type={showPassword ? 'text' : 'password'}
								className="pl-9 pr-9 w-full py-2 text-sm border border-gray-200 dark:border-white/8 rounded-sm bg-white dark:bg-white/5 text-gray-900 dark:text-gray-100 focus:outline-none focus:border-theme-primary focus:ring-1 focus:ring-theme-primary/20 placeholder:text-gray-400 transition-colors"
								placeholder={t('ENTER_YOUR_PASSWORD')}
								name="password"
								required
								autoComplete={isLogin ? 'current-password' : 'new-password'}
								onFocus={() => setShowPasswordTips(!isLogin)}
								onBlur={() => setShowPasswordTips(false)}
								aria-describedby={!isLogin && showPasswordTips ? 'password-tips' : undefined}
								aria-required="true"
								aria-invalid={!!state?.error || !!clientError}
							/>
							<button
								type="button"
								className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-theme-primary transition-colors z-10"
								onClick={() => setShowPassword((v) => !v)}
								aria-label={showPassword ? tCred('HIDE_PASSWORD') : tCred('SHOW_PASSWORD')}
							>
								{showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
							</button>
						</div>
						{/* Password tips for signup */}
						{!isLogin && showPasswordTips && (
							<div
								id="password-tips"
								className="mt-2 p-3 bg-theme-primary/5 border border-theme-primary/15 rounded-lg"
							>
								<p className="text-xs font-medium text-gray-700 dark:text-gray-300 mb-1.5 flex items-center gap-1.5">
									<Lock className="w-3 h-3 text-theme-primary" />
									{tCred('SECURITY_REQUIREMENTS')}
								</p>
								<ul className="space-y-1">
									<li className="flex items-center gap-1.5 text-xs text-gray-500 dark:text-gray-400">
										<div className="w-1 h-1 bg-theme-primary/60 rounded-full"></div>
										<span>{tCred('AT_LEAST_8_CHARS')}</span>
									</li>
									<li className="flex items-center gap-1.5 text-xs text-gray-500 dark:text-gray-400">
										<div className="w-1 h-1 bg-theme-primary/60 rounded-full"></div>
										<span>{tCred('UPPERCASE_LOWERCASE')}</span>
									</li>
									<li className="flex items-center gap-1.5 text-xs text-gray-500 dark:text-gray-400">
										<div className="w-1 h-1 bg-theme-primary/60 rounded-full"></div>
										<span>{tCred('NUMBER_SPECIAL_CHAR')}</span>
									</li>
								</ul>
							</div>
						)}
					</div>

					{/* Two-factor code step (EW-139) */}
					{isLogin && twoFactorStep && (
						<div className="space-y-1.5" data-testid="two-factor-step">
							<label
								htmlFor="twoFactorCode"
								className="block text-xs font-medium text-gray-600 dark:text-gray-400"
							>
								{tTwoFactor('CODE_LABEL')}
								<span className="text-red-500 ml-1">*</span>
							</label>
							<p className="text-xs text-gray-500 dark:text-gray-400">{tTwoFactor('CODE_HELP')}</p>
							<div className="relative group">
								<div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none z-10">
									<ShieldCheck className="h-4 w-4 text-gray-400 group-focus-within:text-theme-primary transition-colors" />
								</div>
								<input
									id="twoFactorCode"
									name="twoFactorCodeInput"
									type="text"
									inputMode="numeric"
									pattern="[0-9]*"
									maxLength={6}
									autoFocus
									autoComplete="one-time-code"
									data-testid="two-factor-code-input"
									className="pl-9 pr-4 w-full py-2 text-sm tracking-[0.4em] font-mono border border-gray-200 dark:border-white/8 rounded-sm bg-white dark:bg-white/5 text-gray-900 dark:text-gray-100 focus:outline-none focus:border-theme-primary focus:ring-1 focus:ring-theme-primary/20 placeholder:text-gray-400 placeholder:tracking-normal placeholder:font-sans transition-colors"
									placeholder={tTwoFactor('CODE_PLACEHOLDER')}
									value={twoFactorCode}
									onChange={(e) => setTwoFactorCode(e.target.value.replace(/[^0-9]/g, '').slice(0, 6))}
									required
									aria-required="true"
									aria-invalid={!!state?.error && !isTwoFactorPrompt(state?.error)}
								/>
							</div>

							<div className="flex items-center justify-between gap-2 pt-1">
								<span className="text-xs text-gray-500 dark:text-gray-400">
									{secondsLeft !== null && secondsLeft > 0
										? tTwoFactor('EXPIRES_IN', {
												minutes: Math.floor(secondsLeft / 60),
												seconds: String(secondsLeft % 60).padStart(2, '0')
											})
										: tTwoFactor('EXPIRED_HINT')}
								</span>
								<button
									type="button"
									onClick={handleResendCode}
									disabled={resendPending || isResendBlocked}
									data-testid="two-factor-resend"
									className="text-xs font-medium text-theme-primary hover:text-theme-primary/80 hover:underline transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
								>
									{resendPending ? tTwoFactor('RESENDING') : tTwoFactor('RESEND')}
								</button>
							</div>

							{resendNotice && (
								<p className="text-xs text-gray-600 dark:text-gray-300" role="status">
									{resendNotice}
								</p>
							)}

							<button
								type="button"
								onClick={handleBackToPassword}
								data-testid="two-factor-back"
								className="text-xs text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:underline transition-colors"
							>
								{tTwoFactor('BACK')}
							</button>
						</div>
					)}

					{/* Neutral "we emailed you a code" notice — TWO_FACTOR_REQUIRED
					    travels in `state.error` but is not a failure. */}
					{isTwoFactorPrompt(state?.error) && !clientError && (
						<div
							className="flex items-center gap-2 p-2.5 bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-800/50 rounded-lg"
							role="status"
						>
							<ShieldCheck className="shrink-0 w-4 h-4 text-blue-500 dark:text-blue-400" />
							<p className="text-xs text-blue-700 dark:text-blue-300">{tTwoFactor('CODE_SENT')}</p>
						</div>
					)}

					{/* Error message */}
					{((state?.error && !isTwoFactorPrompt(state?.error)) || clientError) && (
						<div className="flex items-center gap-2 p-2.5 bg-red-50 dark:bg-red-900/20 border border-red-100 dark:border-red-800/50 rounded-lg">
							<svg
								className="shrink-0 w-4 h-4 text-red-500 dark:text-red-400"
								fill="currentColor"
								viewBox="0 0 20 20"
								aria-hidden="true"
							>
								<path
									fillRule="evenodd"
									d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z"
									clipRule="evenodd"
								/>
							</svg>
							<p className="text-xs text-red-700 dark:text-red-300" data-testid="auth-error">
								{getTranslatedErrorMessage(clientError || state?.error)}
							</p>
						</div>
					)}

					{/* Server-side success message */}
					{state?.success && !clientMode && (
						<div className="flex items-center gap-2 p-2.5 bg-green-50 dark:bg-green-900/20 border border-green-100 dark:border-green-800/50 rounded-lg">
							<svg
								className="shrink-0 w-4 h-4 text-green-500 dark:text-green-400"
								fill="currentColor"
								viewBox="0 0 20 20"
								aria-hidden="true"
							>
								<path
									fillRule="evenodd"
									d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
									clipRule="evenodd"
								/>
							</svg>
							<p className="text-xs text-green-700 dark:text-green-300">
								{isLogin ? tCred('LOGIN_SUCCESSFUL') : tCred('ACCOUNT_CREATED_SUCCESSFULLY')}
								{' — '}
								{isLogin ? tCred('REDIRECTING') : tCred('WELCOME_SETTING_UP_ACCOUNT')}
							</p>
						</div>
					)}

					{/* Client-side success message for admin login */}
					{clientMode && clientSuccess && (
						<div className="flex items-center gap-2 p-2.5 bg-green-50 dark:bg-green-900/20 border border-green-100 dark:border-green-800/50 rounded-lg">
							<svg
								className="shrink-0 w-4 h-4 text-green-500 dark:text-green-400"
								fill="currentColor"
								viewBox="0 0 20 20"
								aria-hidden="true"
							>
								<path
									fillRule="evenodd"
									d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
									clipRule="evenodd"
								/>
							</svg>
							<p className="text-xs text-green-700 dark:text-green-300">
								{tCred('ADMIN_LOGIN_SUCCESSFUL')} — {tCred('REDIRECTING_TO_ADMIN')}
							</p>
						</div>
					)}

					{/* Forgot password link (login only) */}
					{isLogin && !twoFactorStep && (
						<div className="flex justify-end">
							<Link
								href="/auth/forgot-password"
								className="text-xs font-medium text-theme-primary hover:text-theme-primary/80 transition-colors hover:underline"
							>
								{t('FORGOT_PASSWORD')}
							</Link>
						</div>
					)}

					{/* ReCAPTCHA — hidden on the 2FA step. A reCAPTCHA token is
					    single-use, so re-verifying the one solved on the password
					    step would always fail; the human check has already passed
					    and the code step has its own per-account attempt limit. */}
					{(RECAPTCHA_SITE_KEY.value || process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY) && !twoFactorStep && (
						<div className="mb-4">
							<div className="flex justify-center">
								<div className="recaptcha-container">
									<ReCAPTCHA
										sitekey={
											RECAPTCHA_SITE_KEY.value || process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY || ''
										}
										onChange={(token: string | null) => {
											setCaptchaToken(token);
											setCaptchaError(null);
										}}
										onError={(error) => {
											console.error('ReCAPTCHA error:', error);
											setCaptchaError(tCred('FAILED_TO_LOAD_VERIFICATION'));
										}}
										onExpired={() => {
											setCaptchaToken(null);
											setCaptchaError(tCred('VERIFICATION_EXPIRED'));
										}}
										theme="light"
										size="normal"
										className="scale-90 transform-gpu w-[50px] flex justify-center"
										tabindex={0}
									/>
								</div>
							</div>
							{(captchaError || verificationError) && (
								<div className="mt-2 text-sm text-red-600 dark:text-red-400">
									{captchaError || verificationError?.message || 'ReCAPTCHA verification failed'}
								</div>
							)}
							{isVerifying && (
								<div className="mt-2 text-sm text-blue-600 dark:text-blue-400">
									{tCred('VERIFYING')}
								</div>
							)}
							{isRecaptchaBlocking && (
								<div className="mt-2 text-sm text-amber-600 dark:text-amber-400">
									{tCred('PLEASE_COMPLETE_VERIFICATION')}
								</div>
							)}
						</div>
					)}
					<Button
						disabled={
							clientPending || clientSuccess || pending || isPending || isVerifying || isRecaptchaBlocking
						}
						type="submit"
						className={cn(
							'w-full h-10 bg-gray-900 text-white dark:bg-white dark:text-gray-900 text-sm font-medium rounded-sm',
							'hover:bg-theme-primary/90 focus:outline-none',
							'focus:ring-2 focus:ring-theme-primary/30 transition-colors duration-150',
							'disabled:opacity-50 disabled:cursor-not-allowed'
						)}
						isLoading={
							(pending && !state.success) || clientPending || clientSuccess || isPending || isVerifying
						}
						aria-busy={
							(pending && !state.success) || clientPending || clientSuccess || isPending || isVerifying
						}
						aria-disabled={
							(pending && !state.success) ||
							clientPending ||
							clientSuccess ||
							isPending ||
							isVerifying ||
							isRecaptchaBlocking
						}
					>
						{(pending && !state.success) || clientPending ? (
							<span>{isLogin ? tCred('SIGNING_IN') : tCred('CREATING_ACCOUNT')}</span>
						) : clientSuccess ? (
							<span className="flex items-center justify-center gap-2">
								<svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
									<path
										fillRule="evenodd"
										d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
										clipRule="evenodd"
									/>
								</svg>
								<span>{tCred('REDIRECTING')}</span>
							</span>
						) : state.success && !clientMode ? (
							<span className="flex items-center justify-center gap-2">
								<svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
									<path
										fillRule="evenodd"
										d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
										clipRule="evenodd"
									/>
								</svg>
								<span>{isLogin ? tCred('SIGNED_IN') : tCred('ACCOUNT_CREATED')}</span>
							</span>
						) : (
							<span className="flex items-center justify-center gap-2">
								<span>{isLogin ? t('SIGN_IN') : t('CREATE_ACCOUNT')}</span>
								<svg
									className="w-4 h-4 transition-transform group-hover:translate-x-1"
									fill="none"
									stroke="currentColor"
									viewBox="0 0 24 24"
								>
									<path
										strokeLinecap="round"
										strokeLinejoin="round"
										strokeWidth={2}
										d="M13 7l5 5m0 0l-5 5m5-5H6"
									/>
								</svg>
							</span>
						)}
					</Button>
				</form>
			)}

			{children}

			{auth.credentials && !hideSwitchButton && (
				<div className="text-center mt-5 pt-4 border-t border-gray-100 dark:border-white/6">
					<p className="text-gray-500 dark:text-gray-400 text-xs mb-2">
						{isLogin ? tCred('NEW_TO_PLATFORM') : tCred('ALREADY_HAVE_ACCOUNT')}
					</p>
					<Button
						as={Link}
						className={cn(
							'text-theme-primary hover:text-theme-primary/80 text-xs font-medium',
							'hover:bg-theme-primary/5 px-3 py-1.5! rounded-md transition-colors duration-150',
							'border border-theme-primary/20 hover:border-theme-primary/35'
						)}
						href={isLogin ? '/auth/register' : '/auth/signin'}
						variant="flat"
					>
						{isLogin ? (
							<span className="flex items-center gap-2">
								<span>{tCred('CREATE_ACCOUNT_BUTTON')}</span>
								<svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
									<path
										strokeLinecap="round"
										strokeLinejoin="round"
										strokeWidth={2}
										d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z"
									/>
								</svg>
							</span>
						) : (
							<span className="flex items-center gap-2">
								<span>{tCred('SIGN_IN_BUTTON')}</span>
								<svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
									<path
										strokeLinecap="round"
										strokeLinejoin="round"
										strokeWidth={2}
										d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1"
									/>
								</svg>
							</span>
						)}
					</Button>
				</div>
			)}
		</div>
	);
}
