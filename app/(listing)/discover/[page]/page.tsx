import { fetchItems } from "@/lib/content";
import { paginateMeta, totalPages } from "@/lib/paginate";
import { Listing } from "../../listing";

export const revalidate = 10;

export async function generateStaticParams() {
    const { items } = await fetchItems();
    const paths = [];
    const pages = totalPages(items.length);

    for (let i = 1; i <= pages; ++i) {
      paths.push({ page: i.toString() });
    }

    return paths;
}

export default async function DiscoverListing({ params }: { params: Promise<{ page: string }> }) {
    const rawPage = (await params).page;
    const { start, page } = paginateMeta(rawPage);
    const { items, categories, total } = await fetchItems();

    return <Listing 
        categories={categories}
        items={items} 
        start={start}
        page={page}
        total={total}
        basePath='/discover' 
    />;
}
