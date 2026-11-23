import { useBoardStore } from "../store/boardStoreContext";
import type { Messages } from "./messages";

export function useMessages(): Messages {
  return useBoardStore((s) => s.messages);
}
