import { NextResponse } from 'next/server';
import { checkAdminAuth, requireAdminSession } from '@/lib/auth/admin-guard';
import { checkDatabaseAvailability } from '@/lib/utils/database-check';
import { safeErrorResponse } from '@/lib/utils/api-error';
import {
	createBillingIssue,
	listBillingIssues,
	syncBillingIssuesFromSubscriptions
} from '@/lib/db/queries/billing-issue.queries';
import {
	BillingIssueStatus,
	BillingIssueType,
	type BillingIssueStatusValues,
	type BillingIssueTypeValues
} from '@/lib/db/schema';
import { PaymentProvider } from '@/lib/constants/payment';
import { validatePaginationParams } from '@/lib/utils/pagination-validation';
import { firstNonIntegerParam } from '@/lib/utils/integer-query-param';
import { BillingIssueReferenceError } from '@/lib/db/queries/billing-issue.queries';

export const runtime = 'nodejs';

const VALID_STATUSES = Object.values(BillingIssueStatus) as string[];
const VALID_TYPES = Object.values(BillingIssueType) as string[];
const VALID_PROVIDERS = Object.values(PaymentProvider) as string[];

/**
 * @swagger
 * /api/admin/billing-issues:
 *   get:
 *     tags: ["Admin - Billing Issues"]
 *     summary: "List billing issues"
 *     description: "Paginated list of billing issues (failed payments, refund requests, disputes, bad subscription states) with the subscription and user context needed to act on them. Requires admin privileges."
 *     security:
 *       - sessionAuth: []
 *     parameters:
 *       - name: "page"
 *         in: "query"
 *         schema: { type: integer, minimum: 1, default: 1 }
 *       - name: "limit"
 *         in: "query"
 *         schema: { type: integer, minimum: 1, maximum: 100, default: 10 }
 *       - name: "search"
 *         in: "query"
 *         schema: { type: string }
 *         description: "Matches user email, provider payment id, subscription id, detection reason or resolution note"
 *       - name: "status"
 *         in: "query"
 *         schema: { type: string, enum: ["open", "in_review", "refunded", "resolved", "dismissed"] }
 *       - name: "type"
 *         in: "query"
 *         schema: { type: string, enum: ["payment_failed", "refund_request", "dispute", "subscription_state", "other"] }
 *       - name: "provider"
 *         in: "query"
 *         schema: { type: string, enum: ["stripe", "solidgate", "lemonsqueezy", "polar"] }
 *     responses:
 *       200: { description: "Billing issues retrieved successfully" }
 *       400: { description: "Bad request - invalid filter value" }
 *       401: { description: "Unauthorized" }
 *       403: { description: "Forbidden - Admin access required" }
 *       500: { description: "Internal server error" }
 */
export async function GET(request: Request) {
	try {
		const dbCheck = checkDatabaseAvailability();
		if (dbCheck) return dbCheck;

		const authError = await checkAdminAuth();
		if (authError) return authError;

		const { searchParams } = new URL(request.url);

		// Two steps on purpose. The shared validator parses with `parseInt`, which
		// silently truncates `limit=1.5` to 1 and answers 200 with the wrong page
		// size; the strict pre-check rejects any value that is not a whole integer
		// token, and the shared validator then applies the repo's range rules.
		const malformed = firstNonIntegerParam(searchParams, ['page', 'limit']);
		if (malformed) {
			return NextResponse.json(
				{ success: false, error: `Invalid ${malformed} parameter. Must be a whole number.` },
				{ status: 400 }
			);
		}

		const pagination = validatePaginationParams(searchParams);
		if ('error' in pagination) {
			return NextResponse.json({ success: false, error: pagination.error }, { status: pagination.status });
		}
		const { page, limit } = pagination;

		const search = (searchParams.get('search') || '').trim();
		const status = searchParams.get('status');
		const type = searchParams.get('type');
		const provider = searchParams.get('provider');

		if (status && !VALID_STATUSES.includes(status)) {
			return NextResponse.json(
				{ success: false, error: `Invalid status. Must be one of: ${VALID_STATUSES.join(', ')}` },
				{ status: 400 }
			);
		}

		if (type && !VALID_TYPES.includes(type)) {
			return NextResponse.json(
				{ success: false, error: `Invalid type. Must be one of: ${VALID_TYPES.join(', ')}` },
				{ status: 400 }
			);
		}

		if (provider && !VALID_PROVIDERS.includes(provider)) {
			return NextResponse.json(
				{ success: false, error: `Invalid provider. Must be one of: ${VALID_PROVIDERS.join(', ')}` },
				{ status: 400 }
			);
		}

		const result = await listBillingIssues({
			page,
			limit,
			search: search || undefined,
			status: (status as BillingIssueStatusValues) || undefined,
			type: (type as BillingIssueTypeValues) || undefined,
			provider: provider || undefined
		});

		return NextResponse.json({
			success: true,
			data: {
				issues: result.issues,
				pagination: {
					total: result.total,
					page: result.page,
					limit: result.limit,
					totalPages: result.totalPages
				}
			}
		});
	} catch (error) {
		return safeErrorResponse(error, 'Failed to list billing issues');
	}
}

