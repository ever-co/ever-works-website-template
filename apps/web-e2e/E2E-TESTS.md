# E2E Test Coverage

Complete listing of all E2E tests added across 5 PRs.

**Total: 195 new test cases across 47 new spec files** (excluding
continual-improvement smoke specs listed below — those are tracked
separately and add ~346 additional tests across 49 spec files).

> Governed by [Spec 010 — End-to-End Test Coverage](../../docs/spec/010-e2e-test-coverage/spec.md).
> The [implementation plan](../../docs/spec/010-e2e-test-coverage/plan.md) and
> [task list](../../docs/spec/010-e2e-test-coverage/tasks.md) capture the
> backlog (plugin registry, analytics emission, payments smoke, maps render,
> newsletter validation, client notifications) plus engineering passes
> (resilience and speed). New specs must be added to this file when they
> land and the **Total** line updated.

---

## Continual-improvement additions (2026-04-30)

Smoke specs added by automated continual-improvement runs to fill
coverage gaps that did not warrant a dedicated PR. They use only
public selectors (roles / labels / `data-testid`) and accept multiple
valid states (e.g. `/sponsor` may redirect or 404 depending on env).

| Spec file                                          | Tests | Notes                                   |
| -------------------------------------------------- | ----- | --------------------------------------- |
| `tests/auth/forgot-password.spec.ts`               | 4     | Form + back link + empty-submit guard.  |
| `tests/auth/new-password.spec.ts`                  | 2     | With and without `token` query.         |
| `tests/auth/new-verification.spec.ts`              | 2     | With and without `token` query.         |
| `tests/public/help.spec.ts`                        | 2     | Help / interactive guide page renders.  |
| `tests/public/about.spec.ts`                       | 2     | About page renders with a heading.      |
| `tests/public/comparisons.spec.ts`                 | 2     | Comparisons listing renders.            |
| `tests/public/sponsor.spec.ts`                     | 1     | `/sponsor` redirect-or-404 contract.    |
| `tests/public/docs.spec.ts`                        | 2     | `/docs` landing page renders.           |
| `tests/public/cms-page.spec.ts`                    | 2     | `/pages/[slug]` 404 + render contract.  |
| `tests/client/billing.spec.ts`                     | 2     | Dashboard billing auth + redirect.      |
| `tests/api/reference.spec.ts`                      | 2     | Scalar `/api/reference` + openapi.json. |
| `tests/api/version.spec.ts`                        | 3     | `/api/version` + `/api/version/sync`.   |
| `tests/api/webhooks.spec.ts`                       | 8     | Stripe / LS / Polar / Solidgate guards. |
| `tests/api/discovery.spec.ts`                      | 5     | Public sponsor / popularity / export.   |
| `tests/api/protected.spec.ts`                      | 10    | Auth-required endpoints reject anon.    |
| `tests/api/method-guards.spec.ts`                  | 6     | POST-only / dev-only / cron contracts.  |
| `tests/api/feature-existence.spec.ts`              | 7     | `/api/{categories,collections,surveys,items/export/settings}/exists` no-5xx. |
| `tests/api/location.spec.ts`                       | 7     | `/api/location/{countries,cities,search}` enabled / disabled contracts. |
| `tests/api/item-public.spec.ts`                    | 5     | Public per-item GET surfaces with a fake slug + unauthenticated comment POST. |
| `tests/api/cron-jobs.spec.ts`                      | 4     | Subscription expiration / reminders cron secret guards. |
| `tests/api/stripe-public.spec.ts`                  | 1     | Public `/api/stripe/products` dynamic-pricing gate. |
| `tests/api/payment-protected.spec.ts`              | 13    | Auth-required payment / subscription / sponsor-ad surfaces. |
| `tests/api/admin-protected-extra.spec.ts`          | 36    | Admin-only endpoints across every slice (categories, clients, comments, companies, featured-items, geo-analytics, items helpers, location-index, navigation, notifications, reports, roles, settings, sponsor-ads, tags, twenty-crm, users). |
| `tests/api/client-protected.spec.ts`               | 8     | `/api/client/**` (dashboard stats, geo-stats, items, items/coordinates, items/stats, import surfaces). |
| `tests/api/surveys.spec.ts`                        | 8     | Auth-gated `/api/surveys` CRUD + per-survey responses + per-response detail. |
| `tests/api/payment-checkouts.spec.ts`              | 28    | Auth-gated checkout / payment-method / setup-intent / subscription mutation routes for Stripe, LemonSqueezy, Polar, Solidgate + sponsor-ad lifecycle. |
| `tests/api/auth-change-password.spec.ts`           | 2     | `/api/auth/change-password` no-session / empty-body contracts. |
| `tests/api/location-coordinates.spec.ts`           | 3     | `/api/location/coordinates` enabled / disabled feature gate. |
| `tests/api/user-profile-location.spec.ts`          | 2     | `/api/user/profile/location` GET + PUT no-session contracts. |
| `tests/api/reports.spec.ts`                        | 2     | `/api/reports` no-session / empty-body contracts. |
| `tests/public/newsletter-unsubscribe.spec.ts`      | 2     | `/newsletter/unsubscribe` with / without token. |
| `tests/public/integration.spec.ts`                 | 3     | `/integration/{analytics,posthog,speed-insights}` showcase pages. |
| `tests/public/admin-pages-protected.spec.ts`       | 18    | `/admin/**` and `/dashboard/**` page routes redirect anonymous visitors without 5xx. |
| `tests/public/pricing-success.spec.ts`             | 2     | `/pricing/success` post-checkout landing renders with and without query params. |
| `tests/public/listing-paginated.spec.ts`           | 6     | Paginated listings: `/discover/[page]`, `/collections/paging[/page]`, `/tags/paging[/page]` no-5xx. |
| `tests/public/legacy-routing.spec.ts`              | 5     | Legacy / nested catch-alls: `/categories/category/[...]`, `/tags/tag/[...]`, listing `/tags/[...tag]` no-5xx. |
| `tests/public/item-survey-public.spec.ts`          | 2     | Public `/items/[slug]/surveys/[surveySlug]` survey-response page no-5xx for unknown slugs. |
| `tests/public/dashboard-surveys-protected.spec.ts` | 3     | `/dashboard/items/[itemId]/surveys[/preview|/responses]` redirect-or-404 contract. |
| `tests/api/admin-by-id.spec.ts`                    | 47    | Admin per-`[id]` REST routes across categories, clients, collections (+ items helper), comments, companies, featured-items, items (+ history / review / import), notifications read, reports, roles (+ permissions), sponsor-ads (+ approve / cancel / reject), tags, users, plus settings POST. |
| `tests/api/items-engagement-and-favorites.spec.ts` | 11    | Public `/api/items/engagement` (4) + auth-gated comment-by-id PUT/DELETE, vote toggle/clear, favorites GET/POST + favorites/[itemSlug] DELETE (7). |
| `tests/public/admin-by-id-pages-protected.spec.ts` | 18    | Admin per-`[id]` and `/client/**` page routes (admin/clients/[id], admin/surveys/[slug]/edit/preview/responses, admin signin, client dashboard / profile / settings (+ profile/billing/location/portfolio/theme-colors / submissions/trash), client sponsorships, client submissions, client trash) — non-5xx contract for anonymous visitors. |
| `tests/api/item-votes-public.spec.ts`              | 2     | Public `GET /api/items/[slug]/votes` non-existent-slug contract — no-5xx + non-error JSON envelope. Closes the last public per-item GET surface that was implicit rather than explicit. |
| `tests/public/per-slug-public.spec.ts`             | 3     | Per-slug public detail pages with unknown slugs: `/comparisons/[slug]`, `/categories/[category]`, `/tags/[tag]` — exercises the `notFound()` / disabled-feature branch with a non-5xx contract. Complements the legacy `(listing)` versions in `legacy-routing.spec.ts`. |
| `tests/api/item-comment-rating-by-id.spec.ts`      | 2     | `/api/items/[slug]/comments/rating/[commentId]` GET + PATCH for a non-existent comment id — no-5xx contract. Closes the last `/api/items/[slug]/**` per-comment route that was not explicitly smoke-tested. |
| `tests/api/item-company-write.spec.ts`             | 2     | `POST` and `DELETE` `/api/items/[slug]/company` (admin-only company assign / unassign) — no-5xx contract for anonymous callers. The matching `GET` is already covered in `payment-protected.spec.ts`; this closes the per-item company-assignment write surface. |
| `tests/public/per-survey-public.spec.ts`           | 1     | Public per-survey detail page `/surveys/[slug]` with an unknown slug — exercises the `notFound()` / disabled-feature branch with the same non-5xx contract as the rest of the smoke layer. Closes the last public-survey page surface that was implicit rather than explicit (the listing page sits in `public/surveys.spec.ts`, dashboard owner flow in `public/dashboard-surveys-protected.spec.ts`, admin per-slug pages in `public/admin-by-id-pages-protected.spec.ts`, and the REST surface in `api/surveys.spec.ts`). |
| `tests/api/nextauth-discovery.spec.ts`             | 9     | NextAuth catch-all (`/api/auth/[...nextauth]`) public discovery surface: GET `providers`, `csrf`, `session`, `signin`, `signout`, `error`; plus POST `signout` (no CSRF), POST `callback/credentials` (empty body), and GET `callback/<unknown>` — no-5xx contract. Closes the last NextAuth-managed surface that was implicit rather than explicit (the custom `/api/auth/change-password` helper sits in `auth-change-password.spec.ts`). |
| `tests/public/seo-manifests.spec.ts`               | 4     | Public SEO / manifest surface generated by `app/{robots,sitemap,opengraph-image}.{ts,tsx}` and the static favicon: `/robots.txt` (with content sanity check), `/sitemap.xml` (XML sanity check), `/opengraph-image`, `/favicon.ico` — no-5xx contract. Closes the last public crawler-/preview-bot surface that was implicit rather than explicit. |
| `tests/api/client-item-restore.spec.ts`            | 1     | Auth-gated `POST /api/client/items/[id]/restore` (soft-delete restore action) — no-5xx contract for anonymous callers. The matching CRUD surface (`GET / PATCH / DELETE /api/client/items/[id]`) is already smoked via `client-protected.spec.ts`; this closes the last `/api/client/**` per-id surface that was implicit rather than explicit. |
| `tests/api/client-items-id-restore-method.spec.ts` | 22    | Per-source-file POST body / header smoke of the **`requireClientAuth()`-gated soft-delete restore action** (`POST /api/client/items/[id]/restore`) — pins the canonical `{ success: false, error: 'Unauthorized. Please sign in to continue.' }` longer-message TWO-key 401 envelope, a strict envelope-shape preservation walk, a gate-before-post-auth invariant pinning the THREE-branch repo-error catch dispatcher (`'Item not found'` exact → 404, `'permission'` substring → 403, `'not deleted'` substring → 400) and the `'Failed to restore item'` outer-catch default never leak on unauth, a `restoreForUser`-not-entered CRITICAL invariance (XSS markers in body never echoed, repo never executes), a gate-before-Zod-path-param-validation invariant, a method-resolution probe (`GET / PUT / PATCH / DELETE` < 500), a side-channel walk (Cookie / X-User-Id / Authorization), and cross-id + cross-permutation byte-identical 401 envelope walks. Documented at [`docs/plugins/client-items-id-restore-method-spec.md`](../../docs/plugins/client-items-id-restore-method-spec.md). Companion to the broader smoke at `client-item-restore.spec.ts` which stays as the single-test "did it 5xx?" canary. |
| `tests/api/items-popularity-scores.spec.ts`        | 15    | Public `GET /api/items/popularity-scores` query-param surface — exercises the `parseInt` + `Math.min(value, 100)` clamp on `limit` (valid integers, `999` / `10000` clamp targets, empty string → default fallback, non-integer / negative / zero edge cases) and the `locale` default + unknown-locale fallback (`en`, `fr`, `zh`, an unknown locale, plus combined `limit` + `locale` queries). Complements the single happy-path entry already smoked in `discovery.spec.ts` so a regression in the route's parameter parsing surfaces as a failing case rather than a silent change in scoring output. No-5xx contract; payload shape is intentionally not asserted because the score breakdown varies with the active data repository / database state. |
| `tests/api/items-export-query.spec.ts`             | 10    | Public `GET /api/items/export` query-param surface — exercises the Zod-validated `format` enum (`'csv' \| 'xlsx'`) defined in `apps/web/lib/validations/item-import.ts#exportQuerySchema`: both valid values (`csv`, `xlsx`), the empty-string rejection (`format=`), the unknown-value rejection (`format=invalid`, `format=json`), the case-sensitivity check (`format=CSV` / `format=XLSX`), and the unknown-extra-key passthrough (`format=csv&unknown=value`). Complements the single happy-path entry already smoked in `discovery.spec.ts` so a regression in the schema, the default-on-omit fallback, the rate-limit short-circuit, or the `getExportEnabled()` feature-flag gate surfaces as a failing case rather than a silent change in export behaviour. No-5xx contract; payload shape and `Content-Type` are intentionally not asserted because the response is either a 403 / 4xx JSON envelope or a binary CSV / XLSX stream depending on whether the export feature flag is on for the active config repository. |
| `tests/api/item-vote-count-query.spec.ts`          | 39    | Public `GET /api/items/[slug]/votes/count` query-param surface — the route's handler signature is `GET(request, context)` where `request` is **declared but never read**: the body only awaits `context.params` and calls `getVoteCountForItem(slug)`. Walks every plausible query-param shape a future contributor might add (`?userId=`, `?include=` / `?fields=` / `?select=` for breakdown projection, `?expand=` for hydration, `?refresh=` / `?force=` / `?fresh=` for cache-busting, `?format=` for content-negotiation, `?locale=` / `?lang=` for i18n, `?since=` / `?from=` / `?until=` for time-window queries, `?direction=` for upvote/downvote splits, plus empty values, repeated keys, special-character payloads, long payloads, and bogus typo'd keys), and asserts the bulk-loop `< 500` contract, the canonical `{ success, count }` envelope shape on the happy path (returns `{ success: true, count: 0 }` for an unknown slug because `getVoteCountForItem` falls back to `0` rather than throwing), the status-invariance between the no-arg and parameter-laden branches, and a multi-permutation shape-stability assertion across three distinct parameter sets. Complements the single non-existent-slug entry already smoked in `item-public.spec.ts` so a regression that introduces a `request.url`-based wiring (which a future "filter by user" or "include breakdown" feature might tempt a future contributor into adding) is caught immediately. |
| `tests/api/admin-settings-map-status-query.spec.ts` | 62    | Admin-gated `GET /api/admin/settings/map-status` query-param surface — the **first** admin-tree route the smoke layer covers that uses the `getCachedApiSession(req)` request-scoped session resolver (rather than the bare `auth()` call every other admin-tree route uses), the bare `{ error: 'Unauthorized' }` envelope (rather than the canonical `{ success: false, error }` envelope every other admin-tree route emits), and a per-environment publishable-key non-disclosure contract (the success branch returns booleans derived from `Boolean(process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN)` and `Boolean(process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY)`, never the actual values). Walks 49 query-param paths plus 12 hand-written scenarios: a bulk-loop `< 500` contract, a bare-`{ error }` envelope assertion (with `body.success` undefined check to catch a regression that adopts the canonical envelope), eight per-key isolation walks (`?provider=` / `?include=` / `?isAdmin=` / `?userId=` / `?token=` / `?bypass=` / `?reveal=` / `Accept` header), and a deliberate negative-string assertion that the unauth response body does NOT contain a Mapbox public access token (`pk.*` regex), Google Maps API key (`AIza*` regex), or either env-var name as a substring. Documented at [`docs/plugins/admin-settings-map-status-query-spec.md`](../../docs/plugins/admin-settings-map-status-query-spec.md) — the **third** per-source-file reference the docs tree publishes for any file under `apps/web-e2e/tests/` and the **first** under `apps/web-e2e/tests/api/`. |
| `tests/api/admin-twenty-crm-config-query.spec.ts`  | 65    | Admin-gated `GET /api/admin/twenty-crm/config` query-param surface — the **first** admin-tree route the smoke layer covers that documents the route-specific `'Unauthorized. Admin access required.'` error string combined with a bare `GET()` handler signature (no `request` parameter; zero `searchParams` surface inside the handler) and the canonical `{ success: false, error }` envelope. Distinct from the immediately-preceding `admin-settings-map-status-query.spec.ts` which uses the request-bearing `GET(req: NextRequest)` signature with the bare `{ error }` envelope. Walks 52 query-param paths plus 13 hand-written scenarios: a bulk-loop `< 500` contract, a route-specific Unauthorized-envelope assertion, seven per-key isolation walks (`?syncMode=` / `?reveal=` / `?isAdmin=` / `?userId=` / `?token=` / `?bypass=` / `Accept` header), a per-tenant CRM-credential non-disclosure assertion that the unauth response body does NOT contain the masked-API-key regex (`/\*{4}[A-Za-z0-9]{4}/`), the `TWENTY_CRM_API_KEY` / `TWENTY_CRM_BASE_URL` env-var names, or the config sub-field names (`apiKey` / `baseUrl` / `syncMode`), and a cross-route error-string isolation assertion that the GET response error does NOT echo any of `'Unauthorized'` / `'Forbidden'` / `'Failed to retrieve configuration'` / `'User ID not found'` / `'Insufficient permissions'`. Documented at [`docs/plugins/admin-twenty-crm-config-query-spec.md`](../../docs/plugins/admin-twenty-crm-config-query-spec.md) — the **fourth** per-source-file reference the docs tree publishes for any file under `apps/web-e2e/tests/` and the **second** under `apps/web-e2e/tests/api/`. |

