import { Conversation, readConversations } from "./api/fs";
import "./normalize.css";
import "./skeleton.css";
import "./style.css";

import { init } from "@neutralinojs/lib";
import {
  h,
  text,
  app,
  ElementVNode,
  Dispatch,
  Dispatchable,
  MaybeEffect,
  Action,
} from "hyperapp";
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

enum Route {
  Menu,
  Prompt,
}

type EditableString = {
  value: string;
  isEdit: boolean;
};

type CurrentConversation = {
  name: string;
  question: EditableString[];
  description: string;
  instructions: EditableString[];
  path: string;
};

type Model = {
  conversations: Conversation[];
  route: Route;
  currentConversation: CurrentConversation | undefined;
  response: string;
};

main();

function main() {
  const appElement = document.getElementById("app");
  if (appElement == null) {
    return;
  }

  const fetchPrompts = async (dispatch: Dispatch<Model>) => {
    const conversations = await readConversations();
    requestAnimationFrame(() => dispatch(GetConversations, conversations));
  };

  const fetchModelResponse = async (
    dispatch: Dispatch<Model>,
    conversation: CurrentConversation
  ) => {
    for await (const chunk of generateHtml(
      conversation.question.map((x) => x.value).join(" "),
      conversation.instructions.map((x) => x.value).join(" ")
    )) {
      requestAnimationFrame(() => dispatch(SetResponse, chunk));
    }
  };
  const abortResponse = () => {
    abort();
  };

  const GetConversations: (
    state: Model,
    conversations: Conversation[]
  ) => Model = (state, conversations) => ({ ...state, conversations });
  const SelectPrompt: Action<Model, Conversation> = (
    state: Model,
    conversation: Conversation
  ) => {
    const currentConversation = {
      name: conversation.name,
      question: conversation.question.map((q) => ({
        value: q,
        isEdit: false,
      })),
      description: conversation.description,
      instructions: conversation.instructions.map((q) => ({
        value: q,
        isEdit: false,
      })),
      path: conversation.path,
    };
    return [
      {
        ...state,
        currentConversation,
        response: "...",
      },
      [fetchModelResponse, currentConversation],
    ];
  };
  const GoMenu: Action<Model, MouseEvent> = (state: Model) => [
    { ...state, currentConversation: undefined },
    abortResponse,
  ];
  const SetResponse = (state: Model, value: string) => ({
    ...state,
    response: value,
  });
  const AbortResponse: Action<Model, MouseEvent> = (state: Model) => [
    state,
    abortResponse,
  ];
  const RegenerateResponse: Action<Model, MouseEvent> = (state) => [
    {
      ...state,
      response: "...",
    },
    abortResponse,
    [fetchModelResponse, state.currentConversation],
  ];
  const ToggleEditQuestion = (state: Model, index: number) => {
    if (!state.currentConversation) {
      return { ...state };
    }
    const questionToToggle = state.currentConversation.question[index];
    const updated = { ...questionToToggle, isEdit: !questionToToggle?.isEdit };
    const copied = [...state.currentConversation.question];
    copied[index] = updated;
    return {
      ...state,
      currentConversation: {
        ...state.currentConversation,
        question: copied,
      },
    };
  };
  const ToggleEditInstructions = (state: Model, index: number) => {
    if (!state.currentConversation) {
      return { ...state };
    }
    const toToggle = state.currentConversation.instructions[index];
    const updated = { ...toToggle, isEdit: !toToggle?.isEdit };
    const copied = [...state.currentConversation.instructions];
    copied[index] = updated;
    return {
      ...state,
      currentConversation: {
        ...state.currentConversation,
        instructions: copied,
      },
    };
  };
  const SetQuestion = (
    state: Model,
    { value, index }: { value: string; index: number }
  ) => {
    if (!state.currentConversation) {
      return { ...state };
    }
    const questionToUpdate = state.currentConversation.question[index];
    const updated = { ...questionToUpdate, value: value };
    const copied = [...state.currentConversation.question];
    copied[index] = updated;
    return {
      ...state,
      currentConversation: {
        ...state.currentConversation,
        question: copied,
      },
    };
  };
  const SetInstructions = (
    state: Model,
    { value, index }: { value: string; index: number }
  ) => {
    if (!state.currentConversation) {
      return { ...state };
    }
    const toUpdate = state.currentConversation.instructions[index];
    const updated = { ...toUpdate, value: value };
    const copied = [...state.currentConversation.instructions];
    copied[index] = updated;
    return {
      ...state,
      currentConversation: {
        ...state.currentConversation,
        instructions: copied,
      },
    };
  };

  const editTextView = (
    isEdit: boolean,
    value: string,
    index: number,
    ToggleAction: (state: Model, index: number) => Dispatchable<Model, any>,
    SetValue: (
      state: Model,
      { value, index }: { value: string; index: number }
    ) => Model
  ) => {
    return [
      h("div", { class: "row" }, [
        h("div", { class: ["header", "column"] }, [
          h("div", { class: "controls" }, [
            h("button", {
              innerHTML: isEdit ? saveIcon : editIcon,
              onclick: [ToggleAction, index],
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
                oninput: (_, payload) => {
                  return [
                    SetValue,
                    {
                      value: (payload.target as HTMLInputElement).value,
                      index,
                    },
                  ];
                },
              })
            : h("div", { innerHTML: toHtml(value) })
        ),
      ]),
    ] as ElementVNode<Model>[];
  };

  const responseView = (value: string) => {
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

  const delimiter = (title: string) => {
    return h(
      "div",
      { class: "row" },
      h("div", { class: ["column", "delimiter"] }, [h("div", {}, text(title))])
    ) as ElementVNode<Model>;
  };

  app<Model>({
    init: [
      {
        conversations: [],
        route: Route.Menu,
        currentConversation: undefined,
        response: "",
      },
      fetchPrompts,
    ],
    view: ({ conversations, currentConversation, response }) => {
      if (currentConversation) {
        const questionView = currentConversation.question.flatMap(
          (question, index) =>
            editTextView(
              question.isEdit,
              question.value,
              index,
              ToggleEditQuestion,
              SetQuestion
            )
        );
        const instructionView = currentConversation.instructions.flatMap(
          (instruction, index) =>
            editTextView(
              instruction.isEdit,
              instruction.value,
              index,
              ToggleEditInstructions,
              SetInstructions
            )
        );
        return h("div", { style: { width: "100%" } }, [
          h("button", { class: "menu", innerHTML: menuIcon, onclick: GoMenu }),
          h("div", { class: "container" }, [
            delimiter("Instructions"),
            ...instructionView,
            delimiter("Question"),
            ...questionView,
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
