import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { decrypt } from './auth';

/**
 * Checks if the request is authenticated by verifying the 'auth' cookie using JWT verification.
 * @returns {Promise<boolean>} True if authenticated, false otherwise.
 */
export async function isAuthenticated(): Promise<boolean> {
    const cookieStore = await cookies();
    const auth = cookieStore.get('auth');
    if (!auth?.value) return false;

    const payload = await decrypt(auth.value);
    return !!payload;
}

/**
 * Returns a standardized 401 Unauthorized response.
 */
export function unauthorizedResponse() {
    return NextResponse.json(
        {
            success: false,
            error: 'Unauthorized: Invalid or missing session',
            status: 401
        },
        { status: 401 }
    );
}

/**
 * Helper to get current username from cookie
 */
export async function getCurrentUser(): Promise<string | null> {
    const cookieStore = await cookies();
    const auth = cookieStore.get('auth');
    if (!auth || !auth.value) return null;

    try {
        const payload = await decrypt(auth.value);
        if (payload?.user?.username) {
            return payload.user.username;
        }
        return null; // Return null if username not found found in token
    } catch (e) {
        return null;
    }
}
