import { supabaseAdmin } from "@/lib/supabase";
import { invalidateCachePrefix } from "@/lib/cache";

const IMAGE_BASE_URL = "https://raw.githubusercontent.com/Luannt1005/test-images/main/";

interface Employee {
    id: string;
    emp_id: string;
    full_name: string | null;
    job_title: string | null;
    dept: string | null;
    bu: string | null;
    bu_org_3: string | null;
    dl_idl_staff: string | null;
    location: string | null;
    employee_type: string | null;
    line_manager: string | null;
    joining_date: string | null;
    last_working_day: string | null;
    line_manager_status: string | null;
    pending_line_manager: string | null;
    [key: string]: any;
}

// Trim leading zeros from ID
const trimLeadingZeros = (value: string | null | undefined): string | null => {
    if (!value) return null;
    const trimmed = String(value).replace(/^0+/, '') || '0';
    return trimmed === '0' ? null : trimmed;
};

// Format date from various formats to DD/MM/YYYY
const formatDate = (value: any): string => {
    if (!value) return "";

    try {
        // Handle Excel serial number
        if (typeof value === 'number' || (typeof value === 'string' && /^\d+$/.test(value))) {
            const excelSerial = Number(value);
            if (excelSerial > 0) {
                const date = new Date((excelSerial - 1) * 86400000 + new Date(1900, 0, 1).getTime());
                const day = String(date.getDate()).padStart(2, '0');
                const month = String(date.getMonth() + 1).padStart(2, '0');
                const year = date.getFullYear();
                return `${day}/${month}/${year}`;
            }
        }

        // Handle ISO string
        if (typeof value === 'string' && value.includes('T')) {
            const date = new Date(value);
            const day = String(date.getDate()).padStart(2, '0');
            const month = String(date.getMonth() + 1).padStart(2, '0');
            const year = date.getFullYear();
            return `${day}/${month}/${year}`;
        }

        // Handle DD/MM/YYYY format
        if (typeof value === 'string' && /^\d{1,2}\/\d{1,2}\/\d{4}$/.test(value)) {
            return value;
        }

        return String(value);
    } catch (e) {
        return String(value);
    }
};

// Check if employee is in probation period (2 months)
const isProbationPeriod = (joiningDateStr: string): boolean => {
    if (!joiningDateStr) return false;

    try {
        const [day, month, year] = joiningDateStr.split('/').map(Number);
        const joiningDate = new Date(year, month - 1, day);
        const now = new Date();
        const diffTime = now.getTime() - joiningDate.getTime();
        const diffDays = diffTime / (1000 * 60 * 60 * 24);
        return diffDays <= 60 && diffDays >= 0;
    } catch (e) {
        return false;
    }
};

/**
 * Sync single employee to orgchart
 */
export async function syncSingleEmployee(employeeId: string) {
    try {
        // Fetch employee from Supabase
        const { data: emp, error } = await supabaseAdmin
            .from('employees')
            .select('*')
            .eq('id', employeeId)
            .single();

        if (error || !emp) {
            // Employee not found - remove from orgchart
            await supabaseAdmin
                .from('orgchart_nodes')
                .delete()
                .eq('id', employeeId);

            return {
                success: true,
                message: "Employee removed from Orgchart",
                updated: 0,
                deleted: 1
            };
        }

        const empId = String(emp.emp_id || "").trim();
        if (!empId) {
            return { success: false, message: "Missing Emp ID" };
        }

        // Get manager ID from line_manager column
        const managerRaw = emp.line_manager;
        const managerId = managerRaw
            ? trimLeadingZeros(String(managerRaw).split(":")[0].trim())
            : null;

        const dept = emp.dept || "";
        const deptKey = `dept:${dept}:${managerId}`;

        const joiningDate = formatDate(emp.joining_date) || "";
        const tags = ["emp"];

        if (joiningDate && isProbationPeriod(joiningDate)) {
            tags.push("Emp_probation");
        }

        // Prepare employee node
        const empNode = {
            id: empId,
            pid: managerId,
            stpid: deptKey,
            name: emp.full_name || "",
            title: emp.job_title || "",
            image: `${IMAGE_BASE_URL}${empId}.jpg`,
            tags: JSON.stringify(tags),
            orig_pid: managerId,
            dept: dept || null,
            bu: emp.bu || null,
            type: emp.dl_idl_staff || null,
            location: emp.location || null,
            description: emp.employee_type || "",
            joining_date: joiningDate
        };

        // Prepare department node
        const deptNode = {
            id: deptKey,
            pid: managerId,
            stpid: null,
            name: dept,
            title: "Department",
            image: null,
            tags: JSON.stringify(["group"]),
            orig_pid: managerId,
            dept: dept,
            bu: null,
            type: "group",
            location: null,
            description: `Dept under manager ${managerId}`,
            joining_date: null
        };

        // Upsert both nodes
        const { error: upsertError } = await supabaseAdmin
            .from('orgchart_nodes')
            .upsert([empNode, deptNode], {
                onConflict: 'id',
                ignoreDuplicates: false
            });

        if (upsertError) throw upsertError;

        return { success: true, message: "Synced single employee", updated: 2 };
    } catch (error: any) {
        console.error("Sync single error:", error);
        return { success: false, error: error.message };
    }
}

