import { Categories, Paginate, Tags } from "@/components/filters";
import Item from "@/components/item";
import Link from 'next/link';
import { Category, ItemData, Tag } from "@/lib/content";
import { PER_PAGE, totalPages } from "@/lib/paginate";
import { getItemPath } from "@/lib/utils";

type ListingProps = {
    total: number;
    start: number;
    page: number;
    basePath: string;
    categories: Category[];
    tags: Tag[];
    items: ItemData[];
}

export function Listing(props: ListingProps) {
    return (
        <div className='container mx-auto p-8'>
            <div className="py-16 flex flex-col gap-2">
                <h1 className='text-4xl font-bold text-center'>The Best Directory Website Template</h1>
                <p className='text-lg text-slate-500 text-center'>This is a demo directory website.</p>
            </div>
            <div className='flex flex-col md:flex-row w-full gap-5'>
                <Categories total={props.total} categories={props.categories} />
                <div className="w-full">
                    <Tags tags={props.tags} />
                    <div className='py-8 grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-5'>
                        {props.items.slice(props.start, props.start + PER_PAGE).map(item => (
                            <Link className="hover:opacity-90" prefetch={false} href={getItemPath(item.slug)} key={item.slug}>
                                <Item {...item} />
                            </Link>
                        ))}
                    </div>
                    <div className="mt-8 flex items-center justify-center">
                        <Paginate basePath={props.basePath} initialPage={props.page} total={totalPages(props.items.length)} />
                    </div>
                </div>
            </div>
        </div>
    );
}
