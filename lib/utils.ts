import { Category } from "./content";

export function getItemPath(slug: string) {
    return `/items/${slug}`;
}

export function getCategoryName(category: string | Category) {
    if (typeof category === 'string') {
        return category;
    }

    return category.name;
}

export function getCategoriesName(categories: Category | Category[] | string | string[]) {
    if (Array.isArray(categories)) {
        return categories.map(getCategoryName).join(', ');
    }

    return getCategoryName(categories);
}
