"use client";

import { apiUtils, serverClient } from "@/lib/api/server-api-client";
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";

interface SecuritySettings {
  emailVerified: boolean;
  twoFactorEnabled: boolean;
  lastPasswordChange: string | null;
  activeSessionsCount: number;
  loginAttemptsCount: number;
  accountLocked: boolean;
  /** ISO timestamp the 2FA lockout lifts, when one is in force (spec 053). */
  accountLockedUntil?: string | null;
  /**
   * Whether the account may turn email 2FA on at all — false for
   * OAuth-only sign-ups (EW-142). Optional so a client running against an
   * older deployment simply falls back to "not allowed" rather than
   * crashing.
   */
  canEnableTwoFactor?: boolean;
  /** How the account authenticates today. */
  authMethod?: "credentials" | "oauth" | "unknown";
  passwordExpiresAt: string | null;
}

interface LoginActivity {
  id: string;
  timestamp: string;
  ipAddress: string | null;
  action: string;
  success: boolean;
}

interface ActiveSession {
  token: string;
  tokenFull: string;
  expires: string;
  isCurrent: boolean;
}

interface ConnectedAccount {
  provider: string;
  providerAccountId: string;
  email: string | null;
  canDisconnect: boolean;
}

interface SecurityNotificationChannel {
  in_app: boolean;
  email: boolean;
}

interface SecurityNotificationPrefs {
  security_alert: SecurityNotificationChannel;
  password_changed: SecurityNotificationChannel;
}

// ─── Query keys ───────────────────────────────────────────────────────────────

export const SECURITY_QUERY_KEYS = {
  settings: ["security", "settings"] as const,
  loginActivity: (page: number, limit: number) => ["security", "login-activity", page, limit] as const,
  activeSessions: ["security", "active-sessions"] as const,
  connectedAccounts: ["security", "connected-accounts"] as const,
  notifications: ["security", "notifications"] as const,
} as const;

// ─── Fetchers ─────────────────────────────────────────────────────────────────

// serverClient puts the entire JSON body in response.data, so the inner
// `data` field must be extracted explicitly via (response.data as any)?.data.

const fetchSecuritySettings = async (): Promise<SecuritySettings> => {
  const response = await serverClient.get("/api/auth/security/settings");
  if (!response.success) throw new Error(response.error || "Failed to fetch security settings");
  const body = response.data as any;
  if (!body?.success) throw new Error(body?.error || "Failed to fetch security settings");
  return body.data as SecuritySettings;
};

const fetchLoginActivity = async (page = 1, limit = 10) => {
  const url = apiUtils.buildUrl("/api/auth/security/login-activity", { page, limit });
  const response = await serverClient.get(url);
  if (!response.success) throw new Error(response.error || "Failed to fetch login activity");
  const body = response.data as any;
  if (!body?.success) throw new Error(body?.error || "Failed to fetch login activity");
  return body.data as {
    activities: LoginActivity[];
    pagination: { page: number; limit: number; total: number; totalPages: number };
  };
};

const fetchActiveSessions = async (): Promise<ActiveSession[]> => {
  const response = await serverClient.get("/api/auth/security/sessions");
  if (!response.success) throw new Error(response.error || "Failed to fetch sessions");
  const body = response.data as any;
  if (!body?.success) throw new Error(body?.error || "Failed to fetch sessions");
  return (body.data as ActiveSession[]) ?? [];
};

const fetchConnectedAccounts = async (): Promise<{ accounts: ConnectedAccount[]; hasPassword: boolean }> => {
  const response = await serverClient.get("/api/auth/security/connected-accounts");
  if (!response.success) throw new Error(response.error || "Failed to fetch connected accounts");
  const body = response.data as any;
  if (!body?.success) throw new Error(body?.error || "Failed to fetch connected accounts");
  return { accounts: (body.data as ConnectedAccount[]) ?? [], hasPassword: body.hasPassword ?? false };
};

const fetchSecurityNotifications = async (): Promise<SecurityNotificationPrefs> => {
  const response = await serverClient.get("/api/auth/security/notifications");
  if (!response.success) throw new Error(response.error || "Failed to fetch notification preferences");
  const body = response.data as any;
  if (!body?.success) throw new Error(body?.error || "Failed to fetch notification preferences");
  return body.data as SecurityNotificationPrefs;
};

// ─── Hooks ────────────────────────────────────────────────────────────────────

export function useSecuritySettings() {
  return useQuery({
    queryKey: SECURITY_QUERY_KEYS.settings,
    queryFn: fetchSecuritySettings,
    staleTime: 1000 * 60 * 5,
    gcTime: 1000 * 60 * 30,
    retry: (failureCount, error) => {
      if (error.message.includes("Unauthorized")) return false;
      return failureCount < 2;
    },
  });
}

export function useLoginActivity(page = 1, limit = 10) {
  return useQuery({
    queryKey: SECURITY_QUERY_KEYS.loginActivity(page, limit),
    queryFn: () => fetchLoginActivity(page, limit),
    staleTime: 1000 * 60 * 2,
    gcTime: 1000 * 60 * 15,
    retry: 1,
  });
}

export function useActiveSessions() {
  return useQuery({
    queryKey: SECURITY_QUERY_KEYS.activeSessions,
    queryFn: fetchActiveSessions,
    staleTime: 1000 * 60 * 2,
    gcTime: 1000 * 60 * 10,
    retry: 1,
  });
}

