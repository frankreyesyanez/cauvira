# Task 7 Report — Catalog administration

## Status

Implemented category and product administration for the Cauvira backoffice.

## Delivered

- Added the responsive backoffice shell and role-aware catalog navigation.
- Added category creation with optional parent categories and repeatable dynamic
  attribute definitions.
- Added dynamic product creation for all catalog attribute types.
- Added all four commercial modes with customer call-to-action previews.
- Converts public MXN prices from entered pesos to integer minor units in the
  server action.
- Added a shareable query-string catalog listing with search, category, and
  publication filters.
- Added the required empty state and compact operational table.
- Kept supplier identities, costs, references, and margins out of all Task 7
  interfaces and payloads.

## Authorization

- Every category and product mutation independently calls `requireRole` with
  exactly `administrator` and `catalog_manager`.
- Forbidden role failures carry status `403` and server-action entry points use
  the Next.js forbidden interrupt.
- Mutation controls are hidden from read-only backoffice roles.
- Category and new-product pages also enforce catalog mutation roles on the
  server.

## Data and validation

- `createCategoryAction` parses category payloads with `createCategorySchema`.
- `createProductAction` parses shared product fields with
  `createProductSchema`.
- Dynamic product fields are coerced using category metadata read from the
  repository; browser-supplied type definitions are not trusted.
- Required, option, number, measurement, date, and boolean values produce
  field-level errors.
- Forms submit without native reset so valid user input remains after a
  validation response.

## TDD evidence

- `product-form.test.tsx` first failed because `ProductForm` did not exist.
- `catalog.actions.test.ts` first failed because `catalog.actions` did not
  exist.
- Focused component and action tests now cover dynamic fields, category
  switching, shared-field preservation, all four CTA previews, schema errors,
  MXN conversion, service contracts, and server-side authorization failure.
- Repository integration coverage verifies category attributes, admin product
  filters, draft visibility, and persisted refresh reads.

## Verification

- `npm test` — 12 files, 73 tests passed.
- `npm run typecheck` — passed.
- `npm run lint` — passed with no warnings.
- `npm run build` — passed; all three Task 7 routes compiled as dynamic routes.
- `git diff --check` — passed.

## Self-review

- Checked all mutation paths authorize before parsing or persistence.
- Checked product attribute names and values match catalog service contracts.
- Checked listing columns, exact empty-state copy, query-string filters, MXN
  formatting, responsive overflow, labels, descriptions, errors, and focusable
  controls.
- Checked no Task 8 storefront or Task 9 seed implementation was introduced.

## Concern

The five-step acceptance path is covered by action and real-database
integration tests, including draft persistence and a sales-role 403 boundary.
No interactive browser session was completed because this task workspace does
not include authenticated administrator/catalog-manager browser fixtures.

---

## Required review fixes

### Inheritance and validation

- Category attribute resolution now follows the complete ancestor chain in
  deterministic root-to-child order.
- Child definitions override duplicate keys while retaining deterministic
  placement.
- Category and attribute maps are built once per loaded aggregate; listing does
  not repeatedly filter the complete attribute collection per category.
- Product rendering, action coercion, service validation, and persistence all
  consume the same effective inherited definitions.
- Measurement definitions require a nonempty unit.
- Select and multiselect definitions require at least one unique, nonempty
  option.
- `starting_price` and `direct_purchase` both require a positive public price.

### Parent and aggregate integrity

- Added migration `drizzle/0002_cloudy_trauma.sql` with the
  `categories.parent_id -> categories.id` foreign key.
- Applied migrations successfully to the development database and the isolated
  integration-test database without printing connection credentials.
- Service validation rejects missing parents, self-parenting, and descendant
  cycles before repository mutation.
- Category updates preserve attribute IDs for compatible edits.
- Referenced definitions cannot be removed or changed incompatibly.
- Referenced inherited definitions cannot be shadowed by a new child override.
- Parent changes and new required attributes are rejected while the affected
  category branch contains products.

### Genuine editing

- Added protected category and product edit routes.
- Added prefilled category and product forms, including own category
  definitions, inherited product fields, publication state, and MXN values.
- Added independent update server actions that authorize before parsing or
  querying.
- Added repository/service update operations with transaction-safe aggregate
  replacement for product attribute values.
- Replaced placeholder catalog actions with real `Editar` links and added
  category edit links.
- Preserved the original create action interfaces.

### Authorization and accessibility

- Added a shared catalog mutation access boundary using Next.js
  `forbidden()` for authenticated disallowed roles and `/ingresar` redirect for
  unauthenticated requests.
- The existing `authInterrupts` framework option remains enabled.
- Create and edit pages call the access boundary before database queries.
- Description, purchase mode, category, price, dynamic fields, and category
  definition errors now render visibly and are connected with
  `aria-invalid`/`aria-describedby`.
- Forms continue to preserve valid input after server validation failures.

### Regression evidence

Regression tests were observed failing before their corresponding fixes for:

- measurement units, selectable options, and starting-price validation;
- two-level category inheritance and child overrides;
- category/product update actions and edit form prefilling;
- framework 403/unauthenticated redirect behavior;
- referenced attribute removal and inherited override safety;
- parent changes with existing products;
- the database parent foreign key.

Final verification after review fixes:

- `npm test` — 15 files, 94 tests passed.
- `npm test -- tests/integration/catalog.repository.test.ts` — 5 database
  integration tests passed using `TEST_DATABASE_URL`.
- `npm run typecheck` — passed.
- `npm run lint` — passed with no warnings.
- `npm run build` — passed; both edit routes compiled as dynamic routes.
- `git diff --check` — passed.
