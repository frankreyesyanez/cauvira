# Cauvira Commerce Platform — Design Specification

## 1. Product definition

Cauvira is a Mexican ecommerce and commercial-operations platform for selling products from external suppliers under one customer-facing brand. Its catalog spans conventional goods and complex projects, including coffee, water, ice and vending machines, forklifts, embroidery and molding machinery, prefabricated houses, padel courts, gym equipment, pesticides, golf carts, and manufactured LED displays.

The product combines:

- a public ecommerce storefront;
- a customer portal;
- an internal backoffice;
- quotation and sales workflows;
- purchasing and accounts-payable workflows for hidden suppliers.

The initial market is Mexico, with MXN pricing. Customers include both businesses and individuals. Cauvira does not operate as a marketplace: suppliers remain private and Cauvira owns the customer relationship.

The brand name “Cauvira” is provisional until a formal phonetic and class-based trademark search is completed before IMPI.

## 2. Product principles

1. **One catalog, many commercial models.** Each product can be sold directly, quoted, shown with a “starting at” price, or handled through assisted contact.
2. **No code required for catalog growth.** Administrators can create categories, attributes, products, documents, media, and commercial rules from the backoffice.
3. **Supplier details remain private.** Customers never see supplier identities, costs, internal margins, or purchasing documents.
4. **Human approval before supplier commitment.** A customer payment may create draft purchase orders, but an administrator must approve each order before it is sent to or paid with a supplier.
5. **Operational truth over optimistic automation.** Payment, email, stock, cost, and supplier-order states are tracked independently.
6. **Familiar commerce, distinctive identity.** Search, navigation, cart, checkout, and quotation remain immediately understandable while the visual system avoids looking like a generic marketplace template.

## 3. Experience surfaces

### 3.1 Public storefront

The storefront includes:

- prominent global search;
- category and subcategory navigation;
- configurable homepage merchandising;
- product and project listings;
- product detail pages with dynamic technical attributes;
- galleries, videos, specification sheets, certifications, and warranty documents;
- direct-purchase, quote, starting-price, and assisted-contact actions;
- cart and Mercado Pago checkout;
- bank-transfer checkout;
- adaptive shipping behavior;
- account creation and sign-in;
- SEO metadata and share previews;
- WhatsApp as a secondary assisted-sales channel.

The first viewport exposes search, categories, purchase/quotation actions, and real products. It must not resemble an editorial blog or hide commerce behind a generic hero.

### 3.2 Customer portal

Customers can:

- review direct orders and their status;
- review, accept, or reject quotations;
- download quotations, receipts, invoices, and related documents;
- view deposits and partial-payment schedules;
- upload bank-transfer receipts;
- monitor delivery or project progress;
- update contact, company, tax, and delivery information;
- communicate about an order or quotation through a traceable activity thread.

Business quotation forms support company name, RFC, requested quantity, project location, installation requirements, target date, and category-specific technical data.

### 3.3 Backoffice

The backoffice is organized by operational task:

- **Overview:** sales, collected revenue, supplier liabilities, expected margin, alerts, and recent activity.
- **Catalog:** categories, dynamic attributes, products, variants, media, documents, pricing, and publication state.
- **Suppliers:** private identity, contacts, currency, costs, lead time, payment terms, products, and availability.
- **Commercial:** leads, quote requests, quotations, follow-ups, ownership, and validity.
- **Orders:** customer payment, fulfillment, delivery, installation, returns, and cancellation.
- **Purchasing:** supplier purchase orders, approvals, sending, payment, proof, invoices, and delivery.
- **Content:** homepage modules, banners, informational pages, FAQs, and SEO.
- **Configuration:** users, roles, taxes, payments, shipping rules, notification templates, and audit records.

Initial roles are administrator, sales, catalog manager, and operations. Permissions are explicit per module and sensitive action.

## 4. Dynamic catalog model

Categories define reusable attribute schemas. Example attributes include production per day, voltage, load capacity, dimensions, material, construction area, warranty, installation needs, and certification.

When an administrator assigns a product to a category, its edit form loads the applicable attributes. Attributes support:

- text, number, boolean, date, selection, multi-selection, and measurement values;
- unit and display formatting;
- required and optional status;
- filterable and comparable flags;
- category inheritance;
- controlled options where consistency is important.

Each product includes:

