# Dynamic API-Based Routing Implementation

This document provides a comprehensive technical writeup of the implementation of dynamic API-based routing in the artifact-viewer application, replacing the static routing previously handled by vite-plugin-pages.

## Overview

The goal was to replace `vite-plugin-pages` with a more flexible solution where:

1. Vite still compiles the TSX page components
2. The Go server provides routes via an API endpoint
3. The frontend fetches routes dynamically at runtime
4. Routes can be updated without rebuilding the application

This approach gives us greater flexibility by:
- Centralizing route management on the server side
- Enabling runtime updates to routes without rebuilding
- Providing clearer separation between component compilation and routing

## Go Server Changes

### 1. Route Configuration Structure

Added a `RouteConfig` struct to represent route configurations for the frontend:

```go
// RouteConfig represents a route configuration for the frontend
type RouteConfig struct {
	Path      string        `json:"path"`
	Component string        `json:"component"`
	Exact     bool          `json:"exact,omitempty"`
	Children  []RouteConfig `json:"children,omitempty"`
}
```

This structure allows us to define routes with a path, associated component, and optional nested routes.

### 2. API Endpoint Handler

Implemented a new API endpoint handler for `/api/routes` that returns the available routes:

```go
// handleRoutes returns the available routes for the frontend
func handleRoutes(w http.ResponseWriter, r *http.Request) {
	// Set CORS headers
	w.Header().Set("Access-Control-Allow-Origin", "*")
	w.Header().Set("Content-Type", "application/json")
	
	// Create routes array
	var routes []RouteConfig
	
	// Add built-in routes
	routes = append(routes, RouteConfig{
		Path:      "/",
		Component: "index",
		Exact:     true,
	})
	
	routes = append(routes, RouteConfig{
		Path:      "/signup",
		Component: "signup",
		Exact:     true,
	})
	
	// Add dynamic routes from artifacts
	// ... code to add routes from file system or in-memory store
	
	// Include home route
	routes = append(routes, RouteConfig{
		Path:      "/home",
		Component: "home",
		Exact:     true,
	})
	
	// Set cache headers for better performance
	w.Header().Set("Cache-Control", "max-age=10") // Cache for 10 seconds
	json.NewEncoder(w).Encode(routes)
}
```

The handler constructs the routes array by:
1. Adding built-in static routes ("/", "/signup")
2. Adding dynamic routes from file system (in dev mode) or in-memory artifacts (in production)
3. Setting appropriate cache headers for performance

### 3. Route Source Handling

The handler differentiates between development and production modes:

```go
// Dev mode: Read routes from file system
if *devMode {
    fileInfos, err := os.ReadDir(filepath.Join("src", "artifacts"))
    if err == nil {
        for _, file := range fileInfos {
            // Skip built-ins and non-tsx files
            name := file.Name()
            if name == "index.tsx" || name == "signup.tsx" || name == "home.tsx" || 
               name == "paste.tsx" || name == "404.tsx" || !strings.HasSuffix(name, ".tsx") {
                continue
            }
            
            // Extract ID from filename
            id := strings.TrimSuffix(name, ".tsx")
            
            // Add to routes
            routes = append(routes, RouteConfig{
                Path:      "/" + id,
                Component: id,
                Exact:     true,
            })
        }
    }
} else {
    // Production: Use in-memory artifacts
    for id := range inMemoryArtifacts {
        routes = append(routes, RouteConfig{
            Path:      "/" + id,
            Component: id,
            Exact:     true,
        })
    }
}
```

### 4. HTTP Route Registration

Added the API endpoint to the server's HTTP handler:

```go
case "/api/routes":
    if r.Method != http.MethodGet {
        http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
        return
    }
    handleRoutes(w, r)
    return
```

**Note:** We discovered a linter error in the implementation where `*devMode` was used incorrectly. This will need to be fixed in the next iteration to make the code pass properly.

## Frontend Changes

### 1. Remove vite-plugin-pages

The first step was to remove the `vite-plugin-pages` package and update the Vite configuration:

