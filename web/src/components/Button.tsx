"use client";

import { type ButtonHTMLAttributes, type ReactNode } from "react";
import Spinner from "@/components/Spinner";

type ButtonVariant = "primary" | "secondary" | "ghost" | "danger";
type ButtonSize = "sm" | "md" | "lg";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  children: ReactNode;
}

const VARIANT_CLASSES: Record<ButtonVariant, string> = {
  primary:
    "brand-gradient text-white shadow-[0_8px_30px_-8px_rgba(99,91,255,0.8)] hover:shadow-[0_10px_40px_-6px_rgba(99,91,255,0.95)] hover:brightness-110 hover:-translate-y-px active:translate-y-0 focus-visible:outline-brand-500 disabled:opacity-60 disabled:hover:translate-y-0",
  secondary:
    "bg-surface text-foreground border border-border-strong hover:bg-surface-muted hover:border-brand-400 focus-visible:outline-brand-500 disabled:opacity-60",
  ghost:
    "bg-transparent text-muted-strong hover:bg-surface-muted hover:text-foreground focus-visible:outline-brand-500 disabled:opacity-60",
  danger:
    "bg-transparent text-danger border border-transparent hover:border-[color:var(--danger)] hover:bg-[color:var(--danger-soft)] focus-visible:outline-[color:var(--danger)] disabled:opacity-60",
};

const SIZE_CLASSES: Record<ButtonSize, string> = {
  sm: "h-8 px-3 text-sm gap-1.5",
  md: "h-11 px-5 text-sm gap-2",
  lg: "h-12 px-6 text-[0.95rem] gap-2.5",
};

export default function Button({
  variant = "primary",
  size = "md",
  loading = false,
  disabled,
  className = "",
  children,
  type = "button",
  ...rest
}: ButtonProps) {
  return (
    <button
      type={type}
      disabled={disabled || loading}
      className={`inline-flex items-center justify-center rounded-[var(--radius-sm)] font-medium transition-all duration-150 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 disabled:cursor-not-allowed ${VARIANT_CLASSES[variant]} ${SIZE_CLASSES[size]} ${className}`}
      {...rest}
    >
      {loading ? <Spinner className="h-4 w-4" /> : null}
      {children}
    </button>
  );
}
