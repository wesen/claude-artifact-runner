import React from 'react';
import ReactDOM from 'react-dom/client';
import { RouterProvider, createBrowserRouter, Navigate } from 'react-router-dom';
import routes from 'virtual:generated-pages-react';
import Layout from './components/layout';
import NotFoundPage from './artifacts/404';
import './index.css';

// Add a catch-all route for 404s
const allRoutes = [
  ...routes.map((route) => ({
    ...route,
    element: <Layout>{route.element}</Layout>,
  })),
  {
    path: "/calendar", // Handle the specific route that caused the error
    element: <Navigate to="/404" replace />,
  },
  {
    path: "/404",
    element: <Layout><NotFoundPage /></Layout>,
  },
  {
    path: "*", // Catch-all route
    element: <Navigate to="/404" replace />,
  }
];

const router = createBrowserRouter(allRoutes, {
  future: {
    v7_relativeSplatPath: true,
    v7_fetcherPersist: true,
    v7_normalizeFormMethod: true,
    v7_partialHydration: true,
    v7_skipActionErrorRevalidation: true
  }
});

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <RouterProvider router={router} />
  </React.StrictMode>,
);