---
id: guides
title: Guides & Tutorials
sidebar_label: Overview
sidebar_position: 0
---

# Guides & Tutorials

This section contains practical, step-by-step guides for customizing, extending, and operating your Ever Works directory website. Each guide is self-contained but may link to related architecture pages for deeper context.

## How to Use This Section

Guides are organized by category. If you are **setting up the template for the first time**, start with the Customization and Theming guides to match the site to your brand. If you are **operating a running site**, the Admin and Client Dashboard guides will be most relevant. Developers extending the template should work through the Infrastructure and Testing guides.

## Customization & Appearance

These guides cover how to make the template your own -- from colors and layouts to navigation and footer content.

| Guide                                                     | Description                                                                                      |
| --------------------------------------------------------- | ------------------------------------------------------------------------------------------------ |
| [Customization](/docs/guides/customization)               | Comprehensive guide to customizing your directory site -- branding, colors, layouts, and content |
| [Theming](/docs/guides/theming)                           | The theme system: pre-built themes, custom theme creation, and runtime theme switching           |
| [Dynamic Colors](/docs/guides/dynamic-colors)             | How the dynamic color generation pipeline works and how to configure it                          |
| [Layouts & Templates](/docs/guides/layouts-templates)     | Customize page layouts, listing templates, and detail page structures                            |
| [Custom Navigation](/docs/guides/custom-navigation)       | Configure the navbar, sidebar, and breadcrumb navigation                                         |
| [Footer Customization](/docs/guides/footer-customization) | Modify footer content, links, and layout                                                         |
| [UI Components](/docs/guides/ui-components)               | Available UI components and how to use them in your pages                                        |

## Admin & Dashboard

Guides for managing content, users, and site settings through the built-in dashboards.

| Guide                                             | Description                                                                                 |
| ------------------------------------------------- | ------------------------------------------------------------------------------------------- |
| [Admin Dashboard](/docs/guides/admin-dashboard)   | Overview of admin features: content management, user roles, analytics, and settings         |
| [Admin Deep Dive](/docs/guides/admin-deep-dive)   | Advanced admin topics: bulk operations, audit logs, and moderation workflows                |
| [Admin Components](/docs/guides/admin-components) | Reusable admin UI components and how to extend the admin interface                          |
| [Client Dashboard](/docs/guides/client-dashboard) | The client-facing dashboard for item owners: submissions, analytics, and profile management |

## Data & Content

Guides related to content management, data utilities, and URL handling.

| Guide                                                   | Description                                                                |
| ------------------------------------------------------- | -------------------------------------------------------------------------- |
| [Slug Utilities](/docs/guides/slug-utilities)           | URL slug generation, validation, and conflict resolution                   |
| [Static Page Content](/docs/guides/static-page-content) | Terms, Privacy, About and Cookies copy: the data repository `pages/` files |
| [URL Utilities](/docs/guides/url-utilities)             | URL construction helpers, query parameter management, and canonical URLs   |
| [Filter Sync](/docs/guides/filter-sync)                 | How filter state is synchronized between URL parameters and the UI         |
| [Pagination Patterns](/docs/guides/pagination-patterns) | Server-side and client-side pagination implementations                     |
| [Currency Formatting](/docs/guides/currency-formatting) | Locale-aware currency display and detection                                |

## Email & Notifications

| Guide                                           | Description                                                     |
| ----------------------------------------------- | --------------------------------------------------------------- |
| [Email Templates](/docs/guides/email-templates) | Create and customize transactional email templates using Resend |

## Monetization & Sponsorship

| Guide                                                 | Description                                                  |
| ----------------------------------------------------- | ------------------------------------------------------------ |
| [Sponsorship System](/docs/guides/sponsorship-system) | Set up and manage sponsored listings and advertisement slots |
| [Survey System](/docs/guides/survey-system)           | Integrate user surveys for feedback collection               |

## Infrastructure & Operations

Guides for performance, reliability, security, and observability.

