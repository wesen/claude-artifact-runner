import React, { useEffect, useState } from 'react';
import ReactDOM from 'react-dom/client';
import { RouterProvider, createBrowserRouter, Navigate } from 'react-router-dom';
import routes from 'virtual:generated-pages-react';
import Layout from './components/layout';
import NotFoundPage from './artifacts/404';
import './index.css';

// Debug function to log all routes
const logRoutes = (routesArray: any[], label: string) => {
  console.log(`--- ${label} (${routesArray.length} routes) ---`);
  routesArray.forEach(route => {
    console.log(`Route: ${route.path}`);
  });
  console.log('------------------------');
};

// Log all imported routes for debugging
logRoutes(routes, "Initial imported routes");

// App component that can handle route updates
const App = () => {
  const [currentRoutes, _] = useState(routes);
  const [dynamicRoutes, setDynamicRoutes] = useState<any[]>([]);
  const [router, setRouter] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // Function to build router with current routes
  const buildRouter = (routesArray: any[], dynamicRoutesArray: any[]) => {
    // Create combined routes array
    const allRoutes = [
      ...routesArray.map((route) => ({
        ...route,
        element: <Layout>{route.element}</Layout>,
      })),
      // Add dynamic routes
      ...dynamicRoutesArray,
      {
        path: "/404",
        element: <Layout><NotFoundPage /></Layout>,
      },
      {
        path: "*", // Catch-all route
        element: <Navigate to="/404" replace />,
      }
    ];

    logRoutes(allRoutes, "Creating router with routes");
    
    return createBrowserRouter(allRoutes, {
      future: {
        v7_relativeSplatPath: true,
        v7_fetcherPersist: true,
        v7_normalizeFormMethod: true,
        v7_partialHydration: true,
        v7_skipActionErrorRevalidation: true
      }
    });
  };

  // Effect to initialize router
  useEffect(() => {
    // Initial setup with just the built-in routes
    setRouter(buildRouter(currentRoutes, dynamicRoutes));
    setLoading(false);
  }, []);

  // Effect to fetch artifacts and create dynamic routes for them
  useEffect(() => {
    if (loading) return; // Skip on initial load

    const fetchArtifacts = async () => {
      try {
        const response = await fetch('/api/artifacts');
        if (!response.ok) {
          throw new Error(`Server responded with ${response.status}`);
        }
        
        const data = await response.json();
        
        if (data && data.artifacts) {
          // Filter to just user-created artifacts
          const userArtifacts = data.artifacts.filter((a: any) => !a.built_in);
          
          // Check if any of these artifacts don't have a corresponding route
          const existingRoutePaths = routes.map(r => r.path);
          const missingRoutes = userArtifacts.filter((a: any) => 
            !existingRoutePaths.includes(a.path));
          
          if (missingRoutes.length > 0) {
            console.log(`Found ${missingRoutes.length} artifacts without routes:`, 
              missingRoutes.map((a: any) => a.id));
            
            // Create dynamic routes for these artifacts
            const newDynamicRoutes = missingRoutes.map((artifact: any) => ({
              path: artifact.path.replace(/^\//, ''), // Remove leading slash if present
              element: (
                <Layout>
                  <div className="flex items-center justify-center min-h-screen bg-gray-100">
                    <div className="p-8 max-w-md mx-auto bg-white rounded-lg shadow-md">
                      <h1 className="text-2xl font-bold mb-4">{artifact.name}</h1>
                      <p className="mb-4">This artifact was added after server start.</p>
                      <p className="mb-4">To view it properly, please:</p>
                      <ol className="list-decimal list-inside mb-4">
                        <li className="mb-2">Refresh the page to load the artifact</li>
                        <li>If that doesn't work, restart the development server</li>
                      </ol>
                      <div className="mt-6">
                        <a 
                          href="/home" 
                          className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                        >
                          Back to Home
                        </a>
                      </div>
                    </div>
                  </div>
                </Layout>
              )
            }));
            
            // Add these routes
            setDynamicRoutes(prev => {
              const combined = [...prev, ...newDynamicRoutes];
              // Recreate router with new dynamic routes
              setRouter(buildRouter(currentRoutes, combined));
              return combined;
            });
          }
        }
      } catch (error) {
        console.error('Error checking for new artifacts:', error);
      }
    };

    // Fetch immediately and then set up an interval
    fetchArtifacts();
    
    // Check every 3 seconds for new artifacts
    const intervalId = setInterval(fetchArtifacts, 3000);
    return () => clearInterval(intervalId);
  }, [loading, currentRoutes]);

  // Effect to listen for HMR updates in development
  useEffect(() => {
    if (import.meta.hot) {
      // Listen for vite's HMR updates
      import.meta.hot.on('vite:beforeUpdate', () => {
        console.log('HMR update detected, route changes may be available after refresh');
      });
    }
  }, []);

  // In development mode, show a message if we're loading
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

  return router ? <RouterProvider router={router} /> : null;
};

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);