import { useEffect, useState } from "react";
import { FONT_FAMILIES } from "../lib/elements/types";
import { fontString } from "../lib/text";

const CANVAS_FONT_VARIANTS = FONT_FAMILIES.flatMap((fontFamily) =>
  [false, true].flatMap((bold) =>
    [false, true].map((italic) => fontString({ fontFamily, fontSize: 16, bold, italic })),
  ),
);

export function useFontsVersion(): number {
  const [version, setVersion] = useState(0);

  useEffect(() => {
    const bump = () => setVersion((n) => n + 1);
    document.fonts.addEventListener("loadingdone", bump);
    Promise.all(CANVAS_FONT_VARIANTS.map((font) => document.fonts.load(font)))
      .then(bump)
      .catch(bump);
    return () => document.fonts.removeEventListener("loadingdone", bump);
  }, []);

  return version;
}
