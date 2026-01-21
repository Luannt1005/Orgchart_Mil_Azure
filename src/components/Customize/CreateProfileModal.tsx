'use client';

import { useState } from "react";

interface CreateProfileModalProps {
    isOpen: boolean;
    onClose: () => void;
    onCreate: (name: string, desc: string, dept: string) => Promise<void>;
    groups: string[];
}

export default function CreateProfileModal({ isOpen, onClose, onCreate, groups }: CreateProfileModalProps) {
    const [newOrgName, setNewOrgName] = useState("");
    const [newOrgDesc, setNewOrgDesc] = useState("");
    const [selectedDept, setSelectedDept] = useState("");
    const [creatingOrg, setCreatingOrg] = useState(false);

    if (!isOpen) return null;

    const handleCreate = async () => {
        if (!newOrgName.trim()) {
            alert("❌ Vui lòng nhập tên sơ đồ");
            return;
        }
        if (!selectedDept) {
            alert("❌ Vui lòng chọn phòng ban");
            return;
        }

        setCreatingOrg(true);
        try {
            await onCreate(newOrgName, newOrgDesc, selectedDept);
            // Reset form
            setNewOrgName("");
            setNewOrgDesc("");
            setSelectedDept("");
            onClose();
        } catch (err) {
            // Error handling is expected to be done in the parent or caught here if specific
            console.error(err);
        } finally {
            setCreatingOrg(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4 animate-in fade-in duration-200">
            <div className="w-full max-w-lg overflow-hidden rounded-2xl bg-white shadow-2xl ring-1 ring-black/5 animate-in zoom-in-95 duration-200">
                {/* Modal Header */}
                <div className="border-b border-slate-100 bg-slate-50/50 px-6 py-4 flex justify-between items-center">
                    <div>
                        <h3 className="text-lg font-bold text-slate-800">Create New Profile</h3>
                        <p className="text-xs text-slate-500">Duplicate from existing department</p>
                    </div>
                    <button
                        onClick={onClose}
                        className="text-slate-400 hover:text-slate-600"
                    >
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>

                {/* Modal Body */}
                <div className="space-y-5 p-6">
                    <div className="space-y-1.5">
                        <label className="text-xs font-bold uppercase tracking-wider text-slate-500">Profile Name</label>
                        <input
                            type="text"
                            value={newOrgName}
                            onChange={e => setNewOrgName(e.target.value)}
                            placeholder="e.g. Engineering Restructure 2024"
                            className="w-full rounded-lg border border-slate-200 px-4 py-2.5 text-sm font-medium outline-none transition-all placeholder:text-slate-400 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
                        />
                    </div>

                    <div className="space-y-1.5">
                        <label className="text-xs font-bold uppercase tracking-wider text-slate-500">Source Department</label>
                        <select
                            value={selectedDept}
                            onChange={e => setSelectedDept(e.target.value)}
                            className="w-full rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium outline-none transition-all focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
                        >
                            <option value="">-- Choose Department --</option>
                            {groups.map(dept => (
                                <option key={dept} value={dept}>{dept}</option>
                            ))}
                        </select>
                        <p className="text-[10px] text-slate-400">
                            The chart will be initialized with data from this department.
                        </p>
                    </div>

                    <div className="space-y-1.5">
                        <label className="text-xs font-bold uppercase tracking-wider text-slate-500">Description</label>
                        <textarea
                            value={newOrgDesc}
                            onChange={e => setNewOrgDesc(e.target.value)}
                            placeholder="Optional notes about this chart..."
                            rows={3}
                            className="w-full rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium outline-none transition-all placeholder:text-slate-400 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 resize-none"
                        />
                    </div>
                </div>

                {/* Modal Footer */}
                <div className="flex items-center gap-3 border-t border-slate-100 bg-slate-50/50 px-6 py-4">
                    <button
                        onClick={onClose}
                        className="flex-1 rounded-lg border border-slate-200 bg-white py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-50"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={handleCreate}
                        disabled={creatingOrg || !newOrgName.trim() || !selectedDept}
                        className="flex-[2] flex items-center justify-center gap-2 rounded-lg bg-indigo-600 py-2.5 text-sm font-bold text-white shadow-sm hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {creatingOrg && (
                            <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent"></div>
                        )}
                        Create Profile
                    </button>
                </div>
            </div>
        </div>
    );
}