- title, slug, short and long descriptions;
- category and optional subcategories;
- SKU and supplier reference;
- images, video, and downloadable documents;
- purchase mode;
- customer price or starting price;
- internal supplier cost and currency;
- expected margin;
- tax treatment;
- lead time and availability;
- warranty;
- shipping or logistics mode;
- supplier associations;
- featured, promotional, and publication states.

Products may have more than one supplier option. An internal team can compare current cost, lead time, and terms before approving a purchase order.

## 5. Direct-purchase workflow

1. The customer adds eligible products to the cart.
2. The platform calculates parcel shipping when supported; oversized or project-based items require logistics quotation.
3. The customer pays through Mercado Pago or selects bank transfer.
4. A verified Mercado Pago webhook, not the browser return URL, confirms online payment.
5. Bank-transfer orders remain pending until an authorized user validates the receipt.
6. The platform creates one customer order and draft purchase orders grouped by supplier.
7. An administrator verifies supplier stock, current cost, delivery address, margin, and customer-payment state.
8. The administrator approves each supplier order.
9. The system sends the purchase order to the supplier and creates an account payable.
10. Staff pay the supplier, enter payment details, and upload proof.
11. Fulfillment is tracked independently for each supplier order until delivery.

The customer order can therefore be paid while one or more supplier orders remain pending approval or payment. The backoffice must make that distinction explicit.

## 6. Quotation workflow

1. A visitor submits a category-aware quote request.
2. The request appears on the commercial board with owner, age, priority, and next action.
3. Sales selects products or creates custom line items.
4. Supplier cost, logistics, installation, margin, tax, and commercial terms are entered.
5. The system generates a versioned quotation PDF with expiration date and terms.
6. The customer reviews and accepts the quotation in the portal.
7. Acceptance creates an order and payment schedule.
8. Deposits and partial payments are recorded.
9. Supplier purchasing follows the same approval workflow as direct orders.
10. Delivery, installation, and project milestones remain visible to staff and customer at the appropriate detail level.

Every revision remains traceable. An expired or superseded quotation cannot be accepted.

## 7. Supplier purchasing

Purchase orders are grouped by supplier and include:

- supplier reference and internal order number;
- products, quantities, agreed costs, and currency;
- requested delivery date;
- delivery mode and destination;
- customer-safe delivery instructions;
- payment terms;
- internal notes excluded from supplier documents;
- approval identity and timestamp;
- PDF and email-delivery history.

Delivery modes are:

- direct to customer;
- to Cauvira or an internal warehouse;
- to a project or installation site.

The initial universal integration is email plus a generated purchase-order PDF. Suppliers with reliable APIs can later receive orders through provider-specific adapters. One integration failure must not stop unrelated purchase orders.

Purchase-order states include draft, awaiting approval, approved, sent, supplier-confirmed, payment pending, paid, partially fulfilled, fulfilled, cancelled, and exception.

The accounts-payable view distinguishes:

- customer paid / customer payment pending;
- purchase order sent / pending;
- supplier paid / supplier payment pending;
- expected versus actual cost;
- expected versus actual margin;
- missing receipt, supplier invoice, tracking number, or confirmation.

## 8. Payments and logistics

### Payments

- Mercado Pago is the initial online provider.
- Bank transfer is supported with manual receipt validation.
- Large quotations support deposits and partial payments.
- Webhook processing is authenticated, idempotent, and auditable.
- Refunds and cancellations require explicit permission and create immutable records.
- Payment-provider references are stored without storing raw card data.

### Logistics

- Parcel-eligible products use calculated or configured shipping.
- Machinery, construction, and project products use manually quoted logistics.
- A single customer order can contain separate shipments.
- Tracking, carrier, estimated arrival, proof of delivery, and installation status are stored per fulfillment.
- Supplier direct-shipment documents exclude internal cost and margin.

## 9. Visual system

### Brand posture

Cauvira is bold, energetic, and selective. It offers marketplace-level ease without presenting itself as a mass marketplace or imitating Amazon or Mercado Libre.

### Palette

- warm cement gray: primary page surface;
- near-black aubergine: navigation, structural contrast, and key typography;
- acid green: primary actions, opportunity cues, and selected states;
- vermilion: campaigns, brand energy, and selected feature areas;
- warm cream: high-contrast text and limited neutral highlights.

Vermilion is not the sole signal for errors. All statuses use text and icons, and all critical color combinations must meet WCAG AA contrast.

### Composition

