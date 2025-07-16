'use client'

import { FC, HTMLAttributes, MouseEventHandler, PropsWithChildren } from "react";
import Link, { LinkProps } from "next/link";
import { useRouter } from 'next/navigation';
import { combineClassNames } from "@helpers/commons";

type Props = LinkProps & HTMLAttributes<HTMLAnchorElement> & {
  beforeNavigateCallback: () => void
};

const AppLinkWithClick: FC<PropsWithChildren<Props>> = ({ children, href, beforeNavigateCallback, ...props }) => {
  const router = useRouter()
  const handleClick: MouseEventHandler<HTMLAnchorElement> = async (e) => {
    e.preventDefault();
    e.stopPropagation();
    beforeNavigateCallback();

    router.push(href.toString())
  }

  return (
    <Link
      {...props}
      href={href}
      className={combineClassNames("text-bookie-blue", props.className)}
      onClick={handleClick}
    >
      {children}
    </Link>
  );
};

export default AppLinkWithClick;
