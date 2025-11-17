import type { IconTheme } from './types';

/**
 * Theme color mappings for icon backgrounds
 * Used across ComponentPicker and InlineComponentForm for consistent theming
 */
export const iconThemeClasses: Record<IconTheme, string> = {
    gray: "bg-gray-200 text-gray-600 dark:bg-gray-800 dark:text-gray-400",
    blue: "bg-blue-200 text-blue-600 dark:bg-blue-950 dark:text-blue-400",
    green: "bg-green-200 text-green-600 dark:bg-green-950 dark:text-green-400",
    red: "bg-red-200 text-red-600 dark:bg-red-950 dark:text-red-400",
    yellow: "bg-yellow-200 text-yellow-600 dark:bg-yellow-950 dark:text-yellow-400",
    purple: "bg-purple-200 text-purple-600 dark:bg-purple-950 dark:text-purple-400",
    pink: "bg-pink-200 text-pink-600 dark:bg-pink-950 dark:text-pink-400",
    indigo: "bg-indigo-200 text-indigo-600 dark:bg-indigo-950 dark:text-indigo-400",
    orange: "bg-orange-200 text-orange-600 dark:bg-orange-950 dark:text-orange-400",
};
