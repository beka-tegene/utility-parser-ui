'use client';

import { useState, useCallback, useMemo } from 'react';
import { useAppStore } from '@/lib/store';
import type { PayableItem, AccumulatedContext } from '@/types';
import {
  Settings,
  Plus,
  Trash2,
  CreditCard,
  Layers,
  DollarSign,
  Hash,
  Tag,
  ArrowRight,
  Database,
  Zap,
  CheckCircle2,
  AlertCircle,
  Copy,
  Check,
} from 'lucide-react';

interface SetupStepEditorProps {
  templateCode: string;
  onConfigChange?: (config: {
    type: 'single' | 'bulk';
    payables: PayableItem[];
  }) => void;
  className?: string;
}

export function SetupStepEditor({
  templateCode,
  onConfigChange,
  className = '',
}: SetupStepEditorProps) {
  const { multiStepData } = useAppStore();
  const [paymentType, setPaymentType] = useState<'single' | 'bulk'>('single');
  const [payables, setPayables] = useState<PayableItem[]>([]);
  const [copied, setCopied] = useState(false);

  // Get accumulated context from previous steps
  const accumulatedContext = useMemo(() => {
    const data = multiStepData[templateCode];
    if (!data) return {};

    const accumulated: Record<string, unknown> = {};
    Object.entries(data.accumulatedContext).forEach(([stepName, stepData]) => {
      Object.entries(stepData.fields).forEach(([key, value]) => {
        accumulated[`${stepName}.${key}`] = value;
        accumulated[key] = value; // Also available without prefix
      });
    });
    return accumulated;
  }, [multiStepData, templateCode]);

  // Available fields from accumulated context
  const availableFields = useMemo(() => {
    return Object.keys(accumulatedContext).map(key => ({
      key,
      value: accumulatedContext[key],
      type: typeof accumulatedContext[key],
    }));
  }, [accumulatedContext]);

  // Amount fields (likely numeric)
  const amountFields = useMemo(() => {
    return availableFields.filter(f =>
      f.type === 'number' ||
      f.key.toLowerCase().includes('amount') ||
      f.key.toLowerCase().includes('total') ||
      f.key.toLowerCase().includes('balance') ||
      f.key.toLowerCase().includes('fee') ||
      f.key.toLowerCase().includes('charge')
    );
  }, [availableFields]);

  // Handle adding a new payable
  const handleAddPayable = useCallback(() => {
    const newPayable: PayableItem = {
      key: `payable_${payables.length + 1}`,
      label: `Payable ${payables.length + 1}`,
      amount: '',
      credit_account: '',
    };
    const updated = [...payables, newPayable];
    setPayables(updated);
    onConfigChange?.({ type: paymentType, payables: updated });
  }, [payables, paymentType, onConfigChange]);

  // Handle removing a payable
  const handleRemovePayable = useCallback((index: number) => {
    const updated = payables.filter((_, i) => i !== index);
    setPayables(updated);
    onConfigChange?.({ type: paymentType, payables: updated });
  }, [payables, paymentType, onConfigChange]);

  // Handle updating a payable
  const handleUpdatePayable = useCallback((index: number, field: keyof PayableItem, value: string) => {
    const updated = [...payables];
    updated[index] = { ...updated[index], [field]: value };
    setPayables(updated);
    onConfigChange?.({ type: paymentType, payables: updated });
  }, [payables, paymentType, onConfigChange]);

  // Handle payment type change
  const handleTypeChange = useCallback((type: 'single' | 'bulk') => {
    setPaymentType(type);
    onConfigChange?.({ type, payables });
  }, [payables, onConfigChange]);

  // Calculate total amount
  const totalAmount = useMemo(() => {
    return payables.reduce((sum, p) => {
      const amountValue = p.amount.startsWith('accumulated.')
        ? accumulatedContext[p.amount.replace('accumulated.', '')] as number || 0
        : parseFloat(p.amount) || 0;
      return sum + amountValue;
    }, 0);
  }, [payables, accumulatedContext]);

  // Copy config to clipboard
  const handleCopyConfig = useCallback(() => {
    const config = {
      type: paymentType,
      payables: payables.map(p => ({
        key: p.key,
        label: p.label,
        amount: p.amount,
        credit_account: p.credit_account,
      })),
    };
    navigator.clipboard.writeText(JSON.stringify(config, null, 2));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [paymentType, payables]);

  return (
    <div className={`bg-white rounded-xl border shadow-sm overflow-hidden ${className}`}>
      {/* Header */}
      <div className="px-5 py-4 bg-gradient-to-r from-violet-50 to-purple-50 border-b">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center shadow-lg">
              <Settings className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-800">Setup Step Configuration</h3>
              <p className="text-sm text-gray-500">Configure payables from accumulated context</p>
            </div>
          </div>
          <button
            onClick={handleCopyConfig}
            className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-gray-600 bg-white rounded-lg border hover:bg-gray-50 transition-colors"
          >
            {copied ? <Check className="w-4 h-4 text-green-600" /> : <Copy className="w-4 h-4" />}
            {copied ? 'Copied!' : 'Copy Config'}
          </button>
        </div>
      </div>

      {/* Payment Type Toggle */}
      <div className="px-5 py-4 border-b bg-gray-50">
        <div className="flex items-center gap-3">
          <span className="text-sm font-medium text-gray-700">Payment Type:</span>
          <div className="flex items-center bg-white rounded-lg border p-1">
            <button
              onClick={() => handleTypeChange('single')}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                paymentType === 'single'
                  ? 'bg-violet-100 text-violet-700'
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              <CreditCard className="w-4 h-4" />
              Single
            </button>
            <button
              onClick={() => handleTypeChange('bulk')}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                paymentType === 'bulk'
                  ? 'bg-violet-100 text-violet-700'
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              <Layers className="w-4 h-4" />
              Bulk
            </button>
          </div>
        </div>
      </div>

      {/* Accumulated Context Summary */}
      {availableFields.length > 0 && (
        <div className="px-5 py-3 border-b bg-gradient-to-r from-blue-50 to-indigo-50">
          <div className="flex items-center gap-2 mb-2">
            <Database className="w-4 h-4 text-blue-600" />
            <span className="text-sm font-medium text-blue-800">Available from Context</span>
            <span className="px-2 py-0.5 text-xs font-medium bg-blue-100 text-blue-700 rounded-full">
              {availableFields.length} fields
            </span>
          </div>
          <div className="flex flex-wrap gap-2">
            {amountFields.slice(0, 6).map((field) => (
              <div
                key={field.key}
                className="flex items-center gap-1.5 px-2 py-1 bg-white rounded-md border text-xs"
              >
                <Zap className="w-3 h-3 text-amber-500" />
                <span className="font-mono text-gray-700">{field.key}</span>
                <span className="text-gray-400">=</span>
                <span className="font-medium text-blue-600">
                  {typeof field.value === 'number' ? field.value.toLocaleString() : String(field.value).slice(0, 20)}
                </span>
              </div>
            ))}
            {amountFields.length > 6 && (
              <span className="text-xs text-gray-500 self-center">
                +{amountFields.length - 6} more
              </span>
            )}
          </div>
        </div>
      )}

      {/* Payables List */}
      <div className="px-5 py-4">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-gray-700">Payables</span>
            <span className="px-2 py-0.5 text-xs font-medium bg-gray-100 text-gray-600 rounded-full">
              {payables.length}
            </span>
          </div>
          <button
            onClick={handleAddPayable}
            className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-violet-700 bg-violet-50 rounded-lg hover:bg-violet-100 transition-colors"
          >
            <Plus className="w-4 h-4" />
            Add Payable
          </button>
        </div>

        {payables.length === 0 ? (
          <div className="text-center py-8 border-2 border-dashed border-gray-200 rounded-lg">
            <DollarSign className="w-10 h-10 text-gray-300 mx-auto mb-2" />
            <p className="text-sm text-gray-500">No payables configured</p>
            <p className="text-xs text-gray-400 mt-1">Click &quot;Add Payable&quot; to configure payment items</p>
          </div>
        ) : (
          <div className="space-y-3">
            {payables.map((payable, index) => (
              <div
                key={index}
                className="p-4 border rounded-lg bg-gray-50 hover:bg-gray-100 transition-colors"
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <span className="w-6 h-6 rounded-full bg-violet-100 text-violet-700 flex items-center justify-center text-xs font-bold">
                      {index + 1}
                    </span>
                    <span className="text-sm font-medium text-gray-700">{payable.label || `Payable ${index + 1}`}</span>
                  </div>
                  <button
                    onClick={() => handleRemovePayable(index)}
                    className="p-1.5 text-red-500 hover:bg-red-100 rounded-lg transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  {/* Key */}
                  <div>
                    <label className="flex items-center gap-1.5 text-xs font-medium text-gray-500 mb-1">
                      <Hash className="w-3 h-3" />
                      Key
                    </label>
                    <input
                      type="text"
                      value={payable.key}
                      onChange={(e) => handleUpdatePayable(index, 'key', e.target.value)}
                      placeholder="monthly_rent"
                      className="w-full px-3 py-2 text-sm border rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-violet-500"
                    />
                  </div>

                  {/* Label */}
                  <div>
                    <label className="flex items-center gap-1.5 text-xs font-medium text-gray-500 mb-1">
                      <Tag className="w-3 h-3" />
                      Label
                    </label>
                    <input
                      type="text"
                      value={payable.label}
                      onChange={(e) => handleUpdatePayable(index, 'label', e.target.value)}
                      placeholder="Monthly Rent"
                      className="w-full px-3 py-2 text-sm border rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-violet-500"
                    />
                  </div>

                  {/* Amount */}
                  <div>
                    <label className="flex items-center gap-1.5 text-xs font-medium text-gray-500 mb-1">
                      <DollarSign className="w-3 h-3" />
                      Amount (or context ref)
                    </label>
                    <div className="relative">
                      <input
                        type="text"
                        value={payable.amount}
                        onChange={(e) => handleUpdatePayable(index, 'amount', e.target.value)}
                        placeholder="accumulated.monthly"
                        className="w-full px-3 py-2 text-sm border rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-violet-500"
                      />
                      {payable.amount.startsWith('accumulated.') && (
                        <span className="absolute right-2 top-1/2 -translate-y-1/2 px-1.5 py-0.5 text-xs bg-violet-100 text-violet-700 rounded">
                          ref
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Credit Account */}
                  <div>
                    <label className="flex items-center gap-1.5 text-xs font-medium text-gray-500 mb-1">
                      <CreditCard className="w-3 h-3" />
                      Credit Account
                    </label>
                    <input
                      type="text"
                      value={payable.credit_account}
                      onChange={(e) => handleUpdatePayable(index, 'credit_account', e.target.value)}
                      placeholder="1000300312474"
                      className="w-full px-3 py-2 text-sm border rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-violet-500"
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Amount Summary */}
      {payables.length > 0 && (
        <div className="px-5 py-4 border-t bg-gradient-to-r from-emerald-50 to-green-50">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-emerald-600" />
              <span className="text-sm font-medium text-gray-700">Total Amount</span>
            </div>
            <div className="text-right">
              <div className="text-xl font-bold text-emerald-700">
                {totalAmount > 0 ? totalAmount.toLocaleString() : '—'}
              </div>
              <div className="text-xs text-gray-500">
                {payables.length} payable{payables.length !== 1 ? 's' : ''}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Configuration Preview */}
      <div className="px-5 py-4 border-t bg-gray-50">
        <div className="flex items-center gap-2 mb-2">
          <ArrowRight className="w-4 h-4 text-gray-500" />
          <span className="text-xs font-medium text-gray-600">Generated Body Config</span>
        </div>
        <pre className="p-3 bg-gray-900 text-gray-100 rounded-lg text-xs font-mono overflow-auto max-h-32">
          {JSON.stringify({ type: paymentType, payables }, null, 2)}
        </pre>
      </div>
    </div>
  );
}
