export const purchaseModes = [
  "direct_purchase",
  "quotation",
  "starting_price",
  "assisted_contact",
] as const;
export type PurchaseMode = (typeof purchaseModes)[number];

export const attributeTypes = ["text", "number", "boolean", "select", "multiselect", "date", "measurement"] as const;
export type AttributeType = (typeof attributeTypes)[number];
