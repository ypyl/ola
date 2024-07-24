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
  loadingIcon,
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
  model: string;
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

  const preparePrompt = async (editableString: EditableString[]) => {
    const result = await Promise.all(
      editableString.map(async (x) => {
        if (isValidUrl(x.value)) {
          const article = await fetchAndExtractArticle(x.value);
          if (!article) return "Article is not available.";
          return `Title: ${article.title}\nContent: ${article.content}`;
        }
        if (await isFile(x.value)) {
          return await readFileContent(x.value);
        }
        return x.value;
      })
    );
    return result.join(" ");
  };

  const fetchModelResponse = async (dispatch: Dispatch<Model>, conversation: CurrentConversation) => {
    const question = await preparePrompt(conversation.question);
    const instruction = await preparePrompt(conversation.instruction);
    requestAnimationFrame(() => dispatch(SetResponseInstructionAndQuestion, { question, instruction }));
    for await (const chunk of generateHtml(conversation.model, question, instruction)) {
      requestAnimationFrame(() => dispatch(SetResponseValue, chunk));
    }
  };

  const abortResponse = () => {
    abort();
  };
  const CopyInstructionToClipboard = async (_dispatch: Dispatch<Model>, conversation?: CurrentConversation) =>
    CopyToClipboard(conversation?.instruction.map((x) => x.value).join("\n"));
  const CopyQuestionToClipboard = async (_dispatch: Dispatch<Model>, conversation?: CurrentConversation) =>
    CopyToClipboard(conversation?.question.map((x) => x.value).join("\n"));
  const CopyResponseToClipboard = (_dispatch: Dispatch<Model>, response: ModelResponse) =>
    CopyToClipboard(response?.value);
  const CopyUsedInstructionToClipboard = (_dispatch: Dispatch<Model>, response: ModelResponse) =>
    CopyToClipboard(response?.instruction);
  const CopyUsedQuestionToClipboard = (_dispatch: Dispatch<Model>, response: ModelResponse) =>
    CopyToClipboard(response?.question);

  const GetConversations: (state: Model, conversations: Conversation[]) => Model = (state, conversations) => ({
    ...state,
    conversations,
  });
  const SelectPrompt: Action<Model, Conversation> = (state: Model, conversation: Conversation) => {
    const currentConversation = {
      name: conversation.name,
      model: conversation.model,
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

  const toggleEdit = (state: Model, index: number, type: "question" | "instruction") => {
    if (!state.currentConversation) {
      return { ...state };
    }
    const items = state.currentConversation[type];
    const itemToUpdateIndex = items.findIndex((x) => x.index === index);
    const itemToToggle = items[itemToUpdateIndex];
    const updated = { ...itemToToggle, isEdit: !itemToToggle?.isEdit };
    const copied = [...items];
    copied[itemToUpdateIndex] = updated;
    const updatedCurrentConversation = {
      ...state.currentConversation,
      [type]: copied,
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
  const ToggleEditQuestion = (state: Model, index: number) => toggleEdit(state, index, "question");
  const ToggleEditInstruction = (state: Model, index: number) => toggleEdit(state, index, "instruction");

  const addNewItem = (state: Model, index: number, type: 'question' | 'instruction') => {
    if (!state.currentConversation) {
      return { ...state };
    }
    const copied = [...state.currentConversation[type]];
    const indexes = [...copied.map((x) => x.index), ...state.currentConversation[type === 'question' ? 'instruction' : 'question'].map((x) => x.index)];
    const newItem = {
      value: "",
      isEdit: true,
      index: Math.max(...indexes) + 1,
    };
    const inserAfter = copied.findIndex((x) => x.index === index);
    copied.splice(inserAfter + 1, 0, newItem);
    return {
      ...state,
      currentConversation: {
        ...state.currentConversation,
        [type]: copied,
      },
    };
  };
  const AddNewQuestion = (state: Model, index: number) => addNewItem(state, index, 'question');
  const AddNewInstruction = (state: Model, index: number) => addNewItem(state, index, 'instruction');

  const deleteItem = (state: Model, index: number, type: 'question' | 'instruction') => {
    if (!state.currentConversation) {
      return { ...state };
    }
    const copied = [...state.currentConversation[type]];
    const deleteIndex = copied.findIndex((x) => x.index === index);
    copied.splice(deleteIndex, 1);
    return {
      ...state,
      currentConversation: {
        ...state.currentConversation,
        [type]: copied,
      },
    };
  };
  const DeleteQuestion = (state: Model, index: number) => deleteItem(state, index, 'question');
  const DeleteInstruction = (state: Model, index: number) => deleteItem(state, index, 'instruction');

  const setValue = (
    state: Model,
    { value, index }: { value: string; index: number },
    type: "question" | "instruction"
  ) => {
    if (!state.currentConversation) {
      return { ...state };
    }
    const items = state.currentConversation[type];
    const itemToUpdateIndex = items.findIndex((x) => x.index === index);
    const updated = { ...items[itemToUpdateIndex], value: value };
    const copied = [...items];
    copied[itemToUpdateIndex] = updated;
    return {
      ...state,
      currentConversation: {
        ...state.currentConversation,
        [type]: copied,
      },
    };
  };
  const SetQuestion = (state: Model, { value, index }: { value: string; index: number }) =>
    setValue(state, { value, index }, "question");
  const SetInstruction = (state: Model, { value, index }: { value: string; index: number }) =>
    setValue(state, { value, index }, "instruction");
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
            title: isEdit ? "Save" : "Edit",
            onclick: [ToggleAction, index],
          }),
          showDelete
            ? h("button", {
                innerHTML: deleteIcon,
                title: "Delete",
                onclick: [DeleteAction, index],
              })
            : null,
          h("button", { innerHTML: addIcon, title: "Add", onclick: [AddAction, index] }),
        ]),
      ]),
    ] as ElementVNode<Model>[];
  };

  const responseView = (modelResponse: ModelResponse, status: ModelStatus) => {
    const htmlValue = marked.parse(modelResponse.value);
    const isWaitingModel = htmlValue === "" && status === ModelStatus.Generating;
    const titleValue = isWaitingModel ? "Waiting model response" : null;
    return [
      h("div", { class: ["row", "edit"] }, [
        h("div", {
          class: "content",
          title: titleValue,
          innerHTML: isWaitingModel ? loadingIcon : htmlValue,
        }),
        h("div", { class: "controls" }, [
          h("button", {
            innerHTML: regenerateIcon,
            title: "Regenerate Response",
            onclick: RegenerateResponse,
          }),
          h("button", { innerHTML: cancelIcon, title: "Abort Response", onclick: AbortResponse }),
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

  const copyButtons = (copyButtons: { icon: string; action: Action<Model, MouseEvent>; title: string }[]) => {
    return copyButtons.map((x) =>
      h("button", { innerHTML: x.icon, title: x.title, onclick: x.action })
    ) as ElementVNode<Model>[];
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
    view: ({ conversations, currentConversation, response, status }) => {
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
        const responseViewValue = response ? responseView(response, status) : [];
        return h("div", { style: { width: "100%" } }, [
          h("button", { class: "menu", innerHTML: menuIcon, title: "Select conversation view", onclick: GoMenu }),
          h("button", { class: "save", innerHTML: saveIcon, title: "Save conversation", onclick: SaveAndGoMenu }),
          h("div", { class: "container" }, [
            delimiter("Instruction", [
              { icon: instructionIcon, action: CopyUsedInstruction, title: "Copy Used Instruction" },
              { icon: copyIcon, action: CopyInstruction, title: "Copy Instruction" },
            ]),
            ...instructionView,
            delimiter("Question", [
              { icon: questionIcon, action: CopyUsedQuestion, title: "Copy Used Question" },
              { icon: copyIcon, action: CopyQuestions, title: "Copy Questions" },
            ]),
            ...questionView,
            response && delimiter(currentConversation.model, [{ icon: copyIcon, action: CopyResponse, title: "Copy Response" }]),
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

async function CopyToClipboard(value: string | undefined) {
  await clipboard.writeText(value ?? "No value");
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
