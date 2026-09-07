# Cauvira Foundation and Catalog Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the production-shaped Cauvira foundation, authenticated backoffice, dynamic catalog, and searchable public storefront as the first independently deployable release.

**Architecture:** Use one Next.js application deployed on Vercel, with route groups for storefront and backoffice, server-only domain services, Supabase-managed PostgreSQL through Drizzle, and Better Auth for identity. Use separate pooled runtime, direct migration, and isolated test database URLs. Keep catalog, identity, and presentation boundaries separate so later commerce, quotations, purchasing, and fulfillment modules can consume stable catalog interfaces without importing UI code.

**Tech Stack:** Next.js 16.3.4 on Vercel, React 19.2.8, TypeScript, Supabase-managed PostgreSQL, Drizzle ORM 0.45.2, Better Auth 1.7.3, Zod 4.5.4, Tailwind CSS 4.3.3, Vitest 5.0.0, Testing Library, and Playwright 1.63.0.

## Global Constraints

- Initial market is Mexico; customer-facing money is represented in MXN minor units.
- Cauvira is the only customer-facing seller; supplier identity, cost, and margin are private.
- Products support `direct_purchase`, `quotation`, `starting_price`, and `assisted_contact`.
- Administrators add categories, dynamic attributes, and products without code changes.
- Public UI uses warm cement gray, near-black aubergine, acid green, vermilion, and warm cream.
- The storefront exposes search, categories, products, and purchase or quotation actions in the first viewport.
- The backoffice uses the same brand with lower chromatic intensity and denser information.
- Critical statuses never rely on color alone and all text combinations meet WCAG AA.
- Server code validates every mutation and enforces authorization independently of the UI.
- Docker is not required for development, testing, or production hosting.
- Runtime, migration, test, and production database credentials remain separate.
- This phase does not implement checkout, payment capture, quotations, or supplier purchase orders.

## Delivery roadmap

This specification is intentionally split because the approved product contains independently reviewable subsystems:

1. **This plan:** platform foundation, identity, visual system, dynamic catalog, admin editing, and public discovery.
2. **Plan 2:** cart, checkout, Mercado Pago, bank transfer, customer orders, and customer portal.
3. **Plan 3:** quote requests, versioned quotations, PDFs, acceptance, deposits, and partial payments.
4. **Plan 4:** suppliers, purchase-order approval, email/PDF dispatch, accounts payable, and mixed fulfillment.
5. **Plan 5:** production hardening, object storage, observability, accessibility audit, legal content, backups, and deployment.

## File map

```text
src/
  app/
    (store)/
      page.tsx                         storefront home
      productos/page.tsx              searchable product listing
      productos/[slug]/page.tsx       product detail
    (admin)/
      backoffice/layout.tsx            authenticated admin shell
      backoffice/page.tsx              operational landing page
      backoffice/catalogo/page.tsx     product table
      backoffice/catalogo/nuevo/page.tsx
      backoffice/categorias/page.tsx
    api/auth/[...all]/route.ts         Better Auth HTTP handler
    globals.css                        approved design tokens
    layout.tsx                         root document
  components/
    admin/admin-sidebar.tsx
    catalog/product-card.tsx
    catalog/product-form.tsx
    catalog/search-form.tsx
    ui/button.tsx
    ui/field.tsx
  db/
    index.ts                           Supabase PostgreSQL client and Drizzle instance
    schema/auth.ts                     Better Auth tables
    schema/catalog.ts                  category and product tables
    seed.ts                            deterministic local catalog
  features/
    auth/require-role.ts               server authorization guard
    catalog/catalog.contracts.ts       public catalog types
    catalog/catalog.repository.ts      persistence boundary
    catalog/catalog.service.ts         validated use cases
    catalog/catalog.validation.ts      Zod mutation schemas
  lib/
    auth.ts                            Better Auth configuration
    env.ts                             validated environment
    money.ts                           MXN formatting
tests/
  integration/catalog.repository.test.ts
  unit/catalog.service.test.ts
  unit/catalog.validation.test.ts
  unit/money.test.ts
  setup.ts
e2e/
  admin-catalog.spec.ts
  storefront-catalog.spec.ts
drizzle.config.ts
playwright.config.ts
vitest.config.ts
```

---

### Task 1: Bootstrap the application and test harness

**Files:**
- Create: `package.json`
- Create: `src/app/layout.tsx`
- Create: `src/app/(store)/page.tsx`
- Create: `tests/setup.ts`
- Create: `vitest.config.ts`
- Create: `playwright.config.ts`
- Create: `.env.example`

**Interfaces:**
- Produces: `npm run dev`, `npm run lint`, `npm run typecheck`, `npm run test`, and `npm run test:e2e`.
- Produces: `@/*` TypeScript path alias for all later tasks.

- [ ] **Step 1: Scaffold Next.js with the approved runtime**

Run:

