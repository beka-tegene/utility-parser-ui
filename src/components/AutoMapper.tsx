'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import { parseCurl, detectDataType } from '@/lib/utils';
import {
  Play,
  Loader2,
  Trash2,
  AlertCircle,
  RefreshCw,
  Database,
  Key,
  Zap,
  Plus,
  X,
  Check,
  Circle,
} from 'lucide-react';

interface FieldNode {
  id: string;
  path: string;
  label: string;
  value?: unknown;
  type: string;
  category: 'request' | 'response' | 'accumulated' | 'context' | 'credentials' | 'target' | 'override' | 'template';
  x: number;
  y: number;
}

interface Connection {
  id: string;
  sourceId: string;
  targetId: string;
  sourceCategory: string;
  targetCategory: string;
}

interface OverrideField {
  field: string;
  type: string;
  required: boolean;
  value?: string;
  actual_mapping?: string;
}

interface AutoMapperProps {
  onRequestMapperChange: (mapper: Record<string, string>) => void;
  onResponseMapperChange: (mapper: Record<string, string>) => void;
  onBodyChange: (body: Record<string, unknown>) => void;
  onUrlChange: (url: string) => void;
  onMethodChange: (method: string) => void;
  onHeadersChange: (headers: Record<string, string>) => void;
  onOverrideChange?: (overrides: { overridden_request_body: OverrideField[] }) => void;
  initialRequestMapper?: Record<string, string>;
  initialResponseMapper?: Record<string, string>;
}

