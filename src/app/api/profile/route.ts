import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { decrypt } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabase";

export async function GET() {
    try {
        const cookieStore = await cookies();
        const session = cookieStore.get("auth")?.value;
        if (!session) return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });

        const payload = await decrypt(session);
        if (!payload || !payload.user) return NextResponse.json({ success: false, message: "Invalid session" }, { status: 401 });

        const userId = payload.user.id;

        const { data, error } = await supabaseAdmin
            .from('users')
            .select('id, username, full_name, role, employee_id, title')
            .eq('id', userId)
            .single();

        if (error) throw error;

        return NextResponse.json({ success: true, data });
    } catch (error: any) {
        console.error("Profile GET Error:", error);
        return NextResponse.json({ success: false, message: error.message }, { status: 500 });
    }
}

export async function PUT(req: Request) {
    try {
        const cookieStore = await cookies();
        const session = cookieStore.get("auth")?.value;
        if (!session) return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });

        const payload = await decrypt(session);
        if (!payload || !payload.user) return NextResponse.json({ success: false, message: "Invalid session" }, { status: 401 });

        const userId = payload.user.id;
        const body = await req.json();

        // Updates allowed fields
        const updates = {
            full_name: body.full_name,
            employee_id: body.employee_id,
            title: body.title,
        };

        const { data, error } = await supabaseAdmin
            .from('users')
            .update(updates)
            .eq('id', userId)
            .select()
            .single();

        if (error) throw error;

        return NextResponse.json({ success: true, data });
    } catch (error: any) {
        console.error("Profile PUT Error:", error);
        return NextResponse.json({ success: false, message: error.message }, { status: 500 });
    }
}
