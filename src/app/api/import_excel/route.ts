import { NextResponse } from "next/server";
import * as XLSX from "xlsx";
import { supabaseAdmin } from "@/lib/supabase";
import { invalidateCachePrefix } from "@/lib/cache";
import { isAuthenticated, unauthorizedResponse, getCurrentUser } from "@/lib/auth-server";

/**
 * Get existing Emp IDs from database
 */
async function getExistingEmpIds(): Promise<Map<string, string>> {
  const { data, error } = await supabaseAdmin
    .from('employees')
    .select('id, emp_id');

  if (error) throw error;

  const empIds = new Map<string, string>();
  (data || []).forEach((row) => {
    if (row.emp_id) {
      empIds.set(row.emp_id, row.id);
    }
  });

  return empIds;
}

/**
 * Delete employees by their Emp IDs
 */
async function deleteEmployeesByEmpIds(empIdsToDelete: string[]): Promise<number> {
  if (empIdsToDelete.length === 0) return 0;

  const { error } = await supabaseAdmin
    .from('employees')
    .delete()
    .in('emp_id', empIdsToDelete);

  if (error) throw error;

  return empIdsToDelete.length;
}

/**
 * POST /api/import_excel
 * Import employees from Excel file
 * - Adds new employees
 * - Skips existing employees (by Emp ID)
 * - Deletes employees not in the new file
 */
export async function POST(req: Request) {
  if (!await isAuthenticated()) {
    return unauthorizedResponse();
  }
  const currentUser = await getCurrentUser();
  console.log(`🔐 POST /api/import_excel accessed by: ${currentUser}`);

  try {
    const formData = await req.formData();
    const file = formData.get("file") as File;

    if (!file) {
      return NextResponse.json({ error: "No file" }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const workbook = XLSX.read(buffer, { type: "buffer" });

    if (!workbook || !workbook.SheetNames || workbook.SheetNames.length === 0) {
      return NextResponse.json(
        { error: "Invalid Excel file" },
        { status: 400 }
      );
    }

    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    const rows = XLSX.utils.sheet_to_json(sheet, {
      defval: null,
      raw: true
    });

    if (rows.length === 0) {
      return NextResponse.json(
        { error: "Excel file is empty" },
        { status: 400 }
      );
    }

    // Get existing Emp IDs
    const existingEmpIds = await getExistingEmpIds();

    // Get Emp IDs from import file (normalize to string)
    // IMPORTANT: Normalize to string to avoid number vs string mismatch with DB
    const newEmpIds = new Set(
      rows
        .map((row: any) => row["Emp ID"])
        .filter((id: any) => id !== null && id !== undefined && String(id).trim() !== '')
        .map((id: any) => String(id).trim())
    );

    // Find Emp IDs to delete (in database but not in new file)
    const empIdsToDelete: string[] = [];
    existingEmpIds.forEach((id, empId) => {
      // empId in Map is already string (from getExistingEmpIds adjustment below)
      if (!newEmpIds.has(empId)) {
        empIdsToDelete.push(empId);
      }
    });

    // Delete removed employees
    let deletedCount = 0;
    if (empIdsToDelete.length > 0) {
      deletedCount = await deleteEmployeesByEmpIds(empIdsToDelete);
    }

    // Separate new vs existing employees
    const employeesToInsert: any[] = [];
    const employeesToUpdate: any[] = [];

    rows.forEach((row: any) => {
      const rawId = row["Emp ID"];
      if (rawId === null || rawId === undefined || String(rawId).trim() === '') return;

      const empId = String(rawId).trim();

      // Look for any variation of Last Working Day
      const lastWorkingDay =
        row["Last Working\r\nDay"] ||
        row["Last Working Day"] ||
        row["Last Working\r\n Day"] ||
        row["last_working_day"] ||
        row["Resignation Date"] ||
        row["LWD"] ||
        null;

      const dbId = existingEmpIds.get(empId);

      if (dbId) {
        // EXSITING: Only update specific columns (per user request)
        employeesToUpdate.push({
          emp_id: empId,
          // Only update these fields
          job_title: row["Job Title"] || null,
          last_working_day: lastWorkingDay
        });
      } else {
        // NEW: Insert full record
        employeesToInsert.push({
          emp_id: empId,
          full_name: row["FullName "] || row["FullName"] || null,
          job_title: row["Job Title"] || null,
          dept: row["Dept"] || null,
          bu: row["BU"] || null,
          bu_org_3: row["BU Org 3"] || row["BU Org 3 "] || null,
          dl_idl_staff: row["DL/IDL/Staff"] || null,
          location: row["Location"] || null,
          employee_type: row["Employee Type"] || null,
          line_manager: row["Line Manager"] || null,
          joining_date: row["Joining\r\n Date"] || row["Joining Date"] || null,
          last_working_day: lastWorkingDay
        });
      }
    });

    let savedCount = 0;

    // 1. Insert New Employees
    if (employeesToInsert.length > 0) {
      const { error } = await supabaseAdmin
        .from('employees')
        .insert(employeesToInsert);

      if (error) throw error;
      savedCount += employeesToInsert.length;
    }

    // 2. Update Existing Employees (Partial Update)
    if (employeesToUpdate.length > 0) {
      const { error } = await supabaseAdmin
        .from('employees')
        .upsert(employeesToUpdate, { onConflict: 'emp_id' }); // Upsert with partial data updates only the specified columns for existing rows

      if (error) throw error;
      savedCount += employeesToUpdate.length;
    }

    // Invalidate cache after import
    invalidateCachePrefix('employees');

    return NextResponse.json({
      success: true,
      total: rows.length,
      saved: savedCount, // This now represents total upserted (inserted + updated)
      deleted: deletedCount
    });
  } catch (err: any) {
    console.error("Import error:", err);
    return NextResponse.json(
      { error: err.message || "Failed to import file" },
      { status: 500 }
    );
  }
}