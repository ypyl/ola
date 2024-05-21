import "./normalize.css";
import "./skeleton.css";
import "./style.css";

import { init } from "@neutralinojs/lib";
import { $route } from "./state/route";
import { promptsElement } from "./components/prompts.component";
import { chatElement } from "./components/chat.component";

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
        chatElement(app);
        break;
      }
      case "/menu": {
        promptsElement(app);
        break;
      }
    }
  });
}
