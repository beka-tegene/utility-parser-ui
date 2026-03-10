"use client";

import { useState, useCallback, useEffect, useMemo } from "react";
import { parseCurl, extractPaths, detectDataType } from "@/lib/utils";
import { WorkflowMindMap } from "./WorkflowMindMap";
import { StepSelector } from "./StepSelector";
import { SetupStepEditor } from "./SetupStepEditor";
import { HistoryControls } from "./HistoryControls";
import { useAppStore } from "@/lib/store";
import type { StepCurlData, PayableItem, OverrideFieldConfig } from "@/types";
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
} from "lucide-react";
import { useEdgesState, useNodesState } from "reactflow";

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

// Standard workflow steps
const WORKFLOW_STEPS = [
  { name: "TOKEN", index: 0 },
  { name: "QUERY", index: 1 },
  { name: "SETUP", index: 2 },
  { name: "PAYMENT", index: 3 },
];

export function RequestResponseMapper() {
  // Multi-step state
  const [activeStepIndex, setActiveStepIndex] = useState(0);
  const [templateCode, setTemplateCode] = useState("DEFAULT");

  // Per-step cURL and response data
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

  // Current step's cURL input (computed from stepCurlInputs)
  const curlInput = stepCurlInputs[activeStepIndex] || "";
  const setCurlInput = useCallback(
    (value: string) => {
      setStepCurlInputs((prev) => ({ ...prev, [activeStepIndex]: value }));
    },
    [activeStepIndex],
  );

  // Current step's response input
  const responseInput = stepResponseInputs[activeStepIndex] || "";
  const setResponseInput = useCallback(
    (value: string) => {
      setStepResponseInputs((prev) => ({ ...prev, [activeStepIndex]: value }));
    },
    [activeStepIndex],
  );

  // Current step's parsed request
  const parsedRequest = stepParsedRequests[activeStepIndex] || null;
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

  // Current step's response
  const response = stepResponses[activeStepIndex] || null;
  const setResponse = useCallback(
    (value: Record<string, unknown> | null) => {
      setStepResponses((prev) => ({ ...prev, [activeStepIndex]: value }));
    },
    [activeStepIndex],
  );

  const [isExecuting, setIsExecuting] = useState(false);
  const [error, setError] = useState("");
  const [activeView, setActiveView] = useState<"split" | "mindmap" | "json">(
    "split",
  );
  const [workflowContext, setWorkflowContext] = useState<WorkflowContext>({
    accumulated: {},
    steps: [],
  });
  const [fieldMappings, setFieldMappings] = useState<FieldMapping[]>([]);
  const [contextFields, setContextFields] = useState<Set<string>>(new Set());
  const [responseFields, setResponseFields] = useState<Set<string>>(new Set());
  const [showHistory, setShowHistory] = useState(true);
  const [copied, setCopied] = useState(false);
  const [currentStepName, setCurrentStepName] = useState("");
  const [showResponseInput, setShowResponseInput] = useState(false);

  // Manual HTTP method selection per step
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

  // SETUP step configuration
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
  } = useAppStore();

  // Current step info
  const currentStep = WORKFLOW_STEPS[activeStepIndex];
  const isSetupStep = currentStep?.name === "SETUP";

  // Initialize multi-step data
  useEffect(() => {
    if (templateCode) {
      initializeMultiStepData(templateCode, 4);
    }
  }, [templateCode, initializeMultiStepData]);

  // Update current step name when step changes
  useEffect(() => {
    setCurrentStepName(currentStep?.name || "");
  }, [activeStepIndex, currentStep?.name]);

  // Get inherited context from previous steps
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

  // Get current step's canvas state from multiStepData
  const currentStepData = multiStepData[templateCode]?.steps?.[activeStepIndex];
  const initialContextMappings = currentStepData?.contextFieldMappings || {};
  const initialOverrideConfigs = currentStepData?.overrideFieldConfigs || {};

  // Handle canvas state changes - persist to store
  const handleCanvasStateChange = useCallback(
    (state: {
      contextFieldMappings: Record<string, string>;
      overrideFieldConfigs: Record<string, OverrideFieldConfig>;
    }) => {
      if (templateCode) {
        updateStepCurlData(templateCode, activeStepIndex, {
          contextFieldMappings: state.contextFieldMappings,
          overrideFieldConfigs: state.overrideFieldConfigs,
        });
      }
    },
    [templateCode, activeStepIndex, updateStepCurlData],
  );

  // Handle step change
  const handleStepChange = useCallback((index: number) => {
    setActiveStepIndex(index);
    setError("");
    setShowResponseInput(false);
  }, []);

  // Parse cURL command
  const handleParseCurl = useCallback(() => {
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

      // Handle body based on content type
      let bodyObj: Record<string, unknown> | null = null;

      if (parsed.body) {
        if (typeof parsed.body === "string") {
          // Try to parse as JSON
          try {
            bodyObj = JSON.parse(parsed.body);
          } catch {
            // If not JSON, keep as-is for form data display
            bodyObj = { _raw: parsed.body };
          }
        } else {
          // Already an object (form data)
          bodyObj = parsed.body as Record<string, unknown>;
        }
      }

      // Use manual method if set, otherwise use parsed method
      const methodMatch =
        curlInput.match(/-X\s+(GET|POST|PUT|DELETE|PATCH)/i) ||
        curlInput.match(/--request\s+(GET|POST|PUT|DELETE|PATCH)/i);
      const detectedMethod = methodMatch
        ? methodMatch[1].toUpperCase()
        : curlInput.includes("-d") || curlInput.includes("--data")
          ? "POST"
          : "GET";
      const finalMethod = httpMethod || detectedMethod;

      setParsedRequest({
        method: finalMethod,
        url: parsed.url,
        headers: parsed.headers,
        body: bodyObj,
      });
      setResponse(null);
    } catch (e) {
      setError("Failed to parse cURL command. Please check the format.");
    }
  }, [curlInput, httpMethod]);

  // Execute request
  const handleExecute = async () => {
    if (!parsedRequest) return;

    setIsExecuting(true);
    setError("");

    try {
      const res = await fetch(parsedRequest.url, {
        method: parsedRequest.method,
        headers: parsedRequest.headers,
        body: parsedRequest.body
          ? JSON.stringify(parsedRequest.body)
          : undefined,
      });

      const contentType = res.headers.get("content-type");
      let responseData: Record<string, unknown>;

      if (contentType?.includes("application/json")) {
        responseData = await res.json();
      } else {
        responseData = { _raw: await res.text() };
      }

      setResponse(responseData);

      // Add to workflow steps
      const newStep: StepData = {
        step: currentStepName || `Step ${workflowContext.steps.length + 1}`,
        request: parsedRequest,
        response: responseData,
        timestamp: new Date().toISOString(),
      };

      // Update accumulated context based on marked fields
      const newAccumulated = { ...workflowContext.accumulated };
      contextFields.forEach((fieldPath) => {
        // Extract the value from response
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
    } catch (e) {
      setError(
        `Request failed: ${e instanceof Error ? e.message : "Unknown error"}`,
      );
    } finally {
      setIsExecuting(false);
    }
  };

  // Handle field marking from mind map
  const handleFieldMappingChange = useCallback(
    (mappings: {
      contextFields: string[];
      responseFields: string[];
      fieldMappings: Record<string, string>;
    }) => {
      setContextFields(new Set(mappings.contextFields));
      setResponseFields(new Set(mappings.responseFields));

      // Convert to field mappings
      const newMappings: FieldMapping[] = Object.entries(
        mappings.fieldMappings,
      ).map(([target, source]) => ({
        source,
        target,
        type: "passthrough" as const,
      }));
      setFieldMappings((prev) => [...prev, ...newMappings]);
    },
    [],
  );

  // Set manual response
  const handleSetManualResponse = () => {
    setError("");
    try {
      if (!responseInput.trim()) {
        setError("Please enter a response JSON");
        return;
      }

      const responseData = JSON.parse(responseInput);
      setResponse(responseData);
      setShowResponseInput(false);

      // Add to workflow if we have a parsed request
      if (parsedRequest) {
        const newStep: StepData = {
          step: currentStepName || `Step ${workflowContext.steps.length + 1}`,
          request: parsedRequest,
          response: responseData,
          timestamp: new Date().toISOString(),
        };

        // Update accumulated context
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

  // Reset workflow
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
    setShowResponseInput(false);
  };

  // Export workflow configuration
  const handleExportConfig = () => {
    const config = {
      steps: workflowContext.steps.map((step) => ({
        name: step.step,
        request: step.request,
        contextFields: Array.from(contextFields),
        responseFields: Array.from(responseFields),
      })),
      mappings: fieldMappings,
      accumulated: workflowContext.accumulated,
    };

    const blob = new Blob([JSON.stringify(config, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "workflow-config.json";
    a.click();
    URL.revokeObjectURL(url);
  };

  // Copy JSON
  const handleCopy = (data: unknown) => {
    navigator.clipboard.writeText(JSON.stringify(data, null, 2));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Render JSON with syntax highlighting
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
  const [nodes] = useNodesState([]);
  const [edges] = useEdgesState([]);

  const generateConfig = useCallback(() => {
    const responseMapper: Record<string, string> = {};
    const requestMapper: Record<string, string> = {};
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

    // Response mapper: fields stored in context (original response field -> custom display name)
    Object.entries(initialContextMappings).forEach(
      ([originalKey, displayName]) => {
        responseMapper[originalKey] = displayName;
      },
    );
    // Override fields - fields that need user input at runtime with full configuration
    Object.values(initialOverrideConfigs).forEach((config) => {
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
    });

    // Request mapper - maps accumulated context to request body
    edges.forEach((edge) => {
      if (
        edge.source.startsWith("response-") &&
        edge.target.startsWith("request-")
      ) {
        const srcNode = nodes.find((n) => n.id === edge.source);
        const tgtNode = nodes.find((n) => n.id === edge.target);
        if (srcNode && tgtNode) {
          const srcKey = srcNode.data.renamedTo || srcNode.data.originalKey;
          const tgtKey = tgtNode.data.renamedTo || tgtNode.data.originalKey;
          requestMapper[tgtKey] = `accumulated.${srcKey}`;
        }
      }
    });

    // Determine step progression
    const STEP_ORDER = ["TOKEN", "QUERY", "SETUP", "PAYMENT", "DONE"];
    const currentStepName1 = currentStepName || "STEP";
    const currentStepIdx = STEP_ORDER.indexOf(currentStepName1);
    const nextStepName =
      currentStepIdx >= 0 && currentStepIdx < STEP_ORDER.length - 1
        ? STEP_ORDER[currentStepIdx + 1]
        : "DONE";

    // Build template structure matching backend
    const template: Record<string, unknown> = {
      name: currentStepName1,
      current_step: currentStepName1,
      next_step: nextStepName,
      url: parsedRequest?.url || "",
      method: parsedRequest?.method || "POST",
      header_type: parsedRequest?.headers || {},
      request_mapper:
        Object.keys(requestMapper).length > 0 ? requestMapper : undefined,
      response_mapper:
        Object.keys(responseMapper).length > 0 ? responseMapper : undefined,
    };

    // Add authorization_mapper if bearer token is detected in headers
    const authHeader =
      parsedRequest?.headers?.["Authorization"] ||
      parsedRequest?.headers?.["authorization"];
    if (authHeader?.toLowerCase().startsWith("bearer")) {
      // Check if token references accumulated context
      template.authorization_mapper = {
        type: "bearer",
        token: "accumulated.access_token",
      };
    }

    // Add to_be_overridden only if there are override fields
    if (overriddenRequestBody.length > 0) {
      template.to_be_overridden = {
        overridden_request_body: overriddenRequestBody,
      };
    }

    // Add body if exists
    if (parsedRequest?.body) {
      template.body = parsedRequest.body;
    }

    // Remove undefined fields
    Object.keys(template).forEach((key) => {
      if (template[key] === undefined) {
        delete template[key];
      }
    });

    return template;
  }, [
    nodes,
    edges,
    parsedRequest,
    currentStepName,
    initialContextMappings,
    initialOverrideConfigs,
  ]);

  return (
    <div className="h-full flex flex-col bg-gray-100">
      {/* Header */}
      <div className="bg-white border-b px-6 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <Map className="w-5 h-5 text-purple-600" />
              <h2 className="text-lg font-semibold text-gray-800">
                Request/Response Mapper
              </h2>
            </div>

            <div className="h-6 w-px bg-gray-200" />

            {/* History Controls */}
            <HistoryControls compact />

            <div className="h-6 w-px bg-gray-200" />

            {/* View toggle */}
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
            <button
              onClick={() => setShowHistory(!showHistory)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                showHistory
                  ? "bg-purple-100 text-purple-700"
                  : "bg-gray-100 text-gray-600 hover:bg-gray-200"
              }`}
            >
              <History className="w-3.5 h-3.5" />
              History ({workflowContext.steps.length})
            </button>

            <button
              onClick={handleExportConfig}
              disabled={workflowContext.steps.length === 0}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-100 text-gray-600 rounded-md text-xs font-medium hover:bg-gray-200 transition-colors disabled:opacity-50"
            >
              <Download className="w-3.5 h-3.5" />
              Export
            </button>

            <button
              onClick={handleResetWorkflow}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-red-50 text-red-600 rounded-md text-xs font-medium hover:bg-red-100 transition-colors"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              Reset
            </button>
          </div>
        </div>
      </div>

      {/* Step Selector Bar */}
      <div className="bg-white border-b px-6 py-3">
        <StepSelector
          templateCode={templateCode}
          steps={WORKFLOW_STEPS}
          activeStepIndex={activeStepIndex}
          onStepChange={handleStepChange}
        />
      </div>

      {/* Main Content */}
      <div className="flex-1 flex overflow-y-scroll">
        {/* Left Panel - cURL Input & History */}
        <div
          className={`${showHistory ? "w-80" : "w-0"} flex-shrink-0 bg-white border-r transition-all overflow-y-scroll`}
        >
          <div className="h-full flex flex-col">
            {/* cURL Input */}
            <div className="p-4 border-b">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Terminal className="w-4 h-4 text-gray-500" />
                  <span className="text-sm font-medium text-gray-700">
                    cURL Input
                  </span>
                </div>
                {/* HTTP Method Selector */}
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

              {/* Step name input */}
              <input
                type="text"
                value={currentStepName}
                onChange={(e) => setCurrentStepName(e.target.value)}
                placeholder="Step name (e.g., TOKEN, QUERY)"
                className="w-full mt-2 px-3 py-2 text-sm border rounded-lg focus:outline-none focus:ring-1 focus:ring-purple-500"
              />

              {error && (
                <div className="mt-2 p-2 flex items-center gap-2 text-xs text-red-600 bg-red-50 rounded-lg">
                  <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
                  <span className="truncate">{error}</span>
                </div>
              )}

              <div className="flex items-center gap-2 mt-3">
                <button
                  onClick={handleParseCurl}
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

              {/* Response Input Area */}
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

            {/* Workflow Steps History */}
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
                          className={`px-1.5 py-0.5 text-xs rounded ${
                            step.response &&
                            !(step.response as Record<string, unknown>).error
                              ? "bg-green-100 text-green-700"
                              : "bg-red-100 text-red-700"
                          }`}
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

            {/* Accumulated Context */}
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

        {/* Main View Area */}
        <div className="flex-1 overflow-y-scroll p-4">
          {/* Inherited Context Display */}
          {Object.keys(inheritedContext).length > 0 && !isSetupStep && (
            <div className="mb-4 p-3 bg-gradient-to-r from-violet-50 to-purple-50 rounded-lg border border-violet-200">
              <div className="flex items-center gap-2 mb-2">
                <Database className="w-4 h-4 text-violet-600" />
                <span className="text-sm font-medium text-violet-800">
                  Inherited from Previous Steps
                </span>
                <span className="px-2 py-0.5 text-xs font-medium bg-violet-100 text-violet-700 rounded-full">
                  {Object.keys(inheritedContext).length} fields
                </span>
              </div>
              <div className="flex flex-wrap gap-2">
                {Object.entries(inheritedContext)
                  .slice(0, 8)
                  .map(([key, value]) => (
                    <div
                      key={key}
                      className="flex items-center gap-1.5 px-2 py-1 bg-white rounded-md border text-xs"
                    >
                      <span className="font-mono text-gray-700">{key}</span>
                      <span className="text-gray-400">=</span>
                      <span className="font-medium text-violet-600 truncate max-w-[120px]">
                        {String(value)}
                      </span>
                    </div>
                  ))}
                {Object.keys(inheritedContext).length > 8 && (
                  <span className="text-xs text-violet-500 self-center">
                    +{Object.keys(inheritedContext).length - 8} more
                  </span>
                )}
              </div>
            </div>
          )}

          {/* SETUP Step - Special Editor */}
          {isSetupStep && activeView === "split" && (
            <div className="h-full">
              <SetupStepEditor
                templateCode={templateCode}
                onConfigChange={setSetupConfig}
                className="h-full"
              />
            </div>
          )}

          {/* Regular steps - Split/MindMap/JSON views */}
          {!isSetupStep && activeView === "split" && (
            <div className="h-full grid grid-cols-2 gap-4">
              {/* Request Panel */}
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
                      className={`px-2 py-0.5 text-xs font-semibold rounded ${
                        parsedRequest.method === "GET"
                          ? "bg-green-100 text-green-700"
                          : parsedRequest.method === "POST"
                            ? "bg-blue-100 text-blue-700"
                            : "bg-gray-100 text-gray-700"
                      }`}
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

              {/* Response Panel */}
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
                parsedRequest={
                  parsedRequest
                    ? {
                        method: parsedRequest.method,
                        url: parsedRequest.url,
                        headers: parsedRequest.headers,
                        body: parsedRequest.body,
                      }
                    : undefined
                }
                parsedResponse={response}
                stepName={currentStep?.name}
                stepIndex={activeStepIndex}
                inheritedContext={inheritedContext}
                initialContextMappings={initialContextMappings}
                initialOverrideConfigs={initialOverrideConfigs}
                onCanvasStateChange={handleCanvasStateChange}
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
            <div className="h-full bg-white rounded-xl border shadow-sm overflow-hidden">
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
                <button
                  onClick={() => {
                    const templateConfig = isSetupStep
                      ? {
                          name: "SETUP",
                          current_step: "SETUP",
                          next_step: "PAYMENT",
                          body: setupConfig,
                        }
                      : {
                          name: currentStepName || "STEP",
                          current_step: currentStepName || "STEP",
                          next_step:
                            WORKFLOW_STEPS[activeStepIndex + 1]?.name || "DONE",
                          url: parsedRequest?.url || "",
                          method: parsedRequest?.method || "POST",
                          header_type: parsedRequest?.headers || {},
                          body: parsedRequest?.body || {},
                          request_mapper: Object.keys(inheritedContext).reduce(
                            (acc, key) => {
                              acc[key] = `accumulated.${key}`;
                              return acc;
                            },
                            {} as Record<string, string>,
                          ),
                          response_mapper: Object.keys(
                            workflowContext.accumulated,
                          ).reduce(
                            (acc, key) => {
                              acc[key] = key;
                              return acc;
                            },
                            {} as Record<string, string>,
                          ),
                          ...(activeStepIndex > 0 && {
                            authorization_mapper: {
                              type: "bearer",
                              token: "accumulated.access_token",
                            },
                          }),
                        };
                    handleCopy(templateConfig);
                  }}
                  className="flex items-center gap-1.5 px-2 py-1 text-xs text-gray-500 hover:text-gray-700 bg-gray-100 rounded hover:bg-gray-200"
                >
                  {copied ? (
                    <Check className="w-3 h-3" />
                  ) : (
                    <Copy className="w-3 h-3" />
                  )}
                  Copy Template
                </button>
              </div>

              <div className="p-4 overflow-auto h-[calc(100%-50px)]">
                <pre className="font-mono text-xs text-gray-700">
                  {JSON.stringify(generateConfig(), null, 2)}
                
                  {/* {JSON.stringify(
                    isSetupStep
                      ? {
                          name: "SETUP",
                          current_step: "SETUP",
                          next_step: "PAYMENT",
                          body: setupConfig,
                        }
                      : {
                          name: currentStepName || "STEP",
                          current_step: currentStepName || "STEP",
                          next_step:
                            WORKFLOW_STEPS[activeStepIndex + 1]?.name || "DONE",
                          url: parsedRequest?.url || "",
                          method: parsedRequest?.method || "POST",
                          header_type: parsedRequest?.headers || {},
                          body: parsedRequest?.body || {},
                          request_mapper: Object.keys(inheritedContext).reduce(
                            (acc, key) => {
                              acc[key] = `accumulated.${key}`;
                              return acc;
                            },
                            {} as Record<string, string>,
                          ),
                          response_mapper: Object.keys(
                            workflowContext.accumulated,
                          ).reduce(
                            (acc, key) => {
                              acc[key] = key;
                              return acc;
                            },
                            {} as Record<string, string>,
                          ),
                          ...(activeStepIndex > 0 && {
                            authorization_mapper: {
                              type: "bearer",
                              token: "accumulated.access_token",
                            },
                          }),
                        },
                    null,
                    2,
                  )} */}
                </pre>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
