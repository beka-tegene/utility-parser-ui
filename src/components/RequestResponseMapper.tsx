"use client";

import { useState, useCallback, useEffect, useMemo, useRef } from "react";
import { parseCurl, extractPaths, detectDataType } from "@/lib/utils";
import { WorkflowMindMap } from "./WorkflowMindMap";
import { StepSelector } from "./StepSelector";
import { SetupStepEditor } from "./SetupStepEditor";
import { HistoryControls } from "./HistoryControls";
import { useAppStore } from "@/lib/store";
import type {
  StepCurlData,
  PayableItem,
  OverrideFieldConfig,
  ExtendedStepCurlData,
} from "@/types";
import type { Node, Edge } from "reactflow";
import {
  Terminal,
  Play,
  Send,
  Loader2,
  AlertCircle,
  CheckCircle2,
  ArrowRight,
  ArrowDown,
  Database,
  FileJson,
  Zap,
  GitBranch,
  Layers,
  Plus,
  Trash2,
  Save,
  Download,
  Upload,
  RefreshCw,
  Eye,
  EyeOff,
  ChevronRight,
  ChevronDown,
  Copy,
  Check,
  Settings,
  History,
  Map,
  Undo2,
  Redo2,
  X,
} from "lucide-react";
import { toast } from "sonner";
import ShowGroupModal from "./ShowGroupModal";

interface StepData {
  step: string;
  request: {
    method: string;
    url: string;
    headers: Record<string, string>;
    body: Record<string, unknown> | null;
  };
  response: Record<string, unknown> | null;
  timestamp: string;
}

interface FieldMapping {
  source: string;
  target: string;
  type: "context" | "response" | "passthrough";
}

interface WorkflowContext {
  accumulated: Record<string, unknown>;
  steps: StepData[];
}

const WORKFLOW_STEPS = [
  { name: "TOKEN", index: 0 },
  { name: "QUERY", index: 1 },
  { name: "SETUP", index: 2 },
  { name: "PAYMENT", index: 3 },
];

