package api

import (
	"encoding/json"
	"net/http"
	"os"
	"path/filepath"
	"strings"

	"github.com/rs/zerolog/log"

	"github.com/go-go-golems/claude-artifact-runner/pkg/types"
)

// HandleRoutes returns the available routes for the frontend
func HandleRoutes(w http.ResponseWriter, r *http.Request, devMode bool) {
	// Set CORS headers
	w.Header().Set("Access-Control-Allow-Origin", "*")
	w.Header().Set("Content-Type", "application/json")

	// Create routes array
	var routes []types.RouteConfig

	// Add dynamic routes from artifacts
	if devMode {
		// In dev mode, read from filesystem
		fileInfos, err := os.ReadDir(filepath.Join("src", "artifacts"))
		if err == nil {
			for _, file := range fileInfos {
				// Skip non-tsx files
				name := file.Name()
				if !strings.HasSuffix(name, ".tsx") {
					continue
				}

				// Extract ID from filename
				id := strings.TrimSuffix(name, ".tsx")

				// Determine path - for index.tsx, use "/"
				path := "/" + id
				if id == "index" {
					path = "/"
				}

				// Add to routes
				routes = append(routes, types.RouteConfig{
					Path:      path,
					Component: id,
					Exact:     true,
				})
			}
		} else {
			log.Error().Err(err).Msg("Failed to read artifacts directory for routes")
		}
	} else {
		// In production, use in-memory artifacts plus built-in routes

		// First add the built-in components that should always be available
		builtInPaths := []string{"index", "signup", "home", "404"}
		for _, id := range builtInPaths {
			path := "/" + id
			if id == "index" {
				path = "/"
			}

			routes = append(routes, types.RouteConfig{
				Path:      path,
				Component: id,
				Exact:     true,
			})
		}

		// Then add user-created artifacts
		for id := range InMemoryArtifacts {
			routes = append(routes, types.RouteConfig{
				Path:      "/" + id,
				Component: id,
				Exact:     true,
			})
		}
	}

	// Return JSON response - directly return the routes array
	log.Debug().Int("routeCount", len(routes)).Msg("Returning routes")
	// Set cache headers for better performance
	w.Header().Set("Cache-Control", "max-age=10") // Cache for 10 seconds
	json.NewEncoder(w).Encode(routes)
}
