"use client";

import { useState } from "react";
import { useAppStore } from "@/lib/store";
import {
  Play,
  RotateCcw,
  ChevronRight,
  CheckCircle2,
  XCircle,
  Clock,
  Send,
  Loader2,
} from "lucide-react";

interface TestStep {
  step: number;
  name: string;
  status: "pending" | "running" | "success" | "error";
  request?: unknown;
  response?: unknown;
  error?: string;
  timestamp?: string;
}

export function TestConsole() {
  const { collection, apiBaseUrl, setApiBaseUrl } = useAppStore();
  const [testSteps, setTestSteps] = useState<TestStep[]>([]);
  const [currentToken, setCurrentToken] = useState<string | null>(null);
  const [inputValues, setInputValues] = useState<Record<string, string>>({});
  const [isRunning, setIsRunning] = useState(false);
  const [currentStepIndex, setCurrentStepIndex] = useState(0);

  const initializeTest = () => {
    if (!collection) return;

    const steps = collection.templates.map((template, index) => ({
      step: index + 1,
      name: template.current_step || `Step ${index + 1}`,
      status: "pending" as const,
    }));

    setTestSteps(steps);
    setCurrentToken(null);
    setInputValues({});
    setCurrentStepIndex(0);
  };

  const handleStartWorkflow = async () => {
    if (!collection) return;

    setIsRunning(true);

    // Update first step to running
    setTestSteps((prev) =>
      prev.map((s, i) => (i === 0 ? { ...s, status: "running" } : s)),
    );

    try {
      const response = await fetch(
        `${apiBaseUrl}/api/v1/cbesuperapp/utility/proxy/initial`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            parser_code: collection.template_code,
            request: inputValues,
          }),
        },
      );

      const data = await response.json();

      if (data.success) {
        setCurrentToken(data.token);
        setCurrentStepIndex(1);
        setTestSteps((prev) =>
          prev.map((s, i) =>
            i === 0
              ? {
                  ...s,
                  status: "success",
                  response: data,
                  timestamp: new Date().toISOString(),
                }
              : s,
          ),
        );

        // Extract required fields for next step
        if (data.to_be_overridden?.overridden_request_body) {
          const newInputs: Record<string, string> = {};
          data.to_be_overridden.overridden_request_body.forEach(
            (field: { field: string }) => {
              newInputs[field.field] = "";
            },
          );
          setInputValues(newInputs);
        }
      } else {
        setTestSteps((prev) =>
          prev.map((s, i) =>
            i === 0
              ? {
                  ...s,
                  status: "error",
                  error: data.message || "Unknown error",
                  response: data,
                  timestamp: new Date().toISOString(),
                }
              : s,
          ),
        );
      }
    } catch (error) {
      setTestSteps((prev) =>
        prev.map((s, i) =>
          i === 0
            ? {
                ...s,
                status: "error",
                error: error instanceof Error ? error.message : "Network error",
                timestamp: new Date().toISOString(),
              }
            : s,
        ),
      );
    }

    setIsRunning(false);
  };

  const handleProcessStep = async () => {
    if (!currentToken) return;

    setIsRunning(true);

    // Update current step to running
    setTestSteps((prev) =>
      prev.map((s, i) =>
        i === currentStepIndex ? { ...s, status: "running" } : s,
      ),
    );

    try {
      const response = await fetch(
        `${apiBaseUrl}/api/v1/cbesuperapp/utility/proxy/process`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            token: currentToken,
            request: inputValues,
          }),
        },
      );

      const data = await response.json();

      if (data.success) {
        setCurrentToken(data.next_token);
        setTestSteps((prev) =>
          prev.map((s, i) =>
            i === currentStepIndex
              ? {
                  ...s,
                  status: "success",
                  request: inputValues,
                  response: data,
                  timestamp: new Date().toISOString(),
                }
              : s,
          ),
        );

        if (data.has_next) {
          setCurrentStepIndex((prev) => prev + 1);
          // Extract required fields for next step
          if (data.to_be_overridden?.overridden_request_body) {
            const newInputs: Record<string, string> = {};
            data.to_be_overridden.overridden_request_body.forEach(
              (field: { field: string }) => {
                newInputs[field.field] = "";
              },
            );
            setInputValues(newInputs);
          }
        } else {
          // Workflow complete
          setCurrentStepIndex(-1);
        }
      } else {
        setTestSteps((prev) =>
          prev.map((s, i) =>
            i === currentStepIndex
              ? {
                  ...s,
                  status: "error",
                  error: data.message || "Unknown error",
                  request: inputValues,
                  response: data,
                  timestamp: new Date().toISOString(),
                }
              : s,
          ),
        );
      }
    } catch (error) {
      setTestSteps((prev) =>
        prev.map((s, i) =>
          i === currentStepIndex
            ? {
                ...s,
                status: "error",
                error: error instanceof Error ? error.message : "Network error",
                timestamp: new Date().toISOString(),
              }
            : s,
        ),
      );
    }

    setIsRunning(false);
  };

  const handleReset = () => {
    setTestSteps([]);
    setCurrentToken(null);
    setInputValues({});
    setCurrentStepIndex(0);
    setIsRunning(false);
  };

  if (!collection) {
    return (
      <div className="flex items-center justify-center h-full text-gray-500">
        <div className="text-center">
          <p className="text-lg mb-2">No collection loaded</p>
          <p className="text-sm">Create or import a collection to test it</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full">
      {/* Left panel - Steps */}
      <div className="w-80 border-r bg-gray-50 p-4 flex flex-col">
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-1">
            API Base URL
          </label>
          <input
            type="text"
            value={apiBaseUrl}
            onChange={(e) => setApiBaseUrl(e.target.value)}
            placeholder="https://qaapisuperapp.cbe.com.et/api/v1"
            className="w-full px-3 py-2 text-sm border rounded-md font-mono focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-medium text-gray-700">
            Testing: {collection.name || collection.template_code}
          </h3>
        </div>

        <div className="flex gap-2 mb-4">
          {testSteps.length === 0 ? (
            <button
              onClick={initializeTest}
              className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
            >
              <Play className="w-4 h-4" />
              Initialize Test
            </button>
          ) : (
            <button
              onClick={handleReset}
              className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 transition-colors"
            >
              <RotateCcw className="w-4 h-4" />
              Reset
            </button>
          )}
        </div>

        {/* Step progress */}
        <div className="flex-1 overflow-auto">
          <div className="space-y-3">
            {testSteps.map((step, index) => (
              <div
                key={index}
                className={`p-3 rounded-lg border transition-colors ${
                  step.status === "running"
                    ? "bg-blue-50 border-blue-300"
                    : step.status === "success"
                      ? "bg-green-50 border-green-300"
                      : step.status === "error"
                        ? "bg-red-50 border-red-300"
                        : "bg-white border-gray-200"
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {step.status === "running" ? (
                      <Loader2 className="w-4 h-4 text-blue-600 animate-spin" />
                    ) : step.status === "success" ? (
                      <CheckCircle2 className="w-4 h-4 text-green-600" />
                    ) : step.status === "error" ? (
                      <XCircle className="w-4 h-4 text-red-600" />
                    ) : (
                      <Clock className="w-4 h-4 text-gray-400" />
                    )}
                    <span className="text-sm font-medium">{step.name}</span>
                  </div>
                  <span className="text-xs text-gray-500">
                    Step {step.step}
                  </span>
                </div>
                {step.error && (
                  <p className="mt-2 text-xs text-red-600">{step.error}</p>
                )}
                {step.timestamp && (
                  <p className="mt-1 text-xs text-gray-400">
                    {new Date(step.timestamp).toLocaleTimeString()}
                  </p>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Right panel - Input/Output */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {testSteps.length > 0 && currentStepIndex >= 0 && (
          <>
            {/* Input section */}
            <div className="p-4 border-b bg-white">
              <h3 className="text-sm font-medium text-gray-700 mb-3">
                {currentStepIndex === 0
                  ? "Initial Request"
                  : `Step ${currentStepIndex + 1} Input`}
              </h3>

              <div className="space-y-3 max-h-48 overflow-y-auto">
                {Object.keys(inputValues).length === 0 ? (
                  <p className="text-sm text-gray-500">
                    No input fields required for this step
                  </p>
                ) : (
                  Object.entries(inputValues).map(([key, value]) => (
                    <div key={key}>
                      <label className="block text-xs font-medium text-gray-600 mb-1">
                        {key}
                      </label>
                      <input
                        type="text"
                        value={value}
                        onChange={(e) =>
                          setInputValues((prev) => ({
                            ...prev,
                            [key]: e.target.value,
                          }))
                        }
                        className="w-full px-3 py-2 text-sm border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder={`Enter ${key}...`}
                      />
                    </div>
                  ))
                )}
              </div>

              <button
                onClick={
                  currentStepIndex === 0
                    ? handleStartWorkflow
                    : handleProcessStep
                }
                disabled={isRunning}
                className="mt-4 flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {isRunning ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Send className="w-4 h-4" />
                )}
                {currentStepIndex === 0 ? "Start Workflow" : "Process Step"}
              </button>
            </div>

            {/* Response section */}
            <div className="flex-1 p-4 overflow-auto bg-gray-50">
              <h3 className="text-sm font-medium text-gray-700 mb-3">
                Response History
              </h3>

              <div className="space-y-4">
                {testSteps
                  .filter((s) => s.response)
                  .map((step, index) => (
                    <div key={index} className="bg-white rounded-lg border p-4">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-medium text-gray-700">
                          {step.name}
                        </span>
                        <span
                          className={`text-xs px-2 py-0.5 rounded-full ${
                            step.status === "success"
                              ? "bg-green-100 text-green-700"
                              : "bg-red-100 text-red-700"
                          }`}
                        >
                          {step.status}
                        </span>
                      </div>
                      {step.request !== undefined && step.request !== null ? (
                        <div className="mb-3">
                          <div className="text-xs font-medium text-gray-500 mb-1">
                            Request:
                          </div>
                          <pre className="text-xs font-mono bg-gray-900 text-green-400 p-3 rounded overflow-x-auto">
                            {JSON.stringify(step.request, null, 2)}
                          </pre>
                        </div>
                      ) : null}
                      <div>
                        <div className="text-xs font-medium text-gray-500 mb-1">
                          Response:
                        </div>
                        <pre className="text-xs font-mono bg-gray-900 text-green-400 p-3 rounded overflow-x-auto max-h-64">
                          {JSON.stringify(step.response, null, 2)}
                        </pre>
                      </div>
                    </div>
                  ))}
              </div>
            </div>
          </>
        )}

        {testSteps.length === 0 && (
          <div className="flex-1 flex items-center justify-center text-gray-500">
            <div className="text-center">
              <p className="text-lg mb-2">Ready to test</p>
              <p className="text-sm">
                Click &quot;Initialize Test&quot; to begin
              </p>
            </div>
          </div>
        )}

        {currentStepIndex === -1 && (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <CheckCircle2 className="w-16 h-16 text-green-500 mx-auto mb-4" />
              <p className="text-xl font-medium text-gray-800">
                Workflow Complete!
              </p>
              <p className="text-sm text-gray-500 mt-1">
                All {testSteps.length} steps executed successfully
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