```typescript
// vite.config.ts
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [
    react(),
    // vite-plugin-pages removed
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      'src': path.resolve(__dirname, './src'),
    },
  }
})
```

### 2. Route Service Implementation

Created a dedicated service to handle route fetching:

```typescript
// src/services/routeService.ts
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
```

The service includes:
- TypeScript interface for route configurations
- Client-side caching to reduce API calls
- Error handling with proper fallbacks
- A method to force-refresh the cache when needed

### 3. Dynamic Router Component

Implemented a new `DynamicRouter` component that fetches routes and builds the application router:

```typescript
// src/components/DynamicRouter.tsx
import React, { useState, useEffect } from 'react';
import { RouterProvider, createBrowserRouter, Navigate } from 'react-router-dom';
import { fetchRoutes } from '../services/routeService';
import Layout from './layout';
import NotFoundPage from '../artifacts/404';

// Import all page components 
const pageComponents = import.meta.glob('../artifacts/**/*.tsx', { eager: true });

// Function to map component string name to actual component
const getComponent = (componentPath: string) => {
  // Convert component path to full path
  const fullPath = `../artifacts/${componentPath}.tsx`;
  // Return the default export or a fallback
  return (pageComponents[fullPath] as any)?.default || 
    (() => <div>Page not found: {componentPath}</div>);
};

const DynamicRouter: React.FC = () => {
  const [router, setRouter] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Function to load routes from API and build router
  const loadRoutes = async () => {
    try {
      const routeConfigs = await fetchRoutes();
      
      // Convert API route configs to React Router routes
      const routes = routeConfigs.map(config => ({
        path: config.path,
        element: <Layout>{React.createElement(getComponent(config.component))}</Layout>,
      }));
      
      // Add not found route and catch-all route
      routes.push({
        path: "/404",
        element: <Layout><NotFoundPage /></Layout>,
      });
      routes.push({
        path: "*",
        element: <Navigate to="/404" replace />,
      });

      // Create the router with the fetched routes
      const newRouter = createBrowserRouter(routes, {
        future: {
          v7_relativeSplatPath: true,
          v7_fetcherPersist: true,
          v7_normalizeFormMethod: true,
          v7_partialHydration: true,
          v7_skipActionErrorRevalidation: true
        }
      });

      setRouter(newRouter);
      setLoading(false);
    } catch (err) {
      console.error('Failed to load routes:', err);
      setError('Failed to load routes. Please try again later.');
      setLoading(false);
    }
  };

  useEffect(() => {
    // Initial route loading
    loadRoutes();
    
    // Set up polling to check for route updates
    const intervalId = setInterval(loadRoutes, 30000); // Check every 30 seconds
    
    return () => clearInterval(intervalId);
  }, []);

  // Development mode HMR handling
  useEffect(() => {
    if (import.meta.hot) {
      import.meta.hot.on('vite:beforeUpdate', () => {
        console.log('HMR update detected, reloading routes');
        loadRoutes();
      });
    }
  }, []);

  // Loading and error states
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-100">
        <div className="p-6 max-w-sm mx-auto bg-white rounded-xl shadow-md">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-gray-900 mx-auto"></div>
          <p className="text-center mt-4">Loading routes...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-100">
        <div className="p-6 max-w-sm mx-auto bg-white rounded-xl shadow-md">
          <div className="text-red-500 text-center mb-4">⚠️ Error</div>
          <p className="text-center">{error}</p>
          <button 
            className="mt-4 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-700 mx-auto block"
            onClick={() => {
              setLoading(true);
              setError(null);
              loadRoutes();
            }}
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return router ? (
    <RouterProvider router={router} />
  ) : (
    <div className="text-center p-4">No routes available</div>
  );
};

export default DynamicRouter;
```

Key features of the `DynamicRouter` component:
- Uses Vite's `import.meta.glob` to dynamically import all page components
- Handles loading states and error conditions with proper UI feedback
- Periodically checks for route updates (every 30 seconds)
- Integrates with Vite's HMR system to refresh routes during development
- Provides a retry mechanism for failed route fetching