```powershell
npx create-next-app@16.3.4 .cauvira-bootstrap --typescript --eslint --tailwind --app --src-dir --import-alias "@/*" --use-npm
Get-ChildItem -Path .cauvira-bootstrap -Force |
  Where-Object { $_.Name -notin @(".git", ".gitignore") } |
  Copy-Item -Destination . -Recurse -Force
Remove-Item .cauvira-bootstrap -Recurse -Force
if (-not (Select-String -Path .gitignore -Pattern '^\.superpowers/$' -Quiet)) {
  Add-Content .gitignore "`n.superpowers/"
}
npm install zod@4.5.4 drizzle-orm@0.45.2 postgres better-auth@1.7.3
npm install -D vitest@5.0.0 @vitejs/plugin-react jsdom @testing-library/react @testing-library/jest-dom @playwright/test@1.63.0 drizzle-kit
```

Expected: Next.js installs successfully and `npm run dev` can compile the generated page.

- [ ] **Step 2: Add deterministic scripts to `package.json`**

```json
{
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "lint": "eslint .",
    "typecheck": "tsc --noEmit",
    "test": "vitest run",
    "test:watch": "vitest",
    "test:e2e": "playwright test",
    "db:generate": "drizzle-kit generate",
    "db:migrate": "drizzle-kit migrate",
    "db:seed": "tsx src/db/seed.ts"
  }
}
```

Run: `npm install -D tsx`

Expected: npm records `tsx` and all scripts resolve.

- [ ] **Step 3: Configure Vitest**

```ts
// vitest.config.ts
import path from "node:path";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vitest/config";

export default defineConfig({
  plugins: [react()],
  resolve: { alias: { "@": path.resolve(__dirname, "src") } },
  test: {
    environment: "jsdom",
    setupFiles: ["./tests/setup.ts"],
    clearMocks: true,
  },
});
```

```ts
// tests/setup.ts
import "@testing-library/jest-dom/vitest";
```

- [ ] **Step 4: Add the first failing smoke test**

```tsx
// tests/unit/home.test.tsx
import { render, screen } from "@testing-library/react";
import HomePage from "@/app/(store)/page";

it("identifies Cauvira as a commerce experience", () => {
  render(<HomePage />);
  expect(screen.getByRole("heading", { name: /equipa lo que sigue/i })).toBeVisible();
  expect(screen.getByRole("search")).toBeVisible();
});
```

Run: `npm test -- tests/unit/home.test.tsx`

Expected: FAIL because the generated page has neither heading nor search landmark.

- [ ] **Step 5: Replace the generated page with the minimum semantic shell**

```tsx
// src/app/(store)/page.tsx
export default function HomePage() {
  return (
    <main>
      <h1>Equipa lo que sigue.</h1>
      <form role="search">
        <label htmlFor="site-search">Buscar en Cauvira</label>
        <input id="site-search" name="q" />
        <button type="submit">Buscar</button>
      </form>
    </main>
  );
}
```

Run: `npm test -- tests/unit/home.test.tsx && npm run typecheck && npm run lint`

Expected: all commands PASS.

- [ ] **Step 6: Commit the bootstrap**

```powershell
git add package.json package-lock.json src tests vitest.config.ts playwright.config.ts .env.example
git commit -m "chore: bootstrap Cauvira web application"
```

---

### Task 2: Add validated Supabase PostgreSQL infrastructure

**Files:**
- Create: `src/lib/env.ts`
- Create: `src/db/index.ts`
- Create: `drizzle.config.ts`
- Create: `tests/unit/env.test.ts`
- Modify: `.env.example`

**Interfaces:**
- Produces: `env.DATABASE_URL: string`, `env.MIGRATION_DATABASE_URL: string`, `env.TEST_DATABASE_URL: string`, `env.BETTER_AUTH_SECRET: string`, and `env.BETTER_AUTH_URL: string`.
- Produces: `createDatabase(url)` for isolated tests and `db`, the only runtime Drizzle database instance.
- `DATABASE_URL` uses the Supabase transaction pooler for Vercel runtime traffic.
- `MIGRATION_DATABASE_URL` uses a direct or session-pooler connection for schema changes.
- `TEST_DATABASE_URL` points to a separate Supabase test project or branch and never production.

- [ ] **Step 1: Write environment validation tests**

```ts
// tests/unit/env.test.ts
import { describe, expect, it } from "vitest";
import { parseEnv } from "@/lib/env";

describe("parseEnv", () => {
  it("rejects an invalid database URL", () => {
    expect(() =>
      parseEnv({
        DATABASE_URL: "not-a-url",
        MIGRATION_DATABASE_URL: "postgresql://postgres:secret@db.project.supabase.co:5432/postgres",
        TEST_DATABASE_URL: "postgresql://postgres:secret@test.pooler.supabase.com:6543/postgres",
        BETTER_AUTH_SECRET: "x".repeat(32),
        BETTER_AUTH_URL: "http://localhost:3000",
      }),
    ).toThrow(/DATABASE_URL/);
  });

  it("accepts the local development environment", () => {
    expect(
      parseEnv({
        DATABASE_URL: "postgresql://postgres.project:secret@runtime.pooler.supabase.com:6543/postgres",
        MIGRATION_DATABASE_URL: "postgresql://postgres:secret@db.project.supabase.co:5432/postgres",
        TEST_DATABASE_URL: "postgresql://postgres:secret@test.pooler.supabase.com:6543/postgres",
        BETTER_AUTH_SECRET: "x".repeat(32),
        BETTER_AUTH_URL: "http://localhost:3000",
      }).BETTER_AUTH_URL,
    ).toBe("http://localhost:3000");
  });
});
```

Run: `npm test -- tests/unit/env.test.ts`

Expected: FAIL because `parseEnv` does not exist.

- [ ] **Step 2: Implement environment validation**

```ts
// src/lib/env.ts
import { z } from "zod";

