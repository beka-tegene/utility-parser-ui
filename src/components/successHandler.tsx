// SuccessMapperModal.tsx
import { Check, FileJson, Plus, Trash2, X, AlertCircle } from "lucide-react";
import { useEffect, useState } from "react";

interface ValidationRule {
  [key: string]: string | number | boolean | string[] | ValidationRule;
}

interface ValidationConfig {
  type: "string" | "number" | "boolean";
  rules: ValidationRule;
}

export interface SuccessMapperItem {
  key: string;
  validation: ValidationConfig;
}

interface SuccessMapperModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (config: SuccessMapperItem[]) => void;
  initialConfig?: SuccessMapperItem[];
  stepName: string;
  responseFields?: string[];
}

// Define rule types with proper typing
interface RuleDefinition {
  value: string;
  label: string;
  needsValue: boolean;
  isArray?: boolean;
  valueType?: "string" | "number" | "boolean";
  booleanValue?: boolean;
}

// Available rule types based on documentation
const STRING_RULES: RuleDefinition[] = [
  { value: "equals", label: "Equals", needsValue: true },
  { value: "notEquals", label: "Not Equals", needsValue: true },
  { value: "in", label: "In Array", needsValue: true, isArray: true },
  { value: "notIn", label: "Not In Array", needsValue: true, isArray: true },
  {
    value: "minLength",
    label: "Min Length",
    needsValue: true,
    valueType: "number",
  },
  {
    value: "maxLength",
    label: "Max Length",
    needsValue: true,
    valueType: "number",
  },
  {
    value: "length",
    label: "Exact Length",
    needsValue: true,
    valueType: "number",
  },
  { value: "regex", label: "Regex Pattern", needsValue: true },
  { value: "startswith", label: "Starts With", needsValue: true },
  { value: "endswith", label: "Ends With", needsValue: true },
  { value: "contains", label: "Contains", needsValue: true },
  {
    value: "email",
    label: "Valid Email",
    needsValue: false,
    booleanValue: true,
  },
  { value: "url", label: "Valid URL", needsValue: false, booleanValue: true },
  { value: "uuid", label: "Valid UUID", needsValue: false, booleanValue: true },
  { value: "not_empty", label: "Not Empty", needsValue: false },
];

const NUMBER_RULES: RuleDefinition[] = [
  { value: "equals", label: "Equals", needsValue: true, valueType: "number" },
  {
    value: "min",
    label: "Greater Than (>)",
    needsValue: true,
    valueType: "number",
  },
  {
    value: "max",
    label: "Less Than (<)",
    needsValue: true,
    valueType: "number",
  },
  {
    value: "gte",
    label: "Greater Than or Equal (>=)",
    needsValue: true,
    valueType: "number",
  },
  {
    value: "lte",
    label: "Less Than or Equal (<=)",
    needsValue: true,
    valueType: "number",
  },
  {
    value: "positive",
    label: "Positive",
    needsValue: false,
    booleanValue: true,
  },
  {
    value: "negative",
    label: "Negative",
    needsValue: false,
    booleanValue: true,
  },
  {
    value: "multipleof",
    label: "Multiple Of",
    needsValue: true,
    valueType: "number",
  },
];

const BOOLEAN_RULES: RuleDefinition[] = [
  { value: "equals", label: "Equals", needsValue: true, valueType: "boolean" },
];

