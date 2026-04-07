import * as React from "react";

type DivProps = React.HTMLAttributes<HTMLDivElement>;

/**
 * Minimal Card component (shadcn-like API) to avoid dependency on generated shadcn files.
 */
export function Card({ className = "", ...props }: DivProps) {
  return (
    <div
      className={`rounded-2xl border border-slate-200/70 bg-white/80 backdrop-blur shadow-sm ${className}`}
      {...props}
    />
  );
}

export function CardHeader({ className = "", ...props }: DivProps) {
  return <div className={`p-5 pb-3 ${className}`} {...props} />;
}

export function CardTitle({ className = "", ...props }: React.HTMLAttributes<HTMLHeadingElement>) {
  return <h3 className={`text-base font-semibold leading-none tracking-tight ${className}`} {...props} />;
}

export function CardDescription({ className = "", ...props }: React.HTMLAttributes<HTMLParagraphElement>) {
  return <p className={`text-sm text-slate-500 ${className}`} {...props} />;
}

export function CardContent({ className = "", ...props }: DivProps) {
  return <div className={`p-5 pt-0 ${className}`} {...props} />;
}

export function CardFooter({ className = "", ...props }: DivProps) {
  return <div className={`p-5 pt-0 flex items-center ${className}`} {...props} />;
}
