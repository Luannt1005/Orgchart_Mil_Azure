import { Menu, Transition } from '@headlessui/react';
import { Fragment } from 'react';

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
    onAddDepartment?: () => void; // New
    onAddEmployee?: () => void;   // New
    onAddDescriptionTable?: () => void; // New
    isSaving: boolean;
    isPublic: boolean;
    onTogglePublic: (val: boolean) => void;
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
    onAddDepartment,
    onAddEmployee,
    onAddDescriptionTable,
    isSaving,
    isPublic,
    onTogglePublic
}: CustomizeHeaderProps) {
    return (
        <header className="z-30 flex h-16 shrink-0 items-center justify-between border-b border-slate-200 bg-white px-6 shadow-sm">
            {/* Left: Title & Profile Selector */}
            <div className="flex items-center gap-6">
                <button
                    onClick={() => setOrgId("")}
                    className="flex items-center gap-2 p-2 -ml-2 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-colors"
                >
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                    </svg>
                    <div className="flex flex-col items-start">
                        <h1 className="text-sm font-bold text-slate-800 leading-tight">Back to Folders</h1>
                    </div>
                </button>

                <div className="h-8 w-px bg-slate-200"></div>

                <div className="flex flex-col">
                    <label className="mb-1 text-[10px] font-bold uppercase tracking-wider text-slate-400">Editing Chart</label>
                    <div className="flex h-9 min-w-[240px] items-center rounded-lg border border-slate-200 bg-slate-50 px-3 text-sm font-semibold text-slate-700">
                        {orgList.find(o => o.orgchart_id === orgId)?.orgchart_name || "Untitled Chart"}
                    </div>
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

                {/* RELOAD */}
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

                {/* ADD ACTIONS MENU */}
                <Menu as="div" className="relative inline-block text-left">
                    <Menu.Button
                        disabled={!orgId || loadingChart}
                        className="flex h-9 items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-700 shadow-sm transition-all hover:bg-slate-50 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        <svg className="h-4 w-4 text-indigo-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                        </svg>
                        Add Node
                        <svg className="h-3 w-3 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                        </svg>
                    </Menu.Button>
                    <Transition
                        as={Fragment}
                        enter="transition ease-out duration-100"
                        enterFrom="transform opacity-0 scale-95"
                        enterTo="transform opacity-100 scale-100"
                        leave="transition ease-in duration-75"
                        leaveFrom="transform opacity-100 scale-100"
                        leaveTo="transform opacity-0 scale-95"
                    >
                        <Menu.Items className="absolute right-0 mt-2 w-48 origin-top-right divide-y divide-gray-100 rounded-md bg-white shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none z-50">
                            <div className="p-1">
                                <Menu.Item>
                                    {({ active }) => (
                                        <button
                                            onClick={onAddDepartment}
                                            className={`${active ? 'bg-indigo-50 text-indigo-600' : 'text-gray-900'
                                                } group flex w-full items-center rounded-md px-2 py-2 text-sm`}
                                        >
                                            <span className="mr-2">🏢</span>
                                            Add Department
                                        </button>
                                    )}
                                </Menu.Item>
                                <Menu.Item>
                                    {({ active }) => (
                                        <button
                                            onClick={onAddEmployee}
                                            className={`${active ? 'bg-indigo-50 text-indigo-600' : 'text-gray-900'
                                                } group flex w-full items-center rounded-md px-2 py-2 text-sm`}
                                        >
                                            <span className="mr-2">👤</span>
                                            Add Employee
                                        </button>
                                    )}
                                </Menu.Item>
                                <Menu.Item>
                                    {({ active }) => (
                                        <button
                                            onClick={onAddDescriptionTable}
                                            className={`${active ? 'bg-indigo-50 text-indigo-600' : 'text-gray-900'
                                                } group flex w-full items-center rounded-md px-2 py-2 text-sm`}
                                        >
                                            <span className="mr-2">📝</span>
                                            Add Description Table
                                        </button>
                                    )}
                                </Menu.Item>
                            </div>
                        </Menu.Items>
                    </Transition>
                </Menu>

                <div className="h-8 w-px bg-slate-200 mx-1"></div>





                <div className="h-8 w-px bg-slate-200 mx-1"></div>

                {/* PUBLIC TOGGLE */}
                <div className="flex items-center gap-2 mr-2">
                    <span className={`text-xs font-semibold ${isPublic ? "text-indigo-600" : "text-slate-500"}`}>
                        {isPublic ? "Public" : "Private"}
                    </span>
                    <button
                        onClick={() => onTogglePublic(!isPublic)}
                        disabled={!orgId}
                        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 ${isPublic ? 'bg-indigo-600' : 'bg-slate-200'
                            }`}
                    >
                        <span
                            className={`${isPublic ? 'translate-x-6' : 'translate-x-1'
                                } inline-block h-4 w-4 transform rounded-full bg-white transition-transform`}
                        />
                    </button>
                </div>

                {/* SAVE */}
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
                    Save
                </button>
            </div>
        </header>
    );
}
