import { useState, useCallback, useEffect } from "react";
import { User } from "@/types/database";

export interface OrgProfile {
    orgchart_id: string;
    orgchart_name: string;
    created_at: string;
    // add other fields as seen in the API response
    [key: string]: any;
}

interface UseOrgProfileManagerProps {
    user: User | null | undefined;
}

export function useOrgProfileManager({ user }: UseOrgProfileManagerProps) {
    const [orgList, setOrgList] = useState<OrgProfile[]>([]);
    const [loadingList, setLoadingList] = useState(true);

    const username = user?.username;

    /* ================= LOAD USER'S CUSTOM ORGCHARTS ================= */
    const fetchOrgList = useCallback(async () => {
        if (!username) return;
        try {
            const response = await fetch(`/api/orgcharts?username=${username}`);
            if (!response.ok) throw new Error("Failed to fetch orgcharts");
            const data = await response.json();
            setOrgList(data.orgcharts || []);
        } catch (err) {
            console.error("❌ Load orgcharts error:", err);
        } finally {
            setLoadingList(false);
        }
    }, [username]);

    // Initial load
    useEffect(() => {
        if (username) {
            fetchOrgList();
        }
    }, [username, fetchOrgList]);

    /* ================= CREATE NEW ORGCHART ================= */
    // Helper to actually perform the POST (split for the empty data case override)
    const performCreate = async (newOrgName: string, description: string, nodes: any[], username: string) => {
        const response = await fetch("/api/orgcharts", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                username,
                orgchart_name: newOrgName,
                describe: description,
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
        await fetchOrgList(); // Reload list
        return result;
    };

    const createOrgChart = async (newOrgName: string, newOrgDesc: string, selectedDept: string) => {
        if (!username) throw new Error("Vui lòng đăng nhập để tạo sơ đồ");

        // Fetch selected department data
        const deptRes = await fetch(`/api/orgchart?dept=${encodeURIComponent(selectedDept)}`);

        if (!deptRes.ok) throw new Error("Failed to fetch department data");
        const deptJson = await deptRes.json();
        const nodes = deptJson.data || [];

        if (nodes.length === 0) {
            // We return a specialized object or throw to let UI handle confirmation
            throw new Error("EMPTY_DATA_CONFIRMATION_NEEDED");
        }

        const description = newOrgDesc || `Tạo từ phòng ban ${selectedDept}`;
        return await performCreate(newOrgName, description, nodes, username);
    };

    /* ================= DELETE ORGCHART ================= */
    const deleteOrgChart = async (orgId: string) => {
        const response = await fetch(`/api/orgcharts/${orgId}`, {
            method: "DELETE",
        });

        if (!response.ok) {
            throw new Error(`Delete failed: ${response.status} ${response.statusText}`);
        }

        await fetchOrgList(); // Reload list
        return true;
    };

    return {
        orgList,
        loadingList,
        fetchOrgList,
        createOrgChart,
        performCreate, // Exposed for the "Empty data" confirmation edge case
        deleteOrgChart
    };
}
