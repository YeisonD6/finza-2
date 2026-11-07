import { categoryPalette, type CategoryTone } from "../theme/tokens";

const systemTones: Readonly<Record<string, CategoryTone>> = {
  Salario: categoryPalette.salary,
  "Otros ingresos": categoryPalette.income,
  Alimentación: categoryPalette.food,
  Transporte: categoryPalette.transport,
  Servicios: categoryPalette.services,
  "Otros gastos": categoryPalette.other,
};

/** Hues a private category can take; stable per id so it never changes colour between screens. */
const customCycle: readonly CategoryTone[] = [
  categoryPalette.transport,
  categoryPalette.food,
  categoryPalette.other,
  categoryPalette.income,
  categoryPalette.services,
];

function hash(text: string) {
  let value = 0;
  for (let i = 0; i < text.length; i++) value = (value * 31 + text.charCodeAt(i)) | 0;
  return Math.abs(value);
}

/**
 * Colour family for a category. System categories have a fixed hue; private ones get a
 * stable hue from their id (or name). Colour is decorative: the name is always shown.
 */
export function categoryTone(
  name: string,
  isSystem = true,
  key?: string,
): CategoryTone {
  if (isSystem) return systemTones[name] ?? categoryPalette.custom;
  if (!key && !name) return categoryPalette.custom;
  return customCycle[hash(key ?? name) % customCycle.length];
}
