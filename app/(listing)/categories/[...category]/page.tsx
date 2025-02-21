import { fetchByCategory, fetchItems } from "@/lib/content";
import { paginateMeta, totalPages } from "@/lib/paginate";
import { Listing } from "../../listing";

export const revalidate = 10;

export async function generateStaticParams() {
    const { categories } = await fetchItems();
    const paths = [];

    for (const category of categories) {
        const pages = totalPages(category.count || 0);

        for (let i = 1; i <= pages; ++i) {
            if (i === 1)
                paths.push({ category: [category.id]});
            else
                paths.push({ category: [category.id, i.toString()] });
        }
    }

    return paths;
}

export default async function CategoryListing({ params }: { params: Promise<{ category: string[] }> }) {
    const cat = (await params).category;
    const category = decodeURI(cat[0]);
    const { start, page } = paginateMeta(cat[1]);
    const { items, categories, total, tags  } = await fetchByCategory(category);

    return <Listing 
        categories={categories}
        tags={tags}
        items={items} 
        start={start}
        page={page}
        total={total}
        basePath={`/categories/${category}`} 
    />;
}