---

## PR #621 — P0: Critical Business Flows (21 new tests)

### Admin Item CRUD (`tests/admin/items-crud.spec.ts`)
1. admin can create a new item via multi-step form
2. admin can edit an existing item
3. admin can delete an item

### Admin Item Search & Filter (`tests/admin/items-filter.spec.ts`)
4. search bar filters items by name
5. search bar shows empty state for non-matching term
6. status tabs filter items by status
7. clearing search restores full item list

### Admin Item Review (`tests/admin/items-review.spec.ts`)
8. admin can approve a pending item from the actions menu
9. admin can reject a pending item with a reason

### Client Submit & Manage (`tests/client/submit-and-manage.spec.ts`)
10. client can submit a new item via the submit form
11. client can view submission details
12. client can edit a submission
13. client can delete a submission

### Client Favorites Toggle (`tests/client/favorites-toggle.spec.ts`)
14. authenticated client can add and remove a favorite on item detail
15. favorited item appears on favorites page

### Item Votes (`tests/public/votes-and-comments.spec.ts`)
16. authenticated client can upvote and remove upvote
17. unauthenticated user sees vote button

### Item Comments (`tests/public/votes-and-comments.spec.ts`)
18. authenticated client can post a comment
19. authenticated client can edit their own comment
20. authenticated client can delete their own comment
21. unauthenticated user sees sign-in prompt instead of comment form

