'use client';

import { useAppStore } from '@/lib/store';
import { TestConsole } from '@/components/TestConsole';
import { CollectionsManager } from '@/components/CollectionsManager';
import { RequestResponseMapper } from '@/components/RequestResponseMapper';
import {
  Play,
  FolderOpen,
  Settings,
  Zap,
  Map,
} from 'lucide-react';
import { useEffect } from 'react';

export default function Home() {
  const { activeTab, setActiveTab, collection, apiBaseUrl, setApiBaseUrl ,clearHistory} = useAppStore();
  const tabs = [
    { id: 'mapper', label: 'cURL Mapper', icon: Map },
    { id: 'test', label: 'Test Console', icon: Play },
    { id: 'collections', label: 'Collections', icon: FolderOpen },
  ] as const;

 useEffect(() => {
  const navEntries = performance.getEntriesByType("navigation") as PerformanceNavigationTiming[];

  if (navEntries.length > 0 && navEntries[0].type === "reload") {
    clearHistory();
  }
}, []);
  return (
    <div className="h-screen flex flex-col bg-gray-100">
      {/* Header */}
      <header className="bg-white border-b px-6 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-blue-600 to-purple-600 flex items-center justify-center">
            <Zap className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-lg font-semibold text-gray-800">Utility Parser Builder</h1>
            <p className="text-xs text-gray-500">Visual JSON mapping for utility integrations</p>
          </div>
        </div>

        <div className="flex items-center gap-4">
          {collection && (
            <div className="text-sm">
              <span className="text-gray-500">Editing: </span>
              <span className="font-medium text-gray-800">
                {collection.name || collection.template_code || 'New Collection'}
              </span>
            </div>
          )}

          <div className="flex items-center gap-2 px-3 py-1.5 bg-gray-100 rounded-lg">
            <Settings className="w-4 h-4 text-gray-500" />
            <input
              type="text"
              value={apiBaseUrl}
              onChange={(e) => setApiBaseUrl(e.target.value)}
              className="bg-transparent text-sm font-mono w-48 focus:outline-none"
              placeholder="API Base URL"
            />
          </div>
        </div>
      </header>

      {/* Navigation tabs */}
      <nav className="bg-white border-b px-6">
        <div className="flex">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-5 py-3 text-sm font-medium border-b-2 transition-colors ${
                activeTab === tab.id
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              <tab.icon className="w-4 h-4" />
              {tab.label}
            </button>
          ))}
        </div>
      </nav>

      {/* Main content */}
      <main className="flex-1 overflow-hidden">
        {activeTab === 'mapper' && <RequestResponseMapper />}
        {activeTab === 'test' && <TestConsole />}
        {activeTab === 'collections' && <CollectionsManager />}
      </main>
    </div>
  );
}
