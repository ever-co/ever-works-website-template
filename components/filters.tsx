"use client";

import { Category, Tag } from "@/lib/content";
import { Accordion, AccordionItem, Button, cn, Link, Pagination } from "@heroui/react";
import { usePathname, useRouter } from "next/navigation";
import { PropsWithChildren } from "react";

function BlockLink({
  href,
  isActive,
  children,
}: PropsWithChildren<{ href: string; isActive: boolean }>) {
  return (
    <Button
      className={cn(
        "text-black dark:text-white font-medium text-left justify-start",
        { "bg-primary-50 data-[hover]:bg-primary-100": isActive }
      )}
      radius="sm"
      variant="light"
      as={Link}
      href={href}
    >
      {children}
    </Button>
  );
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

export function Paginate({
  basePath,
  initialPage,
  total,
}: {
  basePath: string;
  initialPage: number;
  total: number;
}) {
  const router = useRouter();

  function redirect(page: number) {
    const path = basePath + (page === 1 ? "" : `/${page}`);
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

export function Tags(props: { tags: Tag[] }) {
  const pathname = usePathname();

  return (
    <div className="w-fill flex gap-2 flex-wrap">
    { props.tags.map(tag => (
        <Button 
          key={tag.id}
          variant={pathname.startsWith(encodeURI(`/tags/${tag.id}`)) ? 'solid' : 'bordered'}
          color="default"
          size="sm"
          as={Link}
          href={`/tags/${tag.id}`}
        >{
            tag.name
        }</Button>
    ))}
</div>
  );
}