export function RequestResponseMapper() {
  const [stepJsonConfigs, setStepJsonConfigs] = useState<
    Record<number, string>
  >({});
  const [jsonSaved, setJsonSaved] = useState(false);
  const [activeStepIndex, setActiveStepIndex] = useState(0);
  const [templateCode, setTemplateCode] = useState("DEFAULT");

  const [manualRequests, setManualRequests] = useState<
    Record<
      number,
      Array<{
        method: string;
        url: string;
        headers: Record<string, string>;
        body: Record<string, unknown> | null;
      }>
    >
  >({});

  const [manualResponses, setManualResponses] = useState<
    Record<number, Array<Record<string, unknown>>>
  >({});

  const [stepCurlInputs, setStepCurlInputs] = useState<Record<number, string>>(
    {},
  );
  const [stepResponseInputs, setStepResponseInputs] = useState<
    Record<number, string>
  >({});
  const [stepParsedRequests, setStepParsedRequests] = useState<
    Record<
      number,
      {
        method: string;
        url: string;
        headers: Record<string, string>;
        body: Record<string, unknown> | null;
      } | null
    >
  >({});
  const [stepResponses, setStepResponses] = useState<
    Record<number, Record<string, unknown> | null>
  >({});

  const [stepNodes, setStepNodes] = useState<Record<number, Node[]>>({});
  const [stepEdges, setStepEdges] = useState<Record<number, Edge[]>>({});

  const nodes = stepNodes[activeStepIndex] || [];
  const edges = stepEdges[activeStepIndex] || [];

  const setNodes = useCallback(
    (nodesOrUpdater: Node[] | ((prev: Node[]) => Node[])) => {
      setStepNodes((prev) => {
        const currentNodes = prev[activeStepIndex] || [];
        const newNodes =
          typeof nodesOrUpdater === "function"
            ? nodesOrUpdater(currentNodes)
            : nodesOrUpdater;
        return { ...prev, [activeStepIndex]: newNodes };
      });
    },
    [activeStepIndex],
  );

  const setEdges = useCallback(
    (edgesOrUpdater: Edge[] | ((prev: Edge[]) => Edge[])) => {
      setStepEdges((prev) => {
        const currentEdges = prev[activeStepIndex] || [];
        const newEdges =
          typeof edgesOrUpdater === "function"
            ? edgesOrUpdater(currentEdges)
            : edgesOrUpdater;
        return { ...prev, [activeStepIndex]: newEdges };
      });
    },
    [activeStepIndex],
  );

  const onNodesChange = useCallback((changes: any) => {
    console.log("Nodes changed", changes);
  }, []);

  const onEdgesChange = useCallback((changes: any) => {
    console.log("Edges changed", changes);
  }, []);

  const curlInput = stepCurlInputs[activeStepIndex] || "";
  const setCurlInput = useCallback(
    (value: string) => {
      setStepCurlInputs((prev) => ({ ...prev, [activeStepIndex]: value }));
    },
    [activeStepIndex],
  );

  const responseInput = stepResponseInputs[activeStepIndex] || "";
  const setResponseInput = useCallback(
    (value: string) => {
      setStepResponseInputs((prev) => ({ ...prev, [activeStepIndex]: value }));
    },
    [activeStepIndex],
  );

  const parsedRequest = useMemo(() => {
    const original = stepParsedRequests[activeStepIndex];
    const manuals = manualRequests[activeStepIndex] || [];

    if (!original && manuals.length === 0) return null;

    const combined: {
      method: string;
      url: string;
      headers: Record<string, string>;
      body: Record<string, unknown> | null;
    } = original
      ? { ...original }
      : { method: "POST", url: "", headers: {}, body: {} };

    manuals.forEach((manual) => {
      if (manual.body)
        combined.body = { ...(combined.body || {}), ...manual.body };
      if (manual.headers)
        combined.headers = { ...combined.headers, ...manual.headers };
      if (manual.url) combined.url = manual.url;
      if (manual.method) combined.method = manual.method;
    });

    return combined;
  }, [activeStepIndex, stepParsedRequests, manualRequests]);

  const setParsedRequest = useCallback(
    (
      value: {
        method: string;
        url: string;
        headers: Record<string, string>;
        body: Record<string, unknown> | null;
      } | null,
    ) => {
      setStepParsedRequests((prev) => ({ ...prev, [activeStepIndex]: value }));
    },
    [activeStepIndex],
  );

  const response = useMemo(() => {
    const original = stepResponses[activeStepIndex];
    const manuals = manualResponses[activeStepIndex] || [];

    if (!original && manuals.length === 0) return null;

    const combined: Record<string, unknown> = original ? { ...original } : {};
    manuals.forEach((manual) => Object.assign(combined, manual));
    return combined;
  }, [activeStepIndex, stepResponses, manualResponses]);

  const setResponse = useCallback(
    (value: Record<string, unknown> | null) => {
      setStepResponses((prev) => ({ ...prev, [activeStepIndex]: value }));
    },
    [activeStepIndex],
  );

  const [isExecuting, setIsExecuting] = useState(false);
  const [error, setError] = useState("");
  const [activeView, setActiveView] = useState<"split" | "mindmap" | "json">(
    "mindmap",
  );
  const [workflowContext, setWorkflowContext] = useState<WorkflowContext>({
    accumulated: {},
    steps: [],
  });
  const [fieldMappings, setFieldMappings] = useState<FieldMapping[]>([]);
  const [contextFields, setContextFields] = useState<Set<string>>(new Set());
  const [responseFields, setResponseFields] = useState<Set<string>>(new Set());
  const [showHistory, setShowHistory] = useState(true);
  const [isCallbackModal, setIsCallbackModal] = useState(false);
  const [reversable_response_code, setReversableResponseCode] = useState<string[]>([]);
  const [copied, setCopied] = useState(false);
  const [currentStepName, setCurrentStepName] = useState("");
  const [nextStepName, setNextStepName] = useState("");
  const [showResponseInput, setShowResponseInput] = useState(false);
  const [collectionName, setCollectionName] = useState("");
  const [parserCode, setParserCode] = useState("");
  const [description, setDescription] = useState("");
  const [logoUrl, setLogoUrl] = useState("");
  const [service_key, setServiceKey] = useState<string | "">("");
  const [service_code, setServiceCode] = useState<string | "">("");

  const [stepHttpMethods, setStepHttpMethods] = useState<
    Record<number, string>
  >({});
  const httpMethod = stepHttpMethods[activeStepIndex] || "";
  const setHttpMethod = useCallback(
    (value: string) => {
      setStepHttpMethods((prev) => ({ ...prev, [activeStepIndex]: value }));
    },
    [activeStepIndex],
  );

  const [setupConfig, setSetupConfig] = useState<{
    type: "single" | "bulk";
    payables: PayableItem[];
  }>({ type: "single", payables: [] });

  const {
    apiBaseUrl,
    collection,
    multiStepData,
    initializeMultiStepData,
    updateStepCurlData,
    updateAccumulatedContext,
    saveSnapshot,
    clearAllStorage,
  } = useAppStore();

  const currentStep = WORKFLOW_STEPS[activeStepIndex];
  const isSetupStep = currentStep?.name === "SETUP";

  useEffect(() => {
    if (templateCode) {
      initializeMultiStepData(templateCode, 4);
    }
  }, [templateCode, initializeMultiStepData]);

  useEffect(() => {
    setCurrentStepName(currentStep?.name || "");
  }, [activeStepIndex, currentStep?.name]);

  useEffect(() => {
    if (activeStepIndex === 3) {
      setNextStepName("DONE");
    } else if (activeStepIndex === 1) {
      // setNextStepName("PAYMENT");
      setNextStepName(WORKFLOW_STEPS[activeStepIndex + 2].name);
    } else if (WORKFLOW_STEPS[activeStepIndex + 1]) {
      setNextStepName(WORKFLOW_STEPS[activeStepIndex + 1].name);
    } else {
      setNextStepName("DONE");
    }
  }, [activeStepIndex]);

  const handleNextStepChange = useCallback(
    (newNextStep: string) => {
      if (newNextStep === currentStepName) {
        toast.error("Next step cannot be the same as current step");
        return;
      }

      setNextStepName(newNextStep);

      if (templateCode) {
        updateStepCurlData(templateCode, activeStepIndex, {
          nextStep: newNextStep,
          contextFieldMappings: contextMappings,
          overrideFieldConfigs: overrideConfigs,
          nodes: stepNodes[activeStepIndex] || [],
          edges: stepEdges[activeStepIndex] || [],
        });
      }
    },
    [
      currentStepName,
      templateCode,
      activeStepIndex,
      stepNodes,
      stepEdges,
      updateStepCurlData,
    ],
  );

  useEffect(() => {
    const stepData = multiStepData[templateCode]?.steps?.[activeStepIndex];
    if (stepData) {
      if (stepData.nodes) {
        setStepNodes((prev) => ({
          ...prev,
          [activeStepIndex]: stepData.nodes || [],
        }));
      }
      if (stepData.edges) {
        setStepEdges((prev) => ({
          ...prev,
          [activeStepIndex]: stepData.edges || [],
        }));
      }
    }
  }, [activeStepIndex, templateCode, multiStepData]);

  const inheritedContext = useMemo(() => {
    const context: Record<string, unknown> = {};
    for (let i = 0; i < activeStepIndex; i++) {
      const stepResponse = stepResponses[i];
      if (stepResponse) {
        Object.entries(stepResponse).forEach(([key, value]) => {
          if (typeof value !== "object" || value === null) {
            context[key] = value;
          }
        });
      }
    }
    return context;
  }, [activeStepIndex, stepResponses]);

  const currentStepData = multiStepData[templateCode]?.steps?.[activeStepIndex];
  const initialContextMappings = currentStepData?.contextFieldMappings || {};
  const initialOverrideConfigs = currentStepData?.overrideFieldConfigs || {};

  const [stepOverrideConfigs, setStepOverrideConfigs] = useState<
    Record<number, Record<string, OverrideFieldConfig>>
  >({});
  const [stepSuccessMappers, setStepSuccessMappers] = useState<
    Record<number, any>
  >({});

  const overrideConfigs = stepOverrideConfigs[activeStepIndex] || {};
  const currentSuccessMapper = stepSuccessMappers[activeStepIndex] || [];

  const setOverrideConfigs = useCallback(
    (
      value:
        | Record<string, OverrideFieldConfig>
        | ((
            prev: Record<string, OverrideFieldConfig>,
          ) => Record<string, OverrideFieldConfig>),
    ) => {
      setStepOverrideConfigs((prev) => {
        const current = prev[activeStepIndex] || {};
        const newValue = typeof value === "function" ? value(current) : value;
        return { ...prev, [activeStepIndex]: newValue };
      });
    },
    [activeStepIndex],
  );

  const [stepContextMappings, setStepContextMappings] = useState<
    Record<number, Record<string, string>>
  >({});
  const contextMappings = stepContextMappings[activeStepIndex] || {};

  const setContextMappings = useCallback(
    (
      value:
        | Record<string, string>
        | ((prev: Record<string, string>) => Record<string, string>),
    ) => {
      setStepContextMappings((prev) => {
        const current = prev[activeStepIndex] || {};
        const newValue = typeof value === "function" ? value(current) : value;
        return { ...prev, [activeStepIndex]: newValue };
      });
    },
    [activeStepIndex],
  );

  const [templateAll, setTemplateAll] = useState<Record<string, any>>({});
  const isSwitchingStep = useRef(false);

  const generateConfig = useCallback(() => {
    const responseMapper: Record<string, string> = {};
    const requestMapper: Record<string, any> = {};
    const staticFields: Record<string, string> = {};
    const credentials: Record<string, string> = {};
    const overriddenRequestBody: Array<{
      field: string;
      value: string;
      actual_mapping: string;
      type: string;
      max_length?: number;
      min_length?: number;
      pattern?: string;
      required: boolean;
    }> = [];

    const currentStepData =
      multiStepData[templateCode]?.steps?.[activeStepIndex];
    const contextMappings = currentStepData?.contextFieldMappings || {};
    const overrideConfigs = currentStepData?.overrideFieldConfigs || {};
    const currentSuccessMapper = stepSuccessMappers[activeStepIndex] || [];

    const getActualValue = (path: string): unknown => {
      const currentResponse = stepResponses[activeStepIndex];
      if (currentResponse) {
        const pathParts = path.split(/[\[\].]/).filter((p) => p);
        let current: unknown = currentResponse;
        for (const part of pathParts) {
          if (
            current &&
            typeof current === "object" &&
            part in (current as Record<string, unknown>)
          ) {
            current = (current as Record<string, unknown>)[part];
          } else {
            current = null;
            break;
          }
        }
        if (current !== null && current !== undefined) return current;
      }
      if (workflowContext.accumulated[path])
        return workflowContext.accumulated[path];
      if (inheritedContext[path]) return inheritedContext[path];
      return null;
    };

    Object.entries(contextMappings).forEach(([path, displayName]) => {
      const formattedKey = path.replace(/\[/g, ".").replace(/\]/g, "");
      const actualValue = getActualValue(path);

      if (
        actualValue !== null &&
        actualValue !== undefined &&
        typeof actualValue !== "object"
      ) {
        if (
          typeof displayName === "string" &&
          (displayName.toLowerCase().includes("credit") ||
            displayName.toLowerCase().includes("Credit"))
        ) {
          responseMapper[displayName] = String(actualValue);
        } else {
          responseMapper[displayName] = path;
        }
      } else {
        if (
          displayName.toLowerCase().includes("credit") ||
          displayName.toLowerCase().includes("Credit")
        ) {
          responseMapper[displayName] = formattedKey;
        } else {
          responseMapper[displayName] = `{{${formattedKey}}}`;
        }
      }
    });

    const regularFields: Record<string, string> = {};
    const additionalFields: Array<{ Key: string; Value: string }> = [];

    Object.values(overrideConfigs).forEach((config) => {
      if (currentStepName !== "PAYMENT") {
        overriddenRequestBody.push({
          field: config.field,
          value: config.value,
          actual_mapping: config.actual_mapping,
          type: config.type,
          required: config.required,
          ...(config.max_length !== undefined && {
            max_length: config.max_length,
          }),
          ...(config.min_length !== undefined && {
            min_length: config.min_length,
          }),
          ...(config.pattern && { pattern: config.pattern }),
        });
      }

      const formattedPath = config.actual_mapping
        .replace(/\[/g, ".")
        .replace(/\]/g, "");
      const isArrayField =
        config.field.toLowerCase().includes("limit") ||
        config.field.toLowerCase().includes("additional") ||
        config.field.toLowerCase().includes("field");

      if (config.value && !config.value.startsWith("request.")) {
        if (isArrayField) {
          additionalFields.push({
            Key: config.field,
            Value: `{{${config.value}}}`,
          });
        } else {
          regularFields[config.field] = `{{${config.value}}}`;
        }
      } else {
        if (isArrayField) {
          additionalFields.push({
            Key: config.field,
            Value: `{{${formattedPath}}}`,
          });
        } else {
          regularFields[config.field] = `{{${formattedPath}}}`;
        }
      }
    });

    if (currentStepName === "PAYMENT") {
      regularFields["Debit_Account_Number"] = "{{Debit_Account_Number}}";
      const debitAccountExists = overriddenRequestBody.some(
        (item) => item.field === "Debit_Account_Number",
      );
      if (!debitAccountExists) {
        overriddenRequestBody.push({
          field: "Debit_Account_Number",
          value: "request.Debit_Account_Number",
          actual_mapping: "Debit_Account_Number",
          type: "string",
          required: true,
        });
      }
    }

    if (currentStepName === "TOKEN" && parsedRequest?.body) {
      Object.entries(parsedRequest.body).forEach(([key, value]) => {
        if (
          typeof value === "string" &&
          (key.includes("client_") ||
            key.includes("secret") ||
            key.includes("DEST_"))
        ) {
          credentials[key] = value;
        }
      });
    }

    const STEP_ORDER = ["TOKEN", "QUERY", "SETUP", "PAYMENT", "DONE"];
    const currentStepIdx = STEP_ORDER.indexOf(currentStepName);
    let finalNextStep = nextStepName;

    if (!finalNextStep || finalNextStep === "") {
      finalNextStep =
        currentStepIdx >= 0 && currentStepIdx < STEP_ORDER.length - 1
          ? STEP_ORDER[currentStepIdx + 1]
          : "DONE";
    }

    if (finalNextStep === currentStepName) {
      finalNextStep =
        currentStepIdx >= 0 && currentStepIdx < STEP_ORDER.length - 1
          ? STEP_ORDER[currentStepIdx + 1]
          : "DONE";
    }

    let template: Record<string, unknown>;

    if (currentStepIdx === 2) {
      template = {
        name: currentStepName || "STEP",
        parser_code: `${parserCode}_${currentStepName?.toLowerCase()}_v10`,
        current_step: currentStepName || "STEP",
        next_step: finalNextStep,
        description: `${currentStepName?.toLowerCase()} step`,
        body: setupConfig || {},
      };
    } else {
      template = {
        name: currentStepName || "STEP",
        parser_code: `${parserCode}_${currentStepName?.toLowerCase()}_v10`,
        current_step: currentStepName || "STEP",
        next_step: finalNextStep,
        description: `${currentStepName?.toLowerCase()} step`,
        url: parsedRequest?.url || "",
        method: parsedRequest?.method || "POST",
        header_type: parsedRequest?.headers || {},
        authorization_mapper: {},
        credentials: credentials,
        static_fields: staticFields,
        body: parsedRequest?.body || {},
      };
    }

    const finalRequestMapper: Record<string, any> = { ...regularFields };
    if (additionalFields.length > 0) {
      finalRequestMapper.Additional_Fields = additionalFields;
    }

    if (Object.keys(finalRequestMapper).length > 0) {
      template.request_mapper = finalRequestMapper;
    }

    if (Object.keys(responseMapper).length > 0) {
      template.response_mapper = responseMapper;
    }

    const authHeader =
      parsedRequest?.headers?.["Authorization"] ||
      parsedRequest?.headers?.["authorization"];
    if (authHeader?.toLowerCase().startsWith("bearer")) {
      template.authorization_mapper = {
        type: "Bearer",
        token: "{{accumulated.access_token}}",
      };
    }

    if (overriddenRequestBody.length > 0) {
      template.to_be_overridden = {
        overridden_request_body: overriddenRequestBody,
      };
    }

    if (currentSuccessMapper && currentSuccessMapper.length > 0) {
      template.success_mapper = currentSuccessMapper;
    }

    Object.keys(template).forEach((key) => {
      if (
        template[key] === undefined ||
        (typeof template[key] === "object" &&
          template[key] !== null &&
          Object.keys(template[key] as object).length === 0)
      ) {
        delete template[key];
      }
    });

    return template;
  }, [
    parsedRequest,
    currentStepName,
    multiStepData,
    templateCode,
    activeStepIndex,
    parserCode,
    stepResponses,
    workflowContext.accumulated,
    inheritedContext,
    nextStepName,
    setupConfig,
    stepSuccessMappers,
  ]);

  const currentConfig = useMemo(() => {
    if (stepJsonConfigs[activeStepIndex]) {
      try {
        return JSON.parse(stepJsonConfigs[activeStepIndex]);
      } catch {
        return generateConfig();
      }
    }
    return generateConfig();
  }, [activeStepIndex, stepJsonConfigs, generateConfig, setupConfig]);

  const saveCurrentStepConfig = useCallback(() => {
    if (!currentConfig) return;

    if (currentStepName !== "SETUP" && !currentConfig.url) return;

    if (currentStepName === "SETUP") {
      const hasPayables =
        currentConfig.body?.payables && currentConfig.body.payables.length > 0;
      if (!hasPayables) return;
    }

    setTemplateAll((prev) => {
      const existing = prev[currentStepName];
      if (
        existing &&
        JSON.stringify(existing) === JSON.stringify(currentConfig)
      ) {
        return prev;
      }
      return { ...prev, [currentStepName]: currentConfig };
    });
  }, [currentConfig, currentStepName]);

  const handleCanvasStateChange = useCallback(
    (state: {
      contextFieldMappings: Record<string, string>;
      overrideFieldConfigs: Record<string, OverrideFieldConfig>;
      successMapper: any;
    }) => {
      if (templateCode) {
        setContextMappings(state.contextFieldMappings);
        setOverrideConfigs(state.overrideFieldConfigs);
        if (state.successMapper) {
          setStepSuccessMappers((prev) => ({
            ...prev,
            [activeStepIndex]: state.successMapper,
          }));
        }

        updateStepCurlData(templateCode, activeStepIndex, {
          contextFieldMappings: state.contextFieldMappings,
          overrideFieldConfigs: state.overrideFieldConfigs,
          nodes: stepNodes[activeStepIndex] || [],
          edges: stepEdges[activeStepIndex] || [],
          nextStep: nextStepName,
          successMapper: state.successMapper,
        });

        if (!isSwitchingStep.current) {
          setTimeout(saveCurrentStepConfig, 100);
        }
      }
    },
    [
      templateCode,
      activeStepIndex,
      updateStepCurlData,
      stepNodes,
      stepEdges,
      setContextMappings,
      setOverrideConfigs,
      saveCurrentStepConfig,
      nextStepName,
    ],
  );
  const [serviceData, setServiceData] = useState<any>(null);
  const serviceCodeAndKey = async () => {
    try {
      const res = await fetch(`${apiBaseUrl}/cbesuperapp/utility/service-list`);
      if (!res.ok) {
        throw new Error(`HTTP ${res.status}: ${res.statusText}`);
      }

      const data = await res.json();
      setServiceData(data || []);
      console.log(res);
    } catch (error) {
      console.log(error);
    }
  };
  useEffect(() => {
    serviceCodeAndKey();
  }, []);
  console.log(serviceData);

  const handleStepChange = useCallback(
    (index: number) => {
      isSwitchingStep.current = true;
      saveCurrentStepConfig();
      setActiveStepIndex(index);
      setError("");
      setShowResponseInput(false);
      setTimeout(() => {
        isSwitchingStep.current = false;
      }, 100);
    },
    [saveCurrentStepConfig],
  );

  const handleParseCurl = useCallback(async () => {
    setError("");
    try {
      if (!curlInput.trim()) {
        setError("Please enter a cURL command");
        return;
      }

      const parsed = parseCurl(curlInput);
      if (!parsed.url) {
        setError("Could not extract URL from cURL command");
        return;
      }

      let bodyObj: Record<string, unknown> | null = null;

      if (parsed.body) {
        if (typeof parsed.body === "string") {
          try {
            bodyObj = JSON.parse(parsed.body);
          } catch {
            bodyObj = { _raw: parsed.body };
          }
        } else {
          bodyObj = parsed.body as Record<string, unknown>;
        }
      }

      const methodMatch =
        curlInput.match(/-X\s+(GET|POST|PUT|DELETE|PATCH)/i) ||
        curlInput.match(/--request\s+(GET|POST|PUT|DELETE|PATCH)/i);
      const detectedMethod = methodMatch
        ? methodMatch[1].toUpperCase()
        : curlInput.includes("-d") || curlInput.includes("--data")
          ? "POST"
          : "GET";
      const finalMethod = httpMethod || detectedMethod;

      const newRequestData = {
        method: finalMethod,
        url: parsed.url,
        headers: parsed.headers,
        body: bodyObj,
      };

      setStepParsedRequests((prev) => ({
        ...prev,
        [activeStepIndex]: prev[activeStepIndex]
          ? {
              ...prev[activeStepIndex],
              method: finalMethod,
              url: parsed.url,
              headers: { ...prev[activeStepIndex].headers, ...parsed.headers },
              body: {
                ...(prev[activeStepIndex].body || {}),
                ...(bodyObj || {}),
              },
            }
          : newRequestData,
      }));

      setIsExecuting(false);

      const newStep: StepData = {
        step: currentStepName || `Step ${workflowContext.steps.length + 1}`,
        request: {
          method: finalMethod,
          url: parsed.url,
          headers: parsed.headers,
          body: bodyObj,
        },
        response: {},
        timestamp: new Date().toISOString(),
      };

      setWorkflowContext((prev) => ({
        accumulated: prev.accumulated,
        steps: [...prev.steps, newStep],
      }));

      if (!isSwitchingStep.current) {
        setTimeout(saveCurrentStepConfig, 100);
      }
    } catch (e) {
      setError(
        `Failed to execute request: ${e instanceof Error ? e.message : "Unknown error"}`,
      );
      setIsExecuting(false);
    }
  }, [
    curlInput,
    httpMethod,
    currentStepName,
    workflowContext.accumulated,
    contextFields,
    activeStepIndex,
    saveCurrentStepConfig,
  ]);

  const handleExecute = async () => {
    if (!parsedRequest) return;

    setIsExecuting(true);
    setError("");
    const urlEncodedBody = parsedRequest.body
      ? new URLSearchParams(
          parsedRequest.body as Record<string, string>,
        ).toString()
      : undefined;
    try {
      const res = await fetch(parsedRequest.url, {
        method: parsedRequest.method,
        headers: parsedRequest.headers,
        body: urlEncodedBody,
      });

      const contentType = res.headers.get("content-type");
      let responseData: Record<string, unknown>;

      if (contentType?.includes("application/json")) {
        responseData = await res.json();
      } else {
        responseData = { _raw: await res.text() };
      }

      setStepResponses((prev) => ({
        ...prev,
        [activeStepIndex]: prev[activeStepIndex]
          ? { ...prev[activeStepIndex], ...responseData }
          : responseData,
      }));

      const newStep: StepData = {
        step: currentStepName || `Step ${workflowContext.steps.length + 1}`,
        request: parsedRequest,
        response: responseData,
        timestamp: new Date().toISOString(),
      };

      const newAccumulated = { ...workflowContext.accumulated };
      contextFields.forEach((fieldPath) => {
        const parts = fieldPath.replace("response.", "").split(".");
        let value: unknown = responseData;
        for (const part of parts) {
          if (value && typeof value === "object") {
            value = (value as Record<string, unknown>)[part];
          }
        }
        if (value !== undefined) {
          newAccumulated[parts.join(".")] = value;
        }
      });

      setWorkflowContext((prev) => ({
        accumulated: newAccumulated,
        steps: [...prev.steps, newStep],
      }));

      if (!isSwitchingStep.current) {
        setTimeout(saveCurrentStepConfig, 100);
      }
    } catch (e) {
      setError(
        `Request failed: ${e instanceof Error ? e.message : "Unknown error"}`,
      );
    } finally {
      setIsExecuting(false);
    }
  };

  const handleManualRequestAdd = useCallback(
    (requestData: {
      method: string;
      url: string;
      headers: Record<string, string>;
      body: Record<string, unknown> | null;
    }) => {
      const currentBody = parsedRequest?.body;
      const isDeleteOperation =
        currentBody &&
        requestData.body &&
        Object.keys(requestData.body).length < Object.keys(currentBody).length;

      if (isDeleteOperation) {
        setStepParsedRequests((prev) => ({
          ...prev,
          [activeStepIndex]: {
            method: requestData.method,
            url: requestData.url,
            headers: requestData.headers,
            body: requestData.body,
          },
        }));
        setManualRequests((prev) => ({ ...prev, [activeStepIndex]: [] }));
      } else {
        setManualRequests((prev) => ({
          ...prev,
          [activeStepIndex]: [...(prev[activeStepIndex] || []), requestData],
        }));
      }
    },
    [activeStepIndex, parsedRequest],
  );

  const handleManualResponseAdd = useCallback(
    (responseData: Record<string, unknown>) => {
      setManualResponses((prev) => ({
        ...prev,
        [activeStepIndex]: [...(prev[activeStepIndex] || []), responseData],
      }));
    },
    [activeStepIndex],
  );

  const handleRequestDelete = useCallback(
    (fieldPath: string) => {
      if (!parsedRequest?.body) return;

      const updatedBody = JSON.parse(JSON.stringify(parsedRequest.body));
      const deleteByPath = (obj: any, path: string) => {
        const parts = path.split(".");
        if (parts.length === 0) return obj;
        let current = obj;
        for (let i = 0; i < parts.length - 1; i++) {
          if (current[parts[i]] === undefined) return obj;
          current = current[parts[i]];
        }
        const lastKey = parts[parts.length - 1];
        if (current && typeof current === "object" && lastKey in current) {
          delete current[lastKey];
        }
        return obj;
      };

      deleteByPath(updatedBody, fieldPath);
      setStepParsedRequests((prev) => ({
        ...prev,
        [activeStepIndex]: {
          method: parsedRequest.method,
          url: parsedRequest.url,
          headers: parsedRequest.headers,
          body: updatedBody,
        },
      }));
      setManualRequests((prev) => ({ ...prev, [activeStepIndex]: [] }));
      toast.success(`Field "${fieldPath}" deleted from request body`);
    },
    [activeStepIndex, parsedRequest],
  );

  const handleResponseDelete = useCallback(
    (fieldPath: string) => {
      if (!response) return;

      const updatedBody = JSON.parse(JSON.stringify(response));
      const deleteByPath = (obj: any, path: string) => {
        const parts = path.split(".");
        if (parts.length === 0) return obj;
        let current = obj;
        for (let i = 0; i < parts.length - 1; i++) {
          if (current[parts[i]] === undefined) return obj;
          current = current[parts[i]];
        }
        const lastKey = parts[parts.length - 1];
        if (current && typeof current === "object" && lastKey in current) {
          delete current[lastKey];
        }
        return obj;
      };

      deleteByPath(updatedBody, fieldPath);
      setStepResponses((prev) => ({ ...prev, [activeStepIndex]: updatedBody }));
      setManualResponses((prev) => ({ ...prev, [activeStepIndex]: [] }));
      toast.success(`Field "${fieldPath}" deleted from response body`);
    },
    [activeStepIndex, response],
  );

  const handleSetManualResponse = () => {
    setError("");
    try {
      if (!responseInput.trim()) {
        setError("Please enter a response JSON");
        return;
      }

      const responseData = JSON.parse(responseInput);
      setStepResponses((prev) => ({
        ...prev,
        [activeStepIndex]: prev[activeStepIndex]
          ? { ...prev[activeStepIndex], ...responseData }
          : responseData,
      }));
      setShowResponseInput(false);

      if (parsedRequest) {
        const newStep: StepData = {
          step: currentStepName || `Step ${workflowContext.steps.length + 1}`,
          request: parsedRequest,
          response: responseData,
          timestamp: new Date().toISOString(),
        };

        const newAccumulated = { ...workflowContext.accumulated };
        Object.entries(responseData).forEach(([key, value]) => {
          if (typeof value !== "object" || value === null) {
            newAccumulated[key] = value;
          }
        });
        setWorkflowContext((prev) => ({
          accumulated: newAccumulated,
          steps: [...prev.steps, newStep],
        }));
      }
    } catch (e) {
      setError("Invalid JSON. Please check the format.");
    }
  };

  const handleResetWorkflow = () => {
    setWorkflowContext({ accumulated: {}, steps: [] });
    setContextFields(new Set());
    setResponseFields(new Set());
    setFieldMappings([]);
    setParsedRequest(null);
    setResponse(null);
    setCurlInput("");
    setResponseInput("");
    setCurrentStepName("");
    setNextStepName("");
    setShowResponseInput(false);
    setManualRequests({});
    setManualResponses({});
    setStepNodes({});
    setStepEdges({});
    setStepOverrideConfigs({});
    setStepContextMappings({});
  };

  const handleClear = () => {
    window.location.reload();
    clearAllStorage();
  };
  const [showPreviewModal, setShowPreviewModal] = useState(false);
  const [previewJson, setPreviewJson] = useState("");

  // const handleExportConfig = () => {
  //   const STEP_ORDER = ["TOKEN", "QUERY", "SETUP", "PAYMENT", "DONE"];
  //   const templateArray = STEP_ORDER.map(
  //     (stepName) => templateAll[stepName],
  //   ).filter((template) => template && template.url);

  //   const config = {
  //     name: collectionName,
  //     template_code: parserCode,
  //     description: description,
  //     logo: logoUrl,
  //     template: templateArray,
  //   };

  //   const blob = new Blob([JSON.stringify(config, null, 2)], {
  //     type: "application/json",
  //   });
  //   const url = URL.createObjectURL(blob);
  //   const a = document.createElement("a");
  //   a.href = url;
  //   a.download = "workflow-config.json";
  //   a.click();
  //   URL.revokeObjectURL(url);
  // };

  const handlePreviewConfig = () => {
    const STEP_ORDER = ["TOKEN", "QUERY", "SETUP", "PAYMENT", "DONE"];
    const templateArray = STEP_ORDER.map(
      (stepName) => templateAll[stepName],
    ).filter((template) => template && template.url);

    const config = {
      name: collectionName,
      template_code: parserCode,
      description: description,
      logo: logoUrl,
      service_key: service_key,
      service_code: service_code,
      template: templateArray,
    };

    setPreviewJson(JSON.stringify(config, null, 2));
    setShowPreviewModal(true);
  };
  const handleCopy = (data: unknown) => {
    navigator.clipboard.writeText(JSON.stringify(data, null, 2));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const renderJson = (data: unknown, indent = 0) => {
    if (data === null) return <span className="text-gray-500">null</span>;
    if (typeof data === "boolean")
      return <span className="text-purple-600">{data.toString()}</span>;
    if (typeof data === "number")
      return <span className="text-blue-600">{data}</span>;
    if (typeof data === "string")
      return <span className="text-green-600">&quot;{data}&quot;</span>;

    if (Array.isArray(data)) {
      if (data.length === 0) return <span className="text-gray-500">[]</span>;
      return (
        <span>
          [
          {data.map((item, i) => (
            <div key={i} style={{ marginLeft: "1.5rem" }}>
              {renderJson(item, indent + 1)}
              {i < data.length - 1 && ","}
            </div>
          ))}
          ]
        </span>
      );
    }

    if (typeof data === "object") {
      const entries = Object.entries(data as Record<string, unknown>);
      if (entries.length === 0)
        return <span className="text-gray-500">{"{}"}</span>;
      return (
        <span>
          {"{"}
          {entries.map(([key, value], i) => (
            <div key={key} style={{ marginLeft: "1.5rem" }}>
              <span className="text-red-600">&quot;{key}&quot;</span>
              <span className="text-gray-600">: </span>
              {renderJson(value, indent + 1)}
              {i < entries.length - 1 && ","}
            </div>
          ))}
          {"}"}
        </span>
      );
    }

    return <span>{String(data)}</span>;
  };

  useEffect(() => {
    if (currentConfig && !isSwitchingStep.current) {
      const timer = setTimeout(() => {
        if (currentStepName !== "SETUP" && currentConfig.url) {
          saveCurrentStepConfig();
        } else if (
          currentStepName === "SETUP" &&
          currentConfig.body?.payables?.length > 0
        ) {
          saveCurrentStepConfig();
        }
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [currentConfig, currentStepName, saveCurrentStepConfig]);

  const handleClick = async (event: any) => {
    event.preventDefault();
    try {
      await handleParseCurl();
    } catch (error) {
      console.error("Error:", error);
    }
  };

  useEffect(() => {
    const stepData = multiStepData[templateCode]?.steps?.[activeStepIndex] as
      | ExtendedStepCurlData
      | undefined;
    if (stepData) {
      if (stepData.contextFieldMappings)
        setContextMappings(stepData.contextFieldMappings);
      if (stepData.overrideFieldConfigs)
        setOverrideConfigs(stepData.overrideFieldConfigs);
      if (stepData.successMapper) {
        setStepSuccessMappers((prev) => ({
          ...prev,
          [activeStepIndex]: stepData.successMapper as any,
        }));
      } else {
        setStepSuccessMappers((prev) => {
          const newState = { ...prev };
          delete newState[activeStepIndex];
          return newState;
        });
      }

      if (stepData.nextStep) {
        if (activeStepIndex === 1) {
          // setNextStepName("PAYMENT");
          setNextStepName(WORKFLOW_STEPS[activeStepIndex + 2].name);
        } else {
          setNextStepName(stepData.nextStep);
        }
      }
      if (stepData.nodes)
        setStepNodes((prev) => ({
          ...prev,
          [activeStepIndex]: stepData.nodes || [],
        }));
      if (stepData.edges)
        setStepEdges((prev) => ({
          ...prev,
          [activeStepIndex]: stepData.edges || [],
        }));
    } else {
      setContextMappings({});
      setOverrideConfigs({});
      setStepSuccessMappers((prev) => ({ ...prev, [activeStepIndex]: [] }));
      if (activeStepIndex === 3) {
        setNextStepName("DONE");
      } else if (activeStepIndex === 1) {
        // setNextStepName("PAYMENT");
        setNextStepName(WORKFLOW_STEPS[activeStepIndex + 2].name);
      } else if (WORKFLOW_STEPS[activeStepIndex + 1]) {
        setNextStepName(WORKFLOW_STEPS[activeStepIndex + 1].name);
      }
    }
  }, [
    activeStepIndex,
    templateCode,
    multiStepData,
    setContextMappings,
    setOverrideConfigs,
  ]);

  const [showGroupModal, setShowGroupModal] = useState(false);
  const [groupName, setGroupName] = useState("");
  const [groupCode, setGroupCode] = useState("");
  const [collectionCodes, setCollectionCodes] = useState("");
  const [responseData, setResponseData] = useState<any>(null);
  const [isSubmittingGroup, setIsSubmittingGroup] = useState(false);

  const handleCallback = async () => {
    setIsCallbackModal(true);
  };

  const handleSubmitConfig = async () => {
    if (
      logoUrl &&
      collectionName &&
      parserCode &&
      service_key &&
      service_code
    ) {
      toast.error("require logo and collection name and parser code ");
      return;
    }

    const STEP_ORDER = ["TOKEN", "QUERY", "SETUP", "PAYMENT", "DONE"];
    const templateArray = STEP_ORDER.map(
      (stepName) => templateAll[stepName],
    ).filter((template) => template && template.url);

    const collectionConfig = {
      name: collectionName,
      template_code: parserCode,
      description: description,
      logo: logoUrl,
      service_key: service_key,
      service_code: service_code,
      reversable_response_code: reversable_response_code,
      template: templateArray,
    };

    try {
      const collectionResponse = await fetch(
        `${apiBaseUrl}/cbesuperapp/utility/collections`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Cookie:
              "c68abbf6e7b79451c37ff174bb734d90=3193314271c7f54c666bb299e3299b35",
          },
          body: JSON.stringify(collectionConfig),
        },
      );

      if (!collectionResponse.ok) {
        throw new Error(`HTTP error! status: ${collectionResponse.status}`);
      }

      const collectionResult = await collectionResponse.json();
      console.log("Collection created:", collectionResult);
      setResponseData(collectionResult);
      setShowGroupModal(true);
    } catch (error) {
      console.error("Error submitting config:", error);
      toast.error(
        `Failed to submit configuration: ${error instanceof Error ? error.message : "Unknown error"}`,
      );
    }
  };

  const SubmitUploadURL = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];

    if (!file) return;

    try {
      // setLogoFile(file.name);

      const formData = new FormData();
      formData.append("logo", file);

      const response = await fetch(
        `${apiBaseUrl}/cbesuperapp/utility/logos/upload`,
        {
          method: "POST",
          body: formData,
        },
      );

      if (!response.ok) {
        throw new Error("Upload failed");
      }

      const data = await response.json();

      // adjust based on backend response
      setLogoUrl(data.url);

      console.log("Uploaded:", data);
    } catch (error) {
      console.log(error);
    }
  };

  const handleSubmitGroup = async () => {
    if (!groupName.trim() || !groupCode.trim()) {
      toast.error("Please fill in all fields");
      return;
    }

    setIsSubmittingGroup(true);

    const groupData = {
      group_name: groupName,
      group_code: groupCode,
      collection_codes: [responseData.template_code],
    };

    try {
      const response = await fetch(
        `${apiBaseUrl}/cbesuperapp/utility/collections/group`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Cookie:
              "c68abbf6e7b79451c37ff174bb734d90=3193314271c7f54c666bb299e3299b35",
          },
          body: JSON.stringify(groupData),
        },
      );

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      console.log("Group created:", result);
      toast.success("Collection and Group created successfully!");
      setShowGroupModal(false);
      setGroupName("");
      setGroupCode("");
      setCollectionCodes("");
    } catch (error) {
      console.error("Error creating group:", error);
      toast.error(
        `Failed to create group: ${error instanceof Error ? error.message : "Unknown error"}`,
      );
    } finally {
      setIsSubmittingGroup(false);
    }
  };

  const handleManualSave = () => {
    saveCurrentStepConfig();
    toast.success(`${currentStepName} configuration saved!`);
  };

  return (
    <div className="h-full flex flex-col bg-gray-100">
      <div className="bg-white border-b px-6 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <Map className="w-4 h-4 text-purple-600" />
              <h2 className="text-sm font-semibold text-gray-800">
                Request/Response Mapper
              </h2>
            </div>
            <div className="h-6 w-px bg-gray-200" />
            <HistoryControls compact />
            <div className="h-6 w-px bg-gray-200" />
            <div className="flex items-center bg-gray-100 rounded-lg p-1">
              {[
                { id: "split", icon: Layers, label: "Split View" },
                { id: "mindmap", icon: GitBranch, label: "Mind Map" },
                { id: "json", icon: FileJson, label: "JSON View" },
              ].map((view) => (
                <button
                  key={view.id}
                  onClick={() => setActiveView(view.id as typeof activeView)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                    activeView === view.id
                      ? "bg-white text-purple-600 shadow-sm"
                      : "text-gray-600 hover:text-gray-800"
                  }`}
                >
                  <view.icon className="w-3.5 h-3.5" />
                  {view.label}
                </button>
              ))}
            </div>
          </div>
          <div className="flex items-center gap-2">
            {/* <button
              onClick={handleManualSave}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-green-100 text-green-600 rounded-md text-xs font-medium hover:bg-green-200 transition-colors"
            >
              <Save className="w-3.5 h-3.5" />
              Save Step
            </button> */}
            {/* <button
              onClick={handleExportConfig}
              disabled={workflowContext.steps.length === 0}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-100 text-gray-600 rounded-md text-xs font-medium hover:bg-gray-200 transition-colors disabled:opacity-50"
            >
              <Download className="w-3.5 h-3.5" />
              Export
            </button> */}
            <button
              onClick={handlePreviewConfig}
              disabled={workflowContext.steps.length === 0}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-100 text-gray-600 rounded-md text-xs font-medium hover:bg-gray-200 transition-colors disabled:opacity-50"
            >
              <Eye className="w-3.5 h-3.5" />
              Preview
            </button>
            <button
              onClick={handleCallback}
              disabled={workflowContext.steps.length === 0}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-100 text-gray-600 rounded-md text-xs font-medium hover:bg-gray-200 transition-colors disabled:opacity-50"
            >
              Submit
            </button>
            <button
              onClick={handleClear}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-red-50 text-red-600 rounded-md text-xs font-medium hover:bg-red-100 transition-colors"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              Reset
            </button>
          </div>
        </div>
        {isCallbackModal && (
          <div
            className="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
            onClick={() => setIsCallbackModal(false)}
          >
            <div
              className="bg-white rounded-2xl shadow-2xl w-full max-w-lg p-6"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-bold text-gray-800">
                  Create Reversal Code
                </h3>
                <button
                  onClick={() => setIsCallbackModal(false)}
                  className="p-1 hover:bg-gray-100 rounded-lg"
                >
                  <X className="w-5 h-5 text-gray-500" />
                </button>
              </div>
              <div className="space-y-4"></div>
              <div>
                <label className="-space-y-0.5">
                  <span className="text-sm">Reversal Code</span>
                  <input
                    type="text"
                    value={reversable_response_code.join(", ")}
                    onChange={(e) => {
                      const values = e.target.value
                        .split(",")
                        .map((item) => item.trim());
                      setReversableResponseCode(values);
                    }}
                    placeholder="reversal code"
                    className="w-full mt-2 px-3 py-2 text-sm border rounded-lg focus:outline-none focus:ring-1 focus:ring-purple-500"
                  />
                </label>
              </div>
              <div className="flex items-center justify-end gap-3 pt-6 border-t mt-4">
                <button
                  onClick={() => setIsCallbackModal(false)}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSubmitConfig}
                  className="px-4 py-2 text-sm font-medium text-white bg-gradient-to-r from-blue-600 to-purple-600 rounded-lg hover:from-blue-700 hover:to-purple-700 transition-colors disabled:opacity-50 flex items-center gap-2"
                >
                  Create
                </button>
              </div>
            </div>
          </div>
        )}
        <div className="grid grid-cols-6 gap-2 py-2">
          <label className="-space-y-0.5">
            <span className="text-sm">Collection Name</span>
            <input
              type="text"
              value={collectionName}
              onChange={(e) => setCollectionName(e.target.value)}
              placeholder="Collection Name"
              className="w-full mt-2 px-3 py-2 text-sm border rounded-lg focus:outline-none focus:ring-1 focus:ring-purple-500"
            />
          </label>
          <label className="-space-y-0.5">
            <span className="text-sm">Template Code (unique identifier)</span>
            <input
              type="text"
              value={parserCode}
              onChange={(e) => setParserCode(e.target.value)}
              placeholder="Template Code (unique identifier)"
              className="w-full mt-2 px-3 py-2 text-sm border rounded-lg focus:outline-none focus:ring-1 focus:ring-purple-500"
            />
          </label>
          <label className="-space-y-0.5">
            <span className="text-sm">Description</span>
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Description"
              className="w-full mt-2 px-3 py-2 text-sm border rounded-lg focus:outline-none focus:ring-1 focus:ring-purple-500"
            />
          </label>
          {/* <label className="-space-y-0.5">
            <span className="text-sm">Logo URL</span>
            <input
              type="text"
              value={logoUrl}
              onChange={(e) => setLogoUrl(e.target.value)}
              placeholder="https://example.com"
              className="w-full mt-2 px-3 py-2 text-sm border rounded-lg focus:outline-none focus:ring-1 focus:ring-purple-500"
            />
          </label> */}
          <label className="-space-y-0.5">
            <span className="text-sm">Logo File</span>

            <input
              type="file"
              accept="image/*"
              onChange={SubmitUploadURL}
              className="w-full mt-2 px-3 py-2 text-sm border rounded-lg focus:outline-none focus:ring-1 focus:ring-purple-500"
            />
          </label>
          <label className="-space-y-0.5">
            <span className="text-sm">Service Key</span>
            <select
              value={service_key}
              onChange={(e) => setServiceKey(e.target.value)}
              className="w-full mt-1 px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent bg-white"
            >
              <option value="" disabled selected>
                Select service key
              </option>
              {serviceData?.map(
                (item: { service_key: string }, index: number) => (
                  <option value={item.service_key} key={index}>
                    {item.service_key}
                  </option>
                ),
              )}
            </select>
          </label>
          <label className="-space-y-0.5">
            <span className="text-sm">Service Code</span>
            <select
              value={service_code}
              onChange={(e) => setServiceCode(e.target.value)}
              className="w-full mt-1 px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent bg-white"
            >
              <option value="" disabled selected>
                Select service code
              </option>
              {serviceData?.map(
                (item: { service_code: string }, index: number) => (
                  <option value={item.service_code} key={index}>
                    {item.service_code}
                  </option>
                ),
              )}
            </select>
          </label>
        </div>
      </div>

      <div className="bg-white border-b px-6 py-2">
        <StepSelector
          templateCode={templateCode}
          steps={WORKFLOW_STEPS}
          activeStepIndex={activeStepIndex}
          onStepChange={handleStepChange}
        />
      </div>

      <div className="flex-1 flex overflow-y-scroll">
        <div
          className={`${showHistory ? "w-80" : "w-0"} flex-shrink-0 bg-white border-r transition-all overflow-y-scroll`}
        >
          <div className="h-full flex flex-col">
            <div className="p-4 border-b">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Terminal className="w-4 h-4 text-gray-500" />
                  <span className="text-sm font-medium text-gray-700">
                    cURL Input
                  </span>
                </div>
                {(() => {
                  const methodMatch =
                    curlInput.match(/-X\s+(GET|POST|PUT|DELETE|PATCH)/i) ||
                    curlInput.match(/--request\s+(GET|POST|PUT|DELETE|PATCH)/i);
                  const detectedMethod = methodMatch
                    ? methodMatch[1].toUpperCase()
                    : curlInput.includes("-d") || curlInput.includes("--data")
                      ? "POST"
                      : "GET";
                  const currentMethod = httpMethod || detectedMethod;
                  const methodColors: Record<string, string> = {
                    GET: "bg-green-100 text-green-700 border-green-300",
                    POST: "bg-blue-100 text-blue-700 border-blue-300",
                    PUT: "bg-amber-100 text-amber-700 border-amber-300",
                    DELETE: "bg-red-100 text-red-700 border-red-300",
                    PATCH: "bg-violet-100 text-violet-700 border-violet-300",
                  };
                  return (
                    <select
                      value={currentMethod}
                      onChange={(e) => setHttpMethod(e.target.value)}
                      className={`px-2 py-0.5 text-xs font-bold rounded border cursor-pointer outline-none ${methodColors[currentMethod] || "bg-gray-100 text-gray-700 border-gray-300"}`}
                    >
                      <option value="GET">GET</option>
                      <option value="POST">POST</option>
                      <option value="PUT">PUT</option>
                      <option value="DELETE">DELETE</option>
                      <option value="PATCH">PATCH</option>
                    </select>
                  );
                })()}
              </div>
              <textarea
                value={curlInput}
                onChange={(e) => setCurlInput(e.target.value)}
                placeholder="Paste your cURL command here..."
                className="w-full h-32 p-3 font-mono text-xs bg-gray-900 text-green-400 rounded-lg border border-gray-700 focus:border-purple-500 focus:ring-1 focus:ring-purple-500 outline-none resize-none"
              />
              <input
                type="text"
                value={currentStepName}
                onChange={(e) => setCurrentStepName(e.target.value)}
                placeholder="Step name (e.g., TOKEN, QUERY)"
                className="w-full mt-2 px-3 py-2 text-sm border rounded-lg focus:outline-none focus:ring-1 focus:ring-purple-500"
              />
              <select
                value={nextStepName}
                onChange={(e) => handleNextStepChange(e.target.value)}
                className="w-full mt-1 px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent bg-white"
              >
                <option value="" disabled>
                  Select Next Step
                </option>
                <option value="QUERY">QUERY</option>
                <option value="SETUP">SETUP</option>
                <option value="PAYMENT">PAYMENT</option>
                <option value="DONE">DONE</option>
              </select>
              {error && (
                <div className="mt-2 p-2 flex items-center gap-2 text-xs text-red-600 bg-red-50 rounded-lg">
                  <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
                  <span className="truncate">{error}</span>
                </div>
              )}
              <div className="flex items-center gap-2 mt-3">
                <button
                  onClick={handleClick}
                  className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors"
                >
                  <Play className="w-4 h-4" />
                  Parse
                </button>
                <button
                  onClick={() => setShowResponseInput(!showResponseInput)}
                  disabled={!parsedRequest}
                  className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-purple-600 text-white rounded-lg text-sm font-medium hover:bg-purple-700 transition-colors disabled:opacity-50"
                >
                  <FileJson className="w-4 h-4" />
                  {showResponseInput ? "Hide" : "Paste"} Response
                </button>
              </div>
              {showResponseInput && (
                <div className="mt-3 p-3 bg-gray-50 rounded-lg border">
                  <div className="flex items-center gap-2 mb-2 text-xs font-medium text-gray-600">
                    <ArrowDown className="w-3.5 h-3.5" />
                    Paste Response JSON
                  </div>
                  <textarea
                    value={responseInput}
                    onChange={(e) => setResponseInput(e.target.value)}
                    placeholder='{"token_type": "Bearer", "access_token": "...", ...}'
                    className="w-full h-24 p-2 font-mono text-xs bg-gray-900 text-green-400 rounded-lg border border-gray-700 focus:border-purple-500 focus:ring-1 focus:ring-purple-500 outline-none resize-none"
                  />
                  <button
                    onClick={handleSetManualResponse}
                    className="w-full mt-2 flex items-center justify-center gap-2 px-3 py-2 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700 transition-colors"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    Set Response
                  </button>
                </div>
              )}
            </div>
            <div className="flex-1 overflow-y-auto">
              <div className="p-3 bg-gray-50 border-b sticky top-0">
                <div className="flex items-center gap-2 text-xs font-medium text-gray-600">
                  <History className="w-3.5 h-3.5" />
                  Workflow Steps
                </div>
              </div>
              {workflowContext.steps.length === 0 ? (
                <div className="p-4 text-center text-sm text-gray-400">
                  No steps executed yet
                </div>
              ) : (
                <div className="divide-y">
                  {workflowContext.steps.map((step, idx) => (
                    <div
                      key={idx}
                      className="p-3 hover:bg-gray-50 cursor-pointer"
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-sm font-medium text-gray-800">
                          {step.step}
                        </span>
                        <span
                          className={`px-1.5 py-0.5 text-xs rounded ${step.response && !(step.response as Record<string, unknown>).error ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"}`}
                        >
                          {step.response &&
                          !(step.response as Record<string, unknown>).error
                            ? "Success"
                            : "Error"}
                        </span>
                      </div>
                      <div className="text-xs text-gray-500 truncate">
                        {step.request.method} {step.request.url}
                      </div>
                      <div className="text-xs text-gray-400 mt-1">
                        {new Date(step.timestamp).toLocaleTimeString()}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
            {Object.keys(workflowContext.accumulated).length > 0 && (
              <div className="border-t">
                <div className="p-3 bg-violet-50 border-b">
                  <div className="flex items-center gap-2 text-xs font-medium text-violet-700">
                    <Database className="w-3.5 h-3.5" />
                    Context Storage (
                    {Object.keys(workflowContext.accumulated).length} fields)
                  </div>
                </div>
                <div className="p-3 max-h-40 overflow-y-auto">
                  <pre className="text-xs font-mono text-gray-700">
                    {JSON.stringify(workflowContext.accumulated, null, 2)}
                  </pre>
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="flex-1 overflow-y-scroll p-4">
          {isSetupStep && activeView === "split" && (
            <div className="h-full">
              <SetupStepEditor
                templateCode={templateCode}
                onConfigChange={setSetupConfig}
                className="h-full"
              />
            </div>
          )}

          {!isSetupStep && activeView === "split" && (
            <div className="h-full grid grid-cols-2 gap-4">
              <div className="bg-white rounded-xl border shadow-sm overflow-hidden flex flex-col">
                <div className="flex items-center justify-between px-4 py-3 bg-blue-50 border-b">
                  <div className="flex items-center gap-2">
                    <ArrowRight className="w-4 h-4 text-blue-600" />
                    <span className="text-sm font-semibold text-gray-800">
                      Request
                    </span>
                    <span className="px-2 py-0.5 text-xs font-medium bg-blue-100 text-blue-700 rounded">
                      {currentStep?.name}
                    </span>
                  </div>
                  {parsedRequest && (
                    <span
                      className={`px-2 py-0.5 text-xs font-semibold rounded ${parsedRequest.method === "GET" ? "bg-green-100 text-green-700" : parsedRequest.method === "POST" ? "bg-blue-100 text-blue-700" : "bg-gray-100 text-gray-700"}`}
                    >
                      {parsedRequest.method}
                    </span>
                  )}
                </div>
                <div className="flex-1 overflow-y-auto p-4">
                  {parsedRequest ? (
                    <div className="space-y-4">
                      <div>
                        <div className="text-xs font-medium text-gray-500 mb-1">
                          URL
                        </div>
                        <div className="font-mono text-sm text-gray-800 break-all bg-gray-50 p-2 rounded">
                          {parsedRequest.url}
                        </div>
                      </div>
                      {Object.keys(parsedRequest.headers).length > 0 && (
                        <div>
                          <div className="text-xs font-medium text-gray-500 mb-1">
                            Headers
                          </div>
                          <div className="bg-gray-50 p-2 rounded space-y-1">
                            {Object.entries(parsedRequest.headers).map(
                              ([k, v]) => (
                                <div key={k} className="text-xs font-mono">
                                  <span className="text-purple-600">{k}:</span>{" "}
                                  <span className="text-gray-600">{v}</span>
                                </div>
                              ),
                            )}
                          </div>
                        </div>
                      )}
                      {parsedRequest.body && (
                        <div>
                          <div className="flex items-center justify-between mb-1">
                            <div className="text-xs font-medium text-gray-500">
                              Body
                            </div>
                            <button
                              onClick={() => handleCopy(parsedRequest.body)}
                              className="text-xs text-gray-400 hover:text-gray-600"
                            >
                              {copied ? (
                                <Check className="w-3 h-3" />
                              ) : (
                                <Copy className="w-3 h-3" />
                              )}
                            </button>
                          </div>
                          <div className="bg-gray-900 text-gray-100 p-3 rounded-lg font-mono text-xs overflow-auto max-h-80">
                            {renderJson(parsedRequest.body)}
                          </div>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="h-full flex items-center justify-center text-gray-400">
                      <div className="text-center">
                        <Terminal className="w-12 h-12 mx-auto mb-2 opacity-30" />
                        <p className="text-sm">
                          Parse a cURL command to see request
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
              <div className="bg-white rounded-xl border shadow-sm overflow-hidden flex flex-col">
                <div className="flex items-center justify-between px-4 py-3 bg-green-50 border-b">
                  <div className="flex items-center gap-2">
                    <ArrowDown className="w-4 h-4 text-green-600" />
                    <span className="text-sm font-semibold text-gray-800">
                      Response
                    </span>
                  </div>
                  {response && (
                    <CheckCircle2 className="w-4 h-4 text-green-600" />
                  )}
                </div>
                <div className="flex-1 overflow-y-auto p-4">
                  {response ? (
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <div className="text-xs font-medium text-gray-500">
                          Response Body
                        </div>
                        <button
                          onClick={() => handleCopy(response)}
                          className="text-xs text-gray-400 hover:text-gray-600"
                        >
                          {copied ? (
                            <Check className="w-3 h-3" />
                          ) : (
                            <Copy className="w-3 h-3" />
                          )}
                        </button>
                      </div>
                      <div className="bg-gray-900 text-gray-100 p-3 rounded-lg font-mono text-xs overflow-auto max-h-[calc(100%-2rem)]">
                        {renderJson(response)}
                      </div>
                    </div>
                  ) : (
                    <div className="h-full flex items-center justify-center text-gray-400">
                      <div className="text-center">
                        <Send className="w-12 h-12 mx-auto mb-2 opacity-30" />
                        <p className="text-sm">
                          Execute request to see response
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {activeView === "mindmap" && !isSetupStep && (
            <div className="h-full">
              <WorkflowMindMap
                parsedRequest={parsedRequest || undefined}
                parsedResponse={response || undefined}
                stepName={currentStep?.name}
                stepIndex={activeStepIndex}
                inheritedContext={inheritedContext}
                onCanvasStateChange={handleCanvasStateChange}
                onManualRequestAdd={handleManualRequestAdd}
                onManualResponseAdd={handleManualResponseAdd}
                initialContextMappings={contextMappings}
                initialOverrideConfigs={overrideConfigs}
                onRequestDelete={handleRequestDelete}
                onResponseDelete={handleResponseDelete}
              />
            </div>
          )}

          {activeView === "mindmap" && isSetupStep && (
            <div className="h-full">
              <SetupStepEditor
                templateCode={templateCode}
                onConfigChange={setSetupConfig}
                className="h-full"
              />
            </div>
          )}

          {activeView === "json" && (
            <div className="h-full bg-white rounded-xl border shadow-sm overflow-hidden flex flex-col">
              <div className="flex items-center justify-between px-4 py-3 bg-gray-50 border-b">
                <div className="flex items-center gap-2">
                  <FileJson className="w-4 h-4 text-gray-600" />
                  <span className="text-sm font-semibold text-gray-800">
                    {isSetupStep
                      ? "Setup Configuration"
                      : "Template Configuration"}
                  </span>
                  <span className="px-2 py-0.5 text-xs font-medium bg-gray-100 text-gray-600 rounded">
                    {currentStep?.name}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => {
                      try {
                        JSON.parse(stepJsonConfigs[activeStepIndex] || "{}");
                        setJsonSaved(true);
                        setTimeout(() => setJsonSaved(false), 2000);
                      } catch (e) {
                        toast.error("Invalid JSON format");
                      }
                    }}
                    className="flex items-center gap-1.5 px-2 py-1 text-xs text-green-600 hover:text-green-700 bg-green-50 rounded hover:bg-green-100"
                  >
                    {jsonSaved ? (
                      <Check className="w-3 h-3" />
                    ) : (
                      <Save className="w-3 h-3" />
                    )}
                    Save Step Config
                  </button>
                  <button
                    onClick={() =>
                      handleCopy(
                        stepJsonConfigs[activeStepIndex] || currentConfig,
                      )
                    }
                    className="flex items-center gap-1.5 px-2 py-1 text-xs text-gray-500 hover:text-gray-700 bg-gray-100 rounded hover:bg-gray-200"
                  >
                    {copied ? (
                      <Check className="w-3 h-3" />
                    ) : (
                      <Copy className="w-3 h-3" />
                    )}
                    Copy
                  </button>
                </div>
              </div>
              <div className="flex-1 p-4 overflow-auto">
                <textarea
                  value={
                    stepJsonConfigs[activeStepIndex] ||
                    JSON.stringify(currentConfig, null, 2)
                  }
                  onChange={(e) => {
                    setStepJsonConfigs((prev) => ({
                      ...prev,
                      [activeStepIndex]: e.target.value,
                    }));
                  }}
                  className="w-full h-full font-mono text-xs bg-gray-900 text-green-400 p-4 rounded-lg border border-gray-700 focus:border-purple-500 focus:ring-1 focus:ring-purple-500 outline-none resize-none"
                  spellCheck={false}
                />
              </div>
            </div>
          )}

          {showGroupModal && (
            <ShowGroupModal
              setShowGroupModal={setShowGroupModal}
              groupName={groupName}
              setGroupName={setGroupName}
              groupCode={groupCode}
              setGroupCode={setGroupCode}
              isSubmittingGroup={isSubmittingGroup}
              handleSubmitGroup={handleSubmitGroup}
            />
          )}
        </div>
      </div>
      {/* Preview JSON Modal */}
      {showPreviewModal && (
        <div
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
          onClick={() => setShowPreviewModal(false)}
        >
          <div
            className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b bg-gradient-to-r from-gray-50 to-gray-100 rounded-t-2xl">
              <div>
                <h3 className="text-lg font-bold text-gray-800">
                  JSON Preview
                </h3>
                <p className="text-xs text-gray-500 mt-0.5">
                  Collection configuration preview
                </p>
              </div>
              <button
                onClick={() => setShowPreviewModal(false)}
                className="p-2 hover:bg-gray-200 rounded-lg transition-colors"
              >
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-auto p-6">
              <div className="mb-4 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="px-2 py-1 bg-blue-100 text-blue-700 rounded-lg text-xs font-medium">
                    {
                      Object.keys(templateAll).filter(
                        (key) => templateAll[key]?.url,
                      ).length
                    }{" "}
                    Steps
                  </div>
                  <div className="px-2 py-1 bg-green-100 text-green-700 rounded-lg text-xs font-medium">
                    {parserCode || "No template code"}
                  </div>
                </div>
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(previewJson);
                    toast.success("Copied to clipboard!");
                  }}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-gray-600 hover:text-gray-800 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
                >
                  <Copy className="w-3.5 h-3.5" />
                  Copy JSON
                </button>
              </div>

              <textarea
                value={previewJson}
                readOnly
                className="w-full h-[calc(90vh-200px)] font-mono text-sm p-4 rounded-lg border border-gray-300 bg-gray-900 text-green-400 focus:outline-none resize-none"
                spellCheck={false}
              />
            </div>

            {/* Footer */}
            <div className="flex items-center justify-end gap-3 px-6 py-4 border-t bg-gray-50 rounded-b-2xl">
              <button
                onClick={() => setShowPreviewModal(false)}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Close
              </button>
              <button
                onClick={() => {
                  const blob = new Blob([previewJson], {
                    type: "application/json",
                  });
                  const url = URL.createObjectURL(blob);
                  const a = document.createElement("a");
                  a.href = url;
                  a.download = `collection-${parserCode || "config"}.json`;
                  a.click();
                  URL.revokeObjectURL(url);
                  toast.success("JSON exported!");
                }}
                className="px-4 py-2 text-sm font-medium text-white bg-gradient-to-r from-blue-600 to-blue-700 rounded-lg hover:from-blue-700 hover:to-blue-800 transition-colors flex items-center gap-2"
              >
                <Download className="w-4 h-4" />
                Export JSON
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
