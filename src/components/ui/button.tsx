import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-xl text-sm font-semibold transition-all active:scale-95 focus-visible:outline-none disabled:pointer-events-none disabled:opacity-60 [&_svg]:size-4 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        default: "bg-[#7A1F3D] text-white shadow-xs hover:bg-[#631730]",
        secondary: "bg-[#F5F5F5] text-[#1F1F1F] border border-[#E5E7EB] hover:bg-[#E5E7EB]",
        outline:
          "border border-[#E5E7EB] bg-white text-[#1F1F1F] hover:border-[#7A1F3D] hover:text-[#7A1F3D]",
        ghost: "text-[#6B7280] hover:text-[#7A1F3D] hover:bg-[#7A1F3D]/5",
        destructive: "bg-[#B42318] text-white shadow-xs hover:bg-[#912018]",
      },
      size: {
        default: "h-10 px-5 py-2.5",
        sm: "h-8 px-3.5 text-xs",
        lg: "h-12 px-6 text-base",
        icon: "h-10 w-10",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    );
  },
);
Button.displayName = "Button";

export { Button, buttonVariants };
