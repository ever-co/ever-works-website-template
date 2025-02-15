'use client'

import { Category } from "@/lib/content";
import { Accordion, AccordionItem, Autocomplete, AutocompleteItem, Button, cn, Link, Pagination } from "@heroui/react";
import { usePathname, useRouter } from "next/navigation";
import { PropsWithChildren } from "react";

function BlockLink({ href, isActive, children }: PropsWithChildren<{ href: string, isActive: boolean }>) {
  return (
    <Button
      className={cn('text-black font-medium text-left justify-start', { 'bg-primary-50 data-[hover]:bg-primary-100': isActive })}
      radius="sm" variant='light' as={Link} href={href}>
      {children}
    </Button>
  )
}

export function CategoriesList({ categories, total }: { total: number, categories: Category[] }) {
  const pathname = usePathname();

  return (<>
    <BlockLink
      isActive={pathname === '/' || pathname.startsWith('/discover')}
      href="/">All ({total})</BlockLink>
    {categories.map(category => {
      if (!category.count) return null;

      const href = `/categories/${category.id}`;
      return (<BlockLink isActive={pathname.startsWith(encodeURI(href))}
        key={category.id}
        href={href}>
          {category.name} ({category.count || 0})
      </BlockLink>)
    })}
  </>)
}

export function Categories(props: { total: number, categories: Category[] }) {
  return (
    <>
      <div className="md:hidden">
        <Accordion variant="bordered">
          <AccordionItem key="1" aria-label="Category" title="Categories">
            <div className="flex flex-col gap-2">
              <CategoriesList {...props} />
            </div>
          </AccordionItem>
        </Accordion>
      </div>

      <div className="hidden md:flex flex-col w-full max-w-56 gap-2">
        <h2 className="font-bold mb-2">Categories</h2>
        <CategoriesList {...props} />
      </div>
    </>
  );
}

export function Sort() {
  return (
    <div className="flex flex-wrap md:flex-nowrap">
      <Autocomplete variant="bordered" size="sm" className="max-w-xs" label="Sort">
        <AutocompleteItem>Newest</AutocompleteItem>
        <AutocompleteItem>Oldest</AutocompleteItem>
      </Autocomplete>
    </div>
  );
}

export function Filters() {
  return (
    <div className="flex flex-wrap md:flex-nowrap">
      <Autocomplete size="sm" variant="bordered" className="max-w-xs" label="Filters">
        <AutocompleteItem>Featured</AutocompleteItem>
      </Autocomplete>
    </div>
  );
}

export function Reset() {
  return (<Button radius="sm" size="lg" className="text-sm" variant="bordered">Reset</Button>);
}

export function Paginate({ basePath, initialPage, total }: { basePath: string, initialPage: number, total: number }) {
  const router = useRouter();

  function redirect(page: number) {
    const path = basePath + ((page === 1) ? '' : `/${page}`);
    router.push(path);
  }

  return (
    <Pagination
      isCompact
      showControls
      initialPage={initialPage}
      total={total}
      onChange={redirect}
    />);
}
