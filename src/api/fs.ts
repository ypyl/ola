import { filesystem } from "@neutralinojs/lib";

type Prompt = {
  prompt: string;
  description: string;
  system: string;
  path: string;
};


export async function readPrompts(): Promise<Prompt[]> {
  let entries;
  try {
    entries = await filesystem.readDirectory("data");
  } catch (ex) {
    if (ex.code !== "NE_FS_NOPATHE") {
      throw ex;
    }
    await filesystem.createDirectory("data");
    await updatePrompt({
      prompt: "Why sky is blue?",
      description: "Explain the color of the sky.",
      system: "Use one sentence for answer.",
      path: "./data/why-sky-is-blue.md",
    });
    entries = await filesystem.readDirectory("data");
  }
  const prompts: Prompt[] = [];
  for (const item of entries) {
    prompts.push(await extractPrompt(item.path));
  }
  return prompts;
}

const promptTitle = "# Prompt";
const systemTitle = "# System";
const descriptionTitle = "# Description";

const titles = [promptTitle, systemTitle, descriptionTitle];

async function extractPrompt(path: string): Promise<Prompt> {
  const lines = await readLines(path);
  const index = indexPromptFile(lines);
  let prompt = "";
  let description = "";
  let system = "";
  for (let i = 0; i < index.length; i++) {
    const startIndex = index[i];
    const endIndex =
      startIndex === index[index.length - 1] ? lines.length - 1 : index[i + 1];
    if (lines[startIndex] === promptTitle) {
      prompt = extractOneItem(lines, startIndex, endIndex);
    }
    if (lines[startIndex] === descriptionTitle) {
      description = extractOneItem(lines, startIndex, endIndex);
    }
    if (lines[startIndex] === systemTitle) {
      system = extractOneItem(lines, startIndex, endIndex);
    }
  }
  return {
    prompt: prompt,
    description,
    system: system,
    path,
  };
}

function extractOneItem(lines: string[], start: number, end: number): string {
  let result = "";
  for (let i = start + 1; i < end; i++) {
    result += lines[i] + "\n";
  }
  return result.trim();
}

export async function updatePrompt(prompt: Prompt) {
  const promptString = createPromptString(prompt);
  await filesystem.writeFile(prompt.path, promptString);
}

function createPromptString(prompt: Prompt): string {
  return `# System

${prompt.system}

# Prompt

${prompt.prompt}

# Description

${prompt.description}
`;
}

async function readLines(path: string): Promise<string[]> {
  const content = await filesystem.readFile(path);
  return content.split("\n").map((x) => x.trim());
}

function indexPromptFile(lines: string[]): number[] {
  const index: number[] = [];
  let i = 0;
  for (const line of lines) {
    const title = titles.find((x) => x === line);
    if (title == null) {
      i += 1;
      continue;
    }
    index.push(i);
    i += 1;
  }
  return index;
}
