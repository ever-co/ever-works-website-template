import { NextResponse } from 'next/server';
import { requireAdminSession } from '@/lib/auth/admin-guard';
import { checkDatabaseAvailability } from '@/lib/utils/database-check';
import { safeErrorResponse } from '@/lib/utils/api-error';
import { BillingIssueActionError, refundBillingIssue } from '@/lib/services/billing-issue.service';

export const runtime = 'nodejs';

/**
 * @swagger
 * /api/admin/billing-issues/{id}/refund:
 *   post:
 *     tags: ["Admin - Billing Issues"]
 *     summary: "Refund the payment behind a billing issue"
 *     description: "Issues a refund through the payment provider named on the underlying subscription record (Stripe, Polar or Solidgate today; LemonSqueezy answers 409 because its refunds are dashboard-only), then records the refund id and amount on the issue, marks it refunded, and appends an entry to the subscription history. The issue is only marked refunded after the provider call succeeds, so a failed call can be retried. Omit `amount` for a full refund. Requires admin privileges."
 *     security:
 *       - sessionAuth: []
 *     parameters:
 *       - name: "id"
 *         in: "path"
 *         required: true
 *         description: "Id of the billing issue whose payment is being refunded."
 *         example: "b1c2d3e4-5678-90ab-cdef-1234567890ab"
 *         schema: { type: string }
 *     requestBody:
 *       required: false
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               amount:
 *                 type: integer
 *                 description: "Partial refund amount in the smallest currency unit. Omit for a full refund."
 *               providerPaymentId:
 *                 type: string
 *                 description: "Provider charge / payment reference to refund. Overrides the reference stored on the issue and is persisted when the refund succeeds — detection can only fill it from the invoice id the site stores, so an admin holding the real charge id can supply it here."
 *               note: { type: string }
 *     responses:
 *       200: { description: "Refund issued and the billing issue marked refunded" }
 *       400: { description: "Bad request - invalid amount" }
 *       401: { description: "Unauthorized" }
 *       403: { description: "Forbidden - Admin access required" }
 *       404: { description: "Billing issue not found" }
 *       409: { description: "Conflict - already refunded, no payment reference, or a dashboard-only provider" }
 *       502: { description: "The payment provider rejected the refund" }
 *       500: { description: "Internal server error" }
 */
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
	try {
		const dbCheck = checkDatabaseAvailability();
		if (dbCheck) return dbCheck;

		const authResult = await requireAdminSession();
		if (authResult instanceof NextResponse) return authResult;
		const { session } = authResult;

		const { id } = await params;

		// A refund is irreversible, so an unreadable request must never be guessed at.
		// Only a genuinely EMPTY body means "full refund"; malformed JSON, or JSON
		// that is not an object, is a 400 — silently treating it as an omitted body
		// would turn a typo in a partial-amount payload into a full refund.
		//
		// The emptiness test runs on the RAW body, deliberately not on a trimmed
		// copy: trimming first would collapse a whitespace-only body (`" "`, the
		// shape a truncated or mis-serialised payload arrives in) onto "no body
		// supplied" and issue a full refund. Whitespace reaches `JSON.parse`, which
		// rejects it, and the caller gets the 400 it deserves.
		let body: Record<string, unknown> = {};
		const rawBody = await request.text();
		if (rawBody) {
			let parsed: unknown;
			try {
				parsed = JSON.parse(rawBody);
			} catch {
				return NextResponse.json(
					{ success: false, error: 'The request body must be valid JSON, or omitted for a full refund.' },
					{ status: 400 }
				);
			}

			if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
				return NextResponse.json(
					{ success: false, error: 'The request body must be a JSON object, or omitted for a full refund.' },
					{ status: 400 }
				);
			}

			body = parsed as Record<string, unknown>;
		}

		// Only an ABSENT `amount` key means "refund the whole charge". Anything the
		// caller actually supplied has to be a positive integer number of smallest
		// currency units, and nothing is coerced on the way in.
		//
		// The two shapes this closes both moved money:
		//
		//   - `{"amount": null}` and `{"amount": ""}` — what a truncated or
		//     mis-serialised partial-refund payload arrives as — used to skip the
		//     block entirely, leaving `amount` undefined and issuing a FULL refund.
		//     That contradicts the rule stated above: only an empty body may do that.
		//   - `Number(body.amount)` coerced non-numbers, so `true` became 1 and
		//     `["5"]` became 5 — a malformed field turning into a silent partial
		//     refund of an arbitrary amount.
		//
		// `POST /api/admin/billing-issues` already requires `typeof === 'number'` for
		// the manual-create amount; this is the same rule on the route that actually
		// calls the provider.
		let amount: number | undefined;
		if ('amount' in body) {
			const supplied = body.amount;
			if (
				typeof supplied !== 'number' ||
				!Number.isFinite(supplied) ||
				!Number.isInteger(supplied) ||
				supplied <= 0
			) {
				return NextResponse.json(
					{ success: false, error: 'Refund amount must be a positive integer in the smallest currency unit' },
					{ status: 400 }
				);
			}
			amount = supplied;
		}

		const note = typeof body.note === 'string' ? body.note.trim() : undefined;
		const providerPaymentId =
			typeof body.providerPaymentId === 'string' ? body.providerPaymentId.trim() : undefined;

		const issue = await refundBillingIssue({
			issueId: id,
			amount,
			providerPaymentId: providerPaymentId || undefined,
			adminId: session.user.id,
			note: note || undefined
		});

		return NextResponse.json({ success: true, data: issue });
	} catch (error) {
		if (error instanceof BillingIssueActionError) {
			return NextResponse.json({ success: false, error: error.message }, { status: error.status });
		}
		return safeErrorResponse(error, 'Failed to issue the refund');
	}
}
