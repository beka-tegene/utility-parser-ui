'use client';

import { useCallback, useMemo, useState } from 'react';
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
} from 'reactflow';
import 'reactflow/dist/style.css';
import { extractPaths, generateId, detectDataType } from '@/lib/utils';
import { useAppStore } from '@/lib/store';
import { ArrowRight, Trash2, Plus } from 'lucide-react';

interface FieldNodeData {
  label: string;
  path: string;
  dataType: string;
  side: 'source' | 'target';
}

// Custom node for source fields (left side)
function SourceFieldNode({ data }: NodeProps<FieldNodeData>) {
  return (
    <div className="px-3 py-2 bg-white border-2 border-blue-300 rounded-lg shadow-sm min-w-[180px] hover:border-blue-500 transition-colors">
      <div className="flex items-center justify-between gap-2">
        <div>
          <div className="text-xs text-gray-500 mb-0.5">{data.dataType}</div>
          <div className="text-sm font-medium text-gray-800">{data.label}</div>
          <div className="text-xs text-gray-400 font-mono mt-0.5">{data.path}</div>
        </div>
        <Handle
          type="source"
          position={Position.Right}
          className="!bg-blue-500 !w-3 !h-3 !border-2 !border-white"
        />
      </div>
    </div>
  );
}

// Custom node for target fields (right side)
function TargetFieldNode({ data }: NodeProps<FieldNodeData>) {
  return (
    <div className="px-3 py-2 bg-white border-2 border-green-300 rounded-lg shadow-sm min-w-[180px] hover:border-green-500 transition-colors">
      <div className="flex items-center justify-between gap-2">
        <Handle
          type="target"
          position={Position.Left}
          className="!bg-green-500 !w-3 !h-3 !border-2 !border-white"
        />
        <div className="text-right">
          <div className="text-xs text-gray-500 mb-0.5">{data.dataType}</div>
          <div className="text-sm font-medium text-gray-800">{data.label}</div>
          <div className="text-xs text-gray-400 font-mono mt-0.5">{data.path}</div>
        </div>
      </div>
    </div>
  );
}

const nodeTypes = {
  sourceField: SourceFieldNode,
  targetField: TargetFieldNode,
};

interface VisualMapperProps {
  sourceData: Record<string, unknown> | null;
  targetFields: string[];
  mappingType: 'request' | 'response';
  onMappingChange: (mappings: Record<string, string>) => void;
}

