'use client';

import { useEffect, useCallback } from 'react';
import { useAppStore } from '@/lib/store';
import { Undo2, Redo2, Clock, Trash2 } from 'lucide-react';

interface HistoryControlsProps {
  className?: string;
  showClear?: boolean;
  compact?: boolean;
}

export function HistoryControls({ className = '', showClear = false, compact = false }: HistoryControlsProps) {
  const { history, undo, redo, canUndo, canRedo, clearHistory } = useAppStore();

  // Keyboard shortcuts
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    // Ctrl+Z for undo
    if ((e.ctrlKey || e.metaKey) && e.key === 'z' && !e.shiftKey) {
      e.preventDefault();
      if (canUndo()) {
        undo();
      }
    }
    // Ctrl+Shift+Z for redo
    if ((e.ctrlKey || e.metaKey) && e.key === 'z' && e.shiftKey) {
      e.preventDefault();
      if (canRedo()) {
        redo();
      }
    }
    // Ctrl+Y for redo (alternative)
    if ((e.ctrlKey || e.metaKey) && e.key === 'y') {
      e.preventDefault();
      if (canRedo()) {
        redo();
      }
    }
  }, [undo, redo, canUndo, canRedo]);

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  const currentPosition = history.currentIndex + 1;
  const totalSnapshots = history.snapshots.length;

  if (compact) {
    return (
      <div className={`flex items-center gap-1 ${className}`}>
        <button
          onClick={undo}
          disabled={!canUndo()}
          className="p-1.5 rounded-lg text-gray-600 hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          title="Undo (Ctrl+Z)"
        >
          <Undo2 className="w-4 h-4" />
        </button>
        <button
          onClick={redo}
          disabled={!canRedo()}
          className="p-1.5 rounded-lg text-gray-600 hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          title="Redo (Ctrl+Shift+Z)"
        >
          <Redo2 className="w-4 h-4" />
        </button>
        {totalSnapshots > 0 && (
          <span className="text-xs text-gray-400 ml-1">
            {currentPosition}/{totalSnapshots}
          </span>
        )}
      </div>
    );
  }

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      {/* History info badge */}
      <div className="flex items-center gap-1.5 px-2 py-1 bg-gray-100 rounded-lg">
        <Clock className="w-3.5 h-3.5 text-gray-500" />
        <span className="text-xs font-medium text-gray-600">
          {totalSnapshots > 0 ? `Edit ${currentPosition} of ${totalSnapshots}` : 'No history'}
        </span>
      </div>

      <div className="h-5 w-px bg-gray-200" />

      {/* Undo button */}
      <button
        onClick={undo}
        disabled={!canUndo()}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors
          enabled:bg-gray-100 enabled:text-gray-700 enabled:hover:bg-gray-200
          disabled:bg-gray-50 disabled:text-gray-400 disabled:cursor-not-allowed"
        title="Undo (Ctrl+Z)"
      >
        <Undo2 className="w-4 h-4" />
        <span>Undo</span>
      </button>

      {/* Redo button */}
      <button
        onClick={redo}
        disabled={!canRedo()}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors
          enabled:bg-gray-100 enabled:text-gray-700 enabled:hover:bg-gray-200
          disabled:bg-gray-50 disabled:text-gray-400 disabled:cursor-not-allowed"
        title="Redo (Ctrl+Shift+Z)"
      >
        <Redo2 className="w-4 h-4" />
        <span>Redo</span>
      </button>

      {/* Clear history button */}
      {showClear && totalSnapshots > 0 && (
        <>
          <div className="h-5 w-px bg-gray-200" />
          <button
            onClick={() => {
              if (window.confirm('Clear all history? This cannot be undone.')) {
                clearHistory();
              }
            }}
            className="flex items-center gap-1.5 px-2 py-1.5 rounded-lg text-sm font-medium text-red-600 bg-red-50 hover:bg-red-100 transition-colors"
            title="Clear history"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </>
      )}
    </div>
  );
}

// Hook for using history with auto-save
export function useHistoryAutoSave() {
  const { saveSnapshot } = useAppStore();

  const saveWithLabel = useCallback((label: string) => {
    saveSnapshot(label);
  }, [saveSnapshot]);

  return { saveWithLabel };
}
