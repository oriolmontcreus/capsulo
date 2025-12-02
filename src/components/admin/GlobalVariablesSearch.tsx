import * as React from "react"
import { SearchIcon, X } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import { getAllGlobalSchemas } from "@/lib/form-builder"
import type { GlobalData } from "@/lib/form-builder"
import { flattenFields } from "@/lib/form-builder/core/fieldHelpers"
import { capsuloConfig } from "@/lib/config"
import { useDebounce } from "@/hooks/use-debounce"

interface SearchResult {
  fieldKey: string
  fieldLabel: string
  fieldValue: string
  matchType: 'key' | 'value'
}

interface GlobalVariablesSearchProps {
  globalData: GlobalData
  searchQuery: string
  onSearchChange: (query: string) => void
  onResultClick?: (fieldKey: string) => void
  highlightedField?: string
  formData?: Record<string, any>
}

const GlobalVariablesSearch: React.FC<GlobalVariablesSearchProps> = ({
  globalData,
  searchQuery,
  onSearchChange,
  onResultClick,
  highlightedField,
  formData
}) => {
  // Debounce the search query for actual searching (300ms delay)
  const debouncedSearchQuery = useDebounce(searchQuery, 300)
  
  const schemas = React.useMemo(() => getAllGlobalSchemas(), [])
  const globalSchema = schemas.find(s => s.key === 'globals')
  
  // Get the single global variable
  const variable = globalData.variables.find(v => v.id === 'globals')
  
  // Flatten fields to get all field names and labels
  const allFields = React.useMemo(() => {
    if (!globalSchema) return []
    return flattenFields(globalSchema.fields)
  }, [globalSchema])

  // Get searchable text from field value (handles translation objects and form data)
  const getSearchableText = React.useCallback((fieldKey: string, fieldData: any, field: any): string => {
    let searchableText = ''
    
    // First check formData (current form values, including unsaved changes)
    if (formData && fieldKey in formData) {
      const formValue = formData[fieldKey]
      if (formValue !== null && formValue !== undefined && formValue !== '') {
        if (typeof formValue === 'string') {
          searchableText = formValue
        } else if (typeof formValue === 'object' && !Array.isArray(formValue)) {
          const keys = Object.keys(formValue)
          if (keys.some(k => k.length === 2 || k.includes('-'))) {
            // Translation object - join all values
            searchableText = Object.values(formValue).filter(v => v && typeof v === 'string').join(' ')
          } else {
            searchableText = String(formValue)
          }
        } else {
          searchableText = String(formValue)
        }
      }
    }
    
    // Also check stored data (might have translation object even if formData doesn't)
    if (fieldData) {
      const isTranslatable = fieldData.translatable === true
      const storedValue = fieldData.value
      
      if (storedValue !== null && storedValue !== undefined) {
        // Handle translatable fields - extract all locale values
        if (isTranslatable && typeof storedValue === 'object' && !Array.isArray(storedValue)) {
          // Translation object - join all locale values for searching
          const storedText = Object.values(storedValue).filter(v => v && typeof v === 'string').join(' ')
          // Combine with formData if both exist, otherwise use stored
          searchableText = searchableText ? `${searchableText} ${storedText}` : storedText
        } 
        // Handle implicit translation objects (not marked translatable but has locale keys)
        else if (!isTranslatable && typeof storedValue === 'object' && !Array.isArray(storedValue)) {
          const keys = Object.keys(storedValue)
          const defaultLocale = capsuloConfig.i18n?.defaultLocale || 'en'
          if (keys.some(k => (k.length === 2 || k.includes('-')) && defaultLocale in storedValue)) {
            // Looks like a translation object - join all values
            const storedText = Object.values(storedValue).filter(v => v && typeof v === 'string').join(' ')
            searchableText = searchableText ? `${searchableText} ${storedText}` : storedText
          } else if (!searchableText) {
            searchableText = String(storedValue)
          }
        } 
        // Simple value
        else if (!searchableText && storedValue !== '') {
          searchableText = String(storedValue)
        }
      }
    }
    
    // Fall back to default value if nothing found
    if (!searchableText && field && 'defaultValue' in field) {
      const defaultValue = (field as any).defaultValue
      if (defaultValue !== null && defaultValue !== undefined && defaultValue !== '') {
        searchableText = String(defaultValue)
      }
    }
    
    return searchableText
  }, [formData])

  // Format field value for display
  const formatFieldValue = React.useCallback((value: any): string => {
    if (value === null || value === undefined) return ''
    if (typeof value === 'string') return value
    if (typeof value === 'number' || typeof value === 'boolean') return String(value)
    if (Array.isArray(value)) return `${value.length} items`
    if (typeof value === 'object') {
      // Handle translation objects
      if (Object.keys(value).some(k => k.length === 2 || k.includes('-'))) {
        // Likely a translation object, show all values
        return Object.values(value).filter(v => v).join(', ')
      }
      return JSON.stringify(value)
    }
    return String(value)
  }, [])

  // Search results (using debounced query)
  const searchResults = React.useMemo<SearchResult[]>(() => {
    if (!debouncedSearchQuery.trim() || !variable || !globalSchema) return []

    const query = debouncedSearchQuery.toLowerCase()
    const results: SearchResult[] = []

    // Search through all fields
    allFields.forEach(field => {
      if (!('name' in field)) return
      
      const fieldKey = field.name
      const fieldLabel = 'label' in field ? (field.label as string) : fieldKey
      const fieldData = variable.data[fieldKey]
      
      // Get searchable text from the field
      const searchableText = getSearchableText(fieldKey, fieldData, field)
      
      // Get display value for showing in results
      let displayValue = ''
      if (formData && fieldKey in formData) {
        displayValue = formatFieldValue(formData[fieldKey])
      } else {
        displayValue = formatFieldValue(fieldData?.value)
      }
      
      // Search by field key/name
      if (fieldKey.toLowerCase().includes(query) || fieldLabel.toLowerCase().includes(query)) {
        results.push({
          fieldKey,
          fieldLabel,
          fieldValue: displayValue,
          matchType: 'key'
        })
        return
      }

      // Search by field value (case-insensitive)
      if (searchableText && searchableText.toLowerCase().includes(query)) {
        results.push({
          fieldKey,
          fieldLabel,
          fieldValue: displayValue,
          matchType: 'value'
        })
      }
    })

    return results
  }, [debouncedSearchQuery, variable, allFields, globalSchema, formatFieldValue, getSearchableText, formData])

  return (
    <div className="flex h-full flex-col gap-2">
      <div className="relative">
        <SearchIcon className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          className="peer ps-9 !bg-background"
          placeholder="Search by field name or value..."
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
        />
        {searchQuery && (
          <Button
            variant="ghost"
            size="icon"
            className="absolute right-1 top-1/2 h-7 w-7 -translate-y-1/2"
            onClick={() => onSearchChange('')}
          >
            <X className="h-4 w-4" />
          </Button>
        )}
      </div>

      {debouncedSearchQuery && searchResults.length > 0 && (
        <div className="flex-1 overflow-hidden">
          <div className="mb-2 text-xs font-medium text-muted-foreground">
            {searchResults.length} result{searchResults.length !== 1 ? 's' : ''} found
          </div>
          <ScrollArea className="h-full">
            <div className="space-y-1">
              {searchResults.map((result) => (
                <button
                  key={result.fieldKey}
                  onClick={() => onResultClick?.(result.fieldKey)}
                  className="w-full rounded-md p-2 text-left text-sm transition-colors hover:bg-accent"
                >
                  <div className="font-medium">{result.fieldLabel}</div>
                  <div className="text-xs text-muted-foreground truncate">
                    {result.matchType === 'key' ? (
                      <>
                        <span className="font-semibold">Field:</span> {result.fieldKey}
                      </>
                    ) : (
                      <>
                        <span className="font-semibold">Value:</span> {result.fieldValue || '(empty)'}
                      </>
                    )}
                  </div>
                </button>
              ))}
            </div>
          </ScrollArea>
        </div>
      )}

      {debouncedSearchQuery && searchResults.length === 0 && (
        <div className="flex flex-1 items-center justify-center text-sm text-muted-foreground">
          No results found
        </div>
      )}

      {!searchQuery && (
        <div className="flex flex-1 items-start justify-center pt-16 text-sm text-muted-foreground">
          <div className="text-center">
            <SearchIcon className="size-8 mx-auto mb-4 opacity-50" strokeWidth={1} />
            <p className="mb-2">Search global variables</p>
            <p className="text-xs">Results will show up here. You can click the result to focus its field.</p>
          </div>
        </div>
      )}
    </div>
  )
}

export default GlobalVariablesSearch

