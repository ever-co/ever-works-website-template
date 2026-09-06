# Ever Works Directory Web Template

## ⭐️ What is it?

Welcome to the **Ever Works Directory Web Template**, a cutting-edge, full-stack directory website solution built with [Next.js](https://nextjs.org), organized as a **Turborepo monorepo** with **pnpm workspaces**.

This versatile template is an essential component of the [Ever Works Platform](https://ever.works), offering seamless integration while remaining flexible enough to function as a standalone solution.

## 🔗 Links

- **Demo:** [https://demo.ever.works](https://demo.ever.works) (deployed from `main` branch of this repo)
- **Docs:** [https://docs.ever.works](https://docs.ever.works)
- **Ever Works website:** [https://ever.works](https://ever.works) (WIP)

### Additional Links

- Demo Dev: [https://demodev.ever.works](https://demodev.ever.works) (deployed from `develop` branch of this repo)
- Demo Stage: [https://demostage.ever.works](https://demostage.ever.works) (deployed from `stage` branch of this repo)

## Monorepo Structure

```
monorepo/
├── apps/
│   ├── web/              # Next.js 16 directory website (main app)
│   ├── web-e2e/          # Playwright E2E tests
│   └── docs/             # Docusaurus v3 documentation site (app shell)
├── docs/                 # Documentation content (MD files & assets)
│   ├── intro/            # Introduction & overview docs
│   ├── getting-started/  # Setup & quickstart guides
│   ├── architecture/     # Architecture documentation
│   ├── api/              # API reference docs
│   ├── assets/           # Documentation images & assets
│   └── ...               # Other doc categories
├── packages/
│   ├── tsconfig/         # Shared TypeScript configurations
│   └── eslint-config/    # Shared ESLint 9 flat config
├── turbo.json            # Turborepo pipeline configuration
├── pnpm-workspace.yaml   # PNPM workspace definition
└── package.json          # Root workspace package
```

> **Note:** Documentation content (Markdown files and assets) lives in the root `docs/` folder for easy discoverability, while the Docusaurus app shell (config, themes, static assets) lives in `apps/docs/`.

### Workspace Packages

| Package                     | Path                     | Description                                                |
| --------------------------- | ------------------------ | ---------------------------------------------------------- |
| `@ever-works/web`           | `apps/web`               | Next.js 16 directory website app                           |
| `@ever-works/web-e2e`       | `apps/web-e2e`           | Playwright E2E tests                                       |
| `@ever-works/docs`          | `apps/docs`              | Docusaurus v3 documentation site (content in root `docs/`) |
| `@ever-works/tsconfig`      | `packages/tsconfig`      | Shared TypeScript configurations                           |
| `@ever-works/eslint-config` | `packages/eslint-config` | Shared ESLint 9 flat config                                |

## Project Overview

### 🧱 Technology Stack

- **[TypeScript](https://www.typescriptlang.org)**
- **[Node.js](https://nodejs.org)** >= 20.19.0
- **Build System**: [Turborepo](https://turbo.build) + [pnpm](https://pnpm.io) workspaces
- **Framework**: [Next.js 16](https://nextjs.org) with App Router
- **Authentication**: [Auth.js](https://authjs.dev) / [Supabase Auth](https://supabase.com/auth)
- **ORM**: [Drizzle](https://github.com/drizzle-team/drizzle-orm)
- **Supported Databases**: [Supabase](https://supabase.com)/PostgreSQL/MySQL/SQLite
- **Styling**: [Tailwind CSS](https://tailwindcss.com)
- **UI Components**: [HeroUI React](https://www.heroui.com)
- **Internationalization**: [next-intl](https://github.com/amannn/next-intl)
- **Form Validation**: [Zod](https://zod.dev)
- **E2E Testing**: [Playwright](https://playwright.dev)
- **Notifications/Emails**: [Novu](https://novu.co) / [Resend](https://resend.com)
- **Maps**: [Mapbox GL JS](https://www.mapbox.com/) and [Google Maps JavaScript API](https://developers.google.com/maps) behind a provider abstraction
- **Hosting**: [Vercel](https://vercel.com)
- **Payment Processing**: [Stripe](https://stripe.com), [Lemon Squeezy](https://www.lemonsqueezy.com), [Polar](https://polar.sh), and [Solidgate](https://solidgate.com)
- **Security**: [Google ReCAPTCHA v2](https://cloud.google.com/security/products/recaptcha)

### 📄 Web App Structure (`apps/web/`)

```
apps/web/
├── .content/             # Git-based CMS content directory
│   ├── .works/           # Work configuration (works.yml)
│   ├── data/             # Directory items (one folder per item: <slug>.yml + <slug>.md)
│   ├── pages/            # Static pages (Markdown)
│   ├── markdown/         # Header/footer inline Markdown blocks
│   ├── blocks/           # Reusable page blocks (locale-aware)
│   ├── comparisons/      # Item-vs-item comparison content
│   ├── kb/               # Per-Work Knowledge Base (platform-internal, not rendered publicly)
│   ├── kb-originals/     # Original uploaded source files (only when storage = github-storage)
│   ├── categories.yml    # Category definitions
│   ├── collections.yml   # Collection metadata
│   ├── tags.yml          # Tag definitions
│   ├── references.yml    # Shared citations / sources
│   ├── posts/            # Blog posts
│   └── assets/           # Media files related to content
├── app/
│   ├── [locale]/         # Internationalized routes
│   ├── api/              # API routes
│   └── auth/             # Authentication pages
├── components/           # Reusable UI components
├── lib/                  # Core logic, services, repositories
├── hooks/                # Custom React hooks
├── messages/             # i18n translation files
├── public/               # Static files
└── styles/               # Global styles
```

## Getting Started

### Prerequisites

- **Node.js** >= 20.19.0
- **pnpm** 9.x (`corepack enable` to use the version pinned in `package.json`)
- PostgreSQL database (optional -- SQLite works for local dev)

### Installation

1. **Clone the repository**

    ```bash
    git clone <repository-url>
    cd ever-works-monorepo
    ```

2. **Install dependencies** (from monorepo root)

    ```bash
    pnpm install
    ```

3. **Configure environment variables**

    ```bash
    cp apps/web/.env.example apps/web/.env.local
    ```

    Fill in the required values (see [Environment Configuration](#environment-configuration) below).

4. **Set up the database** (optional)

    ```bash
    cd apps/web
    pnpm db:generate
    pnpm db:migrate
    ```

5. **Start development servers**

    ```bash
    # From monorepo root
    pnpm run dev        # Start all dev servers
    pnpm run dev:web    # Start only the web app
    pnpm run dev:docs   # Start only the docs site
    ```

    The web app will be available at [http://localhost:3000](http://localhost:3000/).

### Common Commands

| Command             | Description                              |
| ------------------- | ---------------------------------------- |
| `pnpm install`      | Install all dependencies (monorepo root) |
| `pnpm run build`    | Build all packages (via Turbo)           |
| `pnpm run dev`      | Start all dev servers (via Turbo)        |
| `pnpm run dev:web`  | Start only the web app                   |
| `pnpm run dev:docs` | Start only the docs site                 |
| `pnpm run lint`     | Lint all packages                        |
| `pnpm run format`   | Format code with Prettier                |

#### Filtering by Package

Run a command for a specific workspace package:

```bash
pnpm run --filter @ever-works/web dev
pnpm run --filter @ever-works/web build
pnpm run --filter @ever-works/docs dev
```

#### Web App Commands (from `apps/web/`)

```bash
pnpm dev              # Start dev server
pnpm build            # Production build
pnpm start            # Start built app
pnpm lint             # ESLint
pnpm tsc --noEmit     # Type-check only
pnpm db:generate      # Generate Drizzle migrations
pnpm db:migrate       # Apply migrations
pnpm db:seed          # Seed database
pnpm db:studio        # Open Drizzle Studio GUI
```

## Environment Configuration

Create a `.env.local` file in `apps/web/` with the following configuration:

### Basic Configuration

```bash
# Environment
NODE_ENV=development

# App URL
NEXT_PUBLIC_APP_URL="http://localhost:3000"

# API Configuration
NEXT_PUBLIC_API_BASE_URL="http://localhost:3000/api"
API_TIMEOUT=10000
API_RETRY_ATTEMPTS=3
API_RETRY_DELAY=1000

# Ever Works Platform API (optional)
# Used for automatic metadata extraction from URLs when submitting items, data sync, and other advanced features
# Register at https://api.ever.works to get access.
# If not configured, the extraction feature and other advanced functionality will be disabled.
# Base URL of the Ever Works Platform API:
PLATFORM_API_URL="https://api.ever.works/api" # For local dev, you should use "http://localhost:3100/api"
# Secret Token for Platform API (register at https://api.ever.works to get secret token)
PLATFORM_API_SECRET_TOKEN="your-platform-api-secret-token"

# Cookie Security
COOKIE_SECRET="your-secure-cookie-secret"  # Generate with: openssl rand -base64 32
COOKIE_DOMAIN="localhost"
COOKIE_SECURE=false
COOKIE_SAME_SITE="lax"
```

### Auth Setup

```bash
AUTH_SECRET="your-secret-key"
# Generate one with: openssl rand -base64 32

# Auth Endpoints
AUTH_ENDPOINT_LOGIN="/auth/login"
AUTH_ENDPOINT_REFRESH="/auth/refresh"
AUTH_ENDPOINT_LOGOUT="/auth/logout"
AUTH_ENDPOINT_CHECK="/auth/check"

# JWT Configuration
JWT_ACCESS_TOKEN_EXPIRES_IN=15m
JWT_REFRESH_TOKEN_EXPIRES_IN=7d
```

### GitHub Integration / Data Repository

1. Fork the data repository:
    - Visit https://github.com/ever-works/awesome-time-tracking-data
    - Click "Fork" to create a copy
    - This repo will hold `.content` data

2. Configure:

```bash
GH_TOKEN='your-github-token'
DATA_REPOSITORY='https://github.com/ever-works/awesome-time-tracking-data'
```

> 💡 The `.content` folder is created and synced automatically at startup with valid GitHub credentials.

### Database Configuration

```bash
DATABASE_URL=postgresql://user:password@localhost:5432/db_name
# Or for local dev with SQLite:
# DATABASE_URL=file:./dev.db
```

### Seeding Admin Credentials

```bash
SEED_ADMIN_EMAIL="admin@demo.ever.works"  # required in production
SEED_ADMIN_PASSWORD="a-strong-password"   # required in production
```

- In **development**, the seeder falls back to defaults (`admin@demo.ever.works` / `Passw0rd123!`).
- In **production**, both variables **must** be set; the default password is rejected.
- `SEED_FAKE_USER_COUNT` (default: 10) generates extra fake users when the `users` table is empty.

> ⚠️ Security: Never commit `.env.local`. Keep your secrets safe.

### Site Configuration (`apps/web/.content/works.yml`)

The `.content/works.yml` file controls main site settings. `works.yml` is the
only supported data repository config filename.

```yaml
company_name: Acme
content_table: false
item_name: Item
items_name: Items
copyright_year: 2025

auth:
    credentials: true
    google: true
    github: true
    microsoft: true
    fb: true
    x: true

custom_header:
    - label: 'About'
      path: '/about'
    - label: 'Documentation'
      path: '/pages/docs'
    - label: 'Blog'
      path: 'https://blog.example.com'

custom_footer:
    - label: 'Privacy Policy'
      path: '/pages/privacy-policy'
    - label: 'Terms of Service'
      path: '/terms'
    - label: 'GitHub'
      path: 'https://github.com/example'
```

### Configuration Options:

1. **Basic settings**
    - `company_name`: Your organization's name
    - `content_table`: Enable or disable content table
    - `item_name` / `items_name`: Custom item labels
    - `copyright`

2. **Auth settings**
    - Enable/disable OAuth providers
    - Use `true` to enable, `false` to disable
    - Configure corresponding OAuth keys

3. **Custom navigation** (see [Custom Navigation Documentation](docs/CUSTOM_NAVIGATION.md))
    - `custom_header`: Array of navigation items for the header menu
    - `custom_footer`: Array of links for the footer section
    - Supports internal routes, markdown pages, and external URLs
    - Supports i18n translation keys

> 💡 Note: Changes in works.yml are applied after syncing content or restarting the server.

## Content Management System

The `apps/web/.content` folder acts as a Git-based CMS, synchronized with the repository specified in the `DATA_REPOSITORY` environment variable.

### Folder Structure:

- **posts/**: Markdown files for blog articles, published at `/blog` (see [spec 050](docs/spec/050-blog-pages/spec.md))
    - One file per post: `<slug>.<locale>.md` (for example `hello-world.en.md`), or `<slug>.md` for a locale-neutral post. The slug is the URL: `/blog/hello-world`.
    - Rendered through the same MDX pipeline as static pages, so interactive content works.
    - Optional `posts/authors/<author-slug>.md` files supply an author's display name, avatar and profile URL.
    - Optional `posts/categories.yml` and `posts/tags.yml` declare canonical taxonomy names and ordering; without them, categories and tags are derived from post frontmatter.
    - `.content/blog/posts/` and `.content/blog/` are accepted as fallback locations.

    Recognised frontmatter:

    | Key                                           | Purpose                                                                        |
    | --------------------------------------------- | ------------------------------------------------------------------------------ |
    | `title`                                       | Post title. Falls back to a humanized slug.                                    |
    | `description` / `excerpt` / `summary`         | Listing excerpt. Derived from the body when omitted.                           |
    | `date` / `publishedAt` / `published_at`       | Publication date. Posts sort newest first; undated posts sort last.            |
    | `author`                                      | Author name, resolved against `posts/authors/<slug>.md` when that file exists. |
    | `category` / `categories`                     | One category or a list. Each gets a `/blog/category/<slug>` archive.           |
    | `tag` / `tags`                                | One tag or a list. Each gets a `/blog/tag/<slug>` archive.                     |
    | `image` / `heroImage` / `cover` / `thumbnail` | Featured image, shown on the card and above the post body.                     |
    | `draft: true`, `published: false`, `status`   | Hides the post from every blog surface.                                        |
    | `reading_time` / `readingTime`                | Overrides the estimate computed from the word count.                           |

    Example:

    ```markdown
    ---
    title: Introducing scheduled exports
    description: Export your directory on a schedule, with no scripting required.
    author: Ada Lovelace
    date: 2026-03-01
    category: Product Updates
    tags:
        - release
        - exports
    image: /assets/scheduled-exports.png
    ---

    Post body in Markdown...
    ```

    The Blog navigation entry and the `/blog` routes appear only when the data repository actually ships posts; a repository without a `posts/` folder renders a graceful empty state instead. Posts per page is configured in `works.yml`:

    ```yaml
    blog:
        pagination:
            per_page: 9
    ```

    A blog-only RSS feed is served at `/blog/rss.xml`, alongside the site-wide `/rss.xml`.

- **categories/**: Content organization
    - YAML files for category configuration
    - Supports nested categories
    - Metadata and category relationships

- **assets/**: Media files related to content
    - Images, documents, downloadable resources
    - Organized according to content structure

### Content Synchronization

Automatic sync via GitHub integration:

1. Content is pulled from `DATA_REPOSITORY`
2. Changes are tracked via Git
3. Updates occur periodically or on demand
4. Requires a valid `GH_TOKEN` for private repos

## 💳 Payment Integration

This template supports different payment providers: [Stripe](https://stripe.com), [Lemon Squeezy](https://www.lemonsqueezy.com), [Polar](https://polar.sh), and [Solidgate](https://solidgate.com).

### Payment Provider Configuration

The payment provider is configured in your site's config file (`apps/web/.content/works.yml`):

```yaml
# Payment configuration
payment:
    provider: 'stripe' # Options: 'stripe' | 'lemonsqueezy'

# Pricing plans
pricing:
    free: 0
    pro: 10
    sponsor: 20
```

### Stripe Setup

1. **Create Stripe Account**
    - Visit [Stripe Dashboard](https://dashboard.stripe.com/)
    - Create an account or sign in
    - Get your API keys from the Developers section

2. **Configure Environment Variables**

```bash
# Stripe Configuration
STRIPE_SECRET_KEY="sk_test_your-stripe-secret-key"
STRIPE_PUBLISHABLE_KEY="pk_test_your-stripe-publishable-key"
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY="pk_test_your-stripe-publishable-key"
STRIPE_WEBHOOK_SECRET="whsec_your-webhook-secret"

# Stripe Price IDs (create these in Stripe Dashboard)
NEXT_PUBLIC_STRIPE_STANDARD_PRICE_ID="price_your-pro-price-id"
NEXT_PUBLIC_STRIPE_PREMIUM_PRICE_ID="price_your-sponsor-price-id"
```

3. **Create Products & Prices in Stripe**
    - Go to Stripe Dashboard → Products
    - Create products for each plan (Pro, Sponsor)
    - Copy the Price IDs to your environment variables

4. **Setup Webhooks**
    - Go to Stripe Dashboard → Webhooks
    - Add endpoint: `https://yourdomain.com/api/webhooks/stripe`
    - Select events: `checkout.session.completed`, `invoice.payment_succeeded`
    - Copy webhook secret to `STRIPE_WEBHOOK_SECRET`

### LemonSqueezy Setup

1. **Create LemonSqueezy Account**
    - Visit [LemonSqueezy](https://lemonsqueezy.com/)
    - Create an account and set up your store

2. **Configure Environment Variables**

```bash
# LemonSqueezy Configuration
LEMONSQUEEZY_API_KEY="your-lemonsqueezy-api-key"
LEMONSQUEEZY_STORE_ID="your-store-id"
LEMONSQUEEZY_WEBHOOK_SECRET="your-webhook-secret"

# LemonSqueezy Product IDs
NEXT_PUBLIC_LEMONSQUEEZY_PRO_PRODUCT_ID="your-pro-product-id"
NEXT_PUBLIC_LEMONSQUEEZY_SPONSOR_PRODUCT_ID="your-sponsor-product-id"
```

3. **Create Products in LemonSqueezy**
    - Go to your LemonSqueezy store
    - Create products for each plan
    - Copy the Product IDs to your environment variables

4. **Setup Webhooks**
    - Go to Settings → Webhooks
    - Add webhook URL: `https://yourdomain.com/api/webhooks/lemonsqueezy`
    - Copy webhook secret to environment variables

### Switching Payment Providers

To switch between payment providers:

1. **Update works.yml**

```yaml
payment:
    provider: 'lemonsqueezy' # Change from 'stripe' to 'lemonsqueezy'
```

2. **Restart your application** for changes to take effect
3. **Ensure environment variables** are configured for your chosen provider

### Payment Features

- ✅ **Subscription Management**: Create, update, cancel subscriptions
- ✅ **Webhook Handling**: Automatic payment status updates
- ✅ **Customer Portal**: Self-service billing management
- ✅ **Multiple Plans**: Free, Pro, and Sponsor tiers
- ✅ **Secure Processing**: PCI-compliant payment handling
- ✅ **International Support**: Multiple currencies and payment methods

## 🗺️ Maps & Location

The template ships a full-featured map system with a provider abstraction —
the same components work with either **Mapbox** or **Google Maps**, picked
via `settings.location.provider` in `works.yml`. Items declare a
`location:` block in YAML; addresses are geocoded automatically in the
background, so authors don't have to look up latitudes and longitudes by
hand.

End users can flip listings into a **Map view** that renders markers next
to a synchronised sidebar of cards (Zillow / Airbnb style). Clicking a
marker highlights its card; clicking a card pans the map. The map also
auto-fits its bounds to the visible markers on first load.

The view appears in two places (both opt-in):

- alongside Cards / Grid / Masonry in the existing **view toggle**, and
- as a dedicated **Map** entry in the primary header navigation, gated by
  `settings.header.map_enabled`.

### Quick configuration

```yaml
# apps/web/.content/works.yml
settings:
    location:
        enabled: true # turn on location features
        provider: mapbox # or google
        map_style: streets # or satellite
        default_center: [37.7749, -122.4194] # optional

    header:
        map_enabled: true # show the Map link in the header
```

```bash
# apps/web/.env.local — set whichever provider you chose
NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN=pk.eyJ1...
# or
NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=AIza...
```

```yaml
# .content/items/some-cafe.yml
name: Some Café
slug: some-cafe
location:
    address: '123 Market Street, San Francisco, CA'
    # latitude / longitude are optional — geocoded automatically
```

See the docs for the full setup walkthrough:

- [Map View feature page](docs/features/map-view.md)
- [Map integration guide](docs/guides/map-integration-guide.md)
- [Maps & Location features](docs/features/maps-location.md)
- [Spec 011 — Maps Providers](docs/spec/011-maps-providers/spec.md)
- [Spec 017 — Map View](docs/spec/017-map-view/spec.md)

## 🔒 Security & ReCAPTCHA

### Security Notes

1. **Cookie Security**
    - httpOnly cookies are used for token storage
    - Prevents XSS attacks by making tokens inaccessible to JavaScript
    - Secure flag must be enabled in production
    - SameSite policy helps prevent CSRF attacks

2. **API Security**
    - Automatic token refresh handling
    - Request queue during token refresh
    - Exponential backoff for retries
    - Proper error handling and formatting

3. **Environment Specific**
    - Development uses relaxed security for local testing
    - Production requires strict security settings
    - Different cookie domains per environment
    - CORS configuration required for production

### ReCAPTCHA v2 Integration

This template includes Google ReCAPTCHA v2 for form protection against spam and bots.

#### Setup ReCAPTCHA

1. **Get ReCAPTCHA Keys**
    - Visit [Google ReCAPTCHA Console](https://www.google.com/recaptcha/admin/create)
    - Create a new site with reCAPTCHA v2 ("I'm not a robot" checkbox)
    - Add your domains (localhost for development, your domain for production)

2. **Configure Environment Variables**

```bash
# ReCAPTCHA Configuration
NEXT_PUBLIC_RECAPTCHA_SITE_KEY="6LeIxAcTAAAAAJcZVRqyHh71UMIEGNQ_MXjiZKhI"  # Site key (public)
RECAPTCHA_SECRET_KEY="6LeIxAcTAAAAAGG-vFI1TnRWxMZNFuojJ4WifJWe"          # Secret key (private)
```

> 💡 **Development**: The keys above are Google's test keys that always pass validation

#### ReCAPTCHA Features

- ✅ **Form Protection**: Login, registration, and contact forms
- ✅ **Server-side Verification**: Secure token validation
- ✅ **React Query Integration**: Optimized API calls with caching
- ✅ **Error Handling**: User-friendly error messages
- ✅ **Responsive Design**: Works on all device sizes
- ✅ **Accessibility**: Screen reader compatible

#### Customization

ReCAPTCHA can be enabled/disabled per form by modifying the component props:

```tsx
// Enable ReCAPTCHA
<LoginForm showRecaptcha={true} />

// Disable ReCAPTCHA
<LoginForm showRecaptcha={false} />
```

## 🌐 API Client Architecture

### Server Client Features

The template includes a robust API client (`apps/web/lib/api/server-client.ts`) with advanced features:

#### Core Features

- ✅ **Automatic Retries**: 3 attempts with exponential backoff
- ✅ **Timeout Handling**: Configurable request timeouts
- ✅ **Error Management**: Centralized error handling and logging
- ✅ **TypeScript Support**: Fully typed API responses
- ✅ **Request/Response Interceptors**: Middleware support

#### Usage Examples

```tsx
import { serverClient, apiUtils } from '@/lib/api/server-client';

// GET request
const users = await serverClient.get<User[]>('/api/users');
if (apiUtils.isSuccess(users)) {
	console.log(users.data); // TypeScript knows this is User[]
}

// POST request with data
const result = await serverClient.post('/api/auth/login', {
	email: 'user@example.com',
	password: 'password123'
});

// File upload
const file = new File(['content'], 'document.pdf');
const upload = await serverClient.upload('/api/upload', file);

// Form data submission
const contact = await serverClient.postForm('/api/contact', {
	name: 'John Doe',
	email: 'john@example.com',
	message: 'Hello world'
});
```

#### Specialized Clients

```tsx
// External API client (longer timeout, fewer retries)
import { externalClient } from '@/lib/api/server-client';
const external = await externalClient.get('https://api.external.com/data');

// ReCAPTCHA client
import { recaptchaClient } from '@/lib/api/server-client';
const verification = await recaptchaClient.verify(token);

// Custom client
import { createApiClient } from '@/lib/api/server-client';
const customClient = createApiClient('https://api.myservice.com', {
	timeout: 30000,
	retries: 5,
	headers: { Authorization: 'Bearer token' }
});
```

#### Configuration Options

```tsx
const client = new ServerClient('https://api.example.com', {
	timeout: 10000, // Request timeout (ms)
	retries: 3, // Number of retry attempts
	retryDelay: 1000, // Delay between retries (ms)
	headers: {
		// Default headers
		Authorization: 'Bearer token',
		'X-API-Version': 'v2'
	}
});
```

### Using the API Client

```typescript
import { api } from 'lib/api/api-client';

// Authentication
await api.login({ email: 'user@example.com', password: 'password' });

// Check authentication status
if (await api.isAuthenticated()) {
	// Make authenticated requests
	const response = await api.get('/protected-endpoint');
}

// Logout
await api.logout();
```

## Developer Guide

### Adding New Features

1. **Pages**: Add in `apps/web/app/[locale]`
2. **API Routes**: Create endpoints in `apps/web/app/api`
3. **Components**: Add to `apps/web/components`
4. **Business Logic**: Add to `apps/web/lib/services`
5. **Database**: Edit schema in `apps/web/lib/db/schema.ts`

### Adding New Packages to the Monorepo

1. Create a new directory under `apps/` (for applications) or `packages/` (for shared libraries/configs).
2. Add a `package.json` with a scoped name (e.g., `@ever-works/my-package`).
3. The package is automatically detected by pnpm workspaces.
4. If it participates in `build`, `dev`, or `lint` pipelines, ensure scripts are defined in its `package.json` -- Turborepo will pick them up based on `turbo.json`.

### Internationalization

- Add translations under `apps/web/messages/`
- Use `useTranslations` in components
- Add new locales in config

### Authentication

- Configure providers in `apps/web/auth.config.ts`
- Protect routes via middleware
- Customize auth pages in `apps/web/app/[locale]/auth`

#### Authentication Configuration

```bash
# Auth Endpoints
AUTH_ENDPOINT_LOGIN="/auth/login"
AUTH_ENDPOINT_REFRESH="/auth/refresh"
AUTH_ENDPOINT_LOGOUT="/auth/logout"
AUTH_ENDPOINT_CHECK="/auth/check"

# JWT Configuration
JWT_ACCESS_TOKEN_EXPIRES_IN=15m
JWT_REFRESH_TOKEN_EXPIRES_IN=7d
```

#### CORS Configuration (Production)

```bash
# CORS Settings
CORS_ORIGIN="https://your-frontend-domain.com"
CORS_CREDENTIALS=true
CORS_METHODS="GET,POST,PUT,DELETE,OPTIONS"
```

### Developer Tools

- **Database Studio**: `pnpm db:studio` (from `apps/web/`)
- **Linting**: `pnpm run lint`
- **Type Checking**: `pnpm tsc --noEmit` (from `apps/web/`)

### Deployment on Vercel

The easiest way to deploy is via the [Vercel platform](https://vercel.com/new?utm_medium=default-template&filter=next.js).

Check the [Next.js deployment docs](https://nextjs.org/docs/app/building-your-application/deploying).

## 🔗 Resources

- [Next.js Docs](https://nextjs.org/docs)
- [Auth.js Guide](https://authjs.dev/)
- [Drizzle ORM Docs](https://orm.drizzle.team/)
- [Tailwind CSS Docs](https://tailwindcss.com/docs)
- [Turborepo Docs](https://turbo.build/repo/docs)
- [pnpm Docs](https://pnpm.io)

## License

AGPL v3

## ™️ Trademarks

**Ever**® is a registered trademark of [Ever Co. LTD](https://ever.co).
**Ever® Works™**, **Ever® Demand™**, **Ever® Gauzy™**, **Ever® Teams™** and **Ever® OpenSaaS™** are all trademarks of [Ever Co. LTD](https://ever.co).

The trademarks may only be used with the written permission of Ever Co. LTD. and may not be used to promote or otherwise market competitive products or services.

All other brand and product names are trademarks, registered trademarks, or service marks of their respective holders.

## 🍺 Contribute

- Please give us a :star: on Github, it **helps**!
- You are more than welcome to submit feature requests in the [separate repo](https://github.com/ever-co/feature-requests/issues)
- Pull requests are always welcome! Please base pull requests against the _develop_ branch and follow the [contributing guide](.github/CONTRIBUTING.md).

## 💪 Thanks to our Contributors

See our contributors list in [CONTRIBUTORS.md](https://github.com/ever-co/directory-web-template/blob/develop/.github/CONTRIBUTORS.md).
You can also view a full list of our [contributors tracked by Github](https://github.com/ever-co/directory-web-template/graphs/contributors).

<img src="https://contributors-img.web.app/image?repo=ever-co/directory-web-template" />

## ⭐ Star History

[![Star History Chart](https://stats-github.ever.works/svg?repos=ever-works/directory-web-template&type=Date)](https://stats-github.ever.works/#ever-works/directory-web-template&Date)

## ❤️ Powered By

<p>
  <a href="https://www.digitalocean.com/?utm_medium=opensource&utm_source=ever-co">
    <img src="https://opensource.nyc3.cdn.digitaloceanspaces.com/attribution/assets/PoweredByDO/DO_Powered_by_Badge_blue.svg" width="201px">
  </a>
</p>

<p>
 <a href="https://vercel.com/?utm_source=ever-co&utm_campaign=oss">
     <img src=".github/vercel-logo.svg" alt="Powered by Vercel" />
 </a>
</p>

## ©️ Copyright

#### Copyright © 2024-present, Ever Co. LTD. All rights reserved
