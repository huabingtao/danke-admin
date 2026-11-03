export const getApiBase = (): string => {
  if (process.env.NEXT_PUBLIC_CORE_API_URL) {
    return process.env.NEXT_PUBLIC_CORE_API_URL;
  }
  if (typeof window !== 'undefined') {
    // If running on production domain (*.guaguahub.cn), point to core backend API
    if (window.location.hostname.endsWith('guaguahub.cn')) {
      return 'https://dankecore.guaguahub.cn';
    }
    // Local dev fallback:
    // Core backend runs on port 3001 by default
    const port = process.env.NEXT_PUBLIC_CORE_PORT || '3001';
    return `${window.location.protocol}//${window.location.hostname}:${port}`;
  }
  return 'http://localhost:3001';
};
