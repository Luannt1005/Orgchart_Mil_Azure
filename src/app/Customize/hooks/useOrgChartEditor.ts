import { useEffect, useRef, useState, useCallback, RefObject } from "react";
import OrgChart from "@/lib/orgchart";
import { patchOrgChartTemplates } from "@/app/Orgchart/OrgChartTemplates";

export function useOrgChartEditor(
    chartContainerRef: RefObject<HTMLDivElement | null>,
    orgId: string,
    username: string,
    onChartNotFound?: () => void
) {
    const chartInstance = useRef<any>(null);
    const originalNodesRef = useRef<any[]>([]);

    const [loadingChart, setLoadingChart] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [lastSaveTime, setLastSaveTime] = useState<string | null>(null);
    const [hasChanges, setHasChanges] = useState(false);

    /* ================= LOAD CHART DATA ================= */
    const loadChartData = useCallback(async (selectedOrgId: string) => {
        if (!selectedOrgId) return;
        setLoadingChart(true);
        try {
            const response = await fetch(`/api/orgcharts/${selectedOrgId}`);

            // Read body as text ONCE
            const responseText = await response.text();

            let res: any = null;
            try {
                res = JSON.parse(responseText);
            } catch {
                res = null;
            }

            // Handle 404
            if (response.status === 404) {
                console.warn(`Orgchart ${selectedOrgId} not found.`);
                if (onChartNotFound) onChartNotFound();
                return;
            }

            // Handle other errors
            if (!response.ok) {
                let errorMessage = `Failed to fetch chart: ${response.status} ${response.statusText}`;
                if (res && res.error) errorMessage += ` - ${res.error}`;
                if (!res && responseText) errorMessage += ` (${responseText.substring(0, 100)})`;
                throw new Error(errorMessage);
            }

            if (!res) throw new Error("Invalid JSON response from server");

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

            if (!chartContainerRef.current) return;

            patchOrgChartTemplates();

            // --- Define Chart Actions ---
            const addDepartment = (nodeId: string) => {
                const chart = chartInstance.current;
                if (!chart) return;
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
                };
                chart.addNode(data);
            };

            const removeNode = (nodeId: string) => {
                const chart = chartInstance.current;
                if (!chart) return;
                try {
                    if (typeof chart.remove === 'function') {
                        chart.remove(nodeId);
                        if (chart.filterUI && typeof chart.filterUI.update === 'function') {
                            chart.filterUI.update();
                        }
                        chart.draw(OrgChart.action.update);
                        setHasChanges(true);
                    } else {
                        chart.removeNode(nodeId);
                    }
                } catch (error) {
                    console.error("Error removing node:", error);
                }
            };

            // --- Initialize Chart ---
            chartInstance.current = new OrgChart(chartContainerRef.current, {
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
                    group: { template: "group" },
                    Emp_probation: { template: "big_v2" },
                },
            });

            // --- Bind Events ---
            chartInstance.current.on('drop', (sender: any, draggedNodeId: any, droppedNodeId: any) => {
                const draggedNode = sender.getNode(draggedNodeId);
                const droppedNode = sender.getNode(droppedNodeId);

                if (!draggedNode || !draggedNode.id) return;
                if (!droppedNode || !droppedNode.id) return;

                const droppedTags = Array.isArray(droppedNode.tags) ? droppedNode.tags : [];

                if (droppedTags.includes("group")) {
                    setTimeout(() => {
                        const draggedNodeData = sender.get(draggedNode.id);
                        draggedNodeData.stpid = droppedNode.id;
                        draggedNodeData.pid = undefined;
                        sender.updateNode(draggedNodeData);
                    }, 0);

                    setHasChanges(true);
                    return false;
                }
                setHasChanges(true);
            });

            chartInstance.current.on('update', () => setHasChanges(true));
            chartInstance.current.on('remove', () => setHasChanges(true));
            chartInstance.current.on('add', () => setHasChanges(true));

            chartInstance.current.load(chartNodes);
            setHasChanges(false);

        } catch (err) {
            console.error("Load chart error:", err);
            if (err instanceof Error && !err.message.includes("404")) {
                alert(`❌ Lỗi tải sơ đồ: ${err.message}`);
            }
        } finally {
            setLoadingChart(false);
        }
    }, [onChartNotFound, chartContainerRef]);


    /* ================= SAVE CHANGES ================= */
    const saveChart = async () => {
        if (!chartInstance.current || isSaving || !orgId) return;

        setIsSaving(true);
        try {
            const chart = chartInstance.current;
            const nodesToSave: any[] = [];

            // Logic to clean and gather nodes
            const nodesMap = chart.nodes || {};
            // Gather from map
            Object.keys(nodesMap).forEach(id => {
                if (id.toString().startsWith("_")) return;
                const fullData = chart.get(id);
                if (!fullData) return;

                const cleanData: any = {};
                Object.keys(fullData).forEach(key => {
                    if (!key.startsWith("_") && typeof fullData[key] !== "function") {
                        cleanData[key] = fullData[key];
                    }
                });

                if (cleanData.pid === "") cleanData.pid = null;
                if (cleanData.stpid === "") cleanData.stpid = null;
                if (cleanData.tags && typeof cleanData.tags === 'string') {
                    try { cleanData.tags = JSON.parse(cleanData.tags); } catch { }
                }

                nodesToSave.push(cleanData);
            });

            // Fallback if map empty
            if (nodesToSave.length === 0 && chart.config?.nodes) {
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
        const response = await fetch(`/api/orgcharts/${orgId}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                org_data: { data: nodesToSave }
            })
        });

        if (!response.ok) {
            const errText = await response.text();
            throw new Error(errText || "Failed to save");
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

    // Auto load when orgId changes
    useEffect(() => {
        if (orgId && !loadingChart) {
            loadChartData(orgId);
        }
    }, [orgId, loadChartData]); // Added loadChartData to deps, careful with loops if loadChartData changes

    return {
        loadChartData,
        saveChart,
        loadingChart,
        isSaving,
        lastSaveTime,
        hasChanges,
        setHasChanges,
        chartInstance
    };
}
