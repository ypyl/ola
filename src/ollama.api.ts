import * as marked from "marked";
import ollama from "ollama/browser";
import { $prompt } from "./prompt.state";

const model = "llama3";

export async function* generateHtml() {
  try {
    const response = await ollama.generate({
      model: model,
      prompt: $prompt.get().prompt,
      system: $prompt.get().system,
      stream: true,
    });

    let result = "";

    for await (const chunk of response) {
      result = result + chunk.response;
      const html = marked.parse(result);
      yield html;
    }
  } catch (error) {
    if (error.name === "AbortError") {
      return;
    }
  }
}

export function abort() {
  ollama.abort();
}
