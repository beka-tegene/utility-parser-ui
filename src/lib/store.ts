import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import type {
  Collection,
  Template,
  ParsedCurl,
  MappingConnection,
  StateSnapshot,
  HistoryState,
  StepCurlData,
  AccumulatedContext,
  MultiStepData,
} from "@/types";

// Generate unique ID
const generateId = () =>
  `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

interface AppState {
  // Current collection being edited
  collection: Collection | null;
  setCollection: (collection: Collection | null) => void;

  // Current template step being edited
  currentTemplateIndex: number;
  setCurrentTemplateIndex: (index: number) => void;

  // Parsed cURL data for current template
  parsedCurl: ParsedCurl | null;
  setParsedCurl: (data: ParsedCurl | null) => void;

  // Visual mappings
  requestMappings: MappingConnection[];
  setRequestMappings: (mappings: MappingConnection[]) => void;
  addRequestMapping: (mapping: MappingConnection) => void;
  removeRequestMapping: (id: string) => void;

  responseMappings: MappingConnection[];
  setResponseMappings: (mappings: MappingConnection[]) => void;
  addResponseMapping: (mapping: MappingConnection) => void;
  removeResponseMapping: (id: string) => void;

  // Test workflow state
  testToken: string | null;
  setTestToken: (token: string | null) => void;
  testResponses: Array<{ step: number; data: unknown; timestamp: string }>;
  addTestResponse: (response: {
    step: number;
    data: unknown;
    timestamp: string;
  }) => void;
  clearTestResponses: () => void;

  // API base URL
  apiBaseUrl: string;
  setApiBaseUrl: (url: string) => void;

  // UI state
  activeTab: "mapper" | "test" | "collections";
  setActiveTab: (tab: "mapper" | "test" | "collections") => void;

  // Collections list
  collections: any[];
  setCollections: (collections: any[]) => void;
  addCollection: (collection: Collection) => void;
  updateCollection: (id: string, collection: Collection) => void;
  removeCollection: (id: string) => void;

  // ============ History State (Undo/Redo) ============
  history: HistoryState;
  saveSnapshot: (label: string) => void;
  undo: () => void;
  redo: () => void;
  canUndo: () => boolean;
  canRedo: () => boolean;
  clearHistory: () => void;

  // ============ Multi-Step Workflow State ============
  multiStepData: MultiStepData;
  setMultiStepData: (
    templateCode: string,
    data: {
      steps: StepCurlData[];
      activeStepIndex: number;
      accumulatedContext: AccumulatedContext;
    },
  ) => void;
  updateStepCurlData: (
    templateCode: string,
    stepIndex: number,
    data: Partial<StepCurlData>,
  ) => void;
  setActiveStepIndex: (templateCode: string, index: number) => void;
  updateAccumulatedContext: (
    templateCode: string,
    stepName: string,
    fields: Record<string, unknown>,
  ) => void;
  getMultiStepData: (templateCode: string) => {
    steps: StepCurlData[];
    activeStepIndex: number;
    accumulatedContext: AccumulatedContext;
  } | null;
  initializeMultiStepData: (templateCode: string, stepCount: number) => void;
  clearAllStorage: () => void;
}

export const useAppStore = create<AppState>()(
  persist(
    (set, get) => ({
      collection: null,
      setCollection: (collection) => set({ collection }),

      currentTemplateIndex: 0,
      setCurrentTemplateIndex: (index) => set({ currentTemplateIndex: index }),

      parsedCurl: null,
      setParsedCurl: (data) => set({ parsedCurl: data }),

      requestMappings: [],
      setRequestMappings: (mappings) => set({ requestMappings: mappings }),
      addRequestMapping: (mapping) =>
        set((state) => ({
          requestMappings: [...state.requestMappings, mapping],
        })),
      removeRequestMapping: (id) =>
        set((state) => ({
          requestMappings: state.requestMappings.filter((m) => m.id !== id),
        })),

      responseMappings: [],
      setResponseMappings: (mappings) => set({ responseMappings: mappings }),
      addResponseMapping: (mapping) =>
        set((state) => ({
          responseMappings: [...state.responseMappings, mapping],
        })),
      removeResponseMapping: (id) =>
        set((state) => ({
          responseMappings: state.responseMappings.filter((m) => m.id !== id),
        })),

      testToken: null,
      setTestToken: (token) => set({ testToken: token }),
      testResponses: [],
      addTestResponse: (response) =>
        set((state) => ({ testResponses: [...state.testResponses, response] })),
      clearTestResponses: () => set({ testResponses: [], testToken: null }),

      apiBaseUrl: "https://qaapisuperapp.cbe.com.et/api/v1",
      setApiBaseUrl: (url) => set({ apiBaseUrl: url }),

      activeTab: "mapper",
      setActiveTab: (tab) => set({ activeTab: tab }),

      collections: [],
      setCollections: (collections) => set({ collections }),
      addCollection: (collection) =>
        set((state) => ({ collections: [...state.collections, collection] })),
      updateCollection: (id, collection) =>
        set((state) => ({
          collections: state.collections.map((c) =>
            c.id === id ? collection : c,
          ),
        })),
      removeCollection: (id) =>
        set((state) => ({
          collections: state.collections.filter((c) => c.id !== id),
        })),

      // ============ History State Implementation ============
      history: {
        snapshots: [],
        currentIndex: -1,
        maxSnapshots: 50,
      },

      saveSnapshot: (label: string) => {
        const state = get();
        const snapshot: StateSnapshot = {
          id: generateId(),
          timestamp: new Date().toISOString(),
          label,
          state: {
            collection: state.collection
              ? JSON.parse(JSON.stringify(state.collection))
              : null,
            currentTemplateIndex: state.currentTemplateIndex,
            requestMappings: JSON.parse(JSON.stringify(state.requestMappings)),
            responseMappings: JSON.parse(
              JSON.stringify(state.responseMappings),
            ),
          },
        };

        set((state) => {
          // Remove any snapshots after current index (for new branch)
          const newSnapshots = state.history.snapshots.slice(
            0,
            state.history.currentIndex + 1,
          );
          newSnapshots.push(snapshot);

          // Keep only maxSnapshots
          if (newSnapshots.length > state.history.maxSnapshots) {
            newSnapshots.shift();
          }

          return {
            history: {
              ...state.history,
              snapshots: newSnapshots,
              currentIndex: newSnapshots.length - 1,
            },
          };
        });
      },

      undo: () => {
        const state = get();
        if (state.history.currentIndex <= 0) return;

        const prevIndex = state.history.currentIndex - 1;
        const snapshot = state.history.snapshots[prevIndex];

        if (snapshot) {
          set({
            collection: snapshot.state.collection,
            currentTemplateIndex: snapshot.state.currentTemplateIndex,
            requestMappings: snapshot.state.requestMappings,
            responseMappings: snapshot.state.responseMappings,
            history: {
              ...state.history,
              currentIndex: prevIndex,
            },
          });
        }
      },

      redo: () => {
        const state = get();
        if (state.history.currentIndex >= state.history.snapshots.length - 1)
          return;

        const nextIndex = state.history.currentIndex + 1;
        const snapshot = state.history.snapshots[nextIndex];

        if (snapshot) {
          set({
            collection: snapshot.state.collection,
            currentTemplateIndex: snapshot.state.currentTemplateIndex,
            requestMappings: snapshot.state.requestMappings,
            responseMappings: snapshot.state.responseMappings,
            history: {
              ...state.history,
              currentIndex: nextIndex,
            },
          });
        }
      },

      canUndo: () => {
        const state = get();
        return state.history.currentIndex > 0;
      },

      canRedo: () => {
        const state = get();
        return state.history.currentIndex < state.history.snapshots.length - 1;
      },

      clearHistory: () => {
        set({
          history: {
            snapshots: [],
            currentIndex: -1,
            maxSnapshots: 50,
          },
        });
      },

      // ============ Multi-Step Workflow Implementation ============
      multiStepData: {},

      setMultiStepData: (templateCode, data) => {
        set((state) => ({
          multiStepData: {
            ...state.multiStepData,
            [templateCode]: data,
          },
        }));
      },

      updateStepCurlData: (templateCode, stepIndex, data) => {
        set((state) => {
          const existing = state.multiStepData[templateCode];
          if (!existing) return state;

          const updatedSteps = [...existing.steps];
          if (updatedSteps[stepIndex]) {
            updatedSteps[stepIndex] = { ...updatedSteps[stepIndex], ...data };
          }

          return {
            multiStepData: {
              ...state.multiStepData,
              [templateCode]: {
                ...existing,
                steps: updatedSteps,
              },
            },
          };
        });
      },

      setActiveStepIndex: (templateCode, index) => {
        set((state) => {
          const existing = state.multiStepData[templateCode];
          if (!existing) return state;

          return {
            multiStepData: {
              ...state.multiStepData,
              [templateCode]: {
                ...existing,
                activeStepIndex: index,
              },
            },
          };
        });
      },

      updateAccumulatedContext: (templateCode, stepName, fields) => {
        set((state) => {
          const existing = state.multiStepData[templateCode];
          if (!existing) return state;

          return {
            multiStepData: {
              ...state.multiStepData,
              [templateCode]: {
                ...existing,
                accumulatedContext: {
                  ...existing.accumulatedContext,
                  [stepName]: {
                    fields,
                    timestamp: new Date().toISOString(),
                  },
                },
              },
            },
          };
        });
      },

      getMultiStepData: (templateCode) => {
        return get().multiStepData[templateCode] || null;
      },

      initializeMultiStepData: (templateCode, stepCount) => {
        const existing = get().multiStepData[templateCode];
        if (existing) return; // Already initialized

        const stepNames = ["TOKEN", "QUERY", "SETUP", "PAYMENT"];
        const steps: StepCurlData[] = Array.from(
          { length: stepCount },
          (_, i) => ({
            stepIndex: i,
            stepName: stepNames[i] || `STEP_${i + 1}`,
            curlInput: "",
            parsedRequest: null,
            responseInput: "",
            parsedResponse: null,
          }),
        );

        set((state) => ({
          multiStepData: {
            ...state.multiStepData,
            [templateCode]: {
              steps,
              activeStepIndex: 0,
              accumulatedContext: {},
            },
          },
        }));
      },

      clearAllStorage: () => {
        // Clear from localStorage
        localStorage.removeItem("utility-parser-storage");

        // Reset store to initial state
        set({
          collection: null,
          collections: [],
          apiBaseUrl: "https://qaapisuperapp.cbe.com.et/api/v1",
          multiStepData: {},
          requestMappings: [],
          responseMappings: [],
          parsedCurl: null,
          testToken: null,
          testResponses: [],
          activeTab: "mapper",
          currentTemplateIndex: 0,
          history: {
            snapshots: [],
            currentIndex: -1,
            maxSnapshots: 50,
          },
        });

        // Clear history
        get().clearHistory();
      },
    }),
    {
      name: "utility-parser-storage",
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        // Only persist these fields
        collection: state.collection,
        collections: state.collections,
        apiBaseUrl: state.apiBaseUrl,
        multiStepData: state.multiStepData,
        // Canvas mapping state - now persisted
        requestMappings: state.requestMappings,
        responseMappings: state.responseMappings,
      }),
    },
  ),
);

// Standard workflow steps following backend pattern
const WORKFLOW_STEPS = ["TOKEN", "QUERY", "SETUP", "PAYMENT"] as const;
const NEXT_STEPS: Record<string, string> = {
  TOKEN: "QUERY",
  QUERY: "SETUP",
  SETUP: "PAYMENT",
  PAYMENT: "DONE",
};

// Helper to create a TOKEN step template
export function createTokenTemplate(): Template {
  return {
    name: "TOKEN",
    current_step: "TOKEN",
    next_step: "QUERY",
    method: "POST",
    url: "",
    header_type: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    credentials: {
      grant_type: "client_credentials",
      client_id: "",
      client_secret: "",
      scope: "",
    },
    body: {},
    request_mapper: {
      grant_type: "credentials.grant_type",
      client_id: "credentials.client_id",
      client_secret: "credentials.client_secret",
      scope: "credentials.scope",
    },
    response_mapper: {
      access_token: "access_token",
      token_type: "token_type",
      expires_in: "expires_in",
    },
  };
}

// Helper to create a QUERY step template
export function createQueryTemplate(): Template {
  return {
    name: "QUERY",
    current_step: "QUERY",
    next_step: "SETUP",
    method: "POST",
    url: "",
    header_type: {
      "Content-Type": "application/json",
    },
    authorization_mapper: {
      type: "bearer",
      token: "accumulated.access_token",
    },
    body: {
      Destination_Api_Name: "",
      End_To_End_Txn_Id: "",
      Bill_Id: "",
    },
    request_mapper: {},
    response_mapper: {},
    to_be_overridden: {
      overridden_request_body: [],
    },
  };
}

// Helper to create a SETUP step template
export function createSetupTemplate(): Template {
  return {
    name: "SETUP",
    current_step: "SETUP",
    next_step: "PAYMENT",
    body: {
      type: "single",
      payables: [],
    },
  };
}

// Helper to create a PAYMENT step template
export function createPaymentTemplate(): Template {
  return {
    name: "PAYMENT",
    current_step: "PAYMENT",
    next_step: "DONE",
    method: "POST",
    url: "",
    header_type: {
      "Content-Type": "application/json",
    },
    authorization_mapper: {
      type: "bearer",
      token: "accumulated.access_token",
    },
    body: {
      Destination_Api_Name: "",
      End_To_End_Txn_Id: "",
      Cbe_Txn_Ref: "",
      Timestamp: "",
      Bill_Id: "",
      Amount: "",
      Currency: "ETB",
    },
    request_mapper: {},
    response_mapper: {},
    to_be_overridden: {
      overridden_request_body: [],
    },
    static_fields: {
      Currency: "ETB",
    },
  };
}

// Helper to create a new empty template based on step type
export function createEmptyTemplate(stepIndex: number): Template {
  switch (stepIndex) {
    case 0:
      return createTokenTemplate();
    case 1:
      return createQueryTemplate();
    case 2:
      return createSetupTemplate();
    case 3:
      return createPaymentTemplate();
    default:
      // For additional steps, create a generic template
      return {
        name: `Step ${stepIndex + 1}`,
        current_step: `STEP_${stepIndex + 1}`,
        next_step: stepIndex < 3 ? WORKFLOW_STEPS[stepIndex + 1] : "DONE",
        method: "POST",
        url: "",
        header_type: {
          "Content-Type": "application/json",
        },
        body: {},
        request_mapper: {},
        response_mapper: {},
      };
  }
}

// Helper to create a full 4-step workflow collection
export function createEmptyCollection(): Collection {
  return {
    template_code: "",
    name: "",
    description: "",
    templates: [
      createTokenTemplate(),
      createQueryTemplate(),
      createSetupTemplate(),
      createPaymentTemplate(),
    ],
    sequence: 4,
    logo: "",
    credit_account: "",
    ussd_enabled: false,
    static_fields: {
      currency: "ETB",
    },
  };
}

// Helper to check if a step is a SETUP step
export function isSetupStep(template: Template): boolean {
  return (
    template.current_step === "SETUP" ||
    (template.body &&
      typeof template.body === "object" &&
      "type" in template.body &&
      "payables" in template.body)
  );
}

// Helper to check if a step needs authorization
export function needsAuthorization(template: Template): boolean {
  return template.current_step !== "TOKEN" && template.current_step !== "SETUP";
}
