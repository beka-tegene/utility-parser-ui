// Template types matching the backend sample templates

import type { Node, Edge } from "reactflow";

// Override field configuration - defines user input fields
export interface OverrideField {
  field: string; // User-friendly field name (e.g., "Bill_Id")
  value: string; // Source mapping (e.g., "request.billRefNo")
  actual_mapping: string; // Actual field in request body (e.g., "Bill_Id")
  type?: string; // Field type: "string", "number", "bill", "account_number", etc.
  max_length?: number; // Maximum length for validation
  min_length?: number; // Minimum length for validation
  pattern?: string; // Regex pattern: "alphabetNumeric", "numeric", etc.
  required?: boolean;
}

export interface ToBeOverridden {
  overridden_request_body: OverrideField[];
}

// Authorization mapper for bearer token auth
export interface AuthorizationMapper {
  type: "bearer" | "basic";
  token?: string; // e.g., "accumulated.access_token"
}

// OAuth credentials for TOKEN step
export interface Credentials {
  grant_type: string; // e.g., "client_credentials"
  client_id: string;
  client_secret: string;
  scope: string;
}

// Payable item for bulk payments in SETUP step
export interface PayableItem {
  key: string; // e.g., "monthly_rent"
  label: string; // e.g., "Monthly Rent"
  amount: string; // e.g., "accumulated.monthly"
  credit_account: string; // e.g., "1000300312474"
}

// Setup step body configuration
export interface SetupBody {
  type: "single" | "bulk";
  payables: PayableItem[];
}

// Workflow step types
export type StepType = "TOKEN" | "QUERY" | "SETUP" | "PAYMENT" | "DONE";

export interface Template {
  name: string; // Step name like "TOKEN", "QUERY"
  current_step: StepType | string; // Current step identifier
  next_step: StepType | string; // Next step identifier
  method?: "GET" | "POST" | "PUT" | "DELETE" | "PATCH"; // Optional for SETUP step
  url?: string; // Optional for SETUP step
  header_type?: Record<string, string>; // HTTP headers
  authorization_mapper?: AuthorizationMapper; // Bearer token config
  credentials?: Credentials; // OAuth credentials for TOKEN step
  body: Record<string, unknown> | SetupBody; // Request body or setup config
  request_mapper?: Record<string, string>; // Maps input to request body
  response_mapper?: Record<string, string>; // Maps response to accumulated
  to_be_overridden?: ToBeOverridden; // User input field overrides
  static_fields?: Record<string, string>; // Step-level static values
}

export interface Collection {
  id?: string;
  template_code: string; // Unique code like "AWACH", "CHAPA"
  name: string; // Display name
  description?: string;
  templates: Template[]; // Workflow steps (TOKEN → QUERY → SETUP → PAYMENT)
  sequence?: number;
  created_at?: string;
  updated_at?: string;
  is_archived?: boolean;
  logo?: string; // Logo URL
  credit_account?: string; // Default credit account
  ussd_enabled?: boolean;
  static_fields?: Record<string, string>; // Collection-level static values
}

// cURL parser types
export interface ParsedCurl {
  method: string;
  url: string;
  headers: Record<string, string>;
  body: Record<string, unknown> | string | null;
  queryParams: Record<string, string>;
  contentType?: string;
  isFormData?: boolean;
}

// Visual mapper types
export interface MappingNode {
  id: string;
  type: "source" | "target";
  label: string;
  path: string;
  dataType?: string;
}

export interface MappingConnection {
  id: string;
  sourceId: string;
  targetId: string;
  sourcePath: string;
  targetPath: string;
}

// Workflow test types
export interface WorkflowState {
  currentStep: number;
  totalSteps: number;
  token?: string;
  accumulatedData: Record<string, unknown>;
  responses: Array<{
    step: number;
    request: unknown;
    response: unknown;
    timestamp: string;
  }>;
}

