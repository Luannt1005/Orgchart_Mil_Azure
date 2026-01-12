"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import UserManagement from "./components/UserManagement";
import DataImport from "./components/DataImport";
import SheetManagerTable from "@/components/SheetManagerTable";

// Icons
import {
    UsersIcon,
    CloudArrowUpIcon,
    TableCellsIcon,
    ClipboardDocumentCheckIcon,
    ClockIcon
} from "@heroicons/react/24/outline";

export default function AdminDashboard() {
    type MainTab = 'users' | 'import' | 'approvals';
    type ApprovalSubTab = 'allData' | 'reviewChanges';

    const [activeTab, setActiveTab] = useState<MainTab>('users');
    const [approvalSubTab, setApprovalSubTab] = useState<ApprovalSubTab>('allData');
    const [pendingCount, setPendingCount] = useState<number>(0);
    const [isAuthorized, setIsAuthorized] = useState(false);
    const router = useRouter();

    // specific check for admin role
    useEffect(() => {
        const storedUser = localStorage.getItem('user');
        if (!storedUser) {
            router.push('/login');
            return;
        }
        try {
            const user = JSON.parse(storedUser);
            if (user.role !== 'admin') {
                router.push('/');
            } else {
                setIsAuthorized(true);
            }
        } catch (e) {
            router.push('/login');
        }
    }, [router]);



    // Fetch pending count for Review Changes badge
    useEffect(() => {
        const fetchPendingCount = async () => {
            try {
                // Use page=1 to ensure we go into paginated path that applies filters
                const res = await fetch('/api/sheet?page=1&limit=1&lineManagerStatus=pending');
                const data = await res.json();
                if (data.success) {
                    // Use total from paginated response which reflects the filtered count
                    setPendingCount(data.total || 0);
                }
            } catch (err) {
                console.error('Failed to fetch pending count:', err);
            }
        };

        fetchPendingCount();

        // Refresh pending count every 30 seconds
        const interval = setInterval(fetchPendingCount, 30000);
        return () => clearInterval(interval);
    }, []);

    if (!isAuthorized) {
        return null;
    }

    return (
        <div className="min-h-screen bg-transparent font-sans text-slate-800 flex flex-col">
            {/* Header / Tabs */}
            <header className="bg-white border-b border-gray-200 px-6 shrink-0 rounded-md shadow-md mx-6 mt-4">
                <div className="flex items-center justify-between h-16">
                    <div className="flex items-center gap-6">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-slate-900 rounded-lg shadow-sm">
                                <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                </svg>
                            </div>
                            <h1 className="text-lg font-bold text-gray-900 tracking-tight">Admin Console</h1>
                        </div>

                        <div className="h-6 w-px bg-gray-200"></div>

                        <nav className="flex space-x-1">
                            <button
                                onClick={() => setActiveTab('users')}
                                className={`
                                    inline-flex items-center px-4 py-2 text-sm font-medium rounded-lg transition-all
                                    ${activeTab === 'users'
                                        ? 'bg-blue-50 text-blue-700'
                                        : 'text-gray-500 hover:text-gray-900 hover:bg-gray-50'}
                                `}
                            >
                                <UsersIcon className="w-5 h-5 mr-2" />
                                Users
                            </button>
                            <button
                                onClick={() => setActiveTab('import')}
                                className={`
                                    inline-flex items-center px-4 py-2 text-sm font-medium rounded-lg transition-all
                                    ${activeTab === 'import'
                                        ? 'bg-blue-50 text-blue-700'
                                        : 'text-gray-500 hover:text-gray-900 hover:bg-gray-50'}
                                `}
                            >
                                <CloudArrowUpIcon className="w-5 h-5 mr-2" />
                                Import
                            </button>
                            <button
                                onClick={() => setActiveTab('approvals')}
                                className={`
                                    inline-flex items-center px-4 py-2 text-sm font-medium rounded-lg transition-all
                                    ${activeTab === 'approvals'
                                        ? 'bg-blue-50 text-blue-700'
                                        : 'text-gray-500 hover:text-gray-900 hover:bg-gray-50'}
                                `}
                            >
                                <ClipboardDocumentCheckIcon className="w-5 h-5 mr-2" />
                                Approvals
                            </button>
                        </nav>
                    </div>
                </div>
            </header>

            {/* Main Content */}
            <main className="flex-1 p-6 overflow-hidden">
                <div className="h-full bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden flex flex-col">
                    {activeTab === 'users' && (
                        <div className="h-full animate-in fade-in slide-in-from-bottom-2 duration-300">
                            <UserManagement />
                        </div>
                    )}

                    {activeTab === 'import' && (
                        <div className="h-full animate-in fade-in slide-in-from-bottom-2 duration-300">
                            <DataImport />
                        </div>
                    )}

                    {activeTab === 'approvals' && (
                        <div className="h-full flex flex-col animate-in fade-in slide-in-from-bottom-2 duration-300">
                            {/* Sub-tabs for Approvals */}
                            <div className="flex items-center gap-2 px-4 py-3 bg-gray-50 border-b border-gray-200 shrink-0">
                                <button
                                    onClick={() => setApprovalSubTab('allData')}
                                    className={`
                                        inline-flex items-center px-4 py-2 text-sm font-medium rounded-lg transition-all
                                        ${approvalSubTab === 'allData'
                                            ? 'bg-white text-emerald-700 shadow-sm border border-gray-200'
                                            : 'text-gray-500 hover:text-gray-900 hover:bg-white/50'}
                                    `}
                                >
                                    <TableCellsIcon className="w-4 h-4 mr-2" />
                                    All Data
                                </button>
                                <button
                                    onClick={() => setApprovalSubTab('reviewChanges')}
                                    className={`
                                        inline-flex items-center px-4 py-2 text-sm font-medium rounded-lg transition-all
                                        ${approvalSubTab === 'reviewChanges'
                                            ? 'bg-white text-amber-700 shadow-sm border border-gray-200'
                                            : 'text-gray-500 hover:text-gray-900 hover:bg-white/50'}
                                    `}
                                >
                                    <ClockIcon className="w-4 h-4 mr-2" />
                                    Review Changes
                                    {pendingCount > 0 && (
                                        <span className="ml-2 bg-red-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full min-w-[18px] text-center">
                                            {pendingCount}
                                        </span>
                                    )}
                                </button>
                            </div>

                            {/* Sub-tab content */}
                            <div className="flex-1 overflow-hidden">
                                {approvalSubTab === 'allData' && (
                                    <SheetManagerTable
                                        initialShowApprovalOnly={false}
                                        enableApproval={false}
                                        enableSync={true}
                                        enableDeleteAll={true}
                                        enableAddEntry={true}
                                    />
                                )}
                                {approvalSubTab === 'reviewChanges' && (
                                    <SheetManagerTable
                                        initialShowApprovalOnly={true}
                                        enableApproval={true}
                                        enableSync={false}
                                        enableDeleteAll={false}
                                        enableAddEntry={false}
                                    />
                                )}
                            </div>
                        </div>
                    )}
                </div>
            </main>
        </div>
    );
}
