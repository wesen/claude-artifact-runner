package main

import (
	"embed"
	"flag"
	"fmt"
	"io/fs"
	"log"
	"net/http"
	"os"
	"path/filepath"
	"time"
)

// Embed the dist directory in production mode
//
//go:embed dist
var distFS embed.FS

func main() {
	// Define command line flags
	port := flag.Int("port", 3000, "Port to serve on")
	devMode := flag.Bool("dev", false, "Run in development mode")
	flag.Parse()

	// Create a file server handler
	var handler http.Handler
	if *devMode {
		// In dev mode, we serve from the local file system
		// This allows for hot reloading when Vite rebuilds
		log.Println("Running in development mode, serving from ./dist")
		handler = http.FileServer(http.Dir("./dist"))
	} else {
		// In production mode, we serve from the embedded file system
		log.Println("Running in production mode, serving embedded files")
		// Get the embedded dist directory
		dist, err := fs.Sub(distFS, "dist")
		if err != nil {
			log.Fatalf("Failed to get embedded dist: %v", err)
		}
		handler = http.FileServer(http.FS(dist))
	}

	// Create a handler that serves index.html for any path not found
	// (for SPA client-side routing)
	spaHandler := http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		// Try to serve the requested path
		path := r.URL.Path
		
		// Check if file exists (on disk in dev mode, or in embed FS in prod mode)
		fileExists := false
		if *devMode {
			// Check on disk
			_, err := os.Stat(filepath.Join("dist", path))
			fileExists = err == nil
		} else {
			// Check in embed FS
			_, err := fs.Stat(distFS, filepath.Join("dist", path))
			fileExists = err == nil
		}

		// If file exists, serve it
		if fileExists {
			handler.ServeHTTP(w, r)
			return
		}

		// For API routes (can be added later)
		if path == "/api/healthcheck" {
			w.Header().Set("Content-Type", "application/json")
			w.WriteHeader(http.StatusOK)
			fmt.Fprintf(w, `{"status":"ok", "timestamp":"%s"}`, time.Now().Format(time.RFC3339))
			return
		}

		// If file doesn't exist and it's not an API route, serve index.html
		// This is needed for client-side routing
		r.URL.Path = "/"
		handler.ServeHTTP(w, r)
	})

	// Set up the server
	server := &http.Server{
		Addr:    fmt.Sprintf(":%d", *port),
		Handler: spaHandler,
	}

	// Start the server
	log.Printf("Server started at http://localhost:%d", *port)
	if err := server.ListenAndServe(); err != nil {
		log.Fatalf("Server failed: %v", err)
	}
}