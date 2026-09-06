import { test, expect } from '@playwright/test';
import crypto from 'crypto';
import {
	TWO_FACTOR_CODE_LENGTH,
	TWO_FACTOR_CODE_TTL_MINUTES,
	TWO_FACTOR_CODE_TTL_MS,
	TWO_FACTOR_LOCK_MS,
	TWO_FACTOR_MAX_ATTEMPTS,
	constantTimeEqualsHex,
	generateTwoFactorCode,
	hashTwoFactorCode,
	isTwoFactorCodeExpired,
	isTwoFactorLocked,
	isWellFormedTwoFactorCode,
	normalizeTwoFactorCode,
	readPositiveIntEnv,
	registerFailedAttempt,
	remainingTwoFactorAttempts,
	twoFactorCodeExpiry,
	twoFactorLockRetryAfterSeconds,
	verifyTwoFactorCodeHash
} from '../../../web/lib/auth/two-factor-code';

/**
 * Codes are hashed under a server-only key (HMAC-SHA256), so every call
 * here passes an explicit secret rather than depending on whatever
 * AUTH_SECRET the runner happens to have — the point of these tests is the
 * arithmetic, not the environment.
 */
const SECRET = 'unit-test-two-factor-secret';

/**
 * Unit coverage for the pure half of email two-factor authentication
 * (spec 053 — EW-138 code generation, EW-140 expiry, EW-141 lockout).
 *
 * These import `apps/web/lib/auth/two-factor-code.ts` directly and touch
 * no database, mail provider or browser — the module is deliberately free
 * of those imports so this file can exist. The repo has no Jest/Vitest
 * setup (see CLAUDE.md §4), so the Playwright runner doubles as the unit
 * runner; nothing here uses the `page` fixture.
 *
 * The stateful behaviour built on top of these functions (rotate-on-issue,
 * lock persistence, code consumption) is covered by
 * `tests/auth/two-factor-login.spec.ts` and `tests/api/auth-2fa-routes.spec.ts`.
 */
test.describe('Email 2FA: code generation (EW-138)', () => {
	test('generates a zero-padded 6-digit decimal code', () => {
		for (let i = 0; i < 200; i++) {
			const code = generateTwoFactorCode();
			expect(code).toHaveLength(TWO_FACTOR_CODE_LENGTH);
			expect(code).toMatch(/^[0-9]{6}$/);
		}
	});

	test('does not repeat itself over many draws', () => {
		// A constant or low-entropy generator would collapse this set. 500
		// draws from 1e6 values collide rarely (birthday bound ≈ 12%), so a
		// generous floor still catches a broken generator without flaking.
		const seen = new Set<string>();
		for (let i = 0; i < 500; i++) seen.add(generateTwoFactorCode());
		expect(seen.size).toBeGreaterThan(450);
	});

	test('respects a custom length', () => {
		expect(generateTwoFactorCode(4)).toMatch(/^[0-9]{4}$/);
		expect(generateTwoFactorCode(8)).toMatch(/^[0-9]{8}$/);
	});

	test('hashes to a keyed hex digest that is not the code itself', () => {
		const code = '024680';
		const hash = hashTwoFactorCode(code, SECRET);

		expect(hash).toMatch(/^[0-9a-f]{64}$/);
		expect(hash).not.toContain(code);
		// Same digest the database column is expected to hold.
		expect(hash).toBe(crypto.createHmac('sha256', SECRET).update(code).digest('hex'));
	});

	test('the digest is KEYED — an unkeyed SHA-256 rainbow table does not reverse it', () => {
		// The whole six-digit space is only 10^6 values, so a plain digest
		// would be trivially reversible from a database dump. Two different
		// keys must therefore produce two different digests for one code, and
		// neither may equal the bare SHA-256 of that code.
		const code = '135791';

		expect(hashTwoFactorCode(code, SECRET)).not.toBe(hashTwoFactorCode(code, 'a-different-secret'));
		expect(hashTwoFactorCode(code, SECRET)).not.toBe(crypto.createHash('sha256').update(code).digest('hex'));
	});

	test('hashing is deterministic and collision-free across neighbouring codes', () => {
		expect(hashTwoFactorCode('123456', SECRET)).toBe(hashTwoFactorCode('123456', SECRET));
		expect(hashTwoFactorCode('123456', SECRET)).not.toBe(hashTwoFactorCode('123457', SECRET));
	});

	test('normalises the separators people paste out of an email', () => {
		expect(normalizeTwoFactorCode(' 123 456 ')).toBe('123456');
		expect(normalizeTwoFactorCode('123-456')).toBe('123456');
		expect(hashTwoFactorCode('123 456', SECRET)).toBe(hashTwoFactorCode('123456', SECRET));
	});

	test('rejects malformed submissions before any hashing', () => {
		expect(isWellFormedTwoFactorCode('123456')).toBe(true);
		expect(isWellFormedTwoFactorCode('12345')).toBe(false);
		expect(isWellFormedTwoFactorCode('1234567')).toBe(false);
		expect(isWellFormedTwoFactorCode('12345a')).toBe(false);
		expect(isWellFormedTwoFactorCode('')).toBe(false);
	});
});

