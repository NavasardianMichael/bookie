import { FC, HTMLAttributes, PropsWithChildren } from "react";
import Link, { LinkProps } from "next/link";
import { combineClassNames } from "@helpers/commons";

type Props = LinkProps & HTMLAttributes<HTMLAnchorElement>;

const AppLink: FC<PropsWithChildren<Props>> = ({ children, ...props }) => {
  return (
    <Link
      {...props}
      className={combineClassNames("bookie-blue", props.className)}
    >
      {children}
    </Link>
  );
};

export default AppLink;
