"use client";

import { useState, useTransition, type FormEvent } from "react";
import { ProductOptionsFields } from "@/components/catalog/product-options-fields";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import type { CatalogActionResult } from "@/features/catalog/catalog.actions";
import type { AttributeType } from "@/features/catalog/catalog.contracts";
import type { CatalogOptionGroup } from "@/features/catalog/pricing";
import type { ProductImageActionResult } from "@/features/media/product-image.validation";

export type ProductFormCategory = {
  id: string;
  name: string;
  attributes: Array<{
    id: string;
    key: string;
    label: string;
    type: AttributeType;
    required: boolean;
    unit: string | null;
    options: string[];
  }>;
};

export type ProductFormImage = {
  id: string;
  url: string;
  sortOrder: number;
};

type ProductImageActions = {
  upload?(formData: FormData): Promise<ProductImageActionResult>;
  reorder?(
    imageId: string,
    direction: "up" | "down",
  ): Promise<ProductImageActionResult>;
  delete?(imageId: string): Promise<ProductImageActionResult>;
};

type ProductFormProps = {
  action(formData: FormData): Promise<CatalogActionResult>;
  categories: ProductFormCategory[];
  imageActions?: ProductImageActions;
  initialProduct?: {
    title: string;
    slug: string;
    categoryId: string;
    purchaseMode: PurchaseMode;
    priceMinor: number | null;
    summary: string;
    description: string;
    published: boolean;
    attributes: Record<string, unknown>;
    optionGroups?: CatalogOptionGroup[];
    images?: ProductFormImage[];
  };
};

const purchaseModeLabels = {
  direct_purchase: "Compra directa",
  quotation: "Cotización",
  starting_price: "Precio desde",
  assisted_contact: "Contacto asistido",
} as const;

type PurchaseMode = keyof typeof purchaseModeLabels;

function ControlError({
  error,
  id,
}: {
  error?: string[];
  id: string;
}) {
  return error ? (
    <p className="field__error" id={id}>
      <span aria-hidden="true">!</span>
      {error[0]}
    </p>
  ) : null;
}

