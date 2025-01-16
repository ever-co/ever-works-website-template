import getConfig from 'next/config';
import { fetchItem, fetchItems, tryFetchRepository } from '@/lib/content'
import { MDX } from '@/components/mdx';

export async function generateStaticParams() {
    const { serverRuntimeConfig } = getConfig()
    const options = serverRuntimeConfig;
    await tryFetchRepository(options);

    const items = await fetchItems();
    return items.map(item => ({ slug: item.slug }));
}

export default async function ItemDetails({ params }: { params: { slug: string } }) {
    const slug = params?.slug as string;
    const { meta, content } = await fetchItem(slug);

    return (
        <div className='p-8 lg:p-16 max-w-[900px]'>
            <h1 className='text-lg font-extrabold'>{meta.name}</h1>
            <span>{meta.description}</span>

            <div className='mt-8'>
                {content ? (<MDX source={content} />) : <p className='text-gray-400'>No content provided</p>}
            </div>
        </div>
    );
}
