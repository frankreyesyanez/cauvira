import { randomUUID } from "node:crypto";
import nextEnv from "@next/env";
import { and, eq } from "drizzle-orm";
import { hashPassword } from "better-auth/crypto";
import { assertSeedAllowed } from "./assert-seed-allowed";
import { getSeedUsers } from "./seed-credentials";
import type { CreateCategoryInput, CreateProductInput } from "@/features/catalog/catalog.validation";
import type { ProductAttributeValue } from "@/features/catalog/catalog.repository";

nextEnv.loadEnvConfig(process.cwd());

type CatalogService = ReturnType<
  typeof import("@/features/catalog/catalog.service").createCatalogService
>;

type SeedCategory = CreateCategoryInput & { slug: string };

type SeedProduct = {
  categorySlug: string;
  product: Omit<CreateProductInput, "categoryId">;
  attributes: Record<string, ProductAttributeValue>;
};

const seedCategories: SeedCategory[] = [
  {
    name: "Máquinas de hielo",
    slug: "maquinas-de-hielo",
    parentId: null,
    attributes: [
      {
        key: "daily_output",
        label: "Producción diaria",
        type: "measurement",
        required: true,
        filterable: true,
        comparable: true,
        unit: "kg/día",
        options: [],
      },
      {
        key: "ice_type",
        label: "Tipo de hielo",
        type: "select",
        required: true,
        filterable: true,
        comparable: true,
        unit: null,
        options: ["Cúbico", "Escamas", "Gourmet"],
      },
      {
        key: "cooling",
        label: "Enfriamiento",
        type: "select",
        required: false,
        filterable: true,
        comparable: false,
        unit: null,
        options: ["Aire", "Agua"],
      },
    ],
  },
  {
    name: "Montacargas",
    slug: "montacargas",
    parentId: null,
    attributes: [
      {
        key: "load_capacity",
        label: "Capacidad de carga",
        type: "measurement",
        required: true,
        filterable: true,
        comparable: true,
        unit: "t",
        options: [],
      },
      {
        key: "power_source",
        label: "Fuente de energía",
        type: "select",
        required: true,
        filterable: true,
        comparable: true,
        unit: null,
        options: ["Eléctrico", "Diésel", "Gas LP"],
      },
      {
        key: "indoor_use",
        label: "Uso en interiores",
        type: "boolean",
        required: false,
        filterable: true,
        comparable: false,
        unit: null,
        options: [],
      },
    ],
  },
  {
    name: "Café e insumos",
    slug: "cafe-e-insumos",
    parentId: null,
    attributes: [
      {
        key: "origin",
        label: "Origen",
        type: "text",
        required: true,
        filterable: false,
        comparable: false,
        unit: null,
        options: [],
      },
      {
        key: "roast",
        label: "Tueste",
        type: "select",
        required: true,
        filterable: true,
        comparable: true,
        unit: null,
        options: ["Claro", "Medio", "Oscuro"],
      },
      {
        key: "format",
        label: "Presentación",
        type: "select",
        required: true,
        filterable: true,
        comparable: false,
        unit: null,
        options: ["Grano", "Molido", "Cápsula"],
      },
    ],
  },
  {
    name: "Canchas de pádel",
    slug: "canchas-de-padel",
    parentId: null,
    attributes: [
      {
        key: "surface",
        label: "Superficie",
        type: "select",
        required: true,
        filterable: true,
        comparable: true,
        unit: null,
        options: ["Césped sintético", "Resina", "Césped indoor"],
      },
      {
        key: "enclosure",
        label: "Cerramiento",
        type: "select",
        required: true,
        filterable: true,
        comparable: true,
        unit: null,
        options: ["Panorámico", "Estándar"],
      },
      {
        key: "area_m2",
        label: "Área de juego",
        type: "measurement",
        required: false,
        filterable: false,
        comparable: true,
        unit: "m²",
        options: [],
      },
    ],
  },
];

