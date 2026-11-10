import { redirect, type LoaderFunctionArgs, type ShouldRevalidateFunctionArgs } from "react-router";
import { useBoardStore } from "../../store/boardStore";

export function boardLoader({ params }: LoaderFunctionArgs) {
  if (!params.id || !useBoardStore.getState().loadStoredBoard(params.id)) throw redirect("/");
  return null;
}

export function shouldRevalidateBoard({ currentParams, nextParams }: ShouldRevalidateFunctionArgs) {
  return currentParams.id !== nextParams.id;
}
