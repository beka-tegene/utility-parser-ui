"use client";

import React, { useState, useEffect } from "react";
import {
  AlertCircle,
  Plus,
  Trash2,
  Edit,
  Save,
  X,
  Check,
  Search,
  RefreshCw,
  Loader2,
  Eye,
  EyeOff,
  AlertTriangle,
  Shield,
  Database,
  Code,
  FileJson,
  Copy,
} from "lucide-react";
import { toast } from "sonner";
import { useAppStore } from "@/lib/store";

interface ErrorMapping {
  id?: string;
  vendor_error_message: string;
  display_message: string;
  http_status_code: number;
  template_code: string;
  is_active: boolean;
  created_at?: string;
  updated_at?: string;
}

interface ErrorMappingFormData {
  vendor_error_message: string;
  display_message: string;
  http_status_code: number;
  template_code: string;
  is_active: boolean;
}

export default function ErrorHandling() {
  const [errorMappings, setErrorMappings] = useState<ErrorMapping[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState<ErrorMappingFormData>({
    vendor_error_message: "",
    display_message: "",
    http_status_code: 400,
    template_code: "",
    is_active: true,
  });
  const [templateCodes, setTemplateCodes] = useState<string[]>([]);
  const { apiBaseUrl } = useAppStore();
  // Fetch error mappings
  const fetchErrorMappings = async () => {
    setLoading(true);
    try {
      const response = await fetch(`${apiBaseUrl}/cbesuperapp/utility/error-mappings`);
      if (!response.ok) throw new Error("Failed to fetch error mappings");
      const data = await response.json();
      setErrorMappings(data);
    } catch (error) {
      toast.error("Failed to load error mappings");
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  // Fetch template codes for dropdown
  const fetchTemplateCodes = async () => {
    try {
      const response = await fetch(`${apiBaseUrl}/cbesuperapp/utility/collections`);
      if (!response.ok) throw new Error("Failed to fetch templates");
      const data = await response.json();
      setTemplateCodes(data.map((t: any) => t.template_code));
    } catch (error) {
      console.error("Failed to fetch template codes", error);
    }
  };

  useEffect(() => {
    fetchErrorMappings();
    fetchTemplateCodes();
  }, []);

  // Create or update error mapping
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.vendor_error_message.trim()) {
      toast.error("Vendor error message is required");
      return;
    }
    if (!formData.display_message.trim()) {
      toast.error("Display message is required");
      return;
    }
    if (!formData.http_status_code) {
      toast.error("HTTP status code is required");
      return;
    }
    if (!formData.template_code.trim()) {
      toast.error("Template code is required");
      return;
    }

    setLoading(true);
    try {
      const url = editingId
        ? `${apiBaseUrl}/cbesuperapp/utility/error-mappings/${editingId}`
        : `${apiBaseUrl}/cbesuperapp/utility/error-mappings`;
      const method = editingId ? "PUT" : "POST";

      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      if (!response.ok) throw new Error("Failed to save error mapping");

      toast.success(
        editingId ? "Error mapping updated" : "Error mapping created",
      );
      resetForm();
      fetchErrorMappings();
    } catch (error) {
      toast.error("Failed to save error mapping");
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  // Delete error mapping
  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this error mapping?")) return;

    try {
      const response = await fetch(`${apiBaseUrl}/cbesuperapp/utility/error-mappings/${id}`, {
        method: "DELETE",
      });
      if (!response.ok) throw new Error("Failed to delete");

      toast.success("Error mapping deleted");
      fetchErrorMappings();
    } catch (error) {
      toast.error("Failed to delete error mapping");
      console.error(error);
    }
  };

  // Edit error mapping
  const handleEdit = (mapping: ErrorMapping) => {
    setFormData({
      vendor_error_message: mapping.vendor_error_message,
      display_message: mapping.display_message,
      http_status_code: mapping.http_status_code,
      template_code: mapping.template_code,
      is_active: mapping.is_active,
    });
    setEditingId(mapping.id || null);
    setShowForm(true);
  };

  // Reset form
  const resetForm = () => {
    setFormData({
      vendor_error_message: "",
      display_message: "",
      http_status_code: 400,
      template_code: "",
      is_active: true,
    });
    setEditingId(null);
    setShowForm(false);
  };

  // Toggle active status
  const toggleActive = async (mapping: ErrorMapping) => {
    try {
      const response = await fetch(`${apiBaseUrl}/cbesuperapp/utility/error-mappings/${mapping.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...mapping, is_active: !mapping.is_active }),
      });
      if (!response.ok) throw new Error("Failed to update status");

      toast.success(
        `Error mapping ${!mapping.is_active ? "activated" : "deactivated"}`,
      );
      fetchErrorMappings();
    } catch (error) {
      toast.error("Failed to update status");
      console.error(error);
    }
  };

  // Filter error mappings
  const filteredMappings = errorMappings.filter(
    (mapping) =>
      mapping.vendor_error_message
        .toLowerCase()
        .includes(searchQuery.toLowerCase()) ||
      mapping.display_message
        .toLowerCase()
        .includes(searchQuery.toLowerCase()) ||
      mapping.template_code.toLowerCase().includes(searchQuery.toLowerCase()),
  );

  // Get status badge color
  const getStatusBadge = (isActive: boolean) => {
    return isActive
      ? "bg-green-100 text-green-800 border-green-300"
      : "bg-gray-100 text-gray-600 border-gray-300";
  };

  // Get HTTP status code color
  const getStatusCodeColor = (code: number) => {
    if (code >= 500) return "bg-red-100 text-red-800";
    if (code >= 400) return "bg-amber-100 text-amber-800";
    if (code >= 300) return "bg-blue-100 text-blue-800";
    if (code >= 200) return "bg-green-100 text-green-800";
    return "bg-gray-100 text-gray-800";
  };

  return (
    <div className="h-full flex flex-col bg-gradient-to-br from-gray-50 to-gray-100 overflow-y-auto">
      {/* Header */}
      <div className="bg-white border-b px-6 py-4 shadow-sm">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-r from-red-500 to-orange-500 flex items-center justify-center shadow-md">
              <AlertTriangle className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-gray-800">
                Error Handling
              </h1>
              <p className="text-sm text-gray-500">
                Manage error mappings for vendor responses
              </p>
            </div>
          </div>
          <button
            onClick={() => {
              resetForm();
              setShowForm(true);
            }}
            className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-xl hover:from-blue-700 hover:to-blue-800 transition-all shadow-sm"
          >
            <Plus className="w-4 h-4" />
            Add Error Mapping
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 p-6 pb-0">
        <div className="bg-white rounded-xl border p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Total Mappings</p>
              <p className="text-2xl font-bold text-gray-800">
                {errorMappings.length}
              </p>
            </div>
            <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center">
              <AlertCircle className="w-5 h-5 text-blue-600" />
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl border p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Active</p>
              <p className="text-2xl font-bold text-green-600">
                {errorMappings.filter((m) => m.is_active).length}
              </p>
            </div>
            <div className="w-10 h-10 rounded-lg bg-green-100 flex items-center justify-center">
              <Check className="w-5 h-5 text-green-600" />
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl border p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Inactive</p>
              <p className="text-2xl font-bold text-gray-500">
                {errorMappings.filter((m) => !m.is_active).length}
              </p>
            </div>
            <div className="w-10 h-10 rounded-lg bg-gray-100 flex items-center justify-center">
              <EyeOff className="w-5 h-5 text-gray-500" />
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl border p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Templates</p>
              <p className="text-2xl font-bold text-purple-600">
                {templateCodes.length}
              </p>
            </div>
            <div className="w-10 h-10 rounded-lg bg-purple-100 flex items-center justify-center">
              <Code className="w-5 h-5 text-purple-600" />
            </div>
          </div>
        </div>
      </div>

      {/* Search Bar */}
      <div className="px-6 py-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by vendor message, display message, or template code..."
            className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery("")}
              className="absolute right-3 top-1/2 -translate-y-1/2"
            >
              <X className="w-4 h-4 text-gray-400 hover:text-gray-600" />
            </button>
          )}
        </div>
      </div>

      {/* Create/Edit Form Modal */}
      {showForm && (
        <div
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
          onClick={resetForm}
        >
          <div
            className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto m-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="sticky top-0 bg-white border-b px-6 py-4 rounded-t-2xl">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-gradient-to-r from-red-500 to-orange-500 flex items-center justify-center">
                    <AlertTriangle className="w-4 h-4 text-white" />
                  </div>
                  <h2 className="text-lg font-bold text-gray-800">
                    {editingId ? "Edit Error Mapping" : "Create Error Mapping"}
                  </h2>
                </div>
                <button
                  onClick={resetForm}
                  className="p-1 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <X className="w-5 h-5 text-gray-500" />
                </button>
              </div>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-5">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Vendor Error Message <span className="text-red-500">*</span>
                </label>
                <textarea
                  value={formData.vendor_error_message}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      vendor_error_message: e.target.value,
                    })
                  }
                  placeholder="e.g., Invalid bill reference number"
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent font-mono text-sm"
                  required
                />
                <p className="text-xs text-gray-500 mt-1">
                  The exact error message returned by the vendor API
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Display Message <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.display_message}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      display_message: e.target.value,
                    })
                  }
                  placeholder="e.g., Invalid bill reference. Please check and try again."
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required
                />
                <p className="text-xs text-gray-500 mt-1">
                  User-friendly message to display to the customer
                </p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    HTTP Status Code <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={formData.http_status_code}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        http_status_code: parseInt(e.target.value),
                      })
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value={400}>400 - Bad Request</option>
                    <option value={401}>401 - Unauthorized</option>
                    <option value={403}>403 - Forbidden</option>
                    <option value={404}>404 - Not Found</option>
                    <option value={409}>409 - Conflict</option>
                    <option value={422}>422 - Unprocessable Entity</option>
                    <option value={500}>500 - Internal Server Error</option>
                    <option value={502}>502 - Bad Gateway</option>
                    <option value={503}>503 - Service Unavailable</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Template Code <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={formData.template_code}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        template_code: e.target.value,
                      })
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    required
                  >
                    <option value="">Select template</option>
                    {templateCodes.map((code) => (
                      <option key={code} value={code}>
                        {code}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.is_active}
                    onChange={(e) =>
                      setFormData({ ...formData, is_active: e.target.checked })
                    }
                    className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                  />
                  <span className="text-sm text-gray-700">Active</span>
                </label>
                <p className="text-xs text-gray-500">
                  Inactive mappings will not be applied to errors
                </p>
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t">
                <button
                  type="button"
                  onClick={resetForm}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="px-4 py-2 text-sm font-medium text-white bg-gradient-to-r from-blue-600 to-purple-600 rounded-lg hover:from-blue-700 hover:to-purple-700 transition-colors disabled:opacity-50 flex items-center gap-2"
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <Save className="w-4 h-4" />
                      {editingId ? "Update" : "Create"}
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Error Mappings Table */}
      <div className=" px-6 pb-6">
        {loading && errorMappings.length === 0 ? (
          <div className="flex items-center justify-center h-64">
            <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
          </div>
        ) : filteredMappings.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 text-center">
            <div className="w-20 h-20 rounded-full bg-gray-100 flex items-center justify-center mb-4">
              <AlertCircle className="w-10 h-10 text-gray-400" />
            </div>
            <p className="text-gray-600 mb-2">No error mappings found</p>
            <p className="text-sm text-gray-400">
              {searchQuery
                ? "Try a different search term"
                : "Click 'Add Error Mapping' to create one"}
            </p>
          </div>
        ) : (
          <div className="bg-white rounded-xl border shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b">
                  <tr>
                    <th className="text-left px-6 py-4 text-xs font-semibold text-gray-600 uppercase tracking-wider">
                      Vendor Error Message
                    </th>
                    <th className="text-left px-6 py-4 text-xs font-semibold text-gray-600 uppercase tracking-wider">
                      Display Message
                    </th>
                    <th className="text-center px-6 py-4 text-xs font-semibold text-gray-600 uppercase tracking-wider">
                      Status Code
                    </th>
                    <th className="text-left px-6 py-4 text-xs font-semibold text-gray-600 uppercase tracking-wider">
                      Template Code
                    </th>
                    <th className="text-center px-6 py-4 text-xs font-semibold text-gray-600 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="text-right px-6 py-4 text-xs font-semibold text-gray-600 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {filteredMappings.map((mapping) => (
                    <tr
                      key={mapping.id}
                      className="hover:bg-gray-50 transition-colors"
                    >
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <AlertTriangle className="w-4 h-4 text-amber-500 flex-shrink-0" />
                          <code className="text-sm font-mono text-gray-700 break-all">
                            {mapping.vendor_error_message}
                          </code>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm text-gray-700">
                          {mapping.display_message}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <span
                          className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusCodeColor(mapping.http_status_code)}`}
                        >
                          {mapping.http_status_code}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <code className="px-2 py-1 bg-gray-100 rounded text-xs font-mono text-purple-600">
                          {mapping.template_code}
                        </code>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <button
                          onClick={() => toggleActive(mapping)}
                          className={`inline-flex px-3 py-1 text-xs font-semibold rounded-full border transition-colors ${getStatusBadge(mapping.is_active)}`}
                        >
                          {mapping.is_active ? (
                            <span className="flex items-center gap-1">
                              <Eye className="w-3 h-3" />
                              Active
                            </span>
                          ) : (
                            <span className="flex items-center gap-1">
                              <EyeOff className="w-3 h-3" />
                              Inactive
                            </span>
                          )}
                        </button>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => handleEdit(mapping)}
                            className="p-1.5 text-gray-400 hover:text-blue-600 rounded-lg hover:bg-blue-50 transition-colors"
                            title="Edit"
                          >
                            <Edit className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() =>
                              mapping.id && handleDelete(mapping.id)
                            }
                            className="p-1.5 text-gray-400 hover:text-red-600 rounded-lg hover:bg-red-50 transition-colors"
                            title="Delete"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => {
                              navigator.clipboard.writeText(
                                JSON.stringify(mapping, null, 2),
                              );
                              toast.success("Copied to clipboard");
                            }}
                            className="p-1.5 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100 transition-colors"
                            title="Copy JSON"
                          >
                            <Copy className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* API Documentation Card */}
      <div className="mx-6 mb-6">
        <div className="bg-gradient-to-r from-gray-50 to-white rounded-xl border p-4">
          <div className="flex items-center gap-3 mb-3">
            <FileJson className="w-5 h-5 text-blue-600" />
            <h3 className="font-semibold text-gray-800">API Reference</h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-gray-50 rounded-lg p-3">
              <div className="flex items-center gap-2 mb-2">
                <span className="px-2 py-0.5 bg-blue-100 text-blue-700 rounded text-xs font-mono">
                  POST
                </span>
                <code className="text-sm font-mono text-gray-600">
                  /error-mappings
                </code>
              </div>
              <pre className="text-xs font-mono text-gray-600 bg-white p-2 rounded border overflow-x-auto">
                {`{
  "vendor_error_message": "string",
  "display_message": "string",
  "http_status_code": 400,
  "template_code": "string",
  "is_active": true
}`}
              </pre>
            </div>
            <div className="bg-gray-50 rounded-lg p-3">
              <div className="flex items-center gap-2 mb-2">
                <span className="px-2 py-0.5 bg-green-100 text-green-700 rounded text-xs font-mono">
                  GET
                </span>
                <code className="text-sm font-mono text-gray-600">
                  /error-mappings
                </code>
              </div>
              <p className="text-xs text-gray-500 mt-2">
                Returns list of all error mappings
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