- geometric, assertive typography;
- compact utility header and dominant search;
- category access immediately below search;
- products and purchase actions visible in the first viewport;
- asymmetric campaign areas balanced by dense, orderly product content;
- restrained border radius;
- layered gray surfaces rather than white cards;
- high-quality, real product and project photography;
- acid green and vermilion used deliberately rather than as large decorative gradients.

The backoffice shares the brand but uses less chromatic intensity and prioritizes dense operational clarity.

## 10. Technical architecture

The implementation will use a modular full-stack web architecture with:

- one responsive web application for storefront, portal, and backoffice;
- server-side authorization and validation;
- PostgreSQL as the transactional database;
- object storage for media and documents;
- a payment adapter for Mercado Pago;
- transactional email;
- background jobs for document generation, notifications, retries, and supplier integrations;
- auditable state transitions;
- provider adapters that isolate external integrations.

Recommended module boundaries are identity and access, catalog, content, customers, quotes, orders, payments, purchasing, suppliers, fulfillment, files, notifications, and audit.

The exact framework and vendors will be selected in the implementation plan. The design does not depend on a single hosting provider.

## 11. Reliability and error handling

The system must explicitly handle:

- payment declined, abandoned, duplicated, delayed, or disputed;
- webhook delivery repeated or out of order;
- supplier price or availability changes;
- purchase-order email rejection or timeout;
- supplier API failure;
- partial supplier acceptance or fulfillment;
- expired quotations;
- missing documents;
- invalid file upload;
- unauthorized access;
- concurrent edits to price, cost, or order state;
- logistics quotation still pending at checkout;
- order or payment cancellation.

All financial and operational transitions are transactional where possible, idempotent where externally triggered, and recorded in an audit log. Failed background work retries safely and surfaces an actionable backoffice alert.

## 12. Testing strategy

Automated tests cover:

- permission boundaries and private supplier data;
- dynamic category attributes;
- price, tax, margin, and totals;
- quote versioning and expiration;
- cart and checkout validation;
- Mercado Pago webhook authenticity and idempotency;
- customer-order to supplier-order grouping;
- mandatory administrator approval;
- accounts-payable states;
- partial payments and fulfillment;
- document access;
- notification retries;
- responsive storefront and backoffice smoke paths.

End-to-end acceptance scenarios cover one direct purchase, one bank-transfer purchase, and one complex quotation from request through supplier payment and final delivery.

Browser quality assurance covers current desktop and mobile viewports, keyboard navigation, contrast, overflow, loading, empty, error, success, disabled, out-of-stock, payment-failed, and unauthorized states.

## 13. Initial release scope

The first production release includes:

- authentication and roles;
- dynamic catalog and content administration;
- public search, category, listing, and product pages;
- direct cart and checkout;
- Mercado Pago and bank transfer;
- quotation requests, editing, PDF, acceptance, and partial payments;
- customer portal;
- suppliers and private costs;
- purchase orders, administrator approval, email/PDF dispatch, and accounts payable;
- mixed delivery modes and manual logistics quotation;
- dashboards, notifications, audit history, and required edge states.

Deferred until after validated operation:

- automatic supplier payment;
- deep ERP or accounting integrations;
- automatic ordering for every supplier;
- multi-country and multi-currency selling;
- native mobile applications;
- public multi-vendor marketplace features;
- advanced recommendation or dynamic-pricing engines.

## 14. Acceptance criteria

The design is successfully implemented when:

1. An administrator can add a new category and product with category-specific fields without code changes.
2. A product can switch among direct purchase, quotation, starting price, and assisted contact.
3. A customer can pay a direct order through Mercado Pago and see the verified status in the portal.
4. A business customer can request, receive, accept, and partially pay a versioned quotation.
5. A paid customer order creates correctly grouped draft supplier purchase orders.
6. No supplier purchase order can be sent before administrator approval.
7. Staff can see customer collections and supplier payables as separate states.
8. Staff can record supplier payment with proof and follow mixed delivery destinations.
9. Customers cannot access supplier identity, internal cost, margin, or purchasing documents.
10. Storefront and backoffice match the approved warm-gray, aubergine, acid-green, and vermilion visual direction with accessible contrast.

## 15. Open external decisions

The following require business credentials or formal validation during implementation:

- final IMPI clearance and legal adoption of “Cauvira”;
- production Mercado Pago account and credentials;
- bank account and transfer instructions;
- tax, invoicing, privacy, returns, warranty, and commercial legal text;
- email sending domain;
- initial supplier contacts, terms, catalogs, and integration capabilities;
- parcel carrier or aggregator choice;
- hosting and domain purchase.
