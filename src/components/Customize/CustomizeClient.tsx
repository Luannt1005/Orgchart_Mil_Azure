'use client';

import { useEffect, useRef, useState, useCallback } from "react";
import { useOrgData } from "@/hooks/useOrgData";
import LoadingScreen from "@/components/loading-screen";
import styles from "../../app/Orgchart/OrgChart.module.css";
import CustomizeHeader from "./CustomizeHeader";
import CreateProfileModal from "./CreateProfileModal";
import { useOrgProfileManager } from "@/hooks/useOrgProfileManager";
import { useOrgChartEditor } from "@/hooks/useOrgChartEditor";

const CustomizeClient = () => {
    const chartRef = useRef<HTMLDivElement>(null);
    const { groups, loading: groupsLoading } = useOrgData();

    // State Hooks
    const [user, setUser] = useState<any>(null);
    const [orgId, setOrgId] = useState<string>("");
    const [showCreateModal, setShowCreateModal] = useState(false);

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

    const handleChartNotFound = useCallback(() => {
        fetchOrgList();
        setOrgId("");
    }, [fetchOrgList]);

    const {
        loadChartData,
        saveChart,
        loadingChart,
        isSaving,
        lastSaveTime,
        hasChanges,
        setHasChanges,
        chartInstance
    } = useOrgChartEditor(
        chartRef,
        orgId,
        username,
        handleChartNotFound
    );

    // --- Handlers ---

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

    // --- Render ---

    if (loadingList || groupsLoading)
        return (
            <div className="fixed inset-0 z-50 bg-white flex items-center justify-center">
                <LoadingScreen />
            </div>
        );

    return (
        <div className="flex h-screen w-full flex-col bg-slate-50 font-sans text-slate-900">

            <CustomizeHeader
                orgList={orgList}
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
            />

            {/* ===== MAIN CONTENT ===== */}
            <main className="relative flex-1 overflow-hidden bg-slate-50">

                {/* Empty State */}
                {!orgId && !loadingChart && (
                    <div className="absolute inset-0 z-20 flex items-center justify-center p-4">
                        <div className="flex flex-col items-center text-center max-w-md">
                            <div className="mb-6 rounded-full bg-white p-6 shadow-md shadow-slate-200 ring-1 ring-slate-100">
                                <svg className="h-16 w-16 text-indigo-200" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                                </svg>
                            </div>
                            <h2 className="mb-2 text-2xl font-bold text-slate-800">Select or Create a Profile</h2>
                            <p className="text-slate-500">
                                Start by selecting an existing chart profile from the dropdown above, or create a new one to begin customization.
                            </p>
                        </div>
                    </div>
                )}

                {/* Chart Container */}
                <div ref={chartRef} className={`${styles.treeContainer} relative z-10 h-full w-full`} />

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
        </div>
    );
};

export default CustomizeClient;
