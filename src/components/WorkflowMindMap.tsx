'use client';

import { useCallback, useEffect, useState, useMemo } from 'react';
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
} from 'reactflow';
import 'reactflow/dist/style.css';
import { detectDataType } from '@/lib/utils';
import type { OverrideFieldConfig } from '@/types';
import {
  ContextTimelineNode,
  StepIndicatorNode,
  InheritedFieldNode,
} from './ContextTimelineNode';
import {
  Plus,
  Trash2,
  RefreshCw,
  Maximize2,
  Download,
  FileJson,
  ArrowRight,
  Copy,
  Check,
  Edit3,
  X,
  Link,
  GitBranch,
  Tag,
  Database,
  Zap,
  Shield,
  Layers,
  LayoutGrid,
  Focus,
  ChevronDown,
} from 'lucide-react';

// Layout modes
type LayoutMode = 'vertical' | 'horizontal' | 'focus';

// ============ Types ============
type FieldCategory = 'request' | 'response' | 'context' | 'override';

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
}

// ============ Colors ============
const categoryColors: Record<FieldCategory, { bg: string; border: string; text: string; handle: string; light: string; gradient: string }> = {
  request: {
    bg: 'bg-blue-100',
    border: 'border-blue-400',
    text: 'text-blue-700',
    handle: '#3b82f6',
    light: 'bg-blue-50',
    gradient: 'from-blue-500 to-blue-600'
  },
  response: {
    bg: 'bg-emerald-100',
    border: 'border-emerald-400',
    text: 'text-emerald-700',
    handle: '#10b981',
    light: 'bg-emerald-50',
    gradient: 'from-emerald-500 to-emerald-600'
  },
  context: {
    bg: 'bg-violet-100',
    border: 'border-violet-400',
    text: 'text-violet-700',
    handle: '#8b5cf6',
    light: 'bg-violet-50',
    gradient: 'from-violet-500 to-violet-600'
  },
  override: {
    bg: 'bg-rose-100',
    border: 'border-rose-400',
    text: 'text-rose-700',
    handle: '#f43f5e',
    light: 'bg-rose-50',
    gradient: 'from-rose-500 to-rose-600'
  },
};

// ============ Field Node ============
function FieldNode({ data, selected }: NodeProps<FieldData>) {
  const [isEditing, setIsEditing] = useState(false);
  const [editKey, setEditKey] = useState(data.renamedTo || data.key);
  const colors = categoryColors[data.category];

  const handleRename = () => {
    if (editKey.trim() && editKey !== data.key) {
      data.renamedTo = editKey;
    }
    setIsEditing(false);
  };

  const displayCategory = data.isOverride ? 'override' : data.isMappedToContext ? 'context' : data.category;
  const displayColors = categoryColors[displayCategory] || colors;

  return (
    <div
      className={`group relative rounded-xl border-2 shadow-lg transition-all duration-200 cursor-grab active:cursor-grabbing backdrop-blur-sm
        ${displayColors.light} ${displayColors.border}
        ${selected ? 'ring-2 ring-purple-500 ring-offset-2 shadow-xl scale-105' : ''}
        ${data.isOverride ? 'ring-2 ring-rose-400 ring-offset-1' : ''}
        ${data.isMappedToContext ? 'ring-2 ring-violet-400 ring-offset-1' : ''}
        hover:shadow-xl hover:scale-[1.02]`}
      style={{ minWidth: 200, maxWidth: 280 }}
    >
      {/* Handles */}
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

      {/* Override Badge */}
      {data.isOverride && (
        <div className="absolute -top-3 -right-2 px-2 py-0.5 text-[10px] font-bold bg-gradient-to-r from-rose-500 to-pink-500 text-white rounded-full shadow-lg flex items-center gap-1 z-10">
          <Edit3 className="w-2.5 h-2.5" />
          OVERRIDE
        </div>
      )}

      {/* Context Storage Badge */}
      {data.isMappedToContext && !data.isOverride && (
        <div className="absolute -top-3 -right-2 px-2 py-0.5 text-[10px] font-bold bg-gradient-to-r from-violet-500 to-purple-500 text-white rounded-full shadow-lg flex items-center gap-1 z-10">
          <Database className="w-2.5 h-2.5" />
          CONTEXT
        </div>
      )}

      {/* Renamed Badge */}
      {data.renamedTo && data.renamedTo !== data.originalKey && (
        <div className="absolute -top-3 left-2 px-2 py-0.5 text-[10px] font-bold bg-gradient-to-r from-amber-500 to-orange-500 text-white rounded-full shadow-lg flex items-center gap-1 z-10">
          <Tag className="w-2.5 h-2.5" />
          RENAMED
        </div>
      )}

      {/* Header */}
      <div className={`px-3 py-2 bg-gradient-to-r ${displayColors.gradient} rounded-t-lg`}>
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-bold uppercase tracking-wider text-white">
            {data.category}
          </span>
          <span className="text-[10px] px-2 py-0.5 bg-white/20 rounded-full text-white font-medium">
            {data.type}
          </span>
        </div>
      </div>

      {/* Content */}
      <div className="px-3 py-3">
        {isEditing ? (
          <div className="flex gap-1">
            <input
              type="text"
              value={editKey}
              onChange={(e) => setEditKey(e.target.value)}
              onBlur={handleRename}
              onKeyDown={(e) => e.key === 'Enter' && handleRename()}
              className="flex-1 text-sm font-semibold bg-white border-2 border-purple-300 rounded-lg px-2 py-1 focus:outline-none focus:border-purple-500"
              autoFocus
            />
          </div>
        ) : (
          <div
            className="text-sm font-bold text-gray-800 truncate cursor-text hover:text-purple-700 transition-colors"
            onDoubleClick={() => setIsEditing(true)}
            title={`Double-click to rename\nOriginal: ${data.originalKey}${data.renamedTo ? `\nRenamed: ${data.renamedTo}` : ''}`}
          >
            {data.renamedTo || data.key}
          </div>
        )}

        {/* Original key if renamed */}
        {data.renamedTo && data.renamedTo !== data.originalKey && (
          <div className="text-[10px] text-gray-400 font-mono mt-1 flex items-center gap-1">
            <ArrowRight className="w-2.5 h-2.5" />
            from: {data.originalKey}
          </div>
        )}

        {/* Context key if mapped */}
        {data.contextKey && (
          <div className="text-[10px] text-violet-600 font-mono mt-1 flex items-center gap-1 bg-violet-50 px-1.5 py-0.5 rounded">
            <Database className="w-2.5 h-2.5" />
            stored as: {data.contextKey}
          </div>
        )}

        {/* Value preview */}
        {data.value !== undefined && data.value !== '' && (
          <div className="text-[11px] text-gray-500 font-mono mt-2 truncate bg-white/70 px-2 py-1 rounded border border-gray-200">
            {String(data.value).slice(0, 35)}{String(data.value).length > 35 ? '...' : ''}
          </div>
        )}
      </div>

      {/* Quick Actions */}
      <div className="absolute -bottom-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity z-20">
        <button
          onClick={() => setIsEditing(true)}
          className="p-1.5 bg-white rounded-full shadow-lg hover:bg-violet-100 text-violet-600 border border-violet-200"
          title="Rename field"
        >
          <Tag className="w-3 h-3" />
        </button>
      </div>
    </div>
  );
}