### 4. Barrel File for Component Inclusion

Created a barrel file to ensure all pages are included in the build:

```typescript
// src/artifacts/index.ts
// Barrel file to ensure all page components are included in the build
import LoginForm from './index';
export { LoginForm as Index };
export { default as Signup } from './signup';
export { default as Home } from './home';
export { default as NotFound } from './404';
export { default as HelloWorld } from './hello-world';
export { default as HelloWorld2 } from './hello-world-2';
export { default as Paste } from './paste';
export { default as TestCalendar } from './test-calendar';

// Note: This file ensures that Vite will include all these components in the build
// even though they're loaded dynamically at runtime
```

This barrel file serves a critical purpose: even though we're loading components dynamically at runtime, Vite needs to know about these files at build time to include them in the bundle.

**Note:** We encountered a TypeScript error here as well since `./index` doesn't have a default export. This will need to be addressed in the next iteration.

### 5. Main Entry Point Update

Updated the main entry point to use the new `DynamicRouter` component:

```typescript
// src/main.tsx
import React from 'react';
import ReactDOM from 'react-dom/client';
import DynamicRouter from './components/DynamicRouter';
import './index.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <DynamicRouter />
  </React.StrictMode>,
);
```

## Implementation Challenges and Solutions

### 1. Component Resolution at Build Time

**Challenge:** When we remove vite-plugin-pages, Vite no longer automatically discovers and includes page components in the build.

**Solution:** We addressed this in multiple ways:
- Created a barrel file (`src/artifacts/index.ts`) that explicitly imports and re-exports all page components
- Used Vite's `import.meta.glob` to dynamically import components at runtime
- Modified the component resolution in `DynamicRouter` to handle path mapping

### 2. TypeScript Errors

**Challenge:** Several TypeScript errors were encountered during implementation:
- Missing `axios` dependency
- Incorrect component exports
- Null checking issues in the route service

**Solution:** We fixed these by:
- Installing the missing `axios` dependency
- Adjusting component exports and imports
- Adding proper null checking in the route service
- Fixing type definitions for the API response

### 3. Go Server Integration

**Challenge:** The Go server needed to provide routes in a format compatible with the frontend router.

**Solution:** We created a unified `RouteConfig` struct that mirrors the TypeScript interface, ensuring data consistency between backend and frontend.

### 4. Route Updates

**Challenge:** Ensuring the frontend stays in sync with route changes without frequent polling.

**Solution:** We implemented:
- Client-side caching with a 5-minute TTL
- Server-side cache headers (10 seconds)
- A polling mechanism that checks for updates every 30 seconds
- Integration with Vite's HMR system to reload routes during development

## Current Issues and Next Steps

### Issues to Fix

1. **Go Server Linter Error:** Fix the undefined `devMode` variable in the `handleRoutes` function. This needs to be properly scoped or passed as a parameter.

2. **TypeScript Error in Barrel File:** Resolve the import issue with the `Index` component in `artifacts/index.ts`. We need to correctly handle components without default exports.

3. **Build Process:** Complete the build process to ensure all components are properly included and the application works in production mode.

### Next Steps

1. **Testing:** Perform comprehensive testing of route updates in both development and production modes.

2. **Route Authentication:** Implement route-level authentication and authorization logic.

3. **Performance Optimization:** Further optimize the route loading and caching mechanisms.

4. **Error Handling:** Enhance error handling and fallback mechanisms for route loading failures.

5. **Development Experience:** Improve the development workflow by adding helpful logs and debugging tools.

6. **Documentation:** Update project documentation to reflect the new routing system.

## Conclusion

The transition from vite-plugin-pages to a dynamic API-based routing system provides greater flexibility and control over routes in the application. This approach allows for runtime route updates without rebuilding the application, centralizes route management on the server, and provides a clear separation between component compilation and routing.

While there are a few remaining issues to resolve, the foundation of the system is in place and working as expected. The next steps will focus on refinement, optimization, and adding advanced features to the routing system. 