import * as React from "react";
import { Button as BaseButton } from "@base-ui/react/button";
import { cn } from "@/lib/utils";

export interface ButtonProps extends Omit<React.ComponentProps<"button">, "disabled" | "color" | "onAnimationStart" | "onDragStart" | "onDragEnd" | "onDrag"> {
  isDisabled?: boolean;
  isLoading?: boolean;
  isIconOnly?: boolean;
  startContent?: React.ReactNode;
  endContent?: React.ReactNode;
  variant?: "solid" | "bordered" | "light" | "flat";
  color?: "default" | "primary" | "danger";
  size?: "sm" | "md" | "lg";
  as?: React.ElementType;
  onPress?: React.MouseEventHandler<HTMLButtonElement>;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      className,
      children,
      isDisabled,
      isLoading,
      isIconOnly,
      startContent,
      endContent,
      variant = "solid",
      color = "default",
      size = "md",
      as,
      onClick,
      onPress,
      ...props
    },
    ref
  ) => {
    const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
      if (isDisabled || isLoading) return;
      if (onClick) onClick(e);
      if (onPress) onPress(e);
    };

    let renderProp: React.ReactElement | undefined;
    let nativeButtonProp: boolean | undefined;

    if (as === "div") {
      renderProp = <div />;
      nativeButtonProp = false;
    } else if (as && as !== "button") {
       renderProp = React.createElement(as, {});
       nativeButtonProp = false; 
    }

    const baseStyles = "inline-flex items-center justify-center gap-2 rounded-xl font-medium transition-colors outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 ring-offset-background disabled:pointer-events-none disabled:opacity-50 select-none cursor-pointer active:scale-[0.98]";

    const variants = {
      solid: {
        default: "bg-foreground text-background hover:bg-foreground/90",
        primary: "bg-primary text-primary-foreground hover:bg-primary/90",
        danger: "bg-destructive text-destructive-foreground hover:bg-destructive/90",
      },
      bordered: {
        default: "border border-border/70 bg-card/40 hover:bg-card/70 hover:border-border",
        primary: "border border-primary/40 text-foreground hover:bg-primary/10 hover:border-primary/55",
        danger: "border border-destructive/30 text-destructive hover:bg-destructive/10 hover:border-destructive/40",
      },
      light: {
        default: "text-muted-foreground hover:bg-muted/60 hover:text-foreground",
        primary: "text-foreground hover:bg-primary/10",
        danger: "text-destructive hover:bg-destructive/10",
      },
      flat: {
        default: "bg-muted/60 text-foreground hover:bg-muted",
        primary: "bg-primary/15 text-foreground hover:bg-primary/20",
        danger: "bg-destructive/10 text-destructive hover:bg-destructive/20",
      },
    };

    const sizes = {
      sm: "h-8 px-3 text-xs",
      md: "h-10 px-4 text-sm",
      lg: "h-12 px-6 text-base",
    };

    const iconSizes = {
      sm: "h-8 w-8 px-0",
      md: "h-10 w-10 px-0",
      lg: "h-12 w-12 px-0",
    };

    return (
      <BaseButton
        ref={ref}
        className={cn(
          baseStyles,
          variants[variant]?.[color] ?? variants.solid.default,
          isIconOnly ? iconSizes[size] : sizes[size],
          className
        )}
        disabled={isDisabled || isLoading}
        onClick={handleClick}
        render={renderProp}
        nativeButton={nativeButtonProp}
        {...props}
      >
        {isLoading && (
            <span className="animate-spin" aria-hidden="true">
             <svg className="h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
               <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
               <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
             </svg>
           </span>
        )}
        {!isLoading && startContent}
        {children}
        {!isLoading && endContent}
      </BaseButton>
    );
  }
);
Button.displayName = "Button";

export { Button };
