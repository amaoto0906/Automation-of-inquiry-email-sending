"use client";

import type { ButtonHTMLAttributes, ReactNode } from "react";
import Link from "next/link";
import { LoaderCircle } from "lucide-react";

type Props = {
  children: ReactNode;
  href?: string;
  variant?: "primary" | "secondary" | "danger" | "ghost";
  icon?: ReactNode;
  loading?: boolean;
} & ButtonHTMLAttributes<HTMLButtonElement>;

export function ActionButton({
  children,
  href,
  variant = "primary",
  icon,
  loading,
  className = "",
  ...props
}: Props) {
  const classes = `button button-${variant} ${className}`;
  if (href) {
    return <Link href={href} className={classes}>{icon}{children}</Link>;
  }
  return (
    <button className={classes} {...props} disabled={props.disabled || loading}>
      {loading ? <LoaderCircle className="spin" size={17} /> : icon}
      {children}
    </button>
  );
}