---

## PR #623 — P1: Admin Management (54 new tests)

### Admin Tags (`tests/admin/tags.spec.ts`)
22. admin can access tags management page
23. admin can create a new tag
24. admin can edit an existing tag
25. admin can delete a tag using native confirm dialog
26. tags page shows tag count in stats

### Admin Collections (`tests/admin/collections.spec.ts`)
27. admin can access collections management page
28. admin can create a new collection
29. admin can edit an existing collection
30. admin can delete a collection using native confirm dialog
31. collections page displays stats cards

### Admin Featured Items (`tests/admin/featured-items.spec.ts`)
32. admin can access featured items page
33. featured items page displays stats cards
34. admin can open add featured item modal
35. search input filters featured items
36. active-only toggle filters items

### Admin Roles (`tests/admin/roles.spec.ts`)
37. admin can access roles management page
38. roles page displays stats cards
39. admin can search roles
40. admin can open add role form modal

### Admin Comments (`tests/admin/comments.spec.ts`)
41. admin can access comments management page
42. comments page displays comment list
43. admin can search comments
44. admin can open delete comment dialog

### Admin Reports (`tests/admin/reports.spec.ts`)
45. admin can access reports management page
46. reports page displays stats cards
47. status tabs filter reports
48. admin can open review dialog for a report
49. reports page shows empty state for non-matching search