const seedProducts: SeedProduct[] = [
  {
    categorySlug: "maquinas-de-hielo",
    product: {
      title: "Máquina de hielo industrial 500 kg",
      slug: "maquina-de-hielo-industrial-500",
      purchaseMode: "starting_price",
      priceMinor: 189_900_00,
      summary:
        "Producción continua de hielo cúbico para cocina industrial, hospitality y procesamiento.",
      description:
        "Equipo para operación diaria en cocinas centrales y hoteles. El precio publicado es un punto de partida; la instalación, el voltaje y el tratamiento de agua se confirman en sitio.",
      published: true,
      optionGroups: [],
    },
    attributes: {
      daily_output: { value: 500, unit: "kg/día" },
      ice_type: "Cúbico",
      cooling: "Aire",
    },
  },
  {
    categorySlug: "maquinas-de-hielo",
    product: {
      title: "Máquina de hielo en escamas 1000 kg",
      slug: "maquina-de-hielo-escamas-1000",
      purchaseMode: "starting_price",
      priceMinor: 248_500_00,
      summary:
        "Hielo en escamas para pescaderías, laboratorios y proceso de enfriamiento rápido.",
      description:
        "Diseñada para turnos largos y recarga continua. Incluye ficha técnica de consumo eléctrico y recomendaciones de ventilación para cuartos de máquina.",
      published: true,
      optionGroups: [],
    },
    attributes: {
      daily_output: { value: 1000, unit: "kg/día" },
      ice_type: "Escamas",
      cooling: "Agua",
    },
  },
  {
    categorySlug: "montacargas",
    product: {
      title: "Montacargas eléctrico",
      slug: "montacargas-electrico",
      purchaseMode: "quotation",
      priceMinor: 285_000_00,
      summary:
        "Montacargas eléctrico de pasillo para carga en almacén, planta y centros de distribución.",
      description:
        "La cotización considera capacidad, altura de elevación, batería y condiciones del piso. Ideal para interiores donde se requiere operación silenciosa y sin emisiones.",
      published: true,
      optionGroups: [],
    },
    attributes: {
      load_capacity: { value: 2.5, unit: "t" },
      power_source: "Eléctrico",
      indoor_use: true,
    },
  },
  {
    categorySlug: "montacargas",
    product: {
      title: "Apilador diésel 3 toneladas",
      slug: "montacargas-diesel-3t",
      purchaseMode: "quotation",
      priceMinor: 320_000_00,
      summary:
        "Apilador diésel para patios, descargas y movimiento de tarimas a la intemperie.",
      description:
        "Proyecto cotizado según horas de uso, implementos y servicio local. Recomendado para operación mixta en andén y yardas con piso irregular.",
      published: true,
      optionGroups: [],
    },
    attributes: {
      load_capacity: { value: 3, unit: "t" },
      power_source: "Diésel",
      indoor_use: false,
    },
  },
  {
    categorySlug: "cafe-e-insumos",
    product: {
      title: "Café de especialidad en grano 1 kg",
      slug: "cafe-especialidad-grano-1kg",
      purchaseMode: "direct_purchase",
      priceMinor: 38_900,
      summary:
        "Café de especialidad en grano, tueste medio, listo para compra directa y reposición de barra.",
      description:
        "Lote trazable para cafeterías y oficinas. Empaque de 1 kg con fecha de tueste visible y perfil sensorial para espresso o filtrado.",
      published: true,
      optionGroups: [],
    },
    attributes: {
      origin: "Chiapas, México",
      roast: "Medio",
      format: "Grano",
    },
  },
  {
    categorySlug: "cafe-e-insumos",
    product: {
      title: "Cápsulas de café compatibles 50 pzas",
      slug: "capsulas-cafe-compatibles-50",
      purchaseMode: "direct_purchase",
      priceMinor: 24_500,
      summary:
        "Cápsulas compatibles para oficinas y amenidades; compra directa con reposición inmediata.",
      description:
        "Mezcla de tueste oscuro para máquinas de cápsula estándar. Caja de 50 piezas con barrera de aroma y ficha de intensidad.",
      published: true,
      optionGroups: [],
    },
    attributes: {
      origin: "Veracruz, México",
      roast: "Oscuro",
      format: "Cápsula",
    },
  },
  {
    categorySlug: "canchas-de-padel",
    product: {
      title: "Cancha de pádel panorámica",
      slug: "cancha-de-padel-panoramica",
      purchaseMode: "assisted_contact",
      priceMinor: 1_250_000_00,
      summary:
        "Cancha panorámica con césped sintético; un especialista confirma estructura, iluminación y obra civil.",
      description:
        "Proyecto asistido para clubes y desarrollos. La visita técnica cubre cimentación, drenaje, cristal y tiempos de instalación.",
      published: true,
      optionGroups: [],
    },
    attributes: {
      surface: "Césped sintético",
      enclosure: "Panorámico",
      area_m2: { value: 200, unit: "m²" },
    },
  },
  {
    categorySlug: "canchas-de-padel",
    product: {
      title: "Cancha de pádel indoor",
      slug: "cancha-de-padel-indoor",
      purchaseMode: "assisted_contact",
      priceMinor: 980_000_00,
      summary:
        "Cancha indoor de resina para naves existentes; el alcance se define con un especialista de Cauvira.",
      description:
        "Pensada para reconversión de espacios cubiertos. Se coordina altura libre, iluminación LED y cerramiento estándar o panorámico.",
      published: true,
      optionGroups: [],
    },
    attributes: {
      surface: "Resina",
      enclosure: "Estándar",
      area_m2: { value: 200, unit: "m²" },
    },
  },
];

