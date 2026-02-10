import { NextResponse } from "next/server";
import { getDbConnection, sql } from "@/lib/db";
import { getCachedData, invalidateCachePrefix } from "@/lib/cache";

import { retryOperation } from "@/lib/retry";
import { isAuthenticated, unauthorizedResponse, getCurrentUser } from "@/lib/auth-server";

// Cache TTL: 15 minutes for employee list
const EMPLOYEES_CACHE_TTL = 15 * 60 * 1000;

// Columns to select for listing - all employee data columns
const LIST_COLUMNS = 'id, emp_id, full_name, job_title, dept, bu, bu_org_3, dl_idl_staff, location, employee_type, line_manager, joining_date, last_working_day, line_manager_status, pending_line_manager, is_direct, requester';

// Whitelist of allowed filter params -> database columns
const FILTER_MAPPING: { [key: string]: string } = {
  'Dept': 'dept',
  'BU': 'bu',
  'DL/IDL/Staff': 'dl_idl_staff',
  'Job Title': 'job_title',
  'Location': 'location',
  'FullName ': 'full_name',
  'Emp ID': 'emp_id',
  'Employee Type': 'employee_type',
  'Line Manager': 'line_manager',
  'Is Direct': 'is_direct',
  // Approval workflow filters
  'lineManagerStatus': 'line_manager_status',
  'line_manager_status': 'line_manager_status',
  // Common lowercase variations
  'dept': 'dept',
  'bu': 'bu',
  'location': 'location',
  'full_name': 'full_name',
  'emp_id': 'emp_id',
  'job_title': 'job_title',
  'dl_idl_staff': 'dl_idl_staff',
  'employee_type': 'employee_type',
  'line_manager': 'line_manager',
  'is_direct': 'is_direct'
};

/**
 * GET /api/sheet
 * Fetch employees with optional pagination and filtering
 */
