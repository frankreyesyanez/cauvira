"use client";

import { useRef, useState } from "react";
import { addToCartAction } from "@/features/cart/cart.mutations";
import type { CatalogOptionGroup } from "@/features/catalog/pricing";
import { formatMxn } from "@/lib/money";

type ProductConfigureProps = {
  productId: string;
  priceMinor: number;
  optionGroups: CatalogOptionGroup[];
};

function liveTotalMinor(
  priceMinor: number,
  optionGroups: CatalogOptionGroup[],
  selected: Record<string, string>,
) {
  let extra = 0;
  for (const group of optionGroups) {
    const choiceId = selected[group.id];
    if (!choiceId) continue;
    const value = group.values.find((option) => option.id === choiceId);
    if (value) extra += value.priceDeltaMinor;
  }
  return priceMinor + extra;
}

export function ProductConfigure({
  productId,
  priceMinor,
  optionGroups,
}: ProductConfigureProps) {
  const [selected, setSelected] = useState<Record<string, string>>({});
  const [invalidGroupId, setInvalidGroupId] = useState<string | null>(null);
  const groupRefs = useRef<Record<string, HTMLFieldSetElement | null>>({});

  const canSubmit = optionGroups.every(
    (group) => !group.required || Boolean(selected[group.id]),
  );
  const totalMinor = liveTotalMinor(priceMinor, optionGroups, selected);
  const choiceIds = Object.values(selected).filter(Boolean);

  function firstIncompleteGroup() {
    return optionGroups.find((group) => group.required && !selected[group.id]);
  }

  function markFirstIncomplete() {
    const group = firstIncompleteGroup();
    if (!group) return;
    setInvalidGroupId(group.id);
    groupRefs.current[group.id]?.focus();
  }

  function selectChoice(groupId: string, valueId: string) {
    setSelected((current) => ({ ...current, [groupId]: valueId }));
    setInvalidGroupId((current) => (current === groupId ? null : current));
  }

  return (
    <form
      action={async (formData) => {
        await addToCartAction(formData);
      }}
      className="product-configure"
    >
      <input name="productId" type="hidden" value={productId} />
      {choiceIds.map((choiceId) => (
        <input key={choiceId} name="choiceId" type="hidden" value={choiceId} />
      ))}

      {optionGroups.map((group) => {
        const headingId = `${group.id}-label`;
        const invalid = invalidGroupId === group.id;

        return (
          <fieldset
            key={group.id}
            ref={(node) => {
              groupRefs.current[group.id] = node;
            }}
            aria-invalid={invalid || undefined}
            aria-labelledby={headingId}
            aria-required={group.required || undefined}
            className="product-configure__group"
            role="radiogroup"
            tabIndex={-1}
          >
            <legend className="product-configure__legend" id={headingId}>
              {group.name}
              {group.required ? (
                <span className="product-configure__required">Obligatorio</span>
              ) : (
                <span className="product-configure__optional">Opcional</span>
              )}
            </legend>
            <div className="product-configure__options">
              {group.values.map((value) => (
                <label className="product-configure__option" key={value.id}>
                  <input
                    checked={selected[group.id] === value.id}
                    name={group.id}
                    onChange={() => selectChoice(group.id, value.id)}
                    type="radio"
                    value={value.id}
                  />
                  <span className="product-configure__option-label">
                    {value.label}
                  </span>
                  <span className="product-configure__delta">
                    {value.priceDeltaMinor > 0
                      ? `+${formatMxn(value.priceDeltaMinor)}`
                      : "Incluido"}
                  </span>
                </label>
              ))}
            </div>
          </fieldset>
        );
      })}

      <p aria-live="polite" className="product-configure__total">
        <span className="product-configure__total-label">Total</span>
        <span className="product-configure__total-value">
          {formatMxn(totalMinor)}
        </span>
      </p>

      <div
        className="product-configure__submit"
        onClick={() => {
          if (!canSubmit) markFirstIncomplete();
        }}
      >
        <button
          className="button button--primary"
          disabled={!canSubmit}
          onClick={(event) => {
            if (canSubmit) return;
            event.preventDefault();
            markFirstIncomplete();
          }}
          type="submit"
        >
          Agregar al carrito
        </button>
      </div>
    </form>
  );
}