### Admin Companies (`tests/admin/companies.spec.ts`)
50. admin can access companies management page
51. admin can open create company modal
52. admin can create a new company
53. admin can open delete company confirmation

### Admin Surveys (`tests/admin/surveys.spec.ts`)
54. admin can access surveys management page
55. surveys page shows create survey button
56. filter buttons switch between All, Global, and Item surveys
57. survey list shows edit and delete actions

### Admin Settings (`tests/admin/settings.spec.ts`)
58. admin can access settings page
59. settings page has accordion sections
60. admin can expand General Settings section
61. admin can expand Homepage Settings section
62. admin can expand Header Settings section
63. admin can expand Monetization Settings section

### Admin Sponsorships (`tests/admin/sponsorships.spec.ts`)
64. admin can access sponsorships management page
65. sponsorships page displays stats and content
66. admin can search sponsorships

### Admin Clients (`tests/admin/clients.spec.ts`)
67. admin can access clients management page
68. clients page displays client list
69. admin can open create client modal
70. admin can open delete client confirmation

### Admin Notifications (`tests/admin/notifications.spec.ts`)
71. notification bell button is visible in admin header
72. clicking bell opens notifications dropdown
73. closing notifications dropdown works
74. notifications dropdown shows content or empty state
75. refresh button triggers notification reload

