import { NextResponse } from "next/server";
import { syncSingleEmployee, syncEmployeesToOrgchart } from "@/lib/orgchart-sync";

/**
 * POST /api/sync-orgchart
 * Sync employees to orgchart
 * - If employeeId provided: sync single employee
 * - Otherwise: full sync
 */
export async function POST(req: Request) {
  try {
    const body = await req.json();
    if (body.employeeId) {
      const result = await syncSingleEmployee(body.employeeId);
      return NextResponse.json(result);
    }
  } catch (e) {
    // Ignore JSON parse error, proceed to full sync
  }

  const result = await syncEmployeesToOrgchart();
  return NextResponse.json(result);
}

/**
 * GET /api/sync-orgchart
 * Full sync (triggered manually or by cron)
 */
export async function GET(req: Request) {
  const result = await syncEmployeesToOrgchart();
  return NextResponse.json(result);
}
