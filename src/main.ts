import { Conversation, isFile, readConversations, readFileContent, updateConversation } from "./api/fs";
import "./normalize.css";
import "./skeleton.css";
import "./style.css";
import * as marked from "marked";
import { init, clipboard } from "@neutralinojs/lib";
import { h, text, app, ElementVNode, Dispatch, Dispatchable, MaybeEffect, Action } from "hyperapp";
import {
  addIcon,
  cancelIcon,
  copyIcon,
  deleteIcon,
  editIcon,
  instructionIcon,
  menuIcon,
  questionIcon,
  regenerateIcon,
  saveIcon,
} from "./svg";
import { abort, generateHtml } from "./api/ollama.api";
import { fetchAndExtractArticle, isValidUrl } from "./api/web";

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
  instruction: EditableString[];
  path: string;
};

type ModelResponse = {
  value: string;
  instruction: string;
  question: string;
};

enum ModelStatus {
  Idle,
  Generating,
  Waiting,
}

type Model = {
  conversations: Conversation[];
  route: Route;
  currentConversation: CurrentConversation | undefined;
  response: ModelResponse | undefined;
  status: ModelStatus;
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

  const storeConversation = async (dispatch: Dispatch<Model>, conversation: Conversation) => {
    await updateConversation(conversation);
  };

  const prepareQuestionPrompt = async (editableString: EditableString[]) => {
    const result = await Promise.all(
      editableString.map(async (x) => {
        if (isValidUrl(x.value)) {
          const article = await fetchAndExtractArticle(x.value);
          if (!article) return "Article is not available.";
          return `Title: ${article.title}\nContent: ${article.content}`;
        }
        if (await isFile(x.value)) {
          const fileContent = await readFileContent(x.value);
          return fileContent;
        }
        return x.value;
      })
    );
    return result.join(" ");
  };

  const fetchModelResponse = async (dispatch: Dispatch<Model>, conversation: CurrentConversation) => {
    const question = await prepareQuestionPrompt(conversation.question);
    const instruction = await prepareQuestionPrompt(conversation.instruction);
    requestAnimationFrame(() => dispatch(SetResponseInstructionAndQuestion, { question, instruction }));
    for await (const chunk of generateHtml(question, instruction)) {
      requestAnimationFrame(() => dispatch(SetResponseValue, chunk));
    }
  };
  const abortResponse = () => {
    abort();
  };
  const CopyInstructionToClipboard = async (_dispatch: Dispatch<Model>, conversation?: CurrentConversation) => {
    if (!conversation) {
      return;
    }
    const instruction = conversation.instruction.map((x) => x.value).join("\n");
    await clipboard.writeText(instruction);
  };
  const CopyQuestionToClipboard = async (_dispatch: Dispatch<Model>, conversation?: CurrentConversation) => {
    if (!conversation) {
      return;
    }
    const instruction = conversation.question.map((x) => x.value).join("\n");
    await clipboard.writeText(instruction);
  };
  const CopyResponseToClipboard = async (_dispatch: Dispatch<Model>, response: ModelResponse) => {
    await clipboard.writeText(response?.value ?? "No response from model");
  };
  const CopyUsedInstructionToClipboard = async (_dispatch: Dispatch<Model>, response: ModelResponse) => {
    await clipboard.writeText(response?.instruction ?? "No response from model");
  };
  const CopyUsedQuestionToClipboard = async (_dispatch: Dispatch<Model>, response: ModelResponse) => {
    await clipboard.writeText(response?.question ?? "No response from model");
  };

  const GetConversations: (state: Model, conversations: Conversation[]) => Model = (state, conversations) => ({
    ...state,
    conversations,
  });
  const SelectPrompt: Action<Model, Conversation> = (state: Model, conversation: Conversation) => {
    const currentConversation = {
      name: conversation.name,
      question: conversation.question.map((q, index) => {
        const isEdit = isEditValue(q);
        const v = isEdit ? q.substring(2, q.length - 2) : q;
        return {
          index: conversation.instruction.length + index,
          value: v,
          isEdit: isEdit,
        };
      }),
      description: conversation.description,
      instruction: conversation.instruction.map((q, index) => {
        const isEdit = isEditValue(q);
        const v = isEdit ? q.substring(2, q.length - 2) : q;
        return {
          index,
          value: v,
          isEdit: isEdit,
        };
      }),
      path: conversation.path,
    };
    const isDone = !isEditState(currentConversation);
    return [
      {
        ...state,
        currentConversation,
        status: isDone ? ModelStatus.Generating : ModelStatus.Waiting,
      },
      isDone && [fetchModelResponse, currentConversation],
    ];
  };
  const SaveAndGoMenu: Action<Model, MouseEvent> = (state: Model) => {
    if (!state.currentConversation) {
      return state;
    }
    const isDoneEditing = !isEditState(state.currentConversation);
    if (isDoneEditing) {
      const conversationToSaveIndex = state.conversations.findIndex((x) => x.name === state.currentConversation!.name);
      const conversationToSave = state.conversations[conversationToSaveIndex];
      const updatedConversation = {
        ...conversationToSave,
        question: state.currentConversation.question.map((x) => x.value),
        instruction: state.currentConversation.instruction.map((x) => x.value),
      };
      const copiedConversations = [...state.conversations];
      copiedConversations[conversationToSaveIndex] = updatedConversation;
      return [
        {
          ...state,
          conversations: copiedConversations,
          currentConversation: undefined,
          response: undefined,
          status: ModelStatus.Idle,
        },
        abortResponse,
        [storeConversation, updatedConversation],
      ];
    }
    return [
      {
        ...state,
        currentConversation: undefined,
        response: undefined,
        status: ModelStatus.Idle,
      },
      abortResponse,
    ];
  };
  const GoMenu: Action<Model, MouseEvent> = (state: Model) => [
    { ...state, currentConversation: undefined },
    abortResponse,
  ];
  const SetResponseInstructionAndQuestion = (state: Model, data: { instruction: string; question: string }) => {
    return {
      ...state,
      response: {
        instruction: data.instruction,
        question: data.question,
        value: "",
      },
    };
  };
  const SetResponseValue = (state: Model, value: string) => {
    if (!state.response) {
      return state;
    }
    const updatedResponse = {
      ...state.response,
      value,
    };
    return {
      ...state,
      response: updatedResponse,
    };
  };
  const AbortResponse: Action<Model, MouseEvent> = (state: Model) => [state, abortResponse];
  const RegenerateResponse: Action<Model, MouseEvent> = (state) => [
    {
      ...state,
      status: ModelStatus.Generating,
    },
    abortResponse,
    [fetchModelResponse, state.currentConversation],
  ];
  const ToggleEditQuestion = (state: Model, index: number) => {
    if (!state.currentConversation) {
      return { ...state };
    }
    const questionToUpdateIndex = state.currentConversation.question.findIndex((x) => x.index === index);
    const questionToToggle = state.currentConversation.question[questionToUpdateIndex];
    const updated = {
      ...questionToToggle,
      isEdit: !questionToToggle?.isEdit,
    };
    const copied = [...state.currentConversation.question];
    copied[questionToUpdateIndex] = updated;
    const updatedCurrentConversation = {
      ...state.currentConversation,
      question: copied,
    };
    const isDone = !isEditState(updatedCurrentConversation);
    if (isDone) {
      return [
        {
          ...state,
          currentConversation: updatedCurrentConversation,
          response: undefined,
          status: ModelStatus.Generating,
        },
        abortResponse,
        [fetchModelResponse, updatedCurrentConversation],
      ];
    }
    return {
      ...state,
      currentConversation: updatedCurrentConversation,
    };
  };
  const ToggleEditInstruction = (state: Model, index: number) => {
    if (!state.currentConversation) {
      return { ...state };
    }
    const toUpdateIndex = state.currentConversation.instruction.findIndex((x) => x.index === index);
    const toToggle = state.currentConversation.instruction[toUpdateIndex];
    const updated = { ...toToggle, isEdit: !toToggle?.isEdit };
    const copied = [...state.currentConversation.instruction];
    copied[toUpdateIndex] = updated;
    const updatedCurrentConversation = {
      ...state.currentConversation,
      instruction: copied,
    };
    const isDone = !isEditState(updatedCurrentConversation);
    if (isDone) {
      return [
        {
          ...state,
          currentConversation: updatedCurrentConversation,
          response: undefined,
          status: ModelStatus.Generating,
        },
        abortResponse,
        [fetchModelResponse, updatedCurrentConversation],
      ];
    }
    return {
      ...state,
      currentConversation: updatedCurrentConversation,
    };
  };
  const AddNewQuestion = (state: Model, index: number) => {
    if (!state.currentConversation) {
      return { ...state };
    }
    const copied = [...state.currentConversation.question];
    const indexes = [...copied.map((x) => x.index), ...state.currentConversation.instruction.map((x) => x.index)];
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
    const copied = [...state.currentConversation.instruction];
    const indexes = [...copied.map((x) => x.index), ...state.currentConversation.question.map((x) => x.index)];
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
        instruction: copied,
      },
    };
  };
  const DeleteInstruction = (state: Model, index: number) => {
    if (!state.currentConversation) {
      return { ...state };
    }
    const copied = [...state.currentConversation.instruction];
    const deleteIndex = copied.findIndex((x) => x.index === index);
    copied.splice(deleteIndex, 1);
    return {
      ...state,
      currentConversation: {
        ...state.currentConversation,
        instruction: copied,
      },
    };
  };
  const SetQuestion = (state: Model, { value, index }: { value: string; index: number }) => {
    if (!state.currentConversation) {
      return { ...state };
    }
    const questionToUpdateIndex = state.currentConversation.question.findIndex((x) => x.index === index);
    const updated = {
      ...state.currentConversation.question[questionToUpdateIndex],
      value: value,
    };
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
  const SetInstruction = (state: Model, { value, index }: { value: string; index: number }) => {
    if (!state.currentConversation) {
      return { ...state };
    }
    const toUpdateIndex = state.currentConversation.instruction.findIndex((x) => x.index === index);
    const updated = {
      ...state.currentConversation.instruction[toUpdateIndex],
      value: value,
    };
    const copied = [...state.currentConversation.instruction];
    copied[toUpdateIndex] = updated;
    return {
      ...state,
      currentConversation: {
        ...state.currentConversation,
        instruction: copied,
      },
    };
  };
  const CopyInstruction = (state: Model) => [state, [CopyInstructionToClipboard, state.currentConversation]];
  const CopyQuestions = (state: Model) => [state, [CopyQuestionToClipboard, state.currentConversation]];
  const CopyResponse = (state: Model) => [state, [CopyResponseToClipboard, state.response]];
  const CopyUsedInstruction = (state: Model) => [state, [CopyUsedInstructionToClipboard, state.response]];
  const CopyUsedQuestion = (state: Model) => [state, [CopyUsedQuestionToClipboard, state.response]];

  const editTextView = (
    isEdit: boolean,
    value: string,
    index: number,
    ToggleAction: (state: Model, index: number) => any,
    SetValue: (state: Model, { value, index }: { value: string; index: number }) => Model,
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

  const responseView = (modelResponse: ModelResponse) => {
    const htmlValue = marked.parse(modelResponse.value);
    return [
      h("div", { class: ["row", "edit"] }, [
        h("div", {
          class: "content",
          innerHTML: htmlValue,
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

  const delimiter = (title: string, buttons) => {
    return h(
      "div",
      { class: "row" },
      h("div", { class: ["column", "delimiter"] }, [h("div", {}, text(title)), ...copyButtons(buttons)])
    ) as ElementVNode<Model>;
  };

  const copyButtons = (copyButtons: { icon: string; action: Action<Model, MouseEvent> }[]) => {
    return copyButtons.map((x) => h("button", { innerHTML: x.icon, onclick: x.action })) as ElementVNode<Model>[];
  };

  app<Model>({
    init: [
      {
        conversations: [],
        route: Route.Menu,
        currentConversation: undefined,
        response: undefined,
        status: ModelStatus.Idle,
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
        const instructionView = currentConversation.instruction.flatMap((instruction) =>
          editTextView(
            instruction.isEdit,
            instruction.value,
            instruction.index,
            ToggleEditInstruction,
            SetInstruction,
            AddNewInstruction,
            DeleteInstruction,
            currentConversation.instruction.length > 1
          )
        );
        const responseViewValue = response ? responseView(response) : [];
        return h("div", { style: { width: "100%" } }, [
          h("button", { class: "menu", innerHTML: menuIcon, onclick: GoMenu }),
          h("button", { class: "save", innerHTML: saveIcon, onclick: SaveAndGoMenu }),
          h("div", { class: "container" }, [
            delimiter("Instruction", [
              { icon: instructionIcon, action: CopyUsedInstruction },
              { icon: copyIcon, action: CopyInstruction },
            ]),
            ...instructionView,
            delimiter("Question", [
              { icon: questionIcon, action: CopyUsedQuestion },
              { icon: copyIcon, action: CopyQuestions },
            ]),
            ...questionView,
            response && delimiter("LLM answer", [{ icon: copyIcon, action: CopyResponse }]),
            ...responseViewValue,
          ]),
        ]);
      }
      return h("div", { class: "container" }, [
        h("table", { class: ["u-full-width", "prompts"] }, [
          h("thead", {}, [h("tr", {}, [h("th", {}, text("Name")), h("th", {}, text("Description"))])]),
          h(
            "tbody",
            {},
            conversations.map((conversation) => {
              return h("tr", { onclick: [SelectPrompt, conversation] }, [
                h("td", {}, text(conversation.name)),
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

function isEditState(currentConversation: CurrentConversation) {
  return currentConversation.instruction.some((x) => x.isEdit) || currentConversation.question.some((x) => x.isEdit);
}

function isEditValue(value: string) {
  return value.startsWith("{{") && value.endsWith("}}");
}

function toHtml(value: string) {
  return value.replace(/\n+/g, "<br />");
}
