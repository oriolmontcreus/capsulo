import type { ReactNode } from 'react';
import type { SelectField, SelectOption, SelectOptionGroup, ResponsiveColumns } from './select.types';

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

  required<T = Record<string, any>>(value: boolean | ((formData: T) => boolean) = true): this {
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
   * This will automatically load available pages and disable manual options
   * @param autoResolveLocale - If true, returns relative paths that auto-resolve to current locale (default: true)
   * @param groupBySection - If true, groups pages by their top-level section (default: false)
   */
  internalLinks(
    autoResolveLocale: boolean = true,
    groupBySection: boolean = false
  ): this {
    this.field.internalLinks = true;
    this.field.autoResolveLocale = autoResolveLocale;
    this.field.groupBySection = groupBySection;

    // Clear any manually set options - internal links mode handles this automatically
    this.field.options = [];
    this.field.groups = undefined;

    // Pages will be loaded automatically by the field renderer
    // No need to pass them manually anymore

    // Enable search by default for internal links
    if (!this.field.searchable) {
      this.field.searchable = true;
    }

    return this;
  }

  showInTable(value: boolean = true): this {
    this.field.showInTable = value;
    return this;
  }

  /**
   * @param value - Boolean to hide/show field, or function receiving formData to determine visibility. Defaults to `true`.
   */
  hidden<T = Record<string, any>>(value: boolean | ((formData: T) => boolean) = true): this {
    this.field.hidden = value;
    return this;
  }

  build(): SelectField {
    return this.field;
  }
}

export const Select = (name: string): SelectBuilder => new SelectBuilder(name);
