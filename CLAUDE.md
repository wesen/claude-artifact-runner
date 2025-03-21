# Claude Development Guide

## Build & Run Commands
- `npm run dev` - Start development server
- `npm run build` - Build for production (TypeScript + Vite)
- `npm run lint` - Run ESLint checks
- `npm run preview` - Preview production build

## Code Style Guidelines
- **TypeScript**: Strict mode enabled with all strict checks
- **Components**: Use shadcn/ui component library patterns
- **Styling**: Tailwind CSS with custom theme variables
- **Imports**: Use absolute imports with `@/*` alias for src directory
- **React**: Follow React Hooks rules and avoid unused dependencies
- **Variables**: Use descriptive names and proper TypeScript typing
- **Error Handling**: Centralized error handling with proper user feedback

## Project Structure
- `/src/artifacts` - Core artifact content components
- `/src/components` - Reusable UI components (shadcn/ui)
- `/src/lib` - Utility functions and shared logic

## Library Stack
- React 18 with TypeScript
- Vite for bundling
- Tailwind CSS for styling
- Radix UI primitives
- React Router for navigation
- Zod for schema validation