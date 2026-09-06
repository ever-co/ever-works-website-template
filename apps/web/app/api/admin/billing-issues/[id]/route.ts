import { NextResponse } from 'next/server';
import { checkAdminAuth, requireAdminSession } from '@/lib/auth/admin-guard';
import { checkDatabaseAvailability } from '@/lib/utils/database-check';
import { safeErrorResponse } from '@/lib/utils/api-error';
import { getBillingIssueById } from '@/lib/db/queries/billing-issue.queries';
import {
	BillingIssueActionError,
	isAssignableBillingIssueStatus,
	resolveBillingIssue
} from '@/lib/services/billing-issue.service';

export const runtime = 'nodejs';

/**
 * @swagger
 * /api/admin/billing-issues/{id}:
 *   get:
 *     tags: ["Admin - Billing Issues"]
 *     summary: "Get one billing issue"
 *     description: "Returns a single billing issue with the subscription and user context an admin needs to decide on it. Requires admin privileges."
 *     security:
 *       - sessionAuth: []
 *     parameters:
 *       - name: "id"
 *         in: "path"
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200: { description: "Billing issue retrieved successfully" }
 *       401: { description: "Unauthorized" }
 *       403: { description: "Forbidden - Admin access required" }
 *       404: { description: "Billing issue not found" }
 *       500: { description: "Internal server error" }
 */
export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
	try {
		const dbCheck = checkDatabaseAvailability();
		if (dbCheck) return dbCheck;

		const authError = await checkAdminAuth();
		if (authError) return authError;

		const { id } = await params;
		const issue = await getBillingIssueById(id);

		if (!issue) {
			return NextResponse.json({ success: false, error: 'Billing issue not found' }, { status: 404 });
		}

		return NextResponse.json({ success: true, data: issue });
	} catch (error) {
		return safeErrorResponse(error, 'Failed to load billing issue');
	}
}

/**
 * @swagger
 * /api/admin/billing-issues/{id}:
 *   patch:
 *     tags: ["Admin - Billing Issues"]
 *     summary: "Mark a billing issue resolved, dismissed, in review, or reopen it"
 *     description: "Moves a billing issue to a non-refund status and stamps the acting admin plus an optional note. Marking an issue refunded is done through POST /api/admin/billing-issues/{id}/refund so the money movement and the status change can never diverge. Requires admin privileges."
 *     security:
 *       - sessionAuth: []
 *     parameters:
 *       - name: "id"
 *         in: "path"
 *         required: true
 *         schema: { type: string }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: ["status"]
 *             properties:
 *               status: { type: string, enum: ["open", "in_review", "resolved", "dismissed"] }
 *               resolutionNote: { type: string }
 *     responses:
 *       200: { description: "Billing issue updated" }
 *       400: { description: "Bad request - invalid status" }
 *       401: { description: "Unauthorized" }
 *       403: { description: "Forbidden - Admin access required" }
 *       404: { description: "Billing issue not found" }
 *       409: { description: "Conflict - a refunded issue cannot be moved" }
 *       500: { description: "Internal server error" }
 */
export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
	try {
		const dbCheck = checkDatabaseAvailability();
		if (dbCheck) return dbCheck;

		const authResult = await requireAdminSession();
		if (authResult instanceof NextResponse) return authResult;
		const { session } = authResult;

		const { id } = await params;

		let body: Record<string, unknown>;
		try {
			const parsed: unknown = await request.json();
			// `null` is valid JSON: without this check the `body.status` read below
			// throws and the caller gets a 500 where a 400 is the honest answer.
			if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
				return NextResponse.json(
					{ success: false, error: 'A JSON body with a status is required' },
					{ status: 400 }
				);
			}
			body = parsed as Record<string, unknown>;
		} catch {
			return NextResponse.json(
				{ success: false, error: 'A JSON body with a status is required' },
				{ status: 400 }
			);
		}

		const status = typeof body.status === 'string' ? body.status : '';
		if (!isAssignableBillingIssueStatus(status)) {
			return NextResponse.json(
				{
					success: false,
					error: 'Invalid status. Must be one of: open, in_review, resolved, dismissed. Use the refund action to mark an issue refunded.'
				},
				{ status: 400 }
			);
		}

		// An omitted field leaves the note alone; a supplied empty string clears it.
		// Collapsing both onto `undefined` would make a stale note unremovable.
		const note = typeof body.resolutionNote === 'string' ? body.resolutionNote.trim() : undefined;

		const issue = await resolveBillingIssue({
			issueId: id,
			status,
			adminId: session.user.id,
			note
		});

		return NextResponse.json({ success: true, data: issue });
	} catch (error) {
		if (error instanceof BillingIssueActionError) {
			return NextResponse.json({ success: false, error: error.message }, { status: error.status });
		}
		return safeErrorResponse(error, 'Failed to update billing issue');
	}
}
