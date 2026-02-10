import { useEffect, useRef, useState, useCallback, RefObject } from "react";
import OrgChart from "@/lib/orgchart";
import { patchOrgChartTemplates } from "@/app/Orgchart/OrgChartTemplates";

export function useOrgChartEditor(
    chartContainerRef: RefObject<HTMLDivElement | null>,
    orgId: string,
    username: string,
    allNodes: any[],
    onChartNotFound?: () => void,
    onNodeClick?: (nodeData: any) => void
) {
    const chartInstance = useRef<any>(null);
    const originalNodesRef = useRef<any[]>([]);

    const [loadingChart, setLoadingChart] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [lastSaveTime, setLastSaveTime] = useState<string | null>(null);
    const [hasChanges, setHasChanges] = useState(false);

    // NEW: Separate State for Description Tables
    const [descriptionTables, setDescriptionTables] = useState<any[]>([]);
    const descriptionTablesRef = useRef<any[]>([]);

    // NEW: Keep track of onNodeClick to usage in Event Listeners
    const onNodeClickRef = useRef(onNodeClick);
    useEffect(() => { onNodeClickRef.current = onNodeClick; }, [onNodeClick]);

    // Sync Ref with State
    useEffect(() => {
        descriptionTablesRef.current = descriptionTables;
    }, [descriptionTables]);



    /* ================= HELPER: UPDATE NODE DATA ================= */
    // Exposed helper to allow external components (like a Modal) to update the chart
    const updateNodeData = useCallback((originalId: string, newData: any) => {

        // 1. Check if it's a Description Table
        const tableIndex = descriptionTablesRef.current.findIndex(t => t.id === originalId);
        if (tableIndex !== -1) {
            const newTables = [...descriptionTablesRef.current];
            newTables[tableIndex] = { ...newTables[tableIndex], ...newData };

            // If table_html is updated by modal, good. If not, and tableData changed, we might need regen?
            // Modal usually sends generated table_html.

            descriptionTablesRef.current = newTables;
            setDescriptionTables(newTables);
            setHasChanges(true);

            if (chartInstance.current) {
                chartInstance.current.draw(OrgChart.action.update); // Redraw to Reflect HTML changes
            }
            return true;
        }

        // 2. Regular Chart Update
        if (!chartInstance.current) return;

        const newId = newData.id;
        const oldId = originalId;

        // Handle ID Change
        if (newId && oldId && newId !== oldId) {
            // Check for duplicate ID
            if (chartInstance.current.get(newId)) {
                alert(`❌ Employee ID "${newId}" already exists! Please choose a unique ID.`);
                return false;
            }

            // Update other properties using OLD ID first
            const dataWithOldId = { ...newData, id: oldId };
            chartInstance.current.updateNode(dataWithOldId);

            // Replace ID
            chartInstance.current.replaceIds({ [oldId]: newId });
        } else {
            // Normal Update (same ID)
            chartInstance.current.updateNode(newData);
        }

        setHasChanges(true);
        return true;
    }, []);

    /* ================= CHART ACTIONS ================= */
    const addDepartment = useCallback((pid: string | null = null) => {
        const chart = chartInstance.current;
        if (!chart) return;
        const newId = `dept_${Date.now()}`;
        const data = {
            id: newId,
            pid: pid, // Parent ID (null for root)
            stpid: null,
            name: "New Department",
            title: "Department",
            image: null,
            tags: ["group"],
            orig_pid: pid,
            dept: null,
            BU: null,
            type: "group",
            location: null,
            description: "",
            joiningDate: ""
        };
        chart.addNode(data);
        setHasChanges(true); // Ensure change tracking
    }, []);

    const addEmployee = useCallback((pid: string | null = null) => {
        const chart = chartInstance.current;
        if (!chart) return;
        const newId = `emp_${Date.now()}`;
        const data = {
            id: newId,
            pid: pid, // Parent ID (null for root)
            stpid: null,
            name: "New Employee",
            title: "Position",
            image: "",
            tags: [],
            orig_pid: pid,
            dept: null,
            BU: null,
            description: "",
        };
        chart.addNode(data);
        setHasChanges(true);
    }, []);

    const addHeadcountOpen = useCallback((pid: string | null = null) => {
        const chart = chartInstance.current;
        if (!chart) return;
        const newId = `vacant_${Date.now()}`;
        const data = {
            id: newId,
            pid: pid,
            stpid: null,
            name: "Vacant Position",
            title: "Open Headcount",
            img: "/headcount_open.png",
            tags: ["headcount_open"],
            orig_pid: pid,
            dept: null,
            BU: null,
            description: "Open headcount position",
        };
        chart.addNode(data);
        setHasChanges(true);
    }, []);

    const addDescriptionTable = useCallback(() => {
        console.log("addDescriptionTable: Called");
        const newId = `desc_table_${Date.now()}`;

        const tableData = {
            headers: ["Item", "Description"],
            rows: [["A", "Desc A"], ["B", "Desc B"]]
        };

        // Determine Position: Right of the chart
        let startX = 500;
        let startY = 300; // Default fallback

        // Attempt to find max X from existing nodes in the DOM
        if (chartContainerRef.current) {
            const nodeGroups = chartContainerRef.current.querySelectorAll('[data-node-id]');
            let maxX = -Infinity;
            let minY = Infinity;
            let maxY = -Infinity;

            nodeGroups.forEach(node => {
                const transform = node.getAttribute('transform');
                if (transform) {
                    // matrix(1, 0, 0, 1, x, y)
                    const parts = transform.match(/matrix\([^,]+,[^,]+,[^,]+,[^,]+,\s*([^,]+),\s*([^)]+)\)/);
                    if (parts && parts.length === 3) {
                        const x = parseFloat(parts[1]);
                        const y = parseFloat(parts[2]);
                        if (!isNaN(x)) maxX = Math.max(maxX, x);
                        if (!isNaN(y)) {
                            minY = Math.min(minY, y);
                            maxY = Math.max(maxY, y);
                        }
                    }
                }
            });

            if (maxX !== -Infinity) {
                startX = maxX + 400; // Place 400px to the right of the furthest node
                startY = (minY + maxY) / 2; // Center vertically relative to content
                if (isNaN(startY)) startY = 300;
            } else {
                // Fallback to center if no nodes
                // ... (keep existing center logic or simple default)
                startX = 500;
                startY = 300;
            }
        }

        const initialW = 300;
        const initialH = 200;
        const fontSize = Math.max(12, Math.round(initialH / 20)); // Calc font size (adjusted divisor for better fit)

        // Generate HTML immediately for consistency
        let tableHtml = `<table style="width:100%; height: 100%; border-collapse: collapse; font-family: 'Inter', sans-serif; font-size: ${fontSize}px; line-height: 1.4; background: white;"><thead><tr>`;
        tableData.headers.forEach((h: string) => tableHtml += `<th style="border: 1px solid #ccc; padding: 3px; background: #f8f9fa; text-align: center; vertical-align: middle; font-weight: bold; color: #333;">${h}</th>`);
        tableHtml += `</tr></thead><tbody>`;
        tableData.rows.forEach((r: string[]) => {
            tableHtml += `<tr>`;
            r.forEach((c: string) => tableHtml += `<td style="border: 1px solid #ccc; padding: 3px; text-align: left; vertical-align: top; color: #444;">${c}</td>`);
        });
        tableHtml += `</tbody></table>`;

        const newTable = {
            id: newId,
            tags: ["description_table"],
            x: startX,
            y: startY,
            w: initialW,
            h: initialH,
            tableData: tableData,
            table_html: tableHtml
        };

        // Update Ref immediately
        const newTables = [...descriptionTablesRef.current, newTable];
        descriptionTablesRef.current = newTables;
        setDescriptionTables(newTables);
        setHasChanges(true);

        console.log("addDescriptionTable: New Tables State", newTables);

        // Trigger Redraw to let the 'redraw' event handler inject the table
        if (chartInstance.current) {
            console.log("addDescriptionTable: Triggering chart redraw");
            chartInstance.current.draw(OrgChart.action.update);
        }
    }, [chartContainerRef]);

    const removeNode = useCallback((nodeId: string) => {
        // 1. Check Description Tables
        const tableIndex = descriptionTablesRef.current.findIndex(t => t.id === nodeId);
        if (tableIndex !== -1) {
            const newTables = descriptionTablesRef.current.filter(t => t.id !== nodeId);
            descriptionTablesRef.current = newTables;
            setDescriptionTables(newTables);
            setHasChanges(true);

            // Trigger redraw to remove visual element
            if (chartInstance.current) {
                chartInstance.current.draw(OrgChart.action.update);
            }
            return;
        }

        // 2. Regular Nodes
        const chart = chartInstance.current;
        if (!chart) return;
        try {
            if (typeof chart.remove === 'function') {
                chart.remove(nodeId);
                // Force update filter UI if present, usually redundant for basic remove
                if (chart.filterUI && typeof chart.filterUI.update === 'function') {
                    chart.filterUI.update();
                }
                chart.draw(OrgChart.action.update); // Redraw
                setHasChanges(true);
            } else {
                chart.removeNode(nodeId);
                setHasChanges(true);
            }
        } catch (error) {
            console.error("Error removing node:", error);
        }
    }, []);

    /* ================= MOVE NODE ================= */
    const moveNode = useCallback((nodeId: string, direction: 'left' | 'right') => {
        const chart = chartInstance.current;
        if (!chart) return;

        const nodes = chart.config.nodes as any[];
        const nodeIndex = nodes.findIndex(n => n.id === nodeId);
        if (nodeIndex === -1) return;

        const node = nodes[nodeIndex];
        const pid = node.pid;
        const stpid = node.stpid;

        // Find siblings (nodes with same pid and stpid)
        const siblings = nodes.filter(n => n.pid == pid && n.stpid == stpid);

        // Find index of current node within siblings
        const siblingIndex = siblings.findIndex(n => n.id === nodeId);
        if (siblingIndex === -1) return;

        // Calculate target index
        const targetSiblingIndex = direction === 'left' ? siblingIndex - 1 : siblingIndex + 1;

        // Check bounds
        if (targetSiblingIndex < 0 || targetSiblingIndex >= siblings.length) return;

        const targetSibling = siblings[targetSiblingIndex];
        const targetNodeIndex = nodes.findIndex(n => n.id === targetSibling.id);

        if (targetNodeIndex === -1) return;

        // Swap in the main array
        const temp = nodes[nodeIndex];
        nodes[nodeIndex] = nodes[targetNodeIndex];
        nodes[targetNodeIndex] = temp;

        // Update chart display preserving state
        // OrgChart.action.update tells the chart to refresh changes without full reset
        chart.draw(OrgChart.action.update);
        setHasChanges(true);
    }, []);

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

            // FILTER: Split Regular Nodes vs Description Tables
            const regularNodes = nodesData.filter((n: any) =>
                !n.tags || (Array.isArray(n.tags) && !n.tags.includes("description_table"))
            );

            const tableNodes = nodesData.filter((n: any) =>
                Array.isArray(n.tags) && n.tags.includes("description_table")
            );

            // Set Tables State
            const processedTables = tableNodes.map((t: any) => ({
                ...t,
                x: t.x || 100,
                y: t.y || 100,
                w: t.w || 300,
                h: t.h || 300
            }));

            setDescriptionTables(processedTables);
            descriptionTablesRef.current = processedTables; // Sync Ref immediately for listeners

            const chartNodes = regularNodes.map((n: any) => {
                const node = {
                    ...n,
                    tags: Array.isArray(n.tags)
                        ? n.tags
                        : typeof n.tags === 'string'
                            ? JSON.parse(n.tags || '[]')
                            : [],
                    img: n.img || n.photo || n.image || "",
                };

                // Helper to generate Table HTML
                if (node.tableData && node.tableData.headers && node.tableData.rows && node.tableData.rows.length > 0) {
                    const headers = node.tableData.headers;
                    const rows = node.tableData.rows;

                    let tableHtml = `<table style="width:100%; border-collapse: collapse; font-family: Arial, sans-serif; font-size: 10px; background: white;">`;

                    // Head
                    tableHtml += `<thead><tr>`;
                    headers.forEach((h: string) => {
                        tableHtml += `<th style="border: 1px solid #ccc; padding: 2px; background: #f0f0f0; text-align: center; font-weight: bold;">${h}</th>`;
                    });
                    tableHtml += `</tr></thead>`;

                    // Body
                    tableHtml += `<tbody>`;
                    rows.forEach((row: string[]) => {
                        tableHtml += `<tr>`;
                        row.forEach((cell: string) => {
                            tableHtml += `<td style="border: 1px solid #ccc; padding: 2px; text-align: center;">${cell}</td>`;
                        });
                        tableHtml += `</tr>`;
                    });
                    tableHtml += `</tbody></table>`;

                    node.table_html = tableHtml;
                } else {
                    node.table_html = "";
                }

                return node;
            });

            if (chartInstance.current) {
                chartInstance.current.destroy();
                chartInstance.current = null;
            }

            if (!chartContainerRef.current) return;

            patchOrgChartTemplates(true);

            // Old location of chart actions - now moved outside
            // --- Initialize Chart ---
            chartInstance.current = new OrgChart(chartContainerRef.current, {
                template: "big",
                enableDragDrop: true,
                enableSearch: false,
                nodeBinding: {
                    field_0: "name",
                    field_1: "title",
                    img_0: "img",
                    table: "table_html"
                },
                // Disable default click behavior (which opens details/edit)
                nodeMouseClick: OrgChart.action.none,
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
                    addHeadcountOpen: {
                        text: "Add Open Headcount",
                        icon: OrgChart.icon.add(24, 24, "#7A7A7A"),
                        onClick: addHeadcountOpen,
                    },
                    // We remove default 'details' and 'edit' from menu as well, or keep them but handled custom?
                    // Let's keep context menu simple for now or map 'edit' to our custom logic if possible.
                    // For now, removing 'details'/'edit' from context menu effectively forces usage of click or our custom flow.
                    // But 'remove' is crucial.
                    remove: {
                        text: "Remove",
                        icon: OrgChart.icon.remove(24, 24, "#7A7A7A"),
                        onClick: removeNode
                    }
                },
                tags: {
                    group: { template: "group" },
                    Emp_probation: { template: "big_v2" },
                    headcount_open: { template: "big_hc_open" },
                    description_table: { template: "big_table" } // Map tag to template
                },
            });

            // --- Bind Events ---

            // Custom Click Handler
            // Custom Click Handler
            chartInstance.current.on('click', (sender: any, args: any) => {
                const event = args.event;
                // Check if clicked ON a move button
                const moveBtn = event.target.closest('[data-move-btn]');
                if (moveBtn) {
                    const direction = moveBtn.getAttribute('data-move-btn');
                    const nodeId = args.node.id;
                    moveNode(nodeId, direction);
                    return false; // Prevent default node click
                }

                // Check if clicked ON the menu button (3 dots)
                const menuBtn = event.target.closest('[data-ctrl-menu]');
                if (menuBtn) {
                    // Allow default behavior (opening the menu)
                    return;
                }

                const nodeId = args.node.id;
                const nodeData = sender.get(nodeId);
                if (onNodeClick && nodeData) {
                    onNodeClick(nodeData);
                }
                return false; // Prevent default behavior
            });

            chartInstance.current.on('drop', (sender: any, draggedNodeId: any, droppedNodeId: any) => {
                const draggedNode = sender.getNode(draggedNodeId);
                const droppedNode = sender.getNode(droppedNodeId);

                if (!draggedNode || !draggedNode.id) return;
                if (!droppedNode || !droppedNode.id) return;

                const draggedTags = Array.isArray(draggedNode.tags) ? draggedNode.tags : [];
                // Description Tables are NOT nodes anymore, so this check is redundant but kept for safety if state overlaps
                if (draggedTags.includes("description_table")) {
                    return false;
                }

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

            // RESIZE & MOVE LOGIC
            // We attach a global mousedown listener to the container to catch the resize handle
            if (chartContainerRef.current) {
                let isResizing = false;
                let isMovingFree = false;

                let activeNodeId: string | null = null;

                // Start Positions
                let startMouseX = 0;
                let startMouseY = 0;

                // For Resize
                let startW = 0;
                let startH = 0;

                // For Move
                let startNodeX = 0;
                let startNodeY = 0;
                let activeNodeElement: SVGGElement | null = null;

                const onMouseDown = (e: MouseEvent) => {
                    const target = e.target as HTMLElement | SVGElement;

                    // --- 1. RESIZE CHECK ---
                    const resizeHandle = target.closest(".resize-handle");
                    if (resizeHandle) {
                        const nodeGroup = target.closest("[custom-id]");
                        if (nodeGroup) {
                            e.preventDefault();
                            e.stopPropagation(); // Stop OrgChart DnD
                            isResizing = true;
                            activeNodeId = nodeGroup.getAttribute("custom-id");

                            // Find state object
                            const table = descriptionTablesRef.current.find(t => t.id === activeNodeId);
                            if (table) {
                                startW = table.w || 300;
                                startH = table.h || 300;
                                startMouseX = e.clientX;
                                startMouseY = e.clientY;
                            }
                            return;
                        }
                    }

                    // --- 2. MOVE FREE or CLICK CHECK ---
                    // Capture ANY click on the table group to allow dragging or clicking
                    const tableGroup = target.closest(".description-table-group") as SVGGElement | null;
                    if (tableGroup) {
                        const nodeId = tableGroup.getAttribute("custom-id");
                        const table = descriptionTablesRef.current.find(t => t.id === nodeId);

                        if (table) {
                            e.preventDefault();
                            e.stopPropagation(); // Stop OrgChart DnD/Selection

                            isMovingFree = true;
                            activeNodeId = nodeId;
                            activeNodeElement = tableGroup;
                            startMouseX = e.clientX;
                            startMouseY = e.clientY;

                            startNodeX = table.x;
                            startNodeY = table.y;
                            return;
                        }
                    }
                };



                const onMouseMove = (e: MouseEvent) => {
                    if (!isResizing && !isMovingFree) return;
                    e.preventDefault();
                    e.stopPropagation(); // Keep events to us

                    let deltaX = 0;
                    let deltaY = 0;
                    const svg = chartContainerRef.current?.querySelector("svg") as SVGSVGElement | null;

                    if (svg) {
                        // Find the viewport group (first g)
                        const viewport = svg.querySelector("g") as SVGGElement | null;
                        if (viewport) {
                            const ctm = viewport.getScreenCTM();
                            if (ctm) {
                                const pt = svg.createSVGPoint();
                                pt.x = e.clientX; pt.y = e.clientY;
                                const loc = pt.matrixTransform(ctm.inverse());

                                const startPt = svg.createSVGPoint();
                                startPt.x = startMouseX; startPt.y = startMouseY;
                                const startLoc = startPt.matrixTransform(ctm.inverse());

                                deltaX = loc.x - startLoc.x;
                                deltaY = loc.y - startLoc.y;
                            }
                        }
                    }

                    // Fallback (rare)
                    if (deltaX === 0 && deltaY === 0 && (e.clientX !== startMouseX || e.clientY !== startMouseY)) {
                        deltaX = e.clientX - startMouseX;
                        deltaY = e.clientY - startMouseY;
                    }

                    if (isResizing && activeNodeId) {
                        const newW = Math.max(100, startW + deltaX);
                        const newH = Math.max(100, startH + deltaY);

                        const table = descriptionTablesRef.current.find(t => t.id === activeNodeId);
                        if (table) {
                            if (Math.abs(table.w - newW) > 5 || Math.abs(table.h - newH) > 5) {
                                // Update DOM manually for perf
                                const g = document.querySelector(`g[custom-id="${activeNodeId}"]`);
                                if (g) {
                                    // Update rects
                                    g.querySelectorAll("rect").forEach(r => {
                                        if (r.getAttribute("height") == "10") r.setAttribute("width", newW.toString());
                                        else { r.setAttribute("width", newW.toString()); r.setAttribute("height", newH.toString()); }
                                    });
                                    // Update foreignObject
                                    const fo = g.querySelector("foreignObject");
                                    if (fo) {
                                        fo.setAttribute("width", (newW - 20).toString());
                                        fo.setAttribute("height", (newH - 30).toString());

                                        // Update internal Font Size in real-time
                                        const innerTable = fo.querySelector('table');
                                        if (innerTable) {
                                            const newFontSize = Math.max(12, Math.round(newH / 20));
                                            innerTable.style.fontSize = `${newFontSize}px`;
                                            innerTable.style.lineHeight = "1.4"; // Ensure line height
                                        }
                                    }
                                    // Update resize handle
                                    const handle = g.querySelector(".resize-handle");
                                    if (handle) { handle.setAttribute("transform", `translate(${newW}, ${newH})`); }
                                }
                            }
                        }
                    }

                    if (isMovingFree && activeNodeId && activeNodeElement) {
                        const newNodeX = startNodeX + deltaX;
                        const newNodeY = startNodeY + deltaY;

                        // Visual Update Only (Smooth)
                        activeNodeElement.setAttribute("transform", `matrix(1,0,0,1,${newNodeX},${newNodeY})`);
                    }
                };

                const onMouseUp = (e: MouseEvent) => {
                    if (isResizing && activeNodeId) {
                        isResizing = false;

                        // Commit Resize to State
                        const tables = descriptionTablesRef.current; // Use Ref
                        const tableIndex = tables.findIndex(t => t.id === activeNodeId);
                        if (tableIndex !== -1) {
                            // Calculate final W/H
                            const currentX = e.clientX;
                            const currentY = e.clientY;
                            const deltaX = currentX - startMouseX;
                            const deltaY = currentY - startMouseY;
                            const newW = Math.max(100, /*startW*/ tables[tableIndex].w + deltaX);
                            const newH = Math.max(100, /*startH*/ tables[tableIndex].h + deltaY);

                            const newTables = [...tables];
                            newTables[tableIndex].w = newW;
                            newTables[tableIndex].h = newH;

                            // UPDATE HTML with new Font Size Persistence
                            const fontSize = Math.max(12, Math.round(newH / 15));
                            let html = newTables[tableIndex].table_html || "";
                            html = html.replace(/font-size:\s*[\d\.]+px/g, `font-size: ${fontSize}px`);
                            newTables[tableIndex].table_html = html;

                            descriptionTablesRef.current = newTables; // Direct Update Ref
                            setDescriptionTables(newTables);
                        }

                        setHasChanges(true);
                        activeNodeId = null;

                        // Force redraw to ensure clean state
                        chartInstance.current.draw(OrgChart.action.update);
                    }

                    if (isMovingFree && activeNodeId && activeNodeElement) {
                        // Commit Final Position
                        const currentX = e.clientX;
                        const currentY = e.clientY;
                        // Use raw pixels for click detection, scale doesn't matter for "is it a click?" check
                        const rawDeltaX = currentX - startMouseX;
                        const rawDeltaY = currentY - startMouseY;

                        // Check if this was just a click (minimal movement)
                        const totalMovement = Math.sqrt(rawDeltaX * rawDeltaX + rawDeltaY * rawDeltaY);
                        if (totalMovement < 5) {
                            // IT IS A CLICK!
                            const table = descriptionTablesRef.current.find(t => t.id === activeNodeId);
                            if (table && onNodeClickRef.current) {
                                onNodeClickRef.current(table);
                            }
                        }

                        // Scale Adjustment for Commit (Robust CTM)
                        let deltaX = 0;
                        let deltaY = 0;
                        const svg = chartContainerRef.current?.querySelector("svg") as SVGSVGElement | null;
                        if (svg) {
                            const viewport = svg.querySelector("g") as SVGGElement | null;
                            if (viewport) {
                                const ctm = viewport.getScreenCTM();
                                if (ctm) {
                                    const pt = svg.createSVGPoint();
                                    pt.x = e.clientX; pt.y = e.clientY;
                                    const loc = pt.matrixTransform(ctm.inverse());

                                    const startPt = svg.createSVGPoint();
                                    startPt.x = startMouseX; startPt.y = startMouseY;
                                    const startLoc = startPt.matrixTransform(ctm.inverse());

                                    deltaX = loc.x - startLoc.x;
                                    deltaY = loc.y - startLoc.y;
                                }
                            }
                        }
                        if (deltaX === 0 && deltaY === 0) {
                            deltaX = e.clientX - startMouseX;
                            deltaY = e.clientY - startMouseY;
                        }

                        const finalX = startNodeX + deltaX;
                        const finalY = startNodeY + deltaY;

                        const tables = descriptionTablesRef.current;
                        const tableIndex = tables.findIndex(t => t.id === activeNodeId);
                        if (tableIndex !== -1) {
                            const newTables = [...tables];
                            newTables[tableIndex].x = finalX;
                            newTables[tableIndex].y = finalY;

                            descriptionTablesRef.current = newTables;
                            setDescriptionTables(newTables);
                            setHasChanges(true); // Don't forget to flag changes!
                        }

                        isMovingFree = false;
                        activeNodeId = null;
                        activeNodeElement = null;
                    }
                };

                chartContainerRef.current.addEventListener("mousedown", onMouseDown, true);
                window.addEventListener("mousemove", onMouseMove);
                window.addEventListener("mouseup", onMouseUp);

                // Cleanup
                // Note: This useEffect has no cleanup function exposed easily because the setup is inside loadChartData.
                // This is a flaw in the current hook structure. 
                // We should move this listener outside loadChartData, but it depends on chartInstance.
                // We can attach it to a ref current and clean it up in the generic useEffect cleanup.
            }

            // Force Custom Positions on Redraw
            // Force MANUAL Injection on Redraw
            chartInstance.current.on('redraw', (sender: any) => {
                const chartElement = chartContainerRef.current;
                if (!chartElement) return;

                // Find the Viewport Group (Scale/Translate container)
                // Balkan usually has <g transform="..."> inside SVG
                const svg = chartElement.querySelector('svg');
                if (!svg) {
                    console.warn("Redraw: SVG not found");
                    return;
                }

                // The first 'g' usually holds the transform (pan/zoom)
                // Let's iterate or find specific one. Balkan wraps everything in a root 'g'.
                // We want our custom element to be INSIDE this group so it scales/moves with the chart.
                const viewport = svg.querySelector('g');
                if (!viewport) {
                    console.warn("Redraw: Viewport G not found");
                    return;
                }
                console.log("Redraw: Injecting Tables", descriptionTablesRef.current);

                // Render Description Tables Manually
                descriptionTablesRef.current.forEach((table) => {
                    // Check if exists
                    let g = viewport.querySelector(`g[custom-id="${table.id}"]`);
                    if (!g) {
                        g = document.createElementNS("http://www.w3.org/2000/svg", "g");
                        g.setAttribute("custom-id", table.id);
                        g.setAttribute("class", "description-table-group");
                        viewport.appendChild(g);
                    }

                    // Update Position
                    g.setAttribute("transform", `matrix(1,0,0,1,${table.x},${table.y})`);

                    // Generate Content (Reuse the template Logic roughly)
                    // We need table_html. If not in state, generate it.
                    // Generate Content (Reuse the template Logic roughly)
                    // We need table_html. If not in state, generate it.
                    // We need table_html. If not in state, generate it.
                    let tableHtml = table.table_html;
                    const w = table.w || 300;
                    const h = table.h || 300;
                    const fontSize = Math.max(12, Math.round(h / 20)); // Dynamic Font Size calculation

                    if (!tableHtml && table.tableData) {
                        // Generate on fly if missing (e.g. initial load logic didn't do it)
                        const td = table.tableData;
                        tableHtml = `<table style="width:100%; height: 100%; border-collapse: collapse; font-family: 'Inter', sans-serif; font-size: ${fontSize}px; line-height: 1.4; background: white;"><thead><tr>`;
                        td.headers.forEach((h: any) => tableHtml += `<th style="border: 1px solid #ccc; padding: 3px; background: #f8f9fa; text-align: center; font-weight: bold; color: #333;">${h}</th>`);
                        tableHtml += `</tr></thead><tbody>`;
                        td.rows.forEach((r: any) => {
                            tableHtml += `<tr>`;
                            r.forEach((c: any) => tableHtml += `<td style="border: 1px solid #ccc; padding: 3px; text-align: left; vertical-align: top; color: #444;">${c}</td>`);
                            tableHtml += `</tr>`;
                        });
                        tableHtml += `</tbody></table>`;
                    } else if (tableHtml) {
                        // If HTML exists, we might need to inject the new font size or ensure it adapts
                        // Simplest way is to wrap it or replace the style if simple
                        // But since we use styled table, let's just make sure the container allows flow
                        // For correct resizing, we should ideally re-generate the HTML if we want perfect font control
                        // OR rely on the real-time DOM update to set the style, which we did in onMouseMove.
                        // But on full redraw, we need to apply it.
                        // Hacky but effective: replace font-size regex
                        tableHtml = tableHtml.replace(/font-size:\s*[\d\.]+px/g, `font-size: ${fontSize}px`);
                        // Ensure height is 100% to fill box
                        if (tableHtml.includes("height: auto")) {
                            tableHtml = tableHtml.replace(/height:\s*auto/g, `height: 100%`);
                        } else if (!tableHtml.includes("height: 100%")) {
                            tableHtml = tableHtml.replace('style="', 'style="height: 100%; ');
                        }

                        // Ensure line-height
                        if (!tableHtml.includes("line-height")) {
                            tableHtml = tableHtml.replace('style="', 'style="line-height: 1.4; ');
                        }
                        // Also ensure custom font
                        if (!tableHtml.includes("Inter")) tableHtml = tableHtml.replace("font-family:", "font-family: 'Inter',");
                    }

                    // Inner HTML
                    g.innerHTML = `
                      <rect x="0" y="0" height="${h}" width="${w}"
                            fill="#ffffff" stroke="#E5E7EB" stroke-width="1" filter="url(#mil-shadow)"></rect>
                      <rect x="0" y="0" height="10" width="${w}"
                            fill="#DB011C" class="move-handle" style="cursor: move;"></rect>
                      
                      <foreignObject x="10" y="20" width="${w - 20}" height="${h - 30}" style="overflow: visible;">
                         <div xmlns="http://www.w3.org/1999/xhtml" style="width:100%; height:100%; overflow: auto;">
                             ${tableHtml}
                         </div>
                      </foreignObject>

                      <!-- Resize Handle -->
                      <g class="resize-handle" style="cursor:nwse-resize" transform="translate(${w}, ${h})">
                          <path d="M-15,0 L0,0 L0,-15 Z" fill="#999" opacity="0.5" />
                          <line x1="-10" y1="-3" x2="-3" y2="-10" stroke="#fff" stroke-width="1" />
                          <line x1="-6" y1="-3" x2="-3" y2="-6" stroke="#fff" stroke-width="1" />
                      </g>
                    `;
                });
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
    }, [onChartNotFound, chartContainerRef, allNodes]);

    // ... (rest of the file)
    const saveChart = async () => {
        if (!chartInstance.current || isSaving || !orgId) return;

        setIsSaving(true);
        try {
            const chart = chartInstance.current;
            const nodesToSave: any[] = [];

            // 1. Regular Nodes from OrgChart Config
            const currentConfigNodes = chart.config.nodes || [];
            currentConfigNodes.forEach((n: any) => {
                if (n.id.toString().startsWith("_")) return;
                // ... cleaning logic
                const cleanData: any = {};
                Object.keys(n).forEach(key => {
                    if (!key.startsWith("_") && typeof n[key] !== "function") {
                        cleanData[key] = n[key];
                    }
                });

                // Consistency checks
                if (cleanData.pid === "") cleanData.pid = null;
                if (cleanData.stpid === "") cleanData.stpid = null;
                if (cleanData.tags && typeof cleanData.tags === 'string') {
                    try { cleanData.tags = JSON.parse(cleanData.tags); } catch { }
                }
                nodesToSave.push(cleanData);
            });

            // 2. Add Description Tables from Separate State
            descriptionTablesRef.current.forEach(t => {
                nodesToSave.push(t);
            });

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
        updateNodeData,
        addDepartment, // Expose
        addEmployee,   // Expose
        addHeadcountOpen, // Expose
        addDescriptionTable, // Expose
        removeNode,    // Expose
        moveNode,      // Expose for swapping

        // Expose Table State
        descriptionTables,
        descriptionTablesRef,
        setDescriptionTables,

        loadingChart,
        isSaving,
        lastSaveTime,
        hasChanges,
        setHasChanges,
        chartInstance
    };
}
