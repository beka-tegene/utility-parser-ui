'use client';

import { useState, useCallback } from 'react';
import { parseCurl, extractPaths, detectDataType } from '@/lib/utils';
import { useAppStore } from '@/lib/store';
import {
  Terminal,
  Play,
  Copy,
  Check,
  ChevronRight,
  ChevronDown,
  Database,
  FileJson,
  Send,
  RotateCcw,
  Loader2,
  AlertCircle,
  CheckCircle2,
  ArrowRight,
  Braces,
  Hash,
  Type,
  ToggleLeft,
  List,
} from 'lucide-react';

interface FieldInfo {
  path: string;
  key: string;
  value: unknown;
  type: string;
  depth: number;
  isContext?: boolean;
  isResponse?: boolean;
  contextSource?: string;
}

interface AnalyzedRequest {
  method: string;
  url: string;
  headers: Record<string, string>;
  body: Record<string, unknown> | string | null;
  fields: FieldInfo[];
}

interface AnalyzedResponse {
  status: number;
  statusText: string;
  headers: Record<string, string>;
  body: unknown;
  fields: FieldInfo[];
  timestamp: string;
}

const typeIcons: Record<string, React.ComponentType<{ className?: string }>> = {
  string: Type,
  number: Hash,
  boolean: ToggleLeft,
  object: Braces,
  array: List,
};

const typeColors: Record<string, string> = {
  string: 'bg-emerald-100 text-emerald-700 border-emerald-300',
  number: 'bg-blue-100 text-blue-700 border-blue-300',
  boolean: 'bg-purple-100 text-purple-700 border-purple-300',
  object: 'bg-amber-100 text-amber-700 border-amber-300',
  array: 'bg-rose-100 text-rose-700 border-rose-300',
  null: 'bg-gray-100 text-gray-600 border-gray-300',
};

