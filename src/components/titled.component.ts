export function titledElement(title: string, decoratedElement: HTMLElement[]): HTMLElement[] {
  const titleElement = document.createElement("div");
  titleElement.className = "row";
  titleElement.innerHTML = `
    <div class="column title">
      <div><h6>${title}</h6></div>
    </div>`;
  return [titleElement, ...decoratedElement];
}
