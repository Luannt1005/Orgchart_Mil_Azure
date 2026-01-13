import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

/**
 * Health check endpoint to keep Supabase connection alive
 * Prevents database from going into pause state
 */
export async function GET() {
    try {
        const { data, error } = await supabaseAdmin
            .from('employees')
            .select('id')
            .limit(1)
            .single();

        if (error && error.code !== 'PGRST116') {
            // PGRST116 = no rows, which is OK for health check
            throw error;
        }

        return NextResponse.json({
            status: 'ok',
            timestamp: new Date().toISOString(),
            connected: true
        });
    } catch (error) {
        console.error('Health check failed:', error);
        return NextResponse.json(
            {
                status: 'error',
                timestamp: new Date().toISOString(),
                connected: false,
                error: error instanceof Error ? error.message : 'Unknown error'
            },
            { status: 503 }
        );
    }
}
