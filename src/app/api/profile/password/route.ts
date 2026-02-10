import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { decrypt } from "@/lib/auth";
import { getDbConnection, sql } from "@/lib/db";
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

        const pool = await getDbConnection();

        // Get current password hash
        const result = await pool.request()
            .input('id', sql.UniqueIdentifier, userId)
            .query("SELECT password FROM users WHERE id = @id");

        if (result.recordset.length === 0) throw new Error("User not found");
        const user = result.recordset[0];

        const isValid = await verifyPassword(currentPassword, user.password);
        if (!isValid) {
            return NextResponse.json({ success: false, message: "Mật khẩu hiện tại không đúng" }, { status: 400 });
        }

        const newHash = await hashPassword(newPassword);

        await pool.request()
            .input('id', sql.UniqueIdentifier, userId)
            .input('password', sql.NVarChar, newHash)
            .query("UPDATE users SET password = @password, updated_at = SYSDATETIME() WHERE id = @id");

        return NextResponse.json({ success: true, message: "Password updated" });
    } catch (error: any) {
        console.error("Change Password Error:", error);
        return NextResponse.json({ success: false, message: error.message }, { status: 500 });
    }
}