---

## PR #628 — P2: UI Interactions & Public Pages (40 new tests)

### Theme Toggle (`tests/public/theme-toggle.spec.ts`)
76. theme toggle button is visible in header
77. clicking theme toggle opens dropdown
78. switching to dark mode applies dark class to html
79. switching to light mode removes dark class from html

### Language Switcher (`tests/public/language-switcher.spec.ts`)
80. language switcher button is visible in header
81. clicking language switcher opens dropdown
82. selecting French navigates to /fr locale
83. selecting Spanish navigates to /es locale

### View Toggle (`tests/public/view-toggle.spec.ts`)
84. view toggle buttons are visible on listing page
85. switching to grid view changes the active button
86. switching to list view changes the active button
87. masonry view button toggles correctly

### Public Search Bar (`tests/public/search.spec.ts`)
88. search input is visible on homepage
89. typing in search bar filters content
90. clearing search restores original content

### Scroll to Top (`tests/public/scroll-to-top.spec.ts`)
91. scroll-to-top button is hidden at the top of the page
92. scroll-to-top button appears after scrolling down
93. clicking scroll-to-top scrolls the page to the top

### Newsletter Signup (`tests/public/newsletter.spec.ts`)
94. newsletter email input is visible in footer
95. newsletter form requires email input
96. newsletter form accepts valid email input

