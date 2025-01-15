import getConfig from 'next/config';
import { tryFetchRepository, fetchItems, ItemData } from "@/lib/content";
import Link from 'next/link';

export async function getStaticProps(context: object) {
  const { serverRuntimeConfig } = getConfig()
  const options = serverRuntimeConfig;
  await tryFetchRepository(options);
  const items = await fetchItems();

  return {
    props: { items },
    revalidate: 60 * 5,
  }
}

export default function Home({ items }: { items: ItemData[] }) {
  return (
    <div className='p-8 lg:p-16 max-w-[900px]'>
      <h1 className='text-lg font-extrabold'>Items</h1>

      { items.map(item => (
        <div>
          <Link href={`/items/${item.slug}`}> {item.name} ({item.slug}) </Link>
        </div>
      )) }
    </div>
  );
}
