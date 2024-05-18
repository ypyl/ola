import { abort, generateHtml } from "./ollama-api";
import { $counter } from "./editable";
import { cancelIcon, regenerateIcon } from "./svg";

export function createElements() {
  const controls = document.createElement("div");
  controls.className = "row";
  controls.innerHTML = `
    <div class="column header">
      <div><h6>Answer</h6></div>
      <div>
        <div class="controls">
          <button>${regenerateIcon}</button>
          <button>${cancelIcon}</button>
        </div>
      </div>
    </div>`;
  const content = document.createElement("div");
  content.className = "row";
  content.innerHTML = `
    <div class="column content">
    </div>`;
  setupRegenerate(
    controls.querySelector("button:first-child"),
    content.querySelector("div.column")
  );
  setupCancel(controls.querySelector("button:nth-child(2)"));
  controls.querySelector("button")?.click();

  $counter.listen((value) => {
    if (value === 0) {
      controls.querySelector("button")?.click();
    }
  });

  return [controls, content];

  async function setupRegenerate(
    button: HTMLButtonElement | null,
    target: HTMLElement | null
  ) {
    if (!button || !target) {
      return;
    }
    const regenerate = async () => {
      abort();
      target.innerHTML = "...";
      for await (const chunk of generateHtml()) {
        target.innerHTML = chunk;
      }
    };
    button.addEventListener("click", () => regenerate());
  }

  async function setupCancel(button: HTMLButtonElement | null) {
    if (!button) {
      return;
    }
    const stop = async () => {
      abort();
    };
    button.addEventListener("click", () => stop());
  }
}
