'use client';

import React, { useState, useEffect } from 'react';
import { XMarkIcon, UserPlusIcon } from '@heroicons/react/24/outline';

interface HeadcountAddModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (data: any, quantity: number) => Promise<boolean>;
    columns: string[];
}

export default function HeadcountAddModal({ isOpen, onClose, onSave, columns }: HeadcountAddModalProps) {
    const [formData, setFormData] = useState<{ [key: string]: string }>({});
    const [quantity, setQuantity] = useState<number>(1);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Reset form when modal opens
    useEffect(() => {
        if (isOpen) {
            setFormData({});
            setQuantity(1);
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
            if (quantity < 1) {
                throw new Error("Quantity must be at least 1");
            }
            // Basic validation
            if (!formData['Job Title']) {
                throw new Error("Job Title is required");
            }

            const success = await onSave(formData, quantity);
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
        if (['dl/idl/staff', 'employee type', 'status', 'is direct'].includes(lower)) return 'select';
        return 'text';
    };

    // Filter out Emp ID from columns if present, as it is auto-generated
    const displayColumns = columns.filter(c => c !== "Emp ID" && c !== "Employee Type" && c !== "Status");

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
                            <h3 className="text-lg font-bold text-gray-900">Add Open Headcount</h3>
                            <p className="text-xs text-gray-500">Add multiple open positions at once</p>
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

                    <form id="add-headcount-form" onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-5">

                        {/* Quantity Field - Prominent */}
                        <div className="col-span-full bg-indigo-50/50 p-4 rounded-xl border border-indigo-100">
                            <label className="block text-sm font-bold text-indigo-900 mb-2">
                                Number of Positions to Add
                            </label>
                            <input
                                type="number"
                                min="1"
                                max="100"
                                value={quantity}
                                onChange={(e) => setQuantity(parseInt(e.target.value) || 0)}
                                className="w-full text-lg h-12 px-4 rounded-lg border border-indigo-200 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 outline-none transition-all font-bold text-indigo-600"
                            />
                            <p className="text-xs text-indigo-500 mt-1">
                                {quantity > 0 ? `This will generate ${quantity} unique 'Headcount Open' entries.` : 'Please enter a valid quantity.'}
                            </p>
                        </div>

                        {displayColumns.map((col) => {
                            const label = col.replace(/\r\n/g, ' ');
                            const inputType = getInputType(col);

                            return (
                                <div key={col} className="space-y-1.5">
                                    <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide">
                                        {label} {col === 'Job Title' && <span className="text-red-500">*</span>}
                                    </label>
                                    {inputType === 'select' ? (
                                        <select
                                            value={formData[col] || ''}
                                            onChange={(e) => handleChange(col, e.target.value)}
                                            className="w-full h-10 px-3 rounded-lg border border-gray-200 bg-gray-50 focus:bg-white focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 outline-none transition-all text-sm text-gray-800"
                                        >
                                            <option value="">Select {label}</option>
                                            {col === 'DL/IDL/Staff' && (
                                                <>
                                                    <option value="DL">DL</option>
                                                    <option value="IDL">IDL</option>
                                                    <option value="Staff">Staff</option>
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
                                            className="w-full h-10 px-3 rounded-lg border border-gray-200 bg-gray-50 focus:bg-white focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 outline-none transition-all text-sm text-gray-800 placeholder:text-gray-400"
                                            placeholder={`Enter ${label}`}
                                            required={col === 'Job Title'}
                                        />
                                    )}
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
                        form="add-headcount-form"
                        disabled={loading}
                        className="px-5 py-2 text-sm font-bold text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 shadow-sm shadow-indigo-200 transition-all disabled:opacity-70 disabled:cursor-not-allowed flex items-center gap-2"
                    >
                        {loading ? (
                            <>
                                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                Adding {quantity}...
                            </>
                        ) : (
                            <>
                                Add {quantity} Open Headcounts
                            </>
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
}
