/**
 * Barrel export for all database query modules
 *
 * This file provides a single entry point for importing query functions
 * organized by domain following Single Responsibility Principle (SRP)
 *
 * Updated: 2025-12-21
 */

// Activity queries
export * from './activity.queries';

// Billing issue queries (Spec 051)
export * from './billing-issue.queries';

// Authentication queries
export * from './auth.queries';

// Client queries
export * from './client.queries';

// Comment queries
export * from './comment.queries';

// Dashboard queries
export * from './dashboard.queries';

// Company queries
export * from './company.queries';

// Newsletter queries
export * from './newsletter.queries';

// Payment queries
export * from './payment.queries';

// Payment report queries (Spec 052)
export * from './payment-report.queries';

// Report queries
export * from './report.queries';

// Subscription queries
export * from './subscription.queries';

// Survey queries
export * from './survey.queries';

// User queries
export * from './user.queries';

// Vote queries
export * from './vote.queries';

// Portfolio queries
export * from './portfolio.queries';

// Follow queries
export * from './follows.queries';

// Profile stats queries
export * from './profile-stats.queries';

// Location index queries
export * from './location-index.queries';

// Engagement queries (views, votes, favorites, comments aggregation)
export * from './engagement.queries';

// Shared types and utilities
export * from './types';
export * from './utils';
