package api

import (
	"encoding/json"
	"net/http"
	"os"
	"path/filepath"
	"strings"
	"time"

	"github.com/rs/zerolog/log"

	"github.com/go-go-golems/claude-artifact-runner/pkg/types"
	"github.com/go-go-golems/claude-artifact-runner/pkg/util"
)

// Global map to store in-memory artifacts for production mode
var InMemoryArtifacts = make(map[string]types.Artifact)

// Dynamically added routes (for production mode)
var DynamicRoutes []types.DynamicRoute

// HandleSaveArtifact saves a user-submitted artifact
func HandleSaveArtifact(w http.ResponseWriter, r *http.Request, devMode bool) {
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
	var artifact types.Artifact
	err := json.NewDecoder(r.Body).Decode(&artifact)
	if err != nil {
		log.Error().Err(err).Msg("Invalid request body")
		http.Error(w, "Invalid request body", http.StatusBadRequest)
		return
	}

	// Validate artifact
	if artifact.Name == "" {
		log.Warn().Msg("Artifact name is required")
		http.Error(w, "Artifact name is required", http.StatusBadRequest)
		return
	}
	if artifact.Code == "" {
		log.Warn().Msg("Artifact code is required")
		http.Error(w, "Artifact code is required", http.StatusBadRequest)
		return
	}

	// Sanitize the artifact name to create a valid filename
	safeFileName := util.SanitizeFileName(artifact.Name)
	if safeFileName == "" {
		log.Warn().Str("name", artifact.Name).Msg("Invalid artifact name after sanitization")
		http.Error(w, "Invalid artifact name", http.StatusBadRequest)
		return
	}

	// Set timestamp if not provided
	if artifact.Timestamp.IsZero() {
		artifact.Timestamp = time.Now()
	}

	// In development mode, save to file system
	if devMode {
		// Create the .tsx file
		filePath := filepath.Join("src", "artifacts", safeFileName+".tsx")
		log.Debug().Str("filePath", filePath).Msg("Saving artifact to file")

		// Check if file already exists
		if _, err := os.Stat(filePath); err == nil {
			log.Warn().Str("filePath", filePath).Msg("Artifact file already exists")
			http.Error(w, "An artifact with this name already exists", http.StatusConflict)
			return
		}

		// Generate React component code
		componentCode := util.GenerateReactComponent(artifact.Name, artifact.Code)

		// Write the file
		err = os.WriteFile(filePath, []byte(componentCode), 0644)
		if err != nil {
			log.Error().Err(err).Str("filePath", filePath).Msg("Error saving artifact file")
			http.Error(w, "Failed to save artifact", http.StatusInternalServerError)
			return
		}

		log.Info().Str("name", artifact.Name).Str("filePath", filePath).Msg("Artifact saved to file")

		// In development mode, check for Vite HMR server
		viteHmrCheck := func() {
			// Try to ping the Vite server to check if it's running
			_, err := http.Get("http://localhost:5173")
			if err != nil {
				log.Warn().Err(err).Msg("Could not connect to Vite HMR server. Hot reloading may not work.")
			} else {
				log.Debug().Msg("Vite server is running and should detect the new file")
			}

			// Useful explanation for debugging
			log.Debug().Msg("For debugging: After saving a new artifact, the following happens:")
			log.Debug().Msg("1. File is created in src/artifacts/")
			log.Debug().Msg("2. Vite should detect the file change via its watcher")
			log.Debug().Msg("3. The dynamic router will fetch the new routes from the API")
		}

		// Run the check in a goroutine to not block the response
		go viteHmrCheck()
	} else {
		// In production mode, store in memory
		// Check if artifact with this name already exists
		if _, exists := InMemoryArtifacts[safeFileName]; exists {
			log.Warn().Str("name", safeFileName).Msg("In-memory artifact already exists")
			http.Error(w, "An artifact with this name already exists", http.StatusConflict)
			return
		}

		// Store in-memory
		InMemoryArtifacts[safeFileName] = artifact

		// Add to dynamic routes
		DynamicRoutes = append(DynamicRoutes, types.DynamicRoute{
			Path:     "/" + safeFileName,
			Artifact: artifact,
		})

		log.Info().Str("name", artifact.Name).Str("path", "/"+safeFileName).Msg("Added dynamic route for artifact")
	}

	// Return success response with more detailed guidance
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusCreated)

	var message string
	if devMode {
		message = "Artifact saved successfully. The dynamic router will fetch the new routes from the API."
	} else {
		message = "Artifact saved successfully"
	}

	json.NewEncoder(w).Encode(map[string]interface{}{
		"status":  "success",
		"message": message,
		"id":      safeFileName,
		"path":    "/" + safeFileName,
		"devMode": devMode,
	})
}