/**
 * @swagger
 * /api/admin/billing-issues:
 *   post:
 *     tags: ["Admin - Billing Issues"]
 *     summary: "Raise a billing issue, or re-scan the payment records for new ones"
 *     description: "With `{ \"action\": \"sync\" }` the endpoint re-scans the stored subscription records for failed payments and bad subscription states and opens an issue for each new one (idempotent). Otherwise it creates a single manual issue. Requires admin privileges."
 *     security:
 *       - sessionAuth: []
 *     requestBody:
 *       required: false
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               action: { type: string, enum: ["sync"] }
 *               userId: { type: string }
 *               subscriptionId: { type: string }
 *               type: { type: string, enum: ["payment_failed", "refund_request", "dispute", "subscription_state", "other"] }
 *               paymentProvider: { type: string, enum: ["stripe", "solidgate", "lemonsqueezy", "polar"] }
 *               providerPaymentId: { type: string }
 *               amount: { type: integer, description: "Smallest currency unit" }
 *               currency: { type: string }
 *               detectionReason: { type: string }
 *     responses:
 *       200: { description: "Sync completed" }
 *       201: { description: "Billing issue created" }
 *       400: { description: "Bad request - invalid payload" }
 *       401: { description: "Unauthorized" }
 *       403: { description: "Forbidden - Admin access required" }
 *       500: { description: "Internal server error" }
 */
export async function POST(request: Request) {
	try {
		const dbCheck = checkDatabaseAvailability();
		if (dbCheck) return dbCheck;

		const authResult = await requireAdminSession();
		if (authResult instanceof NextResponse) return authResult;

		// POST both creates an issue and, with `{action:'sync'}`, WRITES rows derived
		// from the payment records. So an unreadable request must not be guessed at:
		// only a genuinely empty body means "sync" (the page's refresh button posts
		// nothing), while malformed or non-object JSON is a 400. The emptiness test
		// reads the RAW body for the same reason the refund route does: a trimmed
		// copy would let a whitespace-only payload fall through to a write.
		let body: Record<string, unknown> = { action: 'sync' };
		const rawBody = await request.text();
		if (rawBody) {
			let parsed: unknown;
			try {
				parsed = JSON.parse(rawBody);
			} catch {
				return NextResponse.json(
					{ success: false, error: 'The request body must be valid JSON, or omitted to re-scan.' },
					{ status: 400 }
				);
			}

			if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
				return NextResponse.json(
					{ success: false, error: 'The request body must be a JSON object, or omitted to re-scan.' },
					{ status: 400 }
				);
			}

			body = parsed as Record<string, unknown>;
		}

		if (body.action === 'sync' || Object.keys(body).length === 0) {
			const result = await syncBillingIssuesFromSubscriptions();
			return NextResponse.json({ success: true, data: result });
		}

		const userId = typeof body.userId === 'string' ? body.userId.trim() : '';
		if (!userId) {
			return NextResponse.json({ success: false, error: 'userId is required' }, { status: 400 });
		}

		const type = typeof body.type === 'string' ? body.type : BillingIssueType.OTHER;
		if (!VALID_TYPES.includes(type)) {
			return NextResponse.json(
				{ success: false, error: `Invalid type. Must be one of: ${VALID_TYPES.join(', ')}` },
				{ status: 400 }
			);
		}

		const paymentProvider =
			typeof body.paymentProvider === 'string' ? body.paymentProvider : PaymentProvider.STRIPE;
		if (!VALID_PROVIDERS.includes(paymentProvider)) {
			return NextResponse.json(
				{ success: false, error: `Invalid provider. Must be one of: ${VALID_PROVIDERS.join(', ')}` },
				{ status: 400 }
			);
		}

		// A supplied-but-invalid amount is a caller mistake, not a reason to record a
		// silent zero that would then understate the amount-at-risk totals.
		let amount = 0;
		if (body.amount !== undefined && body.amount !== null && body.amount !== '') {
			if (typeof body.amount !== 'number' || !Number.isInteger(body.amount) || body.amount < 0) {
				return NextResponse.json(
					{ success: false, error: 'amount must be a non-negative integer in the smallest currency unit' },
					{ status: 400 }
				);
			}
			amount = body.amount;
		}

		const issue = await createBillingIssue({
			userId,
			subscriptionId: typeof body.subscriptionId === 'string' && body.subscriptionId ? body.subscriptionId : null,
			type: type as BillingIssueTypeValues,
			status: BillingIssueStatus.OPEN,
			paymentProvider,
			providerPaymentId:
				typeof body.providerPaymentId === 'string' && body.providerPaymentId ? body.providerPaymentId : null,
			amount,
			currency: typeof body.currency === 'string' && body.currency ? body.currency : 'usd',
			detectionReason:
				typeof body.detectionReason === 'string' && body.detectionReason.trim()
					? body.detectionReason.trim()
					: 'Raised manually by an admin'
		});

		return NextResponse.json({ success: true, data: issue }, { status: 201 });
	} catch (error) {
		// A user / subscription id outside the caller's tenant is a bad request, not
		// a server fault — and must never be reported as a successful create.
		if (error instanceof BillingIssueReferenceError) {
			return NextResponse.json({ success: false, error: error.message }, { status: 400 });
		}
		return safeErrorResponse(error, 'Failed to create billing issue');
	}
}
