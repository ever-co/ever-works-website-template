/**
 * Strict integer parsing for query parameters.
 *
 * `validatePaginationParams` (and most hand-rolled parsers) use `parseInt`, which
 * reads `"1.5"` as `1` and `"2abc"` as `2`. For a page size that means the caller
 * silently gets a different result set than the one they asked for, and for a
 * fractional value that survives a clamp it can reach Postgres as a fractional
 * `LIMIT` / `OFFSET` — a 500 where a 400 belongs.
 *
 * These helpers reject anything that is not a complete integer token, so a route
 * can answer 400 before the value is parsed at all.
 */

/** True when the value is a complete, whole-number token (`"12"`, not `"1.5"`). */
export function isIntegerParam(value: string | null): boolean {
	if (value === null) return true;

	const trimmed = value.trim();
	if (!trimmed) return true;

	return /^[+-]?\d+$/.test(trimmed);
}

/**
 * Name of the first parameter in `names` that is present but not a whole integer,
 * or `null` when every one of them is acceptable.
 */
export function firstNonIntegerParam(searchParams: URLSearchParams, names: string[]): string | null {
	for (const name of names) {
		if (!isIntegerParam(searchParams.get(name))) return name;
	}
	return null;
}
