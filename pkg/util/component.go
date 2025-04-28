package util

import (
	"fmt"
	"strings"
)

// GenerateReactComponent creates a React component file containing the provided HTML
func GenerateReactComponent(name string, htmlCode string) string {
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