export function AutoMapper({
  onRequestMapperChange,
  onResponseMapperChange,
  onBodyChange,
  onUrlChange,
  onMethodChange,
  onHeadersChange,
  onOverrideChange,
}: AutoMapperProps) {
  const [curlInput, setCurlInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [parsedRequest, setParsedRequest] = useState<{
    method: string;
    url: string;
    headers: Record<string, string>;
    body: Record<string, unknown> | null;
  } | null>(null);

  // Nodes and connections
  const [sourceNodes, setSourceNodes] = useState<FieldNode[]>([]);
  const [targetNodes, setTargetNodes] = useState<FieldNode[]>([]);
  const [responseNodes, setResponseNodes] = useState<FieldNode[]>([]);
  const [accumulatedNodes, setAccumulatedNodes] = useState<FieldNode[]>([]);
  const [overrideNodes, setOverrideNodes] = useState<FieldNode[]>([]);

  const [requestConnections, setRequestConnections] = useState<Connection[]>([]);
  const [responseConnections, setResponseConnections] = useState<Connection[]>([]);

  // Drag state
  const [draggingFrom, setDraggingFrom] = useState<FieldNode | null>(null);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  const canvasRef = useRef<HTMLDivElement>(null);

  // Context fields (always available) - matching backend sample template
  const contextFieldsList: FieldNode[] = [
    // Accumulated fields from previous steps (TOKEN and QUERY responses)
    { id: 'acc-access_token', path: 'accumulated.access_token', label: 'access_token', type: 'string', category: 'accumulated', x: 0, y: 0 },
    { id: 'acc-token_type', path: 'accumulated.token_type', label: 'token_type', type: 'string', category: 'accumulated', x: 0, y: 0 },
    { id: 'acc-expires_in', path: 'accumulated.expires_in', label: 'expires_in', type: 'number', category: 'accumulated', x: 0, y: 0 },
    { id: 'acc-bill_id', path: 'accumulated.bill_id', label: 'bill_id', type: 'string', category: 'accumulated', x: 0, y: 0 },
    { id: 'acc-customer_name', path: 'accumulated.customer_name', label: 'customer_name', type: 'string', category: 'accumulated', x: 0, y: 0 },
    { id: 'acc-full_name', path: 'accumulated.full_name', label: 'full_name', type: 'string', category: 'accumulated', x: 0, y: 0 },
    { id: 'acc-first_name', path: 'accumulated.first_name', label: 'first_name', type: 'string', category: 'accumulated', x: 0, y: 0 },
    { id: 'acc-last_name', path: 'accumulated.last_name', label: 'last_name', type: 'string', category: 'accumulated', x: 0, y: 0 },
    { id: 'acc-total_amount', path: 'accumulated.total_amount', label: 'total_amount', type: 'number', category: 'accumulated', x: 0, y: 0 },
    { id: 'acc-bill_amount', path: 'accumulated.bill_amount', label: 'bill_amount', type: 'number', category: 'accumulated', x: 0, y: 0 },
    { id: 'acc-credit_account_number', path: 'accumulated.credit_account_number', label: 'credit_account_number', type: 'string', category: 'accumulated', x: 0, y: 0 },
    { id: 'acc-end_to_end_txn_id', path: 'accumulated.end_to_end_txn_id', label: 'end_to_end_txn_id', type: 'string', category: 'accumulated', x: 0, y: 0 },
    { id: 'acc-status', path: 'accumulated.status', label: 'status', type: 'string', category: 'accumulated', x: 0, y: 0 },
    { id: 'acc-response_code', path: 'accumulated.response_code', label: 'response_code', type: 'string', category: 'accumulated', x: 0, y: 0 },
    { id: 'acc-phone', path: 'accumulated.phone', label: 'phone', type: 'string', category: 'accumulated', x: 0, y: 0 },
    // Context fields (workflow context)
    { id: 'ctx-cbeTxnRef', path: 'context.cbeTxnRef', label: 'cbeTxnRef', type: 'string', category: 'context', x: 0, y: 0 },
    { id: 'ctx-channel', path: 'context.channel', label: 'channel', type: 'string', category: 'context', x: 0, y: 0 },
    { id: 'ctx-timestamp', path: 'context.timestamp', label: 'timestamp', type: 'string', category: 'context', x: 0, y: 0 },
    // Credential fields (OAuth config)
    { id: 'cred-grant_type', path: 'credentials.grant_type', label: 'grant_type', type: 'string', category: 'credentials', x: 0, y: 0 },
    { id: 'cred-client_id', path: 'credentials.client_id', label: 'client_id', type: 'string', category: 'credentials', x: 0, y: 0 },
    { id: 'cred-client_secret', path: 'credentials.client_secret', label: 'client_secret', type: 'string', category: 'credentials', x: 0, y: 0 },
    { id: 'cred-scope', path: 'credentials.scope', label: 'scope', type: 'string', category: 'credentials', x: 0, y: 0 },
    // Template variables (user input placeholders - use {{variable}} syntax)
    { id: 'tpl-End_To_End_Txn_Id', path: '{{End_To_End_Txn_Id}}', label: 'End_To_End_Txn_Id', type: 'string', category: 'template', x: 0, y: 0 },
    { id: 'tpl-Bill_Id', path: '{{Bill_Id}}', label: 'Bill_Id', type: 'string', category: 'template', x: 0, y: 0 },
    { id: 'tpl-current_datetime_iso', path: '{{current_datetime_iso}}', label: 'current_datetime_iso', type: 'string', category: 'template', x: 0, y: 0 },
    { id: 'tpl-current_date_yyyymmdd', path: '{{current_date_yyyymmdd}}', label: 'current_date_yyyymmdd', type: 'string', category: 'template', x: 0, y: 0 },
    { id: 'tpl-debit_account', path: '{{request.debit_account}}', label: 'debit_account', type: 'string', category: 'template', x: 0, y: 0 },
  ];

  // Extract fields from object
  const extractFields = useCallback((obj: Record<string, unknown>, prefix: string, category: FieldNode['category'], startY: number): FieldNode[] => {
    const fields: FieldNode[] = [];
    let yPos = startY;
    const traverse = (current: unknown, path: string) => {
      if (current === null || current === undefined) return;
      if (Array.isArray(current)) {
        current.forEach((item, i) => traverse(item, `${path}[${i}]`));
      } else if (typeof current === 'object') {
        Object.entries(current as Record<string, unknown>).forEach(([key, value]) => {
          const newPath = path ? `${path}.${key}` : key;
          if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
            traverse(value, newPath);
          } else {
            fields.push({
              id: `${prefix}-${newPath}`,
              path: newPath,
              label: key,
              value,
              type: detectDataType(value),
              category,
              x: category === 'request' || category === 'accumulated' || category === 'context' || category === 'credentials' ? 50 : 650,
              y: yPos,
            });
            yPos += 45;
          }
        });
      }
    };
    traverse(obj, '');
    return fields;
  }, []);

  const handleParse = () => {
    setError(null);
    if (!curlInput.trim()) {
      setError('Please enter a cURL command');
      return;
    }
    try {
      const parsed = parseCurl(curlInput);
      if (!parsed.url) {
        setError('Could not extract URL');
        return;
      }
      const bodyObj = parsed.body && typeof parsed.body === 'object'
        ? parsed.body as Record<string, unknown>
        : null;
      setParsedRequest({ method: parsed.method, url: parsed.url, headers: parsed.headers, body: bodyObj });
      onUrlChange(parsed.url);
      onMethodChange(parsed.method);
      onHeadersChange(parsed.headers);

      if (bodyObj) {
        onBodyChange(bodyObj);
        // Create source nodes from request body
        const reqFields = extractFields(bodyObj, 'req', 'request', 20);
        setSourceNodes(reqFields);

        // Create target nodes from body keys
        const targets = Object.keys(bodyObj).map((key, i): FieldNode => ({
          id: `target-${key}`,
          path: key,
          label: key,
          type: 'string',
          category: 'target',
          x: 400,
          y: 20 + i * 45,
        }));
        setTargetNodes(targets);
      }
    } catch {
      setError('Failed to parse cURL');
    }
  };

  const handleExecute = async () => {
    if (!parsedRequest) return;
    setIsLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/proxy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(parsedRequest),
      });
      const data = await res.json();
      if (data.error) {
        setError(`API Error: ${data.error}`);
      } else {
        const response = data.response || data;
        const resFields = extractFields(response, 'res', 'response', 20);
        setResponseNodes(resFields);

        // Set accumulated nodes for response mapping targets
        const accNodes = contextFieldsList.filter(f => f.category === 'accumulated').map((f, i) => ({
          ...f,
          x: 650,
          y: 20 + i * 45,
        }));
        setAccumulatedNodes(accNodes);
      }
    } catch {
      setError('Request failed');
    }
    setIsLoading(false);
  };

  // Handle mouse move for drawing connections
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (canvasRef.current && draggingFrom) {
        const rect = canvasRef.current.getBoundingClientRect();
        setMousePos({ x: e.clientX - rect.left, y: e.clientY - rect.top });
      }
    };
    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, [draggingFrom]);

  const handleNodeMouseDown = (node: FieldNode) => {
    setDraggingFrom(node);
  };

  const handleNodeMouseUp = (targetNode: FieldNode) => {
    if (!draggingFrom) return;

    // Determine connection type based on categories
    if (
      (draggingFrom.category === 'request' || draggingFrom.category === 'accumulated' ||
       draggingFrom.category === 'context' || draggingFrom.category === 'credentials' ||
       draggingFrom.category === 'template') &&
      targetNode.category === 'target'
    ) {
      // Request mapping
      const conn: Connection = {
        id: `conn-${Date.now()}`,
        sourceId: draggingFrom.id,
        targetId: targetNode.id,
        sourceCategory: draggingFrom.category,
        targetCategory: targetNode.category,
      };
      const updated = [...requestConnections.filter(c => c.targetId !== targetNode.id), conn];
      setRequestConnections(updated);

      // Update mapper
      const mapper: Record<string, string> = {};
      updated.forEach(c => {
        const sourceNode = [...sourceNodes, ...contextFieldsList].find(n => n.id === c.sourceId);
        const targetNodeItem = targetNodes.find(n => n.id === c.targetId);
        if (sourceNode && targetNodeItem) {
          if (sourceNode.category === 'request') {
            mapper[targetNodeItem.path] = `request.${sourceNode.path}`;
          } else if (sourceNode.category === 'template') {
            // Template variables use the path directly (e.g., {{End_To_End_Txn_Id}})
            mapper[targetNodeItem.path] = sourceNode.path;
          } else {
            mapper[targetNodeItem.path] = `${sourceNode.category}.${sourceNode.label}`;
          }
        }
      });
      onRequestMapperChange(mapper);
    } else if (
      draggingFrom.category === 'response' &&
      (targetNode.category === 'accumulated' || targetNode.category === 'override')
    ) {
      // Response mapping
      const conn: Connection = {
        id: `conn-${Date.now()}`,
        sourceId: draggingFrom.id,
        targetId: targetNode.id,
        sourceCategory: draggingFrom.category,
        targetCategory: targetNode.category,
      };
      const updated = [...responseConnections.filter(c => c.targetId !== targetNode.id), conn];
      setResponseConnections(updated);

      // Update response mapper
      const mapper: Record<string, string> = {};
      updated.forEach(c => {
        const sourceNode = responseNodes.find(n => n.id === c.sourceId);
        const targetNodeItem = [...accumulatedNodes, ...overrideNodes].find(n => n.id === c.targetId);
        if (sourceNode && targetNodeItem) {
          mapper[targetNodeItem.label] = sourceNode.path;
        }
      });
      onResponseMapperChange(mapper);
    }

    setDraggingFrom(null);
  };

  const handleRemoveConnection = (connId: string, type: 'request' | 'response') => {
    if (type === 'request') {
      const updated = requestConnections.filter(c => c.id !== connId);
      setRequestConnections(updated);
      const mapper: Record<string, string> = {};
      updated.forEach(c => {
        const sourceNode = [...sourceNodes, ...contextFieldsList].find(n => n.id === c.sourceId);
        const targetNodeItem = targetNodes.find(n => n.id === c.targetId);
        if (sourceNode && targetNodeItem) {
          if (sourceNode.category === 'request') {
            mapper[targetNodeItem.path] = `request.${sourceNode.path}`;
          } else if (sourceNode.category === 'template') {
            mapper[targetNodeItem.path] = sourceNode.path;
          } else {
            mapper[targetNodeItem.path] = `${sourceNode.category}.${sourceNode.label}`;
          }
        }
      });
      onRequestMapperChange(mapper);
    } else {
      const updated = responseConnections.filter(c => c.id !== connId);
      setResponseConnections(updated);
      const mapper: Record<string, string> = {};
      updated.forEach(c => {
        const sourceNode = responseNodes.find(n => n.id === c.sourceId);
        const targetNodeItem = [...accumulatedNodes, ...overrideNodes].find(n => n.id === c.targetId);
        if (sourceNode && targetNodeItem) {
          mapper[targetNodeItem.label] = sourceNode.path;
        }
      });
      onResponseMapperChange(mapper);
    }
  };

  const addOverrideNode = () => {
    const newNode: FieldNode = {
      id: `override-${Date.now()}`,
      path: '',
      label: 'new_field',
      type: 'string',
      category: 'override',
      x: 650,
      y: 20 + overrideNodes.length * 45,
    };
    const updated = [...overrideNodes, newNode];
    setOverrideNodes(updated);

    const overrides: OverrideField[] = updated.map(n => ({
      field: n.label,
      type: n.type,
      required: true,
    }));
    onOverrideChange?.({ overridden_request_body: overrides });
  };

  const updateOverrideNode = (id: string, label: string) => {
    const updated = overrideNodes.map(n => n.id === id ? { ...n, label } : n);
    setOverrideNodes(updated);

    const overrides: OverrideField[] = updated.map(n => ({
      field: n.label,
      type: n.type,
      required: true,
    }));
    onOverrideChange?.({ overridden_request_body: overrides });
  };

  const removeOverrideNode = (id: string) => {
    const updated = overrideNodes.filter(n => n.id !== id);
    setOverrideNodes(updated);

    const overrides: OverrideField[] = updated.map(n => ({
      field: n.label,
      type: n.type,
      required: true,
    }));
    onOverrideChange?.({ overridden_request_body: overrides });
  };

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'request': return { bg: '#1e3a5f', border: '#3b82f6', text: '#93c5fd' };
      case 'accumulated': return { bg: '#134e4a', border: '#14b8a6', text: '#5eead4' };
      case 'context': return { bg: '#431407', border: '#f97316', text: '#fdba74' };
      case 'credentials': return { bg: '#4c0519', border: '#f43f5e', text: '#fda4af' };
      case 'target': return { bg: '#1e1b4b', border: '#8b5cf6', text: '#c4b5fd' };
      case 'response': return { bg: '#14532d', border: '#22c55e', text: '#86efac' };
      case 'override': return { bg: '#581c87', border: '#a855f7', text: '#d8b4fe' };
      case 'template': return { bg: '#0c4a6e', border: '#0ea5e9', text: '#7dd3fc' };
      default: return { bg: '#1f2937', border: '#6b7280', text: '#d1d5db' };
    }
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'accumulated': return <Database className="w-3 h-3" />;
      case 'context': return <Zap className="w-3 h-3" />;
      case 'credentials': return <Key className="w-3 h-3" />;
      case 'template': return <span className="text-xs font-bold">{'{{}}'}</span>;
      default: return <Circle className="w-3 h-3" />;
    }
  };

  // Calculate connection line path (curved)
  const getConnectionPath = (x1: number, y1: number, x2: number, y2: number) => {
    const midX = (x1 + x2) / 2;
    const cp1x = midX;
    const cp1y = y1;
    const cp2x = midX;
    const cp2y = y2;
    return `M ${x1} ${y1} C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${x2} ${y2}`;
  };

  const getNodePosition = (nodeId: string, isSource: boolean): { x: number; y: number } => {
    const allNodes = [...sourceNodes, ...contextFieldsList, ...targetNodes, ...responseNodes, ...accumulatedNodes, ...overrideNodes];
    const node = allNodes.find(n => n.id === nodeId);
    if (node) {
      return { x: isSource ? node.x + 140 : node.x, y: node.y + 15 };
    }
    return { x: 0, y: 0 };
  };

  return (
    <div className="space-y-4">
      {/* cURL Input Section */}
      <div className="bg-gray-900 rounded-xl p-4 border border-gray-700">
        <div className="flex items-center justify-between mb-3">
          <span className="text-sm font-semibold text-gray-300">Import cURL Command</span>
          <div className="flex gap-2">
            <button
              onClick={handleParse}
              className="px-4 py-2 bg-blue-600 text-white text-sm rounded-lg flex items-center gap-2 hover:bg-blue-700 transition-colors"
            >
              <Play className="w-4 h-4" /> Parse
            </button>
            {parsedRequest && (
              <button
                onClick={handleExecute}
                disabled={isLoading}
                className="px-4 py-2 bg-emerald-600 text-white text-sm rounded-lg flex items-center gap-2 hover:bg-emerald-700 transition-colors disabled:opacity-50"
              >
                {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />} Execute
              </button>
            )}
          </div>
        </div>
        <textarea
          value={curlInput}
          onChange={(e) => setCurlInput(e.target.value)}
          placeholder="curl -X POST 'https://api.example.com/auth' -H 'Content-Type: application/json' -d '{&quot;username&quot;: &quot;...&quot;}'"
          className="w-full h-28 p-4 font-mono text-sm bg-gray-950 text-emerald-400 rounded-lg border border-gray-800 resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        {error && (
          <div className="mt-3 p-3 bg-red-950/50 border border-red-800 rounded-lg text-sm text-red-400 flex items-center gap-2">
            <AlertCircle className="w-4 h-4" /> {error}
          </div>
        )}
        {parsedRequest && (
          <div className="mt-3 flex items-center gap-3 text-sm">
            <span className="px-3 py-1.5 bg-blue-950 text-blue-300 rounded-lg font-mono font-semibold">{parsedRequest.method}</span>
            <span className="text-gray-400 truncate flex-1 font-mono text-xs">{parsedRequest.url}</span>
            <Check className="w-5 h-5 text-emerald-400" />
          </div>
        )}
      </div>

      {/* Spider Web Mapping Canvas - Request Mapping */}
      <div className="bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 rounded-xl border border-slate-700 overflow-hidden">
        <div className="p-3 border-b border-slate-700 bg-slate-800/50 flex items-center justify-between">
          <span className="text-sm font-semibold text-slate-200">Request Mapping - Spider Web</span>
          <span className="text-xs text-slate-400">Drag from source to target to create connections</span>
        </div>

        <div
          ref={canvasRef}
          className="relative h-[400px] overflow-auto"
          style={{
            background: 'radial-gradient(circle at 50% 50%, rgba(59, 130, 246, 0.05) 0%, transparent 50%)',
            backgroundSize: '100px 100px',
          }}
          onMouseUp={() => setDraggingFrom(null)}
        >
          {/* Stars background */}
          <div className="absolute inset-0 pointer-events-none">
            {[...Array(50)].map((_, i) => (
              <div
                key={i}
                className="absolute w-1 h-1 bg-white rounded-full opacity-20"
                style={{
                  left: `${Math.random() * 100}%`,
                  top: `${Math.random() * 100}%`,
                }}
              />
            ))}
          </div>

          {/* SVG for connections */}
          <svg className="absolute inset-0 w-full h-full pointer-events-none" style={{ minWidth: 800, minHeight: 400 }}>
            <defs>
              <linearGradient id="requestGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#3b82f6" />
                <stop offset="100%" stopColor="#8b5cf6" />
              </linearGradient>
              <linearGradient id="responseGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#22c55e" />
                <stop offset="100%" stopColor="#14b8a6" />
              </linearGradient>
              <filter id="glow">
                <feGaussianBlur stdDeviation="2" result="coloredBlur"/>
                <feMerge>
                  <feMergeNode in="coloredBlur"/>
                  <feMergeNode in="SourceGraphic"/>
                </feMerge>
              </filter>
            </defs>

            {/* Request connections */}
            {requestConnections.map(conn => {
              const source = getNodePosition(conn.sourceId, true);
              const target = getNodePosition(conn.targetId, false);
              return (
                <g key={conn.id}>
                  <path
                    d={getConnectionPath(source.x, source.y, target.x, target.y)}
                    fill="none"
                    stroke="url(#requestGradient)"
                    strokeWidth="2"
                    filter="url(#glow)"
                    className="opacity-70"
                  />
                  <circle cx={(source.x + target.x) / 2} cy={(source.y + target.y) / 2} r="6" fill="#1e1b4b" stroke="#8b5cf6" strokeWidth="1" className="cursor-pointer" onClick={() => handleRemoveConnection(conn.id, 'request')} />
                  <text x={(source.x + target.x) / 2} y={(source.y + target.y) / 2 + 4} textAnchor="middle" className="fill-white text-xs cursor-pointer" onClick={() => handleRemoveConnection(conn.id, 'request')}>x</text>
                </g>
              );
            })}

            {/* Dragging line */}
            {draggingFrom && (
              <path
                d={getConnectionPath(
                  getNodePosition(draggingFrom.id, true).x,
                  getNodePosition(draggingFrom.id, true).y,
                  mousePos.x,
                  mousePos.y
                )}
                fill="none"
                stroke="#94a3b8"
                strokeWidth="2"
                strokeDasharray="5,5"
                className="opacity-50"
              />
            )}
          </svg>

          {/* Source Nodes Column */}
          <div className="absolute left-4 top-4 space-y-2" style={{ width: 160 }}>
            <div className="text-xs font-semibold text-slate-400 mb-2 flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-blue-400" /> SOURCE FIELDS
            </div>
            {sourceNodes.map((node, i) => {
              const colors = getCategoryColor(node.category);
              return (
                <div
                  key={node.id}
                  className="px-3 py-2 rounded-lg border cursor-grab active:cursor-grabbing transition-all hover:scale-105"
                  style={{
                    backgroundColor: colors.bg,
                    borderColor: colors.border,
                    position: 'absolute',
                    left: 0,
                    top: i * 45,
                    width: 140,
                  }}
                  onMouseDown={() => handleNodeMouseDown(node)}
                >
                  <div className="flex items-center gap-2">
                    <Circle className="w-3 h-3" style={{ color: colors.border }} />
                    <span className="text-xs font-mono truncate" style={{ color: colors.text }}>{node.label}</span>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Context/Accumulated/Credentials Column */}
          <div className="absolute left-4 space-y-2" style={{ width: 160, top: Math.max(sourceNodes.length * 45 + 60, 200) }}>
            <div className="text-xs font-semibold text-slate-400 mb-2">CONTEXT FIELDS</div>
            {contextFieldsList.map((node, i) => {
              const colors = getCategoryColor(node.category);
              return (
                <div
                  key={node.id}
                  className="px-3 py-2 rounded-lg border cursor-grab active:cursor-grabbing transition-all hover:scale-105"
                  style={{
                    backgroundColor: colors.bg,
                    borderColor: colors.border,
                    position: 'absolute',
                    left: 0,
                    top: i * 40,
                    width: 140,
                  }}
                  onMouseDown={() => handleNodeMouseDown(node)}
                >
                  <div className="flex items-center gap-2">
                    {getCategoryIcon(node.category)}
                    <span className="text-xs font-mono truncate" style={{ color: colors.text }}>{node.label}</span>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Target Nodes Column */}
          <div className="absolute space-y-2" style={{ left: 350, top: 16, width: 160 }}>
            <div className="text-xs font-semibold text-slate-400 mb-2 flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-violet-400" /> TARGET FIELDS
            </div>
            {targetNodes.map((node, i) => {
              const colors = getCategoryColor(node.category);
              const hasConnection = requestConnections.some(c => c.targetId === node.id);
              return (
                <div
                  key={node.id}
                  className={`px-3 py-2 rounded-lg border transition-all ${hasConnection ? 'ring-2 ring-violet-400/50' : 'hover:scale-105'}`}
                  style={{
                    backgroundColor: colors.bg,
                    borderColor: colors.border,
                    position: 'absolute',
                    left: 0,
                    top: i * 45,
                    width: 140,
                  }}
                  onMouseUp={() => handleNodeMouseUp(node)}
                >
                  <div className="flex items-center gap-2">
                    <Circle className="w-3 h-3" style={{ color: colors.border }} />
                    <span className="text-xs font-mono truncate" style={{ color: colors.text }}>{node.label}</span>
                    {hasConnection && <Check className="w-3 h-3 ml-auto" style={{ color: colors.text }} />}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Response Mapping Canvas */}
      {responseNodes.length > 0 && (
        <div className="bg-gradient-to-br from-emerald-950 via-slate-900 to-teal-950 rounded-xl border border-emerald-800 overflow-hidden">
          <div className="p-3 border-b border-emerald-800 bg-emerald-900/30 flex items-center justify-between">
            <span className="text-sm font-semibold text-emerald-200">Response Mapping - Extract Data</span>
            <button
              onClick={addOverrideNode}
              className="px-3 py-1.5 bg-purple-600 text-white text-xs rounded-lg flex items-center gap-1 hover:bg-purple-700"
            >
              <Plus className="w-3 h-3" /> Add Override Field
            </button>
          </div>

          <div
            className="relative h-[350px] overflow-auto"
            style={{
              background: 'radial-gradient(circle at 50% 50%, rgba(34, 197, 94, 0.05) 0%, transparent 50%)',
            }}
            onMouseUp={() => setDraggingFrom(null)}
          >
            {/* SVG for response connections */}
            <svg className="absolute inset-0 w-full h-full pointer-events-none" style={{ minWidth: 700, minHeight: 350 }}>
              {responseConnections.map(conn => {
                const sourceNode = responseNodes.find(n => n.id === conn.sourceId);
                const targetNode = [...accumulatedNodes, ...overrideNodes].find(n => n.id === conn.targetId);
                if (!sourceNode || !targetNode) return null;
                const sourceIdx = responseNodes.indexOf(sourceNode);
                const targetIdx = [...accumulatedNodes, ...overrideNodes].indexOf(targetNode);
                const x1 = 200;
                const y1 = 30 + sourceIdx * 45;
                const x2 = 450;
                const y2 = 30 + targetIdx * 45;
                return (
                  <g key={conn.id}>
                    <path
                      d={getConnectionPath(x1, y1, x2, y2)}
                      fill="none"
                      stroke="url(#responseGradient)"
                      strokeWidth="2"
                      filter="url(#glow)"
                      className="opacity-70"
                    />
                    <circle cx={(x1 + x2) / 2} cy={(y1 + y2) / 2} r="6" fill="#14532d" stroke="#22c55e" strokeWidth="1" className="cursor-pointer" onClick={() => handleRemoveConnection(conn.id, 'response')} />
                    <text x={(x1 + x2) / 2} y={(y1 + y2) / 2 + 4} textAnchor="middle" className="fill-white text-xs cursor-pointer" onClick={() => handleRemoveConnection(conn.id, 'response')}>x</text>
                  </g>
                );
              })}
            </svg>

            {/* Response Nodes */}
            <div className="absolute left-4 top-4 space-y-2" style={{ width: 180 }}>
              <div className="text-xs font-semibold text-emerald-400 mb-2">RESPONSE FIELDS</div>
              {responseNodes.map((node, i) => {
                const colors = getCategoryColor(node.category);
                return (
                  <div
                    key={node.id}
                    className="px-3 py-2 rounded-lg border cursor-grab active:cursor-grabbing transition-all hover:scale-105"
                    style={{
                      backgroundColor: colors.bg,
                      borderColor: colors.border,
                      position: 'absolute',
                      left: 0,
                      top: i * 45,
                      width: 180,
                    }}
                    onMouseDown={() => handleNodeMouseDown(node)}
                  >
                    <div className="flex items-center gap-2">
                      <Circle className="w-3 h-3" style={{ color: colors.border }} />
                      <span className="text-xs font-mono truncate" style={{ color: colors.text }}>{node.path}</span>
                    </div>
                    <div className="text-[10px] text-gray-400 mt-1 truncate">
                      {String(node.value).slice(0, 20)}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Accumulated/Override Target Nodes */}
            <div className="absolute space-y-2" style={{ left: 400, top: 16, width: 180 }}>
              <div className="text-xs font-semibold text-teal-400 mb-2">ACCUMULATED (Storage)</div>
              {accumulatedNodes.map((node, i) => {
                const colors = getCategoryColor(node.category);
                const hasConnection = responseConnections.some(c => c.targetId === node.id);
                return (
                  <div
                    key={node.id}
                    className={`px-3 py-2 rounded-lg border transition-all ${hasConnection ? 'ring-2 ring-teal-400/50' : 'hover:scale-105'}`}
                    style={{
                      backgroundColor: colors.bg,
                      borderColor: colors.border,
                      position: 'absolute',
                      left: 0,
                      top: i * 45,
                      width: 160,
                    }}
                    onMouseUp={() => handleNodeMouseUp(node)}
                  >
                    <div className="flex items-center gap-2">
                      <Database className="w-3 h-3" style={{ color: colors.border }} />
                      <span className="text-xs font-mono truncate" style={{ color: colors.text }}>{node.label}</span>
                      {hasConnection && <Check className="w-3 h-3 ml-auto" style={{ color: colors.text }} />}
                    </div>
                  </div>
                );
              })}

              {/* Override Fields */}
              {overrideNodes.length > 0 && (
                <>
                  <div className="text-xs font-semibold text-purple-400 mb-2 absolute" style={{ top: accumulatedNodes.length * 45 + 20 }}>
                    OVERRIDE FIELDS (User Input)
                  </div>
                  {overrideNodes.map((node, i) => {
                    const colors = getCategoryColor(node.category);
                    const hasConnection = responseConnections.some(c => c.targetId === node.id);
                    return (
                      <div
                        key={node.id}
                        className={`px-2 py-1.5 rounded-lg border transition-all ${hasConnection ? 'ring-2 ring-purple-400/50' : ''}`}
                        style={{
                          backgroundColor: colors.bg,
                          borderColor: colors.border,
                          position: 'absolute',
                          left: 0,
                          top: accumulatedNodes.length * 45 + 50 + i * 45,
                          width: 180,
                        }}
                        onMouseUp={() => handleNodeMouseUp(node)}
                      >
                        <div className="flex items-center gap-1">
                          <input
                            type="text"
                            value={node.label}
                            onChange={(e) => updateOverrideNode(node.id, e.target.value)}
                            className="flex-1 bg-transparent border-none text-xs font-mono focus:outline-none"
                            style={{ color: colors.text }}
                            placeholder="field_name"
                          />
                          <button
                            onClick={() => removeOverrideNode(node.id)}
                            className="text-gray-400 hover:text-red-400"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Mappings Summary */}
      {(requestConnections.length > 0 || responseConnections.length > 0) && (
        <div className="bg-slate-800 rounded-xl p-4 border border-slate-700">
          <div className="text-sm font-semibold text-slate-200 mb-3">Mappings Summary</div>
          <div className="grid grid-cols-2 gap-4">
            {requestConnections.length > 0 && (
              <div>
                <div className="text-xs text-blue-400 mb-2">Request Mappings</div>
                <div className="space-y-1">
                  {requestConnections.map(conn => {
                    const sourceNode = [...sourceNodes, ...contextFieldsList].find(n => n.id === conn.sourceId);
                    const targetNode = targetNodes.find(n => n.id === conn.targetId);
                    return (
                      <div key={conn.id} className="flex items-center gap-2 text-xs">
                        <span className="text-cyan-300 font-mono">{sourceNode?.label}</span>
                        <span className="text-slate-500">→</span>
                        <span className="text-violet-300 font-mono">{targetNode?.label}</span>
                        <button onClick={() => handleRemoveConnection(conn.id, 'request')} className="ml-auto text-slate-500 hover:text-red-400">
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
            {responseConnections.length > 0 && (
              <div>
                <div className="text-xs text-emerald-400 mb-2">Response Mappings</div>
                <div className="space-y-1">
                  {responseConnections.map(conn => {
                    const sourceNode = responseNodes.find(n => n.id === conn.sourceId);
                    const targetNode = [...accumulatedNodes, ...overrideNodes].find(n => n.id === conn.targetId);
                    return (
                      <div key={conn.id} className="flex items-center gap-2 text-xs">
                        <span className="text-emerald-300 font-mono">{sourceNode?.path}</span>
                        <span className="text-slate-500">→</span>
                        <span className="text-teal-300 font-mono">{targetNode?.label}</span>
                        <button onClick={() => handleRemoveConnection(conn.id, 'response')} className="ml-auto text-slate-500 hover:text-red-400">
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