// ============ Context Storage Field Mapping ============
interface ContextFieldMapping {
  originalKey: string;
  displayName: string;
}

// ============ Context Storage Node ============
interface ContextStorageNodeData {
  fields: ContextFieldMapping[];
  label: string;
  onFieldRename?: (originalKey: string, newName: string) => void;
  onFieldRemove?: (originalKey: string) => void;
}

function ContextStorageNode({ data }: NodeProps<ContextStorageNodeData>) {
  const [editingField, setEditingField] = useState<string | null>(null);
  const [editValue, setEditValue] = useState('');

  const handleStartEdit = (field: ContextFieldMapping) => {
    setEditingField(field.originalKey);
    setEditValue(field.displayName);
  };

  const handleSaveEdit = (originalKey: string) => {
    if (editValue.trim() && data.onFieldRename) {
      data.onFieldRename(originalKey, editValue.trim());
    }
    setEditingField(null);
    setEditValue('');
  };

  const handleCancelEdit = () => {
    setEditingField(null);
    setEditValue('');
  };

  return (
    <div className="relative px-6 py-4 bg-gradient-to-br from-violet-50 to-purple-100 rounded-2xl border-2 border-dashed border-violet-400 shadow-xl min-w-[250px]">
      {/* Left handle for connections from left side */}
      <Handle
        type="target"
        position={Position.Left}
        id="left"
        className="!w-5 !h-5 !bg-violet-500 !border-3 !border-white !shadow-lg"
        style={{ left: -10 }}
      />
      {/* Right handle for connections from right side (response fields) */}
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
          <div className="text-xs text-violet-500">Connect response fields here</div>
        </div>
      </div>

      {data.fields.length > 0 ? (
        <div className="space-y-1.5 mt-3">
          {data.fields.map((field) => (
            <div key={field.originalKey} className="group flex items-center gap-2 px-3 py-1.5 bg-white rounded-lg shadow-sm text-xs">
              <Zap className="w-3 h-3 text-violet-500 flex-shrink-0" />
              {editingField === field.originalKey ? (
                <div className="flex-1 flex items-center gap-1">
                  <input
                    type="text"
                    value={editValue}
                    onChange={(e) => setEditValue(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleSaveEdit(field.originalKey);
                      if (e.key === 'Escape') handleCancelEdit();
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
                  <span className="font-mono text-gray-700 flex-1 truncate" title={`Original: ${field.originalKey}`}>
                    {field.displayName}
                  </span>
                  {field.displayName !== field.originalKey && (
                    <span className="text-[9px] text-violet-400 font-mono truncate max-w-[60px]" title={field.originalKey}>
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

// ============ Override Field Configuration ============
// OverrideFieldConfig imported from @/types
export type { OverrideFieldConfig } from '@/types';

// ============ Override Collection Node ============
interface OverrideCollectionNodeData {
  fields: OverrideFieldConfig[];
  label: string;
  onFieldEdit?: (field: OverrideFieldConfig) => void;
  onFieldRemove?: (actualMapping: string) => void;
}

function OverrideCollectionNode({ data }: NodeProps<OverrideCollectionNodeData>) {
  return (
    <div className="relative px-6 py-4 bg-gradient-to-br from-rose-50 to-pink-100 rounded-2xl border-2 border-dashed border-rose-400 shadow-xl min-w-[280px]">
      {/* Left handle for connections to request fields */}
      <Handle
        type="source"
        position={Position.Left}
        id="left"
        className="!w-5 !h-5 !bg-rose-500 !border-3 !border-white !shadow-lg"
        style={{ left: -10 }}
      />
      {/* Right handle for other connections */}
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
          <div className="text-xs text-rose-500">User input fields at runtime</div>
        </div>
      </div>

      {data.fields.length > 0 ? (
        <div className="space-y-2 mt-3">
          {data.fields.map((field) => (
            <div key={field.actual_mapping} className="group bg-white rounded-lg shadow-sm text-xs overflow-hidden">
              <div className="flex items-center gap-2 px-3 py-2 border-b border-gray-100">
                <Edit3 className="w-3 h-3 text-rose-500 flex-shrink-0" />
                <span className="font-semibold text-gray-800 flex-1 truncate">{field.field}</span>
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
                  <span className="font-mono text-gray-600">{field.actual_mapping}</span>
                </div>
                <div className="flex items-center gap-2 text-[10px] text-gray-500">
                  {field.min_length !== undefined && (
                    <span>min: {field.min_length}</span>
                  )}
                  {field.max_length !== undefined && (
                    <span>max: {field.max_length}</span>
                  )}
                  {field.pattern && (
                    <span className="px-1 py-0.5 bg-amber-100 text-amber-700 rounded">{field.pattern}</span>
                  )}
                  {field.required && (
                    <span className="px-1 py-0.5 bg-red-100 text-red-600 rounded">required</span>
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
  contextStorage: ContextStorageNode,
  overrideCollection: OverrideCollectionNode,
  contextTimeline: ContextTimelineNode,
  stepIndicator: StepIndicatorNode,
  inheritedField: InheritedFieldNode,
};

// Inheritance edge styling
const inheritanceEdgeStyle = {
  stroke: '#8b5cf6',
  strokeWidth: 2,
  strokeDasharray: '8,4',
};

// Context edge styling (animated)
const contextEdgeStyle = {
  stroke: '#8b5cf6',
  strokeWidth: 3,
};

// Override edge styling
const overrideEdgeStyle = {
  stroke: '#f43f5e',
  strokeWidth: 3,
};

// ============ Main Component ============
interface WorkflowMindMapProps {
  parsedRequest?: { method: string; url: string; headers: Record<string, string>; body: Record<string, unknown> | null };
  parsedResponse?: Record<string, unknown> | null;
  onConfigChange?: (config: {
    response_mapper: Record<string, string>;
    request_mapper: Record<string, string>;
    to_be_overridden: Array<{ field: string; type: string; required: boolean }>;
    context_fields: string[];
  }) => void;
  // Multi-step props
  stepName?: string;
  stepIndex?: number;
  inheritedContext?: Record<string, unknown>;
  // Canvas state persistence
  initialContextMappings?: Record<string, string>;
  initialOverrideConfigs?: Record<string, OverrideFieldConfig>;
  onCanvasStateChange?: (state: {
    contextFieldMappings: Record<string, string>;
    overrideFieldConfigs: Record<string, OverrideFieldConfig>;
  }) => void;
}

// ============ Override Field Configuration Modal ============
interface OverrideFieldModalProps {
  isOpen: boolean;
  field: OverrideFieldConfig | null;
  onSave: (field: OverrideFieldConfig) => void;
  onClose: () => void;
}

function OverrideFieldModal({ isOpen, field, onSave, onClose }: OverrideFieldModalProps) {
  const [formData, setFormData] = useState<OverrideFieldConfig>({
    field: '',
    value: '',
    actual_mapping: '',
    type: 'string',
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
      value: `request.${formData.actual_mapping}`,
    });
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-bold text-gray-800">Configure Override Field</h3>
          <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded-lg">
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Field (display name / context name) */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Field Name (Context Key)</label>
            <input
              type="text"
              value={formData.field}
              onChange={(e) => setFormData({ ...formData, field: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-rose-500 focus:border-transparent"
              placeholder="e.g., bill_ref_no"
              required
            />
            <p className="text-xs text-gray-500 mt-1">Name to be stored in context</p>
          </div>

          {/* Actual Mapping */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Actual Mapping (Request Body Field)</label>
            <input
              type="text"
              value={formData.actual_mapping}
              onChange={(e) => setFormData({ ...formData, actual_mapping: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50"
              placeholder="e.g., Bill_Id"
              readOnly
            />
            <p className="text-xs text-gray-500 mt-1">Original field path in request body</p>
          </div>

          {/* Value (auto-generated) */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Value</label>
            <input
              type="text"
              value={`request.${formData.actual_mapping}`}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-100 text-gray-600 font-mono text-sm"
              readOnly
            />
            <p className="text-xs text-gray-500 mt-1">Auto-generated: request.{'{actual_mapping}'}</p>
          </div>

          {/* Type */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
            <select
              value={formData.type}
              onChange={(e) => setFormData({ ...formData, type: e.target.value })}
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

          {/* Min/Max Length */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Min Length</label>
              <input
                type="number"
                value={formData.min_length ?? ''}
                onChange={(e) => setFormData({ ...formData, min_length: e.target.value ? parseInt(e.target.value) : undefined })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-rose-500 focus:border-transparent"
                min="0"
                placeholder="e.g., 3"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Max Length</label>
              <input
                type="number"
                value={formData.max_length ?? ''}
                onChange={(e) => setFormData({ ...formData, max_length: e.target.value ? parseInt(e.target.value) : undefined })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-rose-500 focus:border-transparent"
                min="0"
                placeholder="e.g., 20"
              />
            </div>
          </div>

          {/* Pattern */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Pattern</label>
            <select
              value={formData.pattern ?? ''}
              onChange={(e) => setFormData({ ...formData, pattern: e.target.value || undefined })}
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

          {/* Required */}
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="required"
              checked={formData.required}
              onChange={(e) => setFormData({ ...formData, required: e.target.checked })}
              className="w-4 h-4 text-rose-600 border-gray-300 rounded focus:ring-rose-500"
            />
            <label htmlFor="required" className="text-sm font-medium text-gray-700">Required field</label>
          </div>

          {/* Actions */}
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
              Save Configuration
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
  onConfigChange,
  stepName,
  stepIndex = 0,
  inheritedContext = {},
  initialContextMappings = {},
  initialOverrideConfigs = {},
  onCanvasStateChange,
}: WorkflowMindMapProps) {
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  // Context fields with custom display names (originalKey -> displayName)
  const [contextFieldMappings, setContextFieldMappings] = useState<Map<string, string>>(
    () => new Map(Object.entries(initialContextMappings))
  );
  // Override fields with full configuration
  const [overrideFieldConfigs, setOverrideFieldConfigs] = useState<Map<string, OverrideFieldConfig>>(
    () => new Map(Object.entries(initialOverrideConfigs))
  );
  const [selectedNodes, setSelectedNodes] = useState<string[]>([]);
  const [copied, setCopied] = useState(false);
  const [layoutMode, setLayoutMode] = useState<LayoutMode>('vertical');
  const [showStepOverview, setShowStepOverview] = useState(true);
  const [showContextPanel, setShowContextPanel] = useState(true);
  const [editingOverrideField, setEditingOverrideField] = useState<OverrideFieldConfig | null>(null);
  const [showOverrideModal, setShowOverrideModal] = useState(false);
  const reactFlowInstance = useReactFlow();

  // Helper to get context fields as array (for backward compatibility)
  const contextFields = useMemo(() => Array.from(contextFieldMappings.keys()), [contextFieldMappings]);
  // Helper to get override fields as array (for backward compatibility)
  const overrideFields = useMemo(() => Array.from(overrideFieldConfigs.keys()), [overrideFieldConfigs]);

  // Inherited fields from previous steps
  const inheritedFields = useMemo(() => {
    return Object.entries(inheritedContext).map(([key, value]) => ({
      key,
      value,
      type: detectDataType(value),
    }));
  }, [inheritedContext]);

  // Persist canvas state changes
  useEffect(() => {
    if (onCanvasStateChange) {
      onCanvasStateChange({
        contextFieldMappings: Object.fromEntries(contextFieldMappings),
        overrideFieldConfigs: Object.fromEntries(overrideFieldConfigs),
      });
    }
  }, [contextFieldMappings, overrideFieldConfigs, onCanvasStateChange]);

  // Track selected nodes
  const onSelectionChange = useCallback(({ nodes: selectedNodesList }: { nodes: Node[] }) => {
    setSelectedNodes(selectedNodesList.map(n => n.id));
  }, []);

  // Build nodes from data
  useEffect(() => {
    const allNodes: Node[] = [];
    const allEdges: Edge[] = [];
    let inheritedY = 50;
    let requestY = 100;
    let responseY = 100;

    // Layout positions based on mode
    const getPositions = () => {
      if (layoutMode === 'horizontal') {
        return {
          inherited: { x: 50, startY: 50 },
          request: { x: 350, startY: 50 },
          response: { x: 650, startY: 50 },
          contextStorage: { x: 950, y: 50 },
          overrideCollection: { x: 950, y: 350 },
        };
      }
      return {
        inherited: { x: 50, startY: 50 },
        request: { x: 50, startY: inheritedFields.length > 0 ? inheritedFields.length * 100 + 80 : 100 },
        response: { x: 700, startY: 100 },
        contextStorage: { x: 400, y: 50 },
        overrideCollection: { x: 400, y: 350 },
      };
    };

    const positions = getPositions();

    // Step indicator node
    if (stepName) {
      allNodes.push({
        id: 'step-indicator',
        type: 'stepIndicator',
        position: { x: 350, y: 10 },
        draggable: true,
        data: {
          stepName,
          stepIndex,
          status: parsedResponse ? 'completed' : parsedRequest ? 'in_progress' : 'pending',
          isActive: true,
        },
      });
    }

    // Inherited field nodes (from previous steps)
    if (inheritedFields.length > 0) {
      inheritedFields.forEach((field, idx) => {
        const nodeId = `inherited-${field.key}`;
        allNodes.push({
          id: nodeId,
          type: 'inheritedField',
          position: { x: positions.inherited.x, y: positions.inherited.startY + idx * 90 },
          draggable: true,
          data: {
            fieldKey: field.key,
            value: field.value,
            fromStep: stepIndex > 0 ? ['TOKEN', 'QUERY', 'SETUP', 'PAYMENT'][stepIndex - 1] : 'UNKNOWN',
            fromStepIndex: stepIndex - 1,
            dataType: field.type,
          },
        });
      });

      // Adjust request start position
      requestY = positions.request.startY;
    }

    // Request fields (left column)
    if (parsedRequest?.body && typeof parsedRequest.body === 'object') {
      const processFields = (obj: Record<string, unknown>, prefix = '') => {
        Object.entries(obj).forEach(([key, value]) => {
          const path = prefix ? `${prefix}.${key}` : key;
          const dataType = detectDataType(value);

          if (dataType === 'object' && value !== null) {
            processFields(value as Record<string, unknown>, path);
            return;
          }

          const isOverride = overrideFields.includes(path);

          allNodes.push({
            id: `request-${path}`,
            type: 'fieldNode',
            position: { x: layoutMode === 'horizontal' ? positions.request.x : 50, y: requestY },
            draggable: true,
            data: {
              id: `request-${path}`,
              key: path,
              originalKey: path,
              value,
              type: dataType,
              category: 'request' as FieldCategory,
              isOverride,
            },
          });
          requestY += 120;
        });
      };
      processFields(parsedRequest.body);
    }

    // Response fields (right column)
    if (parsedResponse && typeof parsedResponse === 'object') {
      const processFields = (obj: Record<string, unknown>, prefix = '') => {
        Object.entries(obj).forEach(([key, value]) => {
          const path = prefix ? `${prefix}.${key}` : key;
          const dataType = detectDataType(value);

          if (dataType === 'object' && value !== null) {
            processFields(value as Record<string, unknown>, path);
            return;
          }

          const isMappedToContext = contextFields.includes(path);

          allNodes.push({
            id: `response-${path}`,
            type: 'fieldNode',
            position: { x: layoutMode === 'horizontal' ? positions.response.x : 700, y: responseY },
            draggable: true,
            data: {
              id: `response-${path}`,
              key: path,
              originalKey: path,
              value,
              type: dataType,
              category: 'response' as FieldCategory,
              isMappedToContext,
              contextKey: isMappedToContext ? path : undefined,
            },
          });
          responseY += 120;
        });
      };
      processFields(parsedResponse);
    }

    // Add Context Storage node with editable field mappings
    const contextFieldsList: ContextFieldMapping[] = Array.from(contextFieldMappings.entries()).map(([originalKey, displayName]) => ({
      originalKey,
      displayName,
    }));

    allNodes.push({
      id: 'context-storage',
      type: 'contextStorage',
      position: layoutMode === 'horizontal'
        ? { x: positions.contextStorage.x, y: positions.contextStorage.y }
        : { x: 400, y: 50 },
      draggable: true,
      data: {
        label: 'Context Storage',
        fields: contextFieldsList,
        onFieldRename: (originalKey: string, newName: string) => {
          setContextFieldMappings(prev => {
            const updated = new Map(prev);
            updated.set(originalKey, newName);
            return updated;
          });
        },
        onFieldRemove: (originalKey: string) => {
          setContextFieldMappings(prev => {
            const updated = new Map(prev);
            updated.delete(originalKey);
            return updated;
          });
          // Also remove the edge
          setEdges(eds => eds.filter(e => e.source !== `response-${originalKey}` || e.target !== 'context-storage'));
        },
      },
    });

    // Add Override Collection node with full field configurations
    const overrideFieldsList: OverrideFieldConfig[] = Array.from(overrideFieldConfigs.values());

    allNodes.push({
      id: 'override-collection',
      type: 'overrideCollection',
      position: layoutMode === 'horizontal'
        ? { x: positions.overrideCollection.x, y: positions.overrideCollection.y }
        : { x: 400, y: 350 },
      draggable: true,
      data: {
        label: 'Override Fields',
        fields: overrideFieldsList,
        onFieldEdit: (field: OverrideFieldConfig) => {
          setEditingOverrideField(field);
          setShowOverrideModal(true);
        },
        onFieldRemove: (actualMapping: string) => {
          setOverrideFieldConfigs(prev => {
            const updated = new Map(prev);
            updated.delete(actualMapping);
            return updated;
          });
          // Also remove the edge
          setEdges(eds => eds.filter(e => e.source !== 'override-collection' || e.target !== `request-${actualMapping}`));
        },
      },
    });

    // Add Context Timeline node (shows accumulated context across steps)
    if (showContextPanel && stepIndex > 0) {
      const timelineFields = Object.entries(inheritedContext).map(([key, value]) => ({
        key,
        value,
        step: ['TOKEN', 'QUERY', 'SETUP', 'PAYMENT'][stepIndex - 1] || 'UNKNOWN',
        stepIndex: stepIndex - 1,
      }));

      allNodes.push({
        id: 'context-timeline',
        type: 'contextTimeline',
        position: { x: layoutMode === 'horizontal' ? 1150 : 950, y: 50 },
        draggable: true,
        data: {
          label: 'Accumulated Context',
          fields: timelineFields,
          currentStep: stepName,
        },
      });
    }

    // Add inheritance edges (dashed violet) from inherited fields to request fields
    inheritedFields.forEach((field) => {
      // Check if any request field uses this inherited field
      const requestNodeId = `request-${field.key}`;
      if (allNodes.some(n => n.id === requestNodeId)) {
        allEdges.push({
          id: `edge-inherit-${field.key}`,
          source: `inherited-${field.key}`,
          target: requestNodeId,
          animated: true,
          style: inheritanceEdgeStyle,
          markerEnd: { type: MarkerType.ArrowClosed, color: '#8b5cf6', width: 16, height: 16 },
          label: 'inherited',
          labelStyle: { fill: '#8b5cf6', fontWeight: 600, fontSize: 10 },
          labelBgStyle: { fill: 'white', fillOpacity: 0.9 },
          labelBgPadding: [4, 2] as [number, number],
          labelBgBorderRadius: 4,
        });
      }
    });

    setNodes(allNodes);
    setEdges(eds => [...eds, ...allEdges]);

    setTimeout(() => {
      if (allNodes.length > 2) {
        reactFlowInstance.fitView({ padding: 0.2 });
      }
    }, 100);
  }, [parsedRequest, parsedResponse, contextFieldMappings, overrideFieldConfigs, setNodes, setEdges, reactFlowInstance, layoutMode, inheritedFields, inheritedContext, stepIndex, stepName, showContextPanel]);

  // Handle connections
  const onConnect = useCallback(
    (connection: Connection) => {
      const sourceNode = nodes.find(n => n.id === connection.source);
      const targetNode = nodes.find(n => n.id === connection.target);

      if (!sourceNode || !targetNode) return;

      // Response → Context Storage: Add to context
      if (sourceNode.data.category === 'response' && targetNode.id === 'context-storage') {
        const fieldKey = sourceNode.data.originalKey || sourceNode.data.key;
        if (!contextFieldMappings.has(fieldKey)) {
          setContextFieldMappings(prev => {
            const updated = new Map(prev);
            updated.set(fieldKey, fieldKey); // Default display name is same as original
            return updated;
          });
        }

        const newEdge: Edge = {
          id: `edge-${connection.source}-context-${Date.now()}`,
          source: connection.source!,
          target: 'context-storage',
          animated: true,
          style: { stroke: '#8b5cf6', strokeWidth: 3 },
          markerEnd: { type: MarkerType.ArrowClosed, color: '#8b5cf6', width: 20, height: 20 },
          label: 'stores →',
          labelStyle: { fill: '#8b5cf6', fontWeight: 700, fontSize: 11 },
          labelBgStyle: { fill: 'white', fillOpacity: 0.95 },
          labelBgPadding: [6, 4] as [number, number],
          labelBgBorderRadius: 6,
        };
        setEdges((eds) => addEdge(newEdge, eds));
        return;
      }

      // Override Collection → Request: Mark as override mapping and open config modal
      if (sourceNode.id === 'override-collection' && targetNode.data.category === 'request') {
        const fieldKey = targetNode.data.originalKey || targetNode.data.key;
        if (!overrideFieldConfigs.has(fieldKey)) {
          // Create default config and open modal for editing
          const defaultConfig: OverrideFieldConfig = {
            field: fieldKey, // Default display name is same as original
            value: `request.${fieldKey}`,
            actual_mapping: fieldKey,
            type: targetNode.data.type || 'string',
            required: true,
          };
          setEditingOverrideField(defaultConfig);
          setShowOverrideModal(true);
        }

        const newEdge: Edge = {
          id: `edge-override-${connection.target}-${Date.now()}`,
          source: 'override-collection',
          target: connection.target!,
          animated: true,
          style: { stroke: '#f43f5e', strokeWidth: 3 },
          markerEnd: { type: MarkerType.ArrowClosed, color: '#f43f5e', width: 20, height: 20 },
          label: 'overrides →',
          labelStyle: { fill: '#f43f5e', fontWeight: 700, fontSize: 11 },
          labelBgStyle: { fill: 'white', fillOpacity: 0.95 },
          labelBgPadding: [6, 4] as [number, number],
          labelBgBorderRadius: 6,
        };
        setEdges((eds) => addEdge(newEdge, eds));
        return;
      }

      // Request → Response: Field mapping
      if (sourceNode.data.category === 'request' && targetNode.data.category === 'response') {
        const newEdge: Edge = {
          id: `edge-${connection.source}-${connection.target}-${Date.now()}`,
          source: connection.source!,
          target: connection.target!,
          animated: true,
          style: { stroke: '#3b82f6', strokeWidth: 2.5 },
          markerEnd: { type: MarkerType.ArrowClosed, color: '#3b82f6', width: 18, height: 18 },
          label: 'maps to',
          labelStyle: { fill: '#3b82f6', fontWeight: 600, fontSize: 10 },
          labelBgStyle: { fill: 'white', fillOpacity: 0.9 },
          labelBgPadding: [4, 2] as [number, number],
          labelBgBorderRadius: 4,
        };
        setEdges((eds) => addEdge(newEdge, eds));
        return;
      }

      // Generic connection
      const newEdge: Edge = {
        id: `edge-${connection.source}-${connection.target}-${Date.now()}`,
        source: connection.source!,
        target: connection.target!,
        animated: true,
        style: { stroke: '#6b7280', strokeWidth: 2 },
        markerEnd: { type: MarkerType.ArrowClosed, color: '#6b7280' },
      };
      setEdges((eds) => addEdge(newEdge, eds));
    },
    [nodes, contextFieldMappings, overrideFieldConfigs, setEdges]
  );

  // Handle saving override field configuration from modal
  const handleSaveOverrideField = useCallback((config: OverrideFieldConfig) => {
    setOverrideFieldConfigs(prev => {
      const updated = new Map(prev);
      updated.set(config.actual_mapping, config);
      return updated;
    });
    setShowOverrideModal(false);
    setEditingOverrideField(null);
  }, []);

  // Toggle override on selected request nodes
  const handleToggleOverride = useCallback(() => {
    const selectedRequestNodes = nodes.filter(n => selectedNodes.includes(n.id) && n.data?.category === 'request');

    if (selectedRequestNodes.length === 0) {
      console.log('No request nodes selected. Select request fields first, then click Mark Override.');
      return;
    }

    selectedRequestNodes.forEach(node => {
      const fieldKey = node.data.originalKey || node.data.key;
      if (overrideFieldConfigs.has(fieldKey)) {
        // Remove from override
        setOverrideFieldConfigs(prev => {
          const updated = new Map(prev);
          updated.delete(fieldKey);
          return updated;
        });
        // Remove edge
        setEdges(eds => eds.filter(e => e.target !== node.id || e.source !== 'override-collection'));
      } else {
        // Create default config and open modal for editing
        const defaultConfig: OverrideFieldConfig = {
          field: fieldKey,
          value: `request.${fieldKey}`,
          actual_mapping: fieldKey,
          type: node.data.type || 'string',
          required: true,
        };
        setEditingOverrideField(defaultConfig);
        setShowOverrideModal(true);
        // Add edge
        const newEdge: Edge = {
          id: `edge-override-${node.id}-${Date.now()}`,
          source: 'override-collection',
          target: node.id,
          animated: true,
          style: { stroke: '#f43f5e', strokeWidth: 3 },
          markerEnd: { type: MarkerType.ArrowClosed, color: '#f43f5e', width: 20, height: 20 },
          label: 'overrides →',
          labelStyle: { fill: '#f43f5e', fontWeight: 700, fontSize: 11 },
          labelBgStyle: { fill: 'white', fillOpacity: 0.95 },
          labelBgPadding: [6, 4] as [number, number],
          labelBgBorderRadius: 6,
        };
        setEdges(eds => [...eds, newEdge]);
      }
    });
  }, [nodes, selectedNodes, overrideFieldConfigs, setEdges]);

  // Toggle context storage on selected response nodes
  const handleToggleContext = useCallback(() => {
    const selectedResponseNodes = nodes.filter(n => selectedNodes.includes(n.id) && n.data?.category === 'response');

    if (selectedResponseNodes.length === 0) {
      console.log('No response nodes selected. Select response fields first, then click Store Context.');
      return;
    }

    selectedResponseNodes.forEach(node => {
      const fieldKey = node.data.originalKey || node.data.key;
      if (contextFieldMappings.has(fieldKey)) {
        // Remove from context
        setContextFieldMappings(prev => {
          const updated = new Map(prev);
          updated.delete(fieldKey);
          return updated;
        });
        // Remove edge
        setEdges(eds => eds.filter(e => e.source !== node.id || e.target !== 'context-storage'));
      } else {
        // Add to context with default display name
        setContextFieldMappings(prev => {
          const updated = new Map(prev);
          updated.set(fieldKey, fieldKey);
          return updated;
        });
        // Add edge
        const newEdge: Edge = {
          id: `edge-${node.id}-context-${Date.now()}`,
          source: node.id,
          target: 'context-storage',
          animated: true,
          style: { stroke: '#8b5cf6', strokeWidth: 3 },
          markerEnd: { type: MarkerType.ArrowClosed, color: '#8b5cf6', width: 20, height: 20 },
          label: 'stores →',
          labelStyle: { fill: '#8b5cf6', fontWeight: 700, fontSize: 11 },
          labelBgStyle: { fill: 'white', fillOpacity: 0.95 },
          labelBgPadding: [6, 4] as [number, number],
          labelBgBorderRadius: 6,
        };
        setEdges(eds => [...eds, newEdge]);
      }
    });
  }, [nodes, selectedNodes, contextFieldMappings, setEdges]);

  // Auto layout
  const handleAutoLayout = useCallback(() => {
    const requestNodes = nodes.filter(n => n.data?.category === 'request');
    const responseNodes = nodes.filter(n => n.data?.category === 'response');

    const updatedNodes = nodes.map(node => {
      if (node.id === 'context-storage') {
        return { ...node, position: { x: 400, y: 50 } };
      }
      if (node.id === 'override-collection') {
        return { ...node, position: { x: 400, y: Math.max(350, requestNodes.length * 60) } };
      }
      if (node.data?.category === 'request') {
        const index = requestNodes.findIndex(n => n.id === node.id);
        return { ...node, position: { x: 50, y: 100 + index * 120 } };
      }
      if (node.data?.category === 'response') {
        const index = responseNodes.findIndex(n => n.id === node.id);
        return { ...node, position: { x: 700, y: 100 + index * 120 } };
      }
      return node;
    });

    setNodes(updatedNodes);
    setTimeout(() => reactFlowInstance.fitView({ padding: 0.2 }), 50);
  }, [nodes, setNodes, reactFlowInstance]);

  // Generate template config matching backend format
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
    contextFieldMappings.forEach((displayName, originalKey) => {
      responseMapper[originalKey] = displayName;
    });

    // Override fields - fields that need user input at runtime with full configuration
    overrideFieldConfigs.forEach((config) => {
      const overrideEntry: {
        field: string;
        value: string;
        actual_mapping: string;
        type: string;
        max_length?: number;
        min_length?: number;
        pattern?: string;
        required: boolean;
      } = {
        field: config.field,
        value: config.value,
        actual_mapping: config.actual_mapping,
        type: config.type,
        required: config.required,
      };
      // Only include optional fields if they have values
      if (config.max_length !== undefined) {
        overrideEntry.max_length = config.max_length;
      }
      if (config.min_length !== undefined) {
        overrideEntry.min_length = config.min_length;
      }
      if (config.pattern) {
        overrideEntry.pattern = config.pattern;
      }
      overriddenRequestBody.push(overrideEntry);
    });

    // Request mapper - maps accumulated context to request body
    edges.forEach(edge => {
      if (edge.source.startsWith('response-') && edge.target.startsWith('request-')) {
        const srcNode = nodes.find(n => n.id === edge.source);
        const tgtNode = nodes.find(n => n.id === edge.target);
        if (srcNode && tgtNode) {
          const srcKey = srcNode.data.renamedTo || srcNode.data.originalKey;
          const tgtKey = tgtNode.data.renamedTo || tgtNode.data.originalKey;
          requestMapper[tgtKey] = `accumulated.${srcKey}`;
        }
      }
    });

    // Determine step progression
    const STEP_ORDER = ['TOKEN', 'QUERY', 'SETUP', 'PAYMENT', 'DONE'];
    const currentStepName = stepName || 'STEP';
    const currentStepIdx = STEP_ORDER.indexOf(currentStepName);
    const nextStepName = currentStepIdx >= 0 && currentStepIdx < STEP_ORDER.length - 1
      ? STEP_ORDER[currentStepIdx + 1]
      : 'DONE';

    // Build template structure matching backend
    const template: Record<string, unknown> = {
      name: currentStepName,
      current_step: currentStepName,
      next_step: nextStepName,
      url: parsedRequest?.url || '',
      method: parsedRequest?.method || 'POST',
      header_type: parsedRequest?.headers || {},
      request_mapper: Object.keys(requestMapper).length > 0 ? requestMapper : undefined,
      response_mapper: Object.keys(responseMapper).length > 0 ? responseMapper : undefined,
    };

    // Add authorization_mapper if bearer token is detected in headers
    const authHeader = parsedRequest?.headers?.['Authorization'] || parsedRequest?.headers?.['authorization'];
    if (authHeader?.toLowerCase().startsWith('bearer')) {
      // Check if token references accumulated context
      template.authorization_mapper = {
        type: 'bearer',
        token: 'accumulated.access_token',
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
    Object.keys(template).forEach(key => {
      if (template[key] === undefined) {
        delete template[key];
      }
    });

    return template;
  }, [nodes, edges, contextFieldMappings, overrideFieldConfigs, parsedRequest, stepName]);

  // Export config
  const handleExport = useCallback(() => {
    const config = generateConfig();
    const blob = new Blob([JSON.stringify(config, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'utility-parser-config.json';
    a.click();
    URL.revokeObjectURL(url);
  }, [generateConfig]);

  // Copy config
  const handleCopyConfig = useCallback(() => {
    const config = generateConfig();
    navigator.clipboard.writeText(JSON.stringify(config, null, 2));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [generateConfig]);

  const isEmpty = nodes.length <= 2; // Only storage nodes

  return (
    <div className="h-full flex flex-col bg-gradient-to-br from-slate-50 via-gray-50 to-slate-100">
      {/* Toolbar */}
      <div className="flex items-center justify-between px-4 py-2.5 bg-white/90 backdrop-blur-sm border-b shadow-sm">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 px-3 py-1.5 bg-gradient-to-r from-purple-600 to-violet-600 rounded-lg text-white shadow-lg">
            <GitBranch className="w-4 h-4" />
            <span className="font-semibold text-sm">Workflow Canvas</span>
            {stepName && (
              <span className="px-2 py-0.5 bg-white/20 rounded text-xs font-medium">
                {stepName}
              </span>
            )}
          </div>

          <div className="h-6 w-px bg-gray-300" />

          {/* Layout Mode Toggle */}
          <div className="flex items-center bg-gray-100 rounded-lg p-0.5">
            <button
              onClick={() => setLayoutMode('vertical')}
              className={`flex items-center gap-1 px-2 py-1 rounded-md text-xs font-medium transition-colors ${
                layoutMode === 'vertical' ? 'bg-white text-purple-700 shadow-sm' : 'text-gray-600 hover:text-gray-800'
              }`}
              title="Vertical layout"
            >
              <Layers className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => setLayoutMode('horizontal')}
              className={`flex items-center gap-1 px-2 py-1 rounded-md text-xs font-medium transition-colors ${
                layoutMode === 'horizontal' ? 'bg-white text-purple-700 shadow-sm' : 'text-gray-600 hover:text-gray-800'
              }`}
              title="Horizontal layout"
            >
              <LayoutGrid className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => setLayoutMode('focus')}
              className={`flex items-center gap-1 px-2 py-1 rounded-md text-xs font-medium transition-colors ${
                layoutMode === 'focus' ? 'bg-white text-purple-700 shadow-sm' : 'text-gray-600 hover:text-gray-800'
              }`}
              title="Focus mode"
            >
              <Focus className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="h-6 w-px bg-gray-300" />

          {/* Mark Override (for request fields) */}
          <button
            onClick={handleToggleOverride}
            className="flex items-center gap-1.5 px-3 py-1.5 text-sm bg-gradient-to-r from-rose-100 to-pink-100 text-rose-700 rounded-lg hover:from-rose-200 hover:to-pink-200 transition-colors font-medium border border-rose-200"
            title="Mark selected request fields as override (user input)"
          >
            <Edit3 className="w-4 h-4" />
            Mark Override
          </button>

          {/* Store in Context (for response fields) */}
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
          {/* Panel toggles */}
          <button
            onClick={() => setShowContextPanel(!showContextPanel)}
            className={`flex items-center gap-1 px-2 py-1.5 rounded-md text-xs font-medium transition-colors ${
              showContextPanel ? 'bg-violet-100 text-violet-700' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
            title="Toggle context panel"
          >
            <Database className="w-3.5 h-3.5" />
          </button>

          <div className="h-5 w-px bg-gray-200" />

          <button
            onClick={handleAutoLayout}
            disabled={isEmpty}
            className="flex items-center gap-1.5 px-3 py-1.5 text-sm bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors disabled:opacity-50"
          >
            <RefreshCw className="w-4 h-4" />
            Layout
          </button>

          <button
            onClick={() => reactFlowInstance.fitView({ padding: 0.2 })}
            disabled={isEmpty}
            className="flex items-center gap-1.5 px-3 py-1.5 text-sm bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors disabled:opacity-50"
          >
            <Maximize2 className="w-4 h-4" />
            Fit
          </button>

          <div className="h-6 w-px bg-gray-300" />

          <button
            onClick={handleCopyConfig}
            className="flex items-center gap-1.5 px-3 py-1.5 text-sm bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
          >
            {copied ? <Check className="w-4 h-4 text-green-600" /> : <Copy className="w-4 h-4" />}
            {copied ? 'Copied!' : 'Copy Config'}
          </button>

          <button
            onClick={handleExport}
            disabled={isEmpty}
            className="flex items-center gap-1.5 px-3 py-1.5 text-sm bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg hover:from-blue-700 hover:to-purple-700 transition-colors disabled:opacity-50 font-medium shadow-lg"
          >
            <Download className="w-4 h-4" />
            Export
          </button>
        </div>
      </div>

      {/* Instructions */}
      <div className="flex items-center gap-6 px-4 py-2 bg-white/70 border-b text-xs">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded-full bg-blue-500" />
            <span className="text-gray-600 font-medium">Request</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded-full bg-emerald-500" />
            <span className="text-gray-600 font-medium">Response</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded-full bg-violet-500" />
            <span className="text-gray-600 font-medium">Context</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded-full bg-rose-500" />
            <span className="text-gray-600 font-medium">Override</span>
          </div>
        </div>
        <div className="ml-auto flex items-center gap-4 text-gray-400">
          <span>Select field + click button to mark</span>
          <span>•</span>
          <span>Double-click to rename</span>
          <span>•</span>
          <span>Drag handles to connect</span>
        </div>
      </div>

      {/* Canvas */}
      <div className="flex-1">
        {isEmpty ? (
          <div className="h-full flex items-center justify-center">
            <div className="text-center max-w-lg p-8 bg-white/90 backdrop-blur-sm rounded-2xl shadow-xl border">
              <GitBranch className="w-16 h-16 mx-auto mb-4 text-purple-300" />
              <p className="text-xl font-semibold text-gray-600">No data to visualize</p>
              <p className="text-sm text-gray-400 mt-2">
                Parse a cURL command and paste a response to see the fields.
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
              // Remove edge and update state
              if (edge.target === 'context-storage') {
                const sourceNode = nodes.find(n => n.id === edge.source);
                if (sourceNode) {
                  const fieldKey = sourceNode.data.originalKey || sourceNode.data.key;
                  setContextFieldMappings(prev => {
                    const updated = new Map(prev);
                    updated.delete(fieldKey);
                    return updated;
                  });
                }
              }
              if (edge.source === 'override-collection') {
                const targetNode = nodes.find(n => n.id === edge.target);
                if (targetNode) {
                  const fieldKey = targetNode.data.originalKey || targetNode.data.key;
                  setOverrideFieldConfigs(prev => {
                    const updated = new Map(prev);
                    updated.delete(fieldKey);
                    return updated;
                  });
                }
              }
              setEdges(eds => eds.filter(e => e.id !== edge.id));
            }}
            nodeTypes={nodeTypes}
            nodesDraggable={true}
            nodesConnectable={true}
            elementsSelectable={true}
            selectNodesOnDrag={false}
            connectionLineType={ConnectionLineType.SmoothStep}
            connectionLineStyle={{ stroke: '#8b5cf6', strokeWidth: 3, strokeDasharray: '8,4' }}
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
            deleteKeyCode={['Backspace', 'Delete']}
          >
            <Background variant={BackgroundVariant.Dots} gap={25} size={2} color="#cbd5e1" />
            <Controls showInteractive={false} className="!bg-white/95 !shadow-lg !rounded-xl !border" />
            <MiniMap
              nodeColor={(node) => {
                if (node.id === 'context-storage') return '#8b5cf6';
                if (node.id === 'override-collection') return '#f43f5e';
                const cat = node.data?.category as FieldCategory;
                return categoryColors[cat]?.handle || '#6b7280';
              }}
              maskColor="rgba(0,0,0,0.05)"
              className="!bg-white/95 !border !rounded-xl !shadow-lg"
              style={{ width: 160, height: 100 }}
            />

            {/* Stats Panel */}
            <Panel position="bottom-left" className="!m-4">
              <div className="bg-white/95 backdrop-blur-sm rounded-xl shadow-lg border p-4">
                <div className="grid grid-cols-5 gap-4 text-center">
                  {/* Inherited fields count */}
                  {inheritedFields.length > 0 && (
                    <div>
                      <div className="text-2xl font-bold text-violet-600">
                        {inheritedFields.length}
                      </div>
                      <div className="text-xs text-gray-500">Inherited</div>
                    </div>
                  )}
                  <div>
                    <div className="text-2xl font-bold text-blue-600">
                      {nodes.filter(n => n.data?.category === 'request').length}
                    </div>
                    <div className="text-xs text-gray-500">Request</div>
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-emerald-600">
                      {nodes.filter(n => n.data?.category === 'response').length}
                    </div>
                    <div className="text-xs text-gray-500">Response</div>
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-violet-600">{contextFields.length}</div>
                    <div className="text-xs text-gray-500">Context</div>
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-rose-600">{overrideFields.length}</div>
                    <div className="text-xs text-gray-500">Override</div>
                  </div>
                </div>
              </div>
            </Panel>

            {/* Step Overview Panel - shows step navigation */}
            {showStepOverview && stepName && (
              <Panel position="top-left" className="!m-4">
                <div className="bg-white/95 backdrop-blur-sm rounded-xl shadow-lg border p-3">
                  <div className="text-xs font-semibold text-gray-600 mb-2">Current Step</div>
                  <div className="flex items-center gap-2">
                    {['TOKEN', 'QUERY', 'SETUP', 'PAYMENT'].map((step, idx) => {
                      const isActive = step === stepName;
                      const isPast = idx < stepIndex;
                      return (
                        <div
                          key={step}
                          className={`px-2 py-1 rounded text-xs font-medium transition-colors ${
                            isActive
                              ? 'bg-purple-100 text-purple-700 ring-2 ring-purple-500 ring-offset-1'
                              : isPast
                                ? 'bg-green-100 text-green-700'
                                : 'bg-gray-100 text-gray-500'
                          }`}
                        >
                          {step[0]}
                        </div>
                      );
                    })}
                  </div>
                </div>
              </Panel>
            )}

            {/* Config Preview */}
            {(contextFieldMappings.size > 0 || overrideFieldConfigs.size > 0) && (
              <Panel position="bottom-right" className="!m-4">
                <div className="bg-white/95 backdrop-blur-sm rounded-xl shadow-lg border p-4 max-w-sm">
                  <div className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
                    <FileJson className="w-4 h-4 text-purple-500" />
                    Generated Config
                  </div>

                  {contextFieldMappings.size > 0 && (
                    <div className="mb-3">
                      <div className="text-xs font-medium text-violet-600 mb-1">Response Mapper (Context):</div>
                      <div className="bg-violet-50 rounded-lg p-2 text-xs font-mono max-h-24 overflow-y-auto">
                        {Array.from(contextFieldMappings.entries()).map(([original, display]) => (
                          <div key={original} className="text-gray-700">
                            &quot;{original}&quot;: &quot;{display}&quot;
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {overrideFieldConfigs.size > 0 && (
                    <div>
                      <div className="text-xs font-medium text-rose-600 mb-1">Override Fields:</div>
                      <div className="bg-rose-50 rounded-lg p-2 text-xs font-mono max-h-32 overflow-y-auto space-y-2">
                        {Array.from(overrideFieldConfigs.values()).map((config) => (
                          <div key={config.actual_mapping} className="text-gray-700 border-b border-rose-100 pb-1 last:border-0 last:pb-0">
                            <div className="font-semibold">{config.field}</div>
                            <div className="text-[10px] text-gray-500">
                              value: {config.value}
                            </div>
                            <div className="text-[10px] text-gray-500">
                              type: {config.type} {config.required && '• required'}
                            </div>
                            {(config.min_length !== undefined || config.max_length !== undefined || config.pattern) && (
                              <div className="text-[10px] text-gray-500">
                                {config.min_length !== undefined && `min: ${config.min_length} `}
                                {config.max_length !== undefined && `max: ${config.max_length} `}
                                {config.pattern && `pattern: ${config.pattern}`}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </Panel>
            )}
          </ReactFlow>
        )}
      </div>

      {/* Override Field Configuration Modal */}
      <OverrideFieldModal
        isOpen={showOverrideModal}
        field={editingOverrideField}
        onSave={handleSaveOverrideField}
        onClose={() => {
          setShowOverrideModal(false);
          setEditingOverrideField(null);
        }}
      />
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
