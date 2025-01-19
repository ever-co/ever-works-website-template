import { fetchItems, getPagePath, tryFetchRepository } from "@/lib/content";
import Link from 'next/link';

export const revalidate = 10;

export default async function Home() {
  console.log('Home():');
  await tryFetchRepository();
  const items = await fetchItems();

  return (
    <div className='container mx-auto p-8'>
      <h1 className='text-2xl font-extrabold'>Items</h1>

      <div className='py-8 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-7'>
        {items.map(item => (
          <Link prefetch={false} href={getPagePath(item.slug)} key={item.slug} className='hover:opacity-80 transition-opacity border rounded-lg flex flex-col'>
            <div className='bg-gray-400 w-full h-36'></div>
            <div className='px-2 py-4'>
              <span className='font-bold text-lg'> {item.name} </span>
              <p className='text-gray-500 text-sm line-clamp-3'>
                {item.description}
              </p>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
