# Dynamic API-Based Routing Implementation Plan with Go Server

## Overview

This plan outlines how to replace vite-plugin-pages with a custom solution where:
1. Vite still compiles the TSX page components
2. The Go server provides routes via an API endpoint
3. The frontend fetches routes dynamically at runtime
4. Routes can be updated without rebuilding the application

## Implementation Steps

### 1. Add Route API Endpoint to Go Server

- [x] Create a new API endpoint `/api/routes` in the Go server
- [x] Design the route configuration structure
- [x] Generate routes based on available artifacts

```go
// Route configuration structure
type RouteConfig struct {
    Path      string        `json:"path"`
    Component string        `json:"component"`
    Exact     bool          `json:"exact,omitempty"`
    Children  []RouteConfig `json:"children,omitempty"`
}

// Handler for routes API endpoint
func handleRoutes(w http.ResponseWriter, r *http.Request) {
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
    
    // Return JSON response
    w.Header().Set("Content-Type", "application/json")
    json.NewEncoder(w).Encode(routes)
}
```

### 2. Remove vite-plugin-pages from Frontend

- [ ] Remove the vite-plugin-pages dependency
- [ ] Update vite.config.ts to remove the plugin
- [ ] Create a barrel file to ensure all page components are included in the build

```typescript
// Update vite.config.ts
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [
    react(),
    // Pages plugin removed
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      'src': path.resolve(__dirname, './src'),
    },
  }
})
```

### 3. Create Route Loader Service on Frontend

- [ ] Implement a service to fetch routes from the Go server's API
- [ ] Add support for caching routes for better performance

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
  
  const response = await axios.get(API_URL);
  cachedRoutes = response.data;
  lastFetchTime = now;
  
  return cachedRoutes;
}
```

### 4. Implement Dynamic Router Component

- [ ] Create a component that fetches routes from the API
- [ ] Map API route configs to React Router routes
- [ ] Support real-time route updates

```typescript
// src/components/DynamicRouter.tsx
import React, { useState, useEffect } from 'react';
import { RouterProvider, createBrowserRouter } from 'react-router-dom';
import { fetchRoutes } from '../services/routeService';
import Layout from './layout';

// Import all page components 
const pageComponents = import.meta.glob('../artifacts/**/*.tsx', { eager: true });

// Function to map component string name to actual component
const getComponent = (componentPath: string) => {
  const fullPath = `../artifacts/${componentPath}.tsx`;
  return (pageComponents[fullPath] as any)?.default || (() => <div>Page not found</div>);
};

const DynamicRouter: React.FC = () => {
  const [router, setRouter] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadRoutes = async () => {
    try {
      const routeConfigs = await fetchRoutes();
      
      // Convert API route configs to React Router routes
      const routes = routeConfigs.map(config => ({
        path: config.path,
        element: <Layout>{React.createElement(getComponent(config.component))}</Layout>,
      }));

      // Create the router with the fetched routes
      const newRouter = createBrowserRouter(routes);
      setRouter(newRouter);
      setLoading(false);
    } catch (err) {
      console.error('Failed to load routes:', err);
      setError('Failed to load routes. Please try again later.');
      setLoading(false);
    }
  };

  useEffect(() => {
    loadRoutes();
    
    // Set up polling to check for route updates
    const intervalId = setInterval(loadRoutes, 30000); // Check every 30 seconds
    
    return () => clearInterval(intervalId);
  }, []);

  if (loading) {
    return <div>Loading routes...</div>;
  }

  if (error) {
    return <div>Error: {error}</div>;
  }

  return router ? (
    <RouterProvider router={router} />
  ) : (
    <div>No routes available</div>
  );
};

export default DynamicRouter;
```

### 5. Update Main Entry Point

- [ ] Update the main entry point to use the dynamic router

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

### 6. Update Go Server to Handle Route Updates

- [ ] Implement route refresh capability in the Go server
- [ ] Add proper caching headers for API responses
- [ ] Update server-side route handling logic to account for dynamic routes

## Considerations and Challenges

### 1. Build Time vs. Runtime Component Resolution

Since we want to keep Vite building the components but have dynamic routing, we need to:
- Ensure all TSX files in the `src/artifacts` directory are included in the build
- Make sure the import statements in the DynamicRouter component work correctly 
- Balance between having routes change dynamically and having component code available

### 2. Caching and Performance

- Implement proper caching for API routes
- Consider adding ETags and conditional requests
- Balance between quick route updates and minimizing API calls

### 3. Error Handling and Fallbacks

- Define fallback routes that work even if the API fails
- Implement retry logic for API calls
- Add timeout handling for smoother user experience

### 4. Development Workflow

- Ensure developers can still use hot module reloading while working on components
- Provide clear instructions for adding new routes
- Consider adding a development mode that auto-refreshes routes when files change

## Next Steps

1. Implement the `/api/routes` endpoint in the Go server
2. Remove vite-plugin-pages and update the frontend build system
3. Implement the DynamicRouter component
4. Test the system with existing and new artifacts
5. Add real-time route update capabilities
6. Document the new routing system for developers 