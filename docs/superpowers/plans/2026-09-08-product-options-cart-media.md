# Product Options, Guest Bag, and Staff Media Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Every published product has a starting price and **Agregar al carrito**; staff-defined priced options and photos live on the product; the guest bag at `/bolsa` lists lines and a total without payment.

**Architecture:** Keep catalog mutations in `src/features/catalog`. Add a pure price helper, product option/image tables next to products, and a separate `src/features/cart` module keyed by an httpOnly `cauvira_cart` cookie. The browser never submits a money total. Staff upload images to Supabase Storage; seed photos keep serving from `/catalog/{slug}.jpg` so tests run without Storage credentials.

**Tech Stack:** Next.js 16.3.4, React 19.2.8, TypeScript, Drizzle ORM 0.45.2, Zod 4.5.4, Vitest 5.0.0, Testing Library, Playwright 1.63.0, `@supabase/supabase-js` (Storage only). Work in `.worktrees/cauvira-foundation-catalog` on `feature/cauvira-foundation-catalog`.

## Global Constraints

- Customer-facing money is MXN minor units; display with `formatMxn` from `src/lib/money.ts`.
- Line unit price is `product.priceMinor + sum(selected choice.priceDeltaMinor)`.
- `priceDeltaMinor` is an integer `>= 0`. Negative surcharges are rejected.
- Every product row has `priceMinor` NOT NULL after migration. No bag lines without a number.
- Storefront primary CTA is always **Agregar al carrito**. Purchase modes stay in the database for staff only.
- Customers never upload product images. Only `administrator` and `catalog_manager` upload, reorder, or delete photos.
- Cookie name is `cauvira_cart` (UUID, httpOnly, `SameSite=Lax`, 30-day max-age, `Secure` when `BETTER_AUTH_URL` is https).
- Cart quantity is 1–99. Same `productId` + same choice set increments quantity.
- Server recomputes price on add, quantity change, and bag render.
- No Mercado Pago, transfer, customer accounts, shipping, taxes, or variant SKU matrix.
- Docker is not required. Do not commit `.env.local`.
- Unit tests: `npm test`. E2E: `npm run test:e2e` on port 3100 against `TEST_DATABASE_URL`, `reuseExistingServer: false`.
- Spec: `docs/superpowers/specs/2026-09-08-product-options-cart-media-design.md`.

## File map

```text
src/
  db/schema/catalog.ts          option groups, values, product_images; priceMinor NOT NULL
  db/schema/cart.ts             carts, cart_items
  db/seed.ts                    starting prices, ice/padel options, image URLs
  features/catalog/pricing.ts   lineUnitMinor + choice validation
  features/catalog/catalog.validation.ts  required price + optionGroups
  features/catalog/catalog.repository.ts  persist/load options and images
  features/catalog/catalog.actions.ts     parse optionGroups from FormData
  features/cart/cart-cookie.ts
  features/cart/cart.repository.ts
  features/cart/cart.service.ts
  features/cart/cart.actions.ts
  features/media/product-image-storage.ts
  features/media/product-image.actions.ts
  lib/env.ts                    optional SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY
  components/catalog/product-form.tsx
  components/catalog/product-options-fields.tsx
  components/catalog/product-card.tsx
  components/catalog/product-media.tsx          hover-scrub / swipe
  components/catalog/product-configure.tsx      live total + add
  components/catalog/product-gallery.tsx
  components/catalog/store-chrome.tsx           bag count
  components/catalog/add-to-cart-button.tsx
  app/(store)/bolsa/page.tsx
  app/(store)/productos/[slug]/page.tsx
  app/globals.css
tests/
  unit/pricing.test.ts
  unit/catalog.validation.test.ts
  unit/cart.service.test.ts
  unit/product-card.test.tsx
  unit/product-configure.test.tsx
  unit/product-media.test.tsx
  unit/product-form.test.tsx
  e2e/storefront-catalog.spec.ts
  e2e/guest-bag.spec.ts
```

---

### Task 1: Line price helper

**Files:**
- Create: `src/features/catalog/pricing.ts`
- Test: `tests/unit/pricing.test.ts`

**Interfaces:**
- Consumes: nothing
- Produces: `lineUnitMinor`, `fingerprintChoiceIds`, types `CatalogOptionGroup`, `CatalogOptionValue`

- [ ] **Step 1: Write the failing test**

