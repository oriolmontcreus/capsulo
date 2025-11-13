import type { ReactNode } from 'react';
import type { SelectField, SelectOption, SelectOptionGroup, ResponsiveColumns } from './select.types';
import type { PageInfo } from './page-scanner';
import {
  shouldExcludePage,
  pagePathToUrl,
  getDisplayName,
  generatePageOptions,
  groupPagesBySection
} from './page-scanner';
import { LOCALES } from '@/lib/i18n-utils';

class SelectBuilder {
  private field: SelectField;

  constructor(name: string) {
    this.field = {
      type: 'select',
      name,
      options: [],
    };
  }

  label(value: string): this {
    this.field.label = value;
    return this;
  }

  description(value: string): this {
    this.field.description = value;
    return this;
  }

  placeholder(value: string): this {
    this.field.placeholder = value;
    return this;
  }

  required(value: boolean = true): this {
    this.field.required = value;
    return this;
  }

  defaultValue(value: string): this {
    this.field.defaultValue = value;
    return this;
  }

  options(value: Array<SelectOption>): this {
    this.field.options = value;
    return this;
  }

  groups(value: Array<SelectOptionGroup>): this {
    this.field.groups = value;
    // Clear individual options when using groups
    this.field.options = [];
    return this;
  }

  multiple(value: boolean = true): this {
    this.field.multiple = value;
    return this;
  }

  prefix(value: ReactNode): this {
    this.field.prefix = value;
    return this;
  }

  suffix(value: ReactNode): this {
    this.field.suffix = value;
    return this;
  }

  searchable(value: boolean = true): this {
    this.field.searchable = value;
    return this;
  }

  emptyMessage(value: string): this {
    this.field.emptyMessage = value;
    return this;
  }

  searchPlaceholder(value: string): this {
    this.field.searchPlaceholder = value;
    return this;
  }

  columns(value: number | ResponsiveColumns): this {
    if (typeof value === 'number') {
      this.field.columns = Math.max(1, Math.min(value, 4)); // Limit to 1-4 columns for usability
    } else {
      // Validate responsive values
      const responsive: ResponsiveColumns = {};
      if (value.base !== undefined) responsive.base = Math.max(1, Math.min(value.base, 4));
      if (value.sm !== undefined) responsive.sm = Math.max(1, Math.min(value.sm, 4));
      if (value.md !== undefined) responsive.md = Math.max(1, Math.min(value.md, 4));
      if (value.lg !== undefined) responsive.lg = Math.max(1, Math.min(value.lg, 4));
      if (value.xl !== undefined) responsive.xl = Math.max(1, Math.min(value.xl, 4));
      this.field.columns = responsive;
    }
    return this;
  }

  highlightMatches(value: boolean = true): this {
    this.field.highlightMatches = value;
    return this;
  }

  minSearchLength(value: number): this {
    this.field.minSearchLength = Math.max(0, value);
    return this;
  }

  virtualized(value: boolean = true): this {
    this.field.virtualized = value;
    return this;
  }

  itemHeight(value: number): this {
    this.field.itemHeight = Math.max(20, value);
    return this;
  }

  maxVisible(value: number): this {
    this.field.maxVisible = Math.max(3, value);
    return this;
  }

  virtualizeThreshold(value: number): this {
    this.field.virtualizeThreshold = Math.max(10, value);
    return this;
  }

  /**
   * Enable internal links mode - automatically scan and provide page options
   * @param pages - Array of page information. If not provided, will attempt to auto-detect
   * @param autoResolveLocale - If true, returns relative paths that auto-resolve to current locale
   *                            If false, returns full paths with locale prefix (e.g., /en/contact)
   * @param groupBySection - If true, groups pages by their top-level section
   */
  internalLinks(
    pages?: PageInfo[],
    autoResolveLocale: boolean = true,
    groupBySection: boolean = false
  ): this {
    this.field.internalLinks = true;
    this.field.autoResolveLocale = autoResolveLocale;
    this.field.groupBySection = groupBySection;

    if (pages) {
      this.field.availablePages = pages;
    }

    // Process pages and generate options
    this.processInternalLinks();

    // Enable search by default for internal links
    if (!this.field.searchable) {
      this.field.searchable = true;
    }

    return this;
  }

  /**
   * Set available pages manually (alternative to auto-detection)
   */
  availablePages(pages: PageInfo[]): this {
    this.field.availablePages = pages;
    if (this.field.internalLinks) {
      this.processInternalLinks();
    }
    return this;
  }

  /**
   * Process internal links and generate options
   */
  private processInternalLinks(): void {
    if (!this.field.internalLinks || !this.field.availablePages) {
      return;
    }

    const pages = this.field.availablePages;
    const autoResolve = this.field.autoResolveLocale ?? true;

    // Generate options
    const options = generatePageOptions(pages, LOCALES, autoResolve);

    // Group by section if requested
    if (this.field.groupBySection) {
      const grouped = groupPagesBySection(pages);
      this.field.groups = Object.entries(grouped).map(([groupName, groupPages]) => ({
        label: groupName,
        options: generatePageOptions(groupPages, LOCALES, autoResolve),
      }));
      this.field.options = [];
    } else {
      this.field.options = options;
      this.field.groups = undefined;
    }
  }

  build(): SelectField {
    return this.field;
  }
}

export const Select = (name: string): SelectBuilder => new SelectBuilder(name);
