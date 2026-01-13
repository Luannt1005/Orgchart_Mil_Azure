'use client';

import { useEffect, useRef, useState, useCallback } from "react";
import OrgChart from "@/lib/orgchart";
import { useOrgData } from "@/hooks/useOrgData";
import LoadingScreen from "@/components/loading-screen";
import { patchOrgChartTemplates } from "../Orgchart/OrgChartTemplates";
import styles from "../Orgchart/OrgChart.module.css";

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

      // Read body as text ONCE to avoid "body stream already read" error
      const responseText = await response.text();

      // Try to parse as JSON
      let res: any = null;
      try {
        res = JSON.parse(responseText);
      } catch {
        // Not valid JSON
        res = null;
      }

      // Handle 404 - orgchart not found (might have been deleted)
      if (response.status === 404) {
        console.warn(`Orgchart ${selectedOrgId} not found, it may have been deleted.`);
        fetchOrgList();
        setOrgId("");
        return;
      }

      // Handle other errors
      if (!response.ok) {
        let errorMessage = `Failed to fetch chart: ${response.status} ${response.statusText}`;
        if (res && res.error) {
          errorMessage += ` - ${res.error}`;
        }
        if (res && res.details) {
          console.error("Server Error Details:", res.details);
        }
        if (!res && responseText) {
          errorMessage += ` (${responseText.substring(0, 100)})`;
        }
        throw new Error(errorMessage);
      }

      // Success - use the parsed JSON
      if (!res) {
        throw new Error("Invalid JSON response from server");
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


      const addDepartment = (nodeId: string) => {
        const chart = chartInstance.current;
        if (!chart) return;

        // Generate a safe unique ID that doesn't start with "_" (to avoid being filtered out as internal)
        const newId = `dept_${Date.now()}`;
        const data = {
          id: newId,
          pid: nodeId,
          stpid: null,
          name: "New Department",
          title: "Department",
          image: null,
          tags: ["group"],
          orig_pid: nodeId,
          dept: null,
          BU: null,
          type: "group",
          location: null,
          description: "",
          joiningDate: ""
        };

        chart.addNode(data);
      };

      const addEmployee = (nodeId: string) => {
        const chart = chartInstance.current;
        if (!chart) return;

        const newId = `emp_${Date.now()}`;
        const data = {
          id: newId,
          pid: nodeId,
          stpid: null,
          name: "New Employee",
          title: "Position",
          image: "",
          tags: [],
          orig_pid: nodeId,
          dept: null,
          BU: null,
          description: "",
          // joiningDate: new Date().toISOString().split('T')[0] // Optional
        };

        chart.addNode(data);
      };

      const removeNode = (nodeId: string) => {
        const chart = chartInstance.current;
        if (!chart) return;

        try {
          // Workaround for "Cannot read properties of null (reading 'id') at OrgChart.updateNode"
          // We manually remove the node data and redraw, avoiding the problematic internal removeNode flow
          if (typeof chart.remove === 'function') {
            chart.remove(nodeId);

            // Update filter UI (search results) if available
            if (chart.filterUI && typeof chart.filterUI.update === 'function') {
              chart.filterUI.update();
            }

            chart.draw(OrgChart.action.update);
            setHasChanges(true);
          } else {
            // Fallback
            chart.removeNode(nodeId);
          }
        } catch (error) {
          console.error("Error removing node:", error);
        }
      };

      chartInstance.current = new OrgChart(chartRef.current, {
        template: "big",
        enableDragDrop: true,
        nodeBinding: {
          field_0: "name",
          field_1: "title",
          img_0: "img"
        },
        nodeMenu: {
          addDepartment: {
            text: "Add new department",
            icon: OrgChart.icon.add(24, 24, "#7A7A7A"),
            onClick: addDepartment,
          },
          addEmployee: {
            text: "Add new employee",
            icon: OrgChart.icon.add(24, 24, "#7A7A7A"),
            onClick: addEmployee,
          },
          details: { text: "Details" },
          edit: { text: "Edit" },
          remove: {
            text: "Remove",
            icon: OrgChart.icon.remove(24, 24, "#7A7A7A"),
            onClick: removeNode
          }
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


      // Handle drag-drop event
      chartInstance.current.on('drop', (sender: any, draggedNodeId: any, droppedNodeId: any) => {
        const draggedNode = sender.getNode(draggedNodeId);
        const droppedNode = sender.getNode(droppedNodeId);

        if (!draggedNode || !draggedNode.id) return;
        if (!droppedNode || !droppedNode.id) return;

        // Check if dropping employee onto a department (group)
        const droppedTags = Array.isArray(droppedNode.tags) ? droppedNode.tags : [];
        const draggedTags = Array.isArray(draggedNode.tags) ? draggedNode.tags : [];

        if (droppedTags.includes("group") && !draggedTags.includes("group")) {
          // Use setTimeout to override AFTER default behavior sets pid
          setTimeout(() => {
            const draggedNodeData = sender.get(draggedNode.id);

            // Override: set stpid to the group node, clear pid
            draggedNodeData.stpid = droppedNode.id;
            draggedNodeData.pid = undefined;

            // Update the node with our custom changes
            sender.updateNode(draggedNodeData);

            console.log('📦 Moved employee to department via stpid:', {
              employee: draggedNode.id,
              department: droppedNode.id,
              finalData: sender.get(draggedNode.id)
            });
          }, 0);

          setHasChanges(true);
          return false;
        }

        // For all other drops, mark as changed
        setHasChanges(true);
      });

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
  if (loading || groupsLoading)
    return (
      <div className="fixed inset-0 z-50 bg-white flex items-center justify-center">
        <LoadingScreen />
      </div>
    );

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

      if (!deptRes.ok) throw new Error("Failed to fetch department data");
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

      if (!response.ok) {
        const errText = await response.text();
        let errMessage = "Create failed";
        try {
          const errJson = JSON.parse(errText);
          errMessage = errJson.error || errMessage;
        } catch (e) {
          errMessage += `: ${errText.substring(0, 50)}`;
        }
        throw new Error(errMessage);
      }

      const result = await response.json();

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
      // Improved node extraction logic
      const nodesToSave: any[] = [];
      const nodesMap = chart.nodes || {};

      // Iterate safely over all keys in nodesMap
      Object.keys(nodesMap).forEach(id => {
        // Skip internal nodes (usually start with _)
        if (id.toString().startsWith("_")) {
          console.log("Skipping internal node:", id);
          return;
        }

        const fullData = chart.get(id);
        if (!fullData) return;

        const cleanData: any = {};

        // Copy only data properties, skip internal props and functions
        Object.keys(fullData).forEach(key => {
          if (!key.startsWith("_") && typeof fullData[key] !== "function") {
            cleanData[key] = fullData[key];
          }
        });

        // Ensure critical fields are handled
        if (cleanData.pid === "") cleanData.pid = null;
        if (cleanData.stpid === "") cleanData.stpid = null;

        // Ensure tags are arrays
        if (cleanData.tags && typeof cleanData.tags === 'string') {
          try { cleanData.tags = JSON.parse(cleanData.tags); } catch { }
        }

        nodesToSave.push(cleanData);
      });

      console.log(`🔍 Found ${nodesToSave.length} nodes to save.`); // Debug log

      if (nodesToSave.length === 0 && chart.config?.nodes) {
        // Fallback: If for some reason nodesMap is empty, try config.nodes (but properly)
        // ... (keep fallback logic if deemed necessary, or just rely on nodesMap if sure)
        const fallbackNodes = chart.config.nodes.map((n: any) => {
          const clean: any = {};
          Object.keys(n).forEach(key => {
            if (!key.startsWith("_") && typeof n[key] !== "function") clean[key] = n[key];
          });
          return clean;
        });
        nodesToSave.push(...fallbackNodes);
      }

      await performSave(nodesToSave);
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

    if (!response.ok) {
      let errMessage = `Failed to save: ${response.status} ${response.statusText}`;
      try {
        const errText = await response.text();
        try {
          const errJson = JSON.parse(errText);
          if (errJson.error) errMessage = errJson.error;
        } catch {
          if (errText) errMessage += ` (${errText.substring(0, 50)})`;
        }
      } catch { }
      throw new Error(errMessage);
    }

    const result = await response.json();

    if (result.success) {
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

      if (!response.ok) {
        throw new Error(`Delete failed: ${response.status} ${response.statusText}`);
      }

      const result = await response.json();

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
    <div className="flex h-screen w-full flex-col bg-slate-50 font-sans text-slate-900">

      {/* ===== HEADER (Modern & Clean) ===== */}
      <header className="z-30 flex h-16 shrink-0 items-center justify-between border-b border-slate-200 bg-white px-6 shadow-sm">
        {/* Left: Title & Profile Selector */}
        <div className="flex items-center gap-6">
          <div className="flex flex-col">
            <h1 className="text-lg font-bold text-slate-800 leading-tight">Customize Org Chart</h1>
            <p className="text-[11px] font-medium text-slate-500">Design & Edit Structures</p>
          </div>

          <div className="h-8 w-px bg-slate-200"></div>

          <div className="flex flex-col">
            <label className="mb-1 text-[10px] font-bold uppercase tracking-wider text-slate-400">Current Profile</label>
            <select
              value={orgId}
              onChange={(e) => setOrgId(e.target.value)}
              className="h-9 min-w-[240px] rounded-lg border border-slate-200 bg-slate-50 px-3 text-sm font-semibold text-slate-700 outline-none transition-all hover:border-slate-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
            >
              <option value="">-- Select a Profile --</option>
              {orgList.map((org) => (
                <option key={org.orgchart_id} value={org.orgchart_id}>
                  {org.orgchart_name}
                </option>
              ))}
            </select>
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

          {/* Action Buttons */}
          <button
            onClick={() => loadChartData(orgId)}
            disabled={loadingChart || !orgId}
            className="flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600 transition-colors hover:bg-slate-50 hover:text-slate-900 disabled:opacity-50"
            title="Reload Chart"
          >
            <svg className={`h-4 w-4 ${loadingChart ? 'animate-spin' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
          </button>

          <button
            onClick={handleDelete}
            disabled={!orgId}
            className="flex h-9 w-9 items-center justify-center rounded-lg border border-red-100 bg-red-50 text-red-500 transition-colors hover:border-red-200 hover:bg-red-100 disabled:opacity-40"
            title="Delete Profile"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
          </button>

          <div className="h-8 w-px bg-slate-200 mx-1"></div>

          <button
            onClick={() => setShowCreateModal(true)}
            className="flex h-9 items-center gap-2 rounded-lg bg-indigo-600 px-4 text-sm font-semibold text-white shadow-sm hover:bg-indigo-700 transition-all active:scale-95"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            New Profile
          </button>

          <button
            onClick={handleSave}
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
            Save Changes
          </button>
        </div>
      </header>

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

      {/* ===== CREATE MODAL ===== */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="w-full max-w-lg overflow-hidden rounded-2xl bg-white shadow-2xl ring-1 ring-black/5 animate-in zoom-in-95 duration-200">
            {/* Modal Header */}
            <div className="border-b border-slate-100 bg-slate-50/50 px-6 py-4 flex justify-between items-center">
              <div>
                <h3 className="text-lg font-bold text-slate-800">Create New Profile</h3>
                <p className="text-xs text-slate-500">Duplicate from existing department</p>
              </div>
              <button
                onClick={() => setShowCreateModal(false)}
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
                onClick={() => setShowCreateModal(false)}
                className="flex-1 rounded-lg border border-slate-200 bg-white py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                onClick={handleCreateOrgChart}
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
      )}
    </div>
  );
};

export default Customize;
