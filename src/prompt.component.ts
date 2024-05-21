import { $prompt } from "./prompt.state";
import { createElements as createEditable } from "./editable.component";

export function createElements(): HTMLElement[] {
  return createEditable("Prompt", () => $prompt.get().prompt, (value) => $prompt.setKey('prompt', value));
}
