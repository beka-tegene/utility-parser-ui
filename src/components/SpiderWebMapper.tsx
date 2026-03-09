'use client';

import { useCallback, useEffect, useState, useRef } from 'react';
import ReactFlow, {
  Node,
  Edge,
  addEdge,
  Connection,
  useNodesState,
  useEdgesState,
  Background,
  Controls,
  Handle,
  Position,
  NodeProps,
  MarkerType,
  ConnectionLineType,
  BackgroundVariant,
  ReactFlowProvider,
  useReactFlow,
} from 'reactflow';
import 'reactflow/dist/style.css';
import { extractPaths, detectDataType } from '@/lib/utils';
import { Plus, Trash2, Zap, Database, FileJson, Key, Hash } from 'lucide-react';

interface FieldNodeData {
  label: string;
  path: string;
  fullPath: string;
  dataType: string;
  side: 'source' | 'target';
  category?: 'request' | 'accumulated' | 'context' | 'credentials' | 'static';
}

// Color scheme for different data types
const typeColors: Record<string, { bg: string; border: string; text: string }> = {
  string: { bg: 'bg-emerald-50', border: 'border-emerald-400', text: 'text-emerald-700' },
  number: { bg: 'bg-blue-50', border: 'border-blue-400', text: 'text-blue-700' },
  boolean: { bg: 'bg-purple-50', border: 'border-purple-400', text: 'text-purple-700' },
  object: { bg: 'bg-amber-50', border: 'border-amber-400', text: 'text-amber-700' },
  array: { bg: 'bg-rose-50', border: 'border-rose-400', text: 'text-rose-700' },
  context: { bg: 'bg-cyan-50', border: 'border-cyan-400', text: 'text-cyan-700' },
  null: { bg: 'bg-gray-50', border: 'border-gray-400', text: 'text-gray-700' },
};

// Category icons
const categoryIcons: Record<string, React.ComponentType<{ className?: string }>> = {
  request: FileJson,
  accumulated: Database,
  context: Zap,
  credentials: Key,
  static: Hash,
};

// Source field node (left side - where wires come FROM)
function SourceFieldNode({ data, selected }: NodeProps<FieldNodeData>) {
  const colors = typeColors[data.dataType] || typeColors.string;
  const CategoryIcon = categoryIcons[data.category || 'request'] || FileJson;

  return (
    <div
      className={`group relative px-4 py-3 rounded-xl border-2 shadow-sm transition-all duration-200 min-w-[200px] ${
        colors.bg
      } ${colors.border} ${selected ? 'ring-2 ring-blue-500 ring-offset-2' : ''} hover:shadow-md`}
    >
      <div className="flex items-center gap-3">
        <div className={`p-1.5 rounded-lg ${colors.bg} ${colors.text}`}>
          <CategoryIcon className="w-4 h-4" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">
              {data.category || 'request'}
            </span>
            <span className={`text-xs px-1.5 py-0.5 rounded ${colors.bg} ${colors.text}`}>
              {data.dataType}
            </span>
          </div>
          <div className="text-sm font-semibold text-gray-800 truncate mt-0.5">
            {data.label}
          </div>
          <div className="text-xs text-gray-400 font-mono truncate mt-0.5">
            {data.fullPath}
          </div>
        </div>
      </div>

      {/* Connection handle - right side */}
      <Handle
        type="source"
        position={Position.Right}
        className="!w-4 !h-4 !bg-blue-500 !border-4 !border-white !shadow-lg transition-transform group-hover:scale-110"
        style={{ right: -8 }}
      />
    </div>
  );
}

// Target field node (right side - where wires go TO)
function TargetFieldNode({ data, selected }: NodeProps<FieldNodeData>) {
  return (
    <div
      className={`group relative px-4 py-3 rounded-xl border-2 shadow-sm transition-all duration-200 min-w-[200px] ${
        selected ? 'ring-2 ring-green-500 ring-offset-2 bg-green-50 border-green-400' : 'bg-white border-gray-300'
      } hover:shadow-md hover:border-green-400`}
    >
      {/* Connection handle - left side */}
      <Handle
        type="target"
        position={Position.Left}
        className="!w-4 !h-4 !bg-green-500 !border-4 !border-white !shadow-lg transition-transform group-hover:scale-110"
        style={{ left: -8 }}
      />

      <div className="flex items-center gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">
              target
            </span>
            <span className="text-xs px-1.5 py-0.5 rounded bg-gray-100 text-gray-600">
              {data.dataType}
            </span>
          </div>
          <div className="text-sm font-semibold text-gray-800 truncate mt-0.5">
            {data.label}
          </div>
          <div className="text-xs text-gray-400 font-mono truncate mt-0.5">
            {data.fullPath}
          </div>
        </div>
      </div>
    </div>
  );
}

