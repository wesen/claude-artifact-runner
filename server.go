package main

import (
	"embed"
	"encoding/json"
	"flag"
	"fmt"
	"io/fs"
	"log"
	"net/http"
	"os"
	"path/filepath"
	"regexp"
	"strings"
	"time"
)

// Embed the dist directory in production mode
//
//go:embed dist
var distFS embed.FS

// Artifact represents a user-submitted UI artifact
type Artifact struct {
	Name      string    `json:"name"`
	Code      string    `json:"code"`
	Timestamp time.Time `json:"timestamp"`
}

// Map to store in-memory artifacts for production mode
var inMemoryArtifacts = make(map[string]Artifact)

// ArtifactInfo holds basic info about an artifact for listing
type ArtifactInfo struct {
	ID          string    `json:"id"`
	Name        string    `json:"name"`
	Description string    `json:"description"`
	Path        string    `json:"path"`
	CreatedAt   time.Time `json:"created_at"`
	BuiltIn     bool      `json:"built_in"`
}

// dynamicRoute represents a route dynamically created at runtime
type dynamicRoute struct {
	path     string
	artifact Artifact
}

// Dynamically added routes (for production mode)
var dynamicRoutes []dynamicRoute

func main() {
	// Define command line flags
	port := flag.Int("port", 3000, "Port to serve on")
	devMode := flag.Bool("dev", false, "Run in development mode")
	flag.Parse()

	// Create artifacts directory if it doesn't exist
	artifactsDir := filepath.Join("src", "artifacts")
	if err := os.MkdirAll(artifactsDir, 0755); err != nil {
		log.Fatalf("Failed to create artifacts directory: %v", err)
	}

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

		// API routes
		if strings.HasPrefix(path, "/api/") {
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
				handleSaveArtifact(w, r, *devMode)
				return
			case "/api/artifacts":
				if r.Method != http.MethodGet {
					http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
					return
				}
				handleListArtifacts(w, r, *devMode)
				return
			default:
				// Check if requesting a specific artifact by ID
				if strings.HasPrefix(path, "/api/artifacts/") && r.Method == http.MethodGet {
					artifactID := strings.TrimPrefix(path, "/api/artifacts/")
					handleGetArtifact(w, r, artifactID, *devMode)
					return
				}
				http.Error(w, "API endpoint not found", http.StatusNotFound)
				return
			}
		}
			
		// Check for dynamically added routes in production mode
		if !*devMode {
			// First check if this is a direct path to a dynamically added artifact
			for _, route := range dynamicRoutes {
				if path == route.path {
					// Serve the index.html with SPA routing handling
					r.URL.Path = "/"
					handler.ServeHTTP(w, r)
					return
				}
			}
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

// handleSaveArtifact saves a user-submitted artifact
func handleSaveArtifact(w http.ResponseWriter, r *http.Request, devMode bool) {
	// Set CORS headers for the preflight request
	w.Header().Set("Access-Control-Allow-Origin", "*")
	w.Header().Set("Access-Control-Allow-Methods", "POST, OPTIONS")
	w.Header().Set("Access-Control-Allow-Headers", "Content-Type")
	
	// Handle preflight OPTIONS request
	if r.Method == http.MethodOptions {
		w.WriteHeader(http.StatusOK)
		return
	}
	
	// Parse request body
	var artifact Artifact
	err := json.NewDecoder(r.Body).Decode(&artifact)
	if err != nil {
		http.Error(w, "Invalid request body", http.StatusBadRequest)
		return
	}

	// Validate artifact
	if artifact.Name == "" {
		http.Error(w, "Artifact name is required", http.StatusBadRequest)
		return
	}
	if artifact.Code == "" {
		http.Error(w, "Artifact code is required", http.StatusBadRequest)
		return
	}

	// Sanitize the artifact name to create a valid filename
	safeFileName := sanitizeFileName(artifact.Name)
	if safeFileName == "" {
		http.Error(w, "Invalid artifact name", http.StatusBadRequest)
		return
	}

	// In development mode, save to file system
	if devMode {
		// Create the .tsx file
		filePath := filepath.Join("src", "artifacts", safeFileName+".tsx")

		// Check if file already exists
		if _, err := os.Stat(filePath); err == nil {
			http.Error(w, "An artifact with this name already exists", http.StatusConflict)
			return
		}

		// Generate React component code
		componentCode := generateReactComponent(artifact.Name, artifact.Code)

		// Write the file
		err = os.WriteFile(filePath, []byte(componentCode), 0644)
		if err != nil {
			log.Printf("Error saving artifact: %v", err)
			http.Error(w, "Failed to save artifact", http.StatusInternalServerError)
			return
		}
	} else {
		// In production mode, store in memory
		// Check if artifact with this name already exists
		if _, exists := inMemoryArtifacts[safeFileName]; exists {
			http.Error(w, "An artifact with this name already exists", http.StatusConflict)
			return
		}

		// Store in-memory
		inMemoryArtifacts[safeFileName] = artifact
		
		// Add to dynamic routes
		dynamicRoutes = append(dynamicRoutes, dynamicRoute{
			path:     "/" + safeFileName,
			artifact: artifact,
		})
		
		log.Printf("Added dynamic route for artifact: %s", safeFileName)
	}

	// Return success response
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusCreated)
	json.NewEncoder(w).Encode(map[string]interface{}{
		"status":  "success",
		"message": "Artifact saved successfully",
		"id":      safeFileName,
		"path":    "/" + safeFileName,
	})
}

