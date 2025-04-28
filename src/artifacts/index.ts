// Barrel file to ensure all page components are included in the build
import * as IndexModule from './index';
export { IndexModule as Index };
export { default as Signup } from './signup';
export { default as Home } from './home';
export { default as NotFound } from './404';
export { default as HelloWorld } from './hello-world';
export { default as HelloWorld2 } from './hello-world-2';
export { default as Paste } from './paste';
export { default as TestCalendar } from './test-calendar';

// Import any other page components that should be included in the build
// Example: export { default as HelloWorld } from './hello-world';

// Note: This file ensures that Vite will include all these components in the build
// even though they're loaded dynamically at runtime 