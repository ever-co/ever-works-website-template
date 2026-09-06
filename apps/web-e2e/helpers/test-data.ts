function requireEnv(name: string): string {
	const value = process.env[name];
	if (!value) {
		throw new Error(`Missing required environment variable: ${name}. Set it in .env.local`);
	}
	return value;
}

export const TEST_DATA = {
	get ADMIN_EMAIL(): string {
		return requireEnv('SEED_ADMIN_EMAIL');
	},
	get ADMIN_PASSWORD(): string {
		return requireEnv('SEED_ADMIN_PASSWORD');
	},
	CLIENT_PASSWORD: 'TestClient123!',
	generateClientEmail: () =>
		`e2e-client-${Date.now()}-${Math.random().toString(36).slice(2, 8)}@test.local`,
	generateItemName: () =>
		`E2E Test Item ${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
	generateItemUrl: () =>
		`https://e2e-test-${Date.now()}.example.com`,
};

export const REQUIRED_ENV_VARS = ['SEED_ADMIN_EMAIL', 'SEED_ADMIN_PASSWORD'] as const;

export const PUBLIC_ROUTES = [
	{ path: '/', name: 'Home' },
	{ path: '/discover/1', name: 'Discover Page 1' },
	{ path: '/categories', name: 'Categories' },
	{ path: '/tags', name: 'Tags' },
	{ path: '/collections', name: 'Collections' },
	{ path: '/pricing', name: 'Pricing' },
	{ path: '/about', name: 'About' },
	{ path: '/help', name: 'Help' },
	{ path: '/faq', name: 'FAQ' },
	{ path: '/privacy-policy', name: 'Privacy Policy' },
	{ path: '/terms-of-service', name: 'Terms of Service' },
	{ path: '/cookies', name: 'Cookies' },
	{ path: '/auth/signin', name: 'Sign In' },
	{ path: '/auth/register', name: 'Register' },
] as const;

export const AUTH_STATE_DIR = 'auth-states';
export const ADMIN_STATE_FILE = `${AUTH_STATE_DIR}/admin.json`;
export const CLIENT_STATE_FILE = `${AUTH_STATE_DIR}/client.json`;
