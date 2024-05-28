import { Conversation, readConversations } from "./api/fs";
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

type EditState = {
  isEditPrompt: boolean;
  isEditSystem: boolean;
};

enum Route {
  Menu,
  Prompt,
}

type Model = {
  conversations: Conversation[];
  route: Route;
  currentConversation: Conversation | undefined;
  editState: EditState;
  response: string;
};

main();

function main() {
  const appElement = document.getElementById("app");
  if (appElement == null) {
    return;
  }

  const fetchPrompts = async (dispatch) => {
    const conversations = await readConversations();
    requestAnimationFrame(() => dispatch(GetConversations, conversations));
  };

  const fetchModelResponse = async (dispatch, conversation) => {
    for await (const chunk of generateHtml(conversation.question, conversation.instructions)) {
      requestAnimationFrame(() => dispatch(SetResponse, chunk));
    }
  };
  const abortResponse = () => {
    abort();
  };

  const GetConversations: (state: Model, conversations: Conversation[]) => Model = (state, conversations) => ({ ...state, conversations });
  const SelectPrompt = (state, conversation) => [
    { ...state, currentConversation: conversation, response: "..." },
    [fetchModelResponse, conversation],
  ];
  const GoMenu = (state) => [
    { ...state, currentConversation: undefined },
    abortResponse,
  ];
  const SetResponse = (state, value) => ({ ...state, response: value });
  const AbortResponse = (state) => [state, abortResponse];
  const RegenerateResponse = (state) => [
    state,
    abortResponse,
    [fetchModelResponse, state.currentConversation],
  ];
  const ToggleEditPrompt = (state) => ({
    ...state,
    editState: {
      ...state.editState,
      isEditPrompt: !state.editState.isEditPrompt,
    },
  });
  const ToggleEditSystem = (state) => [
    {
      ...state,
      editState: {
        ...state.editState,
        isEditSystem: !state.editState.isEditSystem,
      },
    },
  ];
  const SetPrompt = (state, value) => ({
    ...state,
    currentConversation: { ...state.currentConversation, prompt: value },
  });
  const SetSystem = (state, value) => ({
    ...state,
    currentConversation: { ...state.currentConversation, system: log(value) },
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
          class: "content",
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
        conversations: [],
        route: Route.Menu,
        currentConversation: undefined,
        editState: { isEditPrompt: false, isEditSystem: false },
        response: "",
      },
      fetchPrompts,
    ],
    view: ({
      conversations,
      currentConversation,
      editState: { isEditPrompt, isEditSystem },
      response,
    }) => {
      if (currentConversation) {
        return h("div", { style: { width: "100%" } }, [
          h("button", { class: "menu", innerHTML: menuIcon, onclick: GoMenu }),
          h("div", { class: "container" }, [
            delimiter("Instructions"),
            ...editTextView(
              isEditSystem,
              currentConversation.instructions,
              ToggleEditSystem,
              SetSystem
            ),
            delimiter("Question"),
            ...editTextView(
              isEditPrompt,
              currentConversation.question,
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
            conversations.map((conversation) => {
              return h("tr", { onclick: [SelectPrompt, conversation] }, [
                h("td", {}, text(conversation.question)),
                h("td", {}, text(conversation.description)),
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
