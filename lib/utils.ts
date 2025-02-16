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
