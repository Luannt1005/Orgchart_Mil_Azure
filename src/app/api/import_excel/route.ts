import { NextResponse } from "next/server";
import * as XLSX from "xlsx";
import { getDbConnection, sql } from "@/lib/db";
import { invalidateCachePrefix } from "@/lib/cache";
import { isAuthenticated, unauthorizedResponse, getCurrentUser } from "@/lib/auth-server";

/**
 * Get existing Emp IDs from database (Azure SQL)
 */
async function getExistingEmpIds(transaction: sql.Transaction): Promise<Map<string, string>> {
  const request = transaction.request();
  const result = await request.query("SELECT id, emp_id FROM employees");

  const empIds = new Map<string, string>();
  result.recordset.forEach((row: any) => {
    if (row.emp_id) {
      empIds.set(row.emp_id, row.id);
    }
  });

  return empIds;
}

/**
 * POST /api/import_excel
 * Import employees from Excel file to Azure SQL
 */
export async function POST(req: Request) {
  if (!await isAuthenticated()) {
    return unauthorizedResponse();
  }
  const currentUser = await getCurrentUser();
  console.log(`🔐 POST /api/import_excel accessed by: ${currentUser}`);

  let transaction: sql.Transaction | null = null;

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

    const pool = await getDbConnection();
    transaction = new sql.Transaction(pool);
    await transaction.begin();

    // Get existing Emp IDs
    const existingEmpIds = await getExistingEmpIds(transaction);

    // Get Emp IDs from import file for "Full Sync" check
    const newEmpIds = new Set(
      rows
        .map((row: any) => row["Emp ID"])
        .filter((id: any) => id !== null && id !== undefined && String(id).trim() !== '')
        .map((id: any) => String(id).trim())
    );

    // Find Emp IDs to delete (in database but not in new file)
    const dbIdsToDelete: string[] = [];
    existingEmpIds.forEach((dbId, empId) => {
      if (!newEmpIds.has(empId)) {
        dbIdsToDelete.push(dbId);
      }
    });

    let savedCount = 0;
    let deletedCount = 0;

    // 1. Process Insert/Update
    for (const row of rows as any[]) {
      const rawId = row["Emp ID"];
      if (rawId === null || rawId === undefined || String(rawId).trim() === '') continue;

      const empId = String(rawId).trim();
      const dbId = existingEmpIds.get(empId);

      const safeString = (val: any) => (val === null || val === undefined) ? null : String(val);

      const full_name = safeString(row["FullName "] || row["FullName"] || row["Full Name"]);
      const job_title = safeString(row["Job Title"]);
      const dept = safeString(row["Dept"]);
      const bu = safeString(row["BU"]);
      const bu_org_3 = safeString(row["BU Org 3"] || row["BU Org 3 "]);
      const dl_idl_staff = safeString(row["DL/IDL/Staff"]);
      const location = safeString(row["Location"]);
      const employee_type = safeString(row["Employee Type"]);
      const line_manager = safeString(row["Line Manager"]);
      const is_direct = safeString(row["Is Direct"] || "YES");
      const joining_date = safeString(row["Joining\r\n Date"] || row["Joining Date"]);

      const last_working_day = safeString(
        row["Last Working\r\nDay"] ||
        row["Last Working Day"] ||
        row["Last Working\r\n Day"] ||
        row["last_working_day"] ||
        row["Resignation Date"] ||
        row["LWD"]
      );

      const request = transaction.request();
      request.input('emp_id', sql.NVarChar, empId);
      request.input('full_name', sql.NVarChar, full_name);
      request.input('job_title', sql.NVarChar, job_title);
      request.input('dept', sql.NVarChar, dept);
      request.input('bu', sql.NVarChar, bu);
      request.input('bu_org_3', sql.NVarChar, bu_org_3);
      request.input('dl_idl_staff', sql.NVarChar, dl_idl_staff);
      request.input('location', sql.NVarChar, location);
      request.input('employee_type', sql.NVarChar, employee_type);
      request.input('line_manager', sql.NVarChar, line_manager);
      request.input('is_direct', sql.NVarChar, is_direct);
      request.input('joining_date', sql.NVarChar, joining_date);
      request.input('last_working_day', sql.NVarChar, last_working_day);

      if (dbId) {
        // UPDATE
        request.input('id', sql.UniqueIdentifier, dbId);
        await request.query(`
          UPDATE employees SET
            full_name = @full_name,
            job_title = @job_title,
            dept = @dept,
            bu = @bu,
            bu_org_3 = @bu_org_3,
            dl_idl_staff = @dl_idl_staff,
            location = @location,
            employee_type = @employee_type,
            line_manager = @line_manager,
            is_direct = @is_direct,
            joining_date = @joining_date,
            last_working_day = @last_working_day,
            updated_at = GETDATE()
          WHERE id = @id
        `);
      } else {
        // INSERT
        await request.query(`
          INSERT INTO employees (
            emp_id, full_name, job_title, dept, bu, bu_org_3, dl_idl_staff, 
            location, employee_type, line_manager, is_direct, joining_date, last_working_day
          ) VALUES (
            @emp_id, @full_name, @job_title, @dept, @bu, @bu_org_3, @dl_idl_staff,
            @location, @employee_type, @line_manager, @is_direct, @joining_date, @last_working_day
          )
        `);
      }
      savedCount++;
    }

    // 2. Delete removed employees
    if (dbIdsToDelete.length > 0) {
      // Chunk deletions to avoid parameter limits (2100 params max)
      const CHUNK_SIZE = 1000;
      for (let i = 0; i < dbIdsToDelete.length; i += CHUNK_SIZE) {
        const chunk = dbIdsToDelete.slice(i, i + CHUNK_SIZE);
        const request = transaction.request();
        // Construct WHERE id IN ('...','...') manually or use Table Valued Parameter (too complex for now).
        // Safest is to loop or construct string carefully. 
        // Given UUIDs are safe from injection if validated, but they are strings here.
        // Let's loop delete for safety, or use a single query with many params.

        // Actually, let's just loop delete for now unless it's massive.
        // Or better:
        const listStr = chunk.map(id => `'${id}'`).join(',');
        await request.query(`DELETE FROM employees WHERE id IN (${listStr})`);
        deletedCount += chunk.length;
      }
    }

    await transaction.commit();

    // Invalidate cache
    invalidateCachePrefix('employees');

    return NextResponse.json({
      success: true,
      total: rows.length,
      saved: savedCount,
      deleted: deletedCount
    });

  } catch (err: any) {
    console.error("Import error:", err);
    if (transaction) {
      try { await transaction.rollback(); } catch (e) { console.error("Rollback failed:", e); }
    }
    return NextResponse.json(
      { error: err.message || "Failed to import file" },
      { status: 500 }
    );
  }
}