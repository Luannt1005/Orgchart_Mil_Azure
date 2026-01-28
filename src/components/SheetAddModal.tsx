'use client';

import React, { useState, useEffect } from 'react';
import { XMarkIcon, UserPlusIcon } from '@heroicons/react/24/outline';

interface SheetAddModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (data: any) => Promise<boolean>;
    columns: string[];
}

export default function SheetAddModal({ isOpen, onClose, onSave, columns }: SheetAddModalProps) {
    const [formData, setFormData] = useState<{ [key: string]: string }>({});
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Reset form when modal opens
    useEffect(() => {
        if (isOpen) {
            setFormData({});
            setError(null);
        }
    }, [isOpen]);

    const handleChange = (col: string, value: string) => {
        setFormData(prev => ({ ...prev, [col]: value }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError(null);

        try {
            // Basic validation: Emp ID is usually required
            if (!formData['Emp ID']) {
                throw new Error("Emp ID is required");
            }

            const success = await onSave(formData);
            if (success) {
                onClose();
            }
        } catch (err) {
            setError(err instanceof Error ? err.message : "Failed to save");
        } finally {
            setLoading(false);
        }
    };

    if (!isOpen) return null;

    // Helper to determine input type
    const getInputType = (col: string) => {
        const lower = col.toLowerCase();
        if (lower.includes('date') || lower.includes('day')) return 'date';
        // Identify fields that should be selects
        if (['dl/idl/staff', 'employee type', 'status', 'is direct'].includes(lower)) return 'select';
        return 'text';
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4 animate-in fade-in duration-200">
            <div className="w-full max-w-2xl bg-[var(--color-bg-card)] rounded-2xl shadow-2xl ring-1 ring-black/5 flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-200 border border-[var(--color-border)]">

                {/* Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-[var(--color-border)] bg-[var(--color-bg-page)] rounded-t-2xl">
                    <div className="flex items-center gap-2">
                        <div className="p-2 bg-[var(--color-primary-mwk-light)] rounded-lg">
                            <UserPlusIcon className="w-5 h-5 text-[var(--color-primary-mwk)]" />
                        </div>
                        <div>
                            <h3 className="text-lg font-bold text-[var(--color-text-title)]">Add New Employee</h3>
                            <p className="text-xs text-[var(--color-text-muted)]">Enter employee details below</p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-1 text-[var(--color-text-muted)] hover:text-[var(--color-text-body)] hover:bg-[var(--color-bg-card)] rounded-full transition-colors"
                    >
                        <XMarkIcon className="w-6 h-6" />
                    </button>
                </div>

                {/* Scrollable Body */}
                <div className="flex-1 overflow-y-auto p-6 scrollbar-thin scrollbar-thumb-gray-200 scrollbar-track-transparent">
                    {error && (
                        <div className="mb-4 p-3 bg-red-50 text-red-600 text-sm rounded-lg border border-red-100 flex items-center gap-2">
                            <span className="font-bold">Error:</span> {error}
                        </div>
                    )}

                    <form id="add-employee-form" onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-5">
                        {columns.map((col) => {
                            const label = col.replace(/\r\n/g, ' ');
                            const inputType = getInputType(col);

                            // Handle special fields with specific UI (like Dropdowns) could be added here
                            // For now, mapping 'DL/IDL/Staff' or 'Employee Type' to select could be good

                            return (
                                <div key={col} className="space-y-1.5">
                                    <label className="block text-xs font-semibold text-[var(--color-text-muted)] uppercase tracking-wide">
                                        {label} {col === 'Emp ID' && <span className="text-red-500">*</span>}
                                    </label>
                                    {inputType === 'select' ? (
                                        <select
                                            value={formData[col] || ''}
                                            onChange={(e) => handleChange(col, e.target.value)}
                                            className="w-full h-10 px-3 rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-page)] focus:bg-[var(--color-bg-card)] focus:border-[var(--color-primary-mwk)] focus:ring-2 focus:ring-[var(--color-primary-mwk-light)] outline-none transition-all text-sm text-[var(--color-text-body)]"
                                        >
                                            <option value="">Select {label}</option>
                                            {col === 'DL/IDL/Staff' && (
                                                <>
                                                    <option value="DL">DL</option>
                                                    <option value="IDL">IDL</option>
                                                    <option value="Staff">Staff</option>
                                                </>
                                            )}
                                            {col === 'Status' && (
                                                <>
                                                    <option value="Active">Active</option>
                                                    <option value="Resigned">Resigned</option>
                                                </>
                                            )}
                                            {col === 'Is Direct' && (
                                                <>
                                                    <option value="YES">YES</option>
                                                    <option value="NO">NO</option>
                                                </>
                                            )}
                                        </select>
                                    ) : (
                                        <input
                                            type={inputType}
                                            value={formData[col] || ''}
                                            onChange={(e) => handleChange(col, e.target.value)}
                                            className="w-full h-10 px-3 rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-page)] focus:bg-[var(--color-bg-card)] focus:border-[var(--color-primary-mwk)] focus:ring-2 focus:ring-[var(--color-primary-mwk-light)] outline-none transition-all text-sm text-[var(--color-text-body)] placeholder:text-[var(--color-text-muted)]"
                                            placeholder={`Enter ${label}`}
                                            required={col === 'Emp ID'}
                                        />
                                    )}
                                </div>
                            );
                        })}
                    </form>
                </div>

                {/* Footer */}
                <div className="px-6 py-4 border-t border-[var(--color-border)] bg-[var(--color-bg-page)] rounded-b-2xl flex justify-end gap-3">
                    <button
                        type="button"
                        onClick={onClose}
                        className="px-4 py-2 text-sm font-semibold text-[var(--color-text-muted)] bg-[var(--color-bg-card)] border border-[var(--color-border)] rounded-lg hover:bg-[var(--color-bg-page)] hover:text-[var(--color-text-body)] transition-colors"
                    >
                        Cancel
                    </button>
                    <button
                        type="submit"
                        form="add-employee-form"
                        disabled={loading}
                        className="px-5 py-2 text-sm font-bold text-white bg-[var(--color-primary-mwk)] rounded-lg hover:bg-[var(--color-primary-mwk-dark)] shadow-sm transition-all disabled:opacity-70 disabled:cursor-not-allowed flex items-center gap-2"
                    >
                        {loading ? (
                            <>
                                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                Adding...
                            </>
                        ) : (
                            <>
                                Confirm Add
                            </>
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
}
