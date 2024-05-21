import { $prompt } from "../state/prompt.state";
import { editableElement } from "./editable.component";
import { titledElement } from "./titled.component";

export function promptElement(): HTMLElement[] {
  const promptElements = editableElement(() => $prompt.get().prompt, (value) => $prompt.setKey('prompt', value));
  return titledElement("Prompt", promptElements);
}
