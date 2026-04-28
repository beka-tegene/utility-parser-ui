// SuccessMapperModal.tsx
import { Check, FileJson, X, AlertCircle } from "lucide-react";
import { useEffect, useState } from "react";

export interface SuccessMapperConfig {
  key: string;
  validation: {
    type: "string" | "number" | "boolean";
    equals: string | number | boolean;
  };
}

interface SuccessMapperModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (config: SuccessMapperConfig | null) => void;
  initialConfig?: SuccessMapperConfig | null;
  stepName: string;
  responseFields?: string[];
}

export function SuccessMapperModal({
  isOpen,
  onClose,
  onSave,
  initialConfig,
  stepName,
  responseFields = [],
}: SuccessMapperModalProps) {
  const [key, setKey] = useState("");
  const [type, setType] = useState<"string" | "number" | "boolean">("string");
  const [equalsValue, setEqualsValue] = useState<string | number | boolean>("");
  const [hasConfig, setHasConfig] = useState(false);

  useEffect(() => {
    if (initialConfig && initialConfig.key) {
      setKey(initialConfig.key);
      setType(initialConfig.validation.type);
      setEqualsValue(initialConfig.validation.equals);
      setHasConfig(true);
    } else {
      setKey("");
      setType("string");
      setEqualsValue("");
      setHasConfig(false);
    }
  }, [initialConfig]);

  const handleSave = () => {
    if (!hasConfig || !key.trim()) {
      onSave(null);
    } else {
      let value: string | number | boolean = equalsValue;
      
      if (type === "number") {
        value = Number(equalsValue);
      } else if (type === "boolean") {
        value = equalsValue === "true" || equalsValue === true;
      }

      onSave({
        key: key.trim(),
        validation: {
          type,
          equals: value,
        },
      });
    }
    onClose();
  };

  const handleRemove = () => {
    setHasConfig(false);
    setKey("");
    setType("string");
    setEqualsValue("");
    onSave(null);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl shadow-2xl w-full max-w-lg"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="border-b px-6 py-3 flex items-center justify-between">
          <div>
            <h3 className="text-lg font-bold text-gray-800">
              Configure Success Mapper
            </h3>
            <p className="text-xs text-gray-500 mt-1">
              Define when step &quot;{stepName}&quot; is considered successful
            </p>
          </div>
          <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded-lg">
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        <div className="p-6 py-3 space-y-3">

          {/* Enable/Disable Toggle */}
          <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
            <div>
              <label className="text-sm font-medium text-gray-700">
                Enable Success Mapper
              </label>
              <p className="text-xs text-gray-400">
                Check a specific field in the response to determine success
              </p>
            </div>
            <button
              onClick={() => setHasConfig(!hasConfig)}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                hasConfig ? "bg-green-600" : "bg-gray-300"
              }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  hasConfig ? "translate-x-6" : "translate-x-1"
                }`}
              />
            </button>
          </div>

          {hasConfig && (
            <>
              {/* Field Key */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Response Field Key <span className="text-red-500">*</span>
                </label>
                {responseFields.length > 0 ? (
                  <select
                    value={key}
                    onChange={(e) => setKey(e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                  >
                    <option value="">Select a field...</option>
                    {responseFields.map((field) => (
                      <option key={field} value={field}>
                        {field}
                      </option>
                    ))}
                    <option value="__custom__">Custom field...</option>
                  </select>
                ) : (
                  <input
                    type="text"
                    value={key}
                    onChange={(e) => setKey(e.target.value)}
                    placeholder="e.g., Status, responseCode, data.status"
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                  />
                )}
                <p className="text-xs text-gray-400 mt-1">
                  Field path in the response JSON
                </p>
              </div>

              {/* Value Type */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Value Type
                </label>
                <select
                  value={type}
                  onChange={(e) => {
                    setType(e.target.value as any);
                    setEqualsValue("");
                  }}
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                >
                  <option value="string">String</option>
                  <option value="number">Number</option>
                  <option value="boolean">Boolean</option>
                </select>
              </div>

              {/* Expected Value */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Expected Value <span className="text-red-500">*</span>
                </label>
                {type === "boolean" ? (
                  <select
                    value={String(equalsValue)}
                    onChange={(e) => setEqualsValue(e.target.value === "true")}
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                  >
                    <option value="" selected disabled>select</option>
                    <option value="true">true</option>
                    <option value="false">false</option>
                  </select>
                ) : (
                  <input
                    type={type === "number" ? "number" : "text"}
                    value={String(equalsValue)}
                    onChange={(e) => setEqualsValue(e.target.value)}
                    placeholder={`Enter expected value (${type})`}
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                  />
                )}
                <p className="text-xs text-gray-400 mt-1">
                  The response field must equal this value
                </p>
              </div>
            </>
          )}

          {/* Preview Output */}
          <div className="bg-gray-900 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-2">
              <FileJson className="w-3.5 h-3.5 text-green-400" />
              <span className="text-xs font-medium text-gray-400">
                Generated success_mapper Output
              </span>
            </div>
            <pre className="text-xs font-mono text-green-400 overflow-x-auto">
              {hasConfig && key.trim()
                ? JSON.stringify(
                    {
                      key: key,
                      validation: {
                        type: type,
                        equals:
                          type === "string"
                            ? equalsValue || "value"
                            : type === "number"
                            ? Number(equalsValue) || 0
                            : equalsValue === "true" || equalsValue === true,
                      },
                    },
                    null,
                    2
                  )
                : "{}"}
            </pre>
          </div>

          {/* Remove Button (if config exists) */}
          {hasConfig && initialConfig && (
            <button
              onClick={handleRemove}
              className="w-full flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium text-red-600 bg-red-50 rounded-lg hover:bg-red-100 transition-colors"
            >
              <X className="w-4 h-4" />
              Remove Success Mapper
            </button>
          )}
        </div>

        <div className="border-t px-6 py-4 flex items-center justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={hasConfig && (!key.trim() || (type !== "boolean" && equalsValue === ""))}
            className="px-4 py-2 text-sm font-medium text-white bg-gradient-to-r from-green-500 to-emerald-600 rounded-lg hover:from-green-600 hover:to-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            <Check className="w-4 h-4" />
            Save Success Mapper
          </button>
        </div>
      </div>
    </div>
  );
}