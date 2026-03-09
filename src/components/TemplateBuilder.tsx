'use client';

import { useState, useCallback, useMemo } from 'react';
import { useAppStore, createEmptyTemplate, createEmptyCollection, isSetupStep, needsAuthorization } from '@/lib/store';
import { TableMapper } from './TableMapper';
import { AutoMapper } from './AutoMapper';
import { extractPaths, generateId } from '@/lib/utils';
import { Plus, Trash2, Download, Upload } from 'lucide-react';
import type { Template, Collection, SetupBody, PayableItem } from '@/types';

export function TemplateBuilder() {
  const {
    collection,
    setCollection,
    currentTemplateIndex,
    setCurrentTemplateIndex,
    parsedCurl,
  } = useAppStore();

  const [activeSection, setActiveSection] = useState<'config' | 'mapper' | 'override'>('config');

  const currentCollection = useMemo(() => collection || createEmptyCollection(), [collection]);
  const currentTemplate = useMemo(() => currentCollection.templates[currentTemplateIndex] || createEmptyTemplate(0), [currentCollection.templates, currentTemplateIndex]);

  const isCurrentStepSetup = useMemo(() => isSetupStep(currentTemplate), [currentTemplate]);
  const currentStepNeedsAuth = useMemo(() => needsAuthorization(currentTemplate), [currentTemplate]);
  const isCurrentStepToken = useMemo(() => currentTemplate.current_step === 'TOKEN', [currentTemplate]);

  const handleCollectionChange = useCallback((field: keyof Collection, value: unknown) => {
    setCollection({ ...currentCollection, [field]: value });
  }, [currentCollection, setCollection]);

  const handleTemplateChange = useCallback((field: keyof Template, value: unknown) => {
    const updatedTemplates = [...currentCollection.templates];
    updatedTemplates[currentTemplateIndex] = { ...currentTemplate, [field]: value };
    setCollection({ ...currentCollection, templates: updatedTemplates });
  }, [currentCollection, currentTemplate, currentTemplateIndex, setCollection]);

  const handleAddStep = () => {
    const newTemplate = createEmptyTemplate(currentCollection.templates.length);
    setCollection({
      ...currentCollection,
      templates: [...currentCollection.templates, newTemplate],
    });
    setCurrentTemplateIndex(currentCollection.templates.length);
  };

  const handleRemoveStep = (index: number) => {
    if (currentCollection.templates.length <= 1) return;
    const updatedTemplates = currentCollection.templates.filter((_, i) => i !== index);
    setCollection({ ...currentCollection, templates: updatedTemplates });
    if (currentTemplateIndex >= updatedTemplates.length) {
      setCurrentTemplateIndex(updatedTemplates.length - 1);
    }
  };

  const handleExportJson = () => {
    const json = JSON.stringify(currentCollection, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${currentCollection.template_code || 'template'}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImportJson = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const json = JSON.parse(e.target?.result as string);
        setCollection(json);
        setCurrentTemplateIndex(0);
      } catch {
        alert('Invalid JSON file');
      }
    };
    reader.readAsText(file);
  };

  const sourceFields = parsedCurl?.body ? extractPaths(parsedCurl.body as Record<string, unknown>) : [];

  const requestMappings = Object.entries(currentTemplate.request_mapper || {}).map(
    ([target, source]) => ({
      id: generateId(),
      targetField: target,
      sourceField: typeof source === 'string' ? source.replace(/^(request|accumulated|context|credentials)\./, '') : '',
      sourceType: (typeof source === 'string' && source.startsWith('accumulated.')
        ? 'accumulated'
        : typeof source === 'string' && source.startsWith('context.')
        ? 'context'
        : typeof source === 'string' && source.startsWith('credentials.')
        ? 'credentials'
        : 'request') as 'request' | 'accumulated' | 'context' | 'credentials' | 'static',
    })
  );

  return (
    <div className="flex h-full bg-white">
      {/* Sidebar */}
      <div className="w-56 border-r p-4 flex flex-col">
        <div className="mb-4">
          <label className="text-xs text-gray-500 mb-1 block">Collection Name</label>
          <input
            type="text"
            value={currentCollection.name}
            onChange={(e) => handleCollectionChange('name', e.target.value)}
            placeholder="Name"
            className="w-full px-2 py-1.5 text-sm border rounded focus:outline-none focus:border-gray-400"
          />
        </div>
        <div className="mb-4">
          <label className="text-xs text-gray-500 mb-1 block">Template Code</label>
          <input
            type="text"
            value={currentCollection.template_code}
            onChange={(e) => handleCollectionChange('template_code', e.target.value)}
            placeholder="CODE"
            className="w-full px-2 py-1.5 text-sm border rounded font-mono focus:outline-none focus:border-gray-400"
          />
        </div>

        <div className="flex-1">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-gray-500">Steps</span>
            <button onClick={handleAddStep} className="text-gray-400 hover:text-gray-600">
              <Plus className="w-4 h-4" />
            </button>
          </div>
          <div className="space-y-1">
            {currentCollection.templates.map((template, index) => (
              <div
                key={index}
                onClick={() => setCurrentTemplateIndex(index)}
                className={`group flex items-center justify-between px-2 py-1.5 rounded text-sm cursor-pointer ${
                  index === currentTemplateIndex ? 'bg-gray-100 font-medium' : 'hover:bg-gray-50'
                }`}
              >
                <span>{template.current_step || `Step ${index + 1}`}</span>
                {currentCollection.templates.length > 1 && (
                  <button
                    onClick={(e) => { e.stopPropagation(); handleRemoveStep(index); }}
                    className="opacity-0 group-hover:opacity-100 text-gray-400 hover:text-red-500"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>

        <div className="pt-4 border-t space-y-2">
          <button
            onClick={handleExportJson}
            className="w-full flex items-center justify-center gap-2 px-2 py-1.5 text-sm border rounded hover:bg-gray-50"
          >
            <Download className="w-3 h-3" /> Export
          </button>
          <label className="w-full flex items-center justify-center gap-2 px-2 py-1.5 text-sm border rounded hover:bg-gray-50 cursor-pointer">
            <Upload className="w-3 h-3" /> Import
            <input type="file" accept=".json" onChange={handleImportJson} className="hidden" />
          </label>
        </div>
      </div>

      {/* Main */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Tabs */}
        <div className="flex border-b px-4">
          {[
            { id: 'config', label: 'Config' },
            { id: 'mapper', label: 'Mapper', hide: isCurrentStepSetup },
            { id: 'override', label: 'Overrides', hide: isCurrentStepSetup },
          ].filter(t => !t.hide).map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveSection(tab.id as typeof activeSection)}
              className={`px-4 py-2 text-sm border-b-2 -mb-px ${
                activeSection === tab.id
                  ? 'border-gray-900 text-gray-900'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="flex-1 overflow-auto p-4">
          {/* Config Section */}
          {activeSection === 'config' && (
            <div className="max-w-xl space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-gray-500 mb-1 block">Current Step</label>
                  <select
                    value={currentTemplate.current_step}
                    onChange={(e) => {
                      handleTemplateChange('name', e.target.value);
                      handleTemplateChange('current_step', e.target.value);
                    }}
                    className="w-full px-2 py-1.5 text-sm border rounded focus:outline-none focus:border-gray-400"
                  >
                    <option value="TOKEN">TOKEN</option>
                    <option value="QUERY">QUERY</option>
                    <option value="SETUP">SETUP</option>
                    <option value="PAYMENT">PAYMENT</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs text-gray-500 mb-1 block">Next Step</label>
                  <select
                    value={currentTemplate.next_step}
                    onChange={(e) => handleTemplateChange('next_step', e.target.value)}
                    className="w-full px-2 py-1.5 text-sm border rounded focus:outline-none focus:border-gray-400"
                  >
                    <option value="QUERY">QUERY</option>
                    <option value="SETUP">SETUP</option>
                    <option value="PAYMENT">PAYMENT</option>
                    <option value="DONE">DONE</option>
                  </select>
                </div>
              </div>

              {/* Non-SETUP steps: HTTP config */}
              {!isCurrentStepSetup && (
                <>
                  <div className="grid grid-cols-4 gap-3">
                    <div>
                      <label className="text-xs text-gray-500 mb-1 block">Method</label>
                      <select
                        value={currentTemplate.method || 'POST'}
                        onChange={(e) => handleTemplateChange('method', e.target.value)}
                        className="w-full px-2 py-1.5 text-sm border rounded focus:outline-none focus:border-gray-400"
                      >
                        <option>GET</option>
                        <option>POST</option>
                        <option>PUT</option>
                        <option>DELETE</option>
                      </select>
                    </div>
                    <div className="col-span-3">
                      <label className="text-xs text-gray-500 mb-1 block">URL</label>
                      <input
                        type="text"
                        value={currentTemplate.url || ''}
                        onChange={(e) => handleTemplateChange('url', e.target.value)}
                        placeholder="https://api.example.com/endpoint"
                        className="w-full px-2 py-1.5 text-sm border rounded font-mono focus:outline-none focus:border-gray-400"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-xs text-gray-500 mb-1 block">Headers</label>
                    <textarea
                      value={JSON.stringify(currentTemplate.header_type || {}, null, 2)}
                      onChange={(e) => { try { handleTemplateChange('header_type', JSON.parse(e.target.value)); } catch {} }}
                      rows={3}
                      className="w-full px-2 py-1.5 text-sm border rounded font-mono focus:outline-none focus:border-gray-400"
                    />
                  </div>

                  <div>
                    <label className="text-xs text-gray-500 mb-1 block">Body</label>
                    <textarea
                      value={JSON.stringify(currentTemplate.body, null, 2)}
                      onChange={(e) => { try { handleTemplateChange('body', JSON.parse(e.target.value)); } catch {} }}
                      rows={6}
                      className="w-full px-2 py-1.5 text-sm border rounded font-mono focus:outline-none focus:border-gray-400"
                    />
                  </div>
                </>
              )}

              {/* TOKEN step: Credentials */}
              {isCurrentStepToken && (
                <div className="border rounded p-3 space-y-3">
                  <span className="text-xs text-gray-500">OAuth Credentials</span>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs text-gray-400 mb-1 block">Grant Type</label>
                      <input
                        type="text"
                        value={currentTemplate.credentials?.grant_type || 'client_credentials'}
                        onChange={(e) => handleTemplateChange('credentials', { ...currentTemplate.credentials, grant_type: e.target.value })}
                        className="w-full px-2 py-1.5 text-sm border rounded font-mono focus:outline-none focus:border-gray-400"
                      />
                    </div>
                    <div>
                      <label className="text-xs text-gray-400 mb-1 block">Scope</label>
                      <input
                        type="text"
                        value={currentTemplate.credentials?.scope || ''}
                        onChange={(e) => handleTemplateChange('credentials', { ...currentTemplate.credentials, scope: e.target.value })}
                        className="w-full px-2 py-1.5 text-sm border rounded font-mono focus:outline-none focus:border-gray-400"
                      />
                    </div>
                    <div>
                      <label className="text-xs text-gray-400 mb-1 block">Client ID</label>
                      <input
                        type="text"
                        value={currentTemplate.credentials?.client_id || ''}
                        onChange={(e) => handleTemplateChange('credentials', { ...currentTemplate.credentials, client_id: e.target.value })}
                        className="w-full px-2 py-1.5 text-sm border rounded font-mono focus:outline-none focus:border-gray-400"
                      />
                    </div>
                    <div>
                      <label className="text-xs text-gray-400 mb-1 block">Client Secret</label>
                      <input
                        type="password"
                        value={currentTemplate.credentials?.client_secret || ''}
                        onChange={(e) => handleTemplateChange('credentials', { ...currentTemplate.credentials, client_secret: e.target.value })}
                        className="w-full px-2 py-1.5 text-sm border rounded font-mono focus:outline-none focus:border-gray-400"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* QUERY/PAYMENT: Authorization */}
              {currentStepNeedsAuth && (
                <div className="border rounded p-3 space-y-3">
                  <span className="text-xs text-gray-500">Authorization</span>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs text-gray-400 mb-1 block">Type</label>
                      <select
                        value={currentTemplate.authorization_mapper?.type || 'bearer'}
                        onChange={(e) => handleTemplateChange('authorization_mapper', { ...currentTemplate.authorization_mapper, type: e.target.value })}
                        className="w-full px-2 py-1.5 text-sm border rounded focus:outline-none focus:border-gray-400"
                      >
                        <option value="bearer">Bearer</option>
                        <option value="basic">Basic</option>
                      </select>
                    </div>
                    <div>
                      <label className="text-xs text-gray-400 mb-1 block">Token Source</label>
                      <input
                        type="text"
                        value={currentTemplate.authorization_mapper?.token || 'accumulated.access_token'}
                        onChange={(e) => handleTemplateChange('authorization_mapper', { ...currentTemplate.authorization_mapper, token: e.target.value })}
                        className="w-full px-2 py-1.5 text-sm border rounded font-mono focus:outline-none focus:border-gray-400"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* SETUP step */}
              {isCurrentStepSetup && (
                <div className="space-y-4">
                  <div>
                    <label className="text-xs text-gray-500 mb-2 block">Payment Type</label>
                    <div className="flex gap-4">
                      <label className="flex items-center gap-2 text-sm cursor-pointer">
                        <input
                          type="radio"
                          checked={(currentTemplate.body as SetupBody)?.type === 'single'}
                          onChange={() => handleTemplateChange('body', { type: 'single', payables: [] })}
                        />
                        Single
                      </label>
                      <label className="flex items-center gap-2 text-sm cursor-pointer">
                        <input
                          type="radio"
                          checked={(currentTemplate.body as SetupBody)?.type === 'bulk'}
                          onChange={() => handleTemplateChange('body', { type: 'bulk', payables: (currentTemplate.body as SetupBody)?.payables || [] })}
                        />
                        Bulk
                      </label>
                    </div>
                  </div>

                  {(currentTemplate.body as SetupBody)?.type === 'bulk' && (
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <label className="text-xs text-gray-500">Payables</label>
                        <button
                          onClick={() => {
                            const payables = (currentTemplate.body as SetupBody)?.payables || [];
                            handleTemplateChange('body', {
                              type: 'bulk',
                              payables: [...payables, { key: '', label: '', amount: '', credit_account: '' }],
                            });
                          }}
                          className="text-xs text-gray-500 hover:text-gray-700"
                        >
                          + Add
                        </button>
                      </div>
                      {((currentTemplate.body as SetupBody)?.payables || []).map((p, i) => (
                        <div key={i} className="grid grid-cols-5 gap-2 items-end">
                          <input
                            placeholder="key"
                            value={p.key}
                            onChange={(e) => {
                              const payables = [...((currentTemplate.body as SetupBody)?.payables || [])];
                              payables[i] = { ...p, key: e.target.value };
                              handleTemplateChange('body', { type: 'bulk', payables });
                            }}
                            className="px-2 py-1 text-xs border rounded font-mono"
                          />
                          <input
                            placeholder="label"
                            value={p.label}
                            onChange={(e) => {
                              const payables = [...((currentTemplate.body as SetupBody)?.payables || [])];
                              payables[i] = { ...p, label: e.target.value };
                              handleTemplateChange('body', { type: 'bulk', payables });
                            }}
                            className="px-2 py-1 text-xs border rounded"
                          />
                          <input
                            placeholder="amount"
                            value={p.amount}
                            onChange={(e) => {
                              const payables = [...((currentTemplate.body as SetupBody)?.payables || [])];
                              payables[i] = { ...p, amount: e.target.value };
                              handleTemplateChange('body', { type: 'bulk', payables });
                            }}
                            className="px-2 py-1 text-xs border rounded font-mono"
                          />
                          <input
                            placeholder="credit_account"
                            value={p.credit_account}
                            onChange={(e) => {
                              const payables = [...((currentTemplate.body as SetupBody)?.payables || [])];
                              payables[i] = { ...p, credit_account: e.target.value };
                              handleTemplateChange('body', { type: 'bulk', payables });
                            }}
                            className="px-2 py-1 text-xs border rounded font-mono"
                          />
                          <button
                            onClick={() => {
                              const payables = ((currentTemplate.body as SetupBody)?.payables || []).filter((_, idx) => idx !== i);
                              handleTemplateChange('body', { type: 'bulk', payables });
                            }}
                            className="text-gray-400 hover:text-red-500 justify-self-center"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Response Mapper */}
              {!isCurrentStepSetup && (
                <div>
                  <label className="text-xs text-gray-500 mb-1 block">Response Mapper</label>
                  <textarea
                    value={JSON.stringify(currentTemplate.response_mapper || {}, null, 2)}
                    onChange={(e) => { try { handleTemplateChange('response_mapper', JSON.parse(e.target.value)); } catch {} }}
                    rows={4}
                    className="w-full px-2 py-1.5 text-sm border rounded font-mono focus:outline-none focus:border-gray-400"
                  />
                </div>
              )}
            </div>
          )}

          {/* Mapper Section */}
          {activeSection === 'mapper' && !isCurrentStepSetup && (
            <div className="space-y-4">
              <AutoMapper
                key={`auto-mapper-${currentTemplateIndex}`}
                onRequestMapperChange={(mapper) => handleTemplateChange('request_mapper', mapper)}
                onResponseMapperChange={(mapper) => handleTemplateChange('response_mapper', mapper)}
                onBodyChange={(body) => handleTemplateChange('body', body)}
                onUrlChange={(url) => handleTemplateChange('url', url)}
                onMethodChange={(method) => handleTemplateChange('method', method)}
                onHeadersChange={(headers) => handleTemplateChange('header_type', headers)}
                onOverrideChange={(overrides) => handleTemplateChange('to_be_overridden', overrides)}
                initialRequestMapper={currentTemplate.request_mapper || {}}
                initialResponseMapper={currentTemplate.response_mapper || {}}
              />
            </div>
          )}

          {/* Override Section */}
          {activeSection === 'override' && !isCurrentStepSetup && (
            <div className="max-w-xl space-y-4">
              <p className="text-xs text-gray-500">
                Define user input fields that override request body values.
              </p>
              <div className="space-y-2">
                {(currentTemplate.to_be_overridden?.overridden_request_body || []).map((field, i) => (
                  <div key={i} className="grid grid-cols-4 gap-2 items-end">
                    <input
                      placeholder="field"
                      value={field.field}
                      onChange={(e) => {
                        const fields = [...(currentTemplate.to_be_overridden?.overridden_request_body || [])];
                        fields[i] = { ...field, field: e.target.value, actual_mapping: e.target.value };
                        handleTemplateChange('to_be_overridden', { overridden_request_body: fields });
                      }}
                      className="px-2 py-1.5 text-sm border rounded font-mono"
                    />
                    <input
                      placeholder="value"
                      value={field.value || ''}
                      onChange={(e) => {
                        const fields = [...(currentTemplate.to_be_overridden?.overridden_request_body || [])];
                        fields[i] = { ...field, value: e.target.value };
                        handleTemplateChange('to_be_overridden', { overridden_request_body: fields });
                      }}
                      className="px-2 py-1.5 text-sm border rounded font-mono"
                    />
                    <select
                      value={field.type || 'string'}
                      onChange={(e) => {
                        const fields = [...(currentTemplate.to_be_overridden?.overridden_request_body || [])];
                        fields[i] = { ...field, type: e.target.value };
                        handleTemplateChange('to_be_overridden', { overridden_request_body: fields });
                      }}
                      className="px-2 py-1.5 text-sm border rounded"
                    >
                      <option value="string">string</option>
                      <option value="number">number</option>
                      <option value="account_number">account_number</option>
                    </select>
                    <button
                      onClick={() => {
                        const fields = (currentTemplate.to_be_overridden?.overridden_request_body || []).filter((_, idx) => idx !== i);
                        handleTemplateChange('to_be_overridden', { overridden_request_body: fields });
                      }}
                      className="text-gray-400 hover:text-red-500 justify-self-center"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
                <button
                  onClick={() => {
                    const fields = [...(currentTemplate.to_be_overridden?.overridden_request_body || [])];
                    fields.push({ field: '', value: '', actual_mapping: '', type: 'string' });
                    handleTemplateChange('to_be_overridden', { overridden_request_body: fields });
                  }}
                  className="text-sm text-gray-500 hover:text-gray-700"
                >
                  + Add Override
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