export function CurlAnalyzer() {
  const [curlInput, setCurlInput] = useState('');
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);
  const [isExecuting, setIsExecuting] = useState(false);
  const [analyzedRequest, setAnalyzedRequest] = useState<AnalyzedRequest | null>(null);
  const [analyzedResponse, setAnalyzedResponse] = useState<AnalyzedResponse | null>(null);
  const [expandedPaths, setExpandedPaths] = useState<Set<string>>(new Set());
  const [fieldAnnotations, setFieldAnnotations] = useState<Record<string, { isContext: boolean; isResponse: boolean; contextSource?: string }>>({});

  const { apiBaseUrl } = useAppStore();

  const extractFieldsFromObject = useCallback((obj: unknown, prefix = '', depth = 0): FieldInfo[] => {
    const fields: FieldInfo[] = [];

    if (obj === null || obj === undefined) return fields;

    if (typeof obj === 'object' && !Array.isArray(obj)) {
      Object.entries(obj as Record<string, unknown>).forEach(([key, value]) => {
        const path = prefix ? `${prefix}.${key}` : key;
        const type = detectDataType(value);

        fields.push({
          path,
          key,
          value,
          type,
          depth,
          ...fieldAnnotations[path],
        });

        if (type === 'object' && value !== null) {
          fields.push(...extractFieldsFromObject(value, path, depth + 1));
        } else if (type === 'array' && Array.isArray(value)) {
          value.forEach((item, index) => {
            const arrayPath = `${path}[${index}]`;
            fields.push({
              path: arrayPath,
              key: `[${index}]`,
              value: item,
              type: detectDataType(item),
              depth: depth + 1,
              ...fieldAnnotations[arrayPath],
            });
            if (typeof item === 'object' && item !== null) {
              fields.push(...extractFieldsFromObject(item, arrayPath, depth + 2));
            }
          });
        }
      });
    }

    return fields;
  }, [fieldAnnotations]);

  const handleParse = useCallback(() => {
    setError('');
    setAnalyzedResponse(null);

    try {
      if (!curlInput.trim()) {
        setError('Please enter a cURL command');
        return;
      }

      const parsed = parseCurl(curlInput);
      if (!parsed.url) {
        setError('Could not extract URL from cURL command');
        return;
      }

      // Handle body - could be JSON, form data, or string
      let bodyObj: Record<string, unknown> | string | null = null;

      if (parsed.body) {
        if (typeof parsed.body === 'string') {
          // Try to parse as JSON first
          try {
            bodyObj = JSON.parse(parsed.body);
          } catch {
            // Keep as string if not valid JSON
            bodyObj = parsed.body;
          }
        } else {
          // Already an object (form data from --data-urlencode)
          bodyObj = parsed.body;
        }
      }

      const fields = typeof bodyObj === 'object' && bodyObj !== null
        ? extractFieldsFromObject(bodyObj)
        : [];

      setAnalyzedRequest({
        ...parsed,
        body: bodyObj,
        fields,
      });

      // Expand all paths by default
      const allPaths = new Set(fields.filter(f => f.type === 'object' || f.type === 'array').map(f => f.path));
      setExpandedPaths(allPaths);

    } catch (e) {
      setError('Failed to parse cURL command. Please check the format.');
    }
  }, [curlInput, extractFieldsFromObject]);

  const handleExecute = async () => {
    if (!analyzedRequest) return;

    setIsExecuting(true);
    setError('');

    try {
      const response = await fetch(analyzedRequest.url, {
        method: analyzedRequest.method,
        headers: analyzedRequest.headers,
        body: analyzedRequest.body ? JSON.stringify(analyzedRequest.body) : undefined,
      });

      const responseHeaders: Record<string, string> = {};
      response.headers.forEach((value, key) => {
        responseHeaders[key] = value;
      });

      let responseBody: unknown;
      const contentType = response.headers.get('content-type');
      if (contentType?.includes('application/json')) {
        responseBody = await response.json();
      } else {
        responseBody = await response.text();
      }

      const responseFields = typeof responseBody === 'object' && responseBody !== null
        ? extractFieldsFromObject(responseBody)
        : [];

      setAnalyzedResponse({
        status: response.status,
        statusText: response.statusText,
        headers: responseHeaders,
        body: responseBody,
        fields: responseFields,
        timestamp: new Date().toISOString(),
      });

    } catch (e) {
      setError(`Request failed: ${e instanceof Error ? e.message : 'Unknown error'}`);
    } finally {
      setIsExecuting(false);
    }
  };

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const toggleExpand = (path: string) => {
    setExpandedPaths(prev => {
      const next = new Set(prev);
      if (next.has(path)) {
        next.delete(path);
      } else {
        next.add(path);
      }
      return next;
    });
  };

  const toggleFieldAnnotation = (path: string, type: 'context' | 'response') => {
    setFieldAnnotations(prev => {
      const current = prev[path] || { isContext: false, isResponse: false };
      return {
        ...prev,
        [path]: {
          ...current,
          [type === 'context' ? 'isContext' : 'isResponse']: !current[type === 'context' ? 'isContext' : 'isResponse'],
        },
      };
    });
  };

  const setContextSource = (path: string, source: string) => {
    setFieldAnnotations(prev => ({
      ...prev,
      [path]: {
        ...(prev[path] || { isContext: false, isResponse: false }),
        contextSource: source,
      },
    }));
  };

  const renderFieldRow = (field: FieldInfo, side: 'request' | 'response') => {
    const isExpandable = field.type === 'object' || field.type === 'array';
    const isExpanded = expandedPaths.has(field.path);
    const TypeIcon = typeIcons[field.type] || Type;
    const annotation = fieldAnnotations[field.path];

    // Skip nested fields if parent is collapsed
    if (field.depth > 0) {
      const parentPath = field.path.split('.').slice(0, -1).join('.');
      if (parentPath && !expandedPaths.has(parentPath)) {
        return null;
      }
    }

    return (
      <div
        key={`${side}-${field.path}`}
        className="group flex items-center gap-2 py-2 px-3 hover:bg-gray-50 rounded-lg transition-colors"
        style={{ paddingLeft: `${12 + field.depth * 20}px` }}
      >
        {/* Expand toggle */}
        <div className="w-5 flex-shrink-0">
          {isExpandable ? (
            <button
              onClick={() => toggleExpand(field.path)}
              className="p-0.5 hover:bg-gray-200 rounded"
            >
              {isExpanded ? (
                <ChevronDown className="w-4 h-4 text-gray-500" />
              ) : (
                <ChevronRight className="w-4 h-4 text-gray-500" />
              )}
            </button>
          ) : null}
        </div>

        {/* Type badge */}
        <div className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium border ${typeColors[field.type] || typeColors.null}`}>
          <TypeIcon className="w-3 h-3" />
          <span>{field.type}</span>
        </div>

        {/* Field key */}
        <span className="font-mono text-sm font-semibold text-gray-800 min-w-[120px]">
          {field.key}
        </span>

        {/* Field value */}
        <span className="font-mono text-sm text-gray-600 truncate flex-1 max-w-[200px]">
          {field.type === 'object'
            ? `{...}`
            : field.type === 'array'
              ? `[${(field.value as unknown[]).length} items]`
              : JSON.stringify(field.value)}
        </span>

        {/* Annotation buttons */}
        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <button
            onClick={() => toggleFieldAnnotation(field.path, 'context')}
            className={`px-2 py-1 text-xs rounded-md transition-colors ${
              annotation?.isContext
                ? 'bg-cyan-500 text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-cyan-100 hover:text-cyan-700'
            }`}
            title="Mark as context field (to be stored)"
          >
            <Database className="w-3 h-3" />
          </button>
          <button
            onClick={() => toggleFieldAnnotation(field.path, 'response')}
            className={`px-2 py-1 text-xs rounded-md transition-colors ${
              annotation?.isResponse
                ? 'bg-green-500 text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-green-100 hover:text-green-700'
            }`}
            title="Mark as response field (to be returned)"
          >
            <FileJson className="w-3 h-3" />
          </button>
        </div>

        {/* Full path tooltip */}
        <span className="text-xs text-gray-400 font-mono opacity-0 group-hover:opacity-100 transition-opacity">
          {field.path}
        </span>
      </div>
    );
  };

  const renderAnnotationSummary = () => {
    const contextFields = Object.entries(fieldAnnotations).filter(([_, v]) => v.isContext);
    const responseFields = Object.entries(fieldAnnotations).filter(([_, v]) => v.isResponse);

    if (contextFields.length === 0 && responseFields.length === 0) return null;

    return (
      <div className="mt-4 p-4 bg-gradient-to-br from-gray-50 to-gray-100 rounded-xl border">
        <h4 className="text-sm font-semibold text-gray-700 mb-3">Field Annotations Summary</h4>

        <div className="grid grid-cols-2 gap-4">
          {contextFields.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-xs font-medium text-cyan-700">
                <Database className="w-3.5 h-3.5" />
                <span>Context Fields ({contextFields.length})</span>
              </div>
              <div className="space-y-1">
                {contextFields.map(([path]) => (
                  <div key={path} className="flex items-center gap-2 px-2 py-1 bg-cyan-50 rounded-md">
                    <span className="font-mono text-xs text-cyan-800">{path}</span>
                    <input
                      type="text"
                      placeholder="Source: accumulated.xxx"
                      value={fieldAnnotations[path]?.contextSource || ''}
                      onChange={(e) => setContextSource(path, e.target.value)}
                      className="flex-1 px-2 py-0.5 text-xs border rounded focus:outline-none focus:ring-1 focus:ring-cyan-500"
                    />
                  </div>
                ))}
              </div>
            </div>
          )}

          {responseFields.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-xs font-medium text-green-700">
                <FileJson className="w-3.5 h-3.5" />
                <span>Response Fields ({responseFields.length})</span>
              </div>
              <div className="space-y-1">
                {responseFields.map(([path]) => (
                  <div key={path} className="px-2 py-1 bg-green-50 rounded-md">
                    <span className="font-mono text-xs text-green-800">{path}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* cURL Input Section */}
      <div className="bg-white rounded-xl border shadow-sm overflow-hidden">
        <div className="flex items-center gap-2 px-4 py-3 bg-gray-900 text-white">
          <Terminal className="w-4 h-4" />
          <span className="text-sm font-medium">Paste cURL Command</span>
        </div>

        <div className="p-4">
          <textarea
            value={curlInput}
            onChange={(e) => setCurlInput(e.target.value)}
            placeholder={`curl -X POST 'https://api.example.com/endpoint' \\
  -H 'Content-Type: application/json' \\
  -H 'Authorization: Bearer token' \\
  -d '{
    "billRefNo": "1234567890",
    "requestId": "REQ-001",
    "amount": 1500.00,
    "customer": {
      "name": "John Doe",
      "phone": "0912345678"
    }
  }'`}
            className="w-full h-48 p-4 font-mono text-sm bg-gray-900 text-green-400 rounded-lg border border-gray-700 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none resize-none"
          />

          {error && (
            <div className="mt-3 p-3 flex items-center gap-2 text-sm text-red-600 bg-red-50 rounded-lg border border-red-200">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              {error}
            </div>
          )}

          <div className="mt-4 flex items-center gap-3">
            <button
              onClick={handleParse}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              <Play className="w-4 h-4" />
              Parse & Analyze
            </button>

            {analyzedRequest && (
              <button
                onClick={handleExecute}
                disabled={isExecuting}
                className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50"
              >
                {isExecuting ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Send className="w-4 h-4" />
                )}
                Execute Request
              </button>
            )}

            <button
              onClick={() => {
                setCurlInput('');
                setAnalyzedRequest(null);
                setAnalyzedResponse(null);
                setFieldAnnotations({});
                setError('');
              }}
              className="flex items-center gap-2 px-4 py-2 text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
            >
              <RotateCcw className="w-4 h-4" />
              Reset
            </button>
          </div>
        </div>
      </div>

      {/* Analysis Results */}
      {analyzedRequest && (
        <div className="grid grid-cols-2 gap-6">
          {/* Request Analysis */}
          <div className="bg-white rounded-xl border shadow-sm overflow-hidden">
            <div className="flex items-center justify-between px-4 py-3 bg-blue-50 border-b">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-blue-500 flex items-center justify-center">
                  <ArrowRight className="w-4 h-4 text-white" />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-gray-800">Request Analysis</h3>
                  <p className="text-xs text-gray-500">{analyzedRequest.fields.length} fields detected</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className={`px-2 py-1 text-xs font-semibold rounded ${
                  analyzedRequest.method === 'GET' ? 'bg-green-100 text-green-700' :
                  analyzedRequest.method === 'POST' ? 'bg-blue-100 text-blue-700' :
                  analyzedRequest.method === 'PUT' ? 'bg-amber-100 text-amber-700' :
                  analyzedRequest.method === 'DELETE' ? 'bg-red-100 text-red-700' :
                  'bg-gray-100 text-gray-700'
                }`}>
                  {analyzedRequest.method}
                </span>
              </div>
            </div>

            {/* URL */}
            <div className="px-4 py-2 bg-gray-50 border-b">
              <div className="flex items-center gap-2">
                <span className="text-xs text-gray-500">URL:</span>
                <span className="font-mono text-xs text-gray-700 truncate">{analyzedRequest.url}</span>
                <button
                  onClick={() => handleCopy(analyzedRequest.url)}
                  className="p-1 hover:bg-gray-200 rounded"
                >
                  {copied ? <Check className="w-3 h-3 text-green-500" /> : <Copy className="w-3 h-3 text-gray-400" />}
                </button>
              </div>
            </div>

            {/* Headers */}
            {Object.keys(analyzedRequest.headers).length > 0 && (
              <div className="px-4 py-2 border-b">
                <div className="text-xs font-medium text-gray-500 mb-2">Headers</div>
                <div className="space-y-1">
                  {Object.entries(analyzedRequest.headers).map(([key, value]) => (
                    <div key={key} className="flex gap-2 text-xs font-mono">
                      <span className="text-purple-600 font-semibold">{key}:</span>
                      <span className="text-gray-600 truncate">{value}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Body Fields */}
            <div className="max-h-96 overflow-y-auto">
              <div className="px-4 py-2 bg-gray-50 border-b sticky top-0">
                <div className="text-xs font-medium text-gray-500">Request Body Fields</div>
              </div>
              <div className="divide-y divide-gray-100">
                {analyzedRequest.fields.map(field => renderFieldRow(field, 'request'))}
              </div>
            </div>
          </div>

          {/* Response Analysis */}
          <div className="bg-white rounded-xl border shadow-sm overflow-hidden">
            <div className="flex items-center justify-between px-4 py-3 bg-green-50 border-b">
              <div className="flex items-center gap-2">
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                  analyzedResponse
                    ? analyzedResponse.status < 400 ? 'bg-green-500' : 'bg-red-500'
                    : 'bg-gray-300'
                }`}>
                  {analyzedResponse ? (
                    analyzedResponse.status < 400 ? (
                      <CheckCircle2 className="w-4 h-4 text-white" />
                    ) : (
                      <AlertCircle className="w-4 h-4 text-white" />
                    )
                  ) : (
                    <ArrowRight className="w-4 h-4 text-white rotate-180" />
                  )}
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-gray-800">Response Analysis</h3>
                  <p className="text-xs text-gray-500">
                    {analyzedResponse
                      ? `${analyzedResponse.fields.length} fields detected`
                      : 'Execute request to see response'}
                  </p>
                </div>
              </div>
              {analyzedResponse && (
                <span className={`px-2 py-1 text-xs font-semibold rounded ${
                  analyzedResponse.status < 400 ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                }`}>
                  {analyzedResponse.status} {analyzedResponse.statusText}
                </span>
              )}
            </div>

            {analyzedResponse ? (
              <>
                {/* Timestamp */}
                <div className="px-4 py-2 bg-gray-50 border-b">
                  <div className="flex items-center gap-2 text-xs text-gray-500">
                    <span>Received at:</span>
                    <span className="font-mono">{new Date(analyzedResponse.timestamp).toLocaleString()}</span>
                  </div>
                </div>

                {/* Response Fields */}
                <div className="max-h-96 overflow-y-auto">
                  <div className="px-4 py-2 bg-gray-50 border-b sticky top-0">
                    <div className="text-xs font-medium text-gray-500">Response Body Fields</div>
                  </div>
                  <div className="divide-y divide-gray-100">
                    {analyzedResponse.fields.map(field => renderFieldRow(field, 'response'))}
                  </div>
                </div>
              </>
            ) : (
              <div className="flex flex-col items-center justify-center py-16 text-gray-400">
                <Send className="w-12 h-12 mb-3 opacity-30" />
                <p className="text-sm">Execute the request to analyze the response</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Annotation Summary */}
      {analyzedRequest && renderAnnotationSummary()}
    </div>
  );
}