export function SuccessMapperModal({
  isOpen,
  onClose,
  onSave,
  initialConfig,
  stepName,
  responseFields = [],
}: SuccessMapperModalProps) {
  const [items, setItems] = useState<SuccessMapperItem[]>([]);
  const [editingItem, setEditingItem] = useState<SuccessMapperItem | null>(
    null,
  );
  const [showAddModal, setShowAddModal] = useState(false);

  useEffect(() => {
    if (initialConfig && initialConfig.length > 0) {
      setItems(initialConfig);
    } else {
      // Default success mapper based on step name
      // if (stepName === "TOKEN") {
      //   setItems([
      //     {
      //       key: "access_token",
      //       validation: {
      //         type: "string",
      //         rules: { not_empty: true },
      //       },
      //     },
      //   ]);
      // } else if (stepName === "QUERY") {
      //   setItems([
      //     {
      //       key: "Status",
      //       validation: {
      //         type: "string",
      //         rules: { equals: "Sucess" },
      //       },
      //     },
      //     {
      //       key: "Response_Description",
      //       validation: {
      //         type: "string",
      //         rules: { equals: "success!" },
      //       },
      //     },
      //   ]);
      // } else if (stepName === "PAYMENT") {
      //   setItems([
      //     {
      //       key: "transactionStatus",
      //       validation: {
      //         type: "string",
      //         rules: { equals: "SUCCESS" },
      //       },
      //     },
      //     {
      //       key: "responseCode",
      //       validation: {
      //         type: "string",
      //         rules: { equals: "00" },
      //       },
      //     },
      //   ]);
      // } else {
      //   setItems([
      //     {
      //       key: "status",
      //       validation: {
      //         type: "string",
      //         rules: { equals: "success" },
      //       },
      //     },
      //   ]);
      // }
      setItems([]);
    }
  }, [initialConfig, stepName]);

  const handleSave = () => {
    onSave(items);
    onClose();
  };

  const addNewItem = (item: SuccessMapperItem) => {
    setItems([...items, item]);
    setShowAddModal(false);
    setEditingItem(null);
  };

  const updateItem = (index: number, item: SuccessMapperItem) => {
    const newItems = [...items];
    newItems[index] = item;
    setItems(newItems);
    setEditingItem(null);
  };

  const removeItem = (index: number) => {
    setItems(items.filter((_, i) => i !== index));
  };

  if (!isOpen) return null;

  return (
    <>
      <div
        className="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
        onClick={onClose}
      >
        <div
          className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[90vh] overflow-y-auto"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="sticky top-0 bg-white border-b px-6 py-4 flex items-center justify-between">
            <div>
              <h3 className="text-lg font-bold text-gray-800">
                Configure Success Mapper
              </h3>
              <p className="text-xs text-gray-500 mt-1">
                Define validation rules for step &quot;{stepName}&quot; success
                conditions
              </p>
            </div>
            <button
              onClick={onClose}
              className="p-1 hover:bg-gray-100 rounded-lg"
            >
              <X className="w-5 h-5 text-gray-500" />
            </button>
          </div>

          <div className="p-6 space-y-6">
            {/* Info Box */}
            <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
              <div className="flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-blue-500 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm text-blue-800 font-medium mb-1">
                    How Success Mapper Works
                  </p>
                  <p className="text-xs text-blue-600">
                    All validation rules must pass for the step to be considered
                    successful. Each rule checks a specific field in the
                    response body.
                  </p>
                </div>
              </div>
            </div>

            {/* Success Conditions List */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <label className="text-sm font-semibold text-gray-700">
                  Success Conditions
                </label>
                <button
                  onClick={() => {
                    setEditingItem(null);
                    setShowAddModal(true);
                  }}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-sm bg-green-100 text-green-700 rounded-lg hover:bg-green-200"
                >
                  <Plus className="w-4 h-4" />
                  Add Condition
                </button>
              </div>

              {items.length === 0 ? (
                <div className="text-center py-8 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
                  <p className="text-sm text-gray-400">
                    No success conditions configured
                  </p>
                  <p className="text-xs text-gray-400 mt-1">
                    Add conditions to validate response fields
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {items.map((item, idx) => (
                    <div
                      key={idx}
                      className="bg-gray-50 rounded-lg border border-gray-200 p-4"
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <span className="px-2 py-0.5 bg-purple-100 text-purple-700 rounded text-xs font-mono">
                              {item.key}
                            </span>
                            <span className="px-2 py-0.5 bg-blue-100 text-blue-700 rounded text-xs">
                              {item.validation.type}
                            </span>
                          </div>
                          <pre className="text-xs font-mono text-gray-600 bg-white p-2 rounded overflow-x-auto">
                            {JSON.stringify(item.validation.rules, null, 2)}
                          </pre>
                        </div>
                        <div className="flex items-center gap-1 ml-4">
                          <button
                            onClick={() => {
                              setEditingItem(item);
                              setShowAddModal(true);
                            }}
                            className="p-1.5 text-blue-600 hover:bg-blue-100 rounded"
                          >
                            <Check className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => removeItem(idx)}
                            className="p-1.5 text-red-600 hover:bg-red-100 rounded"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Preview Output */}
            <div className="bg-gray-900 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-2">
                <FileJson className="w-3.5 h-3.5 text-green-400" />
                <span className="text-xs font-medium text-gray-400">
                  Generated success_mapper Output
                </span>
              </div>
              <pre className="text-xs font-mono text-green-400 overflow-x-auto">
                {JSON.stringify(items, null, 2)}
              </pre>
            </div>
          </div>

          <div className="sticky bottom-0 bg-white border-t px-6 py-4 flex items-center justify-end gap-3">
            <button
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              className="px-4 py-2 text-sm font-medium text-white bg-gradient-to-r from-green-500 to-emerald-600 rounded-lg hover:from-green-600 hover:to-emerald-700 flex items-center gap-2"
            >
              <Check className="w-4 h-4" />
              Save Success Mapper
            </button>
          </div>
        </div>
      </div>

      {/* Add/Edit Rule Modal */}
      {showAddModal && (
        <RuleEditorModal
          isOpen={showAddModal}
          onClose={() => setShowAddModal(false)}
          onSave={
            editingItem
              ? (item) => {
                  const index = items.findIndex(
                    (i) => i.key === editingItem.key,
                  );
                  updateItem(index, item);
                }
              : addNewItem
          }
          initialItem={editingItem}
          responseFields={responseFields}
        />
      )}
    </>
  );
}

// Rule Editor Modal Component
interface RuleEditorModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (item: SuccessMapperItem) => void;
  initialItem?: SuccessMapperItem | null;
  responseFields?: string[];
}

function RuleEditorModal({
  isOpen,
  onClose,
  onSave,
  initialItem,
  responseFields = [],
}: RuleEditorModalProps) {
  const [key, setKey] = useState("");
  const [type, setType] = useState<"string" | "number" | "boolean">("string");
  const [ruleType, setRuleType] = useState("");
  const [ruleValue, setRuleValue] = useState<string | number | boolean>("");
  const [arrayValue, setArrayValue] = useState<string>("");
  const [arrayItems, setArrayItems] = useState<string[]>([]);

  const getAvailableRules = (): RuleDefinition[] => {
    if (type === "string") return STRING_RULES;
    if (type === "number") return NUMBER_RULES;
    return BOOLEAN_RULES;
  };

  const availableRules = getAvailableRules();
  const selectedRule = availableRules.find((r) => r.value === ruleType);

  useEffect(() => {
    if (initialItem) {
      setKey(initialItem.key);
      setType(initialItem.validation.type);
      const rules = initialItem.validation.rules;
      const ruleKeys = Object.keys(rules);
      if (ruleKeys.length > 0) {
        const firstRule = ruleKeys[0];
        setRuleType(firstRule);
        const value = rules[firstRule];
        if (Array.isArray(value)) {
          setArrayItems(value as string[]);
          setRuleValue("");
        } else {
          setRuleValue(String(value));
        }
      }
    } else {
      setKey("");
      setType("string");
      setRuleType("equals");
      setRuleValue("");
      setArrayItems([]);
    }
  }, [initialItem]);

  const handleAddArrayItem = () => {
    if (arrayValue.trim()) {
      setArrayItems([...arrayItems, arrayValue.trim()]);
      setArrayValue("");
    }
  };

  const handleRemoveArrayItem = (index: number) => {
    setArrayItems(arrayItems.filter((_, i) => i !== index));
  };

  const handleSave = () => {
    if (!key.trim()) return;

    let rules: ValidationRule = {};

    // Check if the selected rule has isArray property
    if (selectedRule?.isArray) {
      rules = { [ruleType]: arrayItems };
    }
    // Check if the selected rule has booleanValue property
    else if (selectedRule?.booleanValue) {
      rules = { [ruleType]: true };
    } else if (ruleType === "not_empty") {
      rules = { [ruleType]: true };
    } else {
      rules = { [ruleType]: ruleValue };
    }

    onSave({
      key: key.trim(),
      validation: {
        type,
        rules,
      },
    });
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-[60]"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="sticky top-0 bg-white border-b px-6 py-4">
          <h3 className="text-lg font-bold text-gray-800">
            {initialItem ? "Edit" : "Add"} Success Condition
          </h3>
        </div>

        <div className="p-6 space-y-4">
          {/* Field Key */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Response Field Key
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
                setRuleType("equals");
                setRuleValue("");
                setArrayItems([]);
              }}
              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
            >
              <option value="string">String</option>
              <option value="number">Number</option>
              <option value="boolean">Boolean</option>
            </select>
          </div>

          {/* Validation Rule */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Validation Rule
            </label>
            <select
              value={ruleType}
              onChange={(e) => {
                setRuleType(e.target.value);
                setRuleValue("");
                setArrayItems([]);
              }}
              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
            >
              {availableRules.map((rule) => (
                <option key={rule.value} value={rule.value}>
                  {rule.label}
                </option>
              ))}
            </select>
          </div>

          {/* Rule Value Input */}
          {selectedRule && selectedRule.needsValue && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {selectedRule.isArray ? "Array Values" : "Expected Value"}
              </label>

              {selectedRule.isArray ? (
                <div>
                  <div className="flex gap-2 mb-2">
                    <input
                      type="text"
                      value={arrayValue}
                      onChange={(e) => setArrayValue(e.target.value)}
                      placeholder="Enter value and click Add"
                      className="flex-1 px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                    />
                    <button
                      onClick={handleAddArrayItem}
                      className="px-3 py-2 bg-green-100 text-green-600 rounded-lg hover:bg-green-200"
                    >
                      <Plus className="w-4 h-4" />
                    </button>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {arrayItems.map((item, idx) => (
                      <span
                        key={idx}
                        className="px-2 py-1 bg-gray-100 text-gray-700 rounded text-sm flex items-center gap-1"
                      >
                        {item}
                        <button
                          onClick={() => handleRemoveArrayItem(idx)}
                          className="text-red-500 hover:text-red-700"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </span>
                    ))}
                  </div>
                </div>
              ) : (
                <input
                  type={selectedRule.valueType === "number" ? "number" : "text"}
                  value={String(ruleValue)}
                  onChange={(e) => setRuleValue(e.target.value)}
                  placeholder={`Enter expected value for ${selectedRule.label}`}
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                />
              )}
            </div>
          )}

          {/* Boolean Rules Info */}
          {selectedRule && selectedRule.booleanValue && (
            <div className="bg-blue-50 rounded-lg p-3">
              <p className="text-xs text-blue-600">
                This rule checks if the value is a valid format. No additional
                value needed.
              </p>
            </div>
          )}

          {/* Not Empty Info */}
          {ruleType === "not_empty" && (
            <div className="bg-blue-50 rounded-lg p-3">
              <p className="text-xs text-blue-600">
                This rule checks that the field is not empty. No additional
                value needed.
              </p>
            </div>
          )}
        </div>

        <div className="sticky bottom-0 bg-white border-t px-6 py-4 flex items-center justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={!key.trim()}
            className="px-4 py-2 text-sm font-medium text-white bg-gradient-to-r from-green-500 to-emerald-600 rounded-lg hover:from-green-600 hover:to-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Save Condition
          </button>
        </div>
      </div>
    </div>
  );
}
