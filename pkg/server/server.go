package server

import (
	"embed"
	"fmt"
	"io/fs"
	"net/http"
	"os"
	"path/filepath"
	"strings"
	"time"

	"github.com/rs/zerolog/log"

	"github.com/go-go-golems/claude-artifact-runner/pkg/api"
	"github.com/go-go-golems/claude-artifact-runner/pkg/types"
)

// Server represents the HTTP server for the artifact viewer
type Server struct {
	Config  types.Config
	DistFS  fs.FS
	Handler http.Handler
}

// NewServer creates a new server with the given configuration and embedded filesystem
func NewServer(config types.Config, distFS embed.FS) (*Server, error) {
	s := &Server{
		Config: config,
		DistFS: distFS,
	}

	// Create artifacts directory if it doesn't exist
	artifactsDir := filepath.Join("src", "artifacts")
	if err := os.MkdirAll(artifactsDir, 0755); err != nil {
		return nil, fmt.Errorf("failed to create artifacts directory: %w", err)
	}

	// Set up file server handler
	var handler http.Handler
	if config.DevMode {
		// In dev mode, we serve from the local file system
		log.Info().Msg("Running in development mode, serving from ./dist")
		handler = http.FileServer(http.Dir("./dist"))

		// In dev mode, log all existing artifact files
		fileInfos, err := os.ReadDir(artifactsDir)
		if err == nil {
			for _, file := range fileInfos {
				if strings.HasSuffix(file.Name(), ".tsx") {
					log.Debug().Str("file", file.Name()).Msg("Found existing artifact file")
				}
			}
		}

		// Check for Vite HMR server
		log.Debug().Msg("Checking for Vite HMR server running at http://localhost:5173")
		_, err = http.Get("http://localhost:5173")
		if err != nil {
			log.Warn().Err(err).Msg("Could not connect to Vite server. Hot module reloading may not work correctly")
		} else {
			log.Debug().Msg("Vite HMR server is accessible")
		}
	} else {
		// In production mode, we serve from the embedded file system
		log.Info().Msg("Running in production mode, serving embedded files")
		// Get the embedded dist directory
		dist, err := fs.Sub(distFS, "dist")
		if err != nil {
			return nil, fmt.Errorf("failed to get embedded dist: %w", err)
		}
		handler = http.FileServer(http.FS(dist))
	}

	s.Handler = handler
	return s, nil
}

// Start starts the HTTP server
func (s *Server) Start() error {
	// Create a handler that serves index.html for any path not found
	// (for SPA client-side routing)
	spaHandler := http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		// Try to serve the requested path
		path := r.URL.Path
		log.Debug().Str("path", path).Str("method", r.Method).Msg("Received request")

		// Check if file exists (on disk in dev mode, or in embed FS in prod mode)
		fileExists := false
		if s.Config.DevMode {
			// Check on disk
			filePath := filepath.Join("dist", path)
			_, err := os.Stat(filePath)
			fileExists = err == nil
			log.Debug().Str("filePath", filePath).Bool("exists", fileExists).Msg("Checking file existence in dev mode")
		} else {
			// Check in embed FS
			embeddedPath := filepath.Join("dist", path)
			_, err := fs.Stat(s.DistFS, embeddedPath)
			fileExists = err == nil
			log.Debug().Str("embeddedPath", embeddedPath).Bool("exists", fileExists).Msg("Checking file existence in prod mode")
		}

		// If file exists, serve it
		if fileExists {
			log.Debug().Str("path", path).Msg("Serving static file")
			s.Handler.ServeHTTP(w, r)
			return
		}

		// API routes
		if strings.HasPrefix(path, "/api/") {
			log.Debug().Str("path", path).Msg("Handling API request")
			switch path {
			case "/api/healthcheck":
				w.Header().Set("Content-Type", "application/json")
				w.WriteHeader(http.StatusOK)
				fmt.Fprintf(w, `{"status":"ok", "timestamp":"%s"}`, time.Now().Format(time.RFC3339))
				return
			case "/api/artifacts/save":
				if r.Method != http.MethodPost {
					http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
					return
				}
				api.HandleSaveArtifact(w, r, s.Config.DevMode)
				return
			case "/api/artifacts":
				if r.Method != http.MethodGet {
					http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
					return
				}
				api.HandleListArtifacts(w, r, s.Config.DevMode)
				return
			case "/api/routes":
				if r.Method != http.MethodGet {
					http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
					return
				}
				api.HandleRoutes(w, r, s.Config.DevMode)
				return
			default:
				// Check if requesting a specific artifact by ID
				if strings.HasPrefix(path, "/api/artifacts/") && r.Method == http.MethodGet {
					artifactID := strings.TrimPrefix(path, "/api/artifacts/")
					api.HandleGetArtifact(w, r, artifactID, s.Config.DevMode)
					return
				}
				log.Warn().Str("path", path).Msg("API endpoint not found")
				http.Error(w, "API endpoint not found", http.StatusNotFound)
				return
			}
		}

		// Check for dynamically added routes in production mode
		if !s.Config.DevMode {
			// First check if this is a direct path to a dynamically added artifact
			for _, route := range api.DynamicRoutes {
				if path == route.Path {
					log.Debug().Str("path", path).Msg("Serving dynamic route")
					// Serve the index.html with SPA routing handling
					r.URL.Path = "/"
					s.Handler.ServeHTTP(w, r)
					return
				}
			}
		}

		log.Debug().Str("path", path).Msg("Falling back to SPA index.html")
		// If file doesn't exist and it's not an API route, serve index.html
		// This is needed for client-side routing
		r.URL.Path = "/"
		s.Handler.ServeHTTP(w, r)
	})

	// Set up the server
	server := &http.Server{
		Addr:    fmt.Sprintf(":%d", s.Config.Port),
		Handler: spaHandler,
	}

	// Start the server
	log.Info().Int("port", s.Config.Port).Msg("Server started")
	return server.ListenAndServe()
}
