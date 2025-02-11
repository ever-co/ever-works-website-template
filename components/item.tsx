'use client'

import { ItemData } from "@/lib/content";
import { Card, CardHeader, CardBody, Divider, Image } from "@heroui/react";
import { clsx } from 'clsx';

type ItemProps = ItemData;

export default function Item(props: ItemProps) {
  return (
    <Card className={
      clsx("w-full h-h-full border", { 
        'bg-yellow-400/10 border-yellow-500 hover:bg-yellow-400/15': props.featured,
        'border-blue-300 hover:bg-blue-50/40': !props.featured,
      })}>
      <CardHeader className="flex gap-3 p-6">
        <Image
          alt="heroui logo"
          height={40}
          radius="sm"
          src="https://avatars.githubusercontent.com/u/86160567?s=200&v=4"
          width={40}
        />
        <div className="flex flex-col">
          <h3 className="text-medium font-semibold">{ props.name }</h3>
          <p className="text-small text-default-500">{ props.category }</p>
        </div>
      </CardHeader>
      <Divider />
      <CardBody className="px-6 pb-6">
        <p className="line-clamp-3 text-small">{ props.description }</p>
      </CardBody>
      <Divider />
    </Card>
  );
}
