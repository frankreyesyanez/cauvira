"use client";

import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import type { CatalogOptionGroup } from "@/features/catalog/pricing";

type OptionValueDraft = {
  clientId: string;
  label: string;
  pricePesos: number;
};

type OptionGroupDraft = {
  clientId: string;
  name: string;
  required: boolean;
  values: OptionValueDraft[];
};

type ProductOptionsFieldsProps = {
  errors?: Record<string, string[]>;
  initialGroups?: CatalogOptionGroup[];
};

function toDrafts(groups: CatalogOptionGroup[]): OptionGroupDraft[] {
  return groups.map((group) => ({
    clientId: group.id,
    name: group.name,
    required: group.required,
    values: group.values.map((value) => ({
      clientId: value.id,
      label: value.label,
      pricePesos: value.priceDeltaMinor / 100,
    })),
  }));
}

export function ProductOptionsFields({
  errors = {},
  initialGroups = [],
}: ProductOptionsFieldsProps) {
  const [groups, setGroups] = useState<OptionGroupDraft[]>(() =>
    toDrafts(initialGroups),
  );
  const nextId = useRef(0);

  function takeId() {
    nextId.current += 1;
    return `option-${nextId.current}`;
  }

  function addGroup() {
    const groupId = takeId();
    setGroups((current) => [
      ...current,
      {
        clientId: groupId,
        name: "",
        required: true,
        values: [{ clientId: `${groupId}-value`, label: "", pricePesos: 0 }],
      },
    ]);
  }

  function addValue(groupClientId: string) {
    const valueId = takeId();
    setGroups((current) =>
      current.map((group) =>
        group.clientId === groupClientId
          ? {
              ...group,
              values: [
                ...group.values,
                { clientId: valueId, label: "", pricePesos: 0 },
              ],
            }
          : group,
      ),
    );
  }

  function removeGroup(groupClientId: string) {
    setGroups((current) =>
      current.filter((group) => group.clientId !== groupClientId),
    );
  }

  function removeValue(groupClientId: string, valueClientId: string) {
    setGroups((current) =>
      current.map((group) =>
        group.clientId === groupClientId
          ? {
              ...group,
              values: group.values.filter(
                (value) => value.clientId !== valueClientId,
              ),
            }
          : group,
      ),
    );
  }

  return (
    <fieldset className="admin-form__section">
      <legend>Opciones de compra</legend>
      <div className="admin-form__legend-actions">
        <p className="admin-form__note">
          Define tallas, voltajes u otras variantes con cargo en pesos. El
          cliente las elige antes de agregar al carrito.
        </p>
        <Button onClick={addGroup} type="button" variant="secondary">
          Agregar grupo de opciones
        </Button>
      </div>
      {groups.length === 0 ? (
        <p className="admin-form__note">
          Sin opciones todavía. El producto se vende con su precio público
          únicamente.
        </p>
      ) : (
        <div className="option-list">
          {groups.map((group, groupIndex) => {
            const prefix = `optionGroups.${groupIndex}`;
            return (
              <section className="option-group" key={group.clientId}>
                <div className="option-group__heading">
                  <strong>Grupo {groupIndex + 1}</strong>
                  <button
                    className="text-action"
                    onClick={() => removeGroup(group.clientId)}
                    type="button"
                  >
                    Quitar grupo
                  </button>
                </div>
                <input name={`${prefix}.sortOrder`} type="hidden" value={groupIndex} />
                <div className="admin-form__grid">
                  <Field
                    defaultValue={group.name}
                    description="Nombre que ve el cliente, por ejemplo Talla o Voltaje."
                    error={errors[`${prefix}.name`]?.[0]}
                    label="Nombre del grupo"
                    name={`${prefix}.name`}
                    required
                  />
                </div>
                <label className="choice" htmlFor={`${prefix}.required`}>
                  <input
                    defaultChecked={group.required}
                    id={`${prefix}.required`}
                    name={`${prefix}.required`}
                    type="checkbox"
                  />
                  <span>Selección obligatoria</span>
                </label>
                <div className="option-group__values">
                  {group.values.map((value, valueIndex) => {
                    const valuePrefix = `${prefix}.values.${valueIndex}`;
                    return (
                      <section className="option-value" key={value.clientId}>
                        <div className="option-value__heading">
                          <strong>Valor {valueIndex + 1}</strong>
                          <button
                            className="text-action"
                            onClick={() =>
                              removeValue(group.clientId, value.clientId)
                            }
                            type="button"
                          >
                            Quitar valor
                          </button>
                        </div>
                        <input
                          name={`${valuePrefix}.sortOrder`}
                          type="hidden"
                          value={valueIndex}
                        />
                        <div className="admin-form__grid">
                          <Field
                            defaultValue={value.label}
                            description="Texto de la opción, por ejemplo M o 220 V."
                            error={errors[`${valuePrefix}.label`]?.[0]}
                            label="Etiqueta"
                            name={`${valuePrefix}.label`}
                            required
                          />
                          <Field
                            defaultValue={value.pricePesos}
                            description="Cargo adicional sobre el precio público. Cero si no cambia."
                            error={errors[`${valuePrefix}.priceDeltaMinor`]?.[0]}
                            inputMode="decimal"
                            label="Cargo (MXN)"
                            min="0"
                            name={`${valuePrefix}.price`}
                            required
                            step="0.01"
                            type="number"
                          />
                        </div>
                      </section>
                    );
                  })}
                </div>
                <Button
                  onClick={() => addValue(group.clientId)}
                  type="button"
                  variant="ghost"
                >
                  Agregar valor
                </Button>
              </section>
            );
          })}
        </div>
      )}
    </fieldset>
  );
}
