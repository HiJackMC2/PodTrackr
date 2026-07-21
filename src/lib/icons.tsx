import { createElement } from 'react';
import {
  Baby,
  Building2,
  Heart,
  Clock,
  Briefcase,
  Milk,
  Gift,
  Users,
  Tag,
  type LucideIcon,
} from 'lucide-react';

const MAP: Record<string, LucideIcon> = {
  baby: Baby,
  'building-2': Building2,
  heart: Heart,
  clock: Clock,
  briefcase: Briefcase,
  milk: Milk,
  gift: Gift,
  users: Users,
  tag: Tag,
};

export function categoryIcon(name: string | undefined): LucideIcon {
  return (name && MAP[name]) || Tag;
}

/** Renders the lucide icon for a category icon name. */
export function CategoryIcon({
  icon,
  className,
  style,
}: {
  icon: string | undefined;
  className?: string;
  style?: React.CSSProperties;
}) {
  return createElement(categoryIcon(icon), { className, style });
}