| Guide                                                             | Description                                                                          |
| ----------------------------------------------------------------- | ------------------------------------------------------------------------------------ |
| [Performance Optimization](/docs/guides/performance-optimization) | Caching strategies, bundle optimization, and rendering performance                   |
| [Caching Strategy](/docs/guides/caching-strategy)                 | The multi-layer caching architecture: in-memory, React Query, and HTTP cache headers |
| [Error Handling](/docs/guides/error-handling)                     | Error boundary patterns, API error responses, and user-facing error pages            |
| [Logging](/docs/guides/logging)                                   | Structured logging setup and log levels                                              |
| [Rate Limiting](/docs/guides/rate-limiting)                       | API rate limiting configuration and implementation                                   |
| [Bot Detection](/docs/guides/bot-detection)                       | reCAPTCHA integration and bot protection strategies                                  |
| [Database Health Check](/docs/guides/database-health-check)       | Monitoring database connectivity and performance                                     |
| [Accessibility](/docs/guides/accessibility)                       | Accessibility standards, testing, and common patterns used in the template           |

## Testing & Development

| Guide                                               | Description                                                                    |
| --------------------------------------------------- | ------------------------------------------------------------------------------ |
| [Testing Patterns](/docs/guides/testing-patterns)   | Playwright E2E test structure, page objects, fixtures, and running tests       |
| [Scripts Reference](/docs/guides/scripts-reference) | All CLI scripts in the `scripts/` directory: what they do and when to use them |

## Suggested Learning Paths

### Path 1: Brand Customization (Designer / Product Owner)

1. [Customization](/docs/guides/customization) -- understand what can be changed
2. [Theming](/docs/guides/theming) -- pick or create a theme
3. [Dynamic Colors](/docs/guides/dynamic-colors) -- fine-tune the color palette
4. [Footer Customization](/docs/guides/footer-customization) -- update footer links and branding
5. [Custom Navigation](/docs/guides/custom-navigation) -- configure menus

### Path 2: Site Administration (Admin / Content Manager)

1. [Admin Dashboard](/docs/guides/admin-dashboard) -- learn the admin interface
2. [Admin Deep Dive](/docs/guides/admin-deep-dive) -- advanced operations
3. [Client Dashboard](/docs/guides/client-dashboard) -- understand the client-side experience
4. [Sponsorship System](/docs/guides/sponsorship-system) -- manage sponsored content

### Path 3: Developer Extension (Full-Stack Developer)

1. [Architecture Overview](/docs/architecture) -- understand the codebase structure
2. [Testing Patterns](/docs/guides/testing-patterns) -- know how to verify changes
3. [Error Handling](/docs/guides/error-handling) -- handle failures gracefully
4. [Caching Strategy](/docs/guides/caching-strategy) -- understand the caching layers
5. [Performance Optimization](/docs/guides/performance-optimization) -- keep the site fast
6. [Scripts Reference](/docs/guides/scripts-reference) -- use the CLI tools effectively

### Path 4: Infrastructure & DevOps

1. [Database Health Check](/docs/guides/database-health-check) -- monitor database health
2. [Logging](/docs/guides/logging) -- set up structured logging
3. [Rate Limiting](/docs/guides/rate-limiting) -- protect your API endpoints
4. [Bot Detection](/docs/guides/bot-detection) -- prevent abuse
5. [Performance Optimization](/docs/guides/performance-optimization) -- optimize for production load

## Cross-References

These guides are closely related to the architecture documentation. For deeper technical context, see:

- **[Architecture Overview](/docs/architecture)** -- system design and layer responsibilities
- **[Theme System](/docs/architecture/theme-system)** -- architecture behind theming (pairs with the Theming guide)
- **[Guards System](/docs/architecture/guards-system)** -- access control architecture (pairs with Admin guides)
- **[Repository Patterns](/docs/architecture/repository-patterns)** -- data access patterns (context for data guides)
- **[API Layer](/docs/architecture/api-layer)** -- API route conventions (context for rate limiting and error handling)

## Getting Help

If you run into issues while following a guide:

1. **Check the [Quick Reference](/docs/getting-started/quick-reference)** for common commands and patterns.
2. **Review [Getting Started](/docs/getting-started)** if you have environment or setup problems.
3. **Open an issue** on the [GitHub repository](https://github.com/ever-works/directory-web-template/issues) for bugs or feature requests.

---

Pick the guide most relevant to your current task, or follow one of the learning paths above for a structured walkthrough.