### Public Collections (`tests/public/collections.spec.ts`)
97. collections page loads with heading
98. collections page displays collection items
99. clicking a collection navigates to collection detail

### Error Pages (`tests/public/error-pages.spec.ts`)
100. non-existent page shows 404 content
101. 404 page has navigation back to home
102. non-existent item slug shows 404 or error
103. unauthorized page renders access denied content
104. unauthorized page has navigation options

### i18n: Multiple Locales (`tests/i18n/locale-depth.spec.ts`)
105. /fr homepage loads without error
106. /es homepage loads without error
107. /de homepage loads without error
108. /zh homepage loads without error

### i18n: Content Translation (`tests/i18n/locale-depth.spec.ts`)
109. French page renders translated content (not English)
110. Spanish page renders translated content

### i18n: Locale-Prefixed Routes (`tests/i18n/locale-depth.spec.ts`)
111. French discover page loads correctly
112. German categories page loads correctly
113. Chinese pricing page loads correctly

### i18n: RTL Layout Depth (`tests/i18n/locale-depth.spec.ts`)
114. Arabic discover page has RTL layout
115. Arabic categories page has RTL layout

---

## PR #630 — P3: Remaining Coverage Gaps (50 new tests)

### Admin Bulk Operations (`tests/admin/bulk-actions.spec.ts`)
116. select-all checkbox is visible on items page
117. clicking select-all shows bulk action bar
118. bulk action bar has approve, reject, and delete buttons
119. clicking bulk delete opens confirmation dialog
120. clear selection removes bulk action bar