test.describe('Email 2FA: constant-time verification', () => {
	test('accepts the matching code and rejects every near miss', () => {
		const code = generateTwoFactorCode();
		const stored = hashTwoFactorCode(code, SECRET);

		expect(verifyTwoFactorCodeHash(code, stored, SECRET)).toBe(true);
		expect(verifyTwoFactorCodeHash(code.split('').reverse().join(''), stored, SECRET)).toBe(
			code === code.split('').reverse().join('')
		);
		expect(verifyTwoFactorCodeHash('000000', hashTwoFactorCode('000001', SECRET), SECRET)).toBe(false);
	});

	test('a digest made under a different key never verifies', () => {
		const code = generateTwoFactorCode();
		expect(verifyTwoFactorCodeHash(code, hashTwoFactorCode(code, 'another-secret'), SECRET)).toBe(false);
	});

	test('never compares plaintext — a wrong-length or non-hex digest is refused', () => {
		expect(constantTimeEqualsHex('abcd', 'abcd')).toBe(true);
		expect(constantTimeEqualsHex('abcd', 'abcde')).toBe(false);
		expect(constantTimeEqualsHex('', '')).toBe(false);
		// `Buffer.from('zzzz', 'hex')` decodes to an EMPTY buffer, and
		// `timingSafeEqual(empty, empty)` is true — so any pair of equal-length
		// non-hex strings would compare equal without the hex guard. A
		// corrupted or planted `code_hash` must never be satisfiable.
		expect(constantTimeEqualsHex('zzzz', 'zzzz')).toBe(false);
		expect(constantTimeEqualsHex('abcz', 'abcz')).toBe(false);
		// Odd-length hex truncates on decode, so it is refused too.
		expect(constantTimeEqualsHex('abc', 'abc')).toBe(false);
	});

	test('a planted non-hex digest cannot be matched by a real code', () => {
		const code = generateTwoFactorCode();
		expect(verifyTwoFactorCodeHash(code, 'z'.repeat(64), SECRET)).toBe(false);
		expect(verifyTwoFactorCodeHash(code, '', SECRET)).toBe(false);
	});

	test('a malformed submission cannot verify even against its own digest', () => {
		// `hashTwoFactorCode('12345')` is a perfectly good digest, but the
		// submitted value is not a well-formed code, so verification refuses
		// it up front rather than admitting a short code.
		expect(verifyTwoFactorCodeHash('12345', hashTwoFactorCode('12345', SECRET), SECRET)).toBe(false);
	});
});

test.describe('Email 2FA: expiry (EW-140)', () => {
	test('expiry is the issue time plus the TTL', () => {
		const issuedAt = new Date('2026-01-01T00:00:00.000Z');
		expect(twoFactorCodeExpiry(issuedAt, 10 * 60 * 1000).toISOString()).toBe('2026-01-01T00:10:00.000Z');
	});

	test('a code inside its window is live and one past it is expired', () => {
		const now = new Date('2026-01-01T00:05:00.000Z');
		expect(isTwoFactorCodeExpired(new Date('2026-01-01T00:10:00.000Z'), now)).toBe(false);
		expect(isTwoFactorCodeExpired(new Date('2026-01-01T00:04:59.000Z'), now)).toBe(true);
	});

	test('expiry is inclusive at the boundary — a code is dead the instant it expires', () => {
		const now = new Date('2026-01-01T00:10:00.000Z');
		expect(isTwoFactorCodeExpired(new Date('2026-01-01T00:10:00.000Z'), now)).toBe(true);
	});

	test('the default TTL is the ten minutes the ticket asks for', () => {
		const issuedAt = new Date();
		const delta = twoFactorCodeExpiry(issuedAt).getTime() - issuedAt.getTime();
		expect(delta).toBe(10 * 60 * 1000);
	});
});

test.describe('Email 2FA: brute-force lockout (EW-141)', () => {
	const now = new Date('2026-01-01T00:00:00.000Z');

	test('the first four failures do not lock the account', () => {
		for (let previous = 0; previous < 4; previous++) {
			const outcome = registerFailedAttempt(previous, now, 5, 15 * 60 * 1000);
			expect(outcome.failedAttempts).toBe(previous + 1);
			expect(outcome.locked).toBe(false);
			expect(outcome.lockedUntil).toBeNull();
		}
	});

	test('the fifth failure locks the account for the lock window', () => {
		const outcome = registerFailedAttempt(4, now, 5, 15 * 60 * 1000);
		expect(outcome.failedAttempts).toBe(5);
		expect(outcome.locked).toBe(true);
		expect(outcome.lockedUntil?.toISOString()).toBe('2026-01-01T00:15:00.000Z');
	});

	test('a corrupt negative counter cannot buy extra attempts', () => {
		expect(registerFailedAttempt(-10, now, 5, 1000).failedAttempts).toBe(1);
	});

	test('a lock in the future blocks and one in the past does not', () => {
		expect(isTwoFactorLocked(new Date('2026-01-01T00:10:00.000Z'), now)).toBe(true);
		expect(isTwoFactorLocked(new Date('2025-12-31T23:59:00.000Z'), now)).toBe(false);
		expect(isTwoFactorLocked(null, now)).toBe(false);
		expect(isTwoFactorLocked(undefined, now)).toBe(false);
	});

	test('reports whole seconds until the lock lifts', () => {
		expect(twoFactorLockRetryAfterSeconds(new Date('2026-01-01T00:00:30.500Z'), now)).toBe(31);
		expect(twoFactorLockRetryAfterSeconds(new Date('2025-12-31T00:00:00.000Z'), now)).toBe(0);
		expect(twoFactorLockRetryAfterSeconds(null, now)).toBe(0);
	});

	test('remaining attempts count down to zero and never below', () => {
		expect(remainingTwoFactorAttempts(0, 5)).toBe(5);
		expect(remainingTwoFactorAttempts(3, 5)).toBe(2);
		expect(remainingTwoFactorAttempts(5, 5)).toBe(0);
		expect(remainingTwoFactorAttempts(9, 5)).toBe(0);
	});
});