export async function GET(req: Request) {
  if (!await isAuthenticated()) {
    return unauthorizedResponse();
  }
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    const page = parseInt(searchParams.get("page") || "0");
    const limit = parseInt(searchParams.get("limit") || "0");
    const pool = await getDbConnection();

    // ======= SINGLE EMPLOYEE FETCH =======
    if (id) {
      const result = await pool.request()
        .input('id', sql.UniqueIdentifier, id)
        .query("SELECT * FROM employees WHERE id = @id");

      if (result.recordset.length === 0) {
        return NextResponse.json(
          { success: false, error: "Employee not found" },
          { status: 404 }
        );
      }

      return NextResponse.json({ success: true, data: result.recordset[0] });
    }

    // ======= PAGINATED FETCH =======
    if (page > 0 && limit > 0) {
      const excludedParams = ['page', 'limit', 'id', 'preventCache'];
      const filters: { [key: string]: string } = {};

      searchParams.forEach((value, key) => {
        if (!excludedParams.includes(key) && value.trim() !== '') {
          if (FILTER_MAPPING[key]) {
            filters[key] = value;
          }
        }
      });

      const hasFilters = Object.keys(filters).length > 0;
      let whereClause = "1=1";
      const request = pool.request();

      Object.entries(filters).forEach(([key, value], index) => {
        const dbColumn = FILTER_MAPPING[key];
        if (dbColumn) {
          const paramName = `param_${index}`;
          if (dbColumn === 'line_manager_status' || dbColumn === 'dl_idl_staff') {
            whereClause += ` AND ${dbColumn} = @${paramName}`;
            request.input(paramName, sql.NVarChar, value);
          } else {
            whereClause += ` AND ${dbColumn} LIKE @${paramName}`;
            request.input(paramName, sql.NVarChar, `%${value}%`);
          }
        }
      });

      // Count query
      const countResult = await request.query(`SELECT COUNT(*) as count FROM employees WHERE ${whereClause}`);
      const totalCount = countResult.recordset[0].count;

      // Data query with pagination
      const offset = (page - 1) * limit;
      // Note: ORDER BY is mandatory for OFFSET FETCH
      const dataResult = await request.query(`
          SELECT ${LIST_COLUMNS} 
          FROM employees 
          WHERE ${whereClause} 
          ORDER BY full_name ASC 
          OFFSET ${offset} ROWS FETCH NEXT ${limit} ROWS ONLY
      `);

      const employees = dataResult.recordset;

      // Transform to match expected format
      const transformedEmployees = (employees || []).map(emp => ({
        id: emp.id,
        "Emp ID": emp.emp_id,
        "FullName ": emp.full_name,
        "Job Title": emp.job_title,
        "Dept": emp.dept,
        "BU": emp.bu,
        "BU Org 3": emp.bu_org_3,
        "DL/IDL/Staff": emp.dl_idl_staff,
        "Location": emp.location,
        "Employee Type": emp.employee_type,
        "Line Manager": emp.line_manager,
        "Is Direct": emp.is_direct,
        "Joining\r\n Date": emp.joining_date,
        "Last Working\r\nDay": emp.last_working_day,
        lineManagerStatus: emp.line_manager_status,
        pendingLineManager: emp.pending_line_manager,
        requester: emp.requester
      }));

      const total = totalCount || 0;
      const totalPages = Math.ceil(total / limit);

      console.log(`📄 Page ${page}: ${transformedEmployees.length} records`);

      const response = NextResponse.json({
        success: true,
        headers: ["id", "Emp ID", "FullName ", "Job Title", "Dept", "BU", "DL/IDL/Staff", "Location", "Employee Type", "Line Manager", "Is Direct", "Joining\r\n Date", "Last Working\r\nDay"],
        data: transformedEmployees,
        page,
        limit,
        total,
        totalPages
      });

      response.headers.set(
        "Cache-Control",
        hasFilters ? "no-store" : "public, s-maxage=120, stale-while-revalidate=300"
      );

      return response;
    }

    // ======= FULL DATA FETCH (for Dashboard/Charts) =======
    const cachedResult = await getCachedData(
      'employees_all',
      async () => {
        console.log("📡 Fetching all employees for dashboard...");

        const result = await pool.request().query(`SELECT ${LIST_COLUMNS} FROM employees ORDER BY full_name ASC`);
        const employees = result.recordset;

        // Transform
        const transformedEmployees = (employees || []).map(emp => ({
          id: emp.id,
          "Emp ID": emp.emp_id,
          "FullName ": emp.full_name,
          "Job Title": emp.job_title,
          "Dept": emp.dept,
          "BU": emp.bu,
          "BU Org 3": emp.bu_org_3,
          "DL/IDL/Staff": emp.dl_idl_staff,
          "Location": emp.location,
          "Employee Type": emp.employee_type,
          "Line Manager": emp.line_manager,
          "Is Direct": emp.is_direct,
          "Joining\r\n Date": emp.joining_date,
          "Last Working\r\nDay": emp.last_working_day,
          lineManagerStatus: emp.line_manager_status,
          pendingLineManager: emp.pending_line_manager,
          requester: emp.requester
        }));

        console.log(`✅ Loaded ${transformedEmployees.length} employees`);
        return {
          employees: transformedEmployees,
          headers: ["id", "Emp ID", "FullName ", "Job Title", "Dept", "BU", "DL/IDL/Staff", "Location", "Employee Type", "Line Manager", "Is Direct", "Joining\r\n Date", "Last Working\r\nDay"]
        };
      },
      EMPLOYEES_CACHE_TTL
    );

    const response = NextResponse.json({
      success: true,
      total: cachedResult.employees.length,
      headers: cachedResult.headers,
      data: cachedResult.employees
    });

    response.headers.set("Cache-Control", "public, s-maxage=120, stale-while-revalidate=300");
    return response;

  } catch (error) {
    const message = (error as any)?.message || (typeof error === 'string' ? error : "Unknown error");
    console.error("GET /api/sheet error:", error);
    return NextResponse.json(
      { success: false, error: message },
      { status: 500 }
    );
  }
}

/**
 * POST /api/sheet - Add new employee
 */