### Admin Data Export (`tests/admin/data-export.spec.ts`)
121. admin dashboard has export format buttons
122. include metadata checkbox is available
123. export/download buttons are available

### Client Profile Settings (`tests/client/profile.spec.ts`)
124. client can access settings page
125. settings page shows settings cards grid
126. client can access basic info form
127. basic info form has save button
128. display name field accepts input

### Client Submissions Trash (`tests/client/trash.spec.ts`)
129. client can access submissions trash page
130. trash page shows items or empty state
131. trash page has back link to submissions

### Sort Menu (`tests/public/sort-menu.spec.ts`)
132. sort trigger button is visible on listing page
133. clicking sort trigger opens dropdown menu
134. selecting a sort option updates the trigger label

### Share Button (`tests/public/share-button.spec.ts`)
135. share button is visible on item detail page
136. clicking share button opens dropdown with social options

### Star Rating (`tests/public/star-rating.spec.ts`)
137. star rating component is visible in comment form for authenticated user
138. clicking a star updates the rating value
139. all 5 star buttons are present

### Profile Dropdown (`tests/public/profile-dropdown.spec.ts`)
140. profile button is visible for authenticated admin
141. clicking profile button opens menu
142. profile menu contains menu items
143. profile menu has logout button
144. pressing Escape closes profile menu

### Login Modal (`tests/public/login-modal.spec.ts`)
145. unauthenticated user clicking favorite triggers login prompt
146. comment section shows sign-in prompt for unauthenticated user

### Public Surveys (`tests/public/surveys.spec.ts`)
147. surveys page loads or returns 404 if disabled
148. surveys page shows heading
149. surveys page displays survey cards or empty state

### Form Validation: Sign-in (`tests/public/form-validation.spec.ts`)
150. sign-in form rejects empty email
151. sign-in form rejects empty password
152. sign-in form shows error for invalid credentials

### Form Validation: Registration (`tests/public/form-validation.spec.ts`)
153. registration form rejects mismatched or missing fields

### API: Comments (`tests/api/comments.spec.ts`)
154. GET comments for an item returns valid response

### API: Votes (`tests/api/comments.spec.ts`)
155. GET vote status for an item returns valid response

### API: Auth (`tests/api/comments.spec.ts`)
156. GET /api/current-user returns user data when authenticated
157. GET /api/current-user returns 401 when unauthenticated

## PR #1049 — Admin billing issues & payment reports (30 new tests)

Specs 046 / 047 (Jira EW-116, EW-117). Two admin surfaces over the payment
records the site already stores. The API specs carry most of the weight here
because these are the only routes in the template that move money or emit a file
full of customer data — the gate, not the happy path, is the invariant.

### Admin Billing Issues (`tests/admin/billing-issues.spec.ts`)
158. page loads with its heading for an admin
159. shows the status tabs, the search box and the re-scan control
160. either lists issues or renders the empty state, never a crash
161. opening a row shows the action dialog when an issue exists
162. the refund control stays disabled until a payment reference is present
163. rejects an authenticated non-admin
164. gates an anonymous visitor

### Admin Payment Reports (`tests/admin/payment-reports.spec.ts`)
165. page loads with its heading for an admin
166. exposes every documented filter control (date range, plan, status, provider)
167. exposes both export controls (CSV, XLSX)
168. applying a filter keeps the page rendering
169. the CSV export downloads a file
170. rejects an authenticated non-admin
171. gates an anonymous visitor

