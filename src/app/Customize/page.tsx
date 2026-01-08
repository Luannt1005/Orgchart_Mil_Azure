'use client';

import { useEffect, useRef, useState, useCallback } from "react";
import OrgChart from "@/lib/orgchart";
import { useOrgData } from "@/hooks/useOrgData";
import LoadingScreen from "@/components/loading-screen";
import { patchOrgChartTemplates } from "../Orgchart/OrgChartTemplates";
import "../Orgchart/OrgChart.css";

const Customize = () => {
  const chartRef = useRef<HTMLDivElement>(null);
  const chartInstance = useRef<any>(null);
  const originalNodesRef = useRef<any[]>([]);
  const { groups, loading: groupsLoading } = useOrgData();

  // State Hooks (MUST be at top level)
  const [user, setUser] = useState<any>(null);
  const [orgId, setOrgId] = useState<string>("");
  const [orgList, setOrgList] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingChart, setLoadingChart] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [lastSaveTime, setLastSaveTime] = useState<string | null>(null);
  const [hasChanges, setHasChanges] = useState(false);

  // Modal states
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [creatingOrg, setCreatingOrg] = useState(false);
  const [newOrgName, setNewOrgName] = useState("");
  const [newOrgDesc, setNewOrgDesc] = useState("");
  const [selectedDept, setSelectedDept] = useState("");

  const username = user?.username || "admin";

  useEffect(() => {
    const storedUser = localStorage.getItem("user");
    if (storedUser) {
      try {
        setUser(JSON.parse(storedUser));
      } catch (e) {
        console.error("Failed to parse user", e);
      }
    }
  }, []);

  /* ================= LOAD USER'S CUSTOM ORGCHARTS ================= */
  const fetchOrgList = useCallback(async () => {
    if (!username) return;
    try {
      const response = await fetch(`/api/orgcharts?username=${username}`);
      if (!response.ok) throw new Error("Failed to fetch orgcharts");
      const data = await response.json();
      setOrgList(data.orgcharts || []);
      // Don't auto-select first chart - let user choose
    } catch (err) {
      console.error("❌ Load orgcharts error:", err);
    } finally {
      setLoading(false);
    }
  }, [username]);

  useEffect(() => {
    fetchOrgList();
  }, [fetchOrgList]);

  /* ================= LOAD CHART DATA ================= */
  const loadChartData = useCallback(async (selectedOrgId: string) => {
    if (!selectedOrgId) return;
    setLoadingChart(true);
    try {
      const response = await fetch(`/api/orgcharts/${selectedOrgId}`);
      const res = await response.json();

      // Handle 404 - orgchart not found (might have been deleted)
      if (response.status === 404) {
        console.warn(`Orgchart ${selectedOrgId} not found, it may have been deleted.`);
        // Refresh the list to remove stale entries
        fetchOrgList();
        setOrgId("");
        return;
      }

      // Handle other errors
      if (!response.ok) {
        console.error(`API error ${response.status}:`, res.error);
        throw new Error(res.error || "Failed to fetch orgchart");
      }

      const nodesData = res.org_data?.data || [];
      originalNodesRef.current = nodesData;

      const chartNodes = nodesData.map((n: any) => ({
        ...n,
        tags: Array.isArray(n.tags)
          ? n.tags
          : typeof n.tags === 'string'
            ? JSON.parse(n.tags || '[]')
            : [],
        img: n.img || n.photo || n.image || "",
      }));

      if (chartInstance.current) {
        chartInstance.current.destroy();
        chartInstance.current = null;
      }

      if (!chartRef.current) return;

      patchOrgChartTemplates();


      chartInstance.current = new OrgChart(chartRef.current, {
        template: "big",
        enableDragDrop: true,
        nodeBinding: {
          field_0: "name",
          field_1: "title",
          img_0: "img"
        },
        nodeMenu: {
          details: { text: "Details" },
          edit: { text: "Edit" },
          add: { text: "Add" },
          remove: { text: "Remove" }
        },
        tags: {
          group: {
            template: "group",
          },
          Emp_probation: {
            template: "big_v2",
          },
        },
      });

      chartInstance.current.on('drop', () => setHasChanges(true));
      chartInstance.current.on('update', () => setHasChanges(true));
      chartInstance.current.on('remove', () => setHasChanges(true));
      chartInstance.current.on('add', () => setHasChanges(true));

      console.log('🏷️ Loading chart with nodes:', chartNodes);
      console.log('🏷️ Nodes with tags:', chartNodes.filter((n: any) => n.tags && n.tags.length > 0));

      chartInstance.current.load(chartNodes);
      setHasChanges(false);
      setOrgId(selectedOrgId);
    } catch (err) {
      console.error("Load chart error:", err);
      // Only show alert for unexpected errors, not 404s
      if (err instanceof Error && !err.message.includes("404")) {
        alert(`❌ Lỗi tải sơ đồ: ${err.message}`);
      }
    } finally {
      setLoadingChart(false);
    }
  }, [fetchOrgList]);

  useEffect(() => {
    if (orgId && !loading) {
      loadChartData(orgId);
    }
  }, [orgId, loading, loadChartData]);

  // Handle loading state after hooks
  if (loading || groupsLoading) return <LoadingScreen />;

  /* ================= CREATE NEW ORGCHART ================= */
  const handleCreateOrgChart = async () => {
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
      // Fetch selected department data
      const deptRes = await fetch(`/api/orgchart?dept=${encodeURIComponent(selectedDept)}`);
      const deptJson = await deptRes.json();
      const nodes = deptJson.data || [];

      if (nodes.length === 0) {
        if (!confirm("Phòng ban này không có dữ liệu. Bạn vẫn muốn tạo sơ đồ trống?")) {
          setCreatingOrg(false);
          return;
        }
      }

      // Save new orgchart to DB
      const response = await fetch("/api/orgcharts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username,
          orgchart_name: newOrgName,
          describe: newOrgDesc || `Tạo từ phòng ban ${selectedDept}`,
          org_data: { data: nodes }
        })
      });

      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Create failed");

      alert(`✅ Đã tạo sơ đồ: ${newOrgName}`);
      setShowCreateModal(false);
      setNewOrgName("");
      setNewOrgDesc("");
      setSelectedDept("");

      // Reload list and select new org
      await fetchOrgList();
      setOrgId(result.orgchart_id);
    } catch (err) {
      alert(`❌ Lỗi tạo sơ đồ: ${err instanceof Error ? err.message : err}`);
    } finally {
      setCreatingOrg(false);
    }
  };

  /* ================= SAVE CHANGES ================= */
  const handleSave = async () => {
    if (!chartInstance.current || isSaving || !orgId) {
      console.warn("Cannot save: chart instance or orgId missing", { hasChart: !!chartInstance.current, orgId });
      return;
    }

    setIsSaving(true);
    try {
      const chart = chartInstance.current;

      // Balkangraph store nodes in chart.nodes (map) or chart.config.nodes (array)
      // Different versions might behave differently, so we handle both
      const nodesMap = chart.nodes || {};
      const nodeIds = Object.keys(nodesMap).filter(id => !id.startsWith("_"));

      if (nodeIds.length === 0 && chart.config?.nodes) {
        // Fallback to config.nodes if live nodes map is empty
        const nodesToSave = chart.config.nodes.map((n: any) => {
          const clean: any = {};
          Object.keys(n).forEach(key => {
            if (!key.startsWith("_") && typeof n[key] !== "function") clean[key] = n[key];
          });
          return clean;
        });

        await performSave(nodesToSave);
      } else {
        const nodesToSave = nodeIds.map(id => {
          const fullData = chart.get(id);
          const cleanData: any = {};

          Object.keys(fullData).forEach(key => {
            if (!key.startsWith("_") && typeof fullData[key] !== "function") {
              cleanData[key] = fullData[key];
            }
          });

          if (cleanData.pid === "") cleanData.pid = null;
          if (cleanData.stpid === "") cleanData.stpid = null;

          return cleanData;
        });

        await performSave(nodesToSave);
      }
    } catch (err) {
      console.error("Save error:", err);
      alert(`❌ Lỗi lưu dữ liệu: ${err instanceof Error ? err.message : "Vui lòng thử lại"}`);
    } finally {
      setIsSaving(false);
    }
  };

  const performSave = async (nodesToSave: any[]) => {
    console.log(`Saving ${nodesToSave.length} nodes to orgchart ${orgId}`);

    const response = await fetch(`/api/orgcharts/${orgId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        org_data: { data: nodesToSave }
      })
    });

    const result = await response.json();

    if (response.ok && result.success) {
      setLastSaveTime(new Date().toLocaleTimeString());
      setHasChanges(false);
      alert("✅ Đã lưu thay đổi thành công!");
    } else {
      throw new Error(result.error || "Failed to save to database");
    }
  };

  /* ================= DELETE ORGCHART ================= */
  const handleDelete = async () => {
    if (!orgId) {
      alert("❌ Vui lòng chọn hồ sơ để xóa");
      return;
    }

    const orgToDelete = orgList.find(org => org.orgchart_id === orgId);
    const confirmMsg = `⚠️ Bạn có chắc chắn muốn xóa hồ sơ "${orgToDelete?.orgchart_name}"?\n\nHành động này không thể hoàn tác!`;

    if (!confirm(confirmMsg)) return;

    try {
      const response = await fetch(`/api/orgcharts/${orgId}`, {
        method: "DELETE",
      });

      const result = await response.json();

      if (!response.ok) throw new Error(result.error || "Delete failed");

      alert("✅ Đã xóa hồ sơ thành công!");

      // Clear current chart and reload list
      if (chartInstance.current) {
        chartInstance.current.destroy();
        chartInstance.current = null;
      }
      setOrgId("");
      setHasChanges(false);
      await fetchOrgList();
    } catch (err) {
      alert(`❌ Lỗi xóa hồ sơ: ${err instanceof Error ? err.message : err}`);
    }
  };



  return (
    <div className="w-full h-screen relative bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 flex flex-col overflow-hidden pt-4">
      {/* Header Toolbar - Dark Theme for Better Visibility */}
      <div className="z-20 bg-gray-900/95 border-b border-gray-700 backdrop-blur-md px-6 py-4 flex items-center justify-between shadow-xl">
        <div className="flex items-center gap-4">
          <div className="flex flex-col">
            <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest leading-none mb-2">Hồ sơ tùy chỉnh</label>
            <select
              value={orgId}
              onChange={(e) => setOrgId(e.target.value)}
              className="bg-gray-800 border border-gray-600 rounded-lg px-4 py-2.5 text-sm font-semibold text-white focus:outline-none focus:ring-2 focus:ring-red-500 min-w-[280px] shadow-lg"
            >
              <option value="">-- Chọn hồ sơ --</option>
              {orgList.map((org) => (
                <option key={org.orgchart_id} value={org.orgchart_id}>
                  {org.orgchart_name}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => loadChartData(orgId)}
              disabled={loadingChart || !orgId}
              className="p-2.5 bg-gray-700 border border-gray-600 rounded-lg hover:bg-gray-600 text-white transition-colors shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
              title="Tải lại"
            >
              <svg className={`w-5 h-5 ${loadingChart ? 'animate-spin' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
            </button>

            <button
              onClick={handleDelete}
              disabled={!orgId}
              className="p-2.5 bg-red-900/50 border border-red-800 rounded-lg hover:bg-red-900 text-red-300 hover:text-white transition-colors shadow-lg disabled:opacity-30 disabled:cursor-not-allowed"
              title="Xóa hồ sơ"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
            </button>

            <button
              onClick={() => setShowCreateModal(true)}
              className="flex items-center gap-2 px-5 py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-lg text-sm font-bold transition-all shadow-lg shadow-red-900/50"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" />
              </svg>
              Tạo mới
            </button>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div className="text-right flex flex-col items-end">
            {lastSaveTime && (
              <span className="text-[10px] text-green-400 font-bold uppercase tracking-tighter">Lưu cuối: {lastSaveTime}</span>
            )}
            {hasChanges && (
              <span className="text-[10px] text-orange-400 font-bold animate-pulse">● Có thay đổi chưa lưu</span>
            )}
          </div>
          <button
            onClick={handleSave}
            disabled={isSaving || !orgId || !hasChanges}
            className={`flex items-center gap-2 px-6 py-2.5 rounded-xl font-bold text-sm transition-all ${hasChanges && orgId
              ? "bg-white text-gray-900 shadow-2xl hover:scale-105"
              : "bg-gray-700 text-gray-500 cursor-not-allowed"
              }`}
          >
            {isSaving ? (
              <div className="w-4 h-4 border-2 border-gray-900 border-t-transparent rounded-full animate-spin"></div>
            ) : (
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" />
              </svg>
            )}
            Lưu hồ sơ
          </button>
        </div>
      </div>

      {/* Main Chart Area */}
      <div className="flex-1 relative">

        {/* Empty State */}
        {!orgId && !loadingChart && (
          <div className="absolute inset-0 z-20 flex items-center justify-center">
            <div className="text-center space-y-6">
              <div className="w-24 h-24 mx-auto bg-gray-800/50 rounded-full flex items-center justify-center border-4 border-gray-700">
                <svg className="w-12 h-12 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <div>
                <h3 className="text-2xl font-black text-white mb-2">Chọn hoặc tạo hồ sơ</h3>
                <p className="text-gray-400 text-sm max-w-md mx-auto leading-relaxed">
                  Chọn một hồ sơ hiện có từ dropdown phía trên,<br />hoặc tạo hồ sơ mới để bắt đầu tùy chỉnh sơ đồ tổ chức.
                </p>
              </div>
            </div>
          </div>
        )}

        <div ref={chartRef} className="w-full h-full relative z-10" />

        {loadingChart && (
          <div className="absolute inset-0 z-30 flex items-center justify-center bg-gray-900/80 backdrop-blur-sm">
            <div className="flex flex-col items-center">
              <div className="w-16 h-16 border-4 border-red-600 border-t-transparent rounded-full animate-spin mb-4"></div>
              <p className="text-white font-bold text-lg animate-pulse">Đang tải dữ liệu sơ đồ...</p>
            </div>
          </div>
        )}
      </div>

      {/* Create Modal - Redesigned */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-md animate-in fade-in duration-300">
          <div className="bg-gray-800 rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300 border border-gray-700">
            <div className="bg-gradient-to-r from-red-600 to-red-700 px-8 py-6 text-white relative">
              <h2 className="text-2xl font-black uppercase tracking-tight">Tạo hồ sơ mới</h2>
              <p className="text-red-100 text-xs font-medium uppercase tracking-widest mt-1">Customized Orgchart Profile</p>
              <button
                onClick={() => setShowCreateModal(false)}
                className="absolute top-6 right-6 text-white/80 hover:text-white transition-colors"
              >
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="p-8 space-y-6 bg-gray-800">
              <div className="space-y-3">
                <label className="block text-xs font-bold text-gray-300 uppercase tracking-widest">Tên hồ sơ sơ đồ</label>
                <input
                  type="text"
                  value={newOrgName}
                  onChange={e => setNewOrgName(e.target.value)}
                  placeholder="Ví dụ: Team Project A, Lãnh đạo cấp cao..."
                  className="w-full px-4 py-3 bg-gray-900 border border-gray-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent transition-all text-sm font-semibold text-white placeholder-gray-500"
                />
              </div>

              <div className="space-y-3">
                <label className="block text-xs font-bold text-gray-300 uppercase tracking-widest">Khởi tạo từ phòng ban</label>
                <select
                  value={selectedDept}
                  onChange={e => setSelectedDept(e.target.value)}
                  className="w-full px-4 py-3 bg-gray-900 border border-gray-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent transition-all text-sm font-semibold text-white"
                >
                  <option value="">-- Chọn phòng ban mẫu --</option>
                  {groups.map(dept => (
                    <option key={dept} value={dept}>{dept}</option>
                  ))}
                </select>
                <p className="text-[10px] text-gray-400 font-medium leading-relaxed">
                  Hệ thống sẽ sao chép cấu trúc hiện tại của phòng ban này vào hồ sơ mới của bạn.
                </p>
              </div>

              <div className="space-y-3">
                <label className="block text-xs font-bold text-gray-300 uppercase tracking-widest">Ghi chú / Mô tả</label>
                <textarea
                  value={newOrgDesc}
                  onChange={e => setNewOrgDesc(e.target.value)}
                  placeholder="Mô tả mục đích sử dụng hồ sơ này..."
                  rows={3}
                  className="w-full px-4 py-3 bg-gray-900 border border-gray-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent transition-all text-sm font-semibold text-white placeholder-gray-500 resize-none"
                />
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  onClick={() => setShowCreateModal(false)}
                  className="flex-1 px-6 py-3 bg-gray-700 hover:bg-gray-600 text-white rounded-xl font-bold transition-all"
                >
                  Hủy bỏ
                </button>
                <button
                  onClick={handleCreateOrgChart}
                  disabled={creatingOrg || !newOrgName.trim() || !selectedDept}
                  className="flex-[2] px-6 py-3 bg-red-600 hover:bg-red-700 disabled:bg-gray-700 disabled:text-gray-500 text-white rounded-xl font-bold shadow-lg shadow-red-900/30 transition-all flex items-center justify-center gap-2"
                >
                  {creatingOrg ? (
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  ) : "Khởi tạo ngay"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Customize;
