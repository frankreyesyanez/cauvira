"use client";

import { useState, useTransition, type FormEvent } from "react";
import { ProductOptionsFields } from "@/components/catalog/product-options-fields";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import type { CatalogActionResult } from "@/features/catalog/catalog.actions";
import type { AttributeType } from "@/features/catalog/catalog.contracts";
import type { CatalogOptionGroup } from "@/features/catalog/pricing";

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

type ProductFormProps = {
  action(formData: FormData): Promise<CatalogActionResult>;
  categories: ProductFormCategory[];
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

export function ProductForm({
  action,
  categories,
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
              Controla la acción comercial que verá el cliente.
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
  );
}
