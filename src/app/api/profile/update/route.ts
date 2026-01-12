import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { userId, fullName } = body;

        if (!userId || !fullName) {
            return NextResponse.json(
                { success: false, message: "Missing required fields" },
                { status: 400 }
            );
        }

        // Update full_name in DB
        const { error: updateError } = await supabaseAdmin
            .from('users')
            .update({ full_name: fullName })
            .eq('id', userId);

        if (updateError) {
            throw updateError;
        }

        return NextResponse.json({
            success: true,
            message: "Cập nhật thông tin thành công"
        });

    } catch (error: any) {
        console.error("Update Profile Error:", error);
        return NextResponse.json(
            { success: false, message: error.message || "Internal server error" },
            { status: 500 }
        );
    }
}
