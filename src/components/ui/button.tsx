import {
  Children,
  isValidElement,
  type ButtonHTMLAttributes,
  type ReactNode,
} from "react";

export type ButtonVariant = "primary" | "secondary" | "danger" | "ghost";

export type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  loading?: boolean;
  loadingLabel?: string;
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

function getTextContent(node: ReactNode): string {
  if (typeof node === "string" || typeof node === "number") {
    return String(node);
  }

  if (
    !isValidElement<{
      "aria-hidden"?: boolean | "false" | "true";
      children?: ReactNode;
    }>(node)
  ) {
    return Children.toArray(node).map(getTextContent).join(" ");
  }

  if (node.props["aria-hidden"] === true || node.props["aria-hidden"] === "true") {
    return "";
  }

  return getTextContent(node.props.children);
}

function getLoadingLabel(accessibleLabel: string) {
  const normalizedLabel = accessibleLabel.replace(/\s+/g, " ").trim();

  return `Guardando ${normalizedLabel.replace(/^guardar\s+/i, "")}`;
}

export function Button({
  "aria-label": ariaLabel,
  children,
  className = "",
  disabled,
  loading = false,
  loadingLabel,
  type = "button",
  variant = "primary",
  ...props
}: ButtonProps) {
  const originalLabel = ariaLabel ?? getTextContent(children);
  const label = loading
    ? loadingLabel || (originalLabel ? getLoadingLabel(originalLabel) : undefined)
    : ariaLabel;

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
