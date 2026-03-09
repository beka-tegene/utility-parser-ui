'use client';

import { memo } from 'react';
import { Handle, Position, NodeProps } from 'reactflow';
import {
  Clock,
  Database,
  Zap,
  ChevronRight,
  ArrowDown,
} from 'lucide-react';

// Step colors for timeline
const STEP_COLORS: Record<string, { bg: string; border: string; text: string; accent: string }> = {
  TOKEN: {
    bg: 'bg-amber-50',
    border: 'border-amber-300',
    text: 'text-amber-700',
    accent: '#f59e0b',
  },
  QUERY: {
    bg: 'bg-blue-50',
    border: 'border-blue-300',
    text: 'text-blue-700',
    accent: '#3b82f6',
  },
  SETUP: {
    bg: 'bg-violet-50',
    border: 'border-violet-300',
    text: 'text-violet-700',
    accent: '#8b5cf6',
  },
  PAYMENT: {
    bg: 'bg-emerald-50',
    border: 'border-emerald-300',
    text: 'text-emerald-700',
    accent: '#10b981',
  },
};

// Field entry in the timeline
interface TimelineField {
  key: string;
  value: unknown;
  step: string;
  stepIndex: number;
}

// Timeline node data
interface ContextTimelineNodeData {
  fields: TimelineField[];
  label: string;
  currentStep?: string;
}

// Individual field entry component
function FieldEntry({ field }: { field: TimelineField }) {
  const colors = STEP_COLORS[field.step] || STEP_COLORS.TOKEN;

  return (
    <div className="flex items-start gap-2 py-2 px-3 hover:bg-gray-50 rounded-lg transition-colors group">
      {/* Timeline dot */}
      <div className="flex flex-col items-center mt-1">
        <div
          className="w-3 h-3 rounded-full border-2"
          style={{ borderColor: colors.accent, backgroundColor: `${colors.accent}20` }}
        />
        <div className="w-0.5 h-full bg-gray-200 mt-1" />
      </div>

      {/* Field content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-0.5">
          <span className={`text-xs font-bold px-1.5 py-0.5 rounded ${colors.bg} ${colors.text}`}>
            {field.step}
          </span>
          <span className="text-xs text-gray-400">→</span>
          <span className="text-sm font-semibold text-gray-800 truncate">{field.key}</span>
        </div>
        <div className="text-xs text-gray-500 font-mono truncate pl-0.5">
          {typeof field.value === 'object'
            ? JSON.stringify(field.value).slice(0, 40) + '...'
            : String(field.value).slice(0, 50)}
        </div>
      </div>

      {/* Quick action indicator */}
      <div className="opacity-0 group-hover:opacity-100 transition-opacity">
        <Zap className="w-3.5 h-3.5 text-violet-500" />
      </div>
    </div>
  );
}