// sanitizeFileName converts a string to a safe filename
func sanitizeFileName(name string) string {
	// Replace spaces with hyphens
	name = strings.ReplaceAll(name, " ", "-")
	
	// Keep only alphanumeric characters, hyphens, and underscores
	reg := regexp.MustCompile(`[^a-zA-Z0-9-_]`)
	name = reg.ReplaceAllString(name, "")
	
	// Ensure the name starts with a letter
	if len(name) > 0 && !regexp.MustCompile(`^[a-zA-Z]`).MatchString(name) {
		name = "artifact-" + name
	}
	
	// If name is empty after sanitization, use a default name
	if name == "" {
		name = "artifact-" + fmt.Sprintf("%d", time.Now().Unix())
	}
	
	return name
}

// handleListArtifacts returns a list of all available artifacts
func handleListArtifacts(w http.ResponseWriter, r *http.Request, devMode bool) {
	// Set CORS headers
	w.Header().Set("Access-Control-Allow-Origin", "*")
	w.Header().Set("Content-Type", "application/json")
	
	var artifacts []ArtifactInfo
	
	// Static/built-in artifacts
	builtIns := []ArtifactInfo{
		{
			ID:          "login",
			Name:        "Login Form",
			Description: "A simple login form with email and password fields",
			Path:        "/",
			CreatedAt:   time.Now(),
			BuiltIn:     true,
		},
		{
			ID:          "signup",
			Name:        "Sign Up Form",
			Description: "A registration form with validation and social sign-up options",
			Path:        "/signup",
			CreatedAt:   time.Now(),
			BuiltIn:     true,
		},
	}
	
	artifacts = append(artifacts, builtIns...)
	
	// Add dynamic artifacts depending on mode
	if devMode {
		// Read from filesystem
		fileInfos, err := os.ReadDir(filepath.Join("src", "artifacts"))
		if err == nil {
			for _, file := range fileInfos {
				// Skip index.tsx, signup.tsx (built-ins), and non-tsx files
				name := file.Name()
				if name == "index.tsx" || name == "signup.tsx" || name == "home.tsx" || 
				   name == "paste.tsx" || name == "404.tsx" || !strings.HasSuffix(name, ".tsx") {
					continue
				}
				
				// Get file info for timestamp
				info, err := file.Info()
				if err != nil {
					continue
				}
				
				// Extract ID from filename
				id := strings.TrimSuffix(name, ".tsx")
				displayName := strings.ReplaceAll(id, "-", " ")
				displayName = strings.Title(displayName)
				
				artifacts = append(artifacts, ArtifactInfo{
					ID:          id,
					Name:        displayName,
					Description: "User-created artifact",
					Path:        "/" + id,
					CreatedAt:   info.ModTime(),
					BuiltIn:     false,
				})
			}
		}
	} else {
		// Use in-memory artifacts
		for id, artifact := range inMemoryArtifacts {
			artifacts = append(artifacts, ArtifactInfo{
				ID:          id,
				Name:        artifact.Name,
				Description: "User-created artifact",
				Path:        "/" + id,
				CreatedAt:   artifact.Timestamp,
				BuiltIn:     false,
			})
		}
	}
	
	// Return the list
	json.NewEncoder(w).Encode(map[string]interface{}{
		"artifacts": artifacts,
	})
}

// handleGetArtifact returns a specific artifact by ID
func handleGetArtifact(w http.ResponseWriter, r *http.Request, artifactID string, devMode bool) {
	// Set CORS headers
	w.Header().Set("Access-Control-Allow-Origin", "*")
	w.Header().Set("Content-Type", "application/json")
	
	if devMode {
		// In dev mode, check if file exists
		filePath := filepath.Join("src", "artifacts", artifactID+".tsx")
		if _, err := os.Stat(filePath); err != nil {
			http.Error(w, "Artifact not found", http.StatusNotFound)
			return
		}
		
		// Read file content
		content, err := os.ReadFile(filePath)
		if err != nil {
			http.Error(w, "Failed to read artifact", http.StatusInternalServerError)
			return
		}
		
		// Return artifact info
		json.NewEncoder(w).Encode(map[string]interface{}{
			"id":      artifactID,
			"name":    strings.Title(strings.ReplaceAll(artifactID, "-", " ")),
			"content": string(content),
			"path":    "/" + artifactID,
		})
	} else {
		// In production mode, get from memory
		artifact, exists := inMemoryArtifacts[artifactID]
		if !exists {
			http.Error(w, "Artifact not found", http.StatusNotFound)
			return
		}
		
		// Return artifact info
		json.NewEncoder(w).Encode(map[string]interface{}{
			"id":        artifactID,
			"name":      artifact.Name,
			"code":      artifact.Code,
			"timestamp": artifact.Timestamp,
			"path":      "/" + artifactID,
		})
	}
}

// generateReactComponent creates a React component file containing the provided HTML
func generateReactComponent(name string, htmlCode string) string {
	// Format the display name with spaces and proper capitalization
	displayName := strings.ReplaceAll(name, "-", " ")
	displayName = strings.Title(displayName)

	// Create the component code
	return fmt.Sprintf(`import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Link } from "react-router-dom";

const %sArtifact = () => {
  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-100">
      <Card className="w-full max-w-4xl">
        <CardHeader>
          <CardTitle className="text-2xl font-bold text-center">%s</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="artifact-container">
            %s
          </div>
          
          <div className="text-center text-sm mt-6">
            <Link to="/home" className="text-primary hover:underline font-bold">
              Back to Artifacts
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default %sArtifact;
`, 
		strings.Title(strings.ReplaceAll(name, "-", "")), 
		displayName,
		htmlCode,
		strings.Title(strings.ReplaceAll(name, "-", "")))
}