const postgresProtocols = new Set(["postgres:", "postgresql:"]);
const postgresUrl = z.string().superRefine((value, context) => {
  try {
    if (!postgresProtocols.has(new URL(value).protocol)) {
      context.addIssue({ code: "custom", message: "must use PostgreSQL" });
    }
  } catch {
    context.addIssue({ code: "custom", message: "must be a valid URL" });
  }
});

const envSchema = z.object({
  DATABASE_URL: postgresUrl,
  MIGRATION_DATABASE_URL: postgresUrl,
  TEST_DATABASE_URL: postgresUrl,
  BETTER_AUTH_SECRET: z.string().min(32),
  BETTER_AUTH_URL: z.url(),
});

export type AppEnv = z.infer<typeof envSchema>;
export const parseEnv = (input: NodeJS.ProcessEnv | Record<string, string>) => envSchema.parse(input);
export const env = parseEnv(process.env);
```

Run: `npm test -- tests/unit/env.test.ts`

Expected: PASS.

- [ ] **Step 3: Configure Supabase runtime and migration connections**

```ts
// drizzle.config.ts
import { defineConfig } from "drizzle-kit";

export default defineConfig({
  dialect: "postgresql",
  schema: "./src/db/schema/*.ts",
  out: "./drizzle",
  dbCredentials: { url: process.env.MIGRATION_DATABASE_URL! },
});
```

```ts
// src/db/index.ts
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { env } from "@/lib/env";

export const createDatabase = (url: string) => {
  const client = postgres(url, { max: 1, prepare: false });
  return drizzle(client);
};

export const db = createDatabase(env.DATABASE_URL);
```

- [ ] **Step 4: Document managed connection values**

```dotenv
# .env.example
DATABASE_URL=postgresql://postgres.PROJECT_REF:PASSWORD@REGION.pooler.supabase.com:6543/postgres
MIGRATION_DATABASE_URL=postgresql://postgres:PASSWORD@db.PROJECT_REF.supabase.co:5432/postgres
TEST_DATABASE_URL=postgresql://postgres.TEST_PROJECT_REF:PASSWORD@REGION.pooler.supabase.com:6543/postgres
BETTER_AUTH_SECRET=replace-with-at-least-32-random-characters
BETTER_AUTH_URL=http://localhost:3000
```

Run:

```powershell
Copy-Item .env.example .env.local
npm run typecheck
```

Expected: TypeScript passes without Docker. Database commands run only after replacing example values with credentials for separate Supabase development and test projects.

- [ ] **Step 5: Commit infrastructure**

```powershell
git add drizzle.config.ts src/lib/env.ts src/db/index.ts tests/unit/env.test.ts .env.example package.json package-lock.json
git commit -m "feat: add validated Supabase PostgreSQL infrastructure"
```

---

### Task 3: Model the dynamic catalog

**Files:**
- Create: `src/db/schema/catalog.ts`
- Create: `src/features/catalog/catalog.contracts.ts`
- Create: `src/features/catalog/catalog.validation.ts`
- Create: `tests/unit/catalog.validation.test.ts`

**Interfaces:**
- Produces: `PurchaseMode`, `AttributeType`, `CreateCategoryInput`, and `CreateProductInput`.
- Produces: `createCategorySchema` and `createProductSchema`.
- Database stores money as integer minor units and measurements as numeric values plus explicit units.

- [ ] **Step 1: Define validation behavior with failing tests**

```ts
// tests/unit/catalog.validation.test.ts
import { describe, expect, it } from "vitest";
import { createProductSchema } from "@/features/catalog/catalog.validation";

describe("createProductSchema", () => {
  const valid = {
    title: "Máquina de hielo 500 kg",
    slug: "maquina-hielo-500-kg",
    categoryId: "3d03a1c7-7ca0-44e0-8fcb-1ec03f5d48d0",
    purchaseMode: "starting_price",
    priceMinor: 4_890_000,
    summary: "Producción industrial para comercios y proyectos.",
    published: true,
  };

  it("accepts a starting-price product with a positive MXN amount", () => {
    expect(createProductSchema.parse(valid).priceMinor).toBe(4_890_000);
  });

  it("rejects direct purchase without a price", () => {
    expect(() =>
      createProductSchema.parse({ ...valid, purchaseMode: "direct_purchase", priceMinor: null }),
    ).toThrow(/priceMinor/);
  });

  it("allows quotation products without a public price", () => {
    expect(
      createProductSchema.parse({ ...valid, purchaseMode: "quotation", priceMinor: null }).priceMinor,
    ).toBeNull();
  });
});
```

Run: `npm test -- tests/unit/catalog.validation.test.ts`

Expected: FAIL because the schema does not exist.

- [ ] **Step 2: Implement catalog contracts and validation**

```ts
// src/features/catalog/catalog.contracts.ts
export const purchaseModes = [
  "direct_purchase",
  "quotation",
  "starting_price",
  "assisted_contact",
] as const;
export type PurchaseMode = (typeof purchaseModes)[number];

export const attributeTypes = ["text", "number", "boolean", "select", "multiselect", "date", "measurement"] as const;
export type AttributeType = (typeof attributeTypes)[number];
```

```ts
// src/features/catalog/catalog.validation.ts
import { z } from "zod";
import { attributeTypes, purchaseModes } from "./catalog.contracts";

