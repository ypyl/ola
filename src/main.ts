import './normalize.css'
import './skeleton.css'
import "./style.css";

import { createElements as createAnswer } from "./response.component";
import { createElements as createSystem } from "./system.component";
import { createElements as createPrompt } from "./prompt.component";
import { menuIcon } from "./svg";
import { init } from "@neutralinojs/lib";
import { $route } from "./route";
import { menu } from "./prompts.component";

init();

main();

function main() {
  const app = document.querySelector("#app");
  if (!app) {
    return;
  }
  $route.subscribe((value) => {
    switch (value) {
      case "/chat": {
        chat(app);
        break;
      }
      case "/menu": {
        menu(app);
        break;
      }
    }
  });
}

function chat(app: Element) {
  app.innerHTML = `<button class="menu">${menuIcon}</button><div class="container"></div>`;
  setupRoute(app.querySelector("button.menu"));

  const container = app.querySelector("div.container");
  const systemEls = createSystem();
  const promptsEls = createPrompt();

  const responseEl = createAnswer();
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
