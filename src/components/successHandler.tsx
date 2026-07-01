// SuccessMapperModal.tsx
import { Check, FileJson, X, AlertCircle, Plus, Trash2 } from "lucide-react";
import { useEffect, useState } from "react";

export interface SuccessMapperConfig {
  key: string;
  validation: {
    type: "string" | "number" | "boolean" | "array";
    equals: string | number | boolean | string[];
  };
}

export interface SuccessMapperConfigs {
  configs: SuccessMapperConfig[];
}

interface SuccessMapperModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (configs: SuccessMapperConfig[] | null) => void;
  initialConfigs?: SuccessMapperConfig[] | null;
  stepName: string;
  responseFields?: string[];
}

export function SuccessMapperModal({
  isOpen,
  onClose,
  onSave,
  initialConfigs,
  stepName,
  responseFields = [],
}: SuccessMapperModalProps) {
  const [configs, setConfigs] = useState<SuccessMapperConfig[]>([]);
  const [hasConfig, setHasConfig] = useState(false);

  useEffect(() => {
    if (initialConfigs && initialConfigs.length > 0) {
      setConfigs(initialConfigs);
      setHasConfig(true);
    } else {
      setConfigs([
        {
          key: "",
          validation: {
            type: "string",
            equals: "",
          },
        },
      ]);
      setHasConfig(false);
    }
  }, [initialConfigs]);

  const addConfig = () => {
    setConfigs([
      ...configs,
      {
        key: "",
        validation: {
          type: "string",
          equals: "",
        },
      },
    ]);
  };

  const removeConfig = (index: number) => {
    if (configs.length <= 1) {
      setHasConfig(false);
      setConfigs([
        {
          key: "",
          validation: {
            type: "string",
            equals: "",
          },
        },
      ]);
      return;
    }
    const newConfigs = configs.filter((_, i) => i !== index);
    setConfigs(newConfigs);
  };

  const updateConfig = (index: number, field: string, value: any) => {
    const newConfigs = [...configs];
    if (field === "key") {
      newConfigs[index].key = value;
    } else if (field === "type") {
      newConfigs[index].validation.type = value;
      newConfigs[index].validation.equals = value === "array" ? [] : "";
    } else if (field === "equals") {
      newConfigs[index].validation.equals = value;
    }
    setConfigs(newConfigs);
  };

  const handleSave = () => {
    if (!hasConfig) {
      onSave(null);
    } else {
      // Filter out empty configs
      const validConfigs = configs.filter(
        (c) => c.key.trim() && 
        (c.validation.type === "array" 
          ? Array.isArray(c.validation.equals) && c.validation.equals.length > 0
          : c.validation.equals !== "")
      );

      if (validConfigs.length === 0) {
        onSave(null);
      } else {
        // Process each config
        const processedConfigs = validConfigs.map((config) => {
          let value: string | number | boolean | string[] = config.validation.equals;
          
          if (config.validation.type === "number") {
            value = Number(config.validation.equals);
          } else if (config.validation.type === "boolean") {
            value = config.validation.equals === "true" || config.validation.equals === true;
          } else if (config.validation.type === "array" && Array.isArray(config.validation.equals)) {
            value = config.validation.equals.filter(v => v.trim() !== "");
          }

          return {
            key: config.key.trim(),
            validation: {
              type: config.validation.type,
              equals: value,
            },
          };
        });

        onSave(processedConfigs);
      }
    }
    onClose();
  };

  const handleRemove = () => {
    setHasConfig(false);
    setConfigs([
      {
        key: "",
        validation: {
          type: "string",
          equals: "",
        },
      },
    ]);
    onSave(null);
    onClose();
  };

  const renderConfig = (config: SuccessMapperConfig, index: number) => {
    const isArrayType = config.validation.type === "array";
    const arrayValues = Array.isArray(config.validation.equals) 
      ? config.validation.equals as string[] 
      : [];

    const handleAddArrayValue = (idx: number) => {
      const newConfigs = [...configs];
      const currentArray = Array.isArray(newConfigs[idx].validation.equals) 
        ? [...newConfigs[idx].validation.equals as string[]]
        : [];
      currentArray.push("");
      newConfigs[idx].validation.equals = currentArray;
      setConfigs(newConfigs);
    };

    const handleRemoveArrayValue = (idx: number, arrayIdx: number) => {
      const newConfigs = [...configs];
      const currentArray = Array.isArray(newConfigs[idx].validation.equals) 
        ? [...newConfigs[idx].validation.equals as string[]]
        : [];
      currentArray.splice(arrayIdx, 1);
      newConfigs[idx].validation.equals = currentArray;
      setConfigs(newConfigs);
    };

    const handleArrayValueChange = (idx: number, arrayIdx: number, value: string) => {
      const newConfigs = [...configs];
      const currentArray = Array.isArray(newConfigs[idx].validation.equals) 
        ? [...newConfigs[idx].validation.equals as string[]]
        : [];
      currentArray[arrayIdx] = value;
      newConfigs[idx].validation.equals = currentArray;
      setConfigs(newConfigs);
    };

    return (
      <div key={index} className="relative border border-gray-200 rounded-lg p-4 pt-6 bg-gray-50/50">
        {configs.length > 1 && (
          <button
            onClick={() => removeConfig(index)}
            className="absolute -top-2 -right-2 p-1.5 bg-red-100 text-red-600 rounded-full hover:bg-red-200 transition-colors shadow-sm"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        )}
        <div className="text-xs font-medium text-gray-400 mb-3 flex items-center gap-2">
          <span className="px-2 py-0.5 bg-gray-200 rounded-full">#{index + 1}</span>
          {configs.length > 1 && (
            <span className="text-gray-300">|</span>
          )}
          <span>Success Condition</span>
        </div>

        {/* Field Key */}
        <div className="mb-3">
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Response Field Key <span className="text-red-500">*</span>
          </label>
          {responseFields.length > 0 ? (
            <select
              value={config.key}
              onChange={(e) => updateConfig(index, "key", e.target.value)}
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
              value={config.key}
              onChange={(e) => updateConfig(index, "key", e.target.value)}
              placeholder="e.g., Status, responseCode, data.status"
              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
            />
          )}
          <p className="text-xs text-gray-400 mt-1">
            Field path in the response JSON
          </p>
        </div>

        {/* Value Type */}
        <div className="mb-3">
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Value Type
          </label>
          <select
            value={config.validation.type}
            onChange={(e) => {
              const newType = e.target.value as any;
              updateConfig(index, "type", newType);
            }}
            className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
          >
            <option value="string">String</option>
            <option value="number">Number</option>
            <option value="boolean">Boolean</option>
            <option value="array">Array</option>
          </select>
        </div>

        {/* Expected Value */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Expected Value <span className="text-red-500">*</span>
          </label>
          
          {config.validation.type === "boolean" ? (
            <select
              value={String(config.validation.equals)}
              onChange={(e) => updateConfig(index, "equals", e.target.value === "true")}
              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
            >
              <option value="">select</option>
              <option value="true">true</option>
              <option value="false">false</option>
            </select>
          ) : config.validation.type === "array" ? (
            <div className="space-y-2">
              {arrayValues.map((value, arrayIdx) => (
                <div key={arrayIdx} className="flex items-center gap-2">
                  <input
                    type="text"
                    value={value}
                    onChange={(e) => handleArrayValueChange(index, arrayIdx, e.target.value)}
                    placeholder={`Value ${arrayIdx + 1}`}
                    className="flex-1 px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                  />
                  {arrayValues.length > 1 && (
                    <button
                      onClick={() => handleRemoveArrayValue(index, arrayIdx)}
                      className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              ))}
              <button
                onClick={() => handleAddArrayValue(index)}
                className="flex items-center gap-2 px-3 py-1.5 text-sm text-green-600 hover:bg-green-50 rounded-lg transition-colors"
              >
                <Plus className="w-4 h-4" />
                Add Value
              </button>
              <p className="text-xs text-gray-400 mt-1">
                The response field must equal any of these values
              </p>
            </div>
          ) : (
            <input
              type={config.validation.type === "number" ? "number" : "text"}
              value={String(config.validation.equals)}
              onChange={(e) => updateConfig(index, "equals", e.target.value)}
              placeholder={`Enter expected value (${config.validation.type})`}
              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
            />
          )}
        </div>
      </div>
    );
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="border-b px-6 py-3 flex items-center justify-between sticky top-0 bg-white z-10">
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
                Check response fields to determine success
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
              <div className="space-y-4">
                {configs.map((config, index) => renderConfig(config, index))}
              </div>

              {/* Add More Button */}
              <button
                onClick={addConfig}
                className="w-full flex items-center justify-center gap-2 px-4 py-3 text-sm font-medium text-green-600 bg-green-50 rounded-lg hover:bg-green-100 border-2 border-dashed border-green-200 transition-colors"
              >
                <Plus className="w-4 h-4" />
                Add Another Condition
              </button>

              {/* Preview Output */}
              <div className="bg-gray-900 rounded-lg p-4">
                <div className="flex items-center gap-2 mb-2">
                  <FileJson className="w-3.5 h-3.5 text-green-400" />
                  <span className="text-xs font-medium text-gray-400">
                    Generated success_mapper Output
                  </span>
                  <span className="text-[10px] px-2 py-0.5 bg-green-900/50 text-green-400 rounded-full">
                    {configs.filter(c => c.key.trim() && 
                      (c.validation.type === "array" 
                        ? Array.isArray(c.validation.equals) && c.validation.equals.length > 0
                        : c.validation.equals !== "")
                    ).length} conditions
                  </span>
                </div>
                <pre className="text-xs font-mono text-green-400 overflow-x-auto max-h-60 overflow-y-auto">
                  {hasConfig
                    ? (() => {
                        const validConfigs = configs
                          .filter((c) => c.key.trim() && 
                            (c.validation.type === "array" 
                              ? Array.isArray(c.validation.equals) && c.validation.equals.length > 0
                              : c.validation.equals !== "")
                          )
                          .map((c) => {
                            let equals = c.validation.equals;
                            if (c.validation.type === "number") {
                              equals = Number(c.validation.equals);
                            } else if (c.validation.type === "boolean") {
                              equals = c.validation.equals === "true" || c.validation.equals === true;
                            } else if (c.validation.type === "array" && Array.isArray(c.validation.equals)) {
                              equals = c.validation.equals.filter(v => v.trim() !== "");
                            }
                            return {
                              key: c.key.trim(),
                              validation: {
                                type: c.validation.type,
                                equals: equals,
                              },
                            };
                          });
                        return JSON.stringify(validConfigs, null, 2);
                      })()
                    : "[]"}
                </pre>
              </div>

              {/* Remove Button (if config exists) */}
              {initialConfigs && initialConfigs.length > 0 && (
                <button
                  onClick={handleRemove}
                  className="w-full flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium text-red-600 bg-red-50 rounded-lg hover:bg-red-100 transition-colors"
                >
                  <X className="w-4 h-4" />
                  Remove All Success Mappers
                </button>
              )}
            </>
          )}
        </div>

        <div className="border-t px-6 py-4 flex items-center justify-end gap-3 sticky bottom-0 bg-white">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={hasConfig && configs.every(
              (c) => !c.key.trim() || 
              (c.validation.type === "array" 
                ? !Array.isArray(c.validation.equals) || c.validation.equals.length === 0
                : c.validation.equals === "")
            )}
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