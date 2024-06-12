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
  addIcon,
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
  index: number;
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
      question: conversation.question.map((q, index) => ({
        index: conversation.instructions.length + index,
        value: q,
        isEdit: false,
      })),
      description: conversation.description,
      instructions: conversation.instructions.map((q, index) => ({
        index,
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
    const questionToUpdateIndex = state.currentConversation.question.findIndex(x => x.index === index);
    const questionToToggle = state.currentConversation.question[questionToUpdateIndex]
    const updated = { ...questionToToggle, isEdit: !questionToToggle?.isEdit};
    const copied = [...state.currentConversation.question];
    copied[questionToUpdateIndex] = updated;
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
    const toUpdateIndex = state.currentConversation.instructions.findIndex(x => x.index === index);
    const toToggle = state.currentConversation.instructions[toUpdateIndex];
    const updated = { ...toToggle, isEdit: !toToggle?.isEdit };
    const copied = [...state.currentConversation.instructions];
    copied[toUpdateIndex] = updated;
    return {
      ...state,
      currentConversation: {
        ...state.currentConversation,
        instructions: copied,
      },
    };
  };
  const AddNewQuestion = (state: Model, index: number) => {
    if (!state.currentConversation) {
      return { ...state };
    }
    const copied = [...state.currentConversation.question];
    const indexes = [
      ...copied.map((x) => x.index),
      ...state.currentConversation.instructions.map((x) => x.index),
    ];
    const newInstruction = {
      value: "",
      isEdit: true,
      index: Math.max(...indexes) + 1,
    };
    const inserAfter = copied.findIndex((x) => x.index === index);
    copied.splice(inserAfter + 1, 0, newInstruction);
    return {
      ...state,
      currentConversation: {
        ...state.currentConversation,
        question: copied,
      },
    };
  };
  const DeleteQuestion = (state: Model, index: number) => {
    if (!state.currentConversation) {
      return { ...state };
    }
    const copied = [...state.currentConversation.question];
    const deleteIndex = copied.findIndex((x) => x.index === index);
    copied.splice(deleteIndex, 1);
    return {
      ...state,
      currentConversation: {
        ...state.currentConversation,
        question: copied,
      },
    };
  };
  const AddNewInstruction = (state: Model, index: number) => {
    if (!state.currentConversation) {
      return { ...state };
    }
    const copied = [...state.currentConversation.instructions];
    const indexes = [
      ...copied.map((x) => x.index),
      ...state.currentConversation.question.map((x) => x.index),
    ];
    const newInstruction = {
      value: "",
      isEdit: true,
      index: Math.max(...indexes) + 1,
    };
    const inserAfter = copied.findIndex((x) => x.index === index);
    copied.splice(inserAfter + 1, 0, newInstruction);
    return {
      ...state,
      currentConversation: {
        ...state.currentConversation,
        instructions: copied,
      },
    };
  };
  const DeleteInstruction = (state: Model, index: number) => {
    if (!state.currentConversation) {
      return { ...state };
    }
    const copied = [...state.currentConversation.instructions];
    const deleteIndex = copied.findIndex((x) => x.index === index);
    copied.splice(deleteIndex, 1);
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
    const questionToUpdateIndex = state.currentConversation.question.findIndex(x => x.index === index);
    const updated = { ...state.currentConversation.question[questionToUpdateIndex], value: value };
    const copied = [...state.currentConversation.question];
    copied[questionToUpdateIndex] = updated;
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
    const toUpdateIndex = state.currentConversation.instructions.findIndex(x => x.index === index);
    const updated = { ...state.currentConversation.instructions[toUpdateIndex], value: value };
    const copied = [...state.currentConversation.instructions];
    copied[toUpdateIndex] = updated;
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
    ) => Model,
    AddAction: (state: Model, index: number) => Dispatchable<Model, any>,
    DeleteAction: (state: Model, index: number) => Dispatchable<Model, any>,
    showDelete: boolean
  ) => {
    return [
      h("div", { class: ["row", "edit"], key: index + "content" }, [
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
        h("div", { class: "controls" }, [
          h("button", {
            innerHTML: isEdit ? saveIcon : editIcon,
            onclick: [ToggleAction, index],
          }),
          showDelete
            ? h("button", {
                innerHTML: deleteIcon,
                onclick: [DeleteAction, index],
              })
            : null,
          h("button", { innerHTML: addIcon, onclick: [AddAction, index] }),
        ]),
      ]),
    ] as ElementVNode<Model>[];
  };

  const responseView = (value: string) => {
    return [
      h("div", { class: ["row", "edit"] }, [
        h("div", {
          class: "content",
          innerHTML: value,
        }),
        h("div", { class: "controls" }, [
          h("button", {
            innerHTML: regenerateIcon,
            onclick: RegenerateResponse,
          }),
          h("button", { innerHTML: cancelIcon, onclick: AbortResponse }),
        ]),
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
        const questionView = currentConversation.question.flatMap((question) =>
          editTextView(
            question.isEdit,
            question.value,
            question.index,
            ToggleEditQuestion,
            SetQuestion,
            AddNewQuestion,
            DeleteQuestion,
            currentConversation.question.length > 1
          )
        );
        const instructionView = currentConversation.instructions.flatMap(
          (instruction) =>
            editTextView(
              instruction.isEdit,
              instruction.value,
              instruction.index,
              ToggleEditInstructions,
              SetInstructions,
              AddNewInstruction,
              DeleteInstruction,
              currentConversation.instructions.length > 1
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
