import { MDXRemote } from 'next-mdx-remote/rsc'

const components = {
    h1: ({ children }: any) => <h1 className='font-extrabold text-lg leading-loose'>{children}</h1>
};

export function MDX(props: any) {
    return (
        <MDXRemote
            {...props}
            components={{ ...components, ...(props.components || {}) }}
        />
    )
}
