'use client';

import { useMemo } from 'react';
import { useAppStore } from '@/lib/store';
import type { StepStatus, StepCurlData } from '@/types';
import {
  Key,
  Search,
  Settings,
  CreditCard,
  Check,
  Loader2,
  AlertCircle,
  ChevronRight,
  ChevronUp,
  ChevronDown,
  X,
  Plus,
} from 'lucide-react';

// Step type configuration with colors and icons
const STEP_CONFIG: Record<string, {
  color: string;
  bgColor: string;
  borderColor: string;
  textColor: string;
  hoverBg: string;
  activeBg: string;
  icon: React.ComponentType<{ className?: string }>;
}> = {
  TOKEN: {
    color: '#f59e0b',
    bgColor: 'bg-amber-50',
    borderColor: 'border-amber-300',
    textColor: 'text-amber-700',
    hoverBg: 'hover:bg-amber-100',
    activeBg: 'bg-amber-100',
    icon: Key,
  },
  QUERY: {
    color: '#3b82f6',
    bgColor: 'bg-blue-50',
    borderColor: 'border-blue-300',
    textColor: 'text-blue-700',
    hoverBg: 'hover:bg-blue-100',
    activeBg: 'bg-blue-100',
    icon: Search,
  },
  SETUP: {
    color: '#8b5cf6',
    bgColor: 'bg-violet-50',
    borderColor: 'border-violet-300',
    textColor: 'text-violet-700',
    hoverBg: 'hover:bg-violet-100',
    activeBg: 'bg-violet-100',
    icon: Settings,
  },
  PAYMENT: {
    color: '#10b981',
    bgColor: 'bg-emerald-50',
    borderColor: 'border-emerald-300',
    textColor: 'text-emerald-700',
    hoverBg: 'hover:bg-emerald-100',
    activeBg: 'bg-emerald-100',
    icon: CreditCard,
  },
};

// Get step status based on data
function getStepStatus(step: StepCurlData): StepStatus {
  if (step.parsedResponse) {
    return 'completed';
  }
  if (step.curlInput || step.parsedRequest) {
    return 'in_progress';
  }
  return 'pending';
}

// Status indicator component
function StatusIndicator({ status }: { status: StepStatus }) {
  switch (status) {
    case 'completed':
      return (
        <div className="w-5 h-5 rounded-full bg-green-500 flex items-center justify-center shadow-sm">
          <Check className="w-3 h-3 text-white" />
        </div>
      );
    case 'in_progress':
      return (
        <div className="w-5 h-5 rounded-full bg-blue-500 flex items-center justify-center shadow-sm animate-pulse">
          <div className="w-2 h-2 rounded-full bg-white" />
        </div>
      );
    case 'error':
      return (
        <div className="w-5 h-5 rounded-full bg-red-500 flex items-center justify-center shadow-sm">
          <AlertCircle className="w-3 h-3 text-white" />
        </div>
      );
    default:
      return (
        <div className="w-5 h-5 rounded-full border-2 border-gray-300 bg-white" />
      );
  }
}

// Extended step type with ID
interface ExtendedStep {
  name: string;
  index: number;
  id: string;
}

interface StepSelectorProps {
  templateCode: string;
  steps: ExtendedStep[];
  activeStepIndex: number;
  onStepChange: (index: number) => void;
  onRemoveQuery?: (stepId: string) => void;
  onMoveStep?: (stepId: string, direction: 'up' | 'down') => void;
  className?: string;
}

export function StepSelector({
  templateCode,
  steps,
  activeStepIndex,
  onStepChange,
  onRemoveQuery,
  onMoveStep,
  className = '',
}: StepSelectorProps) {
  const { multiStepData } = useAppStore();

  // Get step data for status
  const stepData = multiStepData[templateCode]?.steps || [];

  // Find all query step IDs for reference
  const queryStepIds = useMemo(() => {
    return steps.filter(s => s.name === 'QUERY').map(s => s.id);
  }, [steps]);

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      {/* Step tabs */}
      <div className="flex items-center gap-1">
        {steps.map((step, idx) => {
          const config = STEP_CONFIG[step.name] || STEP_CONFIG.TOKEN;
          const Icon = config.icon;
          const isActive = activeStepIndex === step.index;
          const status = stepData[step.index] ? getStepStatus(stepData[step.index]) : 'pending';
          const isQuery = step.name === 'QUERY';
          const queryNumber = queryStepIds.indexOf(step.id) + 1;

          return (
            <div key={step.id} className="flex items-center group">
              <button
                onClick={() => onStepChange(step.index)}
                className={`relative flex items-center gap-2 px-4 py-1 rounded-lg transition-all duration-200 ${
                  isActive
                    ? `${config.activeBg} ${config.borderColor} border-2 shadow-md scale-105`
                    : `${config.bgColor} border border-transparent ${config.hoverBg}`
                } ${isQuery && !isActive ? 'border border-blue-200' : ''}`}
              >
                {/* Status indicator */}
                <div className="absolute -top-1.5 -right-1.5 z-10">
                  <StatusIndicator status={status} />
                </div>

                {/* Icon */}
                <Icon className={`w-3 h-3 ${config.textColor}`} />

                {/* Step name */}
                <span className={`text-xs font-semibold ${config.textColor}`}>
                  {step.name}
                </span>

                {/* Query number badge */}
                {isQuery && (
                  <span className="text-[9px] px-1.5 py-0.5 bg-blue-100 text-blue-600 rounded-full">
                    #{queryNumber}
                  </span>
                )}
              </button>

              {/* Query controls (show on hover when active or on the specific step) */}
              {isQuery && isActive && (
                <div className="flex items-center gap-0.5 ml-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  {onMoveStep && (
                    <>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onMoveStep(step.id, 'up');
                        }}
                        disabled={idx === 0}
                        className="p-0.5 text-gray-500 hover:bg-gray-200 rounded disabled:opacity-30 transition-colors"
                        title="Move up"
                      >
                        <ChevronUp className="w-3 h-3" />
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onMoveStep(step.id, 'down');
                        }}
                        disabled={idx === steps.length - 1}
                        className="p-0.5 text-gray-500 hover:bg-gray-200 rounded disabled:opacity-30 transition-colors"
                        title="Move down"
                      >
                        <ChevronDown className="w-3 h-3" />
                      </button>
                    </>
                  )}
                  {onRemoveQuery && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onRemoveQuery(step.id);
                      }}
                      className="p-0.5 text-red-500 hover:bg-red-100 rounded transition-colors"
                      title="Remove this query"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  )}
                </div>
              )}

              {/* Arrow between steps */}
              {idx < steps.length - 1 && (
                <div className="flex items-center">
                  <ChevronRight className="w-4 h-4 text-gray-300 ml-1" />
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Active step info */}
      <div className="ml-2 flex items-center gap-2">
        <div className="text-xs text-gray-500">
          Step <span className="font-bold text-gray-700">{activeStepIndex + 1}</span> of {steps.length}
        </div>
        <div className="text-xs text-gray-400">
          ({steps.filter(s => s.name === 'QUERY').length} query{steps.filter(s => s.name === 'QUERY').length > 1 ? 's' : ''})
        </div>
      </div>
    </div>
  );
}

