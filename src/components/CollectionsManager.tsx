"use client";

import { useState, useEffect } from "react";
import { useAppStore } from "@/lib/store";
import {
  Search,
  Plus,
  Download,
  RefreshCw,
  Loader2,
  FolderOpen,
  AlertCircle,
  Grid3x3,
  List,
  Tag,
  Smartphone,
  ChevronRight,
  Calendar,
  ArrowUpDown,
  X,
  CheckCircle2,
  Building2,
  Plane,
  Landmark,
  Eye,
  ArrowLeft,
  CreditCard,
  Hash,
  FileText,
  Zap,
  ShoppingCart,
  Tv,
  GraduationCap,
  Trash,
} from "lucide-react";
import { toast } from "sonner";

// Icon mapping based on collection name
// Icon mapping based on category names
const getCollectionIcon = (name: string) => {
  const lowerName = name.toLowerCase();

  if (lowerName.includes("travel") || lowerName.includes("transport")) {
    return <Plane className="w-5 h-5" />;
  }
  if (lowerName.includes("utilities") || lowerName.includes("post paid")) {
    return <Zap className="w-5 h-5" />;
  }
  if (lowerName.includes("government")) {
    return <Landmark className="w-5 h-5" />;
  }
  if (lowerName.includes("e-commerce") || lowerName.includes("commerce")) {
    return <ShoppingCart className="w-5 h-5" />;
  }
  if (lowerName.includes("entertainment")) {
    return <Tv className="w-5 h-5" />;
  }
  if (lowerName.includes("school") || lowerName.includes("fee")) {
    return <GraduationCap className="w-5 h-5" />;
  }
  if (lowerName.includes("other") || lowerName.includes("payment")) {
    return <CreditCard className="w-5 h-5" />;
  }

  // Default icon
  return <Building2 className="w-5 h-5" />;
};

// Get gradient based on category name
const getCollectionGradient = (name: string) => {
  const lowerName = name.toLowerCase();

  if (lowerName.includes("travel") || lowerName.includes("transport")) {
    return "from-sky-500 to-blue-600";
  }
  if (lowerName.includes("utilities") || lowerName.includes("post paid")) {
    return "from-amber-500 to-orange-600";
  }
  if (lowerName.includes("government")) {
    return "from-emerald-500 to-teal-600";
  }
  if (lowerName.includes("e-commerce") || lowerName.includes("commerce")) {
    return "from-purple-500 to-pink-600";
  }
  if (lowerName.includes("entertainment")) {
    return "from-rose-500 to-red-600";
  }
  if (lowerName.includes("school") || lowerName.includes("fee")) {
    return "from-indigo-500 to-purple-600";
  }
  if (lowerName.includes("other") || lowerName.includes("payment")) {
    return "from-gray-500 to-gray-600";
  }

  return "from-blue-500 to-purple-600";
};

// Get badge color for step type
const getStepBadgeColor = (stepName: string) => {
  const lowerName = stepName?.toLowerCase() || "";
  if (lowerName.includes("token")) return "bg-purple-100 text-purple-700";
  if (lowerName.includes("query")) return "bg-blue-100 text-blue-700";
  if (lowerName.includes("setup")) return "bg-amber-100 text-amber-700";
  if (lowerName.includes("payment")) return "bg-green-100 text-green-700";
  return "bg-gray-100 text-gray-600";
};

// Get method badge color
const getMethodBadgeColor = (method: string) => {
  const upperMethod = method?.toUpperCase() || "";
  if (upperMethod === "GET") return "bg-green-100 text-green-700";
  if (upperMethod === "POST") return "bg-blue-100 text-blue-700";
  if (upperMethod === "PUT") return "bg-amber-100 text-amber-700";
  if (upperMethod === "DELETE") return "bg-red-100 text-red-700";
  return "bg-gray-100 text-gray-600";
};

