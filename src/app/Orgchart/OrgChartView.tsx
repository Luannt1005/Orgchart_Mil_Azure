"use client";

import { useEffect, useRef, useMemo, useCallback } from "react";
import OrgChart from "@/lib/orgchart";
import { patchOrgChartTemplates } from "./OrgChartTemplates";
import LoadingScreen from "@/components/loading-screen";
import { useFilteredOrgData } from "@/hooks/useOrgData";
import "./OrgChart.css";

interface OrgChartProps {
  selectedGroup?: string;
  selectedType?: string;
}

interface OrgChartNode {
  id: string;
  pid: string | null;
  stpid: string | null;
  name: string;
  title: string;
  image: string | null;
  tags: string[];
  orig_pid: string | null;
  dept: string | null;
  BU: string | null;
  type: string;
  location: string | null;
  description: string;
  joiningDate: string;
}

export default function OrgChartView({ selectedGroup, selectedType }: OrgChartProps) {
  const treeRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<any>(null);

  // Use SWR cached data with client-side filtering
  // selectedGroup === "all" means show all data, otherwise filter by group
  const groupToFilter = selectedGroup === "all" ? undefined : selectedGroup;
  const { nodes: rawNodes, loading, mutate } = useFilteredOrgData(groupToFilter);

  // Transform and memoize nodes for OrgChart compatibility
  const nodes = useMemo(() => {
    let filteredRawNodes = rawNodes;

    if (selectedType && selectedType !== 'all') {
      const selectedTypes = selectedType.toLowerCase().split(',');

      filteredRawNodes = filteredRawNodes.filter((item: any) => {
        const nodeType = (item.type || "").toLowerCase();
        const nodeTags = Array.isArray(item.tags)
          ? item.tags
          : typeof item.tags === 'string'
            ? JSON.parse(item.tags || '[]')
            : [];

        const isGroup = nodeType === 'group' || nodeTags.includes('group');

        if (isGroup) {
          return selectedTypes.includes('group');
        }

        return selectedTypes.includes(nodeType);
      });
    }

    return filteredRawNodes.map((item: any) => ({
      id: item.id,
      pid: item.pid || null,
      stpid: item.stpid || null,
      name: item.name || "",
      title: item.title || "",
      image: item.image || item.img || null,
      tags: Array.isArray(item.tags)
        ? item.tags
        : typeof item.tags === 'string'
          ? JSON.parse(item.tags || '[]')
          : [],
      orig_pid: item.orig_pid || null,
      dept: item.dept || null,
      BU: item.BU || null,
      type: item.type || "",
      location: item.location || null,
      description: item.description || "",
      joiningDate: item.joiningDate || ""
    } as OrgChartNode));
  }, [rawNodes, selectedType]);

  // Revalidate data after mutations (using SWR mutate)
  const revalidateData = useCallback(async () => {
    console.log("🔄 Revalidating org data after mutation...");
    await mutate();
  }, [mutate]);

  // Listen for Ctrl key
  // useEffect(() => {
  //   const handleKeyDown = (e: KeyboardEvent) => {
  //     if (!chartRef.current || chartRef.current.enableDragDrop) return;
  //     chartRef.current.config.enableDragDrop = true;
  //   };
  //   const handleKeyUp = (e: KeyboardEvent) => {
  //     if (!chartRef.current) return;
  //     chartRef.current.config.enableDragDrop = false;
  //   };
  //   window.addEventListener('keydown', handleKeyDown);
  //   window.addEventListener('keyup', handleKeyUp);
  //   return () => {
  //     window.removeEventListener('keydown', handleKeyDown);
  //     window.removeEventListener('keyup', handleKeyUp);
  //   };
  // }, []);

  const addDepartment = async (nodeId: string) => {
    const chart = chartRef.current;
    if (!chart) return;

    try {
      const newId = OrgChart.randomId();
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

      // Save via API
      const response = await fetch("/api/orgchart", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data)
      });

      const result = await response.json();
      if (result.success) {
        await revalidateData();
      } else {
        console.error("Failed to add department:", result.error);
      }
    } catch (error) {
      console.error("Failed to add department:", error);
      alert("Failed to add department. Check console for details.");
    }
  };

  useEffect(() => {
    const el = treeRef.current;
    if (!el || loading || nodes.length === 0) return;

    patchOrgChartTemplates();

    const chartNodes = nodes.map((n: any) => ({
      ...n,
      tags: Array.isArray(n.tags) ? n.tags : [],
      img: n.image || "",
    }));

    // If chart already exists, just update the data instead of recreating
    if (chartRef.current) {
      console.log("♻️ Reusing existing OrgChart instance, updating data...");
      chartRef.current.load(chartNodes);
      return;
    }

    // Create new chart only on first mount
    console.log("🆕 Creating new OrgChart instance...");
    const chart = new OrgChart(el, {
      mouseScrool: OrgChart.action.zoom,
      collapse: { level: 1, allChildren: true },
      scaleInitial: 1,
      enableSearch: true,
      // enableAI: false,
      enableDragDrop: false,
      layout: OrgChart.normal,
      template: "big",
      nodeBinding: {
        imgs: "img",
        field_0: "name",
        field_1: "title",
        img_0: "img",
      },
      dottedLines: [
        { from: "dept:EE & Motor Engineering:549682", to: 500011 },
      ],
      nodeMenu: {
        addDepartment: {
          text: "Add new department",
          icon: OrgChart.icon.add(24, 24, "#7A7A7A"),
          onClick: addDepartment,
        },
        edit: { text: "Edit" },
        details: { text: "Details" },
        add: { text: "Add" },
        remove: { text: "Remove" },
      },
      editForm: {
        cancelBtn: "Close",
        saveAndCloseBtn: "Save",
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

    // Handle node update event
    chart.on("update", (sender, args) => {
      if (!args || !args.id) {
        console.error("Update event: args invalid", args);
        return;
      }

      setTimeout(async () => {
        const node = sender.get(args.id);
        if (!node || !node.id) {
          console.error("Update event: node not found:", args);
          return;
        }

        try {
          const payload = {
            id: node.id,
            pid: node.pid ?? null,
            stpid: node.stpid ?? null,
            name: node.name ?? "",
            title: node.title ?? "",
            image: node.img ?? null,
            tags: node.tags ?? [],
            orig_pid: node.orig_pid ?? null,
            dept: node.dept ?? null,
            BU: node.BU ?? null,
            type: node.type ?? "",
            location: node.location ?? null,
            description: node.description ?? "",
            joiningDate: node.joiningDate ?? ""
          };

          const response = await fetch("/api/orgchart", {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload)
          });

          const result = await response.json();
          if (result.success) {
            await revalidateData();
          } else {
            console.error("Failed to update node:", result.error);
          }
        } catch (err) {
          console.error("Failed to update node:", err);
        }
      }, 0);
    });

    // Handle drag-drop event
    chart.on("drop", (sender, draggedNodeId, droppedNodeId) => {
      const draggedNode = sender.getNode(draggedNodeId);
      const droppedNode = sender.getNode(droppedNodeId);

      if (!draggedNode || !draggedNode.id) return;
      if (!droppedNode || !droppedNode.id) return;

      // Move employee to department
      if (
        droppedNode.tags?.includes("group") &&
        !draggedNode.tags?.includes("group")
      ) {
        const draggedNodeData = sender.get(draggedNode.id as string | number);
        draggedNodeData.pid = undefined;
        draggedNodeData.stpid = droppedNode.id as any;

        sender.updateNode(draggedNodeData);

        setTimeout(async () => {
          try {
            const payload = {
              id: draggedNodeData.id,
              pid: draggedNodeData.pid ?? null,
              stpid: draggedNodeData.stpid ?? null,
              name: draggedNodeData.name ?? "",
              title: draggedNodeData.title ?? "",
              image: draggedNodeData.img ?? null,
              tags: draggedNodeData.tags ?? [],
              orig_pid: draggedNodeData.orig_pid ?? null,
              dept: draggedNodeData.dept ?? null,
              BU: draggedNodeData.BU ?? null,
              type: draggedNodeData.type ?? "",
              location: draggedNodeData.location ?? null,
              description: draggedNodeData.description ?? "",
              joiningDate: draggedNodeData.joiningDate ?? ""
            };

            const response = await fetch("/api/orgchart", {
              method: "PUT",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(payload)
            });

            const result = await response.json();
            if (result.success) {
              await revalidateData();
            } else {
              console.error("Drop update failed:", result.error);
            }
          } catch (err) {
            console.error("Drop update failed:", err);
          }
        }, 0);

        return false;
      }
    });

    // Handle node removal event
    chart.on("remove", (sender, args) => {
      if (!args) {
        console.error("Remove event: args is invalid");
        return;
      }

      const nodeId = args.id || args.node?.id || args;
      if (!nodeId) {
        console.error("Remove event: node ID is invalid");
        return;
      }

      setTimeout(async () => {
        try {
          const response = await fetch("/api/orgchart", {
            method: "DELETE",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ id: nodeId })
          });

          const result = await response.json();
          if (result.success) {
            await revalidateData();
          } else {
            console.error("Failed to remove node:", result.error);
          }
        } catch (err) {
          console.error("Failed to remove node:", err);
        }
      }, 50);
    });

    chartRef.current = chart;
    chart.load(chartNodes);
    console.log("OrgChart initialized from Orgchart_data collection");
  }, [nodes, loading]);

  // Show loading screen while data is loading
  if (loading) {
    return <LoadingScreen />;
  }

  return (
    <div
      id="tree"
      ref={treeRef}
      style={{ width: "100%", height: "100vh" }}
    />
  );
}

