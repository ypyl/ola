export function extentableElement(
  createTargetElement: () => HTMLElement[]
): HTMLElement[] {
  return [...createTargetElement(), addEditableElement(createTargetElement)];
}

function addEditableElement(
  createTargetElement: () => HTMLElement[]
): HTMLElement {
  const btnElement = document.createElement("div");
  btnElement.className = "row";
  btnElement.innerHTML = `
    <div class="column button">
      +
    </div>`;
  setupAdd(
    btnElement.querySelector("div:first-child"),
    content.querySelector("div"),
    getValue,
    setValue
  );
  return btnElement;

  async function setupAdd(
    button: HTMLDivElement | null,
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
}
