import {
  BriefcaseBusiness,
  Coins,
  UtensilsCrossed,
  Bus,
  Zap,
  Shapes,
  Tag,
  type LucideIcon,
} from "lucide-react-native";
export const categoryIcons: Readonly<Record<string, LucideIcon>> = {
  Salario: BriefcaseBusiness,
  "Otros ingresos": Coins,
  Alimentación: UtensilsCrossed,
  Transporte: Bus,
  Servicios: Zap,
  "Otros gastos": Shapes,
};
export function categoryIcon(name: string, isSystem = true) {
  return isSystem ? (categoryIcons[name] ?? Tag) : Tag;
}
