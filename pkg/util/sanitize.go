package util

import (
	"fmt"
	"regexp"
	"strings"
	"time"
)

// SanitizeFileName converts a string to a safe filename
func SanitizeFileName(name string) string {
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
