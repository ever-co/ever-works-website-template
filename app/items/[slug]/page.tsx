import { fetchItems, fetchItem } from '@/lib/content'
import { MDX } from '@/components/mdx';
import { notFound } from 'next/navigation';

export const revalidate = 10;

export async function generateStaticParams() {
    const { items } = await fetchItems();
    return items.map(item => ({ slug: item.slug }));
}

export default async function ItemDetails({ params }: { params: Promise<{ slug: string }> }) {
    const slug = (await params).slug;
    const item = await fetchItem(slug);
    if (!item) {
        return notFound();
    }

    const { meta, content } = item;

    return (
        <div className='container mx-auto p-8'>
            <h1 className='text-2xl font-extrabold'>{meta.name}</h1>
            <span>{meta.description}</span>

            <div className='mt-8 max-w-[900px]'>
                {content ? (<MDX source={content} />) : <p className='text-gray-400'>No content provided</p>}
            </div>
        </div>
    );
}
