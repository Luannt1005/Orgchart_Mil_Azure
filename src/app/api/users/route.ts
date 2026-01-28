import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { isAuthenticated, unauthorizedResponse } from "@/lib/auth-server";

/**
 * GET /api/users
 * Fetch all users ordered by full_name
 */
export async function GET() {
    if (!await isAuthenticated()) {
        return unauthorizedResponse();
    }
    try {
        const { data, error } = await supabaseAdmin
            .from('users')
            .select('id, username, full_name, role, created_at')
            .order('full_name', { ascending: true });

        if (error) {
            console.error("Supabase Fetch Users Error:", error);
            return NextResponse.json({
                success: false,
                message: error.message || "Failed to fetch users"
            }, { status: 500 });
        }

        return NextResponse.json({
            success: true,
            data: data || []
        });
    } catch (error: any) {
        console.error("API Fetch Users Error:", error);
        return NextResponse.json({
            success: false,
            message: error.message || "Failed to fetch users"
        }, { status: 500 });
    }
}
