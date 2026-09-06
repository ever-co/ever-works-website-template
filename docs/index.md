---
id: index
title: Directory Web Template
sidebar_label: Home
sidebar_position: 0
slug: /
---

# Directory Web Template

The Directory Web Template is a modern, full-stack directory website solution built with Next.js 16 and organized as a **Turborepo monorepo**. It's designed to help you create professional directory websites for tools, services, products, or any other type of listing platform.

## Key Features

- **Modern Tech Stack**: Next.js 16, React 19, TypeScript, Tailwind CSS, HeroUI React
- **Turborepo Monorepo**: pnpm workspaces with shared configs, web app, e2e tests, and docs
- **Flexible Authentication**: NextAuth.js v5, Supabase Auth, OAuth providers (Google, GitHub, Facebook, Twitter, Microsoft), and opt-in [email two-factor authentication](authentication/two-factor-auth.md) for password accounts
- **Payment Integration**: Stripe, LemonSqueezy, Polar, subscription management
- **Internationalization**: Multiple languages supported with full RTL support via next-intl
- **Git-based CMS**: Content synchronization from Git repositories with YAML-based structure
- **Theming System**: Built-in themes with dynamic color generation
- **Maps & Location**: Mapbox / Google Maps abstraction with marker clustering, auto-geocoding from YAML addresses, and an opt-in [Map view](features/map-view.md) for listings (sidebar + map, Zillow / Airbnb style)
- **AI Chat**: Opt-in Vercel-AI-SDK [chat assistant](features/ai-chat.md) for visitors — works.yml-driven, six-locale, anonymous vs. authenticated personas, lazy-loaded panel preserves the public bundle when disabled
- **Analytics & Monitoring**: PostHog, Sentry, performance monitoring
- **Admin Dashboard**: Content management, user management, and analytics
- **SEO Optimized**: Sitemap generation, structured data (JSON-LD), meta tags

## Quick Start

```bash
# Clone the monorepo
git clone https://github.com/ever-works/directory-web-template.git
cd directory-web-template

# Install dependencies (pnpm required)
pnpm install

# Set up environment for the web app
cp apps/web/.env.example apps/web/.env.local
# Edit apps/web/.env.local with your configuration

# Start development server
pnpm run dev
```

Visit [http://localhost:3000](http://localhost:3000) to see your site!

## Next Steps

- [Installation Guide](/getting-started/installation) -- Complete setup instructions
- [Quick Start Guide](/getting-started/quick-start) -- Get up and running in under 10 minutes
- [Architecture Overview](/architecture/overview) -- Understand the system design
- [Deployment Guide](/deployment/deployment-introduction) -- Deploy to production

## For Contributors & AI Agents

The template uses **spec-driven development** following the
[GitHub Spec Kit](https://github.com/github/spec-kit) convention. Every
non-trivial change goes through a spec → plan → tasks trio.

See **[For Contributors & AI Agents](/agents-and-contributors)** for the full
index of agent onboarding files, spec / plan / tasks references, and
per-source-file reference docs covering the plugin SDK, plugin runtime,
package manifests, and TypeScript / ESLint configs.

## Use Cases

This template project is perfect for:

- **Tool directories** (like ProductHunt for tools)
- **Service marketplaces**
- **Resource catalogs**
- **Professional directories**
- **Product showcases**
- **Community platforms**

## Ever Works Platform

The Template can be used standalone or paired with the **Ever Works Platform** for AI-powered content generation. For Platform documentation, visit [docs.ever.works](https://docs.ever.works). See [Platform vs Template](/comparison) for a detailed comparison.

## Need Help?

- Check our [documentation](/docs) for general information
- Join our [Discord community](https://discord.gg/ever) for support
- Visit the [demo site](https://demo.ever.works) to see it in action
- Contact [support](/support) for technical assistance
