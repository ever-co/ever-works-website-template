import getConfig from 'next/config';
import { fetchItem, fetchItems, ItemData, tryFetchRepository } from '@/lib/content'
import type {
    GetStaticProps,
    GetStaticPaths,
} from 'next'
import { MDX } from '@/components/mdx';
import { serialize } from 'next-mdx-remote/serialize'

export const getStaticPaths = (async () => {
    const { serverRuntimeConfig } = getConfig()
    const options = serverRuntimeConfig;
    await tryFetchRepository(options);

    const items = await fetchItems();
    const paths = items.map(item => ({ params: { slug: item.slug } }));

    return {
        paths,
        fallback: false,
    }
}) satisfies GetStaticPaths;

export const getStaticProps = (async (context) => {
    const slug = context.params?.slug as string;
    const item = await fetchItem(slug);
    const source = item.content ? await serialize(item.content) : {};
    return { props: { ...item, source } }
  }) satisfies GetStaticProps;

export default function ItemDetails({ meta, content, source }: { meta: ItemData, content?: string, source: any }) {
    return (
        <div className='p-8 lg:p-16 max-w-[900px]'>
            <h1 className='text-lg font-extrabold'>{ meta.name }</h1>
            <span>{ meta.description }</span>

            <div className='mt-8'>
                { content ? (<MDX {...source} />) : <p className='text-gray-400'>No content provided</p> }
            </div>
        </div>
    );
}