test.describe('Email 2FA: TWO_FACTOR_* env parsing', () => {
	const NAME = 'TWO_FACTOR_UNIT_TEST_SETTING';

	test.afterEach(() => {
		delete process.env[NAME];
	});

	function withEnv(value: string, fallback = 600_000): number {
		process.env[NAME] = value;
		return readPositiveIntEnv(NAME, fallback);
	}

	test('a positive whole number is taken as written', () => {
		expect(withEnv('1')).toBe(1);
		expect(withEnv('900000')).toBe(900_000);
		// Exponent notation still denotes a whole number.
		expect(withEnv('1e3')).toBe(1000);
	});

	test('a positive FRACTION falls back instead of flooring to zero', () => {
		// The bug this pins: flooring turned every value below 1 into ZERO, and
		// zero is the most dangerous setting these controls can take.
		// `TWO_FACTOR_CODE_TTL_MS=0.5` made every code expire the instant it was
		// minted, so nobody with 2FA on could ever sign in; and
		// `TWO_FACTOR_MAX_ATTEMPTS=0.5` locked an account on its first wrong
		// digit. A typo must land on the documented default, not reconfigure the
		// control.
		expect(withEnv('0.5')).toBe(600_000);
		expect(withEnv('0.999')).toBe(600_000);
		expect(withEnv('.4')).toBe(600_000);
		expect(withEnv('0.5', 5)).toBe(5);
	});

	test('a fraction ABOVE one is refused too, rather than silently truncated', () => {
		// `TWO_FACTOR_MAX_ATTEMPTS=1.9` meaning "one attempt" is a guess about
		// what the operator intended; the default is the honest answer.
		expect(withEnv('1.9', 5)).toBe(5);
		expect(withEnv('600000.5')).toBe(600_000);
	});

	test('zero, negatives and nonsense fall back', () => {
		expect(withEnv('0')).toBe(600_000);
		expect(withEnv('-1')).toBe(600_000);
		expect(withEnv('-0.5')).toBe(600_000);
		expect(withEnv('abc')).toBe(600_000);
		expect(withEnv('Infinity')).toBe(600_000);
		expect(withEnv('NaN')).toBe(600_000);
	});

	test('a value beyond the safe integer range falls back', () => {
		// Above 2^53 the number no longer round-trips as itself, so honouring it
		// would silently apply a different setting than the one configured.
		expect(withEnv('9007199254740993')).toBe(600_000);
		expect(withEnv('1e400')).toBe(600_000);
	});

	test('an unset or empty variable uses the fallback', () => {
		delete process.env[NAME];
		expect(readPositiveIntEnv(NAME, 42)).toBe(42);
		expect(withEnv('', 42)).toBe(42);
	});

	test('the shipped defaults are the ones the ticket asks for', () => {
		// Guards against a future refactor changing a default by accident: ten
		// minutes of validity (EW-140), five attempts and a fifteen-minute lock
		// (EW-141). Each assertion is skipped when the runner's environment
		// overrides that setting — the constants are resolved once at import time,
		// so an operator override is a legitimate value here, not a failure.
		if (!process.env.TWO_FACTOR_CODE_TTL_MS) {
			expect(TWO_FACTOR_CODE_TTL_MS).toBe(10 * 60 * 1000);
			expect(TWO_FACTOR_CODE_TTL_MINUTES).toBe(10);
		}
		if (!process.env.TWO_FACTOR_MAX_ATTEMPTS) {
			expect(TWO_FACTOR_MAX_ATTEMPTS).toBe(5);
		}
		if (!process.env.TWO_FACTOR_LOCK_MS) {
			expect(TWO_FACTOR_LOCK_MS).toBe(15 * 60 * 1000);
		}

		// Whatever the environment says, every one of them must be a positive
		// whole number — the property the parser exists to guarantee.
		for (const value of [TWO_FACTOR_CODE_TTL_MS, TWO_FACTOR_MAX_ATTEMPTS, TWO_FACTOR_LOCK_MS]) {
			expect(Number.isSafeInteger(value)).toBe(true);
			expect(value).toBeGreaterThan(0);
		}
	});
});
