"use client";

import { useState } from "react";
import { useFormStatus } from "react-dom";
import { useRouter } from "next/navigation";
import { addToCartAction } from "@/features/cart/cart.mutations";

export function addToCartFailureMessage(error?: string) {
  if (error === "missing_required") return "Elige las opciones requeridas.";
  if (error === "product_unavailable") return "Este producto no está disponible.";
  return "No se pudo agregar a la bolsa.";
}

export function AddToCartSubmitButton({ disabled = false }: { disabled?: boolean }) {
  const { pending } = useFormStatus();
  return (
    <button className="button button--primary" disabled={disabled || pending} type="submit">
      Agregar al carrito
    </button>
  );
}

export function useAddToCart() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);

  async function submitAddToCart(formData: FormData) {
    setError(null);
    try {
      const result = await addToCartAction(formData);
      if (result.ok) {
        router.refresh();
        return;
      }
      setError(addToCartFailureMessage(result.error));
    } catch {
      setError(addToCartFailureMessage());
    }
  }

  return { error, submitAddToCart };
}
