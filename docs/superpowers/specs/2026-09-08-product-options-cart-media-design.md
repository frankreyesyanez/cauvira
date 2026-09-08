# Product options, bag, and media

Date: 2026-09-08  
Surface: public storefront product cards and detail, `/bolsa`, catalog backoffice product form.

## Problem

Seeded products use four storefront CTAs. `starting_price` shows **Ver configuración**, which only jumps to `#configurar` on the same page. There is no way for a customer to pick purchase options (size, fabric, voltage, court surface) or add anything to `/bolsa`. Catalog photos are static files keyed by slug, not staff-managed galleries.

## Goal

Every published product has a starting price and **Agregar al carrito**. If the product has purchase options, the customer chooses them on the same detail page; the total updates live. The bag lists lines and a total. Staff manage options and photos in the backoffice. Checkout (Mercado Pago, transfer) is out of scope.

## Decisions (approved)

- Option model: **priced choices per product** (base starting price + surcharge per selected value). Not a Shopify variant matrix (no price per combination). Not category-level option templates.
- Technical attributes stay as specs the product *is*. Purchase options are what the customer *chooses*.
- Live total: `priceMinor + sum(selected choice surcharges)`.
- Every product, including quotation and assisted-contact SKUs, has a starting price. No “price to confirm” bag lines.
- Storefront primary CTA is always **Agregar al carrito**, including cards.
- Guest bag: list, quantity, remove, total. No payment.
- Photos: staff-only upload. Customers never upload product images. Cards with 2+ photos use a hover-scrub carousel; the detail page has a gallery.

## 1. Backoffice — purchase options

On create/edit product, after commercial fields and separate from **Ficha técnica**:

**Opciones de compra**

- Add or remove option groups on that product (Talla, Tela, Voltaje, Medida, Piso, …).
- Each group: name, sort order, required (default required).
- Each group has values: label, surcharge in MXN (integer centavos; minimum `0`), sort order.
- Empty product (1 kg coffee): zero groups; add-to-cart uses starting price only.
- Publishing requires at least one value in every group that exists. A group with no values cannot be saved.

`administrator` and `catalog_manager` can edit options. Sales cannot.

## 2. Backoffice — photos

Only **staff** upload product photos (same roles as catalog edit). The public customer never sees an upload control.

- Multiple images per product, reorder, delete.
- First in order is the cover.
- Accept JPEG, PNG, WebP. Max 5 MB per file. Max 12 images per product.
- Invalid file: field error on the product form; other fields stay filled.
- Files live in a public Supabase Storage bucket `product-images`. Env: `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`. Public URLs are stored on `product_images`.
- Current seed JPEGs under `public/catalog/{slug}.jpg` become image 1 for those eight products.

## 3. Storefront — product detail

- Price line is always **Desde {formatMxn(priceMinor)}**.
- Purchase-mode labels (**Ver configuración**, **Solicitar cotización**, **Hablar con un especialista**) are not shown as the primary action. Modes remain in the database for staff lists and future sales workflows.
- If groups exist, they render on the page (radio or select). One value per group. Total (`aria-live`) updates as **Desde + cargos**.
- Primary button: **Agregar al carrito**. Disabled until every required group has a selection; focus moves to the first incomplete group. After a successful add the customer stays on the detail page; the header bag count updates.
- Optional groups may be omitted; required groups may not.
- Gallery: large image + thumbnails. Click or hover changes the large image. Touch: swipe.

## 4. Storefront — cards

- Commercial line: **Desde {price}** for every product.
- Button label: **Agregar al carrito**.
- If the product has any option groups, the button links to `/productos/{slug}` (do not add from the card).
- If the product has zero groups, the button adds qty 1. The customer stays on the current page; the header bag count updates.
- 0–1 photos: static cover (or existing placeholder if none).
- 2+ photos: hover-scrub. Pointer X across the visual maps to photo index; tick marks show count. No hover on touch: swipe.

## 5. Bag (`/bolsa`)

- Header **Bolsa** shows item count (sum of quantities).
- Cookie `cauvira_cart` holds a cart UUID (httpOnly, `SameSite=Lax`, 30-day max-age, `Secure` in production).
- Tables `carts` and `cart_items`. Guest only; no customer account merge in this slice.
- Line stores `productId`, `quantity` (1–99), and selected choice ids. The browser does not submit a total; the server recomputes from catalog on add, update, and bag render.
- Same product + same choice set increments quantity.
- Line shows cover, title, selected labels, unit price, quantity, line total.
- Empty bag: short copy and a link to `/productos`.
- Corrupt or missing cookie: create a new cart. Do not affect staff `/ingresar` session.
- If a stored choice was deleted or the product unpublished: mark the line invalid, explain that the customer must reopen the product and choose again, and exclude it from the payable subtotal until fixed or removed.
- No checkout button that charges money. Secondary copy: payment comes later.

## 6. Data

### Products

- `products.priceMinor` is required (`NOT NULL`) for all rows after migration. Seed quotation and padel products get a starting price.
- Purchase mode enum unchanged.

### Option tables

- `product_option_groups`: `id`, `productId`, `name`, `required`, `sortOrder`.
- `product_option_values`: `id`, `groupId`, `label`, `priceDeltaMinor` (≥ 0), `sortOrder`.

### Images

- `product_images`: `id`, `productId`, `url`, `sortOrder`, `createdAt`.

### Cart

- `carts`: `id`, `createdAt`, `updatedAt`.
- `cart_items`: `id`, `cartId`, `productId`, `quantity`, `choiceIds` (uuid array), `createdAt`.
- Unique on (`cartId`, `productId`, `choiceIds`).

### Price formula

`lineUnitMinor = product.priceMinor + sum(choice.priceDeltaMinor)` for the selected values. All selected values must belong to that product’s groups. Required groups must be present. Reject the add if validation fails.

## 7. Errors

**Customer**

- Incomplete required options: no add; group marked; focus there.
- Missing product: `notFound()`.
- Invalid bag line after catalog change: message + exclude from subtotal.
- Empty bag: catalog link.
- Bad cart cookie: new cart.

**Staff**

- Publish/save without `priceMinor`: blocked.
- Negative surcharge: blocked.
- Group without name or values: field errors.
- Image type/size/count: field error. Customers have no image upload, so there is no customer-facing upload error.

## 8. Seed (dev/test)

Ice machines: groups Voltaje (220 V / 440 V), Instalación (básica / completa), Tratamiento de agua (sin tratamiento / ósmosis), each value with an example surcharge.

Forklifts and padel: starting prices filled; at least one option group on padel (medida or piso) so the selector path is visible.

Coffee: no option groups (direct add from card).

Existing eight catalog JPEGs become sort order 0 images.

## 9. Tests

- Unit: line total; merge same combination; reject add with missing required choice; reject negative delta; require price on product write.
- Product form: add Talla/Tela values with surcharges; image reorder is staff-only.
- Storefront: ice-machine detail live total; coffee card adds; ice-machine card goes to detail; bag quantity and remove.
- E2E on port 3100 against `TEST_DATABASE_URL`, `reuseExistingServer: false`, as today.

## Out of scope

- Mercado Pago, bank transfer, payment webhooks.
- Customer accounts, login, and cart merge across devices beyond the cookie.
- Shipping, tax breakdown, coupons.
- Per-combination SKU/inventory matrix.
- Customer-uploaded images, reviews, or files.
- Documents, warranty, and lead-time content (placeholders remain).
