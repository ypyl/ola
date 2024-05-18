import { createElements as createEditable } from "./editable";
import { $prompt } from "./prompt-state";

export function createElements(): HTMLElement[] {
  return createEditable("System", () => $prompt.get().system, (value) => $prompt.setKey('system', value));
}
