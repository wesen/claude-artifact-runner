import { Link } from "react-router-dom";
import { AlertCircle, Home } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

const NotFoundPage = () => {
  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-100">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="text-2xl font-bold text-center">Page Not Found</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex justify-center">
            <AlertCircle className="h-20 w-20 text-red-500" />
          </div>
          
          <p className="text-center text-gray-600">
            The page you're looking for doesn't exist or has been moved.
          </p>
          
          <Button asChild className="w-full">
            <Link to="/home" className="flex items-center justify-center gap-2">
              <Home className="h-4 w-4" />
              Go to Dashboard
            </Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};

export default NotFoundPage;