/**
 * Modular utilities for Select component
 * 
 * This barrel export provides clean access to all Select component modules:
 * - search: Search logic and debouncing
 * - highlighting: Text highlighting utilities  
 * - virtualization: Performance optimization for large lists
 * - styling: Responsive columns and CSS generation
 * - rendering: Option rendering and layout logic
 */

export { useSearchLogic } from './search';
export { highlightText } from './highlighting';
export { useVirtualization } from './virtualization';
export { useResponsiveStyles } from './styling';
export { useRendering } from './rendering';