"use client";

import { useState, useTransition, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import type { CatalogActionResult } from "@/features/catalog/catalog.actions";
import type { AttributeType } from "@/features/catalog/catalog.contracts";

type CategoryOption = { id: string; name: string };

type CategoryFormProps = {
  action(formData: FormData): Promise<CatalogActionResult>;
  categories: CategoryOption[];
};

type AttributeRow = {
  clientId: number;
  type: AttributeType;
};

const attributeTypeLabels: Record<AttributeType, string> = {
  text: "Texto",
  number: "Número",
  boolean: "Sí / no",
  select: "Selección",
  multiselect: "Selección múltiple",
  date: "Fecha",
  measurement: "Medición",
};

export function CategoryForm({ action, categories }: CategoryFormProps) {
  const [attributes, setAttributes] = useState<AttributeRow[]>([]);
  const [nextId, setNextId] = useState(1);
  const [result, setResult] = useState<CatalogActionResult | null>(null);
  const [isPending, startTransition] = useTransition();
  const errors = result && !result.ok ? result.fieldErrors : {};

  function addAttribute() {
    setAttributes((current) => [...current, { clientId: nextId, type: "text" }]);
    setNextId((current) => current + 1);
  }

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    startTransition(async () => {
      setResult(await action(formData));
    });
  }

  return (
    <form className="admin-form" onSubmit={submit}>
      {errors._form ? (
        <div className="ui-alert ui-alert--urgent" role="alert">
          <span aria-hidden="true" className="ui-icon">!</span>
          <p>{errors._form[0]}</p>
        </div>
      ) : null}
      {result?.ok ? (
        <div className="ui-alert ui-alert--opportunity" role="status">
          <span aria-hidden="true" className="ui-icon">✓</span>
          <p>Categoría guardada. Ya puedes asignarla a productos.</p>
        </div>
      ) : null}

      <fieldset className="admin-form__section">
        <legend>Datos de categoría</legend>
        <div className="admin-form__grid">
          <Field
            description="Nombre visible para el equipo y clientes."
            error={errors.name?.[0]}
            label="Nombre"
            name="name"
            placeholder="Máquinas de hielo"
            required
          />
          <Field
            description="URL en minúsculas, sin espacios ni acentos."
            error={errors.slug?.[0]}
            label="Slug"
            name="slug"
            placeholder="maquinas-de-hielo"
            required
          />
          <div className="field">
            <label className="field__label" htmlFor="parentId">Categoría superior</label>
            <select
              aria-describedby={
                errors.parentId
                  ? "parentId-description parentId-error"
                  : "parentId-description"
              }
              aria-invalid={errors.parentId ? true : undefined}
              className="field__control"
              id="parentId"
              name="parentId"
            >
              <option value="">Sin categoría superior</option>
              {categories.map((category) => (
                <option key={category.id} value={category.id}>{category.name}</option>
              ))}
            </select>
            <p className="field__description" id="parentId-description">
              Opcional para organizar subcategorías.
            </p>
            {errors.parentId ? (
              <p className="field__error" id="parentId-error">
                <span aria-hidden="true">!</span>{errors.parentId[0]}
              </p>
            ) : null}
          </div>
        </div>
      </fieldset>

      <fieldset className="admin-form__section">
        <legend>Atributos técnicos</legend>
        <div className="admin-form__legend-actions">
          <p className="admin-form__note">
            Agrega solo los datos necesarios para comparar y describir productos.
          </p>
          <Button onClick={addAttribute} type="button" variant="secondary">
            Agregar atributo
          </Button>
        </div>
        {attributes.length === 0 ? (
          <p className="admin-form__note">
            Sin atributos todavía. Agrégalos para construir fichas técnicas sin código.
          </p>
        ) : (
          <div className="attribute-list">
            {attributes.map((attribute, index) => {
              const prefix = `attributes.${index}`;
              return (
                <section className="attribute-row" key={attribute.clientId}>
                  <div className="attribute-row__heading">
                    <strong>Atributo {index + 1}</strong>
                    <button
                      className="text-action"
                      onClick={() =>
                        setAttributes((current) =>
                          current.filter((item) => item.clientId !== attribute.clientId),
                        )
                      }
                      type="button"
                    >
                      Quitar
                    </button>
                  </div>
                  <div className="admin-form__grid">
                    <Field
                      description="Clave interna estable, por ejemplo daily_output."
                      error={errors[`${prefix}.key`]?.[0]}
                      label="Clave"
                      name={`${prefix}.key`}
                      required
                    />
                    <Field
                      description="Etiqueta comprensible para quien captura."
                      error={errors[`${prefix}.label`]?.[0]}
                      label="Etiqueta"
                      name={`${prefix}.label`}
                      required
                    />
                    <div className="field">
                      <label className="field__label" htmlFor={`${prefix}.type`}>Tipo</label>
                      <select
                        aria-describedby={
                          errors[`${prefix}.type`]
                            ? `${prefix}.type-description ${prefix}.type-error`
                            : `${prefix}.type-description`
                        }
                        aria-invalid={errors[`${prefix}.type`] ? true : undefined}
                        className="field__control"
                        id={`${prefix}.type`}
                        name={`${prefix}.type`}
                        onChange={(event) =>
                          setAttributes((current) =>
                            current.map((item) =>
                              item.clientId === attribute.clientId
                                ? { ...item, type: event.target.value as AttributeType }
                                : item,
                            ),
                          )
                        }
                        value={attribute.type}
                      >
                        {Object.entries(attributeTypeLabels).map(([value, label]) => (
                          <option key={value} value={value}>{label}</option>
                        ))}
                      </select>
                      <p className="field__description" id={`${prefix}.type-description`}>
                        Define el control y la validación.
                      </p>
                      {errors[`${prefix}.type`] ? (
                        <p className="field__error" id={`${prefix}.type-error`}>
                          <span aria-hidden="true">!</span>
                          {errors[`${prefix}.type`][0]}
                        </p>
                      ) : null}
                    </div>
                    {attribute.type === "measurement" ? (
                      <Field
                        description="Ej. kg/día, V o m²."
                        error={errors[`${prefix}.unit`]?.[0]}
                        label="Unidad"
                        name={`${prefix}.unit`}
                        required
                      />
                    ) : null}
                    {attribute.type === "select" || attribute.type === "multiselect" ? (
                      <Field
                        description="Separa cada opción con coma."
                        error={errors[`${prefix}.options`]?.[0]}
                        label="Opciones"
                        name={`${prefix}.options`}
                        placeholder="Manual, Automática"
                        required
                      />
                    ) : null}
                  </div>
                  <div className="choice-row">
                    {[
                      ["required", "Obligatorio"],
                      ["filterable", "Disponible como filtro"],
                      ["comparable", "Comparable"],
                    ].map(([name, label]) => (
                      <label className="choice" key={name}>
                        <input name={`${prefix}.${name}`} type="checkbox" />
                        <span>{label}</span>
                      </label>
                    ))}
                  </div>
                </section>
              );
            })}
          </div>
        )}
      </fieldset>

      <div className="admin-form__footer">
        <span className="admin-form__note">Los cambios se validan antes de persistir.</span>
        <Button loading={isPending} type="submit">Guardar categoría</Button>
      </div>
    </form>
  );
}
