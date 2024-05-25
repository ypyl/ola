import { readPrompts } from "./api/fs";
import "./normalize.css";
import "./skeleton.css";
import "./style.css";

import { init } from "@neutralinojs/lib";
import { h, text, app, ElementVNode } from "hyperapp";
import {
  cancelIcon,
  deleteIcon,
  editIcon,
  menuIcon,
  regenerateIcon,
  saveIcon,
} from "./svg";
import { abort, generateHtml } from "./api/ollama.api";

init();

type Prompt = {
  prompt: string;
  description: string;
  system: string;
  path: string;
};

type PromptState = {
  isEditPrompt: boolean;
  isEditSystem: boolean;
};

enum Route {
  Menu,
  Prompt,
}

type Model = {
  prompts: Prompt[];
  route: Route;
  targetPrompt: Prompt | undefined;
  promptState: PromptState;
  response: string;
};

main();

function main() {
  const appElement = document.getElementById("app");
  if (appElement == null) {
    return;
  }

  const fetchPrompts = async (dispatch) => {
    const prompts = await readPrompts();
    requestAnimationFrame(() => dispatch(GetPrompts, prompts));
  };

  const fetchModelResponse = async (dispatch, prompt) => {
    for await (const chunk of generateHtml(prompt.prompt, prompt.system)) {
      requestAnimationFrame(() => dispatch(SetResponse, chunk));
    }
  };
  const abortResponse = () => {
    abort();
  };

  const GetPrompts = (state, prompts) => ({ ...state, prompts });
  const SelectPrompt = (state, prompt) => [
    { ...state, targetPrompt: prompt, response: "..." },
    [fetchModelResponse, prompt],
  ];
  const GoMenu = (state) => [
    { ...state, targetPrompt: undefined },
    abortResponse,
  ];
  const SetResponse = (state, value) => ({ ...state, response: value });
  const AbortResponse = (state) => [state, abortResponse];
  const RegenerateResponse = (state) => [
    state,
    abortResponse,
    [fetchModelResponse, state.targetPrompt],
  ];
  const ToggleEditPrompt = (state) => ({
    ...state,
    promptState: {
      ...state.promptState,
      isEditPrompt: !state.promptState.isEditPrompt,
    },
  });
  const ToggleEditSystem = (state) => [
    {
      ...state,
      promptState: {
        ...state.promptState,
        isEditSystem: !state.promptState.isEditSystem,
      },
    },
  ];
  const SetPrompt = (state, value) => ({
    ...state,
    targetPrompt: { ...state.targetPrompt, prompt: value },
  });
  const SetSystem = (state, value) => ({
    ...state,
    targetPrompt: { ...state.targetPrompt, system: log(value) },
  });

  const editTextView = (isEdit, value, ToggleAction, SetValue) => {
    return [
      h("div", { class: "row" }, [
        h("div", { class: ["header", "column"] }, [
          h("div", { class: "controls" }, [
            h("button", {
              innerHTML: isEdit ? saveIcon : editIcon,
              onclick: ToggleAction,
            }),
            h("button", { innerHTML: deleteIcon }),
          ]),
        ]),
      ]),
      h("div", { class: "row" }, [
        h(
          "div",
          {
            class: ["column", "content"],
          },
          isEdit
            ? h("textarea", {
                class: "u-full-width",
                value: value,
                oninput: (_, payload) => [
                  SetValue,
                  (payload.target as HTMLInputElement).value,
                ],
              })
            : h("div", { innerHTML: toHtml(value) })
        ),
      ]),
    ] as ElementVNode<Model>[];
  };

  const responseView = (value) => {
    return [
      h("div", { class: "row" }, [
        h("div", { class: ["header", "column"] }, [
          h("div", { class: "controls" }, [
            h("button", {
              innerHTML: regenerateIcon,
              onclick: RegenerateResponse,
            }),
            h("button", { innerHTML: cancelIcon, onclick: AbortResponse }),
          ]),
        ]),
      ]),
      h("div", { class: "row" }, [
        h("div", {
          class: ["header", "content"],
          innerHTML: value,
        }),
      ]),
    ] as ElementVNode<Model>[];
  };

  const delimiter = (title) => {
    return h(
      "div",
      { class: "row" },
      h("div", { class: ["column", "delimiter"] }, [
        h("div", {}, text(title)),
      ])
    ) as ElementVNode<Model>;
  };

  app<Model>({
    init: [
      {
        prompts: [],
        route: Route.Menu,
        targetPrompt: undefined,
        promptState: { isEditPrompt: false, isEditSystem: false },
        response: "",
      },
      fetchPrompts,
    ],
    view: ({
      prompts,
      targetPrompt,
      promptState: { isEditPrompt, isEditSystem },
      response,
    }) => {
      if (targetPrompt) {
        return h("div", { style: { width: "100%" } }, [
          h("button", { class: "menu", innerHTML: menuIcon, onclick: GoMenu }),
          h("div", { class: "container" }, [
            delimiter("System prompt"),
            ...editTextView(
              isEditSystem,
              targetPrompt.system,
              ToggleEditSystem,
              SetSystem
            ),
            delimiter("Prompt"),
            ...editTextView(
              isEditPrompt,
              targetPrompt.prompt,
              ToggleEditPrompt,
              SetPrompt
            ),
            delimiter("LLM answer"),
            ...responseView(response),
          ]),
        ]);
      }
      return h("div", { class: "container" }, [
        h("table", { class: ["u-full-width", "prompts"] }, [
          h("thead", {}, [
            h("tr", {}, [
              h("th", {}, text("Name")),
              h("th", {}, text("Description")),
            ]),
          ]),
          h(
            "tbody",
            {},
            prompts.map((prompt) => {
              return h("tr", { onclick: [SelectPrompt, prompt] }, [
                h("td", {}, text(prompt.prompt)),
                h("td", {}, text(prompt.description)),
              ]);
            })
          ),
        ]),
      ]);
    },

    node: appElement,
  });
}

function toHtml(value: string) {
  return value.replace(/\n+/g, "<br />");
}

function log(value) {
  console.log(value);
  return value;
}