// Main Context Timeline Node component
export const ContextTimelineNode = memo(function ContextTimelineNode({
  data,
  selected,
}: NodeProps<ContextTimelineNodeData>) {
  // Group fields by step
  const fieldsByStep: Record<string, TimelineField[]> = {};
  data.fields.forEach((field) => {
    if (!fieldsByStep[field.step]) {
      fieldsByStep[field.step] = [];
    }
    fieldsByStep[field.step].push(field);
  });

  const stepOrder = ['TOKEN', 'QUERY', 'SETUP', 'PAYMENT'];
  const orderedSteps = stepOrder.filter((step) => fieldsByStep[step]);

  return (
    <div
      className={`relative min-w-[280px] max-w-[320px] bg-white rounded-xl border-2 shadow-lg transition-all duration-200
        ${selected ? 'ring-2 ring-purple-500 ring-offset-2 shadow-xl border-purple-300' : 'border-gray-200'}
      `}
    >
      {/* Connection handle */}
      <Handle
        type="target"
        position={Position.Left}
        className="!w-4 !h-4 !bg-violet-500 !border-2 !border-white !shadow-md"
        style={{ left: -8 }}
      />

      {/* Header */}
      <div className="px-4 py-3 bg-gradient-to-r from-violet-500 to-purple-600 rounded-t-lg">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-white/20 rounded-lg flex items-center justify-center">
            <Clock className="w-4 h-4 text-white" />
          </div>
          <div>
            <div className="text-sm font-bold text-white">{data.label}</div>
            <div className="text-xs text-white/70">
              {data.fields.length} field{data.fields.length !== 1 ? 's' : ''} accumulated
            </div>
          </div>
        </div>
      </div>

      {/* Timeline content */}
      <div className="p-2 max-h-[400px] overflow-y-auto">
        {data.fields.length === 0 ? (
          <div className="py-6 text-center text-gray-400">
            <Database className="w-8 h-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm">No fields accumulated yet</p>
            <p className="text-xs mt-1">
              Mark response fields to store in context
            </p>
          </div>
        ) : (
          <div className="space-y-1">
            {orderedSteps.map((step, stepIdx) => (
              <div key={step}>
                {/* Step header */}
                <div className="flex items-center gap-2 px-3 py-1.5 sticky top-0 bg-white/95 backdrop-blur-sm z-10">
                  <div
                    className="w-2 h-2 rounded-full"
                    style={{ backgroundColor: STEP_COLORS[step]?.accent }}
                  />
                  <span className="text-xs font-semibold text-gray-600">{step}</span>
                  <span className="text-xs text-gray-400">
                    ({fieldsByStep[step].length})
                  </span>
                  {stepIdx < orderedSteps.length - 1 && (
                    <ArrowDown className="w-3 h-3 text-gray-300 ml-auto" />
                  )}
                </div>

                {/* Fields for this step */}
                {fieldsByStep[step].map((field, idx) => (
                  <FieldEntry key={`${field.step}-${field.key}-${idx}`} field={field} />
                ))}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Footer - current step indicator */}
      {data.currentStep && (
        <div className="px-4 py-2 border-t bg-gray-50 rounded-b-lg">
          <div className="flex items-center gap-2 text-xs">
            <ChevronRight className="w-3 h-3 text-gray-400" />
            <span className="text-gray-500">Current:</span>
            <span
              className={`font-semibold px-1.5 py-0.5 rounded ${
                STEP_COLORS[data.currentStep]?.bg || 'bg-gray-100'
              } ${STEP_COLORS[data.currentStep]?.text || 'text-gray-700'}`}
            >
              {data.currentStep}
            </span>
          </div>
        </div>
      )}
    </div>
  );
});

// Step Indicator Node - shows step name and status at top of each section
interface StepIndicatorNodeData {
  stepName: string;
  stepIndex: number;
  status: 'pending' | 'in_progress' | 'completed' | 'error';
  isActive: boolean;
}

export const StepIndicatorNode = memo(function StepIndicatorNode({
  data,
  selected,
}: NodeProps<StepIndicatorNodeData>) {
  const colors = STEP_COLORS[data.stepName] || STEP_COLORS.TOKEN;

  const statusColors = {
    pending: 'bg-gray-100 text-gray-500',
    in_progress: 'bg-blue-100 text-blue-600',
    completed: 'bg-green-100 text-green-600',
    error: 'bg-red-100 text-red-600',
  };

  const statusIcons = {
    pending: '○',
    in_progress: '◐',
    completed: '✓',
    error: '✗',
  };

  return (
    <div
      className={`px-4 py-2 rounded-full flex items-center gap-2 transition-all duration-200 cursor-pointer
        ${colors.bg} border-2 ${data.isActive ? colors.border : 'border-transparent'}
        ${selected ? 'ring-2 ring-purple-500 ring-offset-1 shadow-lg' : 'shadow-md'}
        hover:shadow-lg
      `}
      style={{ borderColor: data.isActive ? colors.accent : undefined }}
    >
      {/* Status icon */}
      <span className={`w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold ${statusColors[data.status]}`}>
        {statusIcons[data.status]}
      </span>

      {/* Step name */}
      <span className={`text-sm font-bold ${colors.text}`}>
        {data.stepName}
      </span>

      {/* Step index */}
      <span className="text-xs text-gray-400">
        #{data.stepIndex + 1}
      </span>
    </div>
  );
});

// Inherited Field Node - shows fields inherited from previous steps
interface InheritedFieldNodeData {
  fieldKey: string;
  value: unknown;
  fromStep: string;
  fromStepIndex: number;
  dataType: string;
}

export const InheritedFieldNode = memo(function InheritedFieldNode({
  data,
  selected,
}: NodeProps<InheritedFieldNodeData>) {
  const colors = STEP_COLORS[data.fromStep] || STEP_COLORS.TOKEN;

  return (
    <div
      className={`relative min-w-[180px] max-w-[240px] rounded-xl border-2 border-dashed shadow-md transition-all duration-200
        ${colors.bg} ${colors.border}
        ${selected ? 'ring-2 ring-purple-500 ring-offset-2 shadow-xl' : ''}
        hover:shadow-lg
      `}
    >
      {/* Connection handles */}
      <Handle
        type="target"
        position={Position.Left}
        className="!w-3 !h-3 !bg-white !border-2 !shadow-sm"
        style={{ borderColor: colors.accent, left: -6 }}
      />
      <Handle
        type="source"
        position={Position.Right}
        className="!w-3 !h-3 !bg-white !border-2 !shadow-sm"
        style={{ borderColor: colors.accent, right: -6 }}
      />

      {/* From badge */}
      <div className="absolute -top-2.5 left-3 px-2 py-0.5 text-[10px] font-bold bg-violet-500 text-white rounded-full shadow flex items-center gap-1">
        <Database className="w-2.5 h-2.5" />
        from: {data.fromStep}
      </div>

      {/* Header */}
      <div className={`px-3 py-2 border-b border-dashed ${colors.border}`}>
        <div className="flex items-center justify-between">
          <span className={`text-xs font-semibold uppercase tracking-wider ${colors.text}`}>
            inherited
          </span>
          <span className="text-[10px] px-1.5 py-0.5 bg-white/50 rounded text-gray-600">
            {data.dataType}
          </span>
        </div>
      </div>

      {/* Content */}
      <div className="px-3 py-2">
        <div className="text-sm font-bold text-gray-800 truncate">{data.fieldKey}</div>
        {data.value !== undefined && (
          <div className="text-xs text-gray-500 font-mono mt-1 truncate">
            {String(data.value).slice(0, 30)}
            {String(data.value).length > 30 && '...'}
          </div>
        )}
      </div>
    </div>
  );
});

export default ContextTimelineNode;
