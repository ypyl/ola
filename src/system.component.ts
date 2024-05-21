import { createElements as createEditable } from "./editable.component";
import { $prompt } from "./prompt.state";

export function createElements(): HTMLElement[] {
  return createEditable("System", () => $prompt.get().system, (value) => $prompt.setKey('system', value));
}
