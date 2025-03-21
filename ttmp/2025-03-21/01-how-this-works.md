# Technical Architecture: Claude Artifact Runner

This document provides a detailed technical overview of how the Claude Artifact Runner works, specifically focusing on the interplay between Air (Go hot reloader), Vite (frontend build tool), React (UI library), Go (backend server), and vite-plugin-pages (file-based routing).

## System Architecture Overview

The Claude Artifact Runner is a full-stack application with several interconnected components:

1. **Go Backend Server**: Serves static assets and provides API endpoints for artifact management
2. **React Frontend**: Single-page application (SPA) for displaying and interacting with artifacts
3. **Air**: Hot-reload tool for Go, enabling rapid development of the backend
4. **Vite**: Modern frontend build tool that provides fast HMR for the React application
5. **vite-plugin-pages**: Plugin for Vite that enables file-based routing in React applications

The system supports two operational modes:
- **Development Mode**: Files are served from the local filesystem with hot reloading
- **Production Mode**: Files are embedded into the Go binary and served from memory

## Process Flow & Component Interaction

### 1. Development Server Startup

When running `./dev.sh`, the following sequence occurs:

```
┌─────────────┐     ┌─────────────┐     ┌───────────────┐
│ ./dev.sh    │────▶│  npm run dev│────▶│Vite Dev Server│
│             │     │  (port 5173)│     │               │
└─────────────┘     └─────────────┘     └───────────────┘
       │                                        │
       │                                        │ (compiles React code)
       │                                        ▼
       │                   ┌───────────────────────────────────┐
       │                   │ Processed frontend assets         │
       │                   │ (JavaScript, CSS, HTML)           │
       │                   └───────────────────────────────────┘
       │
       │     ┌─────────────┐     ┌───────────────┐     ┌───────────────┐
       └────▶│     air     │────▶│ go build      │────▶│  Go Server    │
             │             │     │               │     │  (port 3000)   │
             └─────────────┘     └───────────────┘     └───────────────┘
                                                               │
                                                               │
                                                               ▼
                                                        ┌───────────────┐
                                                        │ Serves API &  │
                                                        │ static content │
                                                        └───────────────┘
```

1. `dev.sh` starts two parallel processes:
   - Vite development server (on port 5173) for frontend hot reloading
   - Air for Go server hot reloading (which runs the Go server on port 3000)

2. Air watches Go files for changes and automatically rebuilds/restarts the Go server
   - Air is configured via `.air.toml` to run the Go server with the `-dev` and `-debug` flags
   - The Go server runs in development mode, loading files from disk and enabling detailed logging

3. Vite development server watches frontend files and serves processed assets:
   - Compiles TypeScript to JavaScript
   - Handles CSS preprocessing
   - Provides an HMR (Hot Module Replacement) socket connection
   - Processes various plugins, including vite-plugin-pages

### 2. vite-plugin-pages: File-Based Routing System

The vite-plugin-pages plugin is a critical component that automatically generates routes from the filesystem structure. Understanding how it works is key to understanding the artifact system.

#### How vite-plugin-pages works:

1. **Initialization**:
   - During Vite startup, vite-plugin-pages scans the configured directories (in our case, `src/artifacts/`)
   - It detects all `.tsx` and `.jsx` files that could be potential routes

2. **Route Generation**:
   - The plugin creates a virtual module called `virtual:generated-pages-react`
   - This module exports an array of route objects compatible with React Router
   - Each route corresponds to a file in the watched directories

3. **HMR (Hot Module Replacement)**:
   - When files are added, modified, or deleted in the watched directories, vite-plugin-pages detects these changes
   - It regenerates the virtual module with updated routes
   - It triggers a module invalidation for the virtual module

4. **Integration with React Router**:
   - In `main.tsx`, we import the routes from `virtual:generated-pages-react`
   - These routes are used to configure React Router via `createBrowserRouter`

