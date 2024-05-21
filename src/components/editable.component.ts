import { deleteIcon, editIcon, saveIcon } from "../svg";
import { atom } from "nanostores";

export const $counter = atom(0);

function increaseEditState() {
  $counter.set($counter.get() + 1);
}

function descriseEditState() {
  $counter.set($counter.get() - 1);
}

export function editableElement(
  getValue: () => string,
  setValue: (value: string) => void
): HTMLElement[] {
  const controls = document.createElement("div");
  controls.className = "row";
  controls.innerHTML = `
    <div class="column header">
      <div class="controls">
        <button data-state="edit">${editIcon}</button>
        <button>${deleteIcon}</button>
      </div>
    </div>`;
  const content = document.createElement("div");
  content.className = "row";
  content.innerHTML = `
    <div class="column content">
    ${toHtml(getValue())}
    </div>`;
  setupDelete(
    controls.querySelector("button:nth-child(2)"),
    content.querySelector("div"),
    setValue
  );
  setupEdit(
    controls.querySelector("button:nth-child(1)"),
    content.querySelector("div"),
    getValue,
    setValue
  );
  return [controls, content];

  async function setupDelete(
    button: HTMLButtonElement | null,
    target: HTMLElement | null,
    setValue: (value: string) => void
  ) {
    if (!button || !target) {
      return;
    }
    const callback = async () => {
      setValue("");
      target.innerHTML = "...";
    };
    button.addEventListener("click", () => callback());
  }

  async function setupEdit(
    button: HTMLButtonElement | null,
    target: HTMLElement | null,
    getValue: () => string,
    setValue: (value: string) => void
  ) {
    if (!button || !target) {
      return;
    }
    const callback = async () => {
      const dataState = button.getAttribute("data-state");
      const isEditState = dataState === "edit";
      const isSaveState = dataState === "save";

      if (isSaveState) {
        setValue(target.querySelector("textarea")?.value || getValue());
      }
      if (isEditState) {
        increaseEditState();
      }
      if (isSaveState) {
        descriseEditState();
      }
      target.innerHTML = isEditState
        ? `<textarea class="u-full-width">${getValue()}</textarea>`
        : toHtml(getValue());
      button.innerHTML = isEditState ? saveIcon : editIcon;
      button.setAttribute("data-state", isEditState ? "save" : "edit");
    };
    button.addEventListener("click", () => callback());
  }

  function toHtml(value: string) {
    return value.replace(/\n+/g, "<br />");
  }
}
