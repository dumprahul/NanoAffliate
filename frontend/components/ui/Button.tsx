import Link from "next/link";
import type { ButtonHTMLAttributes, ReactNode } from "react";

type LinkButtonProps = {
  children: ReactNode;
  href?: string;
  className?: string;
  as?: "link";
  target?: string;
  rel?: string;
};

type NativeButtonProps = {
  children: ReactNode;
  className?: string;
  as: "button";
} & Omit<ButtonHTMLAttributes<HTMLButtonElement>, "className" | "children">;

type ButtonProps = LinkButtonProps | NativeButtonProps;

const base =
  "group inline-flex items-center justify-center gap-2 px-6 h-11 text-[13px] font-medium tracking-[-0.01em] rounded-[var(--radius-sm)] transition-colors duration-[450ms] ease-[var(--ease-expo)]";

export function PrimaryButton(props: ButtonProps) {
  const className = `${base} bg-ink text-bg hover:bg-ink-2 ${props.className ?? ""}`;
  if (props.as === "button") {
    const { children, className: _c, as: _a, ...rest } = props;
    return (
      <button type="button" className={className} {...rest}>
        {children}
      </button>
    );
  }
  return (
    <Link href={props.href ?? "#"} className={className} target={props.target} rel={props.rel}>
      {props.children}
    </Link>
  );
}

export function SecondaryButton(props: ButtonProps) {
  const className = `${base} border border-line text-ink hover:bg-surface-2 ${props.className ?? ""}`;
  if (props.as === "button") {
    const { children, className: _c, as: _a, ...rest } = props;
    return (
      <button type="button" className={className} {...rest}>
        {children}
      </button>
    );
  }
  return (
    <Link href={props.href ?? "#"} className={className} target={props.target} rel={props.rel}>
      {props.children}
    </Link>
  );
}
