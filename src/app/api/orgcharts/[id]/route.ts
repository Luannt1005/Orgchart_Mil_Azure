import { NextResponse } from 'next/server';
import { getDbConnection, sql } from '@/lib/db';

/**
 * GET /api/orgcharts/[id]
 * Fetch a single custom orgchart by ID
 */
export async function GET(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;

        // Validate ID
        if (!id || typeof id !== 'string') {
            return NextResponse.json(
                { error: "Invalid orgchart ID" },
                { status: 400 }
            );
        }

        const pool = await getDbConnection();
        const result = await pool.request()
            .input('id', sql.UniqueIdentifier, id)
            .query("SELECT * FROM custom_orgcharts WHERE id = @id");

        if (result.recordset.length === 0) {
            return NextResponse.json({
                error: "Orgchart not found",
                orgchart_id: id,
                org_data: { data: [] }
            }, { status: 404 });
        }

        const data = result.recordset[0];

        return NextResponse.json({
            orgchart_id: data.id,
            orgchart_name: data.orgchart_name,
            describe: data.description,
            org_data: JSON.parse(data.org_data || '{"data": []}'),
            username: data.username,
            created_at: data.created_at,
            updated_at: data.updated_at
        });
    } catch (err) {
        const error = err as Error;
        console.error("GET Orgchart Error:", error.message, error.stack);
        return NextResponse.json({
            error: error.message || "Unknown error occurred",
            details: process.env.NODE_ENV === 'development' ? error.stack : undefined
        }, { status: 500 });
    }
}

/**
 * PUT /api/orgcharts/[id]
 * Update an existing custom orgchart
 */
export async function PUT(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;
        const data = await request.json();
        const { org_data, orgchart_name, describe } = data;

        const pool = await getDbConnection();
        const requestSql = pool.request();
        requestSql.input('id', sql.UniqueIdentifier, id);

        let setClauses = ["updated_at = SYSDATETIME()"];

        if (org_data !== undefined) {
            requestSql.input('org_data', sql.NVarChar, JSON.stringify(org_data));
            setClauses.push("org_data = @org_data");
        }
        if (orgchart_name) {
            requestSql.input('orgchart_name', sql.NVarChar, orgchart_name);
            setClauses.push("orgchart_name = @orgchart_name");
        }
        if (describe !== undefined) {
            requestSql.input('description', sql.NVarChar, describe);
            setClauses.push("description = @description");
        }

        await requestSql.query(`UPDATE custom_orgcharts SET ${setClauses.join(', ')} WHERE id = @id`);

        return NextResponse.json({
            success: true,
            message: "Updated successfully"
        });
    } catch (err) {
        console.error("PUT Orgchart Error:", err);
        return NextResponse.json(
            { error: (err as Error).message },
            { status: 500 }
        );
    }
}

/**
 * DELETE /api/orgcharts/[id]
 * Delete a custom orgchart
 */
export async function DELETE(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;
        const pool = await getDbConnection();

        await pool.request()
            .input('id', sql.UniqueIdentifier, id)
            .query("DELETE FROM custom_orgcharts WHERE id = @id");

        return NextResponse.json({
            success: true,
            message: "Deleted successfully"
        });
    } catch (err) {
        console.error("DELETE Orgchart Error:", err);
        return NextResponse.json(
            { error: (err as Error).message },
            { status: 500 }
        );
    }
}
