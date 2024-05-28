import { filesystem } from "@neutralinojs/lib";

export type Conversation = {
  name: string;
  question: string;
  description: string;
  instructions: string;
  path: string;
};

export async function readConversations(): Promise<Conversation[]> {
  let entries;
  try {
    entries = await filesystem.readDirectory("data");
  } catch (ex) {
    if (ex.code !== "NE_FS_NOPATHE") {
      throw ex;
    }
    await filesystem.createDirectory("data");
    await updateConversation({
      name: "why-sky-is-blue",
      question: "Why sky is blue?",
      description: "Explain the color of the sky.",
      instructions: "Use one sentence for answer.",
      path: "./data/why-sky-is-blue.md",
    });
    entries = await filesystem.readDirectory("data");
  }
  const conversaions: Conversation[] = [];
  for (const item of entries) {
    conversaions.push(await extractConversation(item.path));
  }
  return conversaions;
}

const nameTitle = "# Name";
const questionTitle = "# Question";
const instructionsTitle = "# Instructions";
const descriptionTitle = "# Description";

const titles = [questionTitle, instructionsTitle, descriptionTitle];

async function extractConversation(path: string): Promise<Conversation> {
  const lines = await readLines(path);
  const index = indexPromptFile(lines);
  let name = "";
  let question = "";
  let description = "";
  let instructions = "";
  for (let i = 0; i < index.length; i++) {
    const startIndex = index[i];
    const endIndex =
      startIndex === index[index.length - 1] ? lines.length - 1 : index[i + 1];
    if (lines[startIndex] === nameTitle) {
      name = extractOneItem(lines, startIndex, endIndex);
    }
    if (lines[startIndex] === questionTitle) {
      question = extractOneItem(lines, startIndex, endIndex);
    }
    if (lines[startIndex] === descriptionTitle) {
      description = extractOneItem(lines, startIndex, endIndex);
    }
    if (lines[startIndex] === instructionsTitle) {
      instructions = extractOneItem(lines, startIndex, endIndex);
    }
  }
  return {
    name: name ?? path,
    question,
    description,
    instructions,
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

export async function updateConversation(conversation: Conversation) {
  const promptString = createConversationString(conversation);
  await filesystem.writeFile(conversation.path, promptString);
}

function createConversationString(conversation: Conversation): string {
  return `# Name

${conversation.name}

# Instructions

${conversation.instructions}

# Question

${conversation.question}

# Description

${conversation.description}
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
