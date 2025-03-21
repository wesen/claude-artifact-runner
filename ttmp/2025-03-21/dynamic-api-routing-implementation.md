# Implementing Dynamic API-Based Routing

This document explains how to replace vite-plugin-pages with a custom solution that loads routes dynamically from an API endpoint while still having Vite compile the TSX page components.

## Overview

Instead of generating routes at build time with vite-plugin-pages, the goal is to:
1. Have Vite compile all TSX pages 
2. Fetch route configurations from an API endpoint at runtime
3. Dynamically create routes based on the API response
4. Update routes when the API data changes

## Implementation Steps

### 1. Remove vite-plugin-pages

First, remove vite-plugin-pages from your project:

```bash
npm uninstall vite-plugin-pages
# or
yarn remove vite-plugin-pages
```

Then update your `vite.config.ts` to remove the Pages plugin:

```typescript
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

### 2. Ensure All Page Components Are Included in the Build

To ensure Vite processes and includes all your page components in the build, you'll need to create a barrel file that imports all pages:

```typescript
// src/artifacts/index.ts
export { default as Home } from './index';
export { default as Signup } from './signup';
export { default as HelloWorld } from './hello-world';
export { default as HelloWorld2 } from './hello-world-2';
// Add all your page components here
```

Alternatively, you can use Vite's dynamic import with a specific pattern to ensure all pages are included in the build:

```typescript
// src/pages.ts
const pages = import.meta.glob('./artifacts/**/*.tsx', { eager: true });
export default pages;
```

### 3. Create a Route Loader Service

Create a service to fetch route configurations from your API:

```typescript
// src/services/routeService.ts
import axios from 'axios';

export interface RouteConfig {
  path: string;
  component: string;
  exact?: boolean;
  children?: RouteConfig[];
}

const API_URL = '/api/routes'; // Your API endpoint

export async function fetchRoutes(): Promise<RouteConfig[]> {
  const response = await axios.get(API_URL);
  return response.data;
}
```

### 4. Create a Dynamic Router Component

Create a component that fetches routes from the API and dynamically constructs the router:

```typescript
// src/components/DynamicRouter.tsx
import React, { useState, useEffect, Suspense } from 'react';
import { RouterProvider, createBrowserRouter } from 'react-router-dom';
import { fetchRoutes, RouteConfig } from '../services/routeService';
import Layout from './layout';

// Import all page components 
const pageComponents = import.meta.glob('../artifacts/**/*.tsx', { eager: true });

// Function to map component string name to actual component
const getComponent = (componentPath: string) => {
  // Convert component path (like 'signup' or 'hello-world') to the full path
  const fullPath = `../artifacts/${componentPath}.tsx`;
  // Return the default export from the module
  return (pageComponents[fullPath] as any)?.default || (() => <div>Page not found</div>);
};

const DynamicRouter: React.FC = () => {
  const [router, setRouter] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadRoutes = async () => {
      try {
        const routeConfigs = await fetchRoutes();
        
        // Convert API route configs to React Router routes
        const routes = routeConfigs.map(config => ({
          path: config.path,
          element: <Layout>{React.createElement(getComponent(config.component))}</Layout>,
          // Add other properties as needed
        }));

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

    loadRoutes();
    
    // Optional: Set up polling or WebSocket to check for route updates
    const intervalId = setInterval(loadRoutes, 60000); // Check every minute
    
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

### 5. Update Your Main Entry Point

Update your `main.tsx` to use the dynamic router:

```typescript
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

### 6. Create an API Endpoint to Serve Routes

On your backend, create an API endpoint that serves route configurations:

```javascript
// Example Express route handler
app.get('/api/routes', (req, res) => {
  const routes = [
    {
      path: '/',
      component: 'index',
      exact: true
    },
    {
      path: '/signup',
      component: 'signup',
      exact: true
    },
    {
      path: '/hello-world',
      component: 'hello-world',
      exact: true
    },
    {
      path: '/hello-world-2',
      component: 'hello-world-2',
      exact: true
    }
  ];
  
  res.json(routes);
});
```

## Advanced Features

### Real-time Route Updates

For real-time updates, you could:

1. **Use WebSockets**: Replace the polling mechanism with WebSockets to receive instant route updates.

```typescript
// In DynamicRouter.tsx
useEffect(() => {
  const loadRoutes = async () => {
    // Initial route loading
    // ...
  };

  loadRoutes();
  
  // Set up WebSocket connection
  const ws = new WebSocket('ws://your-api/routes');
  
  ws.onmessage = (event) => {
    const routeConfigs = JSON.parse(event.data);
    // Update routes
    // ...
  };
  
  return () => ws.close();
}, []);
```

### Lazy-loading Components

To optimize performance, you can lazy-load page components:

```typescript
// Modify the getComponent function in DynamicRouter.tsx
const getComponent = (componentPath: string) => {
  const Component = React.lazy(() => import(`../artifacts/${componentPath}.tsx`));
  return () => (
    <Suspense fallback={<div>Loading...</div>}>
      <Component />
    </Suspense>
  );
};
```

### Route Caching

To avoid unnecessary API calls, you can cache route configurations:

```typescript
// In routeService.ts
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

## Considerations and Challenges

### Build Time vs. Runtime Component Resolution

- **Build Time Component Resolution**: Ensures all components are available but requires rebuilding when adding new pages.
- **Runtime Component Resolution**: Allows adding new routes without rebuilding but requires a mechanism to dynamically load new components.

### Authentication and Authorization

When implementing dynamic routing, consider how to handle protected routes:

```typescript
// Example of handling protected routes
const routes = routeConfigs.map(config => ({
  path: config.path,
  element: config.requiresAuth ? (
    <ProtectedRoute>
      <Layout>{React.createElement(getComponent(config.component))}</Layout>
    </ProtectedRoute>
  ) : (
    <Layout>{React.createElement(getComponent(config.component))}</Layout>
  ),
}));
```

### Error Handling

Implement robust error handling for API failures:

1. **Fallback Routes**: Define a set of essential routes that are used if the API fails
2. **Retry Logic**: Implement retry mechanisms for API calls
3. **Offline Support**: Cache the last known route configuration for offline use

## Conclusion

By implementing this dynamic API-based routing system, you've replaced vite-plugin-pages with a more flexible solution that allows:

1. Runtime updates to routes without rebuilding the application
2. Centralized route management through an API
3. Dynamic control over which pages are available to users

This approach provides greater flexibility but requires more careful implementation, especially around error handling and performance optimization. 