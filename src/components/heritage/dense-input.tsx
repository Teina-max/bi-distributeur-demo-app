import * as React from "react";
import { cn } from "@/lib/utils";

type DenseInputProps = React.InputHTMLAttributes<HTMLInputElement>;

export const DenseInput = React.forwardRef<HTMLInputElement, DenseInputProps>(
  function DenseInput({ className, ...rest }, ref) {
    return (
      <input
        ref={ref}
        className={cn(
          "hz-input border border-[var(--hz-border)] bg-white px-1 py-0.5 text-[13px] outline-none focus:outline focus:outline-1 focus:outline-[var(--hz-accent)]",
          className,
        )}
        {...rest}
      />
    );
  },
);
