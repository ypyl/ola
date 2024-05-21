import { $prompt, Prompt } from "../state/prompt.state";
import { readPrompts } from "../api/fs";
import { $route } from "../state/route";

export async function promptsElement(app: Element) {
  const prompts = await readPrompts();
  app.innerHTML = `<div class="container"><table class="u-full-width prompts">
    <thead>
      <tr>
        <th>Name</th>
        <th>Description</th>
      </tr>
    </thead>
    <tbody>
    </tbody>
  </table></div>`;
  const tbody = app.querySelector("tbody");
  const trs = prompts.map(x => createTableRow(x));
  for (const tr of trs) {
    tbody?.appendChild(tr);
  }
}

function createTableRow(prompt: Prompt): HTMLElement {
  const tr = document.createElement("tr");
  tr.innerHTML = `<td>${prompt.prompt}</td>
    <td>${prompt.description}</td>`;
  setupRoute(tr);

  async function setupRoute(tableRow: HTMLTableRowElement | null) {
    if (!tableRow) {
      return;
    }
    const changeRoute = () => {
      if ($route.get() === "/menu") {
        $prompt.set(prompt);
        $route.set("/chat");
      }
    };
    tableRow.addEventListener("click", () => changeRoute());
  }
  return tr;
}