```ts
import { describe, expect, it } from "vitest";
import { fingerprintChoiceIds, lineUnitMinor } from "@/features/catalog/pricing";

const groups = [
  {
    id: "g-volt",
    name: "Voltaje",
    required: true,
    sortOrder: 0,
    values: [
      { id: "v-220", label: "220 V", priceDeltaMinor: 0, sortOrder: 0 },
      { id: "v-440", label: "440 V", priceDeltaMinor: 850_000, sortOrder: 1 },
    ],
  },
  {
    id: "g-install",
    name: "Instalación",
    required: true,
    sortOrder: 1,
    values: [
      { id: "i-basic", label: "Básica", priceDeltaMinor: 0, sortOrder: 0 },
      { id: "i-full", label: "Completa", priceDeltaMinor: 1_250_000, sortOrder: 1 },
    ],
  },
  {
    id: "g-extra",
    name: "Garantía extendida",
    required: false,
    sortOrder: 2,
    values: [
      { id: "e-yes", label: "Sí", priceDeltaMinor: 500_000, sortOrder: 0 },
    ],
  },
];

describe("lineUnitMinor", () => {
  it("adds selected surcharges to the starting price", () => {
    const result = lineUnitMinor(18_990_000, groups, ["v-440", "i-full"]);
    expect(result).toEqual({ ok: true, unitMinor: 21_090_000 });
  });

  it("rejects a missing required group", () => {
    expect(lineUnitMinor(18_990_000, groups, ["v-220"]).ok).toBe(false);
  });

  it("rejects an unknown choice id", () => {
    expect(lineUnitMinor(18_990_000, groups, ["v-220", "i-basic", "nope"]).ok).toBe(
      false,
    );
  });

  it("rejects two values from the same group", () => {
    expect(
      lineUnitMinor(18_990_000, groups, ["v-220", "v-440", "i-basic"]).ok,
    ).toBe(false);
  });

  it("allows omitting an optional group", () => {
    const result = lineUnitMinor(18_990_000, groups, ["v-220", "i-basic"]);
    expect(result).toEqual({ ok: true, unitMinor: 18_990_000 });
  });
});

it("fingerprints choice ids in sorted order", () => {
  expect(fingerprintChoiceIds(["b", "a"])).toBe("a,b");
  expect(fingerprintChoiceIds([])).toBe("");
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/unit/pricing.test.ts`

Expected: FAIL because `@/features/catalog/pricing` is missing.

- [ ] **Step 3: Write minimal implementation**

```ts
export type CatalogOptionValue = {
  id: string;
  label: string;
  priceDeltaMinor: number;
  sortOrder: number;
};

export type CatalogOptionGroup = {
  id: string;
  name: string;
  required: boolean;
  sortOrder: number;
  values: CatalogOptionValue[];
};

export function fingerprintChoiceIds(choiceIds: string[]) {
  return [...choiceIds].sort().join(",");
}

export function lineUnitMinor(
  priceMinor: number,
  groups: CatalogOptionGroup[],
  choiceIds: string[],
): { ok: true; unitMinor: number } | { ok: false; reason: string } {
  const selected = new Set(choiceIds);
  if (selected.size !== choiceIds.length) {
    return { ok: false, reason: "duplicate_choice" };
  }

  const valueById = new Map<string, CatalogOptionValue & { groupId: string }>();
  for (const group of groups) {
    for (const value of group.values) {
      valueById.set(value.id, { ...value, groupId: group.id });
    }
  }

  const usedGroups = new Set<string>();
  let extra = 0;
  for (const id of choiceIds) {
    const value = valueById.get(id);
    if (!value) return { ok: false, reason: "unknown_choice" };
    if (usedGroups.has(value.groupId)) {
      return { ok: false, reason: "duplicate_group" };
    }
    usedGroups.add(value.groupId);
    extra += value.priceDeltaMinor;
  }

  for (const group of groups) {
    if (group.required && !usedGroups.has(group.id)) {
      return { ok: false, reason: "missing_required" };
    }
  }

  return { ok: true, unitMinor: priceMinor + extra };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/unit/pricing.test.ts`

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/features/catalog/pricing.ts tests/unit/pricing.test.ts
git commit -m "feat: compute cart line totals from option surcharges"
```

---

### Task 2: Require starting price and option-group schemas

**Files:**
- Modify: `src/features/catalog/catalog.validation.ts`
- Modify: `tests/unit/catalog.validation.test.ts`
- Modify: `tests/unit/catalog.actions.test.ts` (quotation product forms must send `price`)
- Modify: `src/features/catalog/catalog.actions.ts` (`messageByField` for option groups)

**Interfaces:**
- Consumes: existing `createProductSchema`
- Produces: `productOptionGroupSchema`, `CreateProductInput.priceMinor: number`, `CreateProductInput.optionGroups`

- [ ] **Step 1: Replace the quotation-without-price test with failing required-price and option-group tests**

In `tests/unit/catalog.validation.test.ts`, delete `allows quotation products without a public price`. Add:

```ts
it("requires a positive price for quotation products", () => {
  expect(() =>
    createProductSchema.parse({
      ...valid,
      purchaseMode: "quotation",
      priceMinor: null,
    }),
  ).toThrow(/priceMinor/);
});

it("rejects an option group with no values", () => {
  const result = createProductSchema.safeParse({
    ...valid,
    optionGroups: [{
      name: "Talla",
      required: true,
      sortOrder: 0,
      values: [],
    }],
  });
  expect(result.success).toBe(false);
});

it("rejects a negative surcharge", () => {
  const result = createProductSchema.safeParse({
    ...valid,
    optionGroups: [{
      name: "Talla",
      required: true,
      sortOrder: 0,
      values: [{ label: "M", priceDeltaMinor: -1, sortOrder: 0 }],
    }],
  });
  expect(result.success).toBe(false);
});

