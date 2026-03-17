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

interface StepSelectorProps {
  templateCode: string;
  steps?: Array<{ name: string; index: number }>;
  activeStepIndex: number;
  onStepChange: (index: number) => void;
  className?: string;
}

export function StepSelector({
  templateCode,
  steps,
  activeStepIndex,
  onStepChange,
  className = '',
}: StepSelectorProps) {
  const { multiStepData } = useAppStore();

  // Default steps if not provided
  const stepList = useMemo(() => {
    if (steps) return steps;
    return [
      { name: 'TOKEN', index: 0 },
      { name: 'QUERY', index: 1 },
      { name: 'SETUP', index: 2 },
      { name: 'PAYMENT', index: 3 },
    ];
  }, [steps]);

  // Get step data for status
  const stepData = multiStepData[templateCode]?.steps || [];

  return (
    <div className={`flex items-center ${className}`}>
      {/* Step tabs */}
      <div className="flex items-center gap-1">
        {stepList.map((step, idx) => {
          const config = STEP_CONFIG[step.name] || STEP_CONFIG.TOKEN;
          const Icon = config.icon;
          const isActive = activeStepIndex === step.index;
          const status = stepData[step.index] ? getStepStatus(stepData[step.index]) : 'pending';

          return (
            <div key={step.name} className="flex items-center">
              <button
                onClick={() => onStepChange(step.index)}
                className={`relative flex items-center gap-2 px-4 py-1 rounded transition-all duration-200 ${
                  isActive
                    ? `${config.activeBg} ${config.borderColor} border-2 shadow-md`
                    : `${config.bgColor} border border-transparent ${config.hoverBg}`
                }`}
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
              </button>

              {/* Arrow between steps */}
              {idx < stepList.length - 1 && (
                <ChevronRight className="w-4 h-4 text-gray-400 mx-1" />
              )}
            </div>
          );
        })}
      </div>

      {/* Active step info */}
      <div className="ml-4 flex items-center gap-2">
        <div className="text-xs text-gray-500">
          Step <span className="font-bold text-gray-700">{activeStepIndex + 1}</span> of {stepList.length}
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
  className = '',
}: StepSelectorProps) {
  const { multiStepData } = useAppStore();

  const stepList = useMemo(() => {
    if (steps) return steps;
    return [
      { name: 'TOKEN', index: 0 },
      { name: 'QUERY', index: 1 },
      { name: 'SETUP', index: 2 },
      { name: 'PAYMENT', index: 3 },
    ];
  }, [steps]);

  const stepData = multiStepData[templateCode]?.steps || [];

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      {stepList.map((step, idx) => {
        const config = STEP_CONFIG[step.name] || STEP_CONFIG.TOKEN;
        const isActive = activeStepIndex === step.index;
        const status = stepData[step.index] ? getStepStatus(stepData[step.index]) : 'pending';

        return (
          <div key={step.name} className="flex items-center">
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
                <div className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" />
              ) : (
                <span className={`text-xs font-bold ${config.textColor}`}>
                  {step.name[0]}
                </span>
              )}
            </button>

            {idx < stepList.length - 1 && (
              <div
                className={`w-4 h-0.5 mx-0.5 ${
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
