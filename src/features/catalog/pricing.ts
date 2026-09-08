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
