import type { ReactNode } from "react";
import type { IconType } from "react-icons";

export function iconsFor<Key extends string>(keys: readonly Key[], render: (key: Key) => ReactNode): Record<Key, IconType> {
  const icons = {} as Record<Key, IconType>;
  for (const key of keys) icons[key] = () => render(key);
  return icons;
}
