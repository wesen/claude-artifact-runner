import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Home, PlusCircle } from 'lucide-react';

export default function Layout({ children }: { children: React.ReactNode }) {
  const location = useLocation();
  
  // Don't show nav on the home page since it has its own header
  const isHomePage = location.pathname === '/home';
  const is404Page = location.pathname === '/404';

  // Don't show the nav bar on artifact view pages, home page, and 404 page
  const showNavBar = location.pathname !== '/' && 
                     !location.pathname.startsWith('/signup') && 
                     !isHomePage &&
                     !is404Page;

  return (
    <>
      {showNavBar && (
        <header className="bg-white border-b sticky top-0 z-10">
          <div className="container mx-auto px-4 py-3 flex justify-between items-center">
            <Link to="/home" className="text-xl font-bold flex items-center gap-2">
              <span className="bg-primary text-white p-1 rounded">CA</span>
              Claude Artifacts
            </Link>
            <nav>
              <ul className="flex space-x-4">
                <li>
                  <Link 
                    to="/home" 
                    className="flex items-center gap-1 px-3 py-2 rounded hover:bg-gray-100"
                  >
                    <Home className="h-4 w-4" />
                    Dashboard
                  </Link>
                </li>
                <li>
                  <Link 
                    to="/paste" 
                    className="flex items-center gap-1 px-3 py-2 rounded hover:bg-gray-100"
                  >
                    <PlusCircle className="h-4 w-4" />
                    New Artifact
                  </Link>
                </li>
              </ul>
            </nav>
          </div>
        </header>
      )}
      {children}
    </>
  );
}