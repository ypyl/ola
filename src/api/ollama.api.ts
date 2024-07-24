import ollama from "ollama/browser";

export async function* generateHtml(model: string, prompt: string, system: string) {
  const allModels = await list();
  if (!allModels.find(x => x == model)) {
    await pull(model);
  }
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

async function list() {
  const response = await ollama.list();
  return response.models.map(x => x.name);
}

async function pull(model: string) {
  await ollama.pull({ model });
}
