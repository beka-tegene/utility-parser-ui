'use client';

import { useState, useEffect } from 'react';
import { useAppStore } from '@/lib/store';
import {
  Search,
  Plus,
  Trash2,
  Edit,
  Download,
  Upload,
  RefreshCw,
  Loader2,
  FolderOpen,
  AlertCircle,
} from 'lucide-react';
import type { Collection } from '@/types';

export function CollectionsManager() {
  const {
    collections,
    setCollections,
    setCollection,
    apiBaseUrl,
    setActiveTab,
    setCurrentTemplateIndex,
  } = useAppStore();

  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchCollections = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(`${apiBaseUrl}/api/v1/cbesuperapp/utility/collections`);

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();

      if (data.success && Array.isArray(data.data)) {
        setCollections(data.data);
      } else if (Array.isArray(data)) {
        setCollections(data);
      } else {
        throw new Error('Invalid response format');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch collections');
    }

    setIsLoading(false);
  };

  const handleEditCollection = (collection: Collection) => {
    setCollection(collection);
    setCurrentTemplateIndex(0);
    setActiveTab('mapper');
  };

  const handleDeleteCollection = async (collection: Collection) => {
    if (!confirm(`Are you sure you want to delete "${collection.name}"?`)) {
      return;
    }

    try {
      const response = await fetch(
        `${apiBaseUrl}/api/v1/cbesuperapp/utility/collections/${collection.template_code}`,
        { method: 'DELETE' }
      );

      if (response.ok) {
        setCollections(collections.filter(c => c.template_code !== collection.template_code));
      } else {
        throw new Error('Failed to delete collection');
      }
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to delete collection');
    }
  };

  const handleExportCollection = (collection: Collection) => {
    const json = JSON.stringify(collection, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${collection.template_code}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImportCollection = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const json = JSON.parse(e.target?.result as string);

        const response = await fetch(`${apiBaseUrl}/api/v1/cbesuperapp/utility/collections`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(json),
        });

        if (response.ok) {
          fetchCollections();
        } else {
          throw new Error('Failed to import collection');
        }
      } catch (err) {
        alert(err instanceof Error ? err.message : 'Failed to import collection');
      }
    };
    reader.readAsText(file);
    event.target.value = '';
  };

  const handleCreateNew = () => {
    setCollection(null);
    setCurrentTemplateIndex(0);
    setActiveTab('mapper');
  };

  const filteredCollections = collections.filter(
    c =>
      c.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.template_code?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="p-4 border-b bg-white">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-800">Collections</h2>
          <div className="flex items-center gap-2">
            <button
              onClick={fetchCollections}
              disabled={isLoading}
              className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-gray-600 bg-gray-100 rounded-md hover:bg-gray-200 transition-colors"
            >
              <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
              Refresh
            </button>
            <label className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-gray-600 bg-gray-100 rounded-md hover:bg-gray-200 transition-colors cursor-pointer">
              <Upload className="w-4 h-4" />
              Import
              <input
                type="file"
                accept=".json"
                onChange={handleImportCollection}
                className="hidden"
              />
            </label>
            <button
              onClick={handleCreateNew}
              className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-white bg-blue-600 rounded-md hover:bg-blue-700 transition-colors"
            >
              <Plus className="w-4 h-4" />
              New Collection
            </button>
          </div>
        </div>

        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search collections..."
            className="w-full pl-10 pr-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto p-4">
        {isLoading && collections.length === 0 ? (
          <div className="flex items-center justify-center h-full">
            <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
          </div>
        ) : error ? (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <AlertCircle className="w-12 h-12 text-red-400 mb-4" />
            <p className="text-gray-600 mb-2">Failed to load collections</p>
            <p className="text-sm text-gray-400 mb-4">{error}</p>
            <button
              onClick={fetchCollections}
              className="px-4 py-2 text-sm text-white bg-blue-600 rounded-md hover:bg-blue-700"
            >
              Try Again
            </button>
          </div>
        ) : filteredCollections.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <FolderOpen className="w-12 h-12 text-gray-300 mb-4" />
            <p className="text-gray-600 mb-2">
              {searchQuery ? 'No collections match your search' : 'No collections yet'}
            </p>
            <p className="text-sm text-gray-400 mb-4">
              {searchQuery
                ? 'Try a different search term'
                : 'Create a new collection or import an existing one'}
            </p>
            {!searchQuery && (
              <button
                onClick={handleCreateNew}
                className="px-4 py-2 text-sm text-white bg-blue-600 rounded-md hover:bg-blue-700"
              >
                Create New Collection
              </button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredCollections.map((collection) => (
              <div
                key={collection.template_code}
                className="bg-white border rounded-lg p-4 hover:shadow-md transition-shadow"
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3">
                    {collection.logo ? (
                      <img
                        src={collection.logo}
                        alt={collection.name}
                        className="w-10 h-10 rounded-lg object-cover"
                      />
                    ) : (
                      <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-bold">
                        {collection.name?.charAt(0) || 'U'}
                      </div>
                    )}
                    <div>
                      <h3 className="font-medium text-gray-800">
                        {collection.name || 'Unnamed'}
                      </h3>
                      <p className="text-xs text-gray-500 font-mono">
                        {collection.template_code}
                      </p>
                    </div>
                  </div>
                </div>

                {collection.description && (
                  <p className="text-sm text-gray-600 mb-3 line-clamp-2">
                    {collection.description}
                  </p>
                )}

                <div className="flex items-center gap-4 text-xs text-gray-500 mb-4">
                  <span>{collection.sequence || collection.templates?.length || 0} steps</span>
                  {collection.ussd_enabled && (
                    <span className="px-2 py-0.5 bg-green-100 text-green-700 rounded">
                      USSD
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-2 pt-3 border-t">
                  <button
                    onClick={() => handleEditCollection(collection)}
                    className="flex-1 flex items-center justify-center gap-1.5 px-3 py-1.5 text-sm text-blue-600 hover:bg-blue-50 rounded-md transition-colors"
                  >
                    <Edit className="w-3.5 h-3.5" />
                    Edit
                  </button>
                  <button
                    onClick={() => handleExportCollection(collection)}
                    className="flex items-center justify-center gap-1.5 px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-50 rounded-md transition-colors"
                  >
                    <Download className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => handleDeleteCollection(collection)}
                    className="flex items-center justify-center gap-1.5 px-3 py-1.5 text-sm text-red-600 hover:bg-red-50 rounded-md transition-colors"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
