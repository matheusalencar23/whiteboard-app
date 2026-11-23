import { en } from "./en";
import type { Messages } from "./messages";
import { ptBR } from "./ptBR";

export const LOCALES = { "pt-BR": ptBR, en } as const;

export type WhiteboardLocale = keyof typeof LOCALES;

export const DEFAULT_LOCALE: WhiteboardLocale = "en";

type MessageValue = string | readonly string[] | ((...args: never[]) => string);

export type MessagesOverride<T = Messages> = {
  [Key in keyof T]?: T[Key] extends MessageValue ? T[Key] : MessagesOverride<T[Key]>;
};

function isGroup(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function mergeMessages<T>(base: T, override: unknown): T {
  if (!isGroup(base) || !isGroup(override)) return base;
  const merged: Record<string, unknown> = { ...base };
  for (const [key, value] of Object.entries(override)) {
    if (value === undefined) continue;
    merged[key] = isGroup(merged[key]) ? mergeMessages(merged[key], value) : value;
  }
  return merged as T;
}

export function resolveMessages(locale: WhiteboardLocale = DEFAULT_LOCALE, override?: MessagesOverride): Messages {
  return mergeMessages(LOCALES[locale] ?? LOCALES[DEFAULT_LOCALE], override);
}

function serialize(messages: Messages): string {
  return JSON.stringify(messages, (_key, value) => (typeof value === "function" ? String(value) : value));
}

export function sameMessages(a: Messages, b: Messages): boolean {
  return a === b || serialize(a) === serialize(b);
}
