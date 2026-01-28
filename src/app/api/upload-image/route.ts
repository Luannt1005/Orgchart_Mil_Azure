import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { isAuthenticated, unauthorizedResponse, getCurrentUser } from "@/lib/auth-server";

export async function POST(req: Request) {
    if (!await isAuthenticated()) {
        return unauthorizedResponse();
    }
    const currentUser = await getCurrentUser();
    console.log(`🔐 POST /api/upload-image accessed by: ${currentUser}`);

    try {
        const formData = await req.formData();
        const file = formData.get("file") as Blob | null;
        const filename = formData.get("filename") as string | null;

        if (!file || !filename) {
            return NextResponse.json(
                { success: false, error: "File and filename are required" },
                { status: 400 }
            );
        }

        // Convert Blob to ArrayBuffer
        const arrayBuffer = await file.arrayBuffer();
        const buffer = new Uint8Array(arrayBuffer);

        // Upload to Supabase Storage
        // Bucket: "Mil VN Images"
        // Path: "uploads/{filename}.webp"
        const filePath = `uploads/${filename}.webp`;

        const { data, error } = await supabaseAdmin.storage
            .from("Mil VN Images")
            .upload(filePath, buffer, {
                contentType: "image/webp",
                upsert: true, // Replace if exists
                cacheControl: "3600"
            });

        if (error) {
            console.error("Supabase Storage Error:", error);
            return NextResponse.json(
                { success: false, error: error.message },
                { status: 500 }
            );
        }

        // Get public URL (optional, but good for confirmation)
        const { data: { publicUrl } } = supabaseAdmin.storage
            .from("Mil VN Images")
            .getPublicUrl(filePath);

        return NextResponse.json({
            success: true,
            message: "Image uploaded successfully",
            url: publicUrl,
            path: filePath
        });

    } catch (error: any) {
        console.error("Upload handler error:", error);
        return NextResponse.json(
            { success: false, error: error.message || "Unknown server error" },
            { status: 500 }
        );
    }
}
