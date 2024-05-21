import { deepMap } from "nanostores";
import { updatePrompt } from "./fs";

export const $prompt = deepMap<Prompt>();

$prompt.listen(async (prompt) => {
  await updatePrompt(prompt);
});

export type Prompt = {
  prompt: string;
  description: string;
  system: string;
  path: string;
};

function getPromptValue() {

}
