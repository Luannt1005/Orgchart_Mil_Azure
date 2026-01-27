"use client";

import DataImport from "@/components/DataImport";

export default function ImportPage() {
  return (
    <div className="min-h-screen bg-transparent p-6 font-sans text-slate-800">
      <div className="max-w-4xl mx-auto h-full bg-white rounded-xl shadow-sm border border-gray-100 flex flex-col p-6">

        {/* Header */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Import Center</h1>
          <p className="text-sm text-gray-500">Manage resource imports</p>
        </div>

        {/* Rendering DataImport in Images mode */}
        <div className="flex-1">
          <DataImport mode="images" />
        </div>
      </div>
    </div>
  );
}