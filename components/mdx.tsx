import { MDXRemote, MDXRemoteProps } from 'next-mdx-remote/rsc'

const components = {
    h1: ({ children }: { children: React.ReactNode }) => <h1 className='font-extrabold text-lg leading-loose'>{children}</h1>
};

export function MDX(props: MDXRemoteProps) {
    return (
        <MDXRemote
            {...props}
            components={{ ...components, ...(props.components || {}) }}
        />
    )
}
