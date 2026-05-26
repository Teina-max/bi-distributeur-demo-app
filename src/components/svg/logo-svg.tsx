import type { ComponentPropsWithoutRef } from "react";
import { cn } from "@/lib/utils";

type LogoSvgProps = ComponentPropsWithoutRef<"img"> & { size?: number };

export const LogoSvg = ({ size = 32, className, ...props }: LogoSvgProps) => {
  return (
    <img
      src="https://res.cloudinary.com/dttleawx6/image/upload/f_auto,q_auto/bi-distributeur-demo/brand/toscano-logo"
      alt=""
      width={size}
      height={size}
      aria-hidden="true"
      decoding="async"
      draggable={false}
      className={cn("shrink-0", className)}
      {...props}
    />
  );
};