### API: Admin Billing Issues (`tests/api/admin-billing-issues-query.spec.ts`)
172. the refund route never lets an anonymous caller move money
173. PATCH rejects the `refunded` status, which only a successful provider call may set
174. the refund route rejects a non-positive or fractional amount
175. a malformed refund body is a 400, never a silent FULL refund
176. a PATCH body of JSON `null` is a 400, not a 500
177. fractional pagination is rejected instead of reaching the database
178. a whitespace-only POST body is a 400, not a silent re-scan that writes rows
179. a manual create with an out-of-tenant user, or an invalid amount, is a 400
180. a supplied but non-numeric `amount` is a 400, never a silent full refund
181. an omitted `amount` key still means a full refund

### API: Admin Payment Reports (`tests/api/admin-payment-reports-query.spec.ts`)
182. the export never leaks a file to an anonymous caller
183. list and export reject the same malformed date range (one shared validator)
184. `?format=pdf` is a 400 naming the supported formats; CSV carries a header row and XLSX is a real ZIP
185. a calendar-invalid date (`2026-02-30`) is rejected on both routes, not silently rolled over
186. fractional pagination is rejected instead of reaching the database
187. every roll-up row carries its own currency, so no amount can be mislabelled

> The counts above name the load-bearing assertions. Both API specs also sweep
> their full query-param surface (~50 and ~45 URLs) for "never 5xx, never bypass
> the gate", in the same shape as `admin-reports-query.spec.ts`.

---

## Coverage by Area

| Area | Tests | PR |
|------|-------|----|
| Admin Item CRUD/Review/Filter | 9 | #621 |
| Admin Tags | 5 | #623 |
| Admin Collections | 5 | #623 |
| Admin Featured Items | 5 | #623 |
| Admin Roles | 4 | #623 |
| Admin Comments | 4 | #623 |
| Admin Reports | 5 | #623 |
| Admin Companies | 4 | #623 |
| Admin Surveys | 4 | #623 |
| Admin Settings | 6 | #623 |
| Admin Sponsorships | 3 | #623 |
| Admin Clients | 4 | #623 |
| Admin Notifications | 5 | #623 |
| Admin Bulk Operations | 5 | #630 |
| Admin Data Export | 3 | #630 |
| Client Submit & Manage | 4 | #621 |
| Client Favorites | 2 | #621 |
| Client Profile Settings | 5 | #630 |
| Client Submissions Trash | 3 | #630 |
| Votes & Comments | 6 | #621 |
| Theme Toggle | 4 | #628 |
| Language Switcher | 4 | #628 |
| View Toggle | 4 | #628 |
| Search Bar | 3 | #628 |
| Scroll to Top | 3 | #628 |
| Newsletter Signup | 3 | #628 |
| Sort Menu | 3 | #630 |
| Share Button | 2 | #630 |
| Star Rating | 3 | #630 |
| Profile Dropdown | 5 | #630 |
| Login Modal | 2 | #630 |
| Public Collections | 3 | #628 |
| Public Surveys | 3 | #630 |
| Error Pages (404/403) | 5 | #628 |
| Form Validation | 4 | #630 |
| i18n Locales & RTL | 11 | #628 |
| API Contracts | 4 | #630 |
| Admin Billing Issues | 7 | #1049 |
| Admin Payment Reports | 7 | #1049 |
| API: Admin Billing Issues | 10 | #1049 |
| API: Admin Payment Reports | 6 | #1049 |
| **Total** | **195** | |

---

## Not Covered (Require External Services)

The following scenarios are intentionally excluded because they require external service integration, sandbox environments, or infrastructure that cannot be tested in a standard E2E setup:

- **Payment flows** — Stripe checkout modal, sponsorship checkout (need Stripe sandbox)
- **Executing a refund end to end** — `/admin/billing-issues` refund action (needs a live provider; the specs cover the gate, the validation and the 404-before-provider-call branch instead)
- **Email flows** — Password reset, email verification (need email infrastructure)
- **Geo Analytics** — `/api/admin/geo-analytics` (needs geo service API keys)
- **Map Status** — `/admin/settings/map-status` (needs map provider API keys)
- **CRM Integration** — Twenty CRM config/test connection (needs CRM instance)
- **Session expiry** — Mid-session redirect to sign-in (hard to simulate reliably)
- **Infinite scroll** — Sentinel-based loading (requires specific data volume)
- **Feature flag states** — Components hidden when flags off (requires flag control)
