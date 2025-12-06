/**
 * Shared utility for loading admin page metadata
 * This only loads page metadata (list of available pages), NOT the actual page data
 * Page data should be loaded lazily on-demand in the client
 */

import { capsuloConfig } from './config';
import componentManifest from 'virtual:component-manifest';

export interface PageInfo {
  id: string;
  name: string;
  path: string;
}

/**
 * Gets all available pages with components (metadata only, no data)
 * This is fast and should be called on the server during initial page load
 */
export function getAvailablePages(pageFiles: Record<string, any>): PageInfo[] {
  const availablePages = Object.keys(pageFiles)
    .filter((path) => {
      // Exclude admin entry point (../index.astro from admin/pages/ or admin/globals/)
      if (path === "../index.astro") {
        return false;
      }

      // Apply page filter regex from config
      const pageFilterRegex = new RegExp(
        capsuloConfig.ui?.pageFilterRegex || "^(?!.*\\/admin\\/).*$",
      );
      return pageFilterRegex.test(path);
    })
    .map((path) => {
      // Skip paths that go outside the pages directory
      if (path.startsWith("../../../")) {
        return null;
      }

      // Handle root index.astro (../../index.astro from admin/pages/ or admin/globals/)
      // This is the actual site home page, not the admin entry point
      if (path === "../../index.astro") {
        return { id: "index", name: "Home", path };
      }

      const cleanPath = path
        .replace("../../", "")
        .replace("../", "")
        .replace(".astro", "");
      const segments = cleanPath.split("/").filter((s) => s); // Filter empty strings
      const fileName = segments[segments.length - 1];

      let pageId: string;
      let pageName: string;

      if (fileName === "index") {
        // Root index.astro (no parent directory) - should be handled above, but just in case
        if (segments.length === 1) {
          pageId = "index";
          pageName = "Home";
        } else {
          // [locale]/index.astro or other folder/index.astro
          const parentDir = segments[segments.length - 2];
          if (parentDir === "[locale]") {
            // [locale]/index.astro maps to "index" in manifest
            pageId = "index";
            pageName = "Home";
          } else {
            pageId = parentDir;
            pageName = parentDir.charAt(0).toUpperCase() + parentDir.slice(1);
          }
        }
      } else {
        // Remove [locale] prefix if present
        const pathWithoutLocale = segments.filter((s) => s !== "[locale]");
        pageId = pathWithoutLocale.join("-");
        pageName = fileName.charAt(0).toUpperCase() + fileName.slice(1);
      }

      return { id: pageId, name: pageName, path };
    })
    .filter((page) => page !== null) // Remove null entries
    // Filter to only include pages that have components in the manifest
    .filter((page) => {
      return componentManifest[page.id] && componentManifest[page.id].length > 0;
    })
    // Deduplicate by pageId (keep the first occurrence, prefer root index.astro)
    .reduce(
      (acc, page) => {
        const existing = acc.find((p) => p.id === page.id);
        if (!existing) {
          acc.push(page);
        } else {
          // If we have a duplicate, prefer the root index.astro path
          if (
            page.path === "../../index.astro" &&
            existing.path !== "../../index.astro"
          ) {
            const index = acc.indexOf(existing);
            acc[index] = page;
          }
        }
        return acc;
      },
      [] as PageInfo[],
    )
    .sort((a, b) => a.name.localeCompare(b.name));

  return availablePages;
}
