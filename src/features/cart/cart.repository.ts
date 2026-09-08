import { and, asc, eq } from "drizzle-orm";
import type { createDatabase } from "@/db/create-database";
import { cartItems, carts } from "@/db/schema/cart";

export type CartItemRecord = {
  id: string;
  cartId: string;
  productId: string;
  quantity: number;
  choiceIds: string[];
  choiceFingerprint: string;
};

export interface CartRepository {
  createCart(): Promise<{ id: string }>;
  getCart(id: string): Promise<{ id: string } | null>;
  listItems(cartId: string): Promise<CartItemRecord[]>;
  findItemByFingerprint(
    cartId: string,
    productId: string,
    choiceFingerprint: string,
  ): Promise<CartItemRecord | null>;
  getItem(id: string): Promise<CartItemRecord | null>;
  insertItem(input: {
    cartId: string;
    productId: string;
    quantity: number;
    choiceIds: string[];
    choiceFingerprint: string;
  }): Promise<CartItemRecord>;
  updateItemQuantity(id: string, quantity: number): Promise<CartItemRecord | null>;
  deleteItem(id: string): Promise<boolean>;
}

type Database = ReturnType<typeof createDatabase>;

function toRecord(row: {
  id: string;
  cartId: string;
  productId: string;
  quantity: number;
  choiceIds: string[];
  choiceFingerprint: string;
}): CartItemRecord {
  return {
    id: row.id,
    cartId: row.cartId,
    productId: row.productId,
    quantity: row.quantity,
    choiceIds: row.choiceIds,
    choiceFingerprint: row.choiceFingerprint,
  };
}

export class DrizzleCartRepository implements CartRepository {
  constructor(private readonly database: Database) {}

  async createCart() {
    const [cart] = await this.database.insert(carts).values({}).returning({ id: carts.id });
    if (!cart) {
      throw new Error("Failed to create cart");
    }
    return cart;
  }

  async getCart(id: string) {
    const [cart] = await this.database
      .select({ id: carts.id })
      .from(carts)
      .where(eq(carts.id, id))
      .limit(1);
    return cart ?? null;
  }

  async listItems(cartId: string) {
    const rows = await this.database
      .select({
        id: cartItems.id,
        cartId: cartItems.cartId,
        productId: cartItems.productId,
        quantity: cartItems.quantity,
        choiceIds: cartItems.choiceIds,
        choiceFingerprint: cartItems.choiceFingerprint,
      })
      .from(cartItems)
      .where(eq(cartItems.cartId, cartId))
      .orderBy(asc(cartItems.createdAt), asc(cartItems.id));
    return rows.map(toRecord);
  }

  async findItemByFingerprint(
    cartId: string,
    productId: string,
    choiceFingerprint: string,
  ) {
    const [row] = await this.database
      .select({
        id: cartItems.id,
        cartId: cartItems.cartId,
        productId: cartItems.productId,
        quantity: cartItems.quantity,
        choiceIds: cartItems.choiceIds,
        choiceFingerprint: cartItems.choiceFingerprint,
      })
      .from(cartItems)
      .where(
        and(
          eq(cartItems.cartId, cartId),
          eq(cartItems.productId, productId),
          eq(cartItems.choiceFingerprint, choiceFingerprint),
        ),
      )
      .limit(1);
    return row ? toRecord(row) : null;
  }

  async getItem(id: string) {
    const [row] = await this.database
      .select({
        id: cartItems.id,
        cartId: cartItems.cartId,
        productId: cartItems.productId,
        quantity: cartItems.quantity,
        choiceIds: cartItems.choiceIds,
        choiceFingerprint: cartItems.choiceFingerprint,
      })
      .from(cartItems)
      .where(eq(cartItems.id, id))
      .limit(1);
    return row ? toRecord(row) : null;
  }

  async insertItem(input: {
    cartId: string;
    productId: string;
    quantity: number;
    choiceIds: string[];
    choiceFingerprint: string;
  }) {
    const [row] = await this.database
      .insert(cartItems)
      .values(input)
      .returning({
        id: cartItems.id,
        cartId: cartItems.cartId,
        productId: cartItems.productId,
        quantity: cartItems.quantity,
        choiceIds: cartItems.choiceIds,
        choiceFingerprint: cartItems.choiceFingerprint,
      });
    if (!row) {
      throw new Error("Failed to insert cart item");
    }
    return toRecord(row);
  }

  async updateItemQuantity(id: string, quantity: number) {
    const [row] = await this.database
      .update(cartItems)
      .set({ quantity })
      .where(eq(cartItems.id, id))
      .returning({
        id: cartItems.id,
        cartId: cartItems.cartId,
        productId: cartItems.productId,
        quantity: cartItems.quantity,
        choiceIds: cartItems.choiceIds,
        choiceFingerprint: cartItems.choiceFingerprint,
      });
    return row ? toRecord(row) : null;
  }

  async deleteItem(id: string) {
    const deleted = await this.database
      .delete(cartItems)
      .where(eq(cartItems.id, id))
      .returning({ id: cartItems.id });
    return deleted.length > 0;
  }
}
