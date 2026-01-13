import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { decrypt } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabase";
import { hashPassword, verifyPassword } from "@/lib/password";

export async function PUT(req: Request) {
    try {
        const cookieStore = await cookies();
        const session = cookieStore.get("auth")?.value;
        if (!session) return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });

        const payload = await decrypt(session);
        if (!payload || !payload.user) return NextResponse.json({ success: false, message: "Invalid session" }, { status: 401 });

        const userId = payload.user.id;
        const { currentPassword, newPassword } = await req.json();

        if (!currentPassword || !newPassword) {
            return NextResponse.json({ success: false, message: "Missing fields" }, { status: 400 });
        }

        // Get current password hash
        const { data: user, error: fetchError } = await supabaseAdmin
            .from('users')
            .select('password')
            .eq('id', userId)
            .single();

        if (fetchError || !user) throw new Error("User not found");

        const isValid = await verifyPassword(currentPassword, user.password);
        if (!isValid) {
            return NextResponse.json({ success: false, message: "Mật khẩu hiện tại không đúng" }, { status: 400 });
        }

        const newHash = await hashPassword(newPassword);

        const { error: updateError } = await supabaseAdmin
            .from('users')
            .update({ password: newHash })
            .eq('id', userId);

        if (updateError) throw updateError;

        return NextResponse.json({ success: true, message: "Password updated" });
    } catch (error: any) {
        console.error("Change Password Error:", error);
        return NextResponse.json({ success: false, message: error.message }, { status: 500 });
    }
}
