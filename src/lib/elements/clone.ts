import { nanoid } from "nanoid";
import rough from "roughjs";
import type { Point } from "../types";
import { getCenter, unionBounds } from "../geometry/bounds";
import { getElementBounds, translateElement } from "./registry";
import type { ArrowBinding, BoardElement } from "./types";

export function getElementsCenter(elements: BoardElement[]): Point {
  return getCenter(unionBounds(elements.map(getElementBounds)));
}

export function cloneElements(elements: BoardElement[], offset: Point): BoardElement[] {
  const newIds = new Map(elements.map((el) => [el.id, nanoid()]));

  function remap(binding: ArrowBinding | null): ArrowBinding | null {
    const elementId = binding && newIds.get(binding.elementId);
    return binding && elementId ? { ...binding, elementId } : null;
  }

  return elements.map((el) => {
    const copy = { ...translateElement(el, offset.x, offset.y), id: newIds.get(el.id) ?? nanoid(), seed: rough.newSeed() };
    if (copy.type !== "arrow") return copy;
    return { ...copy, startBinding: remap(copy.startBinding), endBinding: remap(copy.endBinding) };
  });
}

export function cloneElementsAt(elements: BoardElement[], center: Point): BoardElement[] {
  const current = getElementsCenter(elements);
  return cloneElements(elements, { x: center.x - current.x, y: center.y - current.y });
}
