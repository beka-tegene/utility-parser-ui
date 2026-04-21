"use client";

import { useCallback, useEffect, useState, useMemo, useRef } from "react";
import ReactFlow, {
  Node,
  Edge,
  addEdge,
  Connection,
  useNodesState,
  useEdgesState,
  Background,
  Controls,
  MiniMap,
  Handle,
  Position,
  NodeProps,
  MarkerType,
  ConnectionLineType,
  BackgroundVariant,
  ReactFlowProvider,
  useReactFlow,
  Panel,
} from "reactflow";
import "reactflow/dist/style.css";
import { detectDataType } from "@/lib/utils";
import type { OverrideFieldConfig } from "@/types";
import {
  ContextTimelineNode,
  StepIndicatorNode,
  InheritedFieldNode,
} from "./ContextTimelineNode";
import {
  FileJson,
  ArrowRight,
  Check,
  Edit3,
  X,
  GitBranch,
  Tag,
  Database,
  Zap,
  Shield,
  Layers,
  AlertCircle,
  Save,
  LucideDelete,
  Trash2,
  CheckCircle2,
} from "lucide-react";
import { toast } from "sonner";
import { SuccessMapperItem, SuccessMapperModal } from "./successHandler";

type FieldCategory = "request" | "response" | "context" | "override";


interface FieldData {
  id: string;
  key: string;
  originalKey: string;
  value: unknown;
  type: string;
  category: FieldCategory;
  isOverride?: boolean;
  isMappedToContext?: boolean;
  contextKey?: string;
  renamedTo?: string;
  mappedFrom?: string;
  isArray?: boolean;
  isArrayItem?: boolean;
  arrayPath?: string;
  editedValue?: string;
  onDelete?: (id: string) => void;
}

interface ArrayObjectNodeData {
  id: string;
  key: string;
  originalKey: string;
  items: Array<Record<string, unknown>>;
  type: string;
  category: FieldCategory;
  isOverride?: boolean;
  isMappedToContext?: boolean;
  contextKey?: string;
  renamedTo?: string;
  selectedItems?: Map<string, { path: string; key: string; value: string }>;
  onSelectionChange?: (
    nodeId: string,
    selections: Map<string, { path: string; key: string; value: string }>,
  ) => void;
  onValueEdit?: (path: string, newValue: string) => void; // New callback for value edits
}

const categoryColors: Record<
  FieldCategory,
  {
    bg: string;
    border: string;
    text: string;
    handle: string;
    light: string;
    gradient: string;
  }
> = {
  request: {
    bg: "bg-blue-100",
    border: "border-blue-400",
    text: "text-blue-700",
    handle: "#3b82f6",
    light: "bg-blue-50",
    gradient: "from-blue-500 to-blue-600",
  },
  response: {
    bg: "bg-emerald-100",
    border: "border-emerald-400",
    text: "text-emerald-700",
    handle: "#10b981",
    light: "bg-emerald-50",
    gradient: "from-emerald-500 to-emerald-600",
  },
  context: {
    bg: "bg-violet-100",
    border: "border-violet-400",
    text: "text-violet-700",
    handle: "#8b5cf6",
    light: "bg-violet-50",
    gradient: "from-violet-500 to-violet-600",
  },
  override: {
    bg: "bg-rose-100",
    border: "border-rose-400",
    text: "text-rose-700",
    handle: "#f43f5e",
    light: "bg-rose-50",
    gradient: "from-rose-500 to-rose-600",
  },
};

