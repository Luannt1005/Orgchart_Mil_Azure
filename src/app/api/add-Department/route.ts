import { NextResponse } from "next/server";
import { getDbConnection, sql } from "@/lib/db";

/**
 * POST /api/add-Department
 * Add a new department node to orgchart
 */
export async function POST(req: Request) {
  try {
    const body = await req.json();

    // Validate required fields
    if (!body.name || !body.pid) {
      console.warn("Missing required fields in add-Department:", {
        name: !!body.name,
        pid: !!body.pid,
      });
      return NextResponse.json(
        {
          success: false,
          error: "Missing required fields: name and pid are required",
        },
        { status: 400 }
      );
    }

    console.log("Adding department to Azure SQL:", {
      name: body.name,
      pid: body.pid,
    });

    // Create department object
    const departmentId = body.id || `dept:${body.name}:${body.pid}`;
    const departmentData = {
      id: departmentId,
      pid: body.pid,
      stpid: null,
      name: body.name,
      title: "Department",
      image: null,
      tags: JSON.stringify(["group"]),
      orig_pid: body.pid,
      dept: body.name,
      bu: null,
      type: "group",
      location: null,
      description: body.description || `Department under manager ${body.pid}`,
      joining_date: null
    };

    const pool = await getDbConnection();

    // Check if exists
    const check = await pool.request()
      .input('id', sql.NVarChar, departmentId)
      .query("SELECT id FROM orgchart_nodes WHERE id = @id");

    if (check.recordset.length > 0) {
      // Update
      await pool.request()
        .input('id', sql.NVarChar, departmentData.id)
        .input('pid', sql.NVarChar, departmentData.pid)
        .input('name', sql.NVarChar, departmentData.name)
        .input('description', sql.NVarChar, departmentData.description)
        // Update other fields if needed, simplified for department node logic
        .query(`
                UPDATE orgchart_nodes 
                SET pid = @pid, name = @name, description = @description, updated_at = SYSDATETIME()
                WHERE id = @id
            `);
    } else {
      // Insert
      await pool.request()
        .input('id', sql.NVarChar, departmentData.id)
        .input('pid', sql.NVarChar, departmentData.pid)
        .input('stpid', sql.NVarChar, departmentData.stpid)
        .input('name', sql.NVarChar, departmentData.name)
        .input('title', sql.NVarChar, departmentData.title)
        .input('tags', sql.NVarChar, departmentData.tags)
        .input('orig_pid', sql.NVarChar, departmentData.orig_pid)
        .input('dept', sql.NVarChar, departmentData.dept)
        .input('type', sql.NVarChar, departmentData.type)
        .input('description', sql.NVarChar, departmentData.description)
        .query(`
                INSERT INTO orgchart_nodes (id, pid, stpid, name, title, tags, orig_pid, dept, type, description)
                VALUES (@id, @pid, @stpid, @name, @title, @tags, @orig_pid, @dept, @type, @description)
            `);
    }

    console.log("Department added successfully:", departmentId);

    return NextResponse.json(
      {
        success: true,
        data: departmentData,
        timestamp: new Date().toISOString(),
      },
      { status: 200 }
    );
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Failed to add department";
    console.error("POST /api/add-Department failed:", errorMessage);

    return NextResponse.json(
      {
        success: false,
        error: errorMessage,
      },
      { status: 500 }
    );
  }
}
