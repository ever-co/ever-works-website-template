import {
    Users,
    FileText,
    BarChart3,
    FolderTree,
    Tag,
    Package,
    Shield,
    Building2,
    MessageSquare,
    Star,
    Flag,
    Megaphone,
    ShieldAlert,
    Receipt,
} from 'lucide-react';
import { AdminFeatureCard } from './admin-feature-card';
import { AdminFeature } from './types';

const ADMIN_FEATURES: AdminFeature[] = [
    {
        icon: Package,
        title: 'Manage Items',
        description: 'Create, edit, review, and approve content items.',
        href: '/admin/items',
        emoji: '📦',
    },
    {
        icon: FolderTree,
        title: 'Manage Categories',
        description: 'Create, edit, and organize content categories.',
        href: '/admin/categories',
        emoji: '📁',
    },
    {
        icon: Tag,
        title: 'Manage Tags',
        description: 'Create, edit, and organize content tags.',
        href: '/admin/tags',
        emoji: '🏷️',
    },
    {
        icon: Star,
        title: 'Featured Items',
        description: 'Manage featured items and homepage highlights.',
        href: '/admin/featured-items',
        emoji: '⭐',
    },
    {
        icon: Megaphone,
        title: 'Sponsorships',
        description: 'Review and manage sponsor ad submissions.',
        href: '/admin/sponsorships',
        emoji: '📢',
    },
    {
        icon: Users,
        title: 'Manage Users',
        description: 'View and manage platform users and permissions.',
        href: '/admin/users',
        emoji: '👤',
    },
    {
        icon: Building2,
        title: 'Manage Clients',
        description: 'View and manage client accounts and information.',
        href: '/admin/clients',
        emoji: '👥',
    },
    {
        icon: Shield,
        title: 'Manage Roles',
        description: 'Create, edit, and manage user roles and permissions.',
        href: '/admin/roles',
        emoji: '🛡️',
    },
    {
        icon: MessageSquare,
        title: 'Manage Comments',
        description: 'Review and delete user comments.',
        href: '/admin/comments',
        emoji: '💬',
    },
    {
        icon: Flag,
        title: 'Manage Reports',
        description: 'Review and resolve reported content.',
        href: '/admin/reports',
        emoji: '🚩',
    },
    {
        icon: ShieldAlert,
        title: 'Billing Issues',
        description: 'Resolve failed payments, disputes and refunds.',
        href: '/admin/billing-issues',
        emoji: '🧾',
    },
    {
        icon: Receipt,
        title: 'Payment Reports',
        description: 'Filter and export revenue and payment reports.',
        href: '/admin/payment-reports',
        emoji: '📈',
    },
    {
        icon: FileText,
        title: 'Review Submissions',
        description: 'Moderate and approve new directory items.',
        href: '/admin/items',
        emoji: '📝',
    },
    {
        icon: BarChart3,
        title: 'Analytics',
        description: 'View platform statistics and reports.',
        href: '/admin',
        emoji: '📊',
    },
];

export function AdminFeaturesGrid() {
    return (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {ADMIN_FEATURES.map((feature, index) => (
                <AdminFeatureCard key={`${feature.title}-${index}`} feature={feature} />
            ))}
        </div>
    );
}
