'use client';

import { useEffect, useRef, useState, useCallback } from "react";
import { useOrgData } from "@/hooks/useOrgData";
import LoadingScreen from "@/components/loading-screen";
import styles from "../../Orgchart/OrgChart.module.css";
import CustomizeHeader from "./CustomizeHeader";
import CreateProfileModal from "./CreateProfileModal";
import { useOrgProfileManager } from "../hooks/useOrgProfileManager";
import { useOrgChartEditor } from "../hooks/useOrgChartEditor";
import EditNodeModal from "./EditNodeModal";

const CustomizeClient = () => {
    const chartRef = useRef<HTMLDivElement>(null);
    const { groups, loading: groupsLoading, nodes: allNodes } = useOrgData();

    // State Hooks
    const [user, setUser] = useState<any>(null);
    const [orgId, setOrgId] = useState<string>("");
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [showEditModal, setShowEditModal] = useState(false);
    const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
    const [selectedNodeData, setSelectedNodeData] = useState<any>(null);

    const username = user?.username || "admin";

    useEffect(() => {
        const storedUser = localStorage.getItem("user");
        if (storedUser) {
            try { setUser(JSON.parse(storedUser)); } catch (e) { }
        }
    }, []);

    // --- Hooks ---
    const {
        orgList,
        loadingList,
        fetchOrgList,
        createOrgChart,
        deleteOrgChart,
        performCreate
    } = useOrgProfileManager({ user });

    // --- State for Edit Modal ---
    const [editModalOpen, setEditModalOpen] = useState(false);
    const [selectedNodeDataForEdit, setSelectedNodeDataForEdit] = useState<any>(null); // Renamed to avoid conflict

    // --- Handlers ---
    const handleNodeClick = useCallback((nodeData: any) => {
        setSelectedNodeDataForEdit(nodeData);
        setEditModalOpen(true);
    }, []);

    // 4. Chart Manager Hook
    const {
        loadChartData,
        saveChart,
        updateNodeData,
        addDepartment, // Get from hook
        addEmployee,   // Get from hook
        addDescriptionTable, // Get from hook
        removeNode,    // Get from hook

        descriptionTables,      // EXPOSE THIS
        descriptionTablesRef,   // EXPOSE THIS
        setDescriptionTables,   // EXPOSE THIS

        loadingChart,
        isSaving,
        lastSaveTime,
        hasChanges,
        setHasChanges,
        chartInstance,
        isPublic,
        setIsPublic
    } = useOrgChartEditor(
        chartRef,
        orgId,
        username,
        allNodes, // Pass global nodes for auto-mapping
        useCallback(() => {
            // On chart not found
            fetchOrgList();
            setOrgId("");
        }, [fetchOrgList]),
        handleNodeClick // Pass custom click handler
    );

    const handleSaveNode = (originalId: string, newData: any) => {
        if (updateNodeData) {
            updateNodeData(originalId, newData);
        }
    };

    // 5. Derived State
    const currentOrgName = orgList.find(o => o.orgchart_id === orgId)?.orgchart_name || ""; // Corrected property name from org_id to orgchart_id and org_name to orgchart_name

    const handleCreateOrgChart = async (newOrgName: string, newOrgDesc: string, selectedDept: string) => {
        try {
            const result = await createOrgChart(newOrgName, newOrgDesc, selectedDept);
            setShowCreateModal(false);
            alert(`✅ Đã tạo sơ đồ: ${newOrgName}`);
            if (result?.orgchart_id) setOrgId(result.orgchart_id);
        } catch (err: any) {
            if (err.message === "EMPTY_DATA_CONFIRMATION_NEEDED") {
                if (confirm("Phòng ban này không có dữ liệu. Bạn vẫn muốn tạo sơ đồ trống?")) {
                    try {
                        const description = newOrgDesc || `Tạo từ phòng ban ${selectedDept}`;
                        const result = await performCreate(newOrgName, description, [], username);

                        setShowCreateModal(false);
                        alert(`✅ Đã tạo sơ đồ: ${newOrgName}`);
                        if (result?.orgchart_id) setOrgId(result.orgchart_id);
                    } catch (e: any) {
                        alert(`❌ Lỗi tạo sơ đồ: ${e.message}`);
                    }
                }
            } else {
                alert(`❌ Lỗi tạo sơ đồ: ${err.message || err}`);
            }
        }
    };

    const handleDelete = async () => {
        if (!orgId) {
            alert("❌ Vui lòng chọn hồ sơ để xóa");
            return;
        }

        const orgToDelete = orgList.find(org => org.orgchart_id === orgId);
        const confirmMsg = `⚠️ Bạn có chắc chắn muốn xóa hồ sơ "${orgToDelete?.orgchart_name}"?\n\nHành động này không thể hoàn tác!`;

        if (!confirm(confirmMsg)) return;

        try {
            await deleteOrgChart(orgId);
            alert("✅ Đã xóa hồ sơ thành công!");

            // Clean up
            if (chartInstance.current) {
                chartInstance.current.destroy();
                chartInstance.current = null;
            }
            setOrgId("");
            setHasChanges(false);
        } catch (err: any) {
            alert(`❌ Lỗi xóa hồ sơ: ${err.message}`);
        }
    };

    // --- State for Folder Explorer ---
    const [explorerPath, setExplorerPath] = useState<'root' | 'personal' | 'public'>('root');
    // activeTab is now derived from explorerPath for compatibility with filtering, 
    // or we just use explorerPath directly.
    const activeTab = explorerPath === 'public' ? 'public' : 'personal';


    const filteredOrgList = orgList.filter(org => {
        if (activeTab === 'personal') {
            // Personal: Created by current user
            return org.username === username;
        } else {
            // Public: is_public is true (and maybe not created by self? or all public?)
            // Usually "Public" means visible to everyone. 
            // If I created it and it's public, it should probably show in Personal too, or both?
            // Requirement: "Personal ... seen by user", "Public ... seen by everyone"
            // Let's toggle: Personal = mine. Public = is_public=true.
            return org.is_public === true;
        }
    });

    // --- Render ---

    if (loadingList || groupsLoading)
        return (
            <div className="fixed inset-0 z-50 bg-white flex items-center justify-center">
                <LoadingScreen />
            </div>
        );

    return (
        <div className="flex h-screen w-full flex-col bg-slate-50 font-sans text-slate-900">

            {/* HEADER removed tabs, cleaned up layout */}


            {orgId && (
                <CustomizeHeader
                    orgList={filteredOrgList}
                    orgId={orgId}
                    setOrgId={setOrgId}
                    lastSaveTime={lastSaveTime}
                    hasChanges={hasChanges}
                    loadingChart={loadingChart}
                    onReload={() => loadChartData(orgId)}
                    onDelete={handleDelete}
                    onOpenCreateModal={() => setShowCreateModal(true)}
                    onSave={saveChart}
                    isSaving={isSaving}
                    onAddDepartment={() => addDepartment && addDepartment(null)}
                    onAddEmployee={() => addEmployee && addEmployee(null)}
                    onAddDescriptionTable={addDescriptionTable}
                    isPublic={isPublic}
                    onTogglePublic={(val) => {
                        setIsPublic(val);
                        setHasChanges(true);
                    }}
                />
            )}

            {/* ===== MAIN CONTENT ===== */}
            <main className="relative flex-1 overflow-hidden bg-slate-50">

                {/* Folder Explorer State */}
                {!orgId && !loadingChart && (
                    <div className="absolute inset-0 z-20 flex flex-col p-8 overflow-y-auto">

                        {/* BREADCRUMB / TITLE */}
                        <div className="flex items-center justify-between mb-6">
                            <div className="flex items-center gap-2 text-xl font-semibold text-slate-700">
                                {explorerPath === 'root' ? (
                                    <span>Organization Charts</span>
                                ) : (
                                    <div className="flex items-center gap-2">
                                        <button onClick={() => setExplorerPath('root')} className="hover:underline text-slate-500">
                                            Organization Charts
                                        </button>
                                        <span className="text-slate-400">/</span>
                                        <span>{explorerPath === 'personal' ? 'Personal' : 'Public'}</span>
                                    </div>
                                )}
                            </div>

                            {/* New Item Button - Visible in Root (defaults to personal) or Personal folder */}
                            {(explorerPath === 'root' || explorerPath === 'personal') && (
                                <button
                                    onClick={() => setShowCreateModal(true)}
                                    className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-md hover:bg-indigo-700 transition-colors shadow-sm"
                                >
                                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                                    </svg>
                                    New Org Chart
                                </button>
                            )}
                        </div>

                        {/* FOLDER TABLE */}
                        <div className="w-full bg-white rounded-lg border border-slate-200 shadow-sm">
                            {/* Table Header */}
                            <div className="grid grid-cols-12 gap-4 px-6 py-3 border-b border-slate-100 bg-slate-50 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                                <div className="col-span-5 flex items-center gap-2">
                                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                                    Name
                                </div>
                                <div className="col-span-2">Type</div>
                                <div className="col-span-2">Owner</div>
                                <div className="col-span-2">Modified</div>
                                <div className="col-span-1"></div>
                            </div>

                            {/* Table Body */}
                            <div className="divide-y divide-slate-100">
                                {explorerPath === 'root' && (
                                    <>
                                        {/* PERSONAL FOLDER */}
                                        <div
                                            onClick={() => setExplorerPath('personal')}
                                            className="grid grid-cols-12 gap-4 px-6 py-4 cursor-pointer hover:bg-slate-50 transition-colors group items-center"
                                        >
                                            <div className="col-span-5 flex items-center gap-3">
                                                {/* Yellow Folder Icon */}
                                                <svg viewBox="0 0 20 20" fill="currentColor" className="w-8 h-8 text-yellow-400">
                                                    <path d="M2 6a2 2 0 012-2h5l2 2h5a2 2 0 012 2v6a2 2 0 01-2 2H4a2 2 0 01-2-2V6z" />
                                                </svg>
                                                <span className="font-medium text-slate-700 group-hover:text-indigo-600 transition-colors">Personal</span>
                                            </div>
                                            <div className="col-span-2 text-sm text-slate-500">Folder</div>
                                            <div className="col-span-2 text-sm text-slate-500">{username}</div>
                                            <div className="col-span-2 text-sm text-slate-400">—</div>
                                            <div className="col-span-1"></div>
                                        </div>

                                        {/* PUBLIC FOLDER */}
                                        <div
                                            onClick={() => setExplorerPath('public')}
                                            className="grid grid-cols-12 gap-4 px-6 py-4 cursor-pointer hover:bg-slate-50 transition-colors group items-center"
                                        >
                                            <div className="col-span-5 flex items-center gap-3">
                                                <svg viewBox="0 0 20 20" fill="currentColor" className="w-8 h-8 text-yellow-400">
                                                    <path d="M2 6a2 2 0 012-2h5l2 2h5a2 2 0 012 2v6a2 2 0 01-2 2H4a2 2 0 01-2-2V6z" />
                                                </svg>
                                                <span className="font-medium text-slate-700 group-hover:text-indigo-600 transition-colors">Public</span>
                                            </div>
                                            <div className="col-span-2 text-sm text-slate-500">Folder</div>
                                            <div className="col-span-2 text-sm text-slate-500">System</div>
                                            <div className="col-span-2 text-sm text-slate-400">—</div>
                                            <div className="col-span-1"></div>
                                        </div>
                                    </>
                                )}

                                {explorerPath !== 'root' && filteredOrgList.length === 0 && (
                                    <div className="px-6 py-8 text-center text-slate-500 italic">
                                        No charts found in this folder.
                                    </div>
                                )}

                                {explorerPath !== 'root' && filteredOrgList.map((org) => (
                                    <div
                                        key={org.orgchart_id}
                                        onClick={() => setOrgId(org.orgchart_id)}
                                        className="grid grid-cols-12 gap-4 px-6 py-4 cursor-pointer hover:bg-slate-50 transition-colors group items-center"
                                    >
                                        <div className="col-span-5 flex items-center gap-3">
                                            {/* File Icon */}
                                            <svg className="w-8 h-8 text-indigo-200 group-hover:text-indigo-400 transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                            </svg>
                                            <span className="font-medium text-slate-700 group-hover:text-indigo-600 transition-colors truncate">
                                                {org.orgchart_name || "Untitled Chart"}
                                            </span>
                                        </div>
                                        <div className="col-span-2 text-sm text-slate-500">Org Chart</div>
                                        <div className="col-span-2 text-sm text-slate-500 truncate">{org.username || "Unknown"}</div>
                                        <div className="col-span-2 text-sm text-slate-400">
                                            {org.created_at ? new Date(org.created_at).toLocaleDateString() : "—"}
                                        </div>
                                        <div className="col-span-1 flex justify-end">
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    // Use existing handleDelete but we need to set orgId first? 
                                                    // existing handleDelete uses `orgId` state. 
                                                    // We should modify handleDelete to accept an ID or create a new wrapper.
                                                    // Let's create a wrapper here or update handleDelete.
                                                    // Updating handleDelete is cleaner but I don't want to break Header usage.
                                                    // Actually, Header usage `handleDelete` relies on `orgId`.
                                                    // So I'll just use a local confirmation here.
                                                    if (confirm(`Delete "${org.orgchart_name}"?`)) {
                                                        deleteOrgChart(org.orgchart_id);
                                                    }
                                                }}
                                                className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-full transition-colors opacity-0 group-hover:opacity-100"
                                                title="Delete Chart"
                                            >
                                                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                                </svg>
                                            </button>
                                        </div>
                                    </div>
                                ))}

                            </div>
                        </div>
                    </div>
                )}

                {/* Chart Container */}
                <div
                    ref={chartRef}
                    className={`${styles.treeContainer} relative z-10 h-full w-full`}
                    style={{ visibility: orgId ? 'visible' : 'hidden' }}
                />

                {/* Loading Overlay for Chart Operations */}
                {loadingChart && (
                    <div className="absolute inset-0 z-30 flex items-center justify-center bg-white/50 backdrop-blur-[2px]">
                        <div className="flex flex-col items-center rounded-xl bg-white p-6 shadow-xl ring-1 ring-black/5">
                            <div className="mb-3 h-10 w-10 animate-spin rounded-full border-4 border-indigo-100 border-t-indigo-600"></div>
                            <span className="text-sm font-semibold text-slate-600">Loading chart data...</span>
                        </div>
                    </div>
                )}
            </main>

            <CreateProfileModal
                isOpen={showCreateModal}
                onClose={() => setShowCreateModal(false)}
                onCreate={handleCreateOrgChart}
                groups={groups}
            />

            <EditNodeModal
                isOpen={editModalOpen}
                onClose={() => setEditModalOpen(false)}
                onSave={handleSaveNode}
                onDelete={(nodeId) => {
                    removeNode(nodeId);
                    setEditModalOpen(false);
                }}
                nodeData={selectedNodeDataForEdit}
                allNodes={allNodes}
            />
        </div>
    );
};

export default CustomizeClient;
