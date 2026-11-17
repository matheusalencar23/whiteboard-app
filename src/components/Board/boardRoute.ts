import { redirect, type LoaderFunctionArgs, type ShouldRevalidateFunctionArgs } from "react-router";
import { openStoredBoard } from "../../store/appBoardStore";

export function boardLoader({ params }: LoaderFunctionArgs) {
  if (!params.id || !openStoredBoard(params.id)) throw redirect("/");
  return null;
}

export function shouldRevalidateBoard({ currentParams, nextParams }: ShouldRevalidateFunctionArgs) {
  return currentParams.id !== nextParams.id;
}
