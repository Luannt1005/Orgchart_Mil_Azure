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
        return 'text';
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4 animate-in fade-in duration-200">
            <div className="w-full max-w-2xl bg-white rounded-2xl shadow-2xl ring-1 ring-black/5 flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-200">

                {/* Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 bg-gray-50/50 rounded-t-2xl">
                    <div className="flex items-center gap-2">
                        <div className="p-2 bg-indigo-100 rounded-lg">
                            <UserPlusIcon className="w-5 h-5 text-indigo-600" />
                        </div>
                        <div>
                            <h3 className="text-lg font-bold text-gray-900">Add New Employee</h3>
                            <p className="text-xs text-gray-500">Enter employee details below</p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-1 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition-colors"
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
                                    <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide">
                                        {label} {col === 'Emp ID' && <span className="text-red-500">*</span>}
                                    </label>
                                    <input
                                        type={inputType}
                                        value={formData[col] || ''}
                                        onChange={(e) => handleChange(col, e.target.value)}
                                        className="w-full h-10 px-3 rounded-lg border border-gray-200 bg-gray-50 focus:bg-white focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 outline-none transition-all text-sm text-gray-800 placeholder:text-gray-400"
                                        placeholder={`Enter ${label}`}
                                        required={col === 'Emp ID'}
                                    />
                                </div>
                            );
                        })}
                    </form>
                </div>

                {/* Footer */}
                <div className="px-6 py-4 border-t border-gray-100 bg-gray-50/50 rounded-b-2xl flex justify-end gap-3">
                    <button
                        type="button"
                        onClick={onClose}
                        className="px-4 py-2 text-sm font-semibold text-gray-600 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 hover:text-gray-800 transition-colors"
                    >
                        Cancel
                    </button>
                    <button
                        type="submit"
                        form="add-employee-form"
                        disabled={loading}
                        className="px-5 py-2 text-sm font-bold text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 shadow-sm shadow-indigo-200 transition-all disabled:opacity-70 disabled:cursor-not-allowed flex items-center gap-2"
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
