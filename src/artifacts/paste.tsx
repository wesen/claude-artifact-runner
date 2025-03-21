import { useState, useEffect } from 'react';
import { AlertCircle, Code, Eye, Save, RefreshCcw, Home, ArrowRight } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Link, useNavigate } from "react-router-dom";

const ArtifactPaste = () => {
  const navigate = useNavigate();
  const [artifactCode, setArtifactCode] = useState('');
  const [artifactName, setArtifactName] = useState('');
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [previewHtml, setPreviewHtml] = useState('');
  const [activeTab, setActiveTab] = useState('paste');
  const [savedArtifact, setSavedArtifact] = useState<{id: string, path: string} | null>(null);
  const [refreshNeeded, setRefreshNeeded] = useState(false);

  useEffect(() => {
    // When switching to the preview tab, generate the preview
    if (activeTab === 'preview' && artifactCode) {
      try {
        // Create a simple HTML document with the artifact code embedded
        const html = `
          <!DOCTYPE html>
          <html>
            <head>
              <meta charset="UTF-8">
              <meta name="viewport" content="width=device-width, initial-scale=1.0">
              <title>Artifact Preview</title>
              <script src="https://cdn.tailwindcss.com"></script>
              <style>
                body { margin: 0; padding: 0; }
              </style>
            </head>
            <body>
              <div id="artifact-container">
                ${artifactCode}
              </div>
            </body>
          </html>
        `;
        setPreviewHtml(html);
      } catch (err) {
        console.error('Error generating preview:', err);
        setError('Failed to generate preview');
      }
    }
  }, [activeTab, artifactCode]);

  const handleTabChange = (value: string) => {
    setActiveTab(value);
  };

  const handleSaveArtifact = async () => {
    // Validate inputs
    if (!artifactName) {
      setError('Please provide a name for your artifact');
      return;
    }

    if (!artifactCode) {
      setError('Please paste your artifact code');
      return;
    }

    try {
      // Create a file format to save
      const artifactData = {
        name: artifactName,
        code: artifactCode,
        timestamp: new Date().toISOString()
      };

      // Send the artifact to the server to save
      const response = await fetch('/api/artifacts/save', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(artifactData),
      });

      if (!response.ok) {
        throw new Error(`Server responded with ${response.status}`);
      }

      const result = await response.json();

      // Store the saved artifact info
      setSavedArtifact({
        id: result.id,
        path: result.path
      });
      
      // Set refresh needed flag based on dev mode
      if (result.devMode) {
        setRefreshNeeded(true);
      }

      // Clear the form and show success message
      setArtifactCode('');
      setArtifactName('');
      setError('');
      setSuccessMessage(`Artifact "${artifactName}" saved successfully!`);

      // Don't auto-clear success message since we'll show navigation options

    } catch (err) {
      console.error('Error saving artifact:', err);
      setError('Failed to save artifact. Please try again.');
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-100">
      <Card className="w-full max-w-4xl">
        <CardHeader>
          <CardTitle className="text-2xl font-bold text-center">Paste Artifact Code</CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full">
            <TabsList className="grid w-full grid-cols-2 mb-4">
              <TabsTrigger value="paste" className="flex items-center gap-2">
                <Code className="h-4 w-4" />
                Paste Code
              </TabsTrigger>
              <TabsTrigger value="preview" className="flex items-center gap-2">
                <Eye className="h-4 w-4" />
                Preview
              </TabsTrigger>
            </TabsList>
            
            <TabsContent value="paste" className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="artifactName">Artifact Name</Label>
                <Input
                  id="artifactName"
                  placeholder="Enter a name for your artifact"
                  value={artifactName}
                  onChange={(e) => setArtifactName(e.target.value)}
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="artifactCode">Artifact HTML Code</Label>
                <Textarea
                  id="artifactCode"
                  placeholder="Paste your Claude artifact HTML code here"
                  value={artifactCode}
                  onChange={(e) => setArtifactCode(e.target.value)}
                  className="min-h-[300px] font-mono text-sm"
                />
              </div>
              
              <Button 
                onClick={handleSaveArtifact} 
                className="w-full flex items-center gap-2"
              >
                <Save className="h-4 w-4" />
                Save Artifact
              </Button>
            </TabsContent>
            
            <TabsContent value="preview">
              <div className="border rounded-md h-[500px] bg-white">
                {previewHtml ? (
                  <iframe
                    srcDoc={previewHtml}
                    title="Artifact Preview"
                    className="w-full h-full border-0"
                    sandbox="allow-scripts"
                  />
                ) : (
                  <div className="flex items-center justify-center h-full text-gray-400">
                    Paste some artifact code and switch to the preview tab to see it rendered
                  </div>
                )}
              </div>
            </TabsContent>
          </Tabs>

          {error && (
            <Alert variant="destructive" className="mt-4">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {successMessage && savedArtifact && (
            <div className="mt-6 space-y-4">
              <Alert variant="default" className="bg-green-50 border-green-200">
                <AlertDescription className="text-green-600">{successMessage}</AlertDescription>
              </Alert>

              <div className="bg-blue-50 border border-blue-100 rounded-md p-4">
                <h3 className="font-medium text-blue-800 mb-2">Next Steps:</h3>
                <p className="text-blue-700 mb-4">
                  Your artifact has been saved. {refreshNeeded && "In development mode, routes may need to be refreshed to be accessible."}
                </p>

                <div className="flex flex-col sm:flex-row gap-2">
                  <Button 
                    variant="default" 
                    onClick={() => navigate('/home')}
                    className="flex-1 gap-2"
                  >
                    <Home className="h-4 w-4" />
                    Go to Home
                  </Button>
                  
                  {refreshNeeded ? (
                    <Button 
                      variant="outline" 
                      onClick={() => window.location.reload()}
                      className="flex-1 gap-2"
                    >
                      <RefreshCcw className="h-4 w-4" />
                      Refresh Routes
                    </Button>
                  ) : (
                    <Button 
                      variant="outline" 
                      onClick={() => navigate(savedArtifact.path)}
                      className="flex-1 gap-2"
                    >
                      <ArrowRight className="h-4 w-4" />
                      View Artifact
                    </Button>
                  )}
                </div>
              </div>
            </div>
          )}

          {!successMessage && (
            <div className="text-center text-sm mt-6">
              <Link to="/home" className="text-primary hover:underline font-bold">
                Back to Artifacts
              </Link>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default ArtifactPaste;