export function useConnectedAccounts() {
  return useQuery({
    queryKey: SECURITY_QUERY_KEYS.connectedAccounts,
    queryFn: fetchConnectedAccounts,
    staleTime: 1000 * 60 * 5,
    gcTime: 1000 * 60 * 30,
    retry: 1,
  });
}

export function useSecurityNotifications() {
  return useQuery({
    queryKey: SECURITY_QUERY_KEYS.notifications,
    queryFn: fetchSecurityNotifications,
    staleTime: 1000 * 60 * 5,
    gcTime: 1000 * 60 * 30,
    retry: 1,
  });
}

// ─── Mutations ────────────────────────────────────────────────────────────────

export function useRevokeSession() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (tokenFull: string) =>
      serverClient.delete(`/api/auth/security/sessions/${encodeURIComponent(tokenFull)}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: SECURITY_QUERY_KEYS.activeSessions });
      queryClient.invalidateQueries({ queryKey: SECURITY_QUERY_KEYS.settings });
    },
  });
}

export function useRevokeAllOtherSessions() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => serverClient.delete("/api/auth/security/sessions"),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: SECURITY_QUERY_KEYS.activeSessions });
      queryClient.invalidateQueries({ queryKey: SECURITY_QUERY_KEYS.settings });
    },
  });
}

export function useDisconnectProvider() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (provider: string) =>
      serverClient.delete(`/api/auth/security/connected-accounts/${encodeURIComponent(provider)}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: SECURITY_QUERY_KEYS.connectedAccounts });
    },
  });
}

/**
 * Turn email two-factor authentication on (EW-136 / EW-137).
 *
 * The route refuses OAuth-only accounts with 403 + `code: 'OAUTH_ACCOUNT'`;
 * the card disables the switch for those, so reaching that branch means
 * something bypassed the UI.
 */
export function useEnableTwoFactor() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      const response = await serverClient.post("/api/auth/security/2fa/enable", {});
      const body = response.data as any;
      if (!response.success || !body?.success) {
        throw new Error(body?.error || response.error || "Failed to enable two-factor authentication");
      }
      return body.data as { twoFactorEnabled: boolean };
    },
    onSuccess: () => {
      // `serverClient` memoises GET responses for five minutes, so a bare
      // React Query invalidation would refetch straight out of that cache and
      // hand the card back the PRE-mutation body — the switch would flip back.
      serverClient.clearCache();
      queryClient.invalidateQueries({ queryKey: SECURITY_QUERY_KEYS.settings });
    },
  });
}

/** Turn email two-factor authentication off (EW-136 / EW-137). */
export function useDisableTwoFactor() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      const response = await serverClient.post("/api/auth/security/2fa/disable", {});
      const body = response.data as any;
      if (!response.success || !body?.success) {
        throw new Error(body?.error || response.error || "Failed to disable two-factor authentication");
      }
      return body.data as { twoFactorEnabled: boolean };
    },
    onSuccess: () => {
      // Same five-minute GET cache as the enable mutation above.
      serverClient.clearCache();
      queryClient.invalidateQueries({ queryKey: SECURITY_QUERY_KEYS.settings });
    },
  });
}

export function useUpdateSecurityNotifications() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: Partial<SecurityNotificationPrefs>) =>
      serverClient.patch("/api/auth/security/notifications", data),
    onMutate: async (newData) => {
      await queryClient.cancelQueries({ queryKey: SECURITY_QUERY_KEYS.notifications });
      const previous = queryClient.getQueryData<SecurityNotificationPrefs>(SECURITY_QUERY_KEYS.notifications);
      queryClient.setQueryData<SecurityNotificationPrefs>(SECURITY_QUERY_KEYS.notifications, (old) => {
        if (!old) return old;
        const result = { ...old };
        for (const [type, channels] of Object.entries(newData) as [keyof SecurityNotificationPrefs, Partial<SecurityNotificationPrefs[keyof SecurityNotificationPrefs]>][]) {
          result[type] = { ...result[type], ...channels };
        }
        return result;
      });
      return { previous };
    },
    onError: (_err, _vars, context) => {
      if (context?.previous) {
        queryClient.setQueryData(SECURITY_QUERY_KEYS.notifications, context.previous);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: SECURITY_QUERY_KEYS.notifications });
    },
  });
}

// ─── Cache utilities ──────────────────────────────────────────────────────────

export function useSecurityCache() {
  const queryClient = useQueryClient();

  const invalidateSecuritySettings = () => {
    queryClient.invalidateQueries({ queryKey: SECURITY_QUERY_KEYS.settings });
  };

  const invalidateLoginActivity = () => {
    queryClient.invalidateQueries({ queryKey: ["security", "login-activity"] });
  };

  const invalidateAllSecurity = () => {
    queryClient.invalidateQueries({ queryKey: ["security"] });
  };

  const prefetchSecuritySettings = () => {
    queryClient.prefetchQuery({
      queryKey: SECURITY_QUERY_KEYS.settings,
      queryFn: fetchSecuritySettings,
      staleTime: 1000 * 60 * 5,
    });
  };

  return {
    invalidateSecuritySettings,
    invalidateLoginActivity,
    invalidateAllSecurity,
    prefetchSecuritySettings,
  };
}

export type { SecuritySettings, LoginActivity, ActiveSession, ConnectedAccount, SecurityNotificationPrefs };