export const createCategorySchema = z.object({
  name: z.string().trim().min(2).max(80),
  slug: z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
  parentId: z.uuid().nullable().default(null),
  attributes: z.array(z.object({
    key: z.string().regex(/^[a-z][a-z0-9_]*$/),
    label: z.string().trim().min(1).max(80),
    type: z.enum(attributeTypes),
    required: z.boolean().default(false),
    filterable: z.boolean().default(false),
    comparable: z.boolean().default(false),
    unit: z.string().trim().max(20).nullable().default(null),
    options: z.array(z.string().trim().min(1)).default([]),
  })),
});

export const createProductSchema = z.object({
  title: z.string().trim().min(3).max(160),
  slug: z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
  categoryId: z.uuid(),
  purchaseMode: z.enum(purchaseModes),
  priceMinor: z.int().positive().nullable(),
  summary: z.string().trim().min(10).max(300),
  description: z.string().trim().max(10_000).default(""),
  published: z.boolean().default(false),
}).superRefine((value, context) => {
  if (value.purchaseMode === "direct_purchase" && value.priceMinor === null) {
    context.addIssue({ code: "custom", path: ["priceMinor"], message: "priceMinor is required for direct purchase" });
  }
});

export type CreateCategoryInput = z.infer<typeof createCategorySchema>;
export type CreateProductInput = z.infer<typeof createProductSchema>;
```

Run: `npm test -- tests/unit/catalog.validation.test.ts`

Expected: PASS.

- [ ] **Step 3: Add normalized Drizzle tables**

```ts
// src/db/schema/catalog.ts
import { boolean, integer, jsonb, pgEnum, pgTable, text, timestamp, uniqueIndex, uuid } from "drizzle-orm/pg-core";
import type { AttributeType } from "@/features/catalog/catalog.contracts";

export const purchaseModeEnum = pgEnum("purchase_mode", [
  "direct_purchase", "quotation", "starting_price", "assisted_contact",
]);

export const categories = pgTable("categories", {
  id: uuid("id").defaultRandom().primaryKey(),
  parentId: uuid("parent_id"),
  name: text("name").notNull(),
  slug: text("slug").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
}, (table) => [uniqueIndex("categories_slug_unique").on(table.slug)]);

export const categoryAttributes = pgTable("category_attributes", {
  id: uuid("id").defaultRandom().primaryKey(),
  categoryId: uuid("category_id").references(() => categories.id, { onDelete: "cascade" }).notNull(),
  key: text("key").notNull(),
  label: text("label").notNull(),
  type: text("type").$type<AttributeType>().notNull(),
  required: boolean("required").default(false).notNull(),
  filterable: boolean("filterable").default(false).notNull(),
  comparable: boolean("comparable").default(false).notNull(),
  unit: text("unit"),
  options: jsonb("options").$type<string[]>().default([]).notNull(),
}, (table) => [uniqueIndex("category_attribute_key_unique").on(table.categoryId, table.key)]);

export const products = pgTable("products", {
  id: uuid("id").defaultRandom().primaryKey(),
  categoryId: uuid("category_id").references(() => categories.id).notNull(),
  title: text("title").notNull(),
  slug: text("slug").notNull(),
  summary: text("summary").notNull(),
  description: text("description").default("").notNull(),
  purchaseMode: purchaseModeEnum("purchase_mode").notNull(),
  priceMinor: integer("price_minor"),
  published: boolean("published").default(false).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
}, (table) => [uniqueIndex("products_slug_unique").on(table.slug)]);

export const productAttributeValues = pgTable("product_attribute_values", {
  id: uuid("id").defaultRandom().primaryKey(),
  productId: uuid("product_id").references(() => products.id, { onDelete: "cascade" }).notNull(),
  attributeId: uuid("attribute_id").references(() => categoryAttributes.id, { onDelete: "cascade" }).notNull(),
  value: jsonb("value").$type<string | number | boolean | string[] | { value: number; unit: string }>().notNull(),
}, (table) => [uniqueIndex("product_attribute_value_unique").on(table.productId, table.attributeId)]);
```

- [ ] **Step 4: Generate and apply the migration**

Run:

```powershell
npm run db:generate
npm run db:migrate
npm test -- tests/unit/catalog.validation.test.ts
npm run typecheck
```

Expected: a migration is generated, PostgreSQL applies it, and tests pass.

- [ ] **Step 5: Commit the domain model**

```powershell
git add src/db/schema src/features/catalog tests/unit/catalog.validation.test.ts drizzle
git commit -m "feat: model dynamic product catalog"
```

---

### Task 4: Implement the catalog repository and service

**Files:**
- Create: `src/features/catalog/catalog.repository.ts`
- Create: `src/features/catalog/catalog.service.ts`
- Create: `tests/unit/catalog.service.test.ts`
- Create: `tests/integration/catalog.repository.test.ts`

**Interfaces:**
- Produces: `CatalogRepository` with `createCategory`, `getCategoryWithAttributes`, `createProduct`, `listPublishedProducts`, and `getPublishedProductBySlug`.
- Produces: `createCatalogService(repository)` with matching validated use cases.
- Product mutations reject values for attributes outside the selected category and reject missing required values.

- [ ] **Step 1: Write service tests against a fake repository**

```ts
// tests/unit/catalog.service.test.ts
import { expect, it, vi } from "vitest";
import { createCatalogService } from "@/features/catalog/catalog.service";
import type { CatalogRepository } from "@/features/catalog/catalog.repository";

