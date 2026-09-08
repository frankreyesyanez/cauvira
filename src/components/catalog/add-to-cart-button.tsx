import { addToCartAction } from "@/features/cart/cart.mutations";

type AddToCartButtonProps = {
  productId: string;
};

export function AddToCartButton({ productId }: AddToCartButtonProps) {
  async function submit(formData: FormData) {
    "use server";
    await addToCartAction(formData);
  }

  return (
    <form action={submit}>
      <input name="productId" type="hidden" value={productId} />
      <button className="button button--primary" type="submit">
        Agregar al carrito
      </button>
    </form>
  );
}
