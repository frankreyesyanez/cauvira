"use client";

import type { ChangeEvent } from "react";
import Link from "next/link";
import { StoreChrome } from "@/components/catalog/store-chrome";
import { ProductMediaPlaceholder } from "@/components/catalog/product-media";
import type { AdminCategorySummary } from "@/features/catalog/catalog.repository";
import {
  removeCartItemAction,
  updateCartItemQuantityAction,
} from "@/features/cart/cart.mutations";
import type { CartLineView, CartView } from "@/features/cart/cart.service";
import { formatMxn } from "@/lib/money";

type BagViewProps = {
  cart: CartView;
  categories: AdminCategorySummary[];
  bagCount?: number;
};

const QUANTITY_OPTIONS = Array.from({ length: 99 }, (_, index) => index + 1);

const INVALID_LINE_COPY =
  "Esta combinación ya no está disponible. Vuelve al producto para elegir de nuevo.";

function quantityLabel(item: CartLineView) {
  return item.title ? `Cantidad de ${item.title}` : "Cantidad";
}

function submitQuantityForm(event: ChangeEvent<HTMLSelectElement>) {
  event.currentTarget.form?.requestSubmit();
}

function BagLineCover({ item }: { item: CartLineView }) {
  if (!item.coverUrl) {
    return (
      <div className="store-bag__cover store-bag__cover--placeholder">
        <ProductMediaPlaceholder />
      </div>
    );
  }

  return (
    <div className="store-bag__cover">
      <img alt={item.title || "Producto"} src={item.coverUrl} />
    </div>
  );
}

function BagLineTitle({ item }: { item: CartLineView }) {
  if (!item.title && !item.slug) {
    return null;
  }

  if (item.slug) {
    return (
      <h2>
        <Link href={`/productos/${item.slug}`}>{item.title || "Ver producto"}</Link>
      </h2>
    );
  }

  return <h2>{item.title}</h2>;
}

function BagLineAvailability({ item }: { item: CartLineView }) {
  if (!item.invalid) {
    return null;
  }

  if (item.slug) {
    return (
      <p className="store-bag__invalid">
        <Link href={`/productos/${item.slug}`}>{INVALID_LINE_COPY}</Link>
      </p>
    );
  }

  return <p className="store-bag__invalid">{INVALID_LINE_COPY}</p>;
}

function BagLine({ item }: { item: CartLineView }) {
  return (
    <li className="store-bag__line">
      <BagLineCover item={item} />
      <div className="store-bag__details">
        <p className="store-bag__eyebrow">Línea de pedido</p>
        <BagLineTitle item={item} />
        {item.choiceLabels.length > 0 ? (
          <p className="store-bag__choices">
            {item.choiceLabels.map((label) => (
              <span key={label}>{label}</span>
            ))}
          </p>
        ) : null}
        <BagLineAvailability item={item} />
        {!item.invalid && item.unitMinor != null ? (
          <p className="store-bag__unit">{formatMxn(item.unitMinor)}</p>
        ) : null}
      </div>
      <div className="store-bag__controls">
        <form action={updateCartItemQuantityAction} className="store-bag__quantity">
          <input name="itemId" type="hidden" value={item.id} />
          <label>
            <span>Cantidad</span>
            <select
              aria-label={quantityLabel(item)}
              defaultValue={item.quantity}
              name="quantity"
              onChange={submitQuantityForm}
            >
              {QUANTITY_OPTIONS.map((value) => (
                <option key={value} value={value}>
                  {value}
                </option>
              ))}
            </select>
          </label>
        </form>
        <form action={removeCartItemAction}>
          <input name="itemId" type="hidden" value={item.id} />
          <button className="button button--ghost" type="submit">
            Quitar
          </button>
        </form>
      </div>
    </li>
  );
}

export function BagView({ bagCount, cart, categories }: BagViewProps) {
  const empty = cart.items.length === 0;

  return (
    <main className="store-bag">
      <StoreChrome bagCount={bagCount} categories={categories} />
      <section className="store-bag__sheet" aria-labelledby="bag-title">
        <header className="store-bag__header">
          <div>
            <p className="store-bag__eyebrow">Pedido en curso</p>
            <h1 id="bag-title">Bolsa</h1>
          </div>
        </header>

        {empty ? (
          <div className="store-empty">
            <span aria-hidden="true" className="store-empty__mark">
              ○
            </span>
            <div>
              <h2>Sin artículos</h2>
              <p>Tu bolsa está vacía.</p>
            </div>
            <Link className="button button--primary" href="/productos">
              Ver catálogo
            </Link>
          </div>
        ) : (
          <>
            <ul className="store-bag__list">
              {cart.items.map((item) => (
                <BagLine item={item} key={item.id} />
              ))}
            </ul>
            <aside className="store-bag__ticket">
              <p className="store-bag__subtotal">
                <span>Subtotal</span>
                <strong>{formatMxn(cart.subtotalMinor)}</strong>
              </p>
              <p className="store-bag__footer">
                El pago en línea se habilitará en el siguiente paso.
              </p>
            </aside>
          </>
        )}
      </section>
    </main>
  );
}