function DynamicField({
  attribute,
  error,
  initialValue,
}: {
  attribute: ProductFormCategory["attributes"][number];
  error?: string[];
  initialValue?: unknown;
}) {
  const name = `attribute.${attribute.key}`;
  const descriptionId = `${name}-description`;
  const errorId = `${name}-error`;
  const describedBy = error
    ? `${descriptionId} ${errorId}`
    : descriptionId;
  const label = `${attribute.label}${attribute.required ? " *" : ""}`;

  if (attribute.type === "boolean") {
    return (
      <div className="field">
        <label className="field__label" htmlFor={name}>
          {label}
        </label>
        <select
          aria-describedby={describedBy}
          aria-invalid={error ? true : undefined}
          className="field__control"
          id={name}
          name={name}
          required={attribute.required}
          defaultValue={
            typeof initialValue === "boolean" ? String(initialValue) : ""
          }
        >
          <option value="">Selecciona una opción</option>
          <option value="true">Sí</option>
          <option value="false">No</option>
        </select>
        <p className="field__description" id={descriptionId}>
          Indica explícitamente si esta característica aplica.
        </p>
        <ControlError error={error} id={errorId} />
      </div>
    );
  }

  if (attribute.type === "select" || attribute.type === "multiselect") {
    return (
      <div className="field">
        <label className="field__label" htmlFor={name}>
          {label}
        </label>
        <select
          aria-describedby={describedBy}
          aria-invalid={error ? true : undefined}
          className="field__control"
          id={name}
          multiple={attribute.type === "multiselect"}
          name={name}
          required={attribute.required}
          defaultValue={
            attribute.type === "multiselect"
              ? Array.isArray(initialValue)
                ? initialValue.map(String)
                : []
              : typeof initialValue === "string"
                ? initialValue
                : ""
          }
        >
          {attribute.type === "select" ? <option value="">Selecciona una opción</option> : null}
          {attribute.options.map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </select>
        <p className="field__description" id={descriptionId}>
          {attribute.type === "multiselect"
            ? "Puedes seleccionar más de una opción."
            : "Selecciona el valor técnico correspondiente."}
        </p>
        <ControlError error={error} id={errorId} />
      </div>
    );
  }

  const inputType =
    attribute.type === "date"
      ? "date"
      : attribute.type === "number" || attribute.type === "measurement"
        ? "number"
        : "text";

  return (
    <div className="field">
      <label className="field__label" htmlFor={name}>
        {label}
      </label>
      <div className={attribute.unit ? "field__with-unit" : undefined}>
        <input
          aria-describedby={describedBy}
          aria-invalid={error ? true : undefined}
          className="field__control"
          id={name}
          name={name}
          defaultValue={
            attribute.type === "measurement" &&
            typeof initialValue === "object" &&
            initialValue !== null &&
            "value" in initialValue
              ? String(initialValue.value)
              : typeof initialValue === "string" ||
                  typeof initialValue === "number"
                ? String(initialValue)
                : ""
          }
          required={attribute.required}
          step={inputType === "number" ? "any" : undefined}
          type={inputType}
        />
        {attribute.unit ? <span className="field__unit">{attribute.unit}</span> : null}
      </div>
      <p className="field__description" id={descriptionId}>
        {attribute.type === "measurement"
          ? "Captura el valor en la unidad indicada."
          : "Dato técnico definido por la categoría."}
      </p>
      <ControlError error={error} id={errorId} />
    </div>
  );
}

function ProductImageGallery({
  imageActions,
  initialImages,
}: {
  imageActions?: ProductImageActions;
  initialImages: ProductFormImage[];
}) {
  const [images, setImages] = useState(initialImages);
  const [result, setResult] = useState<ProductImageActionResult | null>(null);
  const [isPending, startTransition] = useTransition();
  const errors = result && !result.ok ? result.fieldErrors.images : undefined;
  const sorted = [...images].sort(
    (left, right) => left.sortOrder - right.sortOrder || left.id.localeCompare(right.id),
  );

  function apply(task: () => Promise<ProductImageActionResult>) {
    startTransition(async () => {
      const next = await task();
      setResult(next);
      if (next.ok) {
        setImages(next.images);
      }
    });
  }

  function submitUpload(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!imageActions?.upload) return;
    const formData = new FormData(event.currentTarget);
    apply(() => imageActions.upload!(formData));
    event.currentTarget.reset();
  }

  return (
    <fieldset className="admin-form__section">
      <legend>Fotos del producto</legend>
      <p className="admin-form__note">
        La foto con orden 0 es la portada. JPG, PNG o WebP, máximo 5 MB y 12
        fotos.
      </p>
      {errors ? <ControlError error={errors} id="product-images-error" /> : null}
      {sorted.length === 0 ? (
        <p className="admin-form__note">Aún no hay fotos. Sube la portada primero.</p>
      ) : (
        <ul className="product-photos">
          {sorted.map((image, index) => (
            <li className="product-photos__item" key={image.id}>
              <figure className="product-photos__figure">
                {/* Public Storage URLs vary by project; next/image needs a fixed host list. */}
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  alt={`Foto ${index + 1}`}
                  className="product-photos__thumb"
                  src={image.url}
                />
                <figcaption>
                  {image.sortOrder === 0 ? (
                    <span className="product-photos__cover">Portada</span>
                  ) : (
                    `Foto ${index + 1}`
                  )}
                </figcaption>
              </figure>
              <div className="product-photos__actions">
                <Button
                  aria-label={`Subir foto ${index + 1}`}
                  disabled={isPending || index === 0}
                  onClick={() =>
                    imageActions?.reorder &&
                    apply(() => imageActions.reorder!(image.id, "up"))
                  }
                  type="button"
                  variant="ghost"
                >
                  Subir
                </Button>
                <Button
                  aria-label={`Bajar foto ${index + 1}`}
                  disabled={isPending || index === sorted.length - 1}
                  onClick={() =>
                    imageActions?.reorder &&
                    apply(() => imageActions.reorder!(image.id, "down"))
                  }
                  type="button"
                  variant="ghost"
                >
                  Bajar
                </Button>
                <Button
                  aria-label={`Eliminar foto ${index + 1}`}
                  disabled={isPending}
                  onClick={() =>
                    imageActions?.delete &&
                    apply(() => imageActions.delete!(image.id))
                  }
                  type="button"
                  variant="danger"
                >
                  Eliminar
                </Button>
              </div>
            </li>
          ))}
        </ul>
      )}
      <form className="product-photos__upload" onSubmit={submitUpload}>
        <div className="field">
          <label className="field__label" htmlFor="product-image">
            Subir foto
          </label>
          <input
            accept="image/jpeg,image/png,image/webp"
            aria-describedby={
              errors ? "product-image-help product-images-error" : "product-image-help"
            }
            aria-invalid={errors ? true : undefined}
            className="field__control"
            disabled={isPending || sorted.length >= 12}
            id="product-image"
            name="image"
            type="file"
          />
          <p className="field__description" id="product-image-help">
            Disponible solo al editar un producto existente.
          </p>
        </div>
        <Button disabled={sorted.length >= 12} loading={isPending} type="submit">
          Cargar foto
        </Button>
      </form>
    </fieldset>
  );
}

