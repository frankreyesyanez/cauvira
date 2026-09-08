import type { CatalogRepository } from "@/features/catalog/catalog.repository";
import {
  fingerprintChoiceIds,
  lineUnitMinor,
  type CatalogOptionGroup,
} from "@/features/catalog/pricing";
import type { CartRepository } from "./cart.repository";

export type CartLineView = {
  id: string;
  productId: string;
  slug: string;
  title: string;
  quantity: number;
  choiceIds: string[];
  choiceLabels: string[];
  unitMinor: number | null;
  lineMinor: number | null;
  invalid: boolean;
  coverUrl: string | null;
};

export type CartView = {
  id: string;
  items: CartLineView[];
  itemCount: number;
  subtotalMinor: number;
};

export class CartInputError extends Error {
  constructor(readonly reason: string, message = reason) {
    super(message);
    this.name = "CartInputError";
  }
}

function assertQuantity(quantity: number) {
  if (!Number.isInteger(quantity) || quantity < 1 || quantity > 99) {
    throw new CartInputError("invalid_quantity");
  }
}

function choiceLabelsFor(groups: CatalogOptionGroup[], choiceIds: string[]) {
  const labelsById = new Map<string, string>();
  for (const group of groups) {
    for (const value of group.values) {
      labelsById.set(value.id, value.label);
    }
  }
  return choiceIds.flatMap((id) => {
    const label = labelsById.get(id);
    return label === undefined ? [] : [label];
  });
}

export const createCartService = (
  cartRepo: CartRepository,
  catalogRepo: Pick<CatalogRepository, "getPublishedProductById">,
) => {
  const getCart = async (cartId: string): Promise<CartView> => {
    const items = await cartRepo.listItems(cartId);
    const views: CartLineView[] = [];
    let itemCount = 0;
    let subtotalMinor = 0;

    for (const item of items) {
      itemCount += item.quantity;
      const product = await catalogRepo.getPublishedProductById(item.productId);

      if (!product) {
        views.push({
          id: item.id,
          productId: item.productId,
          slug: "",
          title: "",
          quantity: item.quantity,
          choiceIds: item.choiceIds,
          choiceLabels: [],
          unitMinor: null,
          lineMinor: null,
          invalid: true,
          coverUrl: null,
        });
        continue;
      }

      const priced = lineUnitMinor(
        product.priceMinor,
        product.optionGroups,
        item.choiceIds,
      );
      const coverUrl = product.images[0]?.url ?? null;
      const choiceLabels = choiceLabelsFor(product.optionGroups, item.choiceIds);

      if (!priced.ok) {
        views.push({
          id: item.id,
          productId: item.productId,
          slug: product.slug,
          title: product.title,
          quantity: item.quantity,
          choiceIds: item.choiceIds,
          choiceLabels,
          unitMinor: null,
          lineMinor: null,
          invalid: true,
          coverUrl,
        });
        continue;
      }

      const lineMinor = priced.unitMinor * item.quantity;
      subtotalMinor += lineMinor;
      views.push({
        id: item.id,
        productId: item.productId,
        slug: product.slug,
        title: product.title,
        quantity: item.quantity,
        choiceIds: item.choiceIds,
        choiceLabels,
        unitMinor: priced.unitMinor,
        lineMinor,
        invalid: false,
        coverUrl,
      });
    }

    return { id: cartId, items: views, itemCount, subtotalMinor };
  };

  return {
    async addItem(input: {
      cartId: string;
      productId: string;
      choiceIds: string[];
      quantity: number;
    }) {
      assertQuantity(input.quantity);
      const cart = await cartRepo.getCart(input.cartId);
      if (!cart) {
        throw new CartInputError("cart_not_found");
      }

      const product = await catalogRepo.getPublishedProductById(input.productId);
      if (!product) {
        throw new CartInputError("product_unavailable");
      }

      const priced = lineUnitMinor(
        product.priceMinor,
        product.optionGroups,
        input.choiceIds,
      );
      if (!priced.ok) {
        throw new CartInputError(priced.reason);
      }

      const choiceFingerprint = fingerprintChoiceIds(input.choiceIds);
      const existing = await cartRepo.findItemByFingerprint(
        input.cartId,
        input.productId,
        choiceFingerprint,
      );
      if (existing) {
        await cartRepo.updateItemQuantity(
          existing.id,
          Math.min(99, existing.quantity + input.quantity),
        );
      } else {
        await cartRepo.insertItem({
          cartId: input.cartId,
          productId: input.productId,
          quantity: input.quantity,
          choiceIds: input.choiceIds,
          choiceFingerprint,
        });
      }

      return getCart(input.cartId);
    },

    async updateQuantity(input: { cartId: string; itemId: string; quantity: number }) {
      assertQuantity(input.quantity);
      const item = await cartRepo.getItem(input.itemId);
      if (!item || item.cartId !== input.cartId) {
        throw new CartInputError("item_not_found");
      }
      await cartRepo.updateItemQuantity(input.itemId, input.quantity);
      return getCart(input.cartId);
    },

    async removeItem(input: { cartId: string; itemId: string }) {
      const item = await cartRepo.getItem(input.itemId);
      if (!item || item.cartId !== input.cartId) {
        throw new CartInputError("item_not_found");
      }
      await cartRepo.deleteItem(input.itemId);
      return getCart(input.cartId);
    },

    getCart,
  };
};
