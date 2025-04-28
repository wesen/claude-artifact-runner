import React, { useState, useEffect } from 'react';
import { RouterProvider, createBrowserRouter, Navigate } from 'react-router-dom';
import { fetchRoutes } from '../services/routeService';
import Layout from './layout';
import NotFoundPage from '../artifacts/404';

// Import all page components 
const pageComponents = import.meta.glob('../artifacts/**/*.tsx', { eager: true });

// Function to map component string name to actual component
const getComponent = (componentPath: string) => {
  // Convert component path (like 'signup' or 'hello-world') to the full path
  const fullPath = `../artifacts/${componentPath}.tsx`;
  // Return the default export from the module or a fallback
  return (pageComponents[fullPath] as any)?.default || (() => <div>Page not found: {componentPath}</div>);
};

// Debug function to log all routes
const logRoutes = (routesArray: any[], label: string) => {
  console.log(`--- ${label} (${routesArray.length} routes) ---`);
  routesArray.forEach(route => {
    console.log(`Route: ${route.path}`);
  });
  console.log('------------------------');
};

const DynamicRouter: React.FC = () => {
  const [router, setRouter] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Function to load routes from API and build router
  const loadRoutes = async () => {
    try {
      const routeConfigs = await fetchRoutes();
      
      if (!routeConfigs || routeConfigs.length === 0) {
        console.warn('No routes returned from API');
      }
      
      // Convert API route configs to React Router routes
      const routes = routeConfigs.map(config => ({
        path: config.path,
        element: <Layout>{React.createElement(getComponent(config.component))}</Layout>,
      }));
      
      // Add not found route
      routes.push({
        path: "/404",
        element: <Layout><NotFoundPage /></Layout>,
      });
      
      // Add catch-all route
      routes.push({
        path: "*",
        element: <Navigate to="/404" replace />,
      });

      // Log all routes for debugging
      logRoutes(routes, "Routes from API");

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

  // Add development mode detection for HMR
  useEffect(() => {
    if (import.meta.hot) {
      // Listen for vite's HMR updates
      import.meta.hot.on('vite:beforeUpdate', () => {
        console.log('HMR update detected, reloading routes');
        loadRoutes();
      });
    }
  }, []);

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