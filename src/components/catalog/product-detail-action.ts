import type { PurchaseMode } from "@/features/catalog/catalog.contracts";

export const productActionByMode: Record<
  PurchaseMode,
  { label: string; anchor: string }
> = {
  direct_purchase: { label: "Agregar al carrito", anchor: "comprar" },
  quotation: { label: "Solicitar cotización", anchor: "cotizar" },
  starting_price: { label: "Ver configuración", anchor: "configurar" },
  assisted_contact: {
    label: "Hablar con un especialista",
    anchor: "especialista",
  },
};

export function getProductAction(mode: string) {
  return (
    productActionByMode[mode as PurchaseMode] ??
    productActionByMode.assisted_contact
  );
}