export function ProductForm({
  action,
  categories,
  imageActions,
  initialProduct,
}: ProductFormProps) {
  const [selectedCategoryId, setSelectedCategoryId] = useState(
    initialProduct?.categoryId ?? categories[0]?.id ?? "",
  );
  const [purchaseMode, setPurchaseMode] =
    useState<PurchaseMode>(initialProduct?.purchaseMode ?? "direct_purchase");
  const [result, setResult] = useState<CatalogActionResult | null>(null);
  const [isPending, startTransition] = useTransition();
  const selectedCategory = categories.find(
    (category) => category.id === selectedCategoryId,
  );
  const errors = result && !result.ok ? result.fieldErrors : {};

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    startTransition(async () => {
      setResult(await action(formData));
    });
  }

  if (categories.length === 0) {
    return (
      <div className="ui-empty">
        <span aria-hidden="true" className="ui-empty__mark">+</span>
        <div>
          <h2>Primero crea una categoría</h2>
          <p>Los productos necesitan una categoría y sus atributos técnicos.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="admin-form-stack">
      {initialProduct ? (
        <ProductImageGallery
          imageActions={imageActions}
          initialImages={initialProduct.images ?? []}
        />
      ) : null}
    <form
      action={
        action as unknown as (formData: FormData) => Promise<void>
      }
      className="admin-form"
      onSubmit={submit}
    >
      {errors._form ? (
        <div className="ui-alert ui-alert--urgent" role="alert">
          <span aria-hidden="true" className="ui-icon">!</span>
          <p>{errors._form[0]}</p>
        </div>
      ) : null}
      {result?.ok ? (
        <div className="ui-alert ui-alert--opportunity" role="status">
          <span aria-hidden="true" className="ui-icon">✓</span>
          <p>{initialProduct ? "Producto actualizado." : "Producto guardado como parte del catálogo."}</p>
        </div>
      ) : null}

      <fieldset className="admin-form__section">
        <legend>Información pública</legend>
        <div className="admin-form__grid">
          <Field
            description="Nombre visible para clientes y equipo comercial."
            error={errors.title?.[0]}
            defaultValue={initialProduct?.title}
            label="Nombre del producto"
            name="title"
            required
          />
          <Field
            description="URL en minúsculas, sin espacios ni acentos."
            error={errors.slug?.[0]}
            defaultValue={initialProduct?.slug}
            label="Slug"
            name="slug"
            placeholder="maquina-de-hielo-industrial"
            required
          />
        </div>
        <div className="field">
          <label className="field__label" htmlFor="summary">Resumen</label>
          <textarea
            aria-describedby={
              errors.summary
                ? "summary-description summary-error"
                : "summary-description"
            }
            aria-invalid={errors.summary ? true : undefined}
            className="field__control field__control--textarea"
            defaultValue={initialProduct?.summary}
            id="summary"
            maxLength={300}
            name="summary"
            required
          />
          <p className="field__description" id="summary-description">
            Descripción breve para listados y búsqueda.
          </p>
          <ControlError error={errors.summary} id="summary-error" />
        </div>
        <div className="field">
          <label className="field__label" htmlFor="description">Descripción completa</label>
          <textarea
            aria-describedby={
              errors.description
                ? "description-help description-error"
                : "description-help"
            }
            aria-invalid={errors.description ? true : undefined}
            className="field__control field__control--textarea"
            defaultValue={initialProduct?.description}
            id="description"
            name="description"
            rows={7}
          />
          <p className="field__description" id="description-help">
            Explica beneficios, alcance y condiciones visibles.
          </p>
          <ControlError error={errors.description} id="description-error" />
        </div>
      </fieldset>

      <fieldset className="admin-form__section">
        <legend>Clasificación y venta</legend>
        <div className="admin-form__grid">
          <div className="field">
            <label className="field__label" htmlFor="categoryId">Categoría</label>
            <select
              aria-describedby={
                errors.categoryId
                  ? "categoryId-description categoryId-error"
                  : "categoryId-description"
              }
              aria-invalid={errors.categoryId ? true : undefined}
              className="field__control"
              id="categoryId"
              name="categoryId"
              onChange={(event) => setSelectedCategoryId(event.target.value)}
              value={selectedCategoryId}
            >
              {categories.map((category) => (
                <option key={category.id} value={category.id}>{category.name}</option>
              ))}
            </select>
            <p className="field__description" id="categoryId-description">
              Define los atributos técnicos disponibles.
            </p>
            <ControlError error={errors.categoryId} id="categoryId-error" />
          </div>
          <div className="field">
            <label className="field__label" htmlFor="purchaseMode">Modalidad de compra</label>
            <select
              aria-describedby={
                errors.purchaseMode
                  ? "purchaseMode-help purchaseMode-error"
                  : "purchaseMode-help"
              }
              aria-invalid={errors.purchaseMode ? true : undefined}
              className="field__control"
              id="purchaseMode"
              name="purchaseMode"
              onChange={(event) => setPurchaseMode(event.target.value as PurchaseMode)}
              value={purchaseMode}
            >
              {Object.entries(purchaseModeLabels).map(([value, label]) => (
                <option key={value} value={value}>{label}</option>
              ))}
            </select>
            <p className="field__description" id="purchaseMode-help">
              Clasifica internamente cómo se vende el producto. El cliente
              siempre ve Agregar al carrito.
            </p>
            <ControlError error={errors.purchaseMode} id="purchaseMode-error" />
          </div>
          <Field
            description="Obligatorio. El cliente lo ve como precio desde."
            error={errors.priceMinor?.[0]}
            inputMode="decimal"
            label="Precio público (MXN)"
            min="0.01"
            name="price"
            defaultValue={
              initialProduct?.priceMinor == null
                ? undefined
                : initialProduct.priceMinor / 100
            }
            required
            step="0.01"
            type="number"
          />
        </div>
        <div className="cta-preview" aria-live="polite">
          <span>Vista previa de acción</span>
          <strong>Agregar al carrito</strong>
        </div>
      </fieldset>

      <ProductOptionsFields
        errors={errors}
        initialGroups={initialProduct?.optionGroups}
      />

      <fieldset className="admin-form__section">
        <legend>Ficha técnica · {selectedCategory?.name}</legend>
        <div className="admin-form__grid">
          {selectedCategory?.attributes.length ? (
            selectedCategory.attributes.map((attribute) => (
              <DynamicField
                attribute={attribute}
                error={errors[`attribute.${attribute.key}`]}
                initialValue={initialProduct?.attributes[attribute.key]}
                key={attribute.id}
              />
            ))
          ) : (
            <p className="admin-form__note">Esta categoría no tiene atributos adicionales.</p>
          )}
        </div>
      </fieldset>

      <div className="admin-form__footer">
        <label className="choice" htmlFor="published">
          <input
            defaultChecked={initialProduct?.published}
            id="published"
            name="published"
            type="checkbox"
          />
          <span>Publicar al guardar</span>
        </label>
        <Button loading={isPending} type="submit">
          {initialProduct ? "Actualizar producto" : "Guardar producto"}
        </Button>
      </div>
    </form>
    </div>
  );
}
