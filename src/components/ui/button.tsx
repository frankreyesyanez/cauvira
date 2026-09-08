import type { ButtonHTMLAttributes, ReactNode } from "react";

export type ButtonVariant = "primary" | "secondary" | "danger" | "ghost";

export type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  loading?: boolean;
  variant?: ButtonVariant;
};

function Spinner() {
  return (
    <svg
      aria-hidden="true"
      className="button__spinner"
      viewBox="0 0 24 24"
      width="18"
      height="18"
    >
      <circle cx="12" cy="12" r="9" />
      <path d="M21 12a9 9 0 0 0-9-9" />
    </svg>
  );
}

function getLoadingLabel(children: ReactNode) {
  if (typeof children !== "string") {
    return "Guardando";
  }

  return `Guardando ${children.replace(/^guardar\s+/i, "")}`;
}

export function Button({
  children,
  className = "",
  disabled,
  loading = false,
  type = "button",
  variant = "primary",
  ...props
}: ButtonProps) {
  const label = loading ? getLoadingLabel(children) : undefined;

  return (
    <button
      {...props}
      aria-busy={loading || undefined}
      aria-label={label}
      className={`button button--${variant} ${className}`.trim()}
      data-variant={variant}
      disabled={disabled || loading}
      type={type}
    >
      {loading ? <Spinner /> : null}
      <span>{loading ? label : children}</span>
    </button>
  );
}