it("rejects a product missing a required category attribute", async () => {
  const repository = {
    getCategoryWithAttributes: vi.fn().mockResolvedValue({
      id: "3d03a1c7-7ca0-44e0-8fcb-1ec03f5d48d0",
      attributes: [{ id: "a1", key: "daily_output", required: true, type: "number" }],
    }),
  } as unknown as CatalogRepository;
  const service = createCatalogService(repository);

  await expect(service.createProduct({
    product: {
      title: "Máquina de hielo 500 kg",
      slug: "maquina-hielo-500-kg",
      categoryId: "3d03a1c7-7ca0-44e0-8fcb-1ec03f5d48d0",
      purchaseMode: "quotation",
      priceMinor: null,
      summary: "Producción industrial para comercios.",
      description: "",
      published: false,
    },
    attributes: {},
  })).rejects.toThrow(/daily_output/);
});
```

Run: `npm test -- tests/unit/catalog.service.test.ts`

Expected: FAIL because the service and repository contracts do not exist.

- [ ] **Step 2: Define the repository boundary**

```ts
// src/features/catalog/catalog.repository.ts
import type { CreateCategoryInput, CreateProductInput } from "./catalog.validation";

export type CategoryAttributeRecord = {
  id: string;
  key: string;
  type: string;
  required: boolean;
};

export interface CatalogRepository {
  createCategory(input: CreateCategoryInput): Promise<{ id: string; slug: string }>;
  getCategoryWithAttributes(id: string): Promise<{ id: string; attributes: CategoryAttributeRecord[] } | null>;
  createProduct(input: {
    product: CreateProductInput;
    attributes: Record<string, unknown>;
  }): Promise<{ id: string; slug: string }>;
  listPublishedProducts(input: { query?: string; categorySlug?: string }): Promise<Array<{
    id: string; title: string; slug: string; summary: string; purchaseMode: string; priceMinor: number | null;
  }>>;
  getPublishedProductBySlug(slug: string): Promise<{
    id: string; title: string; slug: string; summary: string; description: string;
    purchaseMode: string; priceMinor: number | null; attributes: Array<{ label: string; value: unknown; unit: string | null }>;
  } | null>;
}
```

- [ ] **Step 3: Implement required-attribute validation**

```ts
// src/features/catalog/catalog.service.ts
import type { CatalogRepository } from "./catalog.repository";
import { createCategorySchema, createProductSchema } from "./catalog.validation";

export const createCatalogService = (repository: CatalogRepository) => ({
  async createCategory(input: unknown) {
    return repository.createCategory(createCategorySchema.parse(input));
  },
  async createProduct(input: { product: unknown; attributes: Record<string, unknown> }) {
    const product = createProductSchema.parse(input.product);
    const category = await repository.getCategoryWithAttributes(product.categoryId);
    if (!category) throw new Error("Category not found");
    const allowed = new Set(category.attributes.map((attribute) => attribute.key));
    for (const key of Object.keys(input.attributes)) {
      if (!allowed.has(key)) throw new Error(`Attribute ${key} does not belong to the category`);
    }
    for (const attribute of category.attributes) {
      if (attribute.required && input.attributes[attribute.key] == null) {
        throw new Error(`Required attribute missing: ${attribute.key}`);
      }
    }
    return repository.createProduct({ product, attributes: input.attributes });
  },
  listPublishedProducts(input: { query?: string; categorySlug?: string }) {
    return repository.listPublishedProducts(input);
  },
  getPublishedProductBySlug(slug: string) {
    return repository.getPublishedProductBySlug(slug);
  },
});
```

Run: `npm test -- tests/unit/catalog.service.test.ts`

Expected: PASS.

- [ ] **Step 4: Implement `DrizzleCatalogRepository` and integration tests**

Implement `DrizzleCatalogRepository` in `catalog.repository.ts` using a `db.transaction` for category plus attribute inserts and product plus attribute-value inserts. Create the integration-test database instance with `createDatabase(env.TEST_DATABASE_URL)`, never the runtime `db`. The integration test must insert a category with `daily_output`, create a product with `daily_output: 500`, query it by slug, and assert the returned value and unit.

```ts
expect(product?.attributes).toContainEqual({
  label: "Producción diaria",
  value: 500,
  unit: "kg/día",
});
```

Run: `npm test -- tests/integration/catalog.repository.test.ts`

Expected: PASS against the isolated Supabase test database from `TEST_DATABASE_URL`; production credentials are never loaded by integration tests.

- [ ] **Step 5: Run the complete catalog test slice and commit**

Run:

```powershell
npm test -- tests/unit/catalog.validation.test.ts tests/unit/catalog.service.test.ts tests/integration/catalog.repository.test.ts
npm run typecheck
git add src/features/catalog tests
git commit -m "feat: add validated catalog services"
```

Expected: tests and typecheck pass before the commit is created.

---

### Task 5: Add authentication and role enforcement

**Files:**
- Create: `src/db/schema/auth.ts`
- Create: `src/lib/auth.ts`
- Create: `src/app/api/auth/[...all]/route.ts`
- Create: `src/features/auth/require-role.ts`
- Create: `tests/unit/require-role.test.ts`
- Create: `src/app/(admin)/backoffice/layout.tsx`

**Interfaces:**
- Produces: `auth` server instance.
- Produces: `requireRole(headers, allowedRoles)` returning the current session or throwing `UnauthorizedError`.
- Backoffice routes permit `administrator`, `sales`, `catalog_manager`, and `operations`; catalog mutations require `administrator` or `catalog_manager`.

- [ ] **Step 1: Generate Better Auth tables**

Configure `src/lib/auth.ts` with the Drizzle adapter and email/password enabled, then run:

```powershell
npx @better-auth/cli@latest generate --config src/lib/auth.ts --output src/db/schema/auth.ts
```

Expected: Better Auth creates user, session, account, and verification tables.

- [ ] **Step 2: Extend the user record with a role**

Add a non-null role column with default `catalog_manager` and constrain assignments in application code to:

```ts
export const roles = ["administrator", "sales", "catalog_manager", "operations"] as const;
export type Role = (typeof roles)[number];
```

Generate and apply a migration:

```powershell
npm run db:generate
npm run db:migrate
```

Expected: migration succeeds.

- [ ] **Step 3: Expose the auth handler**

```ts
// src/app/api/auth/[...all]/route.ts
import { auth } from "@/lib/auth";
import { toNextJsHandler } from "better-auth/next-js";