/**
 * Full sync - sync all employees to orgchart
 */
export async function syncEmployeesToOrgchart() {
    try {
        // Fetch all employees
        const { data: employees, error: fetchError } = await supabaseAdmin
            .from('employees')
            .select('*');

        if (fetchError) throw fetchError;

        if (!employees || employees.length === 0) {
            return { success: true, message: "No employees to sync" };
        }

        const output: any[] = [];
        const deptMap = new Map();

        // Process each employee
        employees.forEach((emp: Employee) => {
            const empId = String(emp.emp_id || "").trim();
            if (!empId) return;

            // Get manager ID from line_manager column
            const managerRaw = emp.line_manager;
            const managerId = managerRaw
                ? trimLeadingZeros(String(managerRaw).split(":")[0].trim())
                : null;

            const dept = emp.dept || "";
            const deptKey = `dept:${dept}:${managerId}`;

            deptMap.set(deptKey, { dept, managerId });

            const joiningDate = formatDate(emp.joining_date) || "";
            const tags = ["emp"];

            if (joiningDate && isProbationPeriod(joiningDate)) {
                tags.push("Emp_probation");
            }

            output.push({
                id: empId,
                pid: managerId,
                stpid: deptKey,
                name: emp.full_name || "",
                title: emp.job_title || "",
                image: `${IMAGE_BASE_URL}${empId}.jpg`,
                tags: JSON.stringify(tags),
                orig_pid: managerId,
                dept: dept || null,
                bu: emp.bu || null,
                type: emp.dl_idl_staff || null,
                location: emp.location || null,
                description: emp.employee_type || "",
                joining_date: joiningDate
            });
        });

        // Add department nodes
        deptMap.forEach((v, deptKey) => {
            output.push({
                id: deptKey,
                pid: v.managerId,
                stpid: null,
                name: v.dept || "",
                title: "Department",
                image: null,
                tags: JSON.stringify(["group"]),
                orig_pid: v.managerId,
                dept: v.dept || "",
                bu: null,
                type: "group",
                location: null,
                description: `Dept under manager ${v.managerId}`,
                joining_date: null
            });
        });

        // Get existing orgchart data
        const { data: existingNodes, error: existingError } = await supabaseAdmin
            .from('orgchart_nodes')
            .select('id');

        if (existingError) throw existingError;

        const existingIds = new Set((existingNodes || []).map((n: any) => n.id));
        const newIds = new Set(output.map((item: any) => item.id));

        // Find IDs to delete (in database but not in new output)
        const idsToDelete: string[] = [];
        existingIds.forEach((id) => {
            if (!newIds.has(id)) {
                idsToDelete.push(id);
            }
        });

        // Delete removed nodes
        let deleteCount = 0;
        if (idsToDelete.length > 0) {
            const { error: deleteError } = await supabaseAdmin
                .from('orgchart_nodes')
                .delete()
                .in('id', idsToDelete);

            if (deleteError) throw deleteError;
            deleteCount = idsToDelete.length;
        }

        // Upsert all nodes (Supabase handles large upserts efficiently)
        const { error: upsertError } = await supabaseAdmin
            .from('orgchart_nodes')
            .upsert(output, {
                onConflict: 'id',
                ignoreDuplicates: false
            });

        if (upsertError) throw upsertError;

        // Invalidate cache
        invalidateCachePrefix('orgchart');

        return {
            success: true,
            message: `Sync completed`,
            employees: employees.length,
            departments: deptMap.size,
            total: output.length,
            updated: output.length,
            deleted: deleteCount
        };
    } catch (err: any) {
        console.error("Sync error:", err);
        return {
            success: false,
            error: err.message || "Sync failed"
        };
    }
}
