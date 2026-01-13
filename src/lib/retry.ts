/**
 * Retry helper for database operations
 * Handles transient failures like connection timeouts
 */
export async function retryOperation<T>(
    operation: () => Promise<T>,
    maxRetries: number = 3,
    delayMs: number = 1000
): Promise<T> {
    let lastError: Error | null = null;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
            return await operation();
        } catch (error) {
            lastError = error as Error;

            // Check if error is retryable (timeout, network issues)
            const errorMessage = error instanceof Error ? error.message : String(error);
            const isRetryable =
                errorMessage.includes('timeout') ||
                errorMessage.includes('fetch failed') ||
                errorMessage.includes('ECONNRESET') ||
                errorMessage.includes('ETIMEDOUT');

            if (!isRetryable || attempt === maxRetries) {
                break;
            }

            // Exponential backoff
            const delay = delayMs * Math.pow(2, attempt - 1);
            console.log(`🔄 Retry attempt ${attempt}/${maxRetries} after ${delay}ms...`);
            await new Promise(resolve => setTimeout(resolve, delay));
        }
    }

    throw lastError;
}
