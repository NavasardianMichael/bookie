import { combineClassNames } from '@helpers/commons'
import Link, { LinkProps } from 'next/link'
import { FC, HTMLAttributes, PropsWithChildren } from 'react'

type Props = LinkProps & HTMLAttributes<HTMLAnchorElement>

const AppLink: FC<PropsWithChildren<Props>> = ({ children, ...props }) => {
    return (
        <Link {...props} className={combineClassNames('text-gray-700 underline hover:text-gray-900', props.className)} >
            {children}
        </Link>
    )
}

export default AppLink