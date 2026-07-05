"use client";

import { useAppStore } from "@/lib/store";
import { TestConsole } from "@/components/TestConsole";
import { CollectionsManager } from "@/components/CollectionsManager";
import { RequestResponseMapper } from "@/components/RequestResponseMapper";
import { Play, FolderOpen, Settings, Zap, Map, CheckCircle } from "lucide-react";
// import { useEffect } from "react";
import Image from "next/image";
import logo from "@public/Logo (1).png";
import DocumentationTab from "@/components/DocumentationTab";
import ErrorHandling from "@/components/ErrorHandling";
import AllList from "@/components/AllList";
export default function Home() {
  const {
    activeTab,
    setActiveTab,
    collection,
    apiBaseUrl,
    setApiBaseUrl,
    // clearAllStorage,
  } = useAppStore();

  const tabs = [
    { id: "mapper", label: "cURL Mapper", icon: Map },
    { id: "collections", label: "Collections", icon: FolderOpen },
    { id: "all_list", label: "All List", icon: FolderOpen },
    { id: "test", label: "Test Console", icon: Play },
    { id: "Error", label: "Error Handling", icon: FolderOpen },
    { id: "Documentation", label: "Documentation", icon: FolderOpen },
  ] as const;

  // useEffect(() => {
  //   const navEntries = performance.getEntriesByType(
  //     "navigation",
  //   ) as PerformanceNavigationTiming[];

  //   if (navEntries.length > 0 && navEntries[0].type === "reload") {
  //     clearAllStorage();
  //   }
  // }, []);
  return (
    <div className="h-screen flex flex-col bg-gray-100">
      <header className="bg-gradient-to-l to-[#A8222E] from-[#360000] h-32 rounded-b-xl ">
        <div className="px-4 py-2 flex items-center justify-between">
          <div className="h-12 ">
            <Image
              src={logo}
              alt="logo"
              width={1000}
              height={1000}
              className="h-full w-auto object-contain"
            />
          </div>
          <div className="flex items-center gap-4">
            {collection && (
              <div className="text-sm">
                <span className="text-gray-300">Testing: </span>
                <span className="font-medium text-white">
                  {collection.name ||
                    collection.template_code ||
                    "New Collection"}
                </span>
              </div>
            )}

            <div className="flex items-center gap-2 px-3 py-1.5 bg-gray-100 rounded-lg">
              <Settings className="w-4 h-4 text-gray-500" />
              <input
                type="text"
                value={apiBaseUrl}
                onChange={(e) => setApiBaseUrl(e.target.value)}
                className="bg-transparent text-sm font-mono w-48 focus:outline-none"
                placeholder="API Base URL"
              />
            </div>
          </div>
        </div>
        <div className="border-white border-b border-dashed" />
        <div className="px-4 py-2">
          <h1 className="text-lg font-semibold text-white">
            👋 Welcome to ELST Utility Parser
          </h1>
          <p className="text-xs text-gray-200">
            Easily manage and monitor all Products, oversee and track overall
            activities seamlessly.
          </p>
        </div>
      </header>

      {/* Navigation tabs */}
      <nav className="bg-white border-b px-6">
        <div className="flex">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-5 py-3 text-sm font-medium border-b-2 transition-colors ${
                activeTab === tab.id
                  ? "border-blue-600 text-blue-600"
                  : "border-transparent text-gray-500 hover:text-gray-700"
              }`}
            >
              <tab.icon className="w-4 h-4" />
              {tab.label}
            </button>
          ))}
        </div>
      </nav>

      {/* Main content */}
      <main className="flex-1 overflow-hidden">
        {activeTab === "mapper" && <RequestResponseMapper />}
        {activeTab === "test" && <TestConsole />}
        {activeTab === "collections" && <CollectionsManager />}
        {activeTab === "all_list" && <AllList />}
        {activeTab === "Error" && <ErrorHandling />}
        {activeTab === "Documentation" && <DocumentationTab />}
      </main>
    </div>
  );
}
