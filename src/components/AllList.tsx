import { useAppStore } from "@/lib/store";
import { 
  Calendar, 
  Download, 
  Eye, 
  SwitchCamera, 
  Search, 
  RefreshCw, 
  Package, 
  ChevronRight,
  Layers,
  Clock,
  Users,
  TrendingUp,
  AlertCircle,
  Loader2
} from "lucide-react";
import React, { useEffect, useState, useMemo } from "react";
import ShowGroupModal from "./ShowGroupModal";
import { toast } from "sonner";

const AllList = () => {
  const { apiBaseUrl } = useAppStore();
  const [templateCodes, setTemplateCodes] = useState<any[]>([]);
  const [showGroupModal, setShowGroupModal] = useState(false);
  const [collectionCodes, setCollectionCodes] = useState("");
  const [groupName, setGroupName] = useState("");
  const [groupCode, setGroupCode] = useState("");
  const [isSubmittingGroup, setIsSubmittingGroup] = useState(false);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedGroup, setSelectedGroup] = useState<any>(null);

  const fetchTemplateCodes = async () => {
    setLoading(true);
    try {
      const response = await fetch(
        `${apiBaseUrl}/cbesuperapp/utility/collections/noEnc`,
      );
      if (!response.ok) throw new Error("Failed to fetch template");
      const data = await response.json();
      setTemplateCodes(data === null ? [] : data);
    } catch (error) {
      console.error("Failed to fetch template codes", error);
      toast.error("Failed to load collections");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTemplateCodes();
  }, []);

  const handleSwitchAccount = (collection: any) => {
    setSelectedGroup(collection);
    setCollectionCodes(collection.template_code);
    setShowGroupModal(true);
  };

  const handleSubmitGroup = async () => {
    if (!groupName.trim() || !groupCode.trim()) {
      toast.error("Please fill in all fields");
      return;
    }

    setIsSubmittingGroup(true);

    const groupData = {
      group_name: groupName,
      group_code: groupCode,
      collection_codes: [collectionCodes],
    };

    try {
      const response = await fetch(
        `${apiBaseUrl}/cbesuperapp/utility/collections/group`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(groupData),
        },
      );

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      console.log("Group created:", result);
      toast.success("Collection and Group created successfully!");
      setShowGroupModal(false);
      setGroupName("");
      setGroupCode("");
      setCollectionCodes("");
      setSelectedGroup(null);
      fetchTemplateCodes();
    } catch (error) {
      console.error("Error creating group:", error);
      toast.error(
        `Failed to create group: ${error instanceof Error ? error.message : "Unknown error"}`,
      );
    } finally {
      setIsSubmittingGroup(false);
    }
  };

  // Filter template codes based on search
  const filteredCodes = useMemo(() => {
    if (!searchTerm.trim()) return templateCodes;
    const term = searchTerm.toLowerCase().trim();
    return templateCodes.filter(
      (group) =>
        group.name?.toLowerCase().includes(term) ||
        group.template_code?.toLowerCase().includes(term) ||
        group.description?.toLowerCase().includes(term)
    );
  }, [templateCodes, searchTerm]);

  // Get status color based on template steps
  const getStepStatus = (steps: any[]) => {
    if (!steps || steps.length === 0) {
      return { color: "bg-gray-100 text-gray-500", label: "Empty" };
    }
    const completedSteps = steps.filter((s) => s.url).length;
    if (completedSteps === steps.length) {
      return { color: "bg-green-100 text-green-700", label: "Complete" };
    }
    if (completedSteps > 0) {
      return { color: "bg-yellow-100 text-yellow-700", label: "Partial" };
    }
    return { color: "bg-gray-100 text-gray-500", label: "Pending" };
  };

  // Render loading state
  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-16">
        <Loader2 className="w-10 h-10 text-purple-500 animate-spin mb-4" />
        <p className="text-gray-500 text-sm">Loading collections...</p>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col bg-gradient-to-br from-gray-50 to-gray-100 overflow-y-auto px-6 py-6">
      {/* Header with stats and search */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
            <Package className="w-5 h-5 text-purple-500" />
            Collections
            <span className="ml-2 text-sm font-normal text-gray-400">
              ({templateCodes.length} total)
            </span>
          </h2>
          <p className="text-sm text-gray-500 mt-0.5">
            Manage and organize your workflow collections
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="relative">
            <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search collections..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9 pr-4 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent w-48 sm:w-56 transition-all"
            />
          </div>
          <button
            onClick={fetchTemplateCodes}
            className="p-2 text-gray-500 hover:text-purple-600 hover:bg-purple-50 rounded-lg transition-colors"
            title="Refresh"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm">
        {filteredCodes.length === 0 ? (
          // Empty state
          <div className="flex flex-col items-center justify-center py-16 px-4">
            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
              <Package className="w-8 h-8 text-gray-400" />
            </div>
            <h3 className="text-lg font-semibold text-gray-700 mb-1">
              {searchTerm ? "No matching collections" : "No collections yet"}
            </h3>
            <p className="text-sm text-gray-400 text-center max-w-md">
              {searchTerm 
                ? `No collections found matching "${searchTerm}"`
                : "Create your first collection by setting up a workflow in the Request/Response Mapper"}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-gradient-to-r from-gray-50 to-gray-100 border-b border-gray-200">
                  <th className="text-left px-6 py-4 text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    <div className="flex items-center gap-2">
                      <Package className="w-3.5 h-3.5" />
                      Collection
                    </div>
                  </th>
                  <th className="text-left px-6 py-4 text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    <div className="flex items-center gap-2">
                      <Code className="w-3.5 h-3.5" />
                      Code
                    </div>
                  </th>
                  <th className="text-center px-6 py-4 text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    <div className="flex items-center justify-center gap-2">
                      <Layers className="w-3.5 h-3.5" />
                      Steps
                    </div>
                  </th>
                  <th className="text-center px-6 py-4 text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    <div className="flex items-center justify-center gap-2">
                      <TrendingUp className="w-3.5 h-3.5" />
                      Status
                    </div>
                  </th>
                  <th className="text-left px-6 py-4 text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    <div className="flex items-center gap-2">
                      <Calendar className="w-3.5 h-3.5" />
                      Created
                    </div>
                  </th>
                  <th className="text-right px-6 py-4 text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredCodes.map((group, index) => {
                  const stepStatus = getStepStatus(group.template);
                  const stepCount = group.template?.length || 0;
                  
                  return (
                    <tr
                      key={group?.id || index}
                      className="hover:bg-purple-50/50 transition-colors group cursor-pointer"
                      onClick={() => handleSwitchAccount(group)}
                    >
                      {/* Collection Name */}
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-purple-100 to-purple-200 flex items-center justify-center flex-shrink-0">
                            <span className="text-purple-600 font-semibold text-sm">
                              {group.name?.[0]?.toUpperCase() || "C"}
                            </span>
                          </div>
                          <div>
                            <div className="font-semibold text-gray-800">
                              {group.name || "Unnamed Collection"}
                            </div>
                            {group.description && (
                              <div className="text-xs text-gray-400 truncate max-w-[200px]">
                                {group.description}
                              </div>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* Template Code */}
                      <td className="px-6 py-4">
                        <code className="px-2.5 py-1 bg-gray-100 rounded-lg text-xs font-mono text-gray-700 border border-gray-200">
                          {group.template_code || "—"}
                        </code>
                      </td>

                      {/* Steps Count */}
                      <td className="px-6 py-4 text-center">
                        <div className="inline-flex items-center gap-1.5">
                          <span className="font-semibold text-gray-700 text-sm">
                            {stepCount}
                          </span>
                          <span className="text-xs text-gray-400">
                            {stepCount === 1 ? "step" : "steps"}
                          </span>
                        </div>
                      </td>

                      {/* Status */}
                      <td className="px-6 py-4 text-center">
                        <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium ${stepStatus.color}`}>
                          <div className={`w-1.5 h-1.5 rounded-full ${
                            stepStatus.label === "Complete" ? "bg-green-500" :
                            stepStatus.label === "Partial" ? "bg-yellow-500" :
                            "bg-gray-400"
                          }`} />
                          {stepStatus.label}
                        </span>
                      </td>

                      {/* Created Date */}
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-1.5 text-xs text-gray-500">
                          <Calendar className="w-3.5 h-3.5 text-gray-400" />
                          {group.created_at
                            ? new Date(group.created_at).toLocaleDateString("en-US", {
                                year: "numeric",
                                month: "short",
                                day: "numeric",
                              })
                            : "—"}
                        </div>
                      </td>

                      {/* Actions */}
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleSwitchAccount(group);
                            }}
                            className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-purple-600 hover:text-purple-700 hover:bg-purple-100 rounded-lg transition-all duration-200"
                          >
                            <SwitchCamera className="w-3.5 h-3.5" />
                            <span className="hidden sm:inline">Switch</span>
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              // View details action
                              toast.info(`Viewing ${group.name || "collection"}`);
                            }}
                            className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-all duration-200"
                          >
                            <ChevronRight className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Show Group Modal */}
      {showGroupModal && (
        <ShowGroupModal
          setShowGroupModal={setShowGroupModal}
          groupName={groupName}
          setGroupName={setGroupName}
          groupCode={groupCode}
          setGroupCode={setGroupCode}
          isSubmittingGroup={isSubmittingGroup}
          handleSubmitGroup={handleSubmitGroup}
        />
      )}
    </div>
  );
};

// Helper component for Code icon (since it might not be imported)
const Code = ({ className }: { className?: string }) => (
  <svg 
    className={className} 
    viewBox="0 0 24 24" 
    fill="none" 
    stroke="currentColor" 
    strokeWidth="2" 
    strokeLinecap="round" 
    strokeLinejoin="round"
  >
    <polyline points="16 18 22 12 16 6" />
    <polyline points="8 6 2 12 8 18" />
  </svg>
);

export default AllList;