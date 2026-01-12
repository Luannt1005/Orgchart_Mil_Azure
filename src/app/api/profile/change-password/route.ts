import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { verifyPassword, hashPassword } from "@/lib/password";

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { userId, currentPassword, newPassword } = body;

        if (!userId || !currentPassword || !newPassword) {
            return NextResponse.json(
                { success: false, message: "Missing required fields" },
                { status: 400 }
            );
        }

        // 1. Fetch user to get current password hash
        const { data: user, error: fetchError } = await supabaseAdmin
            .from('users')
            .select('password')
            .eq('id', userId)
            .single();

        if (fetchError || !user) {
            return NextResponse.json(
                { success: false, message: "User not found" },
                { status: 404 }
            );
        }

        // 2. Verify current password
        const isValid = await verifyPassword(currentPassword, user.password);
        if (!isValid) {
            return NextResponse.json(
                { success: false, message: "Mật khẩu hiện tại không đúng" },
                { status: 400 }
            );
        }

        // 3. Hash new password
        const newHashedPassword = await hashPassword(newPassword);

        // 4. Update password in DB
        const { error: updateError } = await supabaseAdmin
            .from('users')
            .update({ password: newHashedPassword })
            .eq('id', userId);

        if (updateError) {
            throw updateError;
        }

        return NextResponse.json({
            success: true,
            message: "Đổi mật khẩu thành công"
        });

    } catch (error: any) {
        console.error("Change Password Error:", error);
        return NextResponse.json(
            { success: false, message: error.message || "Internal server error" },
            { status: 500 }
        );
    }
}