export const { GET, POST } = toNextJsHandler(auth);
```

- [ ] **Step 4: Test and implement the role guard**

```ts
// tests/unit/require-role.test.ts
import { expect, it } from "vitest";
import { assertAllowedRole } from "@/features/auth/require-role";

it("rejects sales from catalog administration", () => {
  expect(() => assertAllowedRole("sales", ["administrator", "catalog_manager"])).toThrow(/forbidden/i);
});
```

```ts
// src/features/auth/require-role.ts
import type { Role } from "@/db/schema/auth";

export const assertAllowedRole = (role: Role, allowed: readonly Role[]) => {
  if (!allowed.includes(role)) throw new Error("Forbidden");
};
```

Run: `npm test -- tests/unit/require-role.test.ts`

Expected: PASS.

- [ ] **Step 5: Protect the backoffice layout server-side**

Read the session from request headers in `src/app/(admin)/backoffice/layout.tsx`, redirect unauthenticated users to `/ingresar`, and call `assertAllowedRole` before rendering the admin shell. Do not rely on hidden navigation links for authorization.

Run: `npm run typecheck && npm run lint`

Expected: PASS.

- [ ] **Step 6: Commit identity and access**

```powershell
git add src/lib/auth.ts src/db/schema/auth.ts src/app/api src/features/auth src/app/\(admin\) drizzle tests/unit/require-role.test.ts
git commit -m "feat: secure backoffice with role-based access"
```

---

### Task 6: Implement the approved visual system

**Files:**
- Modify: `src/app/globals.css`
- Modify: `src/app/layout.tsx`
- Create: `src/components/ui/button.tsx`
- Create: `src/components/ui/field.tsx`
- Create: `tests/unit/button.test.tsx`

**Interfaces:**
- Produces CSS tokens `--surface-cement`, `--surface-raised`, `--ink-aubergine`, `--accent-acid`, `--accent-vermilion`, and `--text-cream`.
- Produces accessible `Button` variants `primary`, `secondary`, `danger`, and `ghost`.

- [ ] **Step 1: Test button semantics**

```tsx
// tests/unit/button.test.tsx
import { render, screen } from "@testing-library/react";
import { Button } from "@/components/ui/button";

it("does not use color as the only loading signal", () => {
  render(<Button loading>Guardar producto</Button>);
  expect(screen.getByRole("button", { name: /guardando producto/i })).toBeDisabled();
});
```

Run: `npm test -- tests/unit/button.test.tsx`

Expected: FAIL because `Button` does not exist.

- [ ] **Step 2: Add design tokens**

```css
/* src/app/globals.css */
:root {
  --surface-cement: #635c56;
  --surface-raised: #756d67;
  --surface-subtle: #8a817a;
  --ink-aubergine: #21151f;
  --accent-acid: #d5f064;
  --accent-vermilion: #ee513b;
  --text-cream: #f3f0eb;
  --text-muted: #d5cec9;
  --border-warm: #8e857e;
  --focus-ring: #f3f0eb;
}

body {
  background: var(--surface-cement);
  color: var(--text-cream);
}

:focus-visible {
  outline: 3px solid var(--focus-ring);
  outline-offset: 3px;
}
```

- [ ] **Step 3: Implement accessible primitives**

`Button` must expose visible focus, preserve text at 200% zoom, use `aria-busy` while loading, and replace its accessible name with `Guardando {originalLabel}`. `Field` must always bind label, description, and error IDs to the control.

Run: `npm test -- tests/unit/button.test.tsx && npm run typecheck`

Expected: PASS.

- [ ] **Step 4: Build and inspect a component gallery**

Create a development-only `/backoffice/ui` page containing every button, input, alert, status, empty state, and product-card state. Verify acid green and vermilion never communicate state without text or icon.

Run: `npm run dev`

Expected: page renders at `http://localhost:3000/backoffice/ui` for an authorized user.

- [ ] **Step 5: Commit the visual foundation**

