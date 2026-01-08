import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { getCachedData, invalidateCachePrefix } from "@/lib/cache";
import { syncSingleEmployee } from "@/lib/orgchart-sync";

// Cache TTL: 15 minutes for employee list
const EMPLOYEES_CACHE_TTL = 15 * 60 * 1000;

// Columns to select for listing - all employee data columns
const LIST_COLUMNS = 'id, emp_id, full_name, job_title, dept, bu, bu_org_3, dl_idl_staff, location, employee_type, line_manager, joining_date, last_working_day, line_manager_status, pending_line_manager';

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
  'line_manager': 'line_manager'
};

/**
 * GET /api/sheet
 * Fetch employees with optional pagination and filtering
 */
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    const page = parseInt(searchParams.get("page") || "0");
    const limit = parseInt(searchParams.get("limit") || "0");

    // ======= SINGLE EMPLOYEE FETCH =======
    if (id) {
      const { data, error } = await supabaseAdmin
        .from('employees')
        .select('*')
        .eq('id', id)
        .single();

      if (error || !data) {
        return NextResponse.json(
          { success: false, error: "Employee not found" },
          { status: 404 }
        );
      }

      return NextResponse.json({ success: true, data });
    }

    // ======= PAGINATED FETCH =======
    if (page > 0 && limit > 0) {
      const excludedParams = ['page', 'limit', 'id', 'preventCache'];

      // Only include filters that map to valid database columns
      const filters: { [key: string]: string } = {};
      searchParams.forEach((value, key) => {
        if (!excludedParams.includes(key) && value.trim() !== '') {
          if (FILTER_MAPPING[key]) {
            filters[key] = value;
          } else {
            // Ignore unknown filters silently
            console.log(`⚠️ Ignoring unknown filter: ${key}=${value}`);
          }
        }
      });

      const hasFilters = Object.keys(filters).length > 0;

      // Build count query
      let countQuery = supabaseAdmin
        .from('employees')
        .select('id', { count: 'exact', head: true });

      Object.entries(filters).forEach(([key, value]) => {
        const dbColumn = FILTER_MAPPING[key];
        if (dbColumn) {
          // Use exact match for status columns, ilike for text search
          if (dbColumn === 'line_manager_status') {
            countQuery = countQuery.eq(dbColumn, value);
          } else {
            countQuery = countQuery.ilike(dbColumn, `%${value}%`);
          }
        }
      });

      const { count: totalCount, error: countError } = await countQuery;

      if (countError) {
        console.error("Count error:", countError);
      }

      // Build data query with pagination
      const from = (page - 1) * limit;
      const to = from + limit - 1;

      let dataQuery = supabaseAdmin
        .from('employees')
        .select(LIST_COLUMNS);

      Object.entries(filters).forEach(([key, value]) => {
        const dbColumn = FILTER_MAPPING[key];
        if (dbColumn) {
          // Use exact match for status columns, ilike for text search
          if (dbColumn === 'line_manager_status') {
            dataQuery = dataQuery.eq(dbColumn, value);
          } else {
            dataQuery = dataQuery.ilike(dbColumn, `%${value}%`);
          }
        }
      });

      const { data: employees, error: dataError } = await dataQuery
        .range(from, to)
        .order('full_name', { ascending: true });

      if (dataError) {
        console.error("Data query error:", dataError);
        throw dataError;
      }

      // Transform to match expected format - all data comes from database columns directly
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
        "Joining\r\n Date": emp.joining_date,
        "Last Working\r\nDay": emp.last_working_day,
        lineManagerStatus: emp.line_manager_status,
        pendingLineManager: emp.pending_line_manager
      }));

      const total = totalCount || 0;
      const totalPages = Math.ceil(total / limit);

      console.log(`📄 Page ${page}: ${transformedEmployees.length} records (${from}-${to} of ${total})`);

      const response = NextResponse.json({
        success: true,
        headers: ["id", "Emp ID", "FullName ", "Job Title", "Dept", "BU", "DL/IDL/Staff", "Location", "Employee Type", "Line Manager", "Joining\r\n Date"],
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

        const { data: employees, error } = await supabaseAdmin
          .from('employees')
          .select(LIST_COLUMNS)
          .order('full_name', { ascending: true });

        if (error) throw error;

        // Transform to match expected format - all data comes from database columns directly
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
          "Joining\r\n Date": emp.joining_date,
          "Last Working\r\nDay": emp.last_working_day,
          lineManagerStatus: emp.line_manager_status,
          pendingLineManager: emp.pending_line_manager
        }));

        console.log(`✅ Loaded ${transformedEmployees.length} employees`);
        return {
          employees: transformedEmployees,
          headers: ["id", "Emp ID", "FullName ", "Job Title", "Dept", "BU", "DL/IDL/Staff", "Location", "Employee Type", "Line Manager", "Joining\r\n Date"]
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
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("GET /api/sheet error:", message);
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
  try {
    const body = await req.json();
    const { action, data } = body;

    if (!action || !data) {
      return NextResponse.json(
        { success: false, error: "Missing action or data" },
        { status: 400 }
      );
    }

    if (action === "add") {
      const newEmployee = {
        emp_id: data["Emp ID"] || `EMP-${Date.now()}`,
        full_name: data["FullName "] || data["FullName"] || null,
        job_title: data["Job Title"] || null,
        dept: data["Dept"] || null,
        bu: data["BU"] || null,
        bu_org_3: data["BU Org 3"] || null,
        dl_idl_staff: data["DL/IDL/Staff"] || null,
        location: data["Location"] || null,
        employee_type: data["Employee Type"] || null,
        line_manager: data["Line Manager"] || null,
        joining_date: data["Joining\r\n Date"] || data["Joining Date"] || null,
        last_working_day: data["Last Working\r\nDay"] || data["Last Working Day"] || null
      };

      const { data: inserted, error } = await supabaseAdmin
        .from('employees')
        .insert(newEmployee)
        .select('id')
        .single();

      if (error) throw error;

      invalidateCachePrefix('employees');

      // Sync to OrgChart asynchronously
      if (inserted && inserted.id) {
        syncSingleEmployee(inserted.id).then((res: any) => {
          console.log(`Async sync result for ${inserted.id}:`, res);
        }).catch((err: any) => console.error("Async sync failed:", err));
      }

      return NextResponse.json({
        success: true,
        id: inserted.id,
        message: "Employee added successfully"
      });
    }

    // Reject all pending approval requests
    if (action === "rejectAll") {
      const { data: pendingRows, error: fetchError } = await supabaseAdmin
        .from('employees')
        .select('id')
        .eq('line_manager_status', 'pending');

      if (fetchError) throw fetchError;

      if (!pendingRows || pendingRows.length === 0) {
        return NextResponse.json({
          success: true,
          count: 0,
          message: "No pending requests to reject"
        });
      }

      const { error: updateError } = await supabaseAdmin
        .from('employees')
        .update({
          line_manager_status: 'rejected',
          pending_line_manager: null
        })
        .eq('line_manager_status', 'pending');

      if (updateError) throw updateError;

      invalidateCachePrefix('employees');

      console.log(`🚫 Rejected ${pendingRows.length} pending requests`);

      return NextResponse.json({
        success: true,
        count: pendingRows.length,
        message: `Rejected ${pendingRows.length} pending requests`
      });
    }

    // Approve all pending approval requests
    if (action === "approveAll") {
      const { data: pendingRows, error: fetchError } = await supabaseAdmin
        .from('employees')
        .select('id, pending_line_manager')
        .eq('line_manager_status', 'pending');

      if (fetchError) throw fetchError;

      if (!pendingRows || pendingRows.length === 0) {
        return NextResponse.json({
          success: true,
          count: 0,
          message: "No pending requests to approve"
        });
      }

      // Update each record: move pending_line_manager to line_manager
      let successCount = 0;
      for (const row of pendingRows) {
        const { error: updateError } = await supabaseAdmin
          .from('employees')
          .update({
            line_manager: row.pending_line_manager,
            line_manager_status: 'approved',
            pending_line_manager: null
          })
          .eq('id', row.id);

        if (!updateError) successCount++;
      }

      invalidateCachePrefix('employees');

      // Trigger OrgChart sync after approving all
      console.log(`✅ Approved ${successCount} pending requests`);

      return NextResponse.json({
        success: true,
        count: successCount,
        message: `Approved ${successCount} pending requests`
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
  try {
    const body = await req.json();
    const { id, data } = body;

    if (!id || !data) {
      return NextResponse.json(
        { success: false, error: "Missing id or data" },
        { status: 400 }
      );
    }

    const updateData: Record<string, any> = {};

    if (data["Emp ID"]) updateData.emp_id = data["Emp ID"];
    if (data["FullName "] || data["FullName"]) updateData.full_name = data["FullName "] || data["FullName"];
    if (data["Job Title"]) updateData.job_title = data["Job Title"];
    if (data["Dept"]) updateData.dept = data["Dept"];
    if (data["BU"]) updateData.bu = data["BU"];
    if (data["BU Org 3"]) updateData.bu_org_3 = data["BU Org 3"];
    if (data["DL/IDL/Staff"]) updateData.dl_idl_staff = data["DL/IDL/Staff"];
    if (data["Location"]) updateData.location = data["Location"];
    if (data["Employee Type"]) updateData.employee_type = data["Employee Type"];
    if (data["Line Manager"]) updateData.line_manager = data["Line Manager"];
    if (data["Joining\r\n Date"] || data["Joining Date"]) updateData.joining_date = data["Joining\r\n Date"] || data["Joining Date"];
    if (data["Last Working\r\nDay"] || data["Last Working Day"]) updateData.last_working_day = data["Last Working\r\nDay"] || data["Last Working Day"];

    // Handle approval workflow fields
    if (data["lineManagerStatus"] !== undefined) {
      updateData.line_manager_status = data["lineManagerStatus"];
    }
    if (data["pendingLineManager"] !== undefined) {
      updateData.pending_line_manager = data["pendingLineManager"];
    }
    // Also handle snake_case versions (from direct API calls)
    if (data["line_manager_status"] !== undefined) {
      updateData.line_manager_status = data["line_manager_status"];
    }
    if (data["pending_line_manager"] !== undefined) {
      updateData.pending_line_manager = data["pending_line_manager"];
    }

    const { error } = await supabaseAdmin
      .from('employees')
      .update(updateData)
      .eq('id', id);

    if (error) throw error;

    invalidateCachePrefix('employees');

    // Sync to OrgChart asynchronously
    syncSingleEmployee(id).then((res: any) => {
      console.log(`Async sync result for ${id}:`, res);
    }).catch((err: any) => console.error("Async sync failed:", err));

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
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    const deleteAll = searchParams.get("deleteAll");

    // Delete ALL employees
    if (deleteAll === "true") {
      // First get the count
      const { count, error: countError } = await supabaseAdmin
        .from('employees')
        .select('id', { count: 'exact', head: true });

      if (countError) throw countError;

      // Delete all records
      const { error: deleteError } = await supabaseAdmin
        .from('employees')
        .delete()
        .neq('id', '00000000-0000-0000-0000-000000000000'); // Workaround to delete all

      if (deleteError) throw deleteError;

      invalidateCachePrefix('employees');

      console.log(`🗑️ Deleted ALL ${count} employees`);

      return NextResponse.json({
        success: true,
        count: count || 0,
        message: `Deleted all ${count || 0} employees`
      });
    }

    // Delete single employee
    if (!id) {
      return NextResponse.json(
        { success: false, error: "Missing id" },
        { status: 400 }
      );
    }

    const { error } = await supabaseAdmin
      .from('employees')
      .delete()
      .eq('id', id);

    if (error) throw error;

    invalidateCachePrefix('employees');

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