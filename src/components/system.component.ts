import { editableElement } from "./editable.component";
import { $prompt } from "../state/prompt.state";
import { titledElement } from "./titled.component";
import { extentableElement } from "./extentable.component";

export function systemElement(): HTMLElement[] {
  const editableElements = editableElement(() => $prompt.get().system, (value) => $prompt.setKey('system', value));
  const extendedElements = extentableElement(() => (editableElements));
  return titledElement("System", extendedElements);
}