```powershell
git add src/app/globals.css src/app/layout.tsx src/components/ui tests/unit/button.test.tsx
git commit -m "feat: add Cauvira visual system"
```

---

### Task 7: Build category and product administration

**Files:**
- Create: `src/app/(admin)/backoffice/categorias/page.tsx`
- Create: `src/app/(admin)/backoffice/catalogo/page.tsx`
- Create: `src/app/(admin)/backoffice/catalogo/nuevo/page.tsx`
- Create: `src/components/catalog/product-form.tsx`
- Create: `src/components/admin/admin-sidebar.tsx`
- Create: `src/features/catalog/catalog.actions.ts`
- Create: `tests/unit/product-form.test.tsx`

**Interfaces:**
- Consumes: `createCatalogService`, `CreateCategoryInput`, `CreateProductInput`, and role guards.
- Produces: `createCategoryAction(formData)` and `createProductAction(formData)` server actions returning `{ ok: true, id } | { ok: false, fieldErrors }`.

- [ ] **Step 1: Test dynamic field rendering**

```tsx
// tests/unit/product-form.test.tsx
import { render, screen } from "@testing-library/react";
import { ProductForm } from "@/components/catalog/product-form";

it("renders category-defined fields", () => {
  render(<ProductForm categories={[{
    id: "ice",
    name: "Máquinas de hielo",
    attributes: [{ id: "output", key: "daily_output", label: "Producción diaria", type: "measurement", required: true, unit: "kg/día" }],
  }]} />);
  expect(screen.getByLabelText(/producción diaria/i)).toBeVisible();
  expect(screen.getByText("kg/día")).toBeVisible();
});
```

Run: `npm test -- tests/unit/product-form.test.tsx`

Expected: FAIL because the form does not exist.

- [ ] **Step 2: Implement category management**

Build a category form for name, slug, optional parent, and repeatable attribute definitions. Submit through `createCategoryAction`; authorize `administrator` and `catalog_manager`; parse with `createCategorySchema`; display field-level errors without clearing valid user input.

Run: `npm run typecheck && npm run lint`

Expected: PASS.

- [ ] **Step 3: Implement the dynamic product form**

The form must switch fields when category changes, preserve shared product fields, label money as `Precio público (MXN)`, convert entered pesos to minor units on the server, and show the correct call-to-action preview for all four purchase modes.

Run: `npm test -- tests/unit/product-form.test.tsx`

Expected: PASS.

- [ ] **Step 4: Implement catalog listing**

The backoffice listing exposes title, category, mode, publication status, price, last update, and actions. Empty state text is `Aún no hay productos. Crea el primero para comenzar el catálogo.` Filters use query-string parameters so URLs remain shareable.

- [ ] **Step 5: Verify authorization and persistence**

Run the application and verify:

1. a catalog manager creates the “Máquinas de hielo” category;
2. the manager adds required `daily_output`;
3. the manager creates a draft product;
4. a sales user receives `403` from the mutation even when posting directly;
5. refreshing the page preserves the product.

Expected: all five checks succeed.

- [ ] **Step 6: Commit admin catalog**

```powershell
git add src/app/\(admin\)/backoffice src/components/admin src/components/catalog/product-form.tsx src/features/catalog/catalog.actions.ts tests/unit/product-form.test.tsx
git commit -m "feat: add dynamic catalog administration"
```

---

### Task 8: Build public search, listing, and product detail

**Files:**
- Create: `src/app/(store)/productos/page.tsx`
- Create: `src/app/(store)/productos/[slug]/page.tsx`
- Modify: `src/app/(store)/page.tsx`
- Create: `src/components/catalog/product-card.tsx`
- Create: `src/components/catalog/search-form.tsx`
- Create: `src/lib/money.ts`
- Create: `tests/unit/money.test.ts`
- Create: `tests/unit/product-card.test.tsx`

**Interfaces:**
- Consumes: `listPublishedProducts` and `getPublishedProductBySlug`.
- Produces: `formatMxn(minorUnits: number): string`.
- Product cards expose one action based on purchase mode.

- [ ] **Step 1: Test MXN formatting**

```ts
// tests/unit/money.test.ts
import { expect, it } from "vitest";
import { formatMxn } from "@/lib/money";

it("formats integer minor units without floating point math", () => {
  expect(formatMxn(4_890_000)).toMatch(/\$48,900/);
});
```

Run: `npm test -- tests/unit/money.test.ts`

Expected: FAIL because `formatMxn` does not exist.

- [ ] **Step 2: Implement MXN formatting**

```ts
// src/lib/money.ts
const mxn = new Intl.NumberFormat("es-MX", { style: "currency", currency: "MXN", maximumFractionDigits: 0 });
export const formatMxn = (minorUnits: number) => mxn.format(minorUnits / 100);
```

Run: `npm test -- tests/unit/money.test.ts`

Expected: PASS.

- [ ] **Step 3: Test purchase-mode actions**

Render four cards and assert these exact actions:

```ts
expect(screen.getByRole("link", { name: "Agregar al carrito" })).toBeVisible();
expect(screen.getByRole("link", { name: "Solicitar cotización" })).toBeVisible();
expect(screen.getByText(/desde \$48,900/i)).toBeVisible();
expect(screen.getByRole("link", { name: "Hablar con un especialista" })).toBeVisible();
```

Run: `npm test -- tests/unit/product-card.test.tsx`