// HandleListArtifacts returns a list of all available artifacts
func HandleListArtifacts(w http.ResponseWriter, r *http.Request, devMode bool) {
	// Set CORS headers
	w.Header().Set("Access-Control-Allow-Origin", "*")
	w.Header().Set("Content-Type", "application/json")

	var artifacts []types.ArtifactInfo

	// Add dynamic artifacts depending on mode
	if devMode {
		// Read from filesystem
		log.Debug().Msg("Listing artifacts from filesystem")
		fileInfos, err := os.ReadDir(filepath.Join("src", "artifacts"))
		if err == nil {
			for _, file := range fileInfos {
				// Skip non-tsx files
				name := file.Name()
				if !strings.HasSuffix(name, ".tsx") {
					continue
				}

				// Get file info for timestamp
				info, err := file.Info()
				if err != nil {
					log.Warn().Err(err).Str("file", name).Msg("Failed to get file info")
					continue
				}

				// Extract ID from filename
				id := strings.TrimSuffix(name, ".tsx")
				displayName := strings.ReplaceAll(id, "-", " ")
				displayName = strings.Title(displayName)

				log.Debug().Str("id", id).Str("displayName", displayName).Msg("Found artifact from file")

				artifacts = append(artifacts, types.ArtifactInfo{
					ID:          id,
					Name:        displayName,
					Description: "User-created artifact",
					Path:        "/" + id,
					CreatedAt:   info.ModTime(),
					BuiltIn:     false,
				})
			}
		} else {
			log.Error().Err(err).Msg("Failed to read artifacts directory")
		}
	} else {
		// Use in-memory artifacts
		log.Debug().Msg("Listing artifacts from memory")
		for id, artifact := range InMemoryArtifacts {
			log.Debug().Str("id", id).Str("name", artifact.Name).Msg("Found in-memory artifact")
			artifacts = append(artifacts, types.ArtifactInfo{
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
	log.Debug().Int("count", len(artifacts)).Msg("Returning artifact list")
	json.NewEncoder(w).Encode(map[string]interface{}{
		"artifacts": artifacts,
	})
}

// HandleGetArtifact returns a specific artifact by ID
func HandleGetArtifact(w http.ResponseWriter, r *http.Request, artifactID string, devMode bool) {
	// Set CORS headers
	w.Header().Set("Access-Control-Allow-Origin", "*")
	w.Header().Set("Content-Type", "application/json")

	log.Debug().Str("artifactID", artifactID).Bool("devMode", devMode).Msg("Getting artifact")

	if devMode {
		// In dev mode, check if file exists
		filePath := filepath.Join("src", "artifacts", artifactID+".tsx")
		if _, err := os.Stat(filePath); err != nil {
			log.Warn().Err(err).Str("filePath", filePath).Msg("Artifact file not found")
			http.Error(w, "Artifact not found", http.StatusNotFound)
			return
		}

		// Read file content
		content, err := os.ReadFile(filePath)
		if err != nil {
			log.Error().Err(err).Str("filePath", filePath).Msg("Failed to read artifact file")
			http.Error(w, "Failed to read artifact", http.StatusInternalServerError)
			return
		}

		// Return artifact info
		log.Debug().Str("artifactID", artifactID).Msg("Returning artifact from file")
		json.NewEncoder(w).Encode(map[string]interface{}{
			"id":      artifactID,
			"name":    strings.Title(strings.ReplaceAll(artifactID, "-", " ")),
			"content": string(content),
			"path":    "/" + artifactID,
		})
	} else {
		// In production mode, get from memory
		artifact, exists := InMemoryArtifacts[artifactID]
		if !exists {
			log.Warn().Str("artifactID", artifactID).Msg("In-memory artifact not found")
			http.Error(w, "Artifact not found", http.StatusNotFound)
			return
		}

		// Return artifact info
		log.Debug().Str("artifactID", artifactID).Msg("Returning artifact from memory")
		json.NewEncoder(w).Encode(map[string]interface{}{
			"id":        artifactID,
			"name":      artifact.Name,
			"code":      artifact.Code,
			"timestamp": artifact.Timestamp,
			"path":      "/" + artifactID,
		})
	}
}
