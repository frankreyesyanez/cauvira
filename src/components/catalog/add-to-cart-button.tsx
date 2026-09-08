"use client";

import { AddToCartSubmitButton, useAddToCart } from "@/components/catalog/use-add-to-cart";

type AddToCartButtonProps = {
  productId: string;
};

export function AddToCartButton({ productId }: AddToCartButtonProps) {
  const { error, submitAddToCart } = useAddToCart();

  return (
    <form action={submitAddToCart}>
      <input name="productId" type="hidden" value={productId} />
      <AddToCartSubmitButton />
      {error ? (
        <p className="add-to-cart-error" role="alert">
          {error}
        </p>
      ) : null}
    </form>
  );
}
