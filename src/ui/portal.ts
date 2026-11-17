import { createContext, useContext } from "react";

export const PortalContainerContext = createContext<HTMLElement | null>(null);

export const PORTAL_ATTRIBUTE = "data-portal-container";

export function usePortalContainer(): HTMLElement {
  return useContext(PortalContainerContext) ?? document.body;
}

export function isInPortal(target: EventTarget | null): boolean {
  return target instanceof Element && target.closest(`[${PORTAL_ATTRIBUTE}]`) !== null;
}
