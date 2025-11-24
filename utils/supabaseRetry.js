/**
 * Utility for retrying Supabase queries with exponential backoff
 * Handles transient Supabase "Internal server error" issues
 */

async function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Retry a Supabase query with exponential backoff
 * @param {Function} queryFn - Function that returns a Supabase query promise
 * @param {Object} options - Retry options
 * @param {number} options.maxRetries - Maximum number of retries (default: 3)
 * @param {number} options.initialDelay - Initial delay in ms (default: 100)
 * @param {number} options.maxDelay - Maximum delay in ms (default: 2000)
 * @returns {Promise} The result of the query
 */
async function retrySupabaseQuery(queryFn, options = {}) {
  const {
    maxRetries = 3,
    initialDelay = 100,
    maxDelay = 2000,
  } = options;

  let lastError;
  
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const result = await queryFn();
      
      // Check if it's an error response
      if (result.error) {
        const error = result.error;
        
        // Don't retry on client errors (4xx) - these are permanent
        if (error.code && error.code.startsWith('PGRST')) {
          // Check if it's a specific error that shouldn't be retried
          if (error.code === 'PGRST116' || // Not found
              error.message?.includes('does not exist') ||
              error.message?.includes('column') ||
              error.hint?.includes('column')) {
            return result; // Return the error, don't retry
          }
        }
        
        // Retry on "Internal server error" or network errors
        if (error.message === 'Internal server error.' || 
            error.message?.includes('Internal server error') ||
            error.message?.includes('timeout') ||
            error.message?.includes('network') ||
            !error.code) {
          
          if (attempt < maxRetries) {
            const delay = Math.min(initialDelay * Math.pow(2, attempt), maxDelay);
            console.warn(`⚠️ [Supabase Retry] Attempt ${attempt + 1}/${maxRetries + 1} failed, retrying in ${delay}ms...`, error.message);
            await sleep(delay);
            lastError = error;
            continue;
          }
        }
      }
      
      // Success or non-retryable error
      return result;
    } catch (err) {
      lastError = err;
      
      // Retry on exceptions (network errors, timeouts, etc.)
      if (attempt < maxRetries) {
        const delay = Math.min(initialDelay * Math.pow(2, attempt), maxDelay);
        console.warn(`⚠️ [Supabase Retry] Attempt ${attempt + 1}/${maxRetries + 1} threw exception, retrying in ${delay}ms...`, err.message);
        await sleep(delay);
        continue;
      }
    }
  }
  
  // All retries exhausted - return error result instead of throwing
  console.error(`❌ [Supabase Retry] All ${maxRetries + 1} attempts failed`);
  return {
    data: null,
    error: lastError || { message: 'Query failed after retries' }
  };
}

module.exports = {
  retrySupabaseQuery,
  sleep
};