const nodeTypes = {
  sourceField: SourceFieldNode,
  targetField: TargetFieldNode,
};

interface SpiderWebMapperProps {
  sourceData: Record<string, unknown> | null;
  targetFields: string[];
  initialMappings?: Record<string, string>;
  onMappingChange: (mappings: Record<string, string>) => void;
  title?: string;
  description?: string;
}

function SpiderWebMapperInner({
  sourceData,
  targetFields,
  initialMappings = {},
  onMappingChange,
  title = 'Field Mapping',
  description = 'Drag connections from source fields (left) to target fields (right)',
}: SpiderWebMapperProps) {
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const [customTargetField, setCustomTargetField] = useState('');
  const [customSourceField, setCustomSourceField] = useState('');
  const [customSourceCategory, setCustomSourceCategory] = useState<'request' | 'accumulated' | 'context' | 'credentials'>('accumulated');
  const reactFlowInstance = useReactFlow();

  // Use refs to prevent infinite loops
  const isInitializedRef = useRef(false);
  const nodesRef = useRef<Node[]>([]);

  // Build nodes from source data and target fields - only on mount or when source/target changes
  useEffect(() => {
    const sourceNodes: Node[] = [];
    const targetNodes: Node[] = [];
    let sourceY = 0;
    let targetY = 0;

    // Extract paths from source data (request body)
    if (sourceData) {
      const paths = extractPaths(sourceData);
      paths.forEach((path) => {
        const value = path.split('.').reduce((obj: unknown, key) => {
          if (obj && typeof obj === 'object') {
            return (obj as Record<string, unknown>)[key];
          }
          return undefined;
        }, sourceData);

        const dataType = detectDataType(value);
        if (dataType === 'object' || dataType === 'array') return;

        sourceNodes.push({
          id: `source-request-${path}`,
          type: 'sourceField',
          position: { x: 50, y: sourceY },
          data: {
            label: path.split('.').pop() || path,
            path: path,
            fullPath: `request.${path}`,
            dataType,
            side: 'source',
            category: 'request',
          },
        });
        sourceY += 90;
      });
    }

    // Add context source nodes
    const contextFields = [
      { path: 'access_token', label: 'Access Token', category: 'accumulated' },
      { path: 'bill_id', label: 'Bill ID', category: 'accumulated' },
      { path: 'customer_name', label: 'Customer Name', category: 'accumulated' },
      { path: 'total_amount', label: 'Total Amount', category: 'accumulated' },
      { path: 'cbeTxnRef', label: 'CBE Transaction Ref', category: 'context' },
      { path: 'username', label: 'Username', category: 'credentials' },
      { path: 'password', label: 'Password', category: 'credentials' },
      { path: 'client_id', label: 'Client ID', category: 'credentials' },
      { path: 'client_secret', label: 'Client Secret', category: 'credentials' },
    ];

    contextFields.forEach((field) => {
      sourceNodes.push({
        id: `source-${field.category}-${field.path}`,
        type: 'sourceField',
        position: { x: 50, y: sourceY },
        data: {
          label: field.label,
          path: field.path,
          fullPath: `${field.category}.${field.path}`,
          dataType: 'context',
          side: 'source',
          category: field.category as 'accumulated' | 'context' | 'credentials',
        },
      });
      sourceY += 90;
    });

    // Create target nodes
    targetFields.forEach((field) => {
      targetNodes.push({
        id: `target-${field}`,
        type: 'targetField',
        position: { x: 500, y: targetY },
        data: {
          label: field.split('.').pop() || field,
          path: field,
          fullPath: field,
          dataType: 'string',
          side: 'target',
        },
      });
      targetY += 90;
    });

    const allNodes = [...sourceNodes, ...targetNodes];
    nodesRef.current = allNodes;
    setNodes(allNodes);

    // Only restore initial mappings on first mount
    if (!isInitializedRef.current && Object.keys(initialMappings).length > 0) {
      const initialEdges: Edge[] = [];
      Object.entries(initialMappings).forEach(([target, source]) => {
        const sourceId = `source-${source.split('.')[0]}-${source.split('.').slice(1).join('.')}`;
        const targetId = `target-${target}`;

        const actualSourceNode = allNodes.find((n) => n.data.fullPath === source);
        const targetExists = allNodes.some((n) => n.id === targetId);

        if (targetExists && actualSourceNode) {
          initialEdges.push({
            id: `edge-${actualSourceNode.id}-${targetId}`,
            source: actualSourceNode.id,
            target: targetId,
            animated: true,
            style: { stroke: '#3b82f6', strokeWidth: 2 },
            markerEnd: { type: MarkerType.ArrowClosed, color: '#3b82f6' },
          });
        }
      });
      setEdges(initialEdges);
      isInitializedRef.current = true;
    }
  }, [sourceData, targetFields, setNodes, setEdges]);

  // Helper to compute and notify mappings
  const notifyMappingChange = useCallback((currentEdges: Edge[], currentNodes: Node[]) => {
    const mappings: Record<string, string> = {};
    currentEdges.forEach((edge) => {
      const sourceNode = currentNodes.find((n) => n.id === edge.source);
      const targetNode = currentNodes.find((n) => n.id === edge.target);
      if (sourceNode && targetNode) {
        mappings[targetNode.data.fullPath] = sourceNode.data.fullPath;
      }
    });
    onMappingChange(mappings);
  }, [onMappingChange]);

  const onConnect = useCallback(
    (connection: Connection) => {
      const newEdge: Edge = {
        ...connection,
        id: `edge-${connection.source}-${connection.target}`,
        animated: true,
        style: { stroke: '#3b82f6', strokeWidth: 2 },
        markerEnd: { type: MarkerType.ArrowClosed, color: '#3b82f6' },
      } as Edge;

      setEdges((eds) => {
        // Remove any existing edge to the same target
        const filtered = eds.filter((e) => e.target !== connection.target);
        const newEdges = addEdge(newEdge, filtered);
        // Notify parent of change
        setTimeout(() => notifyMappingChange(newEdges, nodesRef.current), 0);
        return newEdges;
      });
    },
    [setEdges, notifyMappingChange]
  );

  const handleAddTargetField = () => {
    if (!customTargetField.trim()) return;

    const newY = nodes.filter((n) => n.id.startsWith('target-')).length * 90;
    const newNode: Node = {
      id: `target-${customTargetField}`,
      type: 'targetField',
      position: { x: 500, y: newY },
      data: {
        label: customTargetField.split('.').pop() || customTargetField,
        path: customTargetField,
        fullPath: customTargetField,
        dataType: 'string',
        side: 'target',
      },
    };

    setNodes((nds) => {
      const newNodes = [...nds, newNode];
      nodesRef.current = newNodes;
      return newNodes;
    });
    setCustomTargetField('');
  };

  const handleAddSourceField = () => {
    if (!customSourceField.trim()) return;

    const newY = nodes.filter((n) => n.id.startsWith('source-')).length * 90;
    const newNode: Node = {
      id: `source-${customSourceCategory}-${customSourceField}`,
      type: 'sourceField',
      position: { x: 50, y: newY },
      data: {
        label: customSourceField.split('.').pop() || customSourceField,
        path: customSourceField,
        fullPath: `${customSourceCategory}.${customSourceField}`,
        dataType: 'context',
        side: 'source',
        category: customSourceCategory,
      },
    };

    setNodes((nds) => {
      const newNodes = [...nds, newNode];
      nodesRef.current = newNodes;
      return newNodes;
    });
    setCustomSourceField('');
  };

  const handleDeleteEdge = (edgeId: string) => {
    setEdges((eds) => {
      const newEdges = eds.filter((e) => e.id !== edgeId);
      setTimeout(() => notifyMappingChange(newEdges, nodesRef.current), 0);
      return newEdges;
    });
  };

  const handleAutoLayout = () => {
    const sourceNodes = nodes.filter((n) => n.id.startsWith('source-'));
    const targetNodes = nodes.filter((n) => n.id.startsWith('target-'));

    const updatedNodes = nodes.map((node) => {
      if (node.id.startsWith('source-')) {
        const index = sourceNodes.findIndex((n) => n.id === node.id);
        return { ...node, position: { x: 50, y: index * 90 } };
      } else {
        const index = targetNodes.findIndex((n) => n.id === node.id);
        return { ...node, position: { x: 500, y: index * 90 } };
      }
    });

    nodesRef.current = updatedNodes;
    setNodes(updatedNodes);
    setTimeout(() => reactFlowInstance.fitView({ padding: 0.2 }), 100);
  };

  return (
    <div className="h-[600px] border rounded-xl bg-gradient-to-br from-gray-50 to-gray-100 overflow-hidden shadow-inner relative">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b bg-white/80 backdrop-blur-sm">
        <div>
          <h3 className="text-sm font-semibold text-gray-800">{title}</h3>
          <p className="text-xs text-gray-500 mt-0.5">{description}</p>
        </div>

        <div className="flex items-center gap-3">
          {/* Add source field */}
          <div className="flex items-center gap-1.5">
            <select
              value={customSourceCategory}
              onChange={(e) => setCustomSourceCategory(e.target.value as typeof customSourceCategory)}
              className="px-2 py-1.5 text-xs border rounded-l-lg focus:outline-none focus:ring-1 focus:ring-blue-500 bg-white"
            >
              <option value="accumulated">Accumulated</option>
              <option value="context">Context</option>
              <option value="credentials">Credentials</option>
              <option value="request">Request</option>
            </select>
            <input
              type="text"
              value={customSourceField}
              onChange={(e) => setCustomSourceField(e.target.value)}
              placeholder="Add source field..."
              className="px-2 py-1.5 text-xs border-y focus:outline-none focus:ring-1 focus:ring-blue-500 w-32"
            />
            <button
              onClick={handleAddSourceField}
              className="p-1.5 text-white bg-blue-500 rounded-r-lg hover:bg-blue-600 transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Add target field */}
          <div className="flex items-center gap-1.5">
            <input
              type="text"
              value={customTargetField}
              onChange={(e) => setCustomTargetField(e.target.value)}
              placeholder="Add target field..."
              className="px-2 py-1.5 text-xs border rounded-l-lg focus:outline-none focus:ring-1 focus:ring-green-500 w-32"
            />
            <button
              onClick={handleAddTargetField}
              className="p-1.5 text-white bg-green-500 rounded-r-lg hover:bg-green-600 transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />
            </button>
          </div>

          <button
            onClick={handleAutoLayout}
            className="px-3 py-1.5 text-xs text-gray-600 bg-white border rounded-lg hover:bg-gray-50 transition-colors"
          >
            Auto Layout
          </button>
        </div>
      </div>

      {/* React Flow canvas */}
      <div className="h-[calc(100%-60px)]">
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          nodeTypes={nodeTypes}
          connectionLineType={ConnectionLineType.SmoothStep}
          connectionLineStyle={{ stroke: '#3b82f6', strokeWidth: 2, strokeDasharray: '5,5' }}
          defaultEdgeOptions={{
            animated: true,
            style: { stroke: '#3b82f6', strokeWidth: 2 },
            markerEnd: { type: MarkerType.ArrowClosed, color: '#3b82f6' },
          }}
          fitView
          fitViewOptions={{ padding: 0.2 }}
          minZoom={0.5}
          maxZoom={1.5}
        >
          <Background variant={BackgroundVariant.Dots} gap={20} size={1} color="#cbd5e1" />
          <Controls className="!shadow-lg !rounded-lg !border" />
        </ReactFlow>
      </div>

      {/* Connections summary */}
      {edges.length > 0 && (
        <div className="absolute bottom-4 left-4 bg-white/95 backdrop-blur-sm rounded-xl shadow-lg p-4 max-h-40 overflow-y-auto border z-10">
          <div className="text-xs font-semibold text-gray-700 mb-2 flex items-center gap-2">
            <Zap className="w-3.5 h-3.5 text-blue-500" />
            Active Connections ({edges.length})
          </div>
          <div className="space-y-1.5">
            {edges.map((edge) => {
              const src = nodes.find((n) => n.id === edge.source);
              const tgt = nodes.find((n) => n.id === edge.target);
              return (
                <div key={edge.id} className="flex items-center gap-2 text-xs group">
                  <span className="text-blue-600 font-mono bg-blue-50 px-1.5 py-0.5 rounded">
                    {src?.data.fullPath}
                  </span>
                  <span className="text-gray-400">→</span>
                  <span className="text-green-600 font-mono bg-green-50 px-1.5 py-0.5 rounded">
                    {tgt?.data.fullPath}
                  </span>
                  <button
                    onClick={() => handleDeleteEdge(edge.id)}
                    className="p-1 text-red-400 hover:text-red-600 opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

export function SpiderWebMapper(props: SpiderWebMapperProps) {
  return (
    <ReactFlowProvider>
      <SpiderWebMapperInner {...props} />
    </ReactFlowProvider>
  );
}