async function upsertCategory(catalog: CatalogService, input: SeedCategory) {
  const existing = (await catalog.listCategories()).find(
    (category) => category.slug === input.slug,
  );
  if (existing) {
    return catalog.updateCategory(existing.id, input);
  }
  return catalog.createCategory(input);
}

async function upsertProduct(
  catalog: CatalogService,
  categoryId: string,
  input: SeedProduct,
) {
  const product = { ...input.product, categoryId };
  const existing = (await catalog.listAdminProducts({})).find(
    (candidate) => candidate.slug === input.product.slug,
  );
  if (existing) {
    return catalog.updateProduct(existing.id, {
      product,
      attributes: input.attributes,
    });
  }
  return catalog.createProduct({ product, attributes: input.attributes });
}

export async function seedDatabase() {
  assertSeedAllowed({
    allowSeed: process.env.ALLOW_SEED,
    databaseUrl: process.env.DATABASE_URL ?? "",
    testDatabaseUrl: process.env.TEST_DATABASE_URL ?? "",
    seedEnv: process.env,
  });

  const { env } = await import("@/lib/env");
  const { createDatabase } = await import("@/db/create-database");
  const { DrizzleCatalogRepository } = await import(
    "@/features/catalog/catalog.repository"
  );
  const { createCatalogService } = await import(
    "@/features/catalog/catalog.service"
  );
  const { user, account } = await import("@/db/schema/auth");

  const db = createDatabase(env.DATABASE_URL);
  const catalog = createCatalogService(new DrizzleCatalogRepository(db));

  try {
    for (const seedUser of getSeedUsers()) {
      const passwordHash = await hashPassword(seedUser.password);
      const [existing] = await db
        .select({ id: user.id })
        .from(user)
        .where(eq(user.email, seedUser.email))
        .limit(1);

      if (existing) {
        await db
          .update(user)
          .set({ role: seedUser.role, name: seedUser.name })
          .where(eq(user.id, existing.id));
        await db
          .update(account)
          .set({ password: passwordHash })
          .where(
            and(eq(account.userId, existing.id), eq(account.providerId, "credential")),
          );
      } else {
        const userId = randomUUID();
        await db.insert(user).values({
          id: userId,
          name: seedUser.name,
          email: seedUser.email,
          emailVerified: true,
          role: seedUser.role,
        });
        await db.insert(account).values({
          id: randomUUID(),
          accountId: userId,
          providerId: "credential",
          userId,
          password: passwordHash,
        });
      }
    }

    const categoriesBySlug = new Map<string, string>();
    for (const category of seedCategories) {
      const saved = await upsertCategory(catalog, category);
      categoriesBySlug.set(category.slug, saved.id);
    }

    for (const product of seedProducts) {
      const categoryId = categoriesBySlug.get(product.categorySlug);
      if (!categoryId) {
        throw new Error(`Missing category ${product.categorySlug}`);
      }
      await upsertProduct(catalog, categoryId, product);
    }

    console.log(
      `Seeded ${getSeedUsers().length} users, ${seedCategories.length} categories, and ${seedProducts.length} products.`,
    );
  } finally {
    await db.$client.end();
  }
}

await seedDatabase();