```javascript
// Simplified representation of what vite-plugin-pages generates
// This is what 'import routes from "virtual:generated-pages-react"' gives us
[
  {
    path: "/",
    element: React.lazy(() => import("./src/artifacts/index.tsx")),
  },
  {
    path: "/signup",
    element: React.lazy(() => import("./src/artifacts/signup.tsx")),
  },
  {
    path: "/home",
    element: React.lazy(() => import("./src/artifacts/home.tsx")),
  },
  // Dynamically added when test-calendar.tsx is created
  {
    path: "/test-calendar",
    element: React.lazy(() => import("./src/artifacts/test-calendar.tsx")),
  },
]
```

#### The Critical Limitation:

The main limitation of vite-plugin-pages is that **the React Router instance is created only once at application startup**. When new routes are generated via HMR, the virtual module is updated, but the router instance is not automatically recreated.

This means that when we add a new artifact file (e.g., `test-calendar.tsx`):
1. vite-plugin-pages detects the new file and updates its virtual module
2. The update is available to any new imports of `virtual:generated-pages-react`
3. But our existing router instance still uses the old routes configuration

This is why new artifacts appear in the API list (through `/api/artifacts`) but aren't immediately accessible as routes.

### 3. Adding a New Artifact: The Complete Flow

When a user creates a new artifact, the following sequence occurs:

```
┌──────────────────┐     ┌───────────────┐     ┌───────────────┐
│ User submits     │────▶│POST request to│────▶│Go Server      │
│ artifact via UI  │     │/api/artifacts/│     │handleSaveArti-│
│                  │     │save           │     │fact function  │
└──────────────────┘     └───────────────┘     └───────────────┘
                                                       │
                                                       │ (in dev mode)
                                                       ▼
                               ┌────────────────────────────────────────┐
                               │ 1. Sanitizes filename                  │
                               │ 2. Generates React component code      │
                               │ 3. Writes .tsx file to src/artifacts/  │
                               └────────────────────────────────────────┘
                                       │
                                       │ (file system event)
                                       ▼
┌─────────────────┐     ┌────────────────────┐     ┌───────────────────┐
│Vite HMR system  │◀───▶│vite-plugin-pages   │────▶│Updates virtual:    │
│detects file     │     │detects new file    │     │generated-pages-   │
│change           │     │                    │     │react module        │
└─────────────────┘     └────────────────────┘     └───────────────────┘
       │                                                     │
       │                                                     │
       ▼                                                     │
┌─────────────────┐                                          │
│Browser receives │                                          │
│HMR update       │                                          │
└─────────────────┘                                          │
       │                                                     │
       │ (Our custom polling mechanism in main.tsx)          │
       ▼                                                     │
┌─────────────────┐     ┌────────────────────┐     ┌────────────────────┐
│React app polls  │────▶│Detects mismatch    │────▶│Creates dynamic     │
│/api/artifacts   │     │between API artifacts│     │client-side routes  │
│                 │     │and existing routes  │     │                    │
└─────────────────┘     └────────────────────┘     └────────────────────┘
```

1. **User Input**:
   - User enters a name and pastes artifact code in the UI
   - UI makes a POST request to `/api/artifacts/save`

2. **Server Processing**:
   - Go server receives the request in `handleSaveArtifact` function
   - In development mode:
     - Sanitizes the artifact name to create a valid filename
     - Generates a React component template with the artifact code
     - Writes the file to `src/artifacts/{name}.tsx`
     - Returns success response with artifact ID and path

3. **Vite + vite-plugin-pages Processing**:
   - Vite's file watcher detects the new .tsx file
   - vite-plugin-pages processes the new file and updates its internal route registry
   - The virtual module `virtual:generated-pages-react` is regenerated
   - HMR update is sent to the browser, invalidating the module cache

4. **React Side Handling**:
   - HMR updates received modules in memory
   - Our custom code in `main.tsx` periodically polls `/api/artifacts`
   - When it detects artifacts without corresponding routes, it creates dynamic client-side routes
   - The router is recreated with combined routes (original + dynamic)

5. **User Navigation**:
   - User can now navigate to the new artifact route
   - If the polled route hasn't been detected yet, a special UI shows guiding the user to refresh