export function CollectionsManager() {
  const {
    collections,
    setCollections,
    setCollection,
    apiBaseUrl,
    setActiveTab,
    setCurrentTemplateIndex,
  } = useAppStore();

  const [searchQuery, setSearchQuery] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [sortBy, setSortBy] = useState<"name" | "date" | "collections">("date");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");
  const [selectedGroup, setSelectedGroup] = useState<string | null>(null);
  const [selectedGroupData, setSelectedGroupData] = useState<any>(null);
  const [showCollectionsView, setShowCollectionsView] = useState(false);

  const fetchCollections = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(
        `${apiBaseUrl}/cbesuperapp/utility/collections/group/noEnc`,
      );

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      setCollections(data || []);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to fetch collections",
      );
    }

    setIsLoading(false);
  };

  useEffect(() => {
    fetchCollections();
  }, []);

  const handleEditCollection = (collection: any) => {
    setCollection(collection);
    setCurrentTemplateIndex(0);
    setActiveTab("test");
  };

  const handleViewGroupCollections = (group: any) => {
    setSelectedGroupData(group);
    setShowCollectionsView(true);
  };

  const handleBackToGroups = () => {
    setShowCollectionsView(false);
    setSelectedGroupData(null);
  };

  const handleExportCollection = (collection: any) => {
    const json = JSON.stringify(collection, null, 2);
    const blob = new Blob([json], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${collection?.group_code || collection?.template_code || "collection"}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleDelete = async (collection: any) => {
    if (!confirm("Are you sure you want to delete this collection?")) return;

    try {
      const response = await fetch(
        `${apiBaseUrl}/cbesuperapp/utility/collections/delete/${collection.id}`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Cookie:
              "c68abbf6e7b79451c37ff174bb734d90=3193314271c7f54c666bb299e3299b35",
          },
        },
      );
      if (!response.ok) throw new Error("Failed to delete");

      toast.success("Collection deleted Successfully");
      fetchCollections();
    } catch (error) {
      toast.error("Failed to delete collection");
      console.error(error);
    }
  };

  const handleCreateNew = () => {
    setCollection(null);
    setCurrentTemplateIndex(0);
    setActiveTab("mapper");
  };

  // Get unique groups for filtering
  const uniqueGroups = [...new Set(collections.map((c) => c.group_name))];

  // Sort and filter collections
  const filteredCollections = collections
    .filter((c) => {
      const matchesSearch =
        c.group_code?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        c.group_name?.toLowerCase().includes(searchQuery.toLowerCase());

      const matchesGroup = selectedGroup
        ? c.group_name === selectedGroup
        : true;

      return matchesSearch && matchesGroup;
    })
    .sort((a, b) => {
      if (sortBy === "name") {
        return sortOrder === "asc"
          ? (a.group_name || "").localeCompare(b.group_name || "")
          : (b.group_name || "").localeCompare(a.group_name || "");
      } else if (sortBy === "collections") {
        return sortOrder === "asc"
          ? (a.collections?.length || 0) - (b.collections?.length || 0)
          : (b.collections?.length || 0) - (a.collections?.length || 0);
      } else {
        const dateA = new Date(a.created_at || 0).getTime();
        const dateB = new Date(b.created_at || 0).getTime();
        return sortOrder === "asc" ? dateA - dateB : dateB - dateA;
      }
    });

  const stats = {
    total: filteredCollections.length,
    totalCollections: filteredCollections.reduce(
      (sum, c) => sum + (c.collections?.length || 0),
      0,
    ),
    ussdEnabled: filteredCollections.filter((c) => c.ussd_enabled).length,
  };

  // Render Collections View (inside a group)
  if (showCollectionsView && selectedGroupData) {
    const collectionsList = selectedGroupData.collections || [];

    return (
      <div className="h-full flex flex-col bg-gradient-to-br from-gray-50 to-gray-100">
        {/* Back Header */}
        <div className="bg-white border-b px-6 py-4 sticky top-0 z-10 shadow-sm">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button
                onClick={handleBackToGroups}
                className="flex items-center gap-2 px-3 py-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <ArrowLeft className="w-4 h-4" />
                <span className="text-sm font-medium">Back to Groups</span>
              </button>
              <div className="h-6 w-px bg-gray-200" />
              <div className="flex items-center gap-3">
                <div
                  className={`w-12 h-12 rounded-xl bg-gradient-to-r ${getCollectionGradient(selectedGroupData.group_name || "")} flex items-center justify-center text-white shadow-lg`}
                >
                  {selectedGroupData.logo ? (
                    <img
                      src={selectedGroupData.logo}
                      alt=""
                      className="w-8 h-8 rounded object-cover"
                    />
                  ) : (
                    getCollectionIcon(selectedGroupData.group_name || "")
                  )}
                </div>
                <div>
                  <h1 className="text-xl font-bold text-gray-800">
                    {selectedGroupData.group_name || "Unnamed Group"}
                  </h1>
                  <div className="flex items-center gap-3 text-sm text-gray-500">
                    <span className="font-mono">
                      {selectedGroupData.group_code}
                    </span>
                    <span>•</span>
                    <span>{collectionsList.length} Collections</span>
                    {selectedGroupData.created_at && (
                      <>
                        <span>•</span>
                        <div className="flex items-center gap-1">
                          <Calendar className="w-3.5 h-3.5" />
                          <span>
                            Created{" "}
                            {new Date(
                              selectedGroupData.created_at,
                            ).toLocaleDateString()}
                          </span>
                        </div>
                      </>
                    )}
                  </div>
                </div>
              </div>
            </div>
            <button
              onClick={() => handleExportCollection(selectedGroupData)}
              className="flex items-center gap-2 px-3 py-2 text-sm text-gray-600 hover:text-gray-900 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
            >
              <Download className="w-4 h-4" />
              Export Group
            </button>
          </div>
        </div>

        {/* Collections Grid */}
        <div className="flex-1 overflow-auto p-6">
          {collectionsList.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-96 text-center">
              <div className="w-20 h-20 rounded-full bg-gray-100 flex items-center justify-center mb-4">
                <FolderOpen className="w-10 h-10 text-gray-400" />
              </div>
              <p className="text-gray-600 mb-2">No collections in this group</p>
              <p className="text-sm text-gray-400">
                This group doesnt have any collections yet
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {collectionsList.map((collection: any, index: number) => {
                // Find the first template to get step info
                const firstTemplate = collection.template?.[0];
                const stepCount = collection.template?.length || 0;
                const steps = collection.template || [];

                return (
                  <div
                    key={collection.id || collection.template_code || index}
                    className="group bg-white rounded-2xl border border-gray-200 overflow-hidden hover:shadow-xl hover:border-transparent transition-all duration-300 cursor-pointer"
                    onClick={() => handleEditCollection(collection)}
                  >
                    {/* Collection Header */}
                    <div className="relative bg-gradient-to-r from-gray-50 to-gray-100 px-5 py-4 border-b">
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-3 flex-1">
                          {collection.logo ? (
                            <img
                              src={collection.logo}
                              alt={collection.name}
                              className="w-12 h-12 rounded-xl object-cover border border-gray-200"
                            />
                          ) : (
                            <div className="w-12 h-12 rounded-xl bg-gradient-to-r from-blue-500 to-purple-600 flex items-center justify-center text-white text-lg font-bold shadow-md">
                              {collection.name?.charAt(0) || "C"}
                            </div>
                          )}
                          <div className="flex-1">
                            <h3 className="font-bold text-gray-800 text-lg leading-tight">
                              {collection.name ||
                                collection.template_code ||
                                "Unnamed"}
                            </h3>
                            <p className="text-xs text-gray-500 font-mono mt-0.5">
                              {collection.template_code}
                            </p>
                          </div>
                        </div>
                        {collection.ussd_enabled && (
                          <div className="flex items-center gap-1 px-2 py-1 bg-green-50 rounded-full">
                            <Smartphone className="w-3 h-3 text-green-600" />
                            <span className="text-xs text-green-600 font-medium">
                              USSD
                            </span>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Collection Content */}
                    <div className="p-5">
                      {/* Steps Overview */}
                      <div className="mb-4">
                        <div className="flex items-center gap-2 mb-2">
                          <div className="w-6 h-6 rounded-full bg-blue-100 flex items-center justify-center">
                            <Hash className="w-3.5 h-3.5 text-blue-600" />
                          </div>
                          <span className="text-xs font-medium text-gray-700">
                            Workflow Steps
                          </span>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          {steps.map((step: any, idx: number) => (
                            <span
                              key={idx}
                              className={`px-2.5 py-1 text-xs font-medium rounded-full ${getStepBadgeColor(step.current_step || step.name)}`}
                            >
                              {step.current_step ||
                                step.name ||
                                `Step ${idx + 1}`}
                            </span>
                          ))}
                          <span className="px-2.5 py-1 text-xs font-medium rounded-full bg-gray-100 text-gray-600">
                            +{stepCount} steps
                          </span>
                        </div>
                      </div>

                      {/* Stats Row */}
                      <div className="grid grid-cols-2 gap-3 pt-3 border-t">
                        <div className="flex items-center gap-2">
                          <div className="w-7 h-7 rounded-lg bg-blue-50 flex items-center justify-center">
                            <FileText className="w-3.5 h-3.5 text-blue-600" />
                          </div>
                          <div>
                            <div className="text-xs text-gray-500">Mappers</div>
                            <div className="text-sm font-semibold text-gray-800">
                              {steps.reduce((count: any, step: any) => {
                                if (
                                  step.request_mapper &&
                                  Object.keys(step.request_mapper).length > 0
                                )
                                  count++;
                                if (
                                  step.response_mapper &&
                                  Object.keys(step.response_mapper).length > 0
                                )
                                  count++;
                                return count;
                              }, 0)}{" "}
                              total
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="w-7 h-7 rounded-lg bg-purple-50 flex items-center justify-center">
                            <Tag className="w-3.5 h-3.5 text-purple-600" />
                          </div>
                          <div>
                            <div className="text-xs text-gray-500">
                              Overrides
                            </div>
                            <div className="text-sm font-semibold text-gray-800">
                              {steps.reduce((count: any, step: any) => {
                                return (
                                  count +
                                  (step.to_be_overridden
                                    ?.overridden_request_body?.length || 0)
                                );
                              }, 0)}{" "}
                              fields
                            </div>
                          </div>
                        </div>
                      </div>

                      {collection.created_at && (
                        <div className="flex items-center gap-1.5 text-xs text-gray-400 mt-4 pt-3 border-t">
                          <Calendar className="w-3 h-3" />
                          <span>
                            Created{" "}
                            {new Date(
                              collection.created_at,
                            ).toLocaleDateString()}
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Collection Actions */}
                    <div className="border-t px-5 py-3 bg-gray-50 flex items-center justify-between opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleExportCollection(collection);
                        }}
                        className="flex items-center gap-1.5 px-2 py-1 text-xs text-gray-600 hover:text-blue-600 transition-colors"
                      >
                        <Download className="w-3.5 h-3.5" />
                        Export
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDelete(collection);
                        }}
                        className="flex items-center gap-1.5 px-2 py-1 text-xs text-gray-600 hover:text-blue-600 transition-colors"
                      >
                        <Trash className="w-3.5 h-3.5" />
                        Delete
                      </button>
                      <div className="flex items-center gap-1 text-xs text-gray-400">
                        <Eye className="w-3.5 h-3.5" />
                        <span>Click to Test</span>
                        <ChevronRight className="w-3.5 h-3.5" />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    );
  }

  // Render Groups View
  return (
    <div className="h-full flex flex-col bg-gradient-to-br from-gray-50 to-gray-100">
      {/* Stats Bar */}
      {!isLoading && filteredCollections.length > 0 && (
        <div className="bg-white border-b px-6 py-4 shadow-sm">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-blue-100 flex items-center justify-center">
                  <FolderOpen className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                  <div className="text-2xl font-bold text-gray-800">
                    {stats.total}
                  </div>
                  <div className="text-xs text-gray-500">Service Groups</div>
                </div>
              </div>
              <div className="w-px h-10 bg-gray-200" />
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-purple-100 flex items-center justify-center">
                  <Tag className="w-5 h-5 text-purple-600" />
                </div>
                <div>
                  <div className="text-2xl font-bold text-gray-800">
                    {stats.totalCollections}
                  </div>
                  <div className="text-xs text-gray-500">Total Collections</div>
                </div>
              </div>
              {stats.ussdEnabled > 0 && (
                <>
                  <div className="w-px h-10 bg-gray-200" />
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-green-100 flex items-center justify-center">
                      <Smartphone className="w-5 h-5 text-green-600" />
                    </div>
                    <div>
                      <div className="text-2xl font-bold text-gray-800">
                        {stats.ussdEnabled}
                      </div>
                      <div className="text-xs text-gray-500">USSD Enabled</div>
                    </div>
                  </div>
                </>
              )}
            </div>
            <button
              onClick={handleCreateNew}
              className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-xl hover:from-blue-700 hover:to-blue-800 transition-all duration-200 shadow-sm font-medium"
            >
              <Plus className="w-4 h-4" />
              <span className="text-sm">New Collection Group</span>
            </button>
          </div>
        </div>
      )}

      {/* Search and Filters */}
      <div className="bg-white border-b px-6 py-4 sticky top-0 z-10 shadow-sm">
        <div className="flex items-center gap-4 flex-wrap">
          <div className="flex-1 min-w-[240px]">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search by group name or code..."
                className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-gray-50 text-sm"
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

          {/* Group Filter */}
          <select
            value={selectedGroup || ""}
            onChange={(e) => setSelectedGroup(e.target.value || null)}
            className="px-3 py-2.5 border border-gray-200 rounded-xl bg-gray-50 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
          >
            <option value="">All Groups</option>
            {uniqueGroups.map((group) => (
              <option key={group} value={group}>
                {group}
              </option>
            ))}
          </select>

          {/* Sort Controls */}
          <div className="flex items-center gap-1 bg-gray-50 rounded-xl p-1 border border-gray-200">
            <button
              onClick={() => setSortBy("name")}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                sortBy === "name"
                  ? "bg-white text-blue-600 shadow-sm"
                  : "text-gray-600 hover:text-gray-800"
              }`}
            >
              Name
            </button>
            <button
              onClick={() => setSortBy("collections")}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                sortBy === "collections"
                  ? "bg-white text-blue-600 shadow-sm"
                  : "text-gray-600 hover:text-gray-800"
              }`}
            >
              Collections
            </button>
            <button
              onClick={() => setSortBy("date")}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                sortBy === "date"
                  ? "bg-white text-blue-600 shadow-sm"
                  : "text-gray-600 hover:text-gray-800"
              }`}
            >
              Date
            </button>
            <button
              onClick={() => setSortOrder(sortOrder === "asc" ? "desc" : "asc")}
              className="px-2 py-1.5 rounded-lg text-gray-600 hover:bg-white hover:text-blue-600 transition-all"
            >
              <ArrowUpDown className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* View Toggle */}
          <div className="flex items-center gap-1 bg-gray-50 rounded-xl p-1 border border-gray-200">
            <button
              onClick={() => setViewMode("grid")}
              className={`p-1.5 rounded-lg transition-all ${
                viewMode === "grid"
                  ? "bg-white text-blue-600 shadow-sm"
                  : "text-gray-500 hover:text-gray-700"
              }`}
            >
              <Grid3x3 className="w-4 h-4" />
            </button>
            <button
              onClick={() => setViewMode("list")}
              className={`p-1.5 rounded-lg transition-all ${
                viewMode === "list"
                  ? "bg-white text-blue-600 shadow-sm"
                  : "text-gray-500 hover:text-gray-700"
              }`}
            >
              <List className="w-4 h-4" />
            </button>
          </div>

          <button
            onClick={fetchCollections}
            disabled={isLoading}
            className="flex items-center gap-1.5 px-3 py-2.5 text-sm text-gray-600 hover:text-gray-800 bg-gray-50 rounded-xl hover:bg-gray-100 transition-colors border border-gray-200"
          >
            <RefreshCw
              className={`w-4 h-4 ${isLoading ? "animate-spin" : ""}`}
            />
            Refresh
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto p-6">
        {isLoading && collections.length === 0 ? (
          <div className="flex items-center justify-center h-96">
            <div className="text-center">
              <Loader2 className="w-12 h-12 text-blue-600 animate-spin mx-auto mb-4" />
              <p className="text-gray-500">Loading collections...</p>
            </div>
          </div>
        ) : error ? (
          <div className="flex flex-col items-center justify-center h-96 text-center">
            <div className="w-20 h-20 rounded-full bg-red-100 flex items-center justify-center mb-4">
              <AlertCircle className="w-10 h-10 text-red-500" />
            </div>
            <p className="text-gray-600 mb-2">Failed to load collections</p>
            <p className="text-sm text-gray-400 mb-4 max-w-md">{error}</p>
            <button
              onClick={fetchCollections}
              className="px-4 py-2 text-sm text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors"
            >
              Try Again
            </button>
          </div>
        ) : filteredCollections.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-96 text-center">
            <div className="w-20 h-20 rounded-full bg-gray-100 flex items-center justify-center mb-4">
              <FolderOpen className="w-10 h-10 text-gray-400" />
            </div>
            <p className="text-gray-600 mb-2">
              {searchQuery
                ? "No groups match your search"
                : "No collection groups yet"}
            </p>
            <p className="text-sm text-gray-400 mb-4 max-w-md">
              {searchQuery
                ? "Try adjusting your search or filter criteria"
                : "Create a new collection group to get started"}
            </p>
            {!searchQuery && !selectedGroup && (
              <button
                onClick={handleCreateNew}
                className="px-4 py-2 text-sm text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors"
              >
                Create New Group
              </button>
            )}
          </div>
        ) : viewMode === "grid" ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
            {filteredCollections.map((group) => (
              <div
                key={group.id || group.group_code}
                className="group bg-white rounded-2xl border border-gray-200 overflow-hidden hover:shadow-xl hover:border-transparent transition-all duration-300 cursor-pointer"
                onClick={() => handleViewGroupCollections(group)}
              >
                {/* Card Header with Gradient */}
                <div
                  className={`bg-gradient-to-r ${getCollectionGradient(group.group_name || "")} p-5 text-white relative`}
                >
                  <div className="absolute top-3 right-3 opacity-20 group-hover:opacity-100 transition-opacity">
                    {getCollectionIcon(group.group_name || "")}
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="w-14 h-14 rounded-xl bg-white/20 backdrop-blur-sm flex items-center justify-center">
                      {group.logo ? (
                        <img
                          src={group.logo}
                          alt={group.group_name}
                          className="w-10 h-10 rounded-lg object-cover"
                        />
                      ) : (
                        getCollectionIcon(group.group_name || "")
                      )}
                    </div>
                    <div className="flex-1">
                      <h3 className="font-bold text-lg truncate">
                        {group.group_name || "Unnamed"}
                      </h3>
                      <p className="text-xs text-white/80 font-mono truncate mt-0.5">
                        {group.group_code}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Card Content */}
                <div className="p-5">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center">
                        <Tag className="w-4 h-4 text-blue-600" />
                      </div>
                      <div>
                        <div className="text-xs text-gray-500">Collections</div>
                        <div className="text-lg font-bold text-gray-800">
                          {group.collections?.length || 0}
                        </div>
                      </div>
                    </div>
                    {group.ussd_enabled && (
                      <div className="flex items-center gap-1 px-2.5 py-1.5 bg-green-50 rounded-full">
                        <Smartphone className="w-3.5 h-3.5 text-green-600" />
                        <span className="text-xs text-green-600 font-medium">
                          USSD
                        </span>
                      </div>
                    )}
                  </div>

                  {group.created_at && (
                    <div className="flex items-center gap-1.5 text-xs text-gray-400 border-t pt-4">
                      <Calendar className="w-3.5 h-3.5" />
                      <span>
                        Created{" "}
                        {new Date(group.created_at).toLocaleDateString()}
                      </span>
                    </div>
                  )}
                </div>

                {/* Card Actions */}
                <div className="border-t px-5 py-3 bg-gray-50 flex items-center justify-between opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleExportCollection(group);
                    }}
                    className="flex items-center gap-1.5 px-2 py-1 text-xs text-gray-600 hover:text-blue-600 transition-colors"
                  >
                    <Download className="w-3.5 h-3.5" />
                    Export
                  </button>
                  <div className="flex items-center gap-1 text-xs text-gray-400">
                    <Eye className="w-3.5 h-3.5" />
                    <span>
                      View {group.collections?.length || 0} collections
                    </span>
                    <ChevronRight className="w-3.5 h-3.5" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b">
                  <tr>
                    <th className="text-left px-6 py-4 text-xs font-semibold text-gray-600 uppercase tracking-wider">
                      Group
                    </th>
                    <th className="text-left px-6 py-4 text-xs font-semibold text-gray-600 uppercase tracking-wider">
                      Code
                    </th>
                    <th className="text-center px-6 py-4 text-xs font-semibold text-gray-600 uppercase tracking-wider">
                      Collections
                    </th>
                    <th className="text-left px-6 py-4 text-xs font-semibold text-gray-600 uppercase tracking-wider">
                      Created
                    </th>
                    <th className="text-right px-6 py-4 text-xs font-semibold text-gray-600 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {filteredCollections.map((group) => (
                    <tr
                      key={group.id || group.group_code}
                      className="hover:bg-gray-50 transition-colors cursor-pointer group"
                      onClick={() => handleViewGroupCollections(group)}
                    >
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div
                            className={`w-10 h-10 rounded-xl bg-gradient-to-r ${getCollectionGradient(group.group_name || "")} flex items-center justify-center text-white shadow-sm`}
                          >
                            {group.logo ? (
                              <img
                                src={group.logo}
                                alt=""
                                className="w-6 h-6 rounded object-cover"
                              />
                            ) : (
                              getCollectionIcon(group.group_name || "")
                            )}
                          </div>
                          <div>
                            <div className="font-semibold text-gray-800">
                              {group.group_name || "Unnamed"}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <code className="px-2 py-1 bg-gray-100 rounded text-xs font-mono text-gray-600">
                          {group.group_code}
                        </code>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-blue-50 text-blue-600 font-semibold text-sm">
                          {group.collections?.length || 0}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-1.5 text-xs text-gray-500">
                          <Calendar className="w-3.5 h-3.5" />
                          {group.created_at
                            ? new Date(group.created_at).toLocaleDateString()
                            : "—"}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleExportCollection(group);
                            }}
                            className="p-1.5 text-gray-400 hover:text-blue-600 rounded-lg hover:bg-blue-50 transition-colors opacity-0 group-hover:opacity-100"
                            title="Export"
                          >
                            <Download className="w-4 h-4" />
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleViewGroupCollections(group);
                            }}
                            className="p-1.5 text-gray-400 hover:text-green-600 rounded-lg hover:bg-green-50 transition-colors opacity-0 group-hover:opacity-100"
                            title="View Collections"
                          >
                            <Eye className="w-4 h-4" />
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
    </div>
  );
}