it("accepts priced groups", () => {
  expect(
    createProductSchema.parse({
      ...valid,
      optionGroups: [{
        name: "Talla",
        required: true,
        sortOrder: 0,
        values: [{ label: "M", priceDeltaMinor: 0, sortOrder: 0 }],
      }],
    }).optionGroups,
  ).toHaveLength(1);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/unit/catalog.validation.test.ts`

Expected: FAIL on quotation null price still accepted, and `optionGroups` unknown.

- [ ] **Step 3: Update validation**

Replace `createProductSchema` with:

```ts
export const productOptionValueSchema = z.object({
  id: z.uuid().optional(),
  label: z.string().trim().min(1).max(80),
  priceDeltaMinor: z.int().min(0),
  sortOrder: z.int().min(0),
});

export const productOptionGroupSchema = z.object({
  id: z.uuid().optional(),
  name: z.string().trim().min(1).max(80),
  required: z.boolean().default(true),
  sortOrder: z.int().min(0),
  values: z.array(productOptionValueSchema).min(1),
});

export const createProductSchema = z.object({
  title: z.string().trim().min(3).max(160),
  slug: z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
  categoryId: z.uuid(),
  purchaseMode: z.enum(purchaseModes),
  priceMinor: z.int().positive(),
  summary: z.string().trim().min(10).max(300),
  description: z.string().trim().max(10_000).default(""),
  published: z.boolean().default(false),
  optionGroups: z.array(productOptionGroupSchema).default([]),
});
```

Remove the `superRefine` that only required price for `direct_purchase` / `starting_price`.

In `catalog.actions.ts` `saveProduct`, parse `optionGroups` from FormData keys `optionGroups.{i}.name`, `optionGroups.{i}.required`, `optionGroups.{i}.sortOrder`, `optionGroups.{i}.values.{j}.label`, `optionGroups.{i}.values.{j}.price` (pesos string → minor via existing `parsePriceMinor`). Pass them on `parsed.data`.

In `tests/unit/catalog.actions.test.ts`, set `productForm.set("price", "289900")` on the quotation update test so it still authorizes.

- [ ] **Step 4: Run tests**

Run: `npx vitest run tests/unit/catalog.validation.test.ts tests/unit/catalog.actions.test.ts`

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/features/catalog/catalog.validation.ts src/features/catalog/catalog.actions.ts tests/unit/catalog.validation.test.ts tests/unit/catalog.actions.test.ts
git commit -m "feat: require starting price and validate purchase option groups"
```

---

### Task 3: Schema and migration

**Files:**
- Modify: `src/db/schema/catalog.ts`
- Create: `src/db/schema/cart.ts`
- Generate: `drizzle/0003_*.sql` via `npm run db:generate`
- Modify: `src/features/catalog/catalog.repository.ts` types (`priceMinor: number` on published/admin summaries)

**Interfaces:**
- Consumes: Task 2 `optionGroups` on create/update
- Produces: Drizzle tables `productOptionGroups`, `productOptionValues`, `productImages`, `carts`, `cartItems`

- [ ] **Step 1: Write a failing integration test that inserts an option group**

Add to `tests/integration/catalog.repository.test.ts` (will fail until tables exist — implement tables first if generate is blocked, then the test). Prefer: add schema, generate migration, migrate test DB, then write the persistence test in Task 4. This task is schema-only.

- [ ] **Step 2: Add tables**

In `src/db/schema/catalog.ts`:

```ts
import { boolean, integer, jsonb, pgEnum, pgTable, text, timestamp, uniqueIndex, uuid, type AnyPgColumn } from "drizzle-orm/pg-core";

// products.priceMinor becomes:
priceMinor: integer("price_minor").notNull(),

export const productOptionGroups = pgTable("product_option_groups", {
  id: uuid("id").defaultRandom().primaryKey(),
  productId: uuid("product_id").references(() => products.id, { onDelete: "cascade" }).notNull(),
  name: text("name").notNull(),
  required: boolean("required").default(true).notNull(),
  sortOrder: integer("sort_order").default(0).notNull(),
});

export const productOptionValues = pgTable("product_option_values", {
  id: uuid("id").defaultRandom().primaryKey(),
  groupId: uuid("group_id").references(() => productOptionGroups.id, { onDelete: "cascade" }).notNull(),
  label: text("label").notNull(),
  priceDeltaMinor: integer("price_delta_minor").notNull(),
  sortOrder: integer("sort_order").default(0).notNull(),
});

export const productImages = pgTable("product_images", {
  id: uuid("id").defaultRandom().primaryKey(),
  productId: uuid("product_id").references(() => products.id, { onDelete: "cascade" }).notNull(),
  url: text("url").notNull(),
  sortOrder: integer("sort_order").default(0).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});
```

Create `src/db/schema/cart.ts`:

```ts
import { integer, pgTable, text, timestamp, uniqueIndex, uuid } from "drizzle-orm/pg-core";
import { products } from "./catalog";

export const carts = pgTable("carts", {
  id: uuid("id").defaultRandom().primaryKey(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

export const cartItems = pgTable("cart_items", {
  id: uuid("id").defaultRandom().primaryKey(),
  cartId: uuid("cart_id").references(() => carts.id, { onDelete: "cascade" }).notNull(),
  productId: uuid("product_id").references(() => products.id, { onDelete: "cascade" }).notNull(),
  quantity: integer("quantity").notNull(),
  choiceIds: uuid("choice_ids").array().notNull(),
  choiceFingerprint: text("choice_fingerprint").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
}, (table) => [
  uniqueIndex("cart_items_line_unique").on(
    table.cartId,
    table.productId,
    table.choiceFingerprint,
  ),
]);
```

Hand-edit the generated SQL **before** `SET NOT NULL` on `price_minor`:

```sql
UPDATE products SET price_minor = 1 WHERE price_minor IS NULL;
ALTER TABLE "products" ALTER COLUMN "price_minor" SET NOT NULL;
```

- [ ] **Step 3: Generate and migrate**

Run: `npm run db:generate`

Migrate test and (when intended) dev:

`npx drizzle-kit migrate`

Use `MIGRATION_DATABASE_URL` / `TEST_DATABASE_URL` as in existing workflow. Do not point migrate at production unless the operator asked.

- [ ] **Step 4: Typecheck**

Run: `npm run typecheck`

Expected: FAIL on `priceMinor: number | null` until Task 4 updates DTOs. If typecheck fails only on nullability, proceed to Task 4 in the same session after this commit if the schema compiles.

If `tsc` fails on repository types, set `PublishedProductSummary.priceMinor` and `AdminProductSummary.priceMinor` to `number` in this task so the branch typechecks.

- [ ] **Step 5: Commit**

```bash
git add src/db/schema/catalog.ts src/db/schema/cart.ts drizzle
git commit -m "feat: add option, image, and guest cart tables"
```

---

### Task 4: Persist and load options and images on catalog products

**Files:**
- Modify: `src/features/catalog/catalog.repository.ts`
- Modify: `src/features/catalog/catalog.service.ts` (`validateProductInput` passes `optionGroups`)
- Modify: `tests/integration/catalog.repository.test.ts`
- Modify: `tests/unit/catalog.service.test.ts` if create fixtures omit price

**Interfaces:**
- Consumes: `CreateProductInput.optionGroups`, tables from Task 3, `CatalogOptionGroup` from Task 1
- Produces:

```ts
export type ProductImageRecord = { id: string; url: string; sortOrder: number };

export type PublishedProductSummary = {
  id: string;
  title: string;
  slug: string;
  summary: string;
  purchaseMode: string;
  priceMinor: number;
  hasOptions: boolean;
  images: ProductImageRecord[];
};

export type PublishedProductDetail = PublishedProductSummary & {
  description: string;
  attributes: Array<{ label: string; value: unknown; unit: string | null }>;
  optionGroups: CatalogOptionGroup[];
};

export type AdminProductDetail = AdminProductSummary & {
  summary: string;
  description: string;
  attributes: Record<string, ProductAttributeValue>;
  optionGroups: CatalogOptionGroup[];
  images: ProductImageRecord[];
};
```

`createProduct` / `updateProduct` replace option groups in the same transaction (delete groups for product, insert incoming; values cascade). Do not delete `product_images` on option save.

- [ ] **Step 1: Write failing integration test**

Create a product with one group “Talla” / “M” delta 0. `getAdminProductById` returns that group. `getPublishedProductBySlug` after `published: true` returns `optionGroups` and `hasOptions: true`. A second product with empty `optionGroups` has `hasOptions: false`.

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/integration/catalog.repository.test.ts`

Expected: FAIL until repository writes option tables.

- [ ] **Step 3: Implement repository writes/reads**

Load option groups ordered by `sortOrder`, values ordered by `sortOrder`. Load images ordered by `sortOrder`. For listings, `hasOptions` is true when the product has ≥1 group. Attach image rows (can be a second query grouped by `productId`).

- [ ] **Step 4: Run tests**

Run: `npx vitest run tests/integration/catalog.repository.test.ts tests/unit/catalog.service.test.ts`

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/features/catalog/catalog.repository.ts src/features/catalog/catalog.service.ts tests/integration/catalog.repository.test.ts tests/unit/catalog.service.test.ts
git commit -m "feat: persist product purchase options and gallery rows"
```

---

### Task 5: Backoffice option-group editor

**Files:**
- Create: `src/components/catalog/product-options-fields.tsx`
- Modify: `src/components/catalog/product-form.tsx`
- Modify: `tests/unit/product-form.test.tsx`
- Modify: `src/app/(admin)/backoffice/catalogo/[id]/editar/page.tsx` to pass `initialProduct.optionGroups`

**Interfaces:**
- Consumes: `CatalogOptionGroup`, FormData names from Task 2
- Produces: staff UI section **Opciones de compra**

- [ ] **Step 1: Write failing UI test**

```ts
it("lets staff add a purchase option group with a priced value", () => {
  render(<ProductForm action={vi.fn()} categories={categories} />);
  fireEvent.click(screen.getByRole("button", { name: /agregar grupo de opciones/i }));
  fireEvent.change(screen.getByLabelText(/nombre del grupo/i), {
    target: { value: "Talla" },
  });
  fireEvent.change(screen.getByLabelText(/^etiqueta$/i), {
    target: { value: "M" },
  });
  fireEvent.change(screen.getByLabelText(/cargo \(mxn\)/i), {
    target: { value: "0" },
  });
  expect(screen.getByLabelText(/nombre del grupo/i)).toHaveValue("Talla");
});

it("requires public price for every purchase mode", () => {
  render(<ProductForm action={vi.fn()} categories={categories} />);
  fireEvent.change(screen.getByLabelText(/modalidad de compra/i), {
    target: { value: "quotation" },
  });
  expect(screen.getByLabelText(/precio público/i)).toBeRequired();
});
```

Change the CTA preview test: every mode previews **Agregar al carrito** (storefront), not the old four labels. Keep purchase mode as an internal select.

Price field: `required` always; help text “Obligatorio. El cliente lo ve como precio desde.”

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/unit/product-form.test.tsx`

Expected: FAIL (missing button / old CTA copy).

- [ ] **Step 3: Implement the fields**

Client component list of groups. Buttons: agregar grupo, agregar valor, quitar grupo, quitar valor. Hidden inputs for `sortOrder`. Checkbox `optionGroups.{i}.required` default on. `Field` for cargo uses pesos like the product price (`parsePriceMinor` already on the server).

Do not put a file input in this task.

- [ ] **Step 4: Run tests**

Run: `npx vitest run tests/unit/product-form.test.tsx tests/unit/catalog.actions.test.ts`

Expected: PASS. Add an actions test that `optionGroups.0.name=Talla` and `optionGroups.0.values.0.label=M` and `optionGroups.0.values.0.price=0` reach `createProduct`.

- [ ] **Step 5: Commit**

```bash
git add src/components/catalog/product-form.tsx src/components/catalog/product-options-fields.tsx src/features/catalog/catalog.actions.ts src/app/(admin)/backoffice/catalogo src/app/globals.css tests/unit/product-form.test.tsx tests/unit/catalog.actions.test.ts
git commit -m "feat: let catalog staff edit priced purchase options"
```

---

### Task 6: Guest cart service

**Files:**
- Create: `src/features/cart/cart.repository.ts`
- Create: `src/features/cart/cart.service.ts`
- Test: `tests/unit/cart.service.test.ts`
- Test: `tests/integration/cart.repository.test.ts`

**Interfaces:**
- Consumes: `lineUnitMinor`, `fingerprintChoiceIds`, `CatalogRepository.getPublishedProductById` **add this method** on the catalog repo (published product by id, including `optionGroups` and `priceMinor`, or null if unpublished)
- Produces:

```ts
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

createCartService(cartRepo, catalogRepo)
  addItem({ cartId, productId, choiceIds, quantity })
  updateQuantity({ cartId, itemId, quantity })
  removeItem({ cartId, itemId })
  getCart(cartId): CartView
```

Invalid line: unpublished product, unknown choice, or `lineUnitMinor` not ok. `invalid: true`, `unitMinor`/`lineMinor` null, excluded from `subtotalMinor`. `itemCount` still sums all quantities.

Merge: same cart + product + fingerprint → add quantities, cap 99.

- [ ] **Step 1: Write failing unit tests with in-memory repos**

Cover: add coffee with `choiceIds: []` → unit = product price; add ice with two required choices → unit = base + deltas; second add same fingerprint increments qty; missing required choice throws a named error `CartInputError` with `reason: "missing_required"`; unpublished product throws `product_unavailable`.

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/unit/cart.service.test.ts`

Expected: FAIL (module missing).

- [ ] **Step 3: Implement service + drizzle repository**

`choiceIds` stored as UUID array; `choiceFingerprint` from `fingerprintChoiceIds`. Quantity check: integer 1–99.

Add `getPublishedProductById(id: string)` on catalog repository (same shape as detail, without slug lookup).

- [ ] **Step 4: Run tests**

Run: `npx vitest run tests/unit/cart.service.test.ts tests/integration/cart.repository.test.ts tests/integration/catalog.repository.test.ts`

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/features/cart src/features/catalog/catalog.repository.ts tests/unit/cart.service.test.ts tests/integration/cart.repository.test.ts
git commit -m "feat: add guest cart lines with server-side priced options"
```

---

### Task 7: Cart cookie, actions, and header count

**Files:**
- Create: `src/features/cart/cart-cookie.ts`
- Create: `src/features/cart/cart.actions.ts`
- Create: `src/features/cart/cart.mutations.ts` (`"use server"` wrappers like catalog)
- Modify: `src/components/catalog/store-chrome.tsx`
- Create: `src/components/catalog/add-to-cart-button.tsx`
- Test: `tests/unit/cart-cookie.test.ts` if logic is extractable; otherwise test actions with mocked cookies
- Test: `tests/unit/add-to-cart-button.test.tsx`

**Interfaces:**
- Consumes: Task 6 `createCartService`
- Produces: `CART_COOKIE = "cauvira_cart"`, `ensureCartId()`, `addToCartAction`, `getBagItemCount()`

Cookie options: `httpOnly: true`, `sameSite: "lax"`, `path: "/"`, `maxAge: 60 * 60 * 24 * 30`, `secure: env.BETTER_AUTH_URL.startsWith("https://")`. If the cookie value is not a UUID, ignore it and mint a new cart.

`addToCartAction(formData)`: `productId`, repeating `choiceId` fields, optional `quantity` default 1. On failure return `{ ok: false, error: "missing_required" | "product_unavailable" }`. On success `{ ok: true, itemCount }`.

`StoreChrome` new optional prop `bagCount: number`. Link text `Bolsa` with count in a `data-testid="bag-count"` element, e.g. `Bolsa (2)` using `aria-label="Bolsa, 2 artículos"`.

Every store page that renders `StoreChrome` must pass `bagCount={await getBagItemCount()}`. Helper loads cookie; missing cookie → 0 without creating a cart.

- [ ] **Step 1: Write failing tests**

- Cookie helper: invalid string → treat as missing.
- Add-to-cart button (no options): submits `productId`, label **Agregar al carrito**.
- Store chrome: `bagCount={3}` exposes `Bolsa (3)`.

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run tests/unit/add-to-cart-button.test.tsx tests/unit/store-chrome.test.tsx`

Create `tests/unit/store-chrome.test.tsx` if missing.

- [ ] **Step 3: Implement cookie, actions, chrome, and thread `bagCount` through home, listing, and detail pages**

Follow `src/features/catalog/catalog.mutations.ts` for the `"use server"` export pattern.

- [ ] **Step 4: Run unit tests**

Run: `npx vitest run tests/unit/add-to-cart-button.test.tsx tests/unit/store-chrome.test.tsx tests/unit/home-view.test.tsx`

Expected: PASS after Task 8 updates home-view; if home-view still expects four CTAs, leave that file for Task 8 and only run the new tests here.

- [ ] **Step 5: Commit**

```bash
git add src/features/cart src/components/catalog/store-chrome.tsx src/components/catalog/add-to-cart-button.tsx src/app/(store) tests/unit/store-chrome.test.tsx tests/unit/add-to-cart-button.test.tsx tests/unit/cart-cookie.test.ts
git commit -m "feat: persist guest bag id and add-to-cart server actions"
```

---

### Task 8: Storefront cards and product configure

**Files:**
- Modify: `src/components/catalog/product-card.tsx`
- Create: `src/components/catalog/product-configure.tsx`
- Modify: `src/app/(store)/productos/[slug]/page.tsx`
- Delete usage of `src/components/catalog/product-detail-action.ts` from storefront (file may remain unused; delete it and its imports)
- Modify: `tests/unit/product-card.test.tsx`
- Modify: `tests/unit/home-view.test.tsx`
- Create: `tests/unit/product-configure.test.tsx`
- Modify: `src/app/globals.css`

**Interfaces:**
- Consumes: `PublishedProductSummary.hasOptions`, `PublishedProductDetail.optionGroups`, `addToCartAction`, `lineUnitMinor` (client can duplicate the sum for live display only; submit choice ids, not money)
- Produces: unified card CTA; detail live total

Card rules:
- Commercial line always `Desde {formatMxn(priceMinor)}`.
- If `hasOptions`, primary control is a `Link` **Agregar al carrito** → `/productos/{slug}`.
- If `!hasOptions`, primary control is `AddToCartButton` with `productId`.

Detail:
- Price heading `Desde {formatMxn(priceMinor)}`.
- Radio groups named by group id. Live total in `aria-live="polite"`: `formatMxn` of `priceMinor + selected deltas`.
- Submit disabled until every `required` group has a value; on click without selection, `aria-invalid` on the first incomplete group and `.focus()`.
- After successful add, stay on the page (server action re-render updates bag count).

Give all four fixtures in card/home tests a `priceMinor` number, `hasOptions: false` except one ice fixture `hasOptions: true`. Expect **four** visible **Agregar al carrito** names (getAllByRole). Ice card `href` ends with `/productos/maquina-hielo`. Coffee-style card is a button or form, not a link to `#comprar`.

- [ ] **Step 1: Rewrite failing product-card and home-view tests as specified above**

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run tests/unit/product-card.test.tsx tests/unit/home-view.test.tsx tests/unit/product-configure.test.tsx`

- [ ] **Step 3: Implement card + configure + detail page**

`product-configure.tsx` is `"use client"`. It receives `productId`, `priceMinor`, `optionGroups`.

- [ ] **Step 4: Run tests**

Run: `npx vitest run tests/unit/product-card.test.tsx tests/unit/home-view.test.tsx tests/unit/product-configure.test.tsx`

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/components/catalog/product-card.tsx src/components/catalog/product-configure.tsx src/components/catalog/product-detail-action.ts src/app/(store)/productos src/app/globals.css tests/unit/product-card.test.tsx tests/unit/home-view.test.tsx tests/unit/product-configure.test.tsx
git commit -m "feat: show starting price, options, and add-to-cart on the storefront"
```

---

### Task 9: Staff product photos (Supabase Storage)

**Files:**
- Modify: `package.json` — add `@supabase/supabase-js`
- Modify: `src/lib/env.ts`, `tests/unit/env.test.ts`, `tests/setup.ts`, `.env.example`
- Create: `src/features/media/product-image-storage.ts`
- Create: `src/features/media/product-image.actions.ts`
- Create: `src/features/media/product-image.validation.ts`
- Modify: `src/components/catalog/product-form.tsx` (edit only)
- Modify: `next.config.ts` `serverActions.bodySizeLimit: "6mb"`
- Test: `tests/unit/product-image.validation.test.ts`
- Test: `tests/unit/product-form.test.tsx` (file input absent on create; present on edit)

**Interfaces:**
- Consumes: `productImages` table, catalog mutation roles
- Produces: upload/reorder/delete for staff; public URL stored on `product_images`

Validation constants: MIME `image/jpeg`, `image/png`, `image/webp`; max `5 * 1024 * 1024` bytes; max 12 images per product.

`SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` are **optional** in `parseEnv` so CI/unit tests keep working. If upload is attempted without them, return field error `images: ["No se puede subir la foto: falta configuración de almacenamiento."]`.

Bucket name `product-images`, object key `{productId}/{uuid}.{ext}`. After upload, insert `product_images` with `sortOrder = max+1`. Cover is `sortOrder === 0` after reorder.

Create flow: no file input. Edit flow: list current images, upload, reorder (up/down), delete.

Customers: no upload UI on storefront. Assert in a storefront test that `product-detail` has no `input[type=file]`.

- [ ] **Step 1: Write failing validation tests** for MIME, size, count 13

- [ ] **Step 2: Run to verify fail**

Run: `npx vitest run tests/unit/product-image.validation.test.ts`

- [ ] **Step 3: Implement validation, storage wrapper, actions, form gallery on edit, env optional keys**

`npm install @supabase/supabase-js`

Document in `.env.example` without secrets.

- [ ] **Step 4: Run tests**

Run: `npx vitest run tests/unit/product-image.validation.test.ts tests/unit/env.test.ts tests/unit/product-form.test.tsx`

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add package.json package-lock.json src/lib/env.ts src/features/media src/components/catalog/product-form.tsx next.config.ts .env.example tests/setup.ts tests/unit/env.test.ts tests/unit/product-image.validation.test.ts tests/unit/product-form.test.tsx
git commit -m "feat: let catalog staff upload and reorder product photos"
```

---

### Task 10: Hover-scrub gallery

**Files:**
- Modify: `src/components/catalog/product-media.tsx` to accept `images: { url: string }[]` (and `title`)
- Create: `src/components/catalog/product-gallery.tsx` for the detail page
- Modify: `src/components/catalog/product-card.tsx` and detail page to pass `product.images`
- Modify: `src/lib/catalog-image.ts` — stop using the slug set as the source of truth; keep the file only if still used as fallback. Prefer DB URLs. Fallback placeholder when `images.length === 0`.
- Modify: `tests/unit/catalog-image.test.ts` / new `tests/unit/product-media.test.tsx`
- Modify: `src/app/globals.css`

**Interfaces:**
- Consumes: `ProductImageRecord[]`
- Produces: card hover-scrub; detail gallery

Card, 2+ images:
- Tick marks (`data-testid="gallery-ticks"`) with `aria-hidden`.
- `onPointerMove`: `index = min(n-1, floor((offsetX / width) * n))`.
- `onPointerLeave`: reset to 0 (cover).
- Touch: `pointerType !== "mouse"` uses swipe (track `pointerdown`/`pointerup` deltaX; threshold 30px) instead of X-mapping.

Detail gallery: large img + thumbnails; hover or click thumbnail updates large image; swipe on the large image for touch.

Zero images: existing “Selección Cauvira” / “CV” placeholder.

- [ ] **Step 1: Write failing media tests**

Render two images. `pointerMove` at the right half (`clientX` / mock `getBoundingClientRect`) shows the second `alt` or `src`. One image: no ticks.

- [ ] **Step 2: Run to verify fail**

Run: `npx vitest run tests/unit/product-media.test.tsx`

- [ ] **Step 3: Implement + CSS** (ticks as equal flex segments on the visual)

- [ ] **Step 4: Run tests**

Run: `npx vitest run tests/unit/product-media.test.tsx tests/unit/product-card.test.tsx tests/unit/catalog-image.test.ts`

Update `catalog-image.test.ts` if the slug helper is removed.

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/components/catalog/product-media.tsx src/components/catalog/product-gallery.tsx src/components/catalog/product-card.tsx src/lib/catalog-image.ts src/app/globals.css src/app/(store)/productos tests/unit/product-media.test.tsx tests/unit/catalog-image.test.ts
git commit -m "feat: add hover-scrub product galleries"
```

---

### Task 11: Bag page

**Files:**
- Create: `src/app/(store)/bolsa/page.tsx`
- Create: `src/components/catalog/bag-view.tsx`
- Modify: `src/features/cart/cart.actions.ts` — `updateCartItemQuantityAction`, `removeCartItemAction`
- Create: `tests/unit/bag-view.test.tsx`
- Modify: `src/app/globals.css`

**Interfaces:**
- Consumes: `getCart`, `CartView`
- Produces: `/bolsa` UI

Empty copy: `Tu bolsa está vacía.` + link **Ver catálogo** → `/productos`.

Filled: each line cover, title, choice labels, `formatMxn(unitMinor)` or **Esta combinación ya no está disponible. Vuelve al producto para elegir de nuevo.** with link to `/productos/{slug}`, quantity select 1–99, remove button **Quitar**. Subtotal label **Subtotal** using `formatMxn(subtotalMinor)` (invalid lines excluded). Footer: `El pago en línea se habilitará en el siguiente paso.` No charging button.

- [ ] **Step 1: Write failing bag-view tests** for empty, valid line, invalid line excluded from subtotal

- [ ] **Step 2: Run to verify fail**

Run: `npx vitest run tests/unit/bag-view.test.tsx`

- [ ] **Step 3: Implement page + view + quantity/remove actions**

- [ ] **Step 4: Run tests**

Run: `npx vitest run tests/unit/bag-view.test.tsx`

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/app/(store)/bolsa src/components/catalog/bag-view.tsx src/features/cart src/app/globals.css tests/unit/bag-view.test.tsx
git commit -m "feat: show guest bag lines, quantities, and subtotal"
```

---

### Task 12: Seed starting prices, options, and cover URLs

**Files:**
- Modify: `src/db/seed.ts`
- Modify: `e2e/storefront-catalog.spec.ts` (old **Solicitar cotización** link)

**Interfaces:**
- Consumes: catalog create/update with `optionGroups`; image insert helper on repository `replaceProductImages` or seed SQL insert into `product_images`

Seed prices (MXN minor):
- `montacargas-electrico`: `28_990_000` ($289,900)
- `montacargas-diesel-3t`: `31_200_000`
- `cancha-de-padel-panoramica`: `89_000_000`
- `cancha-de-padel-indoor`: `76_000_000`

Ice machines — three required groups:
- Voltaje: 220 V / 0, 440 V / `850_000`
- Instalación: Básica / 0, Completa / `1_250_000`
- Tratamiento de agua: Sin tratamiento / 0, Ósmosis / `1_890_000`

Padel — one required group **Piso**: Césped sintético / 0, Resina / `4_500_000`.

Coffee — `optionGroups: []`.

For each of the eight slugs, upsert `product_images` with `url: /catalog/{slug}.jpg`, `sortOrder: 0`.

Extend seed upsert to send `optionGroups` and images. If `updateProduct` already replaces groups, that is enough; images need an explicit insert if not on the product schema input. Add `setProductImages(productId, urls: string[])` on the catalog repository used only by seed (and tests).

- [ ] **Step 1: Adjust e2e search test**

```ts
await page.getByRole("searchbox", { name: /buscar/i }).fill("montacargas");
await page.getByRole("button", { name: "Buscar" }).click();
await expect(page.getByRole("heading", { name: /montacargas eléctrico/i })).toBeVisible();
await page.getByRole("link", { name: /montacargas eléctrico/i }).click();
await expect(page).toHaveURL(/productos\/montacargas-electrico/);
await expect(page.getByText(/desde/i)).toBeVisible();
await expect(page.getByRole("button", { name: "Agregar al carrito" })).toBeVisible();
```

- [ ] **Step 2: Update seed; run unit tests that parse seed types**

- [ ] **Step 3: Run `npm test`**

Expected: PASS (e2e in Task 13)

- [ ] **Step 4: Commit**

```bash
git add src/db/seed.ts src/features/catalog/catalog.repository.ts e2e/storefront-catalog.spec.ts
git commit -m "feat: seed starting prices, ice options, and catalog cover images"
```

---

### Task 13: Guest-bag Playwright coverage

**Files:**
- Create: `e2e/guest-bag.spec.ts`
- Modify: `e2e/admin-catalog.spec.ts` if product create now requires price on quotation (set a price in the form)

**Interfaces:**
- Consumes: seeded coffee (no options) and ice (options)

- [ ] **Step 1: Write e2e**

```ts
import { expect, test } from "@playwright/test";

test("adds coffee from the card and shows it in the bag", async ({ page }) => {
  await page.goto("/productos?q=cafe");
  await page.getByRole("article").filter({ hasText: /café de especialidad/i })
    .getByRole("button", { name: "Agregar al carrito" })
    .click();
  await expect(page.getByTestId("bag-count")).toContainText("1");
  await page.getByRole("link", { name: /bolsa/i }).click();
  await expect(page).toHaveURL(/bolsa/);
  await expect(page.getByRole("heading", { name: /café de especialidad/i })).toBeVisible();
  await expect(page.getByText(/el pago en línea se habilitará/i)).toBeVisible();
});

test("requires ice-machine options then adds the priced line", async ({ page }) => {
  await page.goto("/productos/maquina-de-hielo-industrial-500");
  await page.getByRole("button", { name: "Agregar al carrito" }).click();
  await expect(page.getByRole("radiogroup", { name: /voltaje/i })).toBeVisible();
  await page.getByRole("radio", { name: "440 V" }).check();
  await page.getByRole("radio", { name: "Completa" }).check();
  await page.getByRole("radio", { name: /ósmosis/i }).check();
  await page.getByRole("button", { name: "Agregar al carrito" }).click();
  await expect(page.getByTestId("bag-count")).toContainText("1");
  await page.goto("/bolsa");
  await expect(page.getByText(/440 V/i)).toBeVisible();
  await expect(page.getByText(/subtotal/i)).toBeVisible();
});
```

Wire `radiogroup` names via `aria-labelledby` on each option group in `product-configure.tsx` if the first click assertion needs it.

- [ ] **Step 2: Run e2e**

Run: `npm run test:e2e`

Expected: PASS (Playwright starts Next on 3100 against test DB; seed must have run against `TEST_DATABASE_URL` as today).

If admin e2e creates a product without price, add a price field fill.

- [ ] **Step 3: Commit**

```bash
git add e2e/guest-bag.spec.ts e2e/admin-catalog.spec.ts src/components/catalog/product-configure.tsx
git commit -m "test: cover guest add-to-cart and priced ice options"
```

---

## Spec coverage

| Spec section | Task |
| --- | --- |
| Priced choices, live total formula | 1, 8 |
| Required starting price | 2, 3, 5, 12 |
| Admin option groups | 5 |
| Staff-only photos, MIME/size/count | 9 |
| Storefront CTA Agregar al carrito | 8 |
| Cards: link vs add | 8 |
| Hover-scrub + detail gallery | 10 |
| Bag cookie, lines, merge, invalid lines | 6, 7, 11 |
| Seed ice/padel/coffee | 12 |
| Tests / e2e | 1–13 |
| Out of scope payments | none (not implemented) |

## Placeholder scan

No TBD/TODO remaining. `choiceFingerprint` implements the spec unique `(cartId, productId, choiceIds)` constraint in a Drizzle-friendly way.

## Type consistency

- `CatalogOptionGroup` / `CatalogOptionValue` originate in Task 1 and are reused by catalog DTOs, configure UI, and cart pricing.
- `priceMinor` is `number` after Task 3.
- `CART_COOKIE` is `cauvira_cart`.
- `hasOptions` on summaries drives card behavior in Task 8.