### 4. The Go Server's Role

The Go server plays several crucial roles in this architecture:

1. **Static Asset Serving**:
   - In development mode: Proxies requests to the Vite dev server
   - In production mode: Serves embedded files from the binary

2. **SPA Routing Support**:
   - Implements the SPA pattern by serving `index.html` for all non-file, non-API routes
   - This allows React Router to handle client-side routing

3. **API Endpoints**:
   - `/api/artifacts/save`: Saves new artifacts (to filesystem in dev mode or memory in prod mode)
   - `/api/artifacts`: Lists all available artifacts
   - `/api/artifacts/:id`: Retrieves a specific artifact by ID

4. **Dual-Mode Operation**:
   - Development Mode: Files saved to disk, leveraging Vite's HMR
   - Production Mode: Artifacts stored in memory with dynamic routes

### 5. Air: Go Server Hot Reloading

Air provides hot reloading for the Go server:

1. Watches Go files for changes
2. Automatically rebuilds the Go binary when changes are detected
3. Restarts the server with the updated binary
4. Preserves command-line flags (like `-dev` and `-debug`)

This allows rapid development of the backend without manual restarts.

## The Root Problem and Solution

The issue with new artifacts not being available as routes immediately stems from how React Router and vite-plugin-pages interact:

**Problem**: The router instance is created once at startup and not automatically updated when new files/routes are added.

**Solution**: Our implementation addresses this with a multi-faceted approach:

1. **Client-side Route Polling**:
   - Periodically check `/api/artifacts` for available artifacts
   - Compare with current routes to identify missing routes
   - Dynamically create routes for artifacts not present in the initial route configuration
   - Recreate the router with combined routes (original + dynamic)

2. **Enhanced UX**:
   - Provide clear user feedback after saving an artifact
   - Offer navigation options, including a refresh button when routes need updating
   - Show a friendly placeholder when navigating to a route that exists in the API but hasn't been fully registered yet

3. **Detailed Logging**:
   - Added comprehensive logging on both client and server sides
   - Track the artifact creation and route registration process
   - Help identify where the process might break down

## Implications for Production vs Development

This architecture has different implications depending on the mode:

**Development Mode**:
- Artifacts are saved as physical `.tsx` files in `src/artifacts/`
- vite-plugin-pages eventually picks up new files and updates routes
- The system relies on Vite's HMR and file watching capabilities
- Full route registration may require a refresh or server restart in some cases

**Production Mode**:
- Artifacts are stored in memory, not as physical files
- Routes are fully dynamic, managed by the Go server
- No reliance on Vite's HMR (as Vite is not used in production)
- Route registration is instantaneous but lost on server restart unless persistence is added

## Optimizations and Future Improvements

Several optimizations could further improve the system:

1. **Route Registration Webhooks**:
   - Implement a webhook from the Go server to the client when a new artifact is created
   - This would allow immediate route updates without polling

2. **Persistence for Production Mode**:
   - Add a database or file-based storage for artifacts in production mode
   - Load artifacts from storage on server startup

3. **Improved HMR Integration**:
   - Develop a custom Vite plugin that extends vite-plugin-pages
   - Add hooks to force router recreation when new routes are added

4. **Dynamic Module Loading**:
   - Implement dynamic ESM imports for artifacts added at runtime
   - This would enable code splitting even for dynamically added artifacts

5. **WebSocket Server Status Updates**:
   - Add WebSocket connection for real-time server status updates
   - Notify clients immediately when new artifacts are available

## Conclusion

The Claude Artifact Runner demonstrates a sophisticated integration of modern web technologies. The challenge of dynamically adding routes at runtime is addressed through a combination of server-side and client-side solutions.

The architecture balances the development experience (with hot reloading and immediate feedback) with production requirements (embedded assets and efficient serving). The solution to the route registration issue showcases both the power and limitations of current web frameworks and how to overcome those limitations with custom implementations.

Understanding this system requires knowledge of multiple technologies and their interaction patterns, making it a valuable case study for full-stack developers working with React, Go, and modern build tools.