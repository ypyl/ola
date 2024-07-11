import ollama from "ollama/browser";

export const model = "llama3";

export async function* generateHtml(prompt: string, system: string) {
  try {
    const response = await ollama.generate({
      model: model,
      prompt: prompt,
      system: system,
      stream: true,
    });

    let result = "";

    for await (const chunk of response) {
      result = result + chunk.response;
      yield result;
    }
  } catch (error) {
    if (error.name === "AbortError") {
      return;
    }
    console.error(error);
    yield `Error: ${error}`;
  }
}

export function abort() {
  ollama.abort();
}