// Compact version for smaller spaces
export function StepSelectorCompact({
  templateCode,
  steps,
  activeStepIndex,
  onStepChange,
  onRemoveQuery,
  onMoveStep,
  className = '',
}: StepSelectorProps) {
  const { multiStepData } = useAppStore();

  const stepData = multiStepData[templateCode]?.steps || [];

  return (
    <div className={`flex items-center gap-1 ${className}`}>
      {steps.map((step, idx) => {
        const config = STEP_CONFIG[step.name] || STEP_CONFIG.TOKEN;
        const isActive = activeStepIndex === step.index;
        const status = stepData[step.index] ? getStepStatus(stepData[step.index]) : 'pending';
        const isQuery = step.name === 'QUERY';

        return (
          <div key={step.id} className="flex items-center group">
            <button
              onClick={() => onStepChange(step.index)}
              className={`relative w-8 h-8 rounded-full flex items-center justify-center transition-all ${
                isActive
                  ? `${config.activeBg} ring-2 ring-offset-1 ring-current`
                  : `${config.bgColor} ${config.hoverBg}`
              } ${isActive ? config.textColor : ''}`}
              title={`${step.name}${status === 'completed' ? ' (Completed)' : status === 'in_progress' ? ' (In Progress)' : ''}`}
            >
              {status === 'completed' ? (
                <Check className="w-4 h-4 text-green-600" />
              ) : status === 'in_progress' ? (
                <Loader2 className="w-4 h-4 text-blue-500 animate-spin" />
              ) : (
                <span className={`text-xs font-bold ${config.textColor}`}>
                  {step.name[0]}
                </span>
              )}
            </button>

            {/* Compact query controls */}
            {isQuery && isActive && (
              <div className="absolute -bottom-6 left-1/2 -translate-x-1/2 flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity bg-white rounded-full shadow-lg px-1 py-0.5 border">
                {onMoveStep && (
                  <>
                    <button
                      onClick={(e) => { e.stopPropagation(); onMoveStep(step.id, 'up'); }}
                      disabled={idx === 0}
                      className="p-0.5 text-gray-400 hover:bg-gray-100 rounded disabled:opacity-30"
                    >
                      <ChevronUp className="w-2.5 h-2.5" />
                    </button>
                    <button
                      onClick={(e) => { e.stopPropagation(); onMoveStep(step.id, 'down'); }}
                      disabled={idx === steps.length - 1}
                      className="p-0.5 text-gray-400 hover:bg-gray-100 rounded disabled:opacity-30"
                    >
                      <ChevronDown className="w-2.5 h-2.5" />
                    </button>
                  </>
                )}
                {onRemoveQuery && (
                  <button
                    onClick={(e) => { e.stopPropagation(); onRemoveQuery(step.id); }}
                    className="p-0.5 text-red-400 hover:bg-red-100 rounded"
                  >
                    <X className="w-2.5 h-2.5" />
                  </button>
                )}
              </div>
            )}

            {idx < steps.length - 1 && (
              <div
                className={`w-3 h-0.5 mx-0.5 ${
                  status === 'completed' ? 'bg-green-400' : 'bg-gray-200'
                }`}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}

// Component for adding queries (floating button)
export function AddQueryButton({ onAddQuery, className = '' }: { onAddQuery: () => void; className?: string }) {
  return (
    <button
      onClick={onAddQuery}
      className={`flex items-center gap-1.5 px-3 py-1.5 text-sm bg-purple-100 text-purple-700 rounded-lg hover:bg-purple-200 transition-colors font-medium border border-purple-300 whitespace-nowrap ${className}`}
      title="Add a new Query step"
    >
      <Plus className="w-4 h-4" />
      Add Query
    </button>
  );
}

// Export types
export type { ExtendedStep, StepSelectorProps };