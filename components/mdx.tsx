import { MDXRemote, MDXRemoteProps } from 'next-mdx-remote/rsc'

export function MDX(props: MDXRemoteProps) {
    return (
        <div className='prose dark:prose-invert'>
            <MDXRemote
                {...props}
                components={{ ...(props.components || {}) }}
            />
        </div>
    )
}
