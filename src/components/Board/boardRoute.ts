import { redirect, type LoaderFunctionArgs, type ShouldRevalidateFunctionArgs } from "react-router";
import { loadStoredBoard } from "../../lib/persistence";
import { flushBoardSave } from "../../store/appBoardSaving";

export function boardLoader({ params }: LoaderFunctionArgs) {
  flushBoardSave();
  const board = params.id ? loadStoredBoard(params.id) : null;
  if (!params.id || !board) throw redirect("/");
  return { id: params.id, board };
}

export function shouldRevalidateBoard({ currentParams, nextParams }: ShouldRevalidateFunctionArgs) {
  return currentParams.id !== nextParams.id;
}