function ArrayObjectNode({
  data,
  selected,
  id,
}: NodeProps<ArrayObjectNodeData>) {
  const [isEditing, setIsEditing] = useState(false);
  const [editKey, setEditKey] = useState(data.renamedTo || data.key);
  const [editableItems, setEditableItems] = useState(data.items);
  const [selectedItems, setSelectedItems] = useState<
    Map<string, { path: string; key: string; value: string }>
  >(data.selectedItems || new Map());

  useEffect(() => {
    setEditableItems(data.items);
  }, [data.items]);

  useEffect(() => {
    if (data.onSelectionChange) {
      data.onSelectionChange(id, selectedItems);
    }
  }, [selectedItems, id, data.onSelectionChange]);

  const handleRename = () => {
    if (editKey.trim() && editKey !== data.key) {
      data.renamedTo = editKey;
    }
    setIsEditing(false);
  };

  const handleValueChange = (
    parentIndex: number,
    subFieldIndex: number | null,
    key: string,
    newValue: string,
  ) => {
    const updatedItems = [...editableItems];

    if (
      subFieldIndex !== null &&
      updatedItems[parentIndex] &&
      "Sub_Fields" in updatedItems[parentIndex]
    ) {
      const subFields = [...(updatedItems[parentIndex].Sub_Fields as any[])];
      if (subFields[subFieldIndex]) {
        subFields[subFieldIndex] = {
          ...subFields[subFieldIndex],
          Value: newValue,
        };
        updatedItems[parentIndex] = {
          ...updatedItems[parentIndex],
          Sub_Fields: subFields,
        };
        setEditableItems(updatedItems);
        data.items = updatedItems;

        // Notify parent about value change
        if (data.onValueEdit) {
          const path = `${data.key}[${parentIndex}].Sub_Fields[${subFieldIndex}].Value`;
          data.onValueEdit(path, newValue);
        }

        // Update selected item if it exists
        if (selectedItems.has(`${parentIndex}-${subFieldIndex}`)) {
          const newSelected = new Map(selectedItems);
          newSelected.set(`${parentIndex}-${subFieldIndex}`, {
            path: `${data.key}[${parentIndex}].Sub_Fields[${subFieldIndex}].Value`,
            key,
            value: newValue,
          });
          setSelectedItems(newSelected);
        }
      }
    } else if (
      updatedItems[parentIndex] &&
      "Value" in updatedItems[parentIndex]
    ) {
      updatedItems[parentIndex] = {
        ...updatedItems[parentIndex],
        Value: newValue,
      };
      setEditableItems(updatedItems);
      data.items = updatedItems;

      // Notify parent about value change
      if (data.onValueEdit) {
        const path = `${data.key}[${parentIndex}].Value`;
        data.onValueEdit(path, newValue);
      }

      // Update selected item if it exists
      if (selectedItems.has(`${parentIndex}`)) {
        const newSelected = new Map(selectedItems);
        newSelected.set(`${parentIndex}`, {
          path: `${data.key}[${parentIndex}].Value`,
          key,
          value: newValue,
        });
        setSelectedItems(newSelected);
      }
    }
  };

  const toggleItemSelection = (
    uniqueId: string,
    path: string,
    key: string,
    value: string,
  ) => {
    const newSelected = new Map(selectedItems);
    if (newSelected.has(uniqueId)) {
      newSelected.delete(uniqueId);
    } else {
      newSelected.set(uniqueId, { path, key, value });
    }
    setSelectedItems(newSelected);
  };

  const displayCategory = data.isOverride
    ? "override"
    : data.isMappedToContext
      ? "context"
      : data.category;
  const colors =
    categoryColors[displayCategory] || categoryColors[data.category];

  // Flatten items for display if they have Sub_Fields
  const flattenedItems = useMemo(() => {
    const items: Array<{
      uniqueId: string;
      parentIndex: number;
      subIndex: number | null;
      path: string;
      key: string;
      value: string;
    }> = [];

    editableItems.forEach((item, parentIdx) => {
      if (item.Sub_Fields && Array.isArray(item.Sub_Fields)) {
        (item.Sub_Fields as any[]).forEach((subItem, subIdx) => {
          if (subItem.Key && subItem.Value !== undefined) {
            const path = `${data.key}[${parentIdx}].Sub_Fields[${subIdx}].Value`;
            items.push({
              uniqueId: `${parentIdx}-${subIdx}`,
              parentIndex: parentIdx,
              subIndex: subIdx,
              path,
              key: String(subItem.Key),
              value: String(subItem.Value),
            });
          }
        });
      } else if (item.Key && item.Value !== undefined) {
        const path = `${data.key}[${parentIdx}].Value`;
        items.push({
          uniqueId: `${parentIdx}`,
          parentIndex: parentIdx,
          subIndex: null,
          path,
          key: String(item.Key),
          value: String(item.Value),
        });
      }
    });

    return items;
  }, [editableItems, data.key]);

  return (
    <div
      className={`group relative rounded-xl border-2 shadow-lg transition-all duration-200 cursor-grab active:cursor-grabbing backdrop-blur-sm
        ${colors.light} ${colors.border}
        ${selected ? "ring-2 ring-purple-500 ring-offset-2 shadow-xl scale-105" : ""}
        ${data.isOverride ? "ring-2 ring-rose-400 ring-offset-1" : ""}
        ${data.isMappedToContext ? "ring-2 ring-violet-400 ring-offset-1" : ""}
        hover:shadow-xl hover:scale-[1.02]`}
      style={{ minWidth: 450, maxWidth: 550 }}
      onClick={(e) => e.stopPropagation()}
    >
      <Handle
        type="target"
        position={Position.Left}
        className="!w-4 !h-4 !bg-white !border-2 !shadow-md transition-transform hover:scale-125"
        style={{ borderColor: colors.handle, left: -8 }}
      />
      <Handle
        type="source"
        position={Position.Right}
        className="!w-4 !h-4 !bg-white !border-2 !shadow-md transition-transform hover:scale-125"
        style={{ borderColor: colors.handle, right: -8 }}
      />

      {data.isOverride && (
        <div className="absolute -top-3 -right-2 px-2 py-0.5 text-[10px] font-bold bg-gradient-to-r from-rose-500 to-pink-500 text-white rounded-full shadow-lg flex items-center gap-1 z-10">
          <Edit3 className="w-2.5 h-2.5" />
          OVERRIDE
        </div>
      )}

      {data.isMappedToContext && !data.isOverride && (
        <div className="absolute -top-3 -right-2 px-2 py-0.5 text-[10px] font-bold bg-gradient-to-r from-violet-500 to-purple-500 text-white rounded-full shadow-lg flex items-center gap-1 z-10">
          <Database className="w-2.5 h-2.5" />
          CONTEXT
        </div>
      )}

      <div className="absolute -top-3 -left-2 px-2 py-0.5 text-[10px] font-bold bg-gradient-to-r from-blue-500 to-cyan-500 text-white rounded-full shadow-lg flex items-center gap-1 z-10">
        <Layers className="w-2.5 h-2.5" />
        ARRAY
      </div>

      <div
        className={`px-4 py-3 bg-gradient-to-r ${colors.gradient} rounded-t-lg`}
      >
        <div className="flex items-center justify-between">
          {isEditing ? (
            <input
              type="text"
              value={editKey}
              onChange={(e) => setEditKey(e.target.value)}
              onBlur={handleRename}
              onKeyDown={(e) => e.key === "Enter" && handleRename()}
              className="flex-1 text-sm font-semibold bg-white border-2 border-purple-300 rounded-lg px-2 py-1 focus:outline-none focus:border-purple-500"
              autoFocus
            />
          ) : (
            <div className="flex items-center gap-2 w-full">
              <span
                className="text-sm font-bold text-white cursor-text hover:text-purple-200"
                onDoubleClick={() => setIsEditing(true)}
                title="Double-click to rename"
              >
                {data.renamedTo || data.key}
              </span>
              <span className="text-[10px] px-2 py-0.5 bg-white/20 rounded-full text-white font-medium ml-auto">
                {flattenedItems.length} items ({selectedItems.size} selected)
              </span>
            </div>
          )}
        </div>
      </div>

      <div className="px-4 py-3 space-y-2 max-h-96 overflow-y-auto">
        {flattenedItems.map((item) => (
          <div
            key={item.uniqueId}
            className={`bg-white rounded-lg p-3 border-2 transition-all ${
              selectedItems.has(item.uniqueId)
                ? "border-rose-400 shadow-lg ring-2 ring-rose-200"
                : "border-gray-200 shadow-sm hover:shadow-md"
            }`}
          >
            <div className="flex items-center gap-2 mb-2">
              <input
                type="checkbox"
                checked={selectedItems.has(item.uniqueId)}
                onChange={(e) => {
                  e.stopPropagation();
                  toggleItemSelection(
                    item.uniqueId,
                    item.path,
                    item.key,
                    item.value,
                  );
                }}
                onClick={(e) => e.stopPropagation()}
                className="w-4 h-4 text-rose-600 rounded border-gray-300 focus:ring-rose-500 cursor-pointer"
              />
              <span className="text-[10px] text-gray-400 font-medium">
                {item.key}
              </span>
              {selectedItems.has(item.uniqueId) && (
                <span className="text-[8px] px-1.5 py-0.5 bg-rose-100 text-rose-600 rounded-full ml-auto">
                  Selected
                </span>
              )}
            </div>
            <div className="pl-6">
              <div className="flex items-center gap-2 text-sm">
                <span className="font-mono text-gray-600 min-w-[100px] font-medium">
                  Value:
                </span>
                <input
                  type="text"
                  value={item.value}
                  onChange={(e) => {
                    handleValueChange(
                      item.parentIndex,
                      item.subIndex,
                      item.key,
                      e.target.value,
                    );
                    // Update the selected item's value if it's selected
                    if (selectedItems.has(item.uniqueId)) {
                      const newSelected = new Map(selectedItems);
                      newSelected.set(item.uniqueId, {
                        ...newSelected.get(item.uniqueId)!,
                        value: e.target.value,
                      });
                      setSelectedItems(newSelected);
                    }
                  }}
                  onClick={(e) => e.stopPropagation()}
                  className="flex-1 text-gray-900 font-medium bg-gray-50 px-2 py-1 rounded border border-gray-200 focus:border-purple-400 focus:outline-none focus:ring-1 focus:ring-purple-400"
                  placeholder="Enter value..."
                />
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="absolute -bottom-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity z-20">
        <button
          onClick={() => setIsEditing(true)}
          className="p-1.5 bg-white rounded-full shadow-lg hover:bg-violet-100 text-violet-600 border border-violet-200"
          title="Rename array"
        >
          <Tag className="w-3 h-3" />
        </button>
      </div>
    </div>
  );
}

function FieldNode({ data, selected }: NodeProps<FieldData>) {
  const [isEditing, setIsEditing] = useState(false);
  const [editKey, setEditKey] = useState(data.renamedTo || data.key);
  const [editValue, setEditValue] = useState(
    data.editedValue !== undefined
      ? String(data.editedValue)
      : data.value !== undefined
        ? String(data.value)
        : "",
  );
  const [isEditingValue, setIsEditingValue] = useState(false);
  const colors = categoryColors[data.category];

  const handleRename = () => {
    if (editKey.trim() && editKey !== data.key) {
      data.renamedTo = editKey;
    }
    setIsEditing(false);
  };

  const handleValueSave = () => {
    data.editedValue = editValue;
    setIsEditingValue(false);
  };

  const handleDelete = () => {
    if (data.onDelete) {
      data.onDelete(data.id);
    }
  };
  const displayCategory = data.isOverride
    ? "override"
    : data.isMappedToContext
      ? "context"
      : data.category;
  const displayColors = categoryColors[displayCategory] || colors;

  return (
    <div
      className={`group relative rounded-xl border-2 shadow-lg transition-all duration-200 cursor-grab active:cursor-grabbing backdrop-blur-sm
        ${displayColors.light} ${displayColors.border}
        ${selected ? "ring-2 ring-purple-500 ring-offset-2 shadow-xl scale-105" : ""}
        ${data.isOverride ? "ring-2 ring-rose-400 ring-offset-1" : ""}
        ${data.isMappedToContext ? "ring-2 ring-violet-400 ring-offset-1" : ""}
        hover:shadow-xl hover:scale-[1.02]`}
      style={{ minWidth: 200, maxWidth: 280 }}
    >
      <Handle
        type="target"
        position={Position.Left}
        className="!w-4 !h-4 !bg-white !border-2 !shadow-md transition-transform hover:scale-125"
        style={{ borderColor: displayColors.handle, left: -8 }}
      />
      <Handle
        type="source"
        position={Position.Right}
        className="!w-4 !h-4 !bg-white !border-2 !shadow-md transition-transform hover:scale-125"
        style={{ borderColor: displayColors.handle, right: -8 }}
      />

      {data.isOverride && (
        <div className="absolute -top-3 -right-2 px-2 py-0.5 text-[10px] font-bold bg-gradient-to-r from-rose-500 to-pink-500 text-white rounded-full shadow-lg flex items-center gap-1 z-10">
          <Edit3 className="w-2.5 h-2.5" />
          OVERRIDE
        </div>
      )}

      {data.isMappedToContext && !data.isOverride && (
        <div className="absolute -top-3 -right-2 px-2 py-0.5 text-[10px] font-bold bg-gradient-to-r from-violet-500 to-purple-500 text-white rounded-full shadow-lg flex items-center gap-1 z-10">
          <Database className="w-2.5 h-2.5" />
          CONTEXT
        </div>
      )}

      {data.renamedTo && data.renamedTo !== data.originalKey && (
        <div className="absolute -top-3 left-2 px-2 py-0.5 text-[10px] font-bold bg-gradient-to-r from-amber-500 to-orange-500 text-white rounded-full shadow-lg flex items-center gap-1 z-10">
          <Tag className="w-2.5 h-2.5" />
          RENAMED
        </div>
      )}

      {data.editedValue !== undefined && data.editedValue !== data.value && (
        <div className="absolute -top-3 left-2 px-2 py-0.5 text-[10px] font-bold bg-gradient-to-r from-green-500 to-emerald-500 text-white rounded-full shadow-lg flex items-center gap-1 z-10">
          <Save className="w-2.5 h-2.5" />
          EDITED
        </div>
      )}

      <div
        className={`px-3 py-2 bg-gradient-to-r ${displayColors.gradient} rounded-t-lg`}
      >
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-bold uppercase tracking-wider text-white">
            {data.category}
          </span>
          <span className="text-[10px] px-2 py-0.5 bg-white/20 rounded-full text-white font-medium">
            {data.type}
          </span>
        </div>
      </div>

      <div className="px-3 py-3">
        {isEditing ? (
          <div className="flex gap-1 mb-2">
            <input
              type="text"
              value={editKey}
              onChange={(e) => setEditKey(e.target.value)}
              onBlur={handleRename}
              onKeyDown={(e) => e.key === "Enter" && handleRename()}
              className="flex-1 text-sm font-semibold bg-white border-2 border-purple-300 rounded-lg px-2 py-1 focus:outline-none focus:border-purple-500"
              autoFocus
            />
          </div>
        ) : (
          <div
            className="text-sm font-bold text-gray-800 truncate cursor-text hover:text-purple-700 transition-colors"
            onDoubleClick={() => setIsEditing(true)}
            title={`Double-click to rename\nOriginal: ${data.originalKey}${data.renamedTo ? `\nRenamed: ${data.renamedTo}` : ""}`}
          >
            {data.renamedTo || data.key}
          </div>
        )}

        {data.renamedTo && data.renamedTo !== data.originalKey && (
          <div className="text-[10px] text-gray-400 font-mono mt-1 flex items-center gap-1">
            <ArrowRight className="w-2.5 h-2.5" />
            from: {data.originalKey}
          </div>
        )}

        {data.contextKey && (
          <div className="text-[10px] text-violet-600 font-mono mt-1 flex items-center gap-1 bg-violet-50 px-1.5 py-0.5 rounded">
            <Database className="w-2.5 h-2.5" />
            stored as: {data.contextKey}
          </div>
        )}

        {/* Editable Value Field */}
        <div className="mt-2">
          <div className="text-[10px] text-gray-500 font-medium mb-1">
            Value:
          </div>
          {isEditingValue ? (
            <div className="flex gap-1">
              <input
                type="text"
                value={editValue}
                onChange={(e) => setEditValue(e.target.value)}
                onBlur={handleValueSave}
                onKeyDown={(e) => e.key === "Enter" && handleValueSave()}
                className="flex-1 text-xs bg-white border-2 border-green-300 rounded-lg px-2 py-1 focus:outline-none focus:border-green-500 font-mono"
                autoFocus
              />
              <button
                onClick={handleValueSave}
                className="p-1 bg-green-100 text-green-600 rounded hover:bg-green-200"
              >
                <Check className="w-3 h-3" />
              </button>
            </div>
          ) : (
            <div
              className="text-xs font-mono bg-gray-50 px-2 py-1 rounded border border-gray-200 cursor-text hover:border-green-300 flex items-center justify-between group/value"
              onDoubleClick={() => setIsEditingValue(true)}
              title="Double-click to edit value"
            >
              <span className="truncate text-gray-700">
                {data.editedValue !== undefined
                  ? String(data.editedValue).slice(0, 30)
                  : data.value !== undefined
                    ? String(data.value).slice(0, 30)
                    : "(empty)"}
                {(data.editedValue !== undefined
                  ? String(data.editedValue).length > 30
                  : data.value !== undefined
                    ? String(data.value).length > 30
                    : false) && "..."}
              </span>
              <Edit3 className="w-3 h-3 text-gray-400 opacity-0 group-value-hover:opacity-100 transition-opacity" />
            </div>
          )}
        </div>

        {/* Show original value if edited */}
        {data.editedValue !== undefined &&
          data.editedValue !== data.value &&
          data.value !== undefined && (
            <div className="text-[9px] text-gray-400 font-mono mt-1 line-through opacity-60">
              original: {String(data.value).slice(0, 20)}
              {String(data.value).length > 20 ? "..." : ""}
            </div>
          )}
      </div>

      <div className="absolute -bottom-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity z-20">
        <button
          onClick={() => setIsEditing(true)}
          className="p-1.5 bg-white rounded-full shadow-lg hover:bg-violet-100 text-violet-600 border border-violet-200"
          title="Rename field"
        >
          <Tag className="w-3 h-3" />
        </button>
        <button
          onClick={() => setIsEditingValue(true)}
          className="p-1.5 bg-white rounded-full shadow-lg hover:bg-green-100 text-green-600 border border-green-200"
          title="Edit value"
        >
          <Edit3 className="w-3 h-3" />
        </button>
        <button
          onClick={() => handleDelete()}
          className="p-1.5 bg-white rounded-full shadow-lg hover:bg-red-100 text-red-600 border border-red-200"
          title="Delete value"
        >
          <Trash2 className="w-3 h-3" />
        </button>
      </div>
    </div>
  );
}

interface ContextFieldMapping {
  originalKey: string;
  displayName: string;
}

interface ContextStorageNodeData {
  fields: ContextFieldMapping[];
  label: string;
  onFieldRename?: (originalKey: string, newName: string) => void;
  onFieldRemove?: (originalKey: string) => void;
}

function ContextStorageNode({ data }: NodeProps<ContextStorageNodeData>) {
  const [editingField, setEditingField] = useState<string | null>(null);
  const [editValue, setEditValue] = useState("");

  const handleStartEdit = (field: ContextFieldMapping) => {
    setEditingField(field.originalKey);
    setEditValue(field.displayName);
  };

  const handleSaveEdit = (originalKey: string) => {
    if (editValue.trim() && data.onFieldRename) {
      data.onFieldRename(originalKey, editValue.trim());
    }
    setEditingField(null);
    setEditValue("");
  };

  const handleCancelEdit = () => {
    setEditingField(null);
    setEditValue("");
  };

  return (
    <div className="relative px-6 py-4 bg-gradient-to-br from-violet-50 to-purple-100 rounded-2xl border-2 border-dashed border-violet-400 shadow-xl min-w-[250px]">
      <Handle
        type="target"
        position={Position.Left}
        id="left"
        className="!w-5 !h-5 !bg-violet-500 !border-3 !border-white !shadow-lg"
        style={{ left: -10 }}
      />
      <Handle
        type="target"
        position={Position.Right}
        id="right"
        className="!w-5 !h-5 !bg-violet-500 !border-3 !border-white !shadow-lg"
        style={{ right: -10 }}
      />

      <div className="flex items-center gap-3 mb-3">
        <div className="w-10 h-10 bg-gradient-to-br from-violet-500 to-purple-600 rounded-xl flex items-center justify-center shadow-lg">
          <Database className="w-5 h-5 text-white" />
        </div>
        <div>
          <div className="text-sm font-bold text-violet-800">{data.label}</div>
          <div className="text-xs text-violet-500">
            Connect response fields here
          </div>
        </div>
      </div>

      {data.fields.length > 0 ? (
        <div className="space-y-1.5 mt-3">
          {data.fields.map((field) => (
            <div
              key={field.originalKey}
              className="group flex items-center gap-2 px-3 py-1.5 bg-white rounded-lg shadow-sm text-xs"
            >
              <Zap className="w-3 h-3 text-violet-500 flex-shrink-0" />
              {editingField === field.originalKey ? (
                <div className="flex-1 flex items-center gap-1">
                  <input
                    type="text"
                    value={editValue}
                    onChange={(e) => setEditValue(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") handleSaveEdit(field.originalKey);
                      if (e.key === "Escape") handleCancelEdit();
                    }}
                    className="flex-1 px-1.5 py-0.5 text-xs font-mono border border-violet-300 rounded focus:outline-none focus:border-violet-500"
                    autoFocus
                  />
                  <button
                    onClick={() => handleSaveEdit(field.originalKey)}
                    className="p-0.5 text-green-600 hover:bg-green-50 rounded"
                  >
                    <Check className="w-3 h-3" />
                  </button>
                  <button
                    onClick={handleCancelEdit}
                    className="p-0.5 text-gray-500 hover:bg-gray-100 rounded"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              ) : (
                <>
                  <span
                    className="font-mono text-gray-700 flex-1 truncate"
                    title={`Original: ${field.originalKey}`}
                  >
                    {field.displayName}
                  </span>
                  {field.displayName !== field.originalKey && (
                    <span
                      className="text-[9px] text-violet-400 font-mono truncate max-w-[60px]"
                      title={field.originalKey}
                    >
                      ← {field.originalKey}
                    </span>
                  )}
                  <div className="opacity-0 group-hover:opacity-100 flex items-center gap-0.5 transition-opacity">
                    <button
                      onClick={() => handleStartEdit(field)}
                      className="p-0.5 text-violet-600 hover:bg-violet-100 rounded"
                      title="Edit name"
                    >
                      <Edit3 className="w-3 h-3" />
                    </button>
                    {data.onFieldRemove && (
                      <button
                        onClick={() => data.onFieldRemove?.(field.originalKey)}
                        className="p-0.5 text-rose-500 hover:bg-rose-50 rounded"
                        title="Remove field"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    )}
                  </div>
                </>
              )}
            </div>
          ))}
        </div>
      ) : (
        <div className="text-xs text-violet-400 italic mt-2 text-center py-2">
          Drag response fields here to store in context
        </div>
      )}
    </div>
  );
}

// ============ Override Collection Node ============
interface OverrideCollectionNodeData {
  fields: OverrideFieldConfig[];
  label: string;
  onFieldEdit?: (field: OverrideFieldConfig) => void;
  onFieldRemove?: (actualMapping: string) => void;
}

function OverrideCollectionNode({
  data,
}: NodeProps<OverrideCollectionNodeData>) {
  return (
    <div className="relative px-6 py-4 bg-gradient-to-br from-rose-50 to-pink-100 rounded-2xl border-2 border-dashed border-rose-400 shadow-xl min-w-[280px]">
      <Handle
        type="source"
        position={Position.Left}
        id="left"
        className="!w-5 !h-5 !bg-rose-500 !border-3 !border-white !shadow-lg"
        style={{ left: -10 }}
      />
      <Handle
        type="source"
        position={Position.Right}
        id="right"
        className="!w-5 !h-5 !bg-rose-500 !border-3 !border-white !shadow-lg"
        style={{ right: -10 }}
      />

      <div className="flex items-center gap-3 mb-3">
        <div className="w-10 h-10 bg-gradient-to-br from-rose-500 to-pink-600 rounded-xl flex items-center justify-center shadow-lg">
          <Shield className="w-5 h-5 text-white" />
        </div>
        <div>
          <div className="text-sm font-bold text-rose-800">{data.label}</div>
          <div className="text-xs text-rose-500">
            User input fields at runtime
          </div>
        </div>
      </div>

      {data.fields.length > 0 ? (
        <div className="space-y-2 mt-3">
          {data.fields.map((field) => (
            <div
              key={field.actual_mapping}
              className="group bg-white rounded-lg shadow-sm text-xs overflow-hidden hover:shadow-md transition-shadow"
            >
              <div className="flex items-center gap-2 px-3 py-2 border-b border-gray-100">
                <Edit3 className="w-3 h-3 text-rose-500 flex-shrink-0" />
                <span className="font-semibold text-gray-800 flex-1 truncate">
                  {field.field}
                </span>
                <span className="px-1.5 py-0.5 bg-rose-100 text-rose-600 rounded text-[10px] font-medium">
                  {field.type}
                </span>
                <div className="opacity-0 group-hover:opacity-100 flex items-center gap-0.5 transition-opacity">
                  {data.onFieldEdit && (
                    <button
                      onClick={() => data.onFieldEdit?.(field)}
                      className="p-0.5 text-rose-600 hover:bg-rose-100 rounded"
                      title="Edit configuration"
                    >
                      <Edit3 className="w-3 h-3" />
                    </button>
                  )}
                  {data.onFieldRemove && (
                    <button
                      onClick={() => data.onFieldRemove?.(field.actual_mapping)}
                      className="p-0.5 text-rose-500 hover:bg-rose-50 rounded"
                      title="Remove field"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  )}
                </div>
              </div>
              <div className="px-3 py-1.5 bg-gray-50 space-y-0.5">
                <div className="flex items-center gap-1 text-[10px] text-gray-500">
                  <span className="font-medium">value:</span>
                  <span className="font-mono text-gray-600">{field.value}</span>
                </div>
                <div className="flex items-center gap-1 text-[10px] text-gray-500">
                  <span className="font-medium">actual_mapping:</span>
                  <span className="font-mono text-gray-600">
                    {field.actual_mapping}
                  </span>
                </div>
                <div className="flex items-center gap-2 text-[10px] text-gray-500">
                  {field.min_length !== undefined && (
                    <span>min: {field.min_length}</span>
                  )}
                  {field.max_length !== undefined && (
                    <span>max: {field.max_length}</span>
                  )}
                  {field.pattern && (
                    <span className="px-1 py-0.5 bg-amber-100 text-amber-700 rounded">
                      {field.pattern}
                    </span>
                  )}
                  {field.required && (
                    <span className="px-1 py-0.5 bg-red-100 text-red-600 rounded">
                      required
                    </span>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-xs text-rose-400 italic mt-2 text-center py-2">
          Click &quot;Mark Override&quot; on selected request fields
        </div>
      )}
    </div>
  );
}

const nodeTypes = {
  fieldNode: FieldNode,
  arrayObjectNode: ArrayObjectNode,
  contextStorage: ContextStorageNode,
  overrideCollection: OverrideCollectionNode,
  contextTimeline: ContextTimelineNode,
  stepIndicator: StepIndicatorNode,
  inheritedField: InheritedFieldNode,
};

// ============ Main Component ============
interface WorkflowMindMapProps {
  parsedRequest?: {
    method: string;
    url: string;
    headers: Record<string, string>;
    body: Record<string, unknown> | null;
  };
  parsedResponse?: Record<string, unknown> | null;
  stepName?: string;
  stepIndex?: number;
  inheritedContext?: Record<string, unknown>;
  initialContextMappings?: Record<string, string>;
  initialOverrideConfigs?: Record<string, OverrideFieldConfig>;
  onCanvasStateChange?: (state: {
    contextFieldMappings: Record<string, string>;
    overrideFieldConfigs: Record<string, OverrideFieldConfig>;
    successMapper: any;
  }) => void;
  onManualRequestAdd?: (request: {
    method: string;
    url: string;
    headers: Record<string, string>;
    body: Record<string, unknown> | null;
  }) => void;
  onManualResponseAdd?: (response: Record<string, unknown>) => void;
  onRequestValueEdit?: (path: string, newValue: string) => void; // New callback for value edits
  onRequestDelete?: (path: string) => void; // Add this
  onResponseDelete?: (path: string) => void;
}

// ============ Override Field Configuration Modal ============
interface OverrideFieldModalProps {
  isOpen: boolean;
  field: OverrideFieldConfig | null;
  onSave: (field: OverrideFieldConfig) => void;
  onClose: () => void;
}

function OverrideFieldModal({
  isOpen,
  field,
  onSave,
  onClose,
}: OverrideFieldModalProps) {
  const [formData, setFormData] = useState<OverrideFieldConfig>({
    field: "",
    value: "",
    actual_mapping: "",
    type: "string",
    required: true,
  });

  useEffect(() => {
    if (field) {
      setFormData(field);
    }
  }, [field]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({
      ...formData,
      value: `${formData.value}`,
    });
  };

  return (
    <div
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-bold text-gray-800">
            {field ? "Edit Override Field" : "Configure Override Field"}
          </h3>
          <button
            onClick={onClose}
            className="p-1 hover:bg-gray-100 rounded-lg"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Field Name (Context Key)
            </label>
            <input
              type="text"
              value={formData.field}
              onChange={(e) =>
                setFormData({ ...formData, field: e.target.value })
              }
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-rose-500 focus:border-transparent"
              placeholder="e.g., bill_ref_no"
              required
            />
            <p className="text-xs text-gray-500 mt-1">
              Name to be stored in context
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Actual Mapping (Request Body Field)
            </label>
            <input
              type="text"
              value={formData.actual_mapping}
              onChange={(e) =>
                setFormData({ ...formData, actual_mapping: e.target.value })
              }
              className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50"
              placeholder="e.g., Bill_Id"
              readOnly
            />
            <p className="text-xs text-gray-500 mt-1">
              Original field path in request body
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Value
            </label>
            <input
              type="text"
              value={`${formData.value}`}
              onChange={(e) =>
                setFormData({ ...formData, value: e.target.value })
              }
              className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50"
              required
            />
            <p className="text-xs text-gray-500 mt-1">
              Auto-generated: request.{"{actual_mapping}"}
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Type
            </label>
            <select
              value={formData.type}
              onChange={(e) =>
                setFormData({ ...formData, type: e.target.value })
              }
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-rose-500 focus:border-transparent"
            >
              <option value="string">string</option>
              <option value="number">number</option>
              <option value="bill">bill</option>
              <option value="account_number">account_number</option>
              <option value="phone">phone</option>
              <option value="email">email</option>
              <option value="amount">amount</option>
            </select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Min Length
              </label>
              <input
                type="number"
                value={formData.min_length ?? ""}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    min_length: e.target.value
                      ? parseInt(e.target.value)
                      : undefined,
                  })
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-rose-500 focus:border-transparent"
                min="0"
                placeholder="e.g., 3"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Max Length
              </label>
              <input
                type="number"
                value={formData.max_length ?? ""}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    max_length: e.target.value
                      ? parseInt(e.target.value)
                      : undefined,
                  })
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-rose-500 focus:border-transparent"
                min="0"
                placeholder="e.g., 20"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Pattern
            </label>
            <select
              value={formData.pattern ?? ""}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  pattern: e.target.value || undefined,
                })
              }
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-rose-500 focus:border-transparent"
            >
              <option value="">None</option>
              <option value="alphabetNumeric">alphabetNumeric</option>
              <option value="numeric">numeric</option>
              <option value="alpha">alpha</option>
              <option value="email">email</option>
              <option value="phone">phone</option>
            </select>
          </div>

          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="required"
              checked={formData.required}
              onChange={(e) =>
                setFormData({ ...formData, required: e.target.checked })
              }
              className="w-4 h-4 text-rose-600 border-gray-300 rounded focus:ring-rose-500"
            />
            <label
              htmlFor="required"
              className="text-sm font-medium text-gray-700"
            >
              Required field
            </label>
          </div>

          <div className="flex items-center justify-end gap-3 pt-4 border-t">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 text-sm font-medium text-white bg-gradient-to-r from-rose-500 to-pink-600 rounded-lg hover:from-rose-600 hover:to-pink-700"
            >
              {field ? "Update Configuration" : "Save Configuration"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function WorkflowMindMapInner({
  parsedRequest,
  parsedResponse,
  stepName,
  stepIndex = 0,
  inheritedContext = {},
  initialContextMappings = {},
  initialOverrideConfigs = {},
  onCanvasStateChange,
  onManualRequestAdd,
  onManualResponseAdd,
  onRequestValueEdit,
  onRequestDelete,
  onResponseDelete,
}: WorkflowMindMapProps) {
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const [contextFieldMappings, setContextFieldMappings] = useState<
    Map<string, string>
  >(() => new Map(Object.entries(initialContextMappings)));

  const [overrideFieldConfigs, setOverrideFieldConfigs] = useState<
    Map<string, OverrideFieldConfig>
  >(() => new Map(Object.entries(initialOverrideConfigs)));

  // Add effect to update when props change (when switching steps)
  useEffect(() => {
    setContextFieldMappings(new Map(Object.entries(initialContextMappings)));
    setOverrideFieldConfigs(new Map(Object.entries(initialOverrideConfigs)));
  }, [initialContextMappings, initialOverrideConfigs]);
  const [selectedNodes, setSelectedNodes] = useState<string[]>([]);
  // const [copied, setCopied] = useState(false);
  // const [layoutMode, setLayoutMode] = useState<LayoutMode>("vertical");
  const [showStepOverview] = useState(true);
  const [showContextPanel, setShowContextPanel] = useState(true);
  const [editingOverrideField, setEditingOverrideField] =
    useState<OverrideFieldConfig | null>(null);
  const [showOverrideModal, setShowOverrideModal] = useState(false);
  const [showManualInputModal, setShowManualInputModal] = useState(false);
  const [manualInputType, setManualInputType] = useState<
    "request" | "response"
  >("request");
  const [manualJsonInput, setManualJsonInput] = useState("");
  const [manualJsonError, setManualJsonError] = useState("");
  // Store edited values for request fields
  const [editedRequestValues, setEditedRequestValues] = useState<
    Map<string, string>
  >(new Map());
  const reactFlowInstance = useReactFlow();
  const [arraySelections, setArraySelections] = useState<
    Map<string, Map<string, { path: string; key: string; value: string }>>
  >(new Map());

  interface ProcessedField {
    path: string;
    value: unknown;
    type: string;
    isArray: boolean;
    arrayIndex?: number;
    isKeyValueArray?: boolean;
    items?: Array<Record<string, unknown>>;
  }

  function processFieldsWithArrays(
    obj: Record<string, unknown>,
    prefix = "",
  ): ProcessedField[] {
    const fields: ProcessedField[] = [];

    Object.entries(obj).forEach(([key, value]) => {
      const currentPath = prefix ? `${prefix}.${key}` : key;

      if (Array.isArray(value)) {
        // Check if it's an array of objects with Sub_Fields (your response structure)
        const hasSubFields =
          value.length > 0 &&
          value.some(
            (item) =>
              item &&
              typeof item === "object" &&
              !Array.isArray(item) &&
              "Sub_Fields" in item,
          );

        if (hasSubFields) {
          // This is an array with Sub_Fields - treat each Sub_Fields item separately
          fields.push({
            path: currentPath,
            value: value,
            type: "array-with-subfields",
            isArray: true,
            isKeyValueArray: false,
            items: value as Array<Record<string, unknown>>,
          });
        }
        // Check if it's an array of objects with Key/Value structure (standard)
        else if (
          value.length > 0 &&
          value.every(
            (item) =>
              item &&
              typeof item === "object" &&
              !Array.isArray(item) &&
              "Key" in item &&
              "Value" in item,
          )
        ) {
          fields.push({
            path: currentPath,
            value: value,
            type: "keyvalue-array",
            isArray: true,
            isKeyValueArray: true,
            items: value as Array<Record<string, unknown>>,
          });
        } else {
          // Regular array
          fields.push({
            path: currentPath,
            value: value,
            type: "array",
            isArray: true,
            isKeyValueArray: false,
          });

          // Process array items
          value.forEach((item, idx) => {
            if (item && typeof item === "object") {
              const itemFields = processFieldsWithArrays(
                item as Record<string, unknown>,
                `${currentPath}[${idx}]`,
              );
              fields.push(...itemFields);
            } else {
              fields.push({
                path: `${currentPath}[${idx}]`,
                value: item,
                type: detectDataType(item),
                isArray: true,
                arrayIndex: idx,
                isKeyValueArray: false,
              });
            }
          });
        }
      } else if (value && typeof value === "object" && value !== null) {
        // Nested object
        const nestedFields = processFieldsWithArrays(
          value as Record<string, unknown>,
          currentPath,
        );
        fields.push(...nestedFields);
      } else {
        // Primitive value
        fields.push({
          path: currentPath,
          value: value,
          type: detectDataType(value),
          isArray: false,
          isKeyValueArray: false,
        });
      }
    });

    return fields;
  }

  const handleManualJsonSubmit = useCallback(() => {
    setManualJsonError("");

    try {
      if (!manualJsonInput.trim()) {
        setManualJsonError("Please enter JSON data");
        return;
      }

      const parsedData = JSON.parse(manualJsonInput);

      if (manualInputType === "request") {
        // Create a basic request structure if only body is provided
        const requestData = {
          method: "POST",
          url: "manual-input",
          headers: {},
          body: parsedData,
        };

        if (onManualRequestAdd) {
          onManualRequestAdd(requestData);
        }
      } else {
        // Handle response data
        if (onManualResponseAdd) {
          onManualResponseAdd(parsedData);
        }
      }

      setShowManualInputModal(false);
      setManualJsonInput("");
    } catch (error) {
      setManualJsonError("Invalid JSON format. Please check your syntax.");
    }
  }, [
    manualJsonInput,
    manualInputType,
    onManualRequestAdd,
    onManualResponseAdd,
  ]);

  const contextFields = useMemo(
    () => Array.from(contextFieldMappings.keys()),
    [contextFieldMappings],
  );

  const overrideFields = useMemo(
    () => Array.from(overrideFieldConfigs.keys()),
    [overrideFieldConfigs],
  );

  const inheritedFields = useMemo(() => {
    return Object.entries(inheritedContext).map(([key, value]) => ({
      key,
      value,
      type: detectDataType(value),
    }));
  }, [inheritedContext]);
  // Use a ref to track if this is the first render
  const isFirstRender = useRef(true);
  const prevStateRef = useRef<string>("");
  const [successMapperConfig, setSuccessMapperConfig] =
    useState<SuccessMapperItem[] | null>(null);

  useEffect(() => {
    if (!onCanvasStateChange) return;

    // Skip the first render to prevent infinite loop
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }

    // Create current state string for comparison
    const currentState = JSON.stringify({
      contextFieldMappings: Object.fromEntries(contextFieldMappings),
      overrideFieldConfigs: Object.fromEntries(overrideFieldConfigs),
    });

    // Only call if state actually changed
    if (prevStateRef.current !== currentState) {
      prevStateRef.current = currentState;

      const timeoutId = setTimeout(() => {
        onCanvasStateChange({
          contextFieldMappings: Object.fromEntries(contextFieldMappings),
          overrideFieldConfigs: Object.fromEntries(overrideFieldConfigs),
          successMapper: successMapperConfig,
        });
      }, 300);

      return () => clearTimeout(timeoutId);
    }
  }, [contextFieldMappings, overrideFieldConfigs, onCanvasStateChange]);

  const onSelectionChange = useCallback(
    ({ nodes: selectedNodesList }: { nodes: Node[] }) => {
      setSelectedNodes(selectedNodesList.map((n) => n.id));
    },
    [],
  );

  const handleArraySelectionChange = useCallback(
    (
      nodeId: string,
      selections: Map<string, { path: string; key: string; value: string }>,
    ) => {
      setArraySelections((prev) => {
        const updated = new Map(prev);
        if (selections.size === 0) {
          updated.delete(nodeId);
        } else {
          updated.set(nodeId, selections);
        }
        return updated;
      });
    },
    [],
  );

  const handleArrayValueEdit = useCallback(
    (path: string, newValue: string) => {
      setEditedRequestValues((prev) => {
        const updated = new Map(prev);
        updated.set(path, newValue);
        return updated;
      });

      if (onRequestValueEdit) {
        onRequestValueEdit(path, newValue);
      }
    },
    [onRequestValueEdit],
  );

  // In WorkflowMindMapInner, update the delete handlers
  const handleDeleteRequestNode = useCallback(
    (nodeId: string) => {
      const fieldKey = nodeId.replace("request-", "");

      // Call the parent's delete callback if provided
      if (onRequestDelete) {
        onRequestDelete(fieldKey);
      }

      // Remove the node from visualization
      setNodes((nds) => nds.filter((node) => node.id !== nodeId));

      // Remove any edges connected to this node
      setEdges((eds) =>
        eds.filter((edge) => edge.source !== nodeId && edge.target !== nodeId),
      );

      // Clean up context mappings, etc.
      if (contextFieldMappings.has(fieldKey)) {
        setContextFieldMappings((prev) => {
          const updated = new Map(prev);
          updated.delete(fieldKey);
          return updated;
        });
      }

      if (overrideFieldConfigs.has(fieldKey)) {
        setOverrideFieldConfigs((prev) => {
          const updated = new Map(prev);
          updated.delete(fieldKey);
          return updated;
        });
      }

      if (editedRequestValues.has(fieldKey)) {
        setEditedRequestValues((prev) => {
          const updated = new Map(prev);
          updated.delete(fieldKey);
          return updated;
        });
      }

      toast.success(`Request field "${fieldKey}" deleted`);
    },
    [
      onRequestDelete,
      contextFieldMappings,
      overrideFieldConfigs,
      editedRequestValues,
      setNodes,
      setEdges,
    ],
  );

  // Delete handler for response nodes - FIXED
  const handleDeleteResponseNode = useCallback(
    (nodeId: string) => {
      // Extract field key and path
      const fieldKey = nodeId.replace("response-", "");
      if (onResponseDelete) {
        onResponseDelete(fieldKey);
      }

      // Remove the node from visualization
      setNodes((nds) => nds.filter((node) => node.id !== nodeId));

      // Remove any edges connected to this node
      setEdges((eds) =>
        eds.filter((edge) => edge.source !== nodeId && edge.target !== nodeId),
      );

      // If this field was in context mappings, remove it
      if (contextFieldMappings.has(fieldKey)) {
        setContextFieldMappings((prev) => {
          const updated = new Map(prev);
          updated.delete(fieldKey);
          return updated;
        });
      }

      // Remove from array selections if exists
      if (arraySelections.has(nodeId)) {
        setArraySelections((prev) => {
          const updated = new Map(prev);
          updated.delete(nodeId);
          return updated;
        });
      }

      if (editedRequestValues.has(fieldKey)) {
        setEditedRequestValues((prev) => {
          const updated = new Map(prev);
          updated.delete(fieldKey);
          return updated;
        });
      }

      toast.success(`Response field "${fieldKey}" deleted from body`);
    },
    [
      parsedResponse,
      onManualResponseAdd,
      contextFieldMappings,
      arraySelections,
      setNodes,
      setEdges,
    ],
  );
  // Add to your state in WorkflowMindMapInner
  const [showSuccessMapperModal, setShowSuccessMapperModal] = useState(false);

  // Add callback for saving success mapper
  const handleSaveSuccessMapper = useCallback(
    (config: SuccessMapperItem[]) => {
      setSuccessMapperConfig(config);
      console.log(config);
      
      // Notify parent component about the success mapper config
      if (onCanvasStateChange) {
        onCanvasStateChange({
          contextFieldMappings: Object.fromEntries(contextFieldMappings),
          overrideFieldConfigs: Object.fromEntries(overrideFieldConfigs),
          successMapper: config, // Add this to the state
        });
      }

      toast.success("Success mapper configured!");
    },
    [contextFieldMappings, overrideFieldConfigs, onCanvasStateChange],
  );
  useEffect(() => {
    const allNodes: Node[] = [];
    const allEdges: Edge[] = [];
    let requestY = 100;
    let responseY = 100;

    const positions = {
      request: { x: 50 },
      response: { x: 700 },
    };

    if (stepName) {
      allNodes.push({
        id: "step-indicator",
        type: "stepIndicator",
        position: { x: 350, y: 10 },
        data: {
          stepName,
          stepIndex,
          status: parsedResponse
            ? "completed"
            : parsedRequest
              ? "in_progress"
              : "pending",
          isActive: true,
        },
      });
    }

    // REQUEST NODES
    if (parsedRequest?.body && typeof parsedRequest.body === "object") {
      const requestFields = processFieldsWithArrays(
        parsedRequest.body as Record<string, unknown>,
      );

      requestFields.forEach((field) => {
        const isOverride = overrideFields.includes(field.path);

        if (
          (field.isKeyValueArray || field.type === "array-with-subfields") &&
          field.items
        ) {
          allNodes.push({
            id: `request-${field.path}`,
            type: "arrayObjectNode",
            position: {
              x: positions.request.x,
              y: requestY,
            },
            data: {
              id: `request-${field.path}`,
              key: field.path,
              originalKey: field.path,
              items: field.items,
              type: "array-object",
              category: "request",
              isOverride,
              selectedItems:
                arraySelections.get(`request-${field.path}`) || new Map(),
              onSelectionChange: handleArraySelectionChange,
              onValueEdit: handleArrayValueEdit,
              onDelete: handleDeleteRequestNode, // Add delete handler
            },
          });
          requestY += 200 + field.items.length * 30;
        } else if (
          field.isArray &&
          field.arrayIndex === undefined &&
          !field.isKeyValueArray
        ) {
          allNodes.push({
            id: `request-${field.path}`,
            type: "fieldNode",
            position: {
              x: positions.request.x,
              y: requestY,
            },
            data: {
              id: `request-${field.path}`,
              key: field.path,
              originalKey: field.path,
              value: Array.isArray(field.value)
                ? `Array(${field.value.length})`
                : "Array",
              type: "array",
              category: "request",
              isOverride,
              isArray: true,
              editedValue: editedRequestValues.get(field.path),
              onDelete: handleDeleteRequestNode, // Add delete handler
            },
          });
          requestY += 120;
        } else if (!field.isArray) {
          allNodes.push({
            id: `request-${field.path}`,
            type: "fieldNode",
            position: {
              x: positions.request.x,
              y: requestY,
            },
            data: {
              id: `request-${field.path}`,
              key: field.path,
              originalKey: field.path,
              value: field.value,
              type: field.type,
              category: "request",
              isOverride,
              editedValue: editedRequestValues.get(field.path),
              onDelete: handleDeleteRequestNode, // Add delete handler
            },
          });
          requestY += 100;
        }
      });
    }

    // RESPONSE NODES
    if (parsedResponse && typeof parsedResponse === "object") {
      const responseFields = processFieldsWithArrays(
        parsedResponse as Record<string, unknown>,
      );

      responseFields.forEach((field) => {
        const isMappedToContext = contextFields.includes(field.path);

        if (
          (field.isKeyValueArray || field.type === "array-with-subfields") &&
          field.items
        ) {
          allNodes.push({
            id: `response-${field.path}`,
            type: "arrayObjectNode",
            position: {
              x: positions.response.x,
              y: responseY,
            },
            data: {
              id: `response-${field.path}`,
              key: field.path,
              originalKey: field.path,
              items: field.items,
              type: "array-object",
              category: "response",
              isMappedToContext,
              contextKey: isMappedToContext ? field.path : undefined,
              selectedItems:
                arraySelections.get(`response-${field.path}`) || new Map(),
              onSelectionChange: handleArraySelectionChange,
              onDelete: handleDeleteResponseNode, // Add delete handler
            },
          });
          responseY += 200 + field.items.length * 30;
        } else if (
          field.isArray &&
          field.arrayIndex === undefined &&
          !field.isKeyValueArray
        ) {
          allNodes.push({
            id: `response-${field.path}`,
            type: "fieldNode",
            position: {
              x: positions.response.x,
              y: responseY,
            },
            data: {
              id: `response-${field.path}`,
              key: field.path,
              originalKey: field.path,
              value: Array.isArray(field.value)
                ? `Array(${field.value.length})`
                : "Array",
              type: "array",
              category: "response",
              isMappedToContext,
              contextKey: isMappedToContext ? field.path : undefined,
              isArray: true,
              onDelete: handleDeleteResponseNode, // Add delete handler
            },
          });
          responseY += 120;
        } else if (!field.isArray) {
          allNodes.push({
            id: `response-${field.path}`,
            type: "fieldNode",
            position: {
              x: positions.response.x,
              y: responseY,
            },
            data: {
              id: `response-${field.path}`,
              key: field.path,
              originalKey: field.path,
              value: field.value,
              type: field.type,
              category: "response",
              isMappedToContext,
              contextKey: isMappedToContext ? field.path : undefined,
              onDelete: handleDeleteResponseNode, // Add delete handler
            },
          });
          responseY += 100;
        }
      });
    }

    allNodes.push({
      id: "context-storage",
      type: "contextStorage",
      position: { x: 400, y: 50 },
      data: {
        label: "Context Storage",
        fields: Array.from(contextFieldMappings.entries()).map(([k, v]) => ({
          originalKey: k,
          displayName: v,
        })),
        onFieldRename: (originalKey: string, newName: string) => {
          setContextFieldMappings((prev) => {
            const updated = new Map(prev);
            updated.set(originalKey, newName);
            return updated;
          });
        },
        onFieldRemove: (originalKey: string) => {
          setContextFieldMappings((prev) => {
            const updated = new Map(prev);
            updated.delete(originalKey);
            return updated;
          });
          setEdges((eds) =>
            eds.filter(
              (e) =>
                e.source !== `response-${originalKey}` ||
                e.target !== "context-storage",
            ),
          );
        },
      },
    });

    allNodes.push({
      id: "override-collection",
      type: "overrideCollection",
      position: { x: 400, y: 350 },
      data: {
        label: "Override Fields",
        fields: Array.from(overrideFieldConfigs.values()),
        onFieldEdit: (field: OverrideFieldConfig) => {
          setEditingOverrideField(field);
          setShowOverrideModal(true);
        },
        onFieldRemove: (actualMapping: string) => {
          setOverrideFieldConfigs((prev) => {
            const updated = new Map(prev);
            updated.delete(actualMapping);
            return updated;
          });
          setEdges((eds) =>
            eds.filter(
              (e) =>
                e.source !== "override-collection" ||
                e.target !== `request-${actualMapping}`,
            ),
          );
        },
      },
    });

    setNodes(allNodes);

    if (allNodes.length > 0 && nodes.length === 0) {
      setTimeout(() => {
        reactFlowInstance.fitView({ padding: 0.2, duration: 0 });
      }, 100);
    }
  }, [
    parsedRequest,
    parsedResponse,
    contextFieldMappings,
    overrideFieldConfigs,
    stepName,
    stepIndex,
    arraySelections,
    handleArraySelectionChange,
    handleArrayValueEdit,
    editedRequestValues,
  ]);

  const onConnect = useCallback(
    (connection: Connection) => {
      const sourceNode = nodes.find((n) => n.id === connection.source);
      const targetNode = nodes.find((n) => n.id === connection.target);

      if (!sourceNode || !targetNode) return;

      if (
        sourceNode.data.category === "response" &&
        targetNode.id === "context-storage"
      ) {
        const fieldKey = sourceNode.data.originalKey || sourceNode.data.key;
        if (!contextFieldMappings.has(fieldKey)) {
          setContextFieldMappings((prev) => {
            const updated = new Map(prev);
            updated.set(fieldKey, fieldKey);
            return updated;
          });
        }

        const newEdge: Edge = {
          id: `edge-${connection.source}-context-${Date.now()}`,
          source: connection.source!,
          target: "context-storage",
          animated: true,
          style: { stroke: "#8b5cf6", strokeWidth: 3 },
          markerEnd: {
            type: MarkerType.ArrowClosed,
            color: "#8b5cf6",
            width: 20,
            height: 20,
          },
          label: "stores →",
          labelStyle: { fill: "#8b5cf6", fontWeight: 700, fontSize: 11 },
          labelBgStyle: { fill: "white", fillOpacity: 0.95 },
          labelBgPadding: [6, 4] as [number, number],
          labelBgBorderRadius: 6,
        };
        setEdges((eds) => addEdge(newEdge, eds));
        return;
      }

      if (
        sourceNode.id === "override-collection" &&
        targetNode.data.category === "request"
      ) {
        const fieldKey = targetNode.data.originalKey || targetNode.data.key;
        if (!overrideFieldConfigs.has(fieldKey)) {
          const defaultConfig: OverrideFieldConfig = {
            field: fieldKey,
            value: `request.${fieldKey}`,
            actual_mapping: fieldKey,
            type: targetNode.data.type || "string",
            required: true,
          };
          setEditingOverrideField(defaultConfig);
          setShowOverrideModal(true);
        }

        const newEdge: Edge = {
          id: `edge-override-${connection.target}-${Date.now()}`,
          source: "override-collection",
          target: connection.target!,
          animated: true,
          style: { stroke: "#f43f5e", strokeWidth: 3 },
          markerEnd: {
            type: MarkerType.ArrowClosed,
            color: "#f43f5e",
            width: 20,
            height: 20,
          },
          label: "overrides →",
          labelStyle: { fill: "#f43f5e", fontWeight: 700, fontSize: 11 },
          labelBgStyle: { fill: "white", fillOpacity: 0.95 },
          labelBgPadding: [6, 4] as [number, number],
          labelBgBorderRadius: 6,
        };
        setEdges((eds) => addEdge(newEdge, eds));
        return;
      }

      if (
        sourceNode.data.category === "request" &&
        targetNode.data.category === "response"
      ) {
        const newEdge: Edge = {
          id: `edge-${connection.source}-${connection.target}-${Date.now()}`,
          source: connection.source!,
          target: connection.target!,
          animated: true,
          style: { stroke: "#3b82f6", strokeWidth: 2.5 },
          markerEnd: {
            type: MarkerType.ArrowClosed,
            color: "#3b82f6",
            width: 18,
            height: 18,
          },
          label: "maps to",
          labelStyle: { fill: "#3b82f6", fontWeight: 600, fontSize: 10 },
          labelBgStyle: { fill: "white", fillOpacity: 0.9 },
          labelBgPadding: [4, 2] as [number, number],
          labelBgBorderRadius: 4,
        };
        setEdges((eds) => addEdge(newEdge, eds));
        return;
      }

      const newEdge: Edge = {
        id: `edge-${connection.source}-${connection.target}-${Date.now()}`,
        source: connection.source!,
        target: connection.target!,
        animated: true,
        style: { stroke: "#6b7280", strokeWidth: 2 },
        markerEnd: { type: MarkerType.ArrowClosed, color: "#6b7280" },
      };
      setEdges((eds) => addEdge(newEdge, eds));
    },
    [nodes, contextFieldMappings, overrideFieldConfigs, setEdges],
  );

  const handleSaveOverrideField = useCallback((config: OverrideFieldConfig) => {
    setOverrideFieldConfigs((prev) => {
      const updated = new Map(prev);
      updated.set(config.actual_mapping, config);
      return updated;
    });
    setShowOverrideModal(false);
    setEditingOverrideField(null);
  }, []);

  // Handle Mark Override button click
  const handleToggleOverride = useCallback(() => {
    // Get all array nodes that have selected items
    const arrayNodesWithSelections = Array.from(arraySelections.entries())
      .filter(([nodeId, selections]) => {
        const node = nodes.find((n) => n.id === nodeId);
        return node?.data?.category === "request" && selections.size > 0;
      })
      .map(([nodeId]) => nodes.find((n) => n.id === nodeId))
      .filter(Boolean);

    // Get regular selected nodes (non-array nodes)
    const regularSelectedNodes = nodes.filter(
      (n) =>
        selectedNodes.includes(n.id) &&
        n.data?.category === "request" &&
        n.type !== "arrayObjectNode",
    );

    // If nothing is selected, show alert
    if (
      arrayNodesWithSelections.length === 0 &&
      regularSelectedNodes.length === 0
    ) {
      toast.error(
        "Please either:\n1. Check boxes in array items, OR\n2. Select regular request fields",
      );
      return;
    }

    // Handle array nodes with selections - show modal for first selected item
    if (arrayNodesWithSelections.length > 0) {
      arrayNodesWithSelections.forEach((node) => {
        if (!node) return;

        const selections = arraySelections.get(node.id) || new Map();

        // Show modal for the first selected item
        const firstItem = Array.from(selections.values())[0];
        if (firstItem) {
          const defaultConfig: OverrideFieldConfig = {
            field: firstItem.key.toLowerCase().replace(/\s+/g, "_"),
            value: `${firstItem.value}`,
            actual_mapping: firstItem.path,
            type: detectDataType(firstItem.value) || "string",
            required: true,
          };
          setEditingOverrideField(defaultConfig);
          setShowOverrideModal(true);
        }
      });
    }

    // Handle regular selected nodes
    if (regularSelectedNodes.length > 0) {
      regularSelectedNodes.forEach((node) => {
        const fieldKey = node.data.originalKey || node.data.key;

        if (overrideFieldConfigs.has(fieldKey)) {
          // Edit existing override
          const existingConfig = overrideFieldConfigs.get(fieldKey);
          if (existingConfig) {
            setEditingOverrideField(existingConfig);
            setShowOverrideModal(true);
          }
        } else {
          // Create new override
          const defaultConfig: OverrideFieldConfig = {
            field: fieldKey,
            value: `request.${fieldKey}`,
            actual_mapping: fieldKey,
            type: node.data.type || "string",
            required: true,
          };
          setEditingOverrideField(defaultConfig);
          setShowOverrideModal(true);
        }
      });
    }
  }, [nodes, selectedNodes, overrideFieldConfigs, arraySelections]);

  // Handle Store Context button click
  const handleToggleContext = useCallback(() => {
    // Get all array nodes that have selected items (for response arrays)
    const arrayNodesWithSelections = Array.from(arraySelections.entries())
      .filter(([nodeId, selections]) => {
        const node = nodes.find((n) => n.id === nodeId);
        return selections.size > 0;
      })
      .map(([nodeId]) => nodes.find((n) => n.id === nodeId))
      .filter(Boolean);

    // Get regular selected nodes (non-array response nodes)
    const regularSelectedNodes = nodes.filter(
      (n) => selectedNodes.includes(n.id) && n.type !== "arrayObjectNode",
    );

    // If nothing is selected, show alert
    if (
      arrayNodesWithSelections.length === 0 &&
      regularSelectedNodes.length === 0
    ) {
      toast.error(
        "Please either:\n1. Check boxes in response array items, OR\n2. Select regular response fields",
      );
      return;
    }

    // Handle array nodes with selections (response arrays)
    if (arrayNodesWithSelections.length > 0) {
      arrayNodesWithSelections.forEach((node) => {
        if (!node) return;

        const selections = arraySelections.get(node.id) || new Map();

        selections.forEach((item) => {
          if (!contextFieldMappings.has(item.path)) {
            const displayName = item.key.toLowerCase().replace(/\s+/g, "_");

            setContextFieldMappings((prev) => {
              const updated = new Map(prev);
              updated.set(item.path, displayName);
              return updated;
            });

            const newEdge: Edge = {
              id: `edge-${node.id}-${item.path}-context-${Date.now()}`,
              source: node.id,
              target: "context-storage",
              animated: true,
              style: { stroke: "#8b5cf6", strokeWidth: 3 },
              markerEnd: {
                type: MarkerType.ArrowClosed,
                color: "#8b5cf6",
                width: 20,
                height: 20,
              },
              label: `stores ${item.key} →`,
              labelStyle: { fill: "#8b5cf6", fontWeight: 700, fontSize: 11 },
              labelBgStyle: { fill: "white", fillOpacity: 0.95 },
              labelBgPadding: [6, 4] as [number, number],
              labelBgBorderRadius: 6,
            };
            setEdges((eds) => [...eds, newEdge]);
          }
        });
      });
    }

    // Handle regular selected nodes (non-array response fields)
    if (regularSelectedNodes.length > 0) {
      regularSelectedNodes.forEach((node) => {
        const fieldKey = node.data.originalKey || node.data.key;

        if (contextFieldMappings.has(fieldKey)) {
          setContextFieldMappings((prev) => {
            const updated = new Map(prev);
            updated.delete(fieldKey);
            return updated;
          });
          setEdges((eds) =>
            eds.filter(
              (e) => e.source !== node.id || e.target !== "context-storage",
            ),
          );
        } else {
          setContextFieldMappings((prev) => {
            const updated = new Map(prev);
            updated.set(fieldKey, fieldKey);
            return updated;
          });

          const newEdge: Edge = {
            id: `edge-${node.id}-context-${Date.now()}`,
            source: node.id,
            target: "context-storage",
            animated: true,
            style: { stroke: "#8b5cf6", strokeWidth: 3 },
            markerEnd: {
              type: MarkerType.ArrowClosed,
              color: "#8b5cf6",
              width: 20,
              height: 20,
            },
            label: "stores →",
            labelStyle: { fill: "#8b5cf6", fontWeight: 700, fontSize: 11 },
            labelBgStyle: { fill: "white", fillOpacity: 0.95 },
            labelBgPadding: [6, 4] as [number, number],
            labelBgBorderRadius: 6,
          };
          setEdges((eds) => [...eds, newEdge]);
        }
      });
    }
  }, [
    nodes,
    selectedNodes,
    contextFieldMappings,
    arraySelections,
    setEdges,
    setContextFieldMappings,
  ]);

  const isEmpty = nodes.length <= 2;

  return (
    <div className="h-full flex flex-col bg-gradient-to-br from-slate-50 via-gray-50 to-slate-100">
      <div className="flex items-center justify-between px-4 py-2.5 bg-white/90 backdrop-blur-sm border-b shadow-sm">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 px-3 py-1.5 bg-gradient-to-r from-purple-600 to-violet-600 rounded-lg text-white shadow-lg">
            <GitBranch className="w-4 h-4" />
            {stepName && (
              <span className="px-2 py-0.5 bg-white/20 rounded text-xs font-medium">
                {stepName}
              </span>
            )}
          </div>

          <div className="h-6 w-px bg-gray-300" />

          <button
            onClick={handleToggleOverride}
            className="flex items-center gap-1.5 px-3 py-1.5 text-sm bg-gradient-to-r from-rose-100 to-pink-100 text-rose-700 rounded-lg hover:from-rose-200 hover:to-pink-200 transition-colors font-medium border border-rose-200"
            title="Mark selected request fields as override (user input)"
          >
            <Edit3 className="w-4 h-4" />
            Mark Override
          </button>

          <button
            onClick={handleToggleContext}
            className="flex items-center gap-1.5 px-3 py-1.5 text-sm bg-gradient-to-r from-violet-100 to-purple-100 text-violet-700 rounded-lg hover:from-violet-200 hover:to-purple-200 transition-colors font-medium border border-violet-200"
            title="Store selected response fields in context"
          >
            <Database className="w-4 h-4" />
            Store Context
          </button>
        </div>

        <div className="flex items-center gap-2">
          <div className="h-5 w-px bg-gray-200" />

          <button
            onClick={() => {
              setManualInputType("request");
              setShowManualInputModal(true);
              setManualJsonInput("");
              setManualJsonError("");
            }}
            className="flex items-center gap-1.5 px-3 py-1.5 text-sm bg-gradient-to-r from-blue-100 to-blue-200 text-blue-700 rounded-lg hover:from-blue-200 hover:to-blue-300 transition-colors font-medium border border-blue-300"
            title="Manually add request JSON"
          >
            <FileJson className="w-4 h-4" />
            Add Request
          </button>

          <button
            onClick={() => {
              setManualInputType("response");
              setShowManualInputModal(true);
              setManualJsonInput("");
              setManualJsonError("");
            }}
            className="flex items-center gap-1.5 px-3 py-1.5 text-sm bg-gradient-to-r from-emerald-100 to-emerald-200 text-emerald-700 rounded-lg hover:from-emerald-200 hover:to-emerald-300 transition-colors font-medium border border-emerald-300"
            title="Manually add response JSON"
          >
            <FileJson className="w-4 h-4" />
            Add Response
          </button>
          <button
            onClick={() => setShowSuccessMapperModal(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 text-sm bg-gradient-to-r from-green-100 to-emerald-100 text-green-700 rounded-lg hover:from-green-200 hover:to-emerald-200 transition-colors font-medium border border-green-200"
            title="Configure success conditions for this step"
          >
            <CheckCircle2 className="w-4 h-4" />
            Success Mapper
            {successMapperConfig && (
              <span className="ml-1 w-2 h-2 bg-green-500 rounded-full animate-pulse" />
            )}
          </button>
        </div>
      </div>

      <div className="flex-1">
        {isEmpty ? (
          <div className="h-full flex items-center justify-center">
            <div className="text-center max-w-lg p-8 bg-white/90 backdrop-blur-sm rounded-2xl shadow-xl border">
              <GitBranch className="w-16 h-16 mx-auto mb-4 text-purple-300" />
              <p className="text-xl font-semibold text-gray-600">
                No data to visualize
              </p>
              <p className="text-sm text-gray-400 mt-2">
                Parse a cURL command, paste a response, or use the Add
                Request/Response buttons to see fields.
              </p>
            </div>
          </div>
        ) : (
          <ReactFlow
            nodes={nodes}
            edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onConnect={onConnect}
            onSelectionChange={onSelectionChange}
            onEdgeClick={(_, edge) => {
              if (edge.target === "context-storage") {
                const sourceNode = nodes.find((n) => n.id === edge.source);
                if (sourceNode) {
                  const fieldKey =
                    sourceNode.data.originalKey || sourceNode.data.key;
                  setContextFieldMappings((prev) => {
                    const updated = new Map(prev);
                    updated.delete(fieldKey);
                    return updated;
                  });
                }
              }
              if (edge.source === "override-collection") {
                const targetNode = nodes.find((n) => n.id === edge.target);
                if (targetNode) {
                  const fieldKey =
                    targetNode.data.originalKey || targetNode.data.key;
                  setOverrideFieldConfigs((prev) => {
                    const updated = new Map(prev);
                    updated.delete(fieldKey);
                    return updated;
                  });
                }
              }
              setEdges((eds) => eds.filter((e) => e.id !== edge.id));
            }}
            nodeTypes={nodeTypes}
            nodesDraggable={true}
            nodesConnectable={true}
            elementsSelectable={true}
            selectNodesOnDrag={false}
            connectionLineType={ConnectionLineType.SmoothStep}
            connectionLineStyle={{
              stroke: "#8b5cf6",
              strokeWidth: 3,
              strokeDasharray: "8,4",
            }}
            defaultEdgeOptions={{
              animated: true,
              style: { strokeWidth: 2.5 },
            }}
            fitView
            fitViewOptions={{ padding: 0.25 }}
            minZoom={0.1}
            maxZoom={2}
            snapToGrid={true}
            snapGrid={[15, 15]}
            deleteKeyCode={["Backspace", "Delete"]}
          >
            <Background
              variant={BackgroundVariant.Dots}
              gap={25}
              size={2}
              color="#cbd5e1"
            />
            <Controls
              showInteractive={false}
              className="!bg-white/95 !shadow-lg !rounded-xl !border"
            />
            <MiniMap />

            <Panel position="bottom-left" className="!m-4 !ml-10">
              <div className="bg-white/95 backdrop-blur-sm rounded-xl shadow-lg border p-2">
                <div className="grid grid-cols-4 gap-2 text-center">
                  {inheritedFields.length > 0 && (
                    <div>
                      <div className="text-xl font-bold text-violet-600">
                        {inheritedFields.length}
                      </div>
                      <div className="text-xs text-gray-500">Inherited</div>
                    </div>
                  )}
                  <div>
                    <div className="text-xl font-bold text-blue-600">
                      {
                        nodes.filter((n) => n.data?.category === "request")
                          .length
                      }
                    </div>
                    <div className="text-xs text-gray-500">Request</div>
                  </div>
                  <div>
                    <div className="text-xl font-bold text-emerald-600">
                      {
                        nodes.filter((n) => n.data?.category === "response")
                          .length
                      }
                    </div>
                    <div className="text-xs text-gray-500">Response</div>
                  </div>
                  <div>
                    <div className="text-xl font-bold text-violet-600">
                      {contextFields.length}
                    </div>
                    <div className="text-xs text-gray-500">Context</div>
                  </div>
                  <div>
                    <div className="text-xl font-bold text-rose-600">
                      {overrideFields.length}
                    </div>
                    <div className="text-xs text-gray-500">Override</div>
                  </div>
                </div>
              </div>
            </Panel>
          </ReactFlow>
        )}
      </div>

      {showManualInputModal && (
        <div
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
          onClick={() => setShowManualInputModal(false)}
        >
          <div
            className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-gray-800">
                Add Manual{" "}
                {manualInputType === "request" ? "Request" : "Response"} JSON
              </h3>
              <button
                onClick={() => setShowManualInputModal(false)}
                className="p-1 hover:bg-gray-100 rounded-lg"
              >
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>

            <div className="mb-4">
              <div className="flex items-center gap-4 mb-3">
                <button
                  onClick={() => setManualInputType("request")}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                    manualInputType === "request"
                      ? "bg-blue-100 text-blue-700 border-2 border-blue-300"
                      : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                  }`}
                >
                  Request
                </button>
                <button
                  onClick={() => setManualInputType("response")}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                    manualInputType === "response"
                      ? "bg-emerald-100 text-emerald-700 border-2 border-emerald-300"
                      : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                  }`}
                >
                  Response
                </button>
              </div>

              <textarea
                value={manualJsonInput}
                onChange={(e) => setManualJsonInput(e.target.value)}
                placeholder={`Paste your ${manualInputType} JSON here...\nExample: ${
                  manualInputType === "request"
                    ? '{"field1": "value1", "field2": "value2"}'
                    : '{"status": "success", "data": {...}}'
                }`}
                className="w-full h-64 p-4 font-mono text-sm bg-gray-900 text-green-400 rounded-lg border border-gray-700 focus:border-purple-500 focus:ring-1 focus:ring-purple-500 outline-none resize-none"
                spellCheck={false}
              />

              {manualJsonError && (
                <div className="mt-2 p-2 flex items-center gap-2 text-xs text-red-600 bg-red-50 rounded-lg">
                  <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
                  <span>{manualJsonError}</span>
                </div>
              )}

              <div className="text-xs text-gray-500 mt-2">
                <p className="font-medium">Tips:</p>
                <ul className="list-disc list-inside mt-1 space-y-1">
                  <li>
                    For request: You can provide just the body object, or a full
                    request with method, url, headers, and body
                  </li>
                  <li>For response: Provide the complete response object</li>
                  <li>Make sure your JSON is valid</li>
                </ul>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-4 border-t">
              <button
                onClick={() => setShowManualInputModal(false)}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200"
              >
                Cancel
              </button>
              <button
                onClick={handleManualJsonSubmit}
                className="px-4 py-2 text-sm font-medium text-white bg-gradient-to-r from-purple-600 to-blue-600 rounded-lg hover:from-purple-700 hover:to-blue-700"
              >
                Add {manualInputType === "request" ? "Request" : "Response"}
              </button>
            </div>
          </div>
        </div>
      )}

      <OverrideFieldModal
        isOpen={showOverrideModal}
        field={editingOverrideField}
        onSave={handleSaveOverrideField}
        onClose={() => {
          setShowOverrideModal(false);
          setEditingOverrideField(null);
        }}
      />
      {showSuccessMapperModal && (
        <SuccessMapperModal
          isOpen={showSuccessMapperModal}
          onClose={() => setShowSuccessMapperModal(false)}
          onSave={handleSaveSuccessMapper}
          initialConfig={successMapperConfig || undefined}
          stepName={stepName || "STEP"}
        />
      )}
    </div>
  );
}

export function WorkflowMindMap(props: WorkflowMindMapProps) {
  return (
    <ReactFlowProvider>
      <WorkflowMindMapInner {...props} />
    </ReactFlowProvider>
  );
}