export async function POST(req: Request) {
  if (!await isAuthenticated()) {
    return unauthorizedResponse();
  }
  const currentUser = await getCurrentUser();
  console.log(`🔐 POST /api/sheet accessed by: ${currentUser}`);

  try {
    const body = await req.json();
    const { action, data } = body;
    const pool = await getDbConnection();

    if (!action || !data) {
      return NextResponse.json(
        { success: false, error: "Missing action or data" },
        { status: 400 }
      );
    }

    if (action === "bulkAddHeadcount") {
      const { quantity, data } = body;
      console.log(`[bulkAddHeadcount] Received data for ${quantity} positions:`, JSON.stringify(data));

      if (!quantity || typeof quantity !== 'number' || quantity <= 0) {
        return NextResponse.json(
          { success: false, error: "Invalid quantity" },
          { status: 400 }
        );
      }

      const timestamp = Date.now();
      let insertedCount = 0;

      const transaction = new sql.Transaction(pool);
      await transaction.begin();

      try {
        for (let i = 0; i < quantity; i++) {
          const empId = `HC-${timestamp}-${i + 1}`;
          // Use request from transaction
          await transaction.request()
            .input('emp_id', sql.NVarChar, empId)
            .input('full_name', sql.NVarChar, data["FullName "] || data["FullName"] || "Vacant Position")
            .input('job_title', sql.NVarChar, data["Job Title"] || null)
            .input('dept', sql.NVarChar, data["Dept"] || null)
            .input('bu', sql.NVarChar, data["BU"] || null)
            .input('bu_org_3', sql.NVarChar, data["BU Org 3"] || null)
            .input('dl_idl_staff', sql.NVarChar, data["DL/IDL/Staff"] || null)
            .input('location', sql.NVarChar, data["Location"] || null)
            // .input('employee_type', sql.NVarChar, 'hc_open') // Defined below
            .input('line_manager', sql.NVarChar, data["Line Manager"] || null)
            .input('is_direct', sql.NVarChar, data["Is Direct"] || "YES")
            .input('joining_date', sql.NVarChar, data["Joining\r\n Date"] || data["Joining Date"] || null)
            .input('last_working_day', sql.NVarChar, data["Last Working\r\nDay"] || data["Last Working Day"] || null)
            .query(`
                    INSERT INTO employees (
                        emp_id, full_name, job_title, dept, bu, dl_idl_staff, location, employee_type, 
                        line_manager, is_direct, joining_date
                    ) VALUES (
                        @emp_id, @full_name, @job_title, @dept, @bu, @dl_idl_staff, @location, 'hc_open',
                        @line_manager, @is_direct, @joining_date
                    )
                `);
          insertedCount++;
        }
        await transaction.commit();
      } catch (err: any) {
        await transaction.rollback();
        throw err;
      }

      invalidateCachePrefix('employees');
      invalidateCachePrefix('orgchart');

      return NextResponse.json({
        success: true,
        count: insertedCount,
        message: `Successfully added ${insertedCount} open headcount positions`
      });
    }

    if (action === "add") {
      const emp_id = data["Emp ID"] || `EMP-${Date.now()}`;

      const result = await pool.request()
        .input('emp_id', sql.NVarChar, emp_id)
        .input('full_name', sql.NVarChar, data["FullName "] || data["FullName"] || null)
        .input('job_title', sql.NVarChar, data["Job Title"] || null)
        .input('dept', sql.NVarChar, data["Dept"] || null)
        .input('bu', sql.NVarChar, data["BU"] || null)
        .input('dl_idl_staff', sql.NVarChar, data["DL/IDL/Staff"] || null)
        .input('location', sql.NVarChar, data["Location"] || null)
        .input('employee_type', sql.NVarChar, data["Employee Type"] || null)
        .input('line_manager', sql.NVarChar, data["Line Manager"] || null)
        .input('is_direct', sql.NVarChar, data["Is Direct"] || "YES")
        .input('joining_date', sql.NVarChar, data["Joining\r\n Date"] || data["Joining Date"] || null)
        .query(`
            INSERT INTO employees (
                emp_id, full_name, job_title, dept, bu, dl_idl_staff, location, employee_type,
                line_manager, is_direct, joining_date
            ) OUTPUT INSERTED.id VALUES (
                @emp_id, @full_name, @job_title, @dept, @bu, @dl_idl_staff, @location, @employee_type,
                @line_manager, @is_direct, @joining_date
            )
        `);

      const insertedId = result.recordset[0]?.id;
      invalidateCachePrefix('employees');
      invalidateCachePrefix('orgchart');

      return NextResponse.json({
        success: true,
        id: insertedId,
        message: "Employee added successfully"
      });
    }

    // Reject all pending approval requests
    if (action === "rejectAll") {
      const result = await pool.request().query(`
            UPDATE employees 
            SET line_manager_status = 'rejected', pending_line_manager = NULL, requester = NULL
            WHERE line_manager_status = 'pending'
        `);

      const count = result.rowsAffected[0];

      invalidateCachePrefix('employees');
      invalidateCachePrefix('orgchart');

      // console.log(`🚫 Rejected ${count} pending requests`);

      return NextResponse.json({
        success: true,
        count: count,
        message: `Rejected ${count} pending requests`
      });
    }

    // Approve all pending approval requests
    if (action === "approveAll") {
      // We need to update line_manager to pending_line_manager value
      const result = await pool.request().query(`
          UPDATE employees
          SET line_manager = pending_line_manager,
              line_manager_status = 'approved',
              pending_line_manager = NULL,
              requester = NULL
          WHERE line_manager_status = 'pending'
      `);

      const count = result.rowsAffected[0];

      invalidateCachePrefix('employees');
      invalidateCachePrefix('orgchart');

      // console.log(`✅ Approved ${count} pending requests`);

      return NextResponse.json({
        success: true,
        count: count,
        message: `Approved ${count} pending requests`
      });
    }

    return NextResponse.json(
      { success: false, error: "Invalid action" },
      { status: 400 }
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("POST /api/sheet error:", message);
    return NextResponse.json(
      { success: false, error: message },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/sheet - Update employee
 */
export async function PUT(req: Request) {
  if (!await isAuthenticated()) {
    return unauthorizedResponse();
  }
  const currentUser = await getCurrentUser();
  console.log(`🔐 PUT /api/sheet accessed by: ${currentUser}`);

  try {
    const body = await req.json();
    const { id, data } = body;
    const pool = await getDbConnection();

    if (!id || !data) {
      return NextResponse.json(
        { success: false, error: "Missing id or data" },
        { status: 400 }
      );
    }

    const request = pool.request();
    request.input('id', sql.UniqueIdentifier, id); // Assuming ID is GUID

    let setClauses = [];

    // Map data fields to columns
    if (data["Emp ID"]) {
      request.input('emp_id', sql.NVarChar, data["Emp ID"]);
      setClauses.push("emp_id = @emp_id");
    }
    if (data["FullName "] || data["FullName"]) {
      request.input('full_name', sql.NVarChar, data["FullName "] || data["FullName"]);
      setClauses.push("full_name = @full_name");
    }
    if (data["Job Title"]) {
      request.input('job_title', sql.NVarChar, data["Job Title"]);
      setClauses.push("job_title = @job_title");
    }
    if (data["Dept"]) {
      request.input('dept', sql.NVarChar, data["Dept"]);
      setClauses.push("dept = @dept");
    }
    if (data["BU"]) {
      request.input('bu', sql.NVarChar, data["BU"]);
      setClauses.push("bu = @bu");
    }
    if (data["DL/IDL/Staff"]) {
      request.input('dl_idl_staff', sql.NVarChar, data["DL/IDL/Staff"]);
      setClauses.push("dl_idl_staff = @dl_idl_staff");
    }
    if (data["Location"]) {
      request.input('location', sql.NVarChar, data["Location"]);
      setClauses.push("location = @location");
    }
    if (data["Employee Type"]) {
      request.input('employee_type', sql.NVarChar, data["Employee Type"]);
      setClauses.push("employee_type = @employee_type");
    }
    if (data["Line Manager"]) {
      request.input('line_manager', sql.NVarChar, data["Line Manager"]);
      setClauses.push("line_manager = @line_manager");
    }
    if (data["Is Direct"]) {
      request.input('is_direct', sql.NVarChar, data["Is Direct"]);
      setClauses.push("is_direct = @is_direct");
    }
    if (data["Joining\r\n Date"] || data["Joining Date"]) {
      request.input('joining_date', sql.NVarChar, data["Joining\r\n Date"] || data["Joining Date"]);
      setClauses.push("joining_date = @joining_date");
    }

    if (data["lineManagerStatus"] !== undefined) {
      request.input('line_manager_status', sql.NVarChar, data["lineManagerStatus"]);
      setClauses.push("line_manager_status = @line_manager_status");
    }
    if (data["pendingLineManager"] !== undefined) {
      request.input('pending_line_manager', sql.NVarChar, data["pendingLineManager"]);
      setClauses.push("pending_line_manager = @pending_line_manager");
    }
    if (data["requester"] !== undefined) {
      request.input('requester', sql.NVarChar, data["requester"]);
      setClauses.push("requester = @requester");
    }

    if (setClauses.length > 0) {
      await request.query(`UPDATE employees SET ${setClauses.join(', ')} WHERE id = @id`);
    }

    invalidateCachePrefix('employees');
    invalidateCachePrefix('orgchart');

    return NextResponse.json({
      success: true,
      message: "Employee updated successfully"
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("PUT /api/sheet error:", message);
    return NextResponse.json(
      { success: false, error: message },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/sheet - Delete employee
 */
export async function DELETE(req: Request) {
  if (!await isAuthenticated()) {
    return unauthorizedResponse();
  }
  const currentUser = await getCurrentUser();
  console.log(`🔐 DELETE /api/sheet accessed by: ${currentUser}`);

  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    const deleteAll = searchParams.get("deleteAll");
    const pool = await getDbConnection();

    // Delete ALL employees
    if (deleteAll === "true") {
      // Only delete if we need to? Or just truncate? 
      // Note: TRUNCATE is faster but might require more perms or break FKs if any. 
      // Using delete with always true.
      const result = await pool.request().query("DELETE FROM employees");
      const count = result.rowsAffected[0];

      invalidateCachePrefix('employees');
      invalidateCachePrefix('orgchart');

      return NextResponse.json({
        success: true,
        count: count,
        message: `Deleted all ${count} employees`
      });
    }

    // Delete single employee
    if (!id) {
      return NextResponse.json(
        { success: false, error: "Missing id" },
        { status: 400 }
      );
    }

    await pool.request()
      .input('id', sql.UniqueIdentifier, id)
      .query("DELETE FROM employees WHERE id = @id");

    invalidateCachePrefix('employees');
    invalidateCachePrefix('orgchart');

    return NextResponse.json({
      success: true,
      message: "Employee deleted successfully"
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("DELETE /api/sheet error:", message);
    return NextResponse.json(
      { success: false, error: message },
      { status: 500 }
    );
  }
}
