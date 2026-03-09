import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// Parse a cURL command into structured data
export function parseCurl(curlCommand: string): {
  method: string;
  url: string;
  headers: Record<string, string>;
  body: Record<string, unknown> | string | null;
  contentType: string;
  isFormData: boolean;
} {
  const result = {
    method: 'GET',
    url: '',
    headers: {} as Record<string, string>,
    body: null as Record<string, unknown> | string | null,
    contentType: '',
    isFormData: false,
  };

  // Clean up the command - handle line continuations and normalize whitespace
  let cmd = curlCommand
    .replace(/\\\r?\n/g, ' ')  // Handle line continuations
    .replace(/[\r\n]+/g, ' ')   // Handle actual newlines
    .replace(/\s+/g, ' ')       // Normalize whitespace
    .trim();

  // Remove 'curl' prefix if present
  if (cmd.toLowerCase().startsWith('curl')) {
    cmd = cmd.substring(4).trim();
  }

  // Remove --location or -L flag (we note it but don't need to do anything special)
  cmd = cmd.replace(/--location\s*/gi, '').replace(/-L\s*/gi, '');

  // Extract method (-X or --request)
  const methodMatch = cmd.match(/-X\s+['"]?(\w+)['"]?/i) || cmd.match(/--request\s+['"]?(\w+)['"]?/i);
  if (methodMatch) {
    result.method = methodMatch[1].toUpperCase();
  }

  // Extract URL - handle quoted URLs with query parameters
  const urlPatterns = [
    /['"]?(https?:\/\/[^\s'"]+)['"]?/i,  // Standard URL
    /(?:^|\s)['"]([^'"]+)['"]/,           // Quoted string that might be URL
  ];

  for (const pattern of urlPatterns) {
    const urlMatch = cmd.match(pattern);
    if (urlMatch && urlMatch[1]) {
      // Clean up the URL - remove trailing quotes if any
      result.url = urlMatch[1].replace(/['"]$/, '');
      break;
    }
  }

  // Extract headers - handle both -H and --header formats
  const headerPatterns = [
    /-H\s+['"]([^'"]+)['"]/gi,
    /--header\s+['"]([^'"]+)['"]/gi,
  ];

  for (const pattern of headerPatterns) {
    let headerMatch;
    while ((headerMatch = pattern.exec(cmd)) !== null) {
      const headerStr = headerMatch[1];
      const colonIndex = headerStr.indexOf(':');
      if (colonIndex > 0) {
        const key = headerStr.substring(0, colonIndex).trim();
        const value = headerStr.substring(colonIndex + 1).trim();
        result.headers[key] = value;

        // Track content type
        if (key.toLowerCase() === 'content-type') {
          result.contentType = value.toLowerCase();
        }
      }
    }
  }

  // Extract form-urlencoded data (--data-urlencode)
  const formDataPairs: Record<string, string> = {};
  const dataUrlencodeRegex = /--data-urlencode\s+['"]([^'"]+)['"]/gi;
  let formMatch;
  let hasFormData = false;

  while ((formMatch = dataUrlencodeRegex.exec(cmd)) !== null) {
    hasFormData = true;
    const pair = formMatch[1];
    const eqIndex = pair.indexOf('=');
    if (eqIndex > 0) {
      const key = pair.substring(0, eqIndex);
      const value = pair.substring(eqIndex + 1);
      formDataPairs[key] = value;
    }
  }

  if (hasFormData) {
    result.body = formDataPairs;
    result.isFormData = true;
    if (!methodMatch) {
      result.method = 'POST';
    }
  }

  // Extract regular body data (-d, --data, --data-raw, --data-binary)
  if (!hasFormData) {
    const dataPatterns = [
      /-d\s+['"](.+?)['"]\s*(?=--|$)/gs,
      /--data\s+['"](.+?)['"]\s*(?=--|$)/gs,
      /--data-raw\s+['"](.+?)['"]\s*(?=--|$)/gs,
      /--data-binary\s+['"](.+?)['"]\s*(?=--|$)/gs,
    ];

    for (const pattern of dataPatterns) {
      const dataMatch = pattern.exec(cmd);
      if (dataMatch) {
        const bodyStr = dataMatch[1];

        // Try to parse as JSON
        try {
          result.body = JSON.parse(bodyStr);
        } catch {
          // If not JSON, check if it's form data format (key=value&key2=value2)
          if (bodyStr.includes('=') && !bodyStr.includes('{')) {
            const pairs: Record<string, string> = {};
            bodyStr.split('&').forEach(pair => {
              const [key, ...valueParts] = pair.split('=');
              if (key) {
                pairs[key.trim()] = decodeURIComponent(valueParts.join('=').trim());
              }
            });
            result.body = pairs;
            result.isFormData = true;
          } else {
            result.body = bodyStr;
          }
        }

        if (!methodMatch) {
          result.method = 'POST';
        }
        break;
      }
    }
  }

  // Also handle form data passed as -F or --form
  const formRegex = /(?:-F|--form)\s+['"]([^'"]+)['"]/gi;
  let formFieldMatch;
  const formFields: Record<string, string> = {};
  let hasMultipartForm = false;

  while ((formFieldMatch = formRegex.exec(cmd)) !== null) {
    hasMultipartForm = true;
    const field = formFieldMatch[1];
    const eqIndex = field.indexOf('=');
    if (eqIndex > 0) {
      const key = field.substring(0, eqIndex);
      const value = field.substring(eqIndex + 1);
      formFields[key] = value;
    }
  }

  if (hasMultipartForm && !result.body) {
    result.body = formFields;
    result.isFormData = true;
    if (!methodMatch) {
      result.method = 'POST';
    }
  }

  return result;
}

// Extract all paths from a JSON object
export function extractPaths(obj: unknown, prefix = ''): string[] {
  const paths: string[] = [];

  if (obj === null || obj === undefined) {
    return paths;
  }

  if (Array.isArray(obj)) {
    paths.push(prefix);
    obj.forEach((item, index) => {
      paths.push(...extractPaths(item, `${prefix}[${index}]`));
    });
  } else if (typeof obj === 'object') {
    Object.entries(obj as Record<string, unknown>).forEach(([key, value]) => {
      const newPath = prefix ? `${prefix}.${key}` : key;
      paths.push(newPath);
      if (typeof value === 'object' && value !== null) {
        paths.push(...extractPaths(value, newPath));
      }
    });
  }

  return paths;
}

// Get value from object using path notation
export function getValueByPath(obj: unknown, path: string): unknown {
  const parts = path.replace(/\[(\d+)\]/g, '.$1').split('.');
  let current = obj;

  for (const part of parts) {
    if (current === null || current === undefined) {
      return undefined;
    }
    current = (current as Record<string, unknown>)[part];
  }

  return current;
}

// Generate a unique ID
export function generateId(): string {
  return Math.random().toString(36).substring(2, 15);
}

// Detect data type from value
export function detectDataType(value: unknown): string {
  if (value === null) return 'null';
  if (value === undefined) return 'undefined';
  if (Array.isArray(value)) return 'array';
  return typeof value;
}

// Flatten nested object to key-value pairs with dot notation
export function flattenObject(
  obj: Record<string, unknown>,
  prefix = '',
  result: Record<string, unknown> = {}
): Record<string, unknown> {
  for (const key in obj) {
    const value = obj[key];
    const newKey = prefix ? `${prefix}.${key}` : key;

    if (value !== null && typeof value === 'object' && !Array.isArray(value)) {
      flattenObject(value as Record<string, unknown>, newKey, result);
    } else {
      result[newKey] = value;
    }
  }
  return result;
}

// Set value in nested object using dot notation path
export function setValueByPath(
  obj: Record<string, unknown>,
  path: string,
  value: unknown
): void {
  const parts = path.split('.');
  let current: Record<string, unknown> = obj;

  for (let i = 0; i < parts.length - 1; i++) {
    const part = parts[i];
    if (!(part in current) || typeof current[part] !== 'object') {
      current[part] = {};
    }
    current = current[part] as Record<string, unknown>;
  }

  current[parts[parts.length - 1]] = value;
}

// Deep merge two objects
export function deepMerge(
  target: Record<string, unknown>,
  source: Record<string, unknown>
): Record<string, unknown> {
  const result = { ...target };

  for (const key in source) {
    const sourceValue = source[key];
    const targetValue = result[key];

    if (
      sourceValue !== null &&
      typeof sourceValue === 'object' &&
      !Array.isArray(sourceValue) &&
      targetValue !== null &&
      typeof targetValue === 'object' &&
      !Array.isArray(targetValue)
    ) {
      result[key] = deepMerge(
        targetValue as Record<string, unknown>,
        sourceValue as Record<string, unknown>
      );
    } else {
      result[key] = sourceValue;
    }
  }

  return result;
}

// Parse path expression and resolve value from context
export function resolvePathExpression(
  expression: string,
  context: {
    request?: Record<string, unknown>;
    accumulated?: Record<string, unknown>;
    context?: Record<string, unknown>;
    credentials?: Record<string, unknown>;
  }
): unknown {
  // Handle template syntax: {{category.path}}
  const templateMatch = expression.match(/^\{\{(.+)\}\}$/);
  const path = templateMatch ? templateMatch[1] : expression;

  const parts = path.split('.');
  const category = parts[0] as keyof typeof context;
  const fieldPath = parts.slice(1).join('.');

  const source = context[category];
  if (!source) return undefined;

  return getValueByPath(source, fieldPath);
}

// Generate mapping configuration from field annotations
export function generateMappingConfig(
  fields: Array<{ path: string; isContext: boolean; isResponse: boolean; contextSource?: string }>
): {
  requestMapper: Record<string, string>;
  responseMapper: Record<string, string>;
  contextFields: string[];
} {
  const requestMapper: Record<string, string> = {};
  const responseMapper: Record<string, string> = {};
  const contextFields: string[] = [];

  for (const field of fields) {
    if (field.isContext) {
      contextFields.push(field.path);
      if (field.contextSource) {
        requestMapper[field.path] = field.contextSource;
      }
    }
    if (field.isResponse) {
      responseMapper[field.path] = field.path;
    }
  }

  return { requestMapper, responseMapper, contextFields };
}

// Extract context variable names from a body template
export function extractContextVariables(body: Record<string, unknown>): string[] {
  const variables: string[] = [];
  const jsonStr = JSON.stringify(body);
  const regex = /\{\{([^}]+)\}\}/g;
  let match;

  while ((match = regex.exec(jsonStr)) !== null) {
    variables.push(match[1]);
  }

  return [...new Set(variables)];
}

// Categorize a field path into its source category
export function categorizeFieldPath(path: string): {
  category: 'request' | 'accumulated' | 'context' | 'credentials' | 'static';
  fieldPath: string;
} {
  const parts = path.split('.');
  const categories = ['request', 'accumulated', 'context', 'credentials', 'static'] as const;

  if (categories.includes(parts[0] as typeof categories[number])) {
    return {
      category: parts[0] as typeof categories[number],
      fieldPath: parts.slice(1).join('.'),
    };
  }

  return {
    category: 'request',
    fieldPath: path,
  };
}
