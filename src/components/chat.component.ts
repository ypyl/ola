import { $route } from "../state/route";
import { menuIcon } from "../svg";
import { promptElement } from "./prompt.component";
import { responseElement } from "./response.component";
import { systemElement } from "./system.component";

export function chatElement(app: Element) {
  app.innerHTML = `<button class="menu">${menuIcon}</button><div class="container"></div>`;
  setupRoute(app.querySelector("button.menu"));

  const container = app.querySelector("div.container");
  const systemEls = systemElement();
  const promptsEls = promptElement();

  const responseEl = responseElement();
  for (const el of systemEls) {
    container?.appendChild(el);
  }
  for (const el of promptsEls) {
    container?.appendChild(el);
  }
  for (const el of responseEl) {
    container?.appendChild(el);
  }

  async function setupRoute(button: HTMLButtonElement | null) {
    if (!button) {
      return;
    }
    const changeRoute = () => {
      if ($route.get() === "/chat") {
        $route.set("/menu");
      }
    };
    button.addEventListener("click", () => changeRoute());
  }
}
