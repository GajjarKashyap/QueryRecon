export async function fetchWithBackoff(
  url: string,
  options?: RequestInit,
  maxRetries = 2
): Promise<Response> {
  let retries = 0;
  
  while (true) {
    try {
      const response = await fetch(url, options);

      // 429 Too Many Requests
      if (response.status === 429 && retries < maxRetries) {
        retries++;
        
        let waitTimeMs = 2000 * Math.pow(2, retries - 1); // default exponential backoff
        
        // Parse Retry-After header if present
        const retryAfter = response.headers.get('Retry-After');
        if (retryAfter) {
          const parsed = parseInt(retryAfter, 10);
          if (!isNaN(parsed)) {
            waitTimeMs = parsed * 1000;
          } else {
            // It might be an HTTP date
            const date = new Date(retryAfter).getTime();
            if (!isNaN(date)) {
              waitTimeMs = Math.max(0, date - Date.now());
            }
          }
        }
        
        console.warn(`[fetchWithBackoff] 429 received for ${url}. Retrying in ${waitTimeMs}ms... (Attempt ${retries}/${maxRetries})`);
        await new Promise(resolve => setTimeout(resolve, waitTimeMs));
        continue;
      }

      return response;
    } catch (err: any) {
      if (err.name === 'AbortError') {
        throw err; // Don't retry user cancellations
      }
      if (retries < maxRetries) {
        retries++;
        const waitTimeMs = 2000 * Math.pow(2, retries - 1);
        console.warn(`[fetchWithBackoff] Network error for ${url}: ${err.message}. Retrying in ${waitTimeMs}ms... (Attempt ${retries}/${maxRetries})`);
        await new Promise(resolve => setTimeout(resolve, waitTimeMs));
        continue;
      }
      throw err;
    }
  }
}
