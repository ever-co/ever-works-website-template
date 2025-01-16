import getConfig from 'next/config';
import { tryFetchRepository, fetchItems } from "@/lib/content";
import Link from 'next/link';

export default async function Home() {
  const { serverRuntimeConfig } = getConfig()
  const options = serverRuntimeConfig;
  await tryFetchRepository(options);
  const items = await fetchItems();

  return (
    <div className='p-8 lg:p-16 max-w-[900px]'>
      <h1 className='text-lg font-extrabold'>Items</h1>

      { items.map(item => (
        <div key={item.slug}>
          <Link href={`/items/${item.slug}`}> {item.name} ({item.slug}) </Link>
        </div>
      )) }
    </div>
  );
}