Expected: FAIL until `ProductCard` maps every mode.

- [ ] **Step 4: Implement the marketplace-easy, Cauvira-distinct homepage**

The first viewport contains utility strip, logo, dominant search, account and bag links, category navigation, one asymmetric merchandising feature, and at least three real product cards. Use warm gray surfaces, aubergine structure, acid primary actions, and restrained vermilion feature blocks. Do not use white product cards, decorative gradients, or blog-style article grids.

- [ ] **Step 5: Implement query-string search and category filtering**

`/productos?q=hielo&categoria=maquinas-de-hielo` must call:

```ts
catalogService.listPublishedProducts({
  query: searchParams.q?.trim() || undefined,
  categorySlug: searchParams.categoria || undefined,
});
```

Show `No encontramos resultados para “{query}”. Solicita una solución y la buscaremos por ti.` when empty.

- [ ] **Step 6: Implement product detail**

The detail page displays title, primary product image area, summary, description, formatted price or quotation label, all comparable technical attributes, documents section, warranty, lead time, and the mode-specific primary action. Unpublished or missing products return `notFound()`.

Run: `npm test && npm run typecheck && npm run lint`

Expected: PASS.

- [ ] **Step 7: Commit storefront catalog**

```powershell
git add src/app/\(store\) src/components/catalog src/lib/money.ts tests/unit
git commit -m "feat: add searchable public catalog"
```

---

### Task 9: Seed realistic data and verify the vertical slice

**Files:**
- Create: `src/db/seed.ts`
- Create: `e2e/admin-catalog.spec.ts`
- Create: `e2e/storefront-catalog.spec.ts`
- Modify: `playwright.config.ts`
- Create: `.github/workflows/ci.yml`

**Interfaces:**
- Seed produces one administrator, one catalog manager, four categories, and at least eight products spanning all four purchase modes.
- E2E tests use deterministic credentials from test-only environment variables.

- [ ] **Step 1: Write the failing storefront E2E test**

```ts
// e2e/storefront-catalog.spec.ts
import { expect, test } from "@playwright/test";

test("searches and opens a quotation product", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("searchbox", { name: /buscar/i }).fill("montacargas");
  await page.getByRole("button", { name: "Buscar" }).click();
  await expect(page.getByRole("heading", { name: /montacargas eléctrico/i })).toBeVisible();
  await page.getByRole("link", { name: "Solicitar cotización" }).click();
  await expect(page).toHaveURL(/productos\/montacargas-electrico/);
});
```

Run: `npm run test:e2e -- e2e/storefront-catalog.spec.ts`

Expected: FAIL because deterministic data does not exist.

- [ ] **Step 2: Add idempotent seed data**

Use slug-based upserts for categories and products. Include:

- machine ice product with `starting_price`;
- forklift with `quotation`;
- coffee with `direct_purchase`;
- padel court with `assisted_contact`;
- realistic Spanish summaries and category attributes.

Run: `npm run db:seed`

Expected: first and second runs both succeed without duplicate rows.

- [ ] **Step 3: Add admin E2E coverage**

The admin test signs in as catalog manager, creates a category attribute, creates a draft product, publishes it, and verifies it appears in public search. A second request authenticated as sales posts the same mutation and asserts `403`.

Run: `npm run test:e2e`

Expected: both admin and storefront suites PASS.

- [ ] **Step 4: Add CI**

```yaml
# .github/workflows/ci.yml
name: ci
on:
  pull_request:
  push:
    branches: [master, main]
jobs:
  verify:
    runs-on: ubuntu-latest
    env:
      DATABASE_URL: ${{ secrets.SUPABASE_TEST_RUNTIME_DATABASE_URL }}
      MIGRATION_DATABASE_URL: ${{ secrets.SUPABASE_TEST_MIGRATION_DATABASE_URL }}
      TEST_DATABASE_URL: ${{ secrets.SUPABASE_TEST_RUNTIME_DATABASE_URL }}
      BETTER_AUTH_SECRET: ci-secret-with-at-least-thirty-two-characters
      BETTER_AUTH_URL: http://localhost:3000
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 22
          cache: npm
      - run: npm ci
      - run: npm run db:migrate
      - run: npm run lint
      - run: npm run typecheck
      - run: npm test
      - run: npx playwright install --with-deps chromium
      - run: npm run test:e2e
```

- [ ] **Step 5: Perform final verification**

Run:

```powershell
npm run lint
npm run typecheck
npm test
npm run build
npm run test:e2e
git status --short
```

Expected: every command exits `0`; git status lists only intentional plan or documentation changes.

- [ ] **Step 6: Commit the verified vertical slice**

```powershell
git add src/db/seed.ts e2e playwright.config.ts .github/workflows/ci.yml
git commit -m "test: verify catalog vertical slice"
```

## Phase-one completion gate

Do not begin Plan 2 until all conditions are true:

- local and CI checks pass;
- an authorized catalog manager can create a category, dynamic attribute, and product;
- a sales user cannot mutate catalog data;
- published products appear in search and detail pages;
- all four purchase modes render the correct public action;
- no supplier cost or identity field exists in public contracts;
- desktop and mobile views preserve the approved visual direction;
- keyboard navigation and WCAG AA contrast checks pass for the implemented pages;
- the user has reviewed the working storefront and backoffice in a real browser.
