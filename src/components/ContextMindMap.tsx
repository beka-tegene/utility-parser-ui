'use client';

import { useCallback, useEffect, useState } from 'react';
import ReactFlow, {
  Node,
  Edge,
  addEdge,
  Connection,
  useNodesState,
  useEdgesState,
  Background,
  Controls,
  MiniMap,
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
import { detectDataType } from '@/lib/utils';
import {
  ArrowRight,
  FileJson,
  Trash2,
  RefreshCw,
  Maximize2,
  GripVertical,
} from 'lucide-react';

interface MindMapNodeData {
  label: string;
  path: string;
  fullPath: string;
  value?: unknown;
  dataType: string;
  category: 'request' | 'response';
}

// Type colors for badges
const typeColors: Record<string, string> = {
  string: 'bg-emerald-100 text-emerald-700',
  number: 'bg-blue-100 text-blue-700',
  boolean: 'bg-purple-100 text-purple-700',
  null: 'bg-gray-100 text-gray-600',
};

// Request field node - draggable with handles on both sides
function FieldNode({ data, selected }: NodeProps<MindMapNodeData>) {
  const isRequest = data.category === 'request';
  const bgColor = isRequest ? 'bg-blue-50 border-blue-300' : 'bg-green-50 border-green-300';
  const labelColor = isRequest ? 'text-blue-700' : 'text-green-700';

  return (
    <div
      className={`group relative px-3 py-2 rounded-lg border-2 shadow-sm transition-all duration-200 cursor-move
        ${bgColor}
        ${selected ? 'ring-2 ring-purple-500 ring-offset-2 shadow-lg' : ''}
        hover:shadow-md`}
      style={{ minWidth: 180 }}
    >
      {/* Drag indicator */}
      <div className="absolute -left-1 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-50">
        <GripVertical className="w-3 h-3 text-gray-400" />
      </div>

      {/* Left handle */}
      <Handle
        type="target"
        position={Position.Left}
        className="!w-3 !h-3 !bg-purple-500 !border-2 !border-white !shadow-md"
        style={{ left: -6 }}
      />

      {/* Right handle */}
      <Handle
        type="source"
        position={Position.Right}
        className="!w-3 !h-3 !bg-purple-500 !border-2 !border-white !shadow-md"
        style={{ right: -6 }}
      />

      <div className="flex items-center gap-2">
        <span className={`text-[10px] font-bold uppercase ${labelColor}`}>
          {data.category}
        </span>
        <span className={`text-[10px] px-1.5 py-0.5 rounded ${typeColors[data.dataType] || typeColors.null}`}>
          {data.dataType}
        </span>
      </div>

      <div className="text-sm font-semibold text-gray-800 mt-1">
        {data.label}
      </div>

      {data.value !== undefined && (
        <div className="text-xs text-gray-500 font-mono mt-0.5 truncate max-w-[200px]">
          {JSON.stringify(data.value).slice(0, 40)}
        </div>
      )}
    </div>
  );
}

const nodeTypes = {
  fieldNode: FieldNode,
};

interface ContextMindMapProps {
  requestBody: Record<string, unknown> | null;
  responseBody: Record<string, unknown> | null;
  onFieldMappingChange?: (mappings: {
    contextFields: string[];
    responseFields: string[];
    fieldMappings: Record<string, string>;
  }) => void;
}

function ContextMindMapInner({
  requestBody,
  responseBody,
  onFieldMappingChange,
}: ContextMindMapProps) {
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const reactFlowInstance = useReactFlow();

  // Extract flat fields from object (no nested complexity)
  const extractFields = useCallback((
    obj: Record<string, unknown>,
    category: 'request' | 'response'
  ): Node<MindMapNodeData>[] => {
    const nodeList: Node<MindMapNodeData>[] = [];
    let yOffset = 0;
    const xPos = category === 'request' ? 50 : 450;

    const processObj = (o: Record<string, unknown>, prefix = '') => {
      Object.entries(o).forEach(([key, value]) => {
        const path = prefix ? `${prefix}.${key}` : key;
        const dataType = detectDataType(value);

        // For nested objects, recurse
        if (dataType === 'object' && value !== null) {
          processObj(value as Record<string, unknown>, path);
          return;
        }

        // For arrays, show count but don't expand
        if (dataType === 'array') {
          nodeList.push({
            id: `${category}-${path}`,
            type: 'fieldNode',
            position: { x: xPos, y: yOffset },
            draggable: true,
            data: {
              label: key,
              path,
              fullPath: `${category}.${path}`,
              value: `[${(value as unknown[]).length} items]`,
              dataType: 'array',
              category,
            },
          });
          yOffset += 80;
          return;
        }

        // Primitive values
        nodeList.push({
          id: `${category}-${path}`,
          type: 'fieldNode',
          position: { x: xPos, y: yOffset },
          draggable: true,
          data: {
            label: key,
            path,
            fullPath: `${category}.${path}`,
            value,
            dataType,
            category,
          },
        });
        yOffset += 80;
      });
    };

    processObj(obj);
    return nodeList;
  }, []);

  // Build nodes when data changes
  useEffect(() => {
    const allNodes: Node<MindMapNodeData>[] = [];

    if (requestBody && Object.keys(requestBody).length > 0) {
      allNodes.push(...extractFields(requestBody, 'request'));
    }

    if (responseBody && Object.keys(responseBody).length > 0) {
      allNodes.push(...extractFields(responseBody, 'response'));
    }

    setNodes(allNodes);

    // Fit view after nodes are added
    setTimeout(() => {
      if (allNodes.length > 0) {
        reactFlowInstance.fitView({ padding: 0.3 });
      }
    }, 100);
  }, [requestBody, responseBody, extractFields, setNodes, reactFlowInstance]);

  // Handle new connections
  const onConnect = useCallback(
    (connection: Connection) => {
      const newEdge: Edge = {
        id: `edge-${connection.source}-${connection.target}-${Date.now()}`,
        source: connection.source!,
        target: connection.target!,
        sourceHandle: connection.sourceHandle,
        targetHandle: connection.targetHandle,
        animated: true,
        style: { stroke: '#8b5cf6', strokeWidth: 2 },
        markerEnd: { type: MarkerType.ArrowClosed, color: '#8b5cf6' },
        deletable: true,
      };

      setEdges((eds) => addEdge(newEdge, eds));

      // Notify parent
      if (onFieldMappingChange) {
        const sourceNode = nodes.find(n => n.id === connection.source);
        const targetNode = nodes.find(n => n.id === connection.target);
        if (sourceNode && targetNode) {
          onFieldMappingChange({
            contextFields: [],
            responseFields: [],
            fieldMappings: {
              [targetNode.data.fullPath]: sourceNode.data.fullPath,
            },
          });
        }
      }
    },
    [setEdges, nodes, onFieldMappingChange]
  );

  // Delete edge
  const onEdgeClick = useCallback(
    (_: React.MouseEvent, edge: Edge) => {
      setEdges((eds) => eds.filter((e) => e.id !== edge.id));
    },
    [setEdges]
  );

  // Auto layout
  const handleAutoLayout = useCallback(() => {
    const requestNodes = nodes.filter(n => n.data.category === 'request');
    const responseNodes = nodes.filter(n => n.data.category === 'response');

    const updatedNodes = nodes.map(node => {
      if (node.data.category === 'request') {
        const index = requestNodes.findIndex(n => n.id === node.id);
        return { ...node, position: { x: 50, y: index * 80 } };
      } else {
        const index = responseNodes.findIndex(n => n.id === node.id);
        return { ...node, position: { x: 450, y: index * 80 } };
      }
    });

    setNodes(updatedNodes);
    setTimeout(() => reactFlowInstance.fitView({ padding: 0.3 }), 50);
  }, [nodes, setNodes, reactFlowInstance]);

  // Clear all edges
  const handleClearEdges = useCallback(() => {
    setEdges([]);
  }, [setEdges]);

  const isEmpty = nodes.length === 0;

  return (
    <div className="h-full flex flex-col border rounded-xl bg-white overflow-hidden">
      {/* Simple toolbar */}
      <div className="flex items-center justify-between px-4 py-2 bg-gray-50 border-b">
        <div className="flex items-center gap-2 text-sm font-medium text-gray-700">
          <FileJson className="w-4 h-4 text-purple-600" />
          Spider Web Mapper
          <span className="text-xs text-gray-400 font-normal ml-2">
            Drag nodes to arrange • Connect fields by dragging handles
          </span>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleAutoLayout}
            disabled={isEmpty}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs bg-gray-100 text-gray-600 rounded-md hover:bg-gray-200 disabled:opacity-50"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            Reset Layout
          </button>
          <button
            onClick={() => reactFlowInstance.fitView({ padding: 0.3 })}
            disabled={isEmpty}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs bg-gray-100 text-gray-600 rounded-md hover:bg-gray-200 disabled:opacity-50"
          >
            <Maximize2 className="w-3.5 h-3.5" />
            Fit View
          </button>
          <button
            onClick={handleClearEdges}
            disabled={edges.length === 0}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs bg-red-50 text-red-600 rounded-md hover:bg-red-100 disabled:opacity-50"
          >
            <Trash2 className="w-3.5 h-3.5" />
            Clear Connections
          </button>
        </div>
      </div>

      {/* Canvas */}
      <div className="flex-1 relative">
        {isEmpty ? (
          <div className="absolute inset-0 flex items-center justify-center text-gray-400">
            <div className="text-center">
              <FileJson className="w-16 h-16 mx-auto mb-4 opacity-20" />
              <p className="text-lg font-medium">No data to visualize</p>
              <p className="text-sm mt-1">Parse a cURL and add a response to see the field mapping</p>
            </div>
          </div>
        ) : (
          <ReactFlow
            nodes={nodes}
            edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onConnect={onConnect}
            onEdgeClick={onEdgeClick}
            nodeTypes={nodeTypes}
            nodesDraggable={true}
            nodesConnectable={true}
            elementsSelectable={true}
            connectionLineType={ConnectionLineType.SmoothStep}
            connectionLineStyle={{ stroke: '#8b5cf6', strokeWidth: 2, strokeDasharray: '5,5' }}
            defaultEdgeOptions={{
              animated: true,
              style: { stroke: '#8b5cf6', strokeWidth: 2 },
              markerEnd: { type: MarkerType.ArrowClosed, color: '#8b5cf6' },
            }}
            fitView
            fitViewOptions={{ padding: 0.3 }}
            minZoom={0.2}
            maxZoom={2}
            snapToGrid={true}
            snapGrid={[10, 10]}
          >
            <Background variant={BackgroundVariant.Dots} gap={20} size={1} color="#e2e8f0" />
            <Controls showInteractive={false} className="!shadow-md !rounded-lg !border" />
            <MiniMap
              nodeColor={(node) => node.data.category === 'request' ? '#3b82f6' : '#22c55e'}
              maskColor="rgba(0,0,0,0.1)"
              className="!bg-white !border !rounded-lg !shadow-md"
              style={{ width: 120, height: 80 }}
            />
          </ReactFlow>
        )}

        {/* Connection summary */}
        {edges.length > 0 && (
          <div className="absolute bottom-4 left-4 bg-white rounded-lg shadow-lg border p-3 max-w-xs">
            <div className="text-xs font-semibold text-gray-700 mb-2">
              Mappings ({edges.length})
            </div>
            <div className="space-y-1 max-h-32 overflow-y-auto">
              {edges.map(edge => {
                const src = nodes.find(n => n.id === edge.source);
                const tgt = nodes.find(n => n.id === edge.target);
                return (
                  <div key={edge.id} className="flex items-center gap-1.5 text-xs">
                    <span className="font-mono text-blue-600 bg-blue-50 px-1 rounded truncate">
                      {src?.data.label}
                    </span>
                    <ArrowRight className="w-3 h-3 text-purple-400 flex-shrink-0" />
                    <span className="font-mono text-green-600 bg-green-50 px-1 rounded truncate">
                      {tgt?.data.label}
                    </span>
                    <button
                      onClick={() => setEdges(eds => eds.filter(e => e.id !== edge.id))}
                      className="p-0.5 text-red-400 hover:text-red-600 opacity-50 hover:opacity-100"
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
    </div>
  );
}

export function ContextMindMap(props: ContextMindMapProps) {
  return (
    <ReactFlowProvider>
      <ContextMindMapInner {...props} />
    </ReactFlowProvider>
  );
}
