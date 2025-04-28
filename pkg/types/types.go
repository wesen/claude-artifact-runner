package types

import (
	"time"
)

// Artifact represents a user-submitted UI artifact
type Artifact struct {
	Name      string    `json:"name"`
	Code      string    `json:"code"`
	Timestamp time.Time `json:"timestamp"`
}

// ArtifactInfo holds basic info about an artifact for listing
type ArtifactInfo struct {
	ID          string    `json:"id"`
	Name        string    `json:"name"`
	Description string    `json:"description"`
	Path        string    `json:"path"`
	CreatedAt   time.Time `json:"created_at"`
	BuiltIn     bool      `json:"built_in"`
}

// DynamicRoute represents a route dynamically created at runtime
type DynamicRoute struct {
	Path     string   `json:"path"`
	Artifact Artifact `json:"artifact"`
}

// RouteConfig represents a route configuration for the frontend
type RouteConfig struct {
	Path      string        `json:"path"`
	Component string        `json:"component"`
	Exact     bool          `json:"exact,omitempty"`
	Children  []RouteConfig `json:"children,omitempty"`
}

// Config holds the application configuration
type Config struct {
	Port      int  `json:"port"`
	DevMode   bool `json:"dev_mode"`
	DebugMode bool `json:"debug_mode"`
}
