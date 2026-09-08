"use client";

import { useId, type InputHTMLAttributes, type ReactNode } from "react";

export type FieldProps = Omit<
  InputHTMLAttributes<HTMLInputElement>,
  "aria-describedby" | "aria-invalid"
> & {
  description: ReactNode;
  error?: ReactNode;
  label: ReactNode;
};

export function Field({
  className = "",
  description,
  error,
  id: providedId,
  label,
  ...props
}: FieldProps) {
  const generatedId = useId();
  const id = providedId ?? `field-${generatedId.replaceAll(":", "")}`;
  const descriptionId = `${id}-description`;
  const errorId = `${id}-error`;
  const describedBy = error
    ? `${descriptionId} ${errorId}`
    : descriptionId;

  return (
    <div className="field">
      <label className="field__label" htmlFor={id}>
        {label}
      </label>
      <input
        {...props}
        aria-describedby={describedBy}
        aria-invalid={error ? true : undefined}
        className={`field__control ${className}`.trim()}
        id={id}
      />
      <p className="field__description" id={descriptionId}>
        {description}
      </p>
      {error ? (
        <p className="field__error" id={errorId}>
          <span aria-hidden="true">!</span>
          {error}
        </p>
      ) : null}
    </div>
  );
}
