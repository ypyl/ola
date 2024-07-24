import { filesystem, app } from "@neutralinojs/lib";

export type Conversation = {
  model: string;
  name: string;
  question: string[];
  description: string;
  instruction: string[];
  path: string;
};

export async function readConversations(): Promise<Conversation[]> {
  const appConfig = await app.getConfig();
  const appFolder: string = appConfig.modes.window.title;
  let entries;
  try {
    entries = await filesystem.readDirectory(appFolder);
  } catch (ex) {
    if (ex.code !== "NE_FS_NOPATHE") {
      throw ex;
    }
    await filesystem.createDirectory(appFolder);
    await updateConversation({
      model: "llama3.1",
      name: "why-sky-is-blue",
      question: ["Why sky is blue?"],
      description: "Explain the color of the sky.",
      instruction: ["You are an expert in physics.", "Use one sentence for answer."],
      path: `./${appFolder}/why-sky-is-blue.md`,
    });
    entries = await filesystem.readDirectory(appFolder);
  }
  const conversaions: Conversation[] = [];
  for (const item of entries.filter((item) => item.path.endsWith(".md"))) {
    conversaions.push(await extractConversation(item.path));
  }
  return conversaions;
}

const nameTitle = "# Name";
const modelTitle = "# Model";
const questionTitle = "# Question";
const instructionTitle = "# Instruction";
const descriptionTitle = "# Description";

const titles = [modelTitle, nameTitle, questionTitle, instructionTitle, descriptionTitle];

async function extractConversation(path: string): Promise<Conversation> {
  const lines = await readLines(path);
  const index = indexPromptFile(lines);
  let name = "";
  let model = "llama3.1";
  let question: string[] = [];
  let description = "";
  let instruction: string[] = [];
  for (let i = 0; i < index.length; i++) {
    const startIndex = index[i];
    const endIndex =
      startIndex === index[index.length - 1] ? lines.length - 1 : index[i + 1];
    if (lines[startIndex] === nameTitle) {
      name = extractString(lines, startIndex, endIndex);
    }
    if (lines[startIndex] === modelTitle) {
      model = extractString(lines, startIndex, endIndex);
    }
    if (lines[startIndex] === questionTitle) {
      question = extractStringArray(lines, startIndex, endIndex);
    }
    if (lines[startIndex] === descriptionTitle) {
      description = extractString(lines, startIndex, endIndex);
    }
    if (lines[startIndex] === instructionTitle) {
      instruction = extractStringArray(lines, startIndex, endIndex);
    }
  }
  return {
    model: model ?? "llama3.1",
    name: name ?? path,
    question,
    description,
    instruction,
    path,
  };
}

function extractString(lines: string[], start: number, end: number): string {
  let result = "";
  for (let i = start + 1; i < end; i++) {
    result += lines[i] + "\n";
  }
  return result.trim();
}

function extractStringArray(lines: string[], start: number, end: number): string[] {
  const result: string[] = [];
  let current = ""
  for (let i = start + 1; i < end; i++) {
    if (lines[i].trim() === "") {
      if (current !== "") {
        result.push(current.trim());
        current = "";
      }
      continue;
    }
    current += lines[i] + "\n";
  }
  if (current) {
    result.push(current.trim());
  }
  return result;
}


export async function updateConversation(conversation: Conversation) {
  const promptString = createConversationString(conversation);
  await filesystem.writeFile(conversation.path, promptString);
}

function createConversationString(conversation: Conversation): string {
  const questionString = conversation.question.join("\n\n");
  const instructionString = conversation.instruction.join("\n\n");
  return `# Name

${conversation.name}

# Model

${conversation.model}

# Description

${conversation.description}

# Instruction

${instructionString}

# Question

${questionString}
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

export async function isFile(input: string): Promise<boolean> {
  // Define a regular expression for basic path patterns
  const pathPattern = /^(\/|\.\/|\.\.\/|[a-zA-Z]:\\|\\\\)/;

  // Check if the input matches the path pattern
  if (pathPattern.test(input)) {
      try {
          // Attempt to get stats for the path
          const stats = await filesystem.getStats(input);
          if (stats.isFile) {
            return true;
          }
          return false;
      } catch (e) {
          // If NE_FS_NOPATHE is thrown, it's likely not a valid path
          if (e.code === 'NE_FS_NOPATHE') {
              console.error('Path does not exist:', input);
              return false;
          }
          // Re-throw other errors for debugging purposes
          throw e;
      }
  }

  return false;
}

export async function readFileContent(filePath: string): Promise<string> {
  try {
      // Read the file content
      const data = await filesystem.readFile(filePath);
      return data;
  } catch (e) {
      // Handle file read errors
      if (e.code === 'NE_FS_FILRDER') {
          console.error('File read error:', filePath);
          throw new Error(`Unable to read file: ${filePath}`);
      }
      // Re-throw other errors for debugging purposes
      throw e;
  }
}