export function VisualMapper({
  sourceData,
  targetFields,
  mappingType,
  onMappingChange,
}: VisualMapperProps) {
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const [customTargetField, setCustomTargetField] = useState('');

  // Generate nodes from source data and target fields
  useMemo(() => {
    const sourceNodes: Node[] = [];
    const targetNodes: Node[] = [];

    // Extract paths from source data
    if (sourceData) {
      const paths = extractPaths(sourceData);
      paths.forEach((path, index) => {
        const value = path.split('.').reduce((obj: unknown, key) => {
          if (obj && typeof obj === 'object') {
            return (obj as Record<string, unknown>)[key];
          }
          return undefined;
        }, sourceData);

        sourceNodes.push({
          id: `source-${path}`,
          type: 'sourceField',
          position: { x: 50, y: 80 + index * 80 },
          data: {
            label: path.split('.').pop() || path,
            path: `request.${path}`,
            dataType: detectDataType(value),
            side: 'source',
          },
        });
      });
    }

    // Add accumulated context sources
    const contextSources = ['accumulated', 'context', 'credentials'];
    contextSources.forEach((ctx, ctxIndex) => {
      sourceNodes.push({
        id: `source-${ctx}`,
        type: 'sourceField',
        position: { x: 50, y: 80 + (sourceNodes.length + ctxIndex) * 80 },
        data: {
          label: ctx,
          path: `${ctx}.*`,
          dataType: 'context',
          side: 'source',
        },
      });
    });

    // Create target nodes
    targetFields.forEach((field, index) => {
      targetNodes.push({
        id: `target-${field}`,
        type: 'targetField',
        position: { x: 500, y: 80 + index * 80 },
        data: {
          label: field.split('.').pop() || field,
          path: field,
          dataType: 'string',
          side: 'target',
        },
      });
    });

    setNodes([...sourceNodes, ...targetNodes]);
  }, [sourceData, targetFields, setNodes]);

  const onConnect = useCallback(
    (connection: Connection) => {
      const newEdge = {
        ...connection,
        id: generateId(),
        animated: true,
        style: { stroke: '#3b82f6', strokeWidth: 2 },
      };
      setEdges((eds) => addEdge(newEdge, eds));

      // Update mapping
      const sourceNode = nodes.find((n) => n.id === connection.source);
      const targetNode = nodes.find((n) => n.id === connection.target);

      if (sourceNode && targetNode) {
        const newMappings: Record<string, string> = {};
        edges.forEach((edge) => {
          const src = nodes.find((n) => n.id === edge.source);
          const tgt = nodes.find((n) => n.id === edge.target);
          if (src && tgt) {
            newMappings[tgt.data.path] = src.data.path;
          }
        });
        newMappings[targetNode.data.path] = sourceNode.data.path;
        onMappingChange(newMappings);
      }
    },
    [setEdges, nodes, edges, onMappingChange]
  );

  const handleAddTargetField = () => {
    if (!customTargetField.trim()) return;

    const newNode: Node = {
      id: `target-${customTargetField}`,
      type: 'targetField',
      position: { x: 500, y: 80 + nodes.filter((n) => n.id.startsWith('target-')).length * 80 },
      data: {
        label: customTargetField.split('.').pop() || customTargetField,
        path: customTargetField,
        dataType: 'string',
        side: 'target',
      },
    };

    setNodes((nds) => [...nds, newNode]);
    setCustomTargetField('');
  };

  const handleDeleteEdge = (edgeId: string) => {
    setEdges((eds) => eds.filter((e) => e.id !== edgeId));

    // Update mappings after deletion
    const remainingEdges = edges.filter((e) => e.id !== edgeId);
    const newMappings: Record<string, string> = {};
    remainingEdges.forEach((edge) => {
      const src = nodes.find((n) => n.id === edge.source);
      const tgt = nodes.find((n) => n.id === edge.target);
      if (src && tgt) {
        newMappings[tgt.data.path] = src.data.path;
      }
    });
    onMappingChange(newMappings);
  };

  return (
    <div className="h-[500px] border rounded-lg bg-gray-50 overflow-hidden">
      <div className="flex items-center justify-between p-3 border-b bg-white">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-blue-500" />
            <span className="text-sm text-gray-600">Source Fields</span>
          </div>
          <ArrowRight className="w-4 h-4 text-gray-400" />
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-green-500" />
            <span className="text-sm text-gray-600">Target Fields</span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <input
            type="text"
            value={customTargetField}
            onChange={(e) => setCustomTargetField(e.target.value)}
            placeholder="Add custom target field..."
            className="px-3 py-1.5 text-sm border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <button
            onClick={handleAddTargetField}
            className="p-1.5 text-white bg-green-500 rounded-md hover:bg-green-600"
          >
            <Plus className="w-4 h-4" />
          </button>
        </div>
      </div>

      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        nodeTypes={nodeTypes}
        fitView
        className="bg-gray-50"
      >
        <Background color="#e5e7eb" gap={16} />
        <Controls />
      </ReactFlow>

      {edges.length > 0 && (
        <div className="absolute bottom-4 left-4 bg-white rounded-lg shadow-lg p-3 max-h-32 overflow-y-auto">
          <div className="text-xs font-medium text-gray-500 mb-2">Active Mappings</div>
          <div className="space-y-1">
            {edges.map((edge) => {
              const src = nodes.find((n) => n.id === edge.source);
              const tgt = nodes.find((n) => n.id === edge.target);
              return (
                <div key={edge.id} className="flex items-center gap-2 text-xs">
                  <span className="text-blue-600 font-mono">{src?.data.path}</span>
                  <ArrowRight className="w-3 h-3 text-gray-400" />
                  <span className="text-green-600 font-mono">{tgt?.data.path}</span>
                  <button
                    onClick={() => handleDeleteEdge(edge.id)}
                    className="p-0.5 text-red-400 hover:text-red-600"
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
