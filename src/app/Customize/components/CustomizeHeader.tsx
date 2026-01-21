'use client';

import React from 'react';

interface CustomizeHeaderProps {
    orgList: any[];
    orgId: string;
    setOrgId: (id: string) => void;
    lastSaveTime: string | null;
    hasChanges: boolean;
    loadingChart: boolean;
    onReload: () => void;
    onDelete: () => void;
    onOpenCreateModal: () => void;
    onSave: () => void;
    isSaving: boolean;
}

export default function CustomizeHeader({
    orgList,
    orgId,
    setOrgId,
    lastSaveTime,
    hasChanges,
    loadingChart,
    onReload,
    onDelete,
    onOpenCreateModal,
    onSave,
    isSaving
}: CustomizeHeaderProps) {
    return (
        <header className="z-30 flex h-16 shrink-0 items-center justify-between border-b border-slate-200 bg-white px-6 shadow-sm">
            {/* Left: Title & Profile Selector */}
            <div className="flex items-center gap-6">
                <div className="flex flex-col">
                    <h1 className="text-lg font-bold text-slate-800 leading-tight">Customize Org Chart</h1>
                    <p className="text-[11px] font-medium text-slate-500">Design & Edit Structures</p>
                </div>

                <div className="h-8 w-px bg-slate-200"></div>

                <div className="flex flex-col">
                    <label className="mb-1 text-[10px] font-bold uppercase tracking-wider text-slate-400">Current Profile</label>
                    <select
                        value={orgId}
                        onChange={(e) => setOrgId(e.target.value)}
                        className="h-9 min-w-[240px] rounded-lg border border-slate-200 bg-slate-50 px-3 text-sm font-semibold text-slate-700 outline-none transition-all hover:border-slate-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                    >
                        <option value="">-- Select a Profile --</option>
                        {orgList.map((org) => (
                            <option key={org.orgchart_id} value={org.orgchart_id}>
                                {org.orgchart_name}
                            </option>
                        ))}
                    </select>
                </div>
            </div>

            {/* Right: Actions Toolbar */}
            <div className="flex items-center gap-3">
                {/* Status Indicator */}
                <div className="mr-2 flex flex-col items-end">
                    {lastSaveTime && (
                        <span className="text-[10px] font-semibold text-emerald-600">Saved: {lastSaveTime}</span>
                    )}
                    {hasChanges && (
                        <span className="animate-pulse text-[10px] font-bold text-amber-500">Unsaved Changes</span>
                    )}
                </div>

                {/* Action Buttons */}
                <button
                    onClick={onReload}
                    disabled={loadingChart || !orgId}
                    className="flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600 transition-colors hover:bg-slate-50 hover:text-slate-900 disabled:opacity-50"
                    title="Reload Chart"
                >
                    <svg className={`h-4 w-4 ${loadingChart ? 'animate-spin' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                </button>

                <button
                    onClick={onDelete}
                    disabled={!orgId}
                    className="flex h-9 w-9 items-center justify-center rounded-lg border border-red-100 bg-red-50 text-red-500 transition-colors hover:border-red-200 hover:bg-red-100 disabled:opacity-40"
                    title="Delete Profile"
                >
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                </button>

                <div className="h-8 w-px bg-slate-200 mx-1"></div>

                <button
                    onClick={onOpenCreateModal}
                    className="flex h-9 items-center gap-2 rounded-lg bg-indigo-600 px-4 text-sm font-semibold text-white shadow-sm hover:bg-indigo-700 transition-all active:scale-95"
                >
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                    </svg>
                    New Profile
                </button>

                <button
                    onClick={onSave}
                    disabled={isSaving || !orgId || !hasChanges}
                    className={`flex h-9 items-center gap-2 rounded-lg px-5 text-sm font-semibold text-white shadow-sm transition-all active:scale-95 ${hasChanges && orgId ? "bg-emerald-600 hover:bg-emerald-700 shadow-emerald-200" : "bg-slate-300 cursor-not-allowed"
                        }`}
                >
                    {isSaving ? (
                        <div className="h-3 w-3 animate-spin rounded-full border-2 border-white border-t-transparent"></div>
                    ) : (
                        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" />
                        </svg>
                    )}
                    Save Changes
                </button>
            </div>
        </header>
    );
}
