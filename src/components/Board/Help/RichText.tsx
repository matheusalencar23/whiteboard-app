import { Keys } from "./Keys";

const TOKEN = /(\*\*[^*]+\*\*|`[^`]+`|\[\[[^\]]+\]\])/g;

function parseCombos(source: string): string[][] {
  return source.split("|").map((combo) => (combo === "+" ? ["+"] : combo.split("+")));
}

export function RichText({ text }: { text: string }) {
  return (
    <>
      {text.split(TOKEN).map((part, i) => {
        if (part.startsWith("**") && part.endsWith("**")) return <strong key={i}>{part.slice(2, -2)}</strong>;
        if (part.startsWith("`") && part.endsWith("`")) return <code key={i}>{part.slice(1, -1)}</code>;
        if (part.startsWith("[[") && part.endsWith("]]")) return <Keys key={i} combos={parseCombos(part.slice(2, -2))} />;
        return part;
      })}
    </>
  );
}
