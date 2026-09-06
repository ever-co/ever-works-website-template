import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import { describe, it } from 'node:test';

import {
	constantTimeEqualsHex,
	hashTwoFactorCode,
	readPositiveIntEnv,
	verifyTwoFactorCodeHash
} from '../two-factor-code';

/**
 * Spec 047 / EW-138, EW-140, EW-141 — the security-critical primitives behind
 * email two-factor authentication.
 *
 * Run with: `pnpm --filter @ever-works/web test:unit` (this is the suite CI
 * runs on every PR; the Playwright unit spec in `apps/web-e2e/tests/unit`
 * covers the surrounding arithmetic but only runs on stage/main).
 *
 * Every call passes an explicit secret rather than depending on whatever
 * `AUTH_SECRET` the runner happens to hold — the subject here is the code, not
 * the environment.
 */
const SECRET = 'unit-test-two-factor-secret';

describe('readPositiveIntEnv', () => {
	const NAME = 'TWO_FACTOR_UNIT_TEST_SETTING';

	function withEnv(value: string, fallback = 600_000): number {
		process.env[NAME] = value;
		try {
			return readPositiveIntEnv(NAME, fallback);
		} finally {
			delete process.env[NAME];
		}
	}

	it('CONTROL: takes a positive whole number as written', () => {
		assert.equal(withEnv('1'), 1);
		assert.equal(withEnv('900000'), 900_000);
		// Exponent notation still denotes a whole number.
		assert.equal(withEnv('1e3'), 1000);
	});

	it('CONTROL: an unset or empty variable uses the fallback', () => {
		delete process.env[NAME];
		assert.equal(readPositiveIntEnv(NAME, 42), 42);
		assert.equal(withEnv('', 42), 42);
	});

	it('🛑 a positive FRACTION falls back instead of flooring to zero', () => {
		// The regression this pins. Flooring turned every value below 1 into
		// ZERO, and zero is the most dangerous setting these controls can take:
		// TWO_FACTOR_CODE_TTL_MS=0.5 made every code expire the instant it was
		// minted, so nobody with 2FA on could sign in at all, and
		// TWO_FACTOR_MAX_ATTEMPTS=0.5 locked an account on its first wrong
		// digit. A typo must land on the documented default, not silently
		// reconfigure the control.
		assert.equal(withEnv('0.5'), 600_000);
		assert.equal(withEnv('0.999'), 600_000);
		assert.equal(withEnv('.4'), 600_000);
		assert.equal(withEnv('0.5', 5), 5);
	});

	it('🛑 a fraction ABOVE one is refused too, rather than truncated', () => {
		// `TWO_FACTOR_MAX_ATTEMPTS=1.9` meaning "one attempt" is a guess about
		// what the operator intended; the default is the honest answer.
		assert.equal(withEnv('1.9', 5), 5);
		assert.equal(withEnv('600000.5'), 600_000);
	});

	it('zero, negatives and nonsense fall back', () => {
		for (const value of ['0', '-1', '-0.5', 'abc', 'Infinity', 'NaN']) {
			assert.equal(withEnv(value), 600_000, value);
		}
	});

	it('a value beyond the safe integer range falls back', () => {
		// Past 2^53 a number no longer round-trips as itself, so honouring it
		// would apply a different setting than the one configured.
		assert.equal(withEnv('9007199254740993'), 600_000);
		assert.equal(withEnv('1e400'), 600_000);
	});
});

describe('hashTwoFactorCode', () => {
	it('is a KEYED digest — an unkeyed SHA-256 rainbow table does not reverse it', () => {
		// The code space is only 10^6, so a bare digest is reversible from a
		// database dump in about a second. The key lives in the environment and
		// never reaches the database, which is the whole point.
		const code = '135791';

		assert.notEqual(hashTwoFactorCode(code, SECRET), hashTwoFactorCode(code, 'a-different-secret'));
		assert.notEqual(hashTwoFactorCode(code, SECRET), crypto.createHash('sha256').update(code).digest('hex'));
		assert.equal(hashTwoFactorCode(code, SECRET), crypto.createHmac('sha256', SECRET).update(code).digest('hex'));
	});

	it('never contains the plaintext it hashes', () => {
		const code = '024680';
		const hash = hashTwoFactorCode(code, SECRET);

		assert.match(hash, /^[0-9a-f]{64}$/);
		assert.ok(!hash.includes(code));
	});
});

describe('constantTimeEqualsHex', () => {
	it('CONTROL: matches equal hex and rejects a near miss', () => {
		assert.equal(constantTimeEqualsHex('abcd', 'abcd'), true);
		assert.equal(constantTimeEqualsHex('abcd', 'abce'), false);
		assert.equal(constantTimeEqualsHex('abcd', 'abcde'), false);
	});

	it('🛑 refuses non-hex operands, which would otherwise compare EQUAL', () => {
		// `Buffer.from('zzzz', 'hex')` stops at the first invalid character and
		// yields an EMPTY buffer, and `timingSafeEqual(empty, empty)` is true —
		// so without the hex guard any pair of equal-length non-hex strings
		// compared equal, and a corrupted or planted `code_hash` would have been
		// satisfied by any submitted digest.
		assert.equal(constantTimeEqualsHex('zzzz', 'zzzz'), false);
		assert.equal(constantTimeEqualsHex('abcz', 'abcz'), false);
		assert.equal(constantTimeEqualsHex('', ''), false);
		// Odd-length hex truncates on decode, so it is refused too.
		assert.equal(constantTimeEqualsHex('abc', 'abc'), false);
	});
});

describe('verifyTwoFactorCodeHash', () => {
	it('CONTROL: accepts the code behind the digest', () => {
		assert.equal(verifyTwoFactorCodeHash('123456', hashTwoFactorCode('123456', SECRET), SECRET), true);
		assert.equal(verifyTwoFactorCodeHash('123 456', hashTwoFactorCode('123456', SECRET), SECRET), true);
	});

	it('a digest made under a different key never verifies', () => {
		assert.equal(verifyTwoFactorCodeHash('123456', hashTwoFactorCode('123456', 'another-secret'), SECRET), false);
	});

	it('a planted non-hex digest cannot be matched by a real code', () => {
		assert.equal(verifyTwoFactorCodeHash('123456', 'z'.repeat(64), SECRET), false);
		assert.equal(verifyTwoFactorCodeHash('123456', '', SECRET), false);
	});

	it('a malformed submission cannot verify even against its own digest', () => {
		// `hashTwoFactorCode('12345')` is a perfectly good digest, but the
		// submitted value is not a well-formed six-digit code, so verification
		// refuses it up front rather than admitting a short code.
		assert.equal(verifyTwoFactorCodeHash('12345', hashTwoFactorCode('12345', SECRET), SECRET), false);
	});
});
