'use client';

import React, { useState, useEffect } from 'react';
import {
    XMarkIcon,
    CheckCircleIcon,
    XCircleIcon,
    TrashIcon,
    PencilSquareIcon,
    ClockIcon,
    ShieldCheckIcon
} from '@heroicons/react/24/outline';

export interface PendingRow {
    id: string;
    "Emp ID": string;
    "FullName "?: string;
    lineManagerStatus: string;
    pendingLineManager?: string;
    "Line Manager"?: string;
    // Add other fields as needed for display
    [key: string]: any;
}

interface ReviewChangesModalProps {
    isOpen: boolean;
    onClose: () => void;
    pendingRows: PendingRow[];
    onApprove: (rowId: string) => Promise<void>;
    onReject: (rowId: string) => Promise<void>;
    onApproveAll: () => Promise<void>;
    onRejectAll: () => Promise<void>;
    onApproveSelected?: (ids: string[]) => Promise<void>;
    onRejectSelected?: (ids: string[]) => Promise<void>;
    loading?: boolean;
}

export default function ReviewChangesModal({
    isOpen,
    onClose,
    pendingRows,
    onApprove,
    onReject,
    onApproveAll,
    onRejectAll,
    onApproveSelected,
    onRejectSelected,
    loading = false
}: ReviewChangesModalProps) {
    const [processingId, setProcessingId] = useState<string | null>(null);
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
    const [isBatchProcessing, setIsBatchProcessing] = useState(false);

    // Reset selection when modal opens or rows change
    useEffect(() => {
        if (isOpen) {
            setSelectedIds(new Set());
        }
    }, [isOpen, pendingRows]);

    const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.checked) {
            setSelectedIds(new Set(pendingRows.map(row => row.id)));
        } else {
            setSelectedIds(new Set());
        }
    };

    const handleSelectRow = (id: string) => {
        const newSelected = new Set(selectedIds);
        if (newSelected.has(id)) {
            newSelected.delete(id);
        } else {
            newSelected.add(id);
        }
        setSelectedIds(newSelected);
    };

    const handleProcessSelected = async (action: 'approve' | 'reject') => {
        if (selectedIds.size === 0) return;
        setIsBatchProcessing(true);

        try {
            const ids = Array.from(selectedIds);
            if (action === 'approve' && onApproveSelected) {
                await onApproveSelected(ids);
            } else if (action === 'reject' && onRejectSelected) {
                await onRejectSelected(ids);
            } else {
                // Fallback to sequential logic if batch handlers not provided
                for (const id of selectedIds) {
                    setProcessingId(id);
                    try {
                        if (action === 'approve') await onApprove(id);
                        else await onReject(id);
                    } catch (e) {
                        console.error(e);
                    }
                }
                setProcessingId(null);
            }
            setSelectedIds(new Set());
        } finally {
            setIsBatchProcessing(false);
        }
    };

    const handleAction = async (id: string, action: 'approve' | 'reject') => {
        setProcessingId(id);
        try {
            if (action === 'approve') await onApprove(id);
            else await onReject(id);
        } finally {
            setProcessingId(null);
        }
    };

    if (!isOpen) return null;

    const isLoadingState = loading || isBatchProcessing;


    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
            <div className="w-full max-w-5xl bg-[var(--color-bg-card)] rounded-2xl shadow-2xl ring-1 ring-black/5 flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-200 overflow-hidden">

                {/* Header */}
                <div className="flex items-center justify-between px-6 py-5 border-b border-[var(--color-border-light)] bg-[var(--color-bg-page)]/80 backdrop-blur-md sticky top-0 z-20">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-amber-100 rounded-lg shadow-sm">
                            <ClockIcon className="w-6 h-6 text-amber-600" />
                        </div>
                        <div>
                            <h3 className="text-xl font-bold text-title">Review Changes</h3>
                            <p className="text-sm text-muted">
                                {pendingRows.length} pending request{pendingRows.length !== 1 ? 's' : ''}
                            </p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-1.5 text-muted hover:text-body hover:bg-[var(--color-bg-page)] rounded-full transition-colors focus:ring-2 focus:ring-offset-1 focus:ring-[var(--color-border-light)]"
                    >
                        <XMarkIcon className="w-6 h-6" />
                    </button>
                </div>

                {/* Body */}
                <div className="flex-1 overflow-y-auto p-0 scrollbar-thin scrollbar-thumb-gray-200 scrollbar-track-transparent bg-[var(--color-bg-card)]">
                    {pendingRows.length === 0 ? (
                        <div className="flex flex-col items-center justify-center h-64 text-muted">
                            <ShieldCheckIcon className="w-20 h-20 mb-4 text-[var(--color-border)]" />
                            <p className="text-lg font-medium text-body">No pending changes</p>
                            <p className="text-sm text-muted">Everything is up to date!</p>
                        </div>
                    ) : (
                        <table className="w-full text-left border-collapse">
                            <thead className="bg-gray-50/90 backdrop-blur sticky top-0 z-10 shadow-sm border-b border-gray-200">
                                <tr>
                                    <th className="px-4 py-3 w-10">
                                        <input
                                            type="checkbox"
                                            className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                                            checked={pendingRows.length > 0 && selectedIds.size === pendingRows.length}
                                            onChange={handleSelectAll}
                                        />

                                    </th>
                                    <th className="px-6 py-3 text-xs font-semibold text-muted uppercase tracking-wider">Type</th>
                                    <th className="px-6 py-3 text-xs font-semibold text-muted uppercase tracking-wider">Employee</th>
                                    <th className="px-6 py-3 text-xs font-semibold text-muted uppercase tracking-wider">Details</th>
                                    <th className="px-6 py-3 text-xs font-semibold text-muted uppercase tracking-wider text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-[var(--color-border-light)] bg-[var(--color-bg-card)]">
                                {pendingRows.map((row) => {
                                    const isDelete = row.lineManagerStatus === 'pending_delete';
                                    const isProcessing = processingId === row.id || loading;
                                    const isSelected = selectedIds.has(row.id);

                                    return (
                                        <tr
                                            key={row.id}
                                            className={`transition-colors group ${isSelected ? 'bg-indigo-50/50' : 'hover:bg-gray-50/80'}`}
                                        >
                                            <td className="px-4 py-4">
                                                <input
                                                    type="checkbox"
                                                    className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                                                    checked={isSelected}
                                                    onChange={() => handleSelectRow(row.id)}
                                                />
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                {isDelete ? (
                                                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-red-50 text-red-700 border border-red-100 shadow-sm">
                                                        <TrashIcon className="w-3.5 h-3.5" />
                                                        Deletion
                                                    </span>
                                                ) : (
                                                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-blue-50 text-blue-700 border border-blue-100 shadow-sm">
                                                        <PencilSquareIcon className="w-3.5 h-3.5" />
                                                        Update
                                                    </span>
                                                )}
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="flex flex-col">
                                                    <span className="text-sm font-semibold text-title">{row["FullName "] || row["FullName"] || "Unknown"}</span>
                                                    <span className="text-xs text-muted font-mono mt-0.5">{row["Emp ID"]}</span>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                {isDelete ? (
                                                    <span className="text-sm text-body flex items-center gap-1">
                                                        <span className="w-1.5 h-1.5 rounded-full bg-red-500"></span>
                                                        Request to remove record.
                                                    </span>
                                                ) : (
                                                    <div className="text-sm text-body space-y-1.5">
                                                        <div className="flex items-center gap-2">
                                                            <span className="text-gray-400 text-xs font-medium uppercase w-16 tracking-wide">Current:</span>
                                                            <span className="font-medium text-gray-700 bg-gray-100 px-1.5 py-0.5 rounded text-xs">{row["Line Manager"] || "N/A"}</span>
                                                        </div>
                                                        <div className="flex items-center gap-2">
                                                            <span className="text-amber-600 text-xs font-bold uppercase w-16 tracking-wide">New:</span>
                                                            <span className="font-bold text-gray-900 bg-amber-50 border border-amber-100 px-1.5 py-0.5 rounded text-xs shadow-sm">{row.pendingLineManager}</span>
                                                        </div>
                                                    </div>
                                                )}
                                            </td>
                                            <td className="px-6 py-4 text-right whitespace-nowrap">
                                                <div className="flex items-center justify-end gap-2 opacity-80 group-hover:opacity-100 transition-opacity">
                                                    <button
                                                        onClick={() => handleAction(row.id, 'approve')}
                                                        disabled={isProcessing}
                                                        className="p-1.5 text-green-600 bg-white border border-green-200 hover:bg-green-50 rounded-lg transition-all shadow-sm disabled:opacity-50"
                                                        title="Approve"
                                                    >
                                                        <CheckCircleIcon className="w-5 h-5" />
                                                    </button>
                                                    <button
                                                        onClick={() => handleAction(row.id, 'reject')}
                                                        disabled={isProcessing}
                                                        className="p-1.5 text-red-600 bg-white border border-red-200 hover:bg-red-50 rounded-lg transition-all shadow-sm disabled:opacity-50"
                                                        title="Reject"
                                                    >
                                                        <XCircleIcon className="w-5 h-5" />
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    )}
                </div>

                {/* Footer */}
                {pendingRows.length > 0 && (
                    <div className="px-6 py-4 border-t border-[var(--color-border-light)] bg-[var(--color-bg-page)]/80 backdrop-blur-md rounded-b-2xl flex justify-between items-center z-20">
                        <div className="flex items-center gap-2 text-sm text-gray-500">
                            {selectedIds.size > 0 && (
                                <span className="bg-indigo-50 text-indigo-700 px-2 py-1 rounded-md font-medium border border-indigo-100">
                                    {selectedIds.size} selected
                                </span>
                            )}
                        </div>
                        <div className="flex gap-3">
                            {selectedIds.size > 0 ? (
                                <>
                                    <button
                                        onClick={() => handleProcessSelected('reject')}
                                        disabled={loading}
                                        className="px-4 py-2 text-sm font-semibold text-red-600 bg-white border border-gray-200 rounded-lg hover:bg-red-50 hover:border-red-200 transition-all shadow-sm"
                                    >
                                        Reject Selected
                                    </button>
                                    <button
                                        onClick={() => handleProcessSelected('approve')}
                                        disabled={loading}
                                        className="px-4 py-2 text-sm font-bold text-white bg-green-600 rounded-lg hover:bg-green-700 shadow-sm shadow-green-200 transition-all"
                                    >
                                        Approve Selected
                                    </button>
                                </>
                            ) : (
                                <>
                                    <button
                                        onClick={onRejectAll}
                                        disabled={loading}
                                        className="px-4 py-2 text-sm font-semibold text-red-600 bg-white border border-gray-200 rounded-lg hover:bg-red-50 hover:border-red-200 transition-all shadow-sm"
                                    >
                                        Reject All
                                    </button>
                                    <button
                                        onClick={onApproveAll}
                                        disabled={loading}
                                        className="px-4 py-2 text-sm font-bold text-white bg-green-600 rounded-lg hover:bg-green-700 shadow-sm shadow-green-200 transition-all"
                                    >
                                        Approve All
                                    </button>
                                </>
                            )}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
