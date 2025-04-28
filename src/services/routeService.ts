import axios from 'axios';

export interface RouteConfig {
  path: string;
  component: string;
  exact?: boolean;
  children?: RouteConfig[];
}

const API_URL = '/api/routes';

// Cache system for routes
let cachedRoutes: RouteConfig[] | null = null;
let lastFetchTime = 0;
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

export async function fetchRoutes(): Promise<RouteConfig[]> {
  const now = Date.now();
  
  if (cachedRoutes && now - lastFetchTime < CACHE_TTL) {
    return cachedRoutes;
  }
  
  try {
    const response = await axios.get<RouteConfig[]>(API_URL);
    const routes = response.data;
    cachedRoutes = routes;
    lastFetchTime = now;
    
    console.log(`Fetched ${routes.length} routes from API`);
    return routes;
  } catch (error) {
    console.error('Failed to fetch routes from API:', error);
    // Return empty array if fetch fails
    return [];
  }
}

// Force refresh the routes cache
export function invalidateRoutesCache(): void {
  cachedRoutes = null;
  lastFetchTime = 0;
} 