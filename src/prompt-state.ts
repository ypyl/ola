import { map } from "nanostores";
import { updatePrompt } from "./fs";

export const $prompt = map<Prompt>();

$prompt.listen(async (prompt) => {
  await updatePrompt(prompt);
});

export interface Prompt {
  prompt: string;
  description: string;
  system: string;
  path: string;
};
