import { fetchByTag, fetchItems } from "@/lib/content";
import { paginateMeta, totalPages } from "@/lib/paginate";
import { Listing } from "../../listing";

export const revalidate = 10;

export async function generateStaticParams() {
    const { tags } = await fetchItems();
    const paths = [];

    for (const tag of tags) {
        const pages = totalPages(tag.count || 0);

        for (let i = 1; i <= pages; ++i) {
            if (i === 1)
                paths.push({ tag: [tag.id]});
            else
                paths.push({ tag: [tag.id, i.toString()] });
        }
    }

    return paths;
}

export default async function TagListing({ params }: { params: Promise<{ tag: string[] }> }) {
    const [rawTag, rawPage ] = (await params).tag;
    const tag = decodeURI(rawTag);
    const { start, page } = paginateMeta(rawPage);
    const { items, categories, total, tags  } = await fetchByTag(tag);

    return <Listing 
        categories={categories}
        tags={tags}
        items={items} 
        start={start}
        page={page}
        total={total}
        basePath={`/tags/${tag}`} 
    />;
}