// Context Mind Map types
export interface FieldAnnotation {
  path: string;
  isContext: boolean;
  isResponse: boolean;
  contextSource?: string;
  description?: string;
}

export interface WorkflowStep {
  name: string;
  request: {
    method: string;
    url: string;
    headers: Record<string, string>;
    body: Record<string, unknown> | null;
  };
  response: Record<string, unknown> | null;
  timestamp: string;
  contextFields: string[];
  responseFields: string[];
}

export interface WorkflowContext {
  accumulated: Record<string, unknown>;
  steps: WorkflowStep[];
}

export interface FieldMappingResult {
  contextFields: string[];
  responseFields: string[];
  fieldMappings: Record<string, string>;
}

// Node types for React Flow visualization
export type NodeCategory =
  | "request"
  | "response"
  | "context"
  | "accumulated"
  | "credentials";

export interface MindMapNodeData {
  label: string;
  path: string;
  fullPath: string;
  value?: unknown;
  dataType: string;
  category: NodeCategory;
  isMarkedContext?: boolean;
  isMarkedResponse?: boolean;
  description?: string;
}

// Analysis types
export interface AnalyzedField {
  path: string;
  key: string;
  value: unknown;
  type: string;
  depth: number;
  isContext?: boolean;
  isResponse?: boolean;
  contextSource?: string;
}

export interface AnalyzedRequest {
  method: string;
  url: string;
  headers: Record<string, string>;
  body: Record<string, unknown> | string | null;
  fields: AnalyzedField[];
}

export interface AnalyzedResponse {
  status: number;
  statusText: string;
  headers: Record<string, string>;
  body: unknown;
  fields: AnalyzedField[];
  timestamp: string;
}

// ============ History & State Management Types ============

// State snapshot for undo/redo functionality
export interface StateSnapshot {
  id: string;
  timestamp: string;
  label: string;
  state: {
    collection: Collection | null;
    currentTemplateIndex: number;
    requestMappings: MappingConnection[];
    responseMappings: MappingConnection[];
  };
}

// History state for managing undo/redo
export interface HistoryState {
  snapshots: StateSnapshot[];
  currentIndex: number;
  maxSnapshots: number;
}

// Override field config for canvas mapping (matches backend format)
export interface OverrideFieldConfig {
  field: string; // Display name / context name
  value: string; // "request.{actual_mapping}"
  actual_mapping: string; // Original field path in request body
  type: string; // "bill", "string", "number", etc.
  max_length?: number;
  min_length?: number;
  pattern?: string; // "alphabetNumeric", "numeric", etc.
  required: boolean;
}

// Multi-step workflow cURL data per step
export interface StepCurlData {
  stepIndex: number;
  stepName: string;
  curlInput: string;
  parsedRequest: ParsedCurl | null;
  responseInput: string;
  parsedResponse: Record<string, unknown> | null;
  // Canvas mapping state
  contextFieldMappings?: Record<string, string>; // originalKey -> displayName
  overrideFieldConfigs?: Record<string, OverrideFieldConfig>; // fieldPath -> config
  requestMappings?: MappingConnection[];
  responseMappings?: MappingConnection[];
  nodes?: Node[]; // Add this
  edges?: Edge[];
}

export type ExtendedStepCurlData = StepCurlData & {
  nodes?: Node[];
  edges?: Edge[]; // Fix: should be Edge[], not Node[]
};
// Accumulated context from previous steps
export interface AccumulatedContext {
  [stepName: string]: {
    fields: Record<string, unknown>;
    timestamp: string;
  };
}

// Step status for visual indicators
export type StepStatus = "pending" | "in_progress" | "completed" | "error";

// Multi-step data keyed by template_code
export interface MultiStepData {
  [templateCode: string]: {
    steps: StepCurlData[];
    activeStepIndex: number;
    accumulatedContext: AccumulatedContext;
  };
}

// Inherited field from previous step
export interface InheritedField {
  fieldName: string;
  value: unknown;
  fromStep: string;
  fromStepIndex: number;
}
