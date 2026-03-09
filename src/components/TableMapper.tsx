'use client';

import { useState } from 'react';
import { Plus, Trash2, GripVertical, ChevronDown, ChevronRight } from 'lucide-react';
import { generateId } from '@/lib/utils';

interface MappingRow {
  id: string;
  targetField: string;
  sourceField: string;
  sourceType: 'request' | 'accumulated' | 'context' | 'credentials' | 'static';
  staticValue?: string;
  required?: boolean;
  fieldType?: string;
}

interface TableMapperProps {
  title: string;
  mappings: MappingRow[];
  onChange: (mappings: MappingRow[]) => void;
  sourceFields?: string[];
  showFieldConfig?: boolean;
}

export function TableMapper({
  title,
  mappings,
  onChange,
  sourceFields = [],
  showFieldConfig = false,
}: TableMapperProps) {
  const [expanded, setExpanded] = useState(true);

  const handleAddRow = () => {
    const newRow: MappingRow = {
      id: generateId(),
      targetField: '',
      sourceField: '',
      sourceType: 'request',
      required: false,
      fieldType: 'string',
    };
    onChange([...mappings, newRow]);
  };

  const handleUpdateRow = (id: string, field: keyof MappingRow, value: unknown) => {
    onChange(
      mappings.map((row) => (row.id === id ? { ...row, [field]: value } : row))
    );
  };

  const handleDeleteRow = (id: string) => {
    onChange(mappings.filter((row) => row.id !== id));
  };

  const sourceTypes = [
    { value: 'request', label: 'Request', color: 'text-blue-600' },
    { value: 'accumulated', label: 'Accumulated', color: 'text-purple-600' },
    { value: 'context', label: 'Context', color: 'text-orange-600' },
    { value: 'credentials', label: 'Credentials', color: 'text-green-600' },
    { value: 'static', label: 'Static Value', color: 'text-gray-600' },
  ];

  const fieldTypes = [
    'string',
    'number',
    'phone',
    'email',
    'account_number',
    'bill',
    'amount',
    'date',
  ];

  return (
    <div className="border rounded-lg overflow-hidden bg-white">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between p-3 bg-gray-50 hover:bg-gray-100 transition-colors"
      >
        <span className="text-sm font-medium text-gray-700">{title}</span>
        <div className="flex items-center gap-2">
          <span className="text-xs text-gray-500">{mappings.length} mappings</span>
          {expanded ? (
            <ChevronDown className="w-4 h-4 text-gray-400" />
          ) : (
            <ChevronRight className="w-4 h-4 text-gray-400" />
          )}
        </div>
      </button>

      {expanded && (
        <div className="p-3">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b">
                <th className="py-2 px-2 text-left text-xs font-medium text-gray-500 w-8"></th>
                <th className="py-2 px-2 text-left text-xs font-medium text-gray-500">
                  Target Field
                </th>
                <th className="py-2 px-2 text-left text-xs font-medium text-gray-500">
                  Source Type
                </th>
                <th className="py-2 px-2 text-left text-xs font-medium text-gray-500">
                  Source Field / Value
                </th>
                {showFieldConfig && (
                  <>
                    <th className="py-2 px-2 text-left text-xs font-medium text-gray-500">
                      Type
                    </th>
                    <th className="py-2 px-2 text-left text-xs font-medium text-gray-500 w-16">
                      Required
                    </th>
                  </>
                )}
                <th className="py-2 px-2 w-10"></th>
              </tr>
            </thead>
            <tbody>
              {mappings.map((row) => (
                <tr key={row.id} className="border-b last:border-0 hover:bg-gray-50">
                  <td className="py-2 px-2">
                    <GripVertical className="w-4 h-4 text-gray-300 cursor-move" />
                  </td>
                  <td className="py-2 px-2">
                    <input
                      type="text"
                      value={row.targetField}
                      onChange={(e) =>
                        handleUpdateRow(row.id, 'targetField', e.target.value)
                      }
                      placeholder="e.g., Bill_Id"
                      className="w-full px-2 py-1 text-sm border rounded focus:outline-none focus:ring-1 focus:ring-blue-500 font-mono"
                    />
                  </td>
                  <td className="py-2 px-2">
                    <select
                      value={row.sourceType}
                      onChange={(e) =>
                        handleUpdateRow(row.id, 'sourceType', e.target.value)
                      }
                      className="w-full px-2 py-1 text-sm border rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                    >
                      {sourceTypes.map((type) => (
                        <option key={type.value} value={type.value}>
                          {type.label}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td className="py-2 px-2">
                    {row.sourceType === 'static' ? (
                      <input
                        type="text"
                        value={row.staticValue || ''}
                        onChange={(e) =>
                          handleUpdateRow(row.id, 'staticValue', e.target.value)
                        }
                        placeholder="Enter static value"
                        className="w-full px-2 py-1 text-sm border rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                      />
                    ) : sourceFields.length > 0 ? (
                      <select
                        value={row.sourceField}
                        onChange={(e) =>
                          handleUpdateRow(row.id, 'sourceField', e.target.value)
                        }
                        className="w-full px-2 py-1 text-sm border rounded focus:outline-none focus:ring-1 focus:ring-blue-500 font-mono"
                      >
                        <option value="">Select field...</option>
                        {sourceFields.map((field) => (
                          <option key={field} value={field}>
                            {field}
                          </option>
                        ))}
                      </select>
                    ) : (
                      <input
                        type="text"
                        value={row.sourceField}
                        onChange={(e) =>
                          handleUpdateRow(row.id, 'sourceField', e.target.value)
                        }
                        placeholder={`${row.sourceType}.fieldName`}
                        className="w-full px-2 py-1 text-sm border rounded focus:outline-none focus:ring-1 focus:ring-blue-500 font-mono"
                      />
                    )}
                  </td>
                  {showFieldConfig && (
                    <>
                      <td className="py-2 px-2">
                        <select
                          value={row.fieldType || 'string'}
                          onChange={(e) =>
                            handleUpdateRow(row.id, 'fieldType', e.target.value)
                          }
                          className="w-full px-2 py-1 text-sm border rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                        >
                          {fieldTypes.map((type) => (
                            <option key={type} value={type}>
                              {type}
                            </option>
                          ))}
                        </select>
                      </td>
                      <td className="py-2 px-2 text-center">
                        <input
                          type="checkbox"
                          checked={row.required || false}
                          onChange={(e) =>
                            handleUpdateRow(row.id, 'required', e.target.checked)
                          }
                          className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                        />
                      </td>
                    </>
                  )}
                  <td className="py-2 px-2">
                    <button
                      onClick={() => handleDeleteRow(row.id)}
                      className="p-1 text-red-400 hover:text-red-600 transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          <button
            onClick={handleAddRow}
            className="mt-3 flex items-center gap-1.5 px-3 py-1.5 text-sm text-blue-600 hover:bg-blue-50 rounded-md transition-colors"
          >
            <Plus className="w-4 h-4" />
            Add Mapping
          </button>
        </div>
      )}
    </div>
  );
}
