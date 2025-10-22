import React, { useEffect, useRef, useState } from "react"
import {
  expandAllFeature,
  hotkeysCoreFeature,
  searchFeature,
  selectionFeature,
  syncDataLoaderFeature,
  type TreeState,
} from "@headless-tree/core"
import { useTree } from "@headless-tree/react"
import {
  CircleXIcon,
  SearchIcon,
  FolderIcon,
  FolderOpenIcon,
} from "lucide-react"

import { Input } from "@/components/ui/input"
import { Tree, TreeItem, TreeItemLabel } from "@/components/ui/tree"

interface Item {
  name: string
  children?: string[]
}

const defaultItems: Record<string, Item> = {
  company: {
    name: "Company",
    children: ["engineering", "marketing", "operations"],
  },
  engineering: {
    name: "Engineering",
    children: ["frontend", "backend", "platform-team"],
  },
  frontend: { name: "Frontend", children: ["design-system", "web-platform"] },
  "design-system": {
    name: "Design System",
    children: ["components", "tokens", "guidelines"],
  },
  components: { name: "Components" },
  tokens: { name: "Tokens" },
  guidelines: { name: "Guidelines" },
  "web-platform": { name: "Web Platform" },
  backend: { name: "Backend", children: ["apis", "infrastructure"] },
  apis: { name: "APIs" },
  infrastructure: { name: "Infrastructure" },
  "platform-team": { name: "Platform Team" },
  marketing: { name: "Marketing", children: ["content", "seo"] },
  content: { name: "Content" },
  seo: { name: "SEO" },
  operations: { name: "Operations", children: ["hr", "finance"] },
  hr: { name: "HR" },
  finance: { name: "Finance" },
}

interface FileTreeProps {
  items?: Record<string, Item>
  rootItemId?: string
  initialExpandedItems?: string[]
  placeholder?: string
  onItemClick?: (itemId: string) => void
  indent?: number
  filterRegex?: string
}

const indent = 20

export default function Component({
  items = defaultItems,
  rootItemId = "company",
  initialExpandedItems = ["engineering", "frontend", "design-system"],
  placeholder = "Filter items...",
  onItemClick,
  indent: customIndent = indent,
  filterRegex
}: FileTreeProps = {}) {
  const [state, setState] = useState<Partial<TreeState<Item>>>({})
  const [searchValue, setSearchValue] = useState("")
  const inputRef = useRef<HTMLInputElement>(null)

  // Filter items based on regex pattern
  const filteredItems = React.useMemo(() => {
    if (!filterRegex) return items

    try {
      const regex = new RegExp(filterRegex)
      const filtered: Record<string, Item> = {}
      const includedIds = new Set<string>()

      // First pass: find items matching the regex
      Object.entries(items).forEach(([id, item]) => {
        if (regex.test(id)) {
          includedIds.add(id)
        }
      })

      // Second pass: add parent folders for included items
      const addParents = (itemId: string) => {
        Object.entries(items).forEach(([parentId, parentItem]) => {
          if (parentItem.children?.includes(itemId) && !includedIds.has(parentId)) {
            includedIds.add(parentId)
            addParents(parentId)
          }
        })
      }

      includedIds.forEach(id => addParents(id))

      // Third pass: build filtered object with updated children
      includedIds.forEach(id => {
        const item = items[id]
        if (item) {
          filtered[id] = {
            ...item,
            children: item.children?.filter(childId => includedIds.has(childId))
          }
        }
      })

      return filtered
    } catch (error) {
      console.error("Invalid filter regex:", error)
      return items
    }
  }, [items, filterRegex])

  // Create a unique key for the tree to force re-creation when items change
  const treeKey = React.useMemo(() => {
    return JSON.stringify(Object.keys(filteredItems).sort()) + rootItemId;
  }, [filteredItems, rootItemId]);

  const tree = useTree<Item>({
    state,
    setState,
    initialState: {
      expandedItems: Object.keys(filteredItems).filter(itemId => filteredItems[itemId].children && filteredItems[itemId].children.length > 0),
    },
    indent: customIndent,
    rootItemId,
    getItemName: (item) => item.getItemData().name,
    isItemFolder: (item) => (item.getItemData()?.children?.length ?? 0) > 0,
    dataLoader: {
      getItem: (itemId) => filteredItems[itemId],
      getChildren: (itemId) => filteredItems[itemId]?.children ?? [],
    },
    features: [
      syncDataLoaderFeature,
      hotkeysCoreFeature,
      selectionFeature,
      searchFeature,
      expandAllFeature,
    ],
  })

  // Listen for selection changes and call onItemClick
  useEffect(() => {
    const selectedItems = state.selectedItems || []
    if (selectedItems.length > 0) {
      const selectedItemId = selectedItems[selectedItems.length - 1] // Get the most recently selected item
      onItemClick?.(selectedItemId)
    }
  }, [state.selectedItems, onItemClick])

  // Update tree state when items change - expand all folders
  useEffect(() => {
    // Find all folder items and expand them
    const allFolderIds = Object.keys(filteredItems).filter(itemId =>
      filteredItems[itemId].children && filteredItems[itemId].children.length > 0
    );

    setState(prevState => ({
      ...prevState,
      expandedItems: allFolderIds,
    }));

    // Force expand all folders after a brief delay
    const timer = setTimeout(() => {
      tree.expandAll();
    }, 100);

    return () => clearTimeout(timer);
  }, [filteredItems, tree]);

  // Keep track of search-filtered items separately from the tree's internal search state
  const [searchFilteredItems, setSearchFilteredItems] = useState<string[]>([])

  // Handle clearing the search
  const handleClearSearch = () => {
    setSearchValue("")

    // Manually trigger the tree's search onChange with an empty value
    // to ensure item.isMatchingSearch() is correctly updated.
    const searchProps = tree.getSearchInputElementProps()
    if (searchProps.onChange) {
      const syntheticEvent = {
        target: { value: "" },
      } as React.ChangeEvent<HTMLInputElement> // Cast to the expected event type
      searchProps.onChange(syntheticEvent)
    }

    // Reset tree state to initial expanded items
    setState((prevState) => ({
      ...prevState,
      expandedItems: initialExpandedItems,
    }))

    // Clear custom filtered items
    setSearchFilteredItems([])

    if (inputRef.current) {
      inputRef.current.focus()
      // Also clear the internal search input
      inputRef.current.value = ""
    }
  }

  // This function determines if an item should be visible based on our custom filtering
  const shouldShowItem = (itemId: string) => {
    if (!searchValue || searchValue.length === 0) return true
    return searchFilteredItems.includes(itemId)
  }

  // Update search-filtered items when search value changes
  useEffect(() => {
    if (!searchValue || searchValue.length === 0) {
      setSearchFilteredItems([])
      return
    }

    // Get all items
    const allItems = tree.getItems()

    // First, find direct matches
    const directMatches = allItems
      .filter((item) => {
        const name = item.getItemName().toLowerCase()
        return name.includes(searchValue.toLowerCase())
      })
      .map((item) => item.getId())

    // Then, find all parent IDs of matching items
    const parentIds = new Set<string>()
    directMatches.forEach((matchId) => {
      let item = tree.getItems().find((i) => i.getId() === matchId)
      while (item?.getParent && item.getParent()) {
        const parent = item.getParent()
        if (parent) {
          parentIds.add(parent.getId())
          item = parent
        } else {
          break
        }
      }
    })

    // Find all children of matching items
    const childrenIds = new Set<string>()
    directMatches.forEach((matchId) => {
      const item = tree.getItems().find((i) => i.getId() === matchId)
      if (item && item.isFolder()) {
        // Get all descendants recursively
        const getDescendants = (itemId: string) => {
          const children = filteredItems[itemId]?.children || []
          children.forEach((childId) => {
            childrenIds.add(childId)
            if (filteredItems[childId]?.children?.length) {
              getDescendants(childId)
            }
          })
        }

        getDescendants(item.getId())
      }
    })

    // Combine direct matches, parents, and children
    setSearchFilteredItems([
      ...directMatches,
      ...Array.from(parentIds),
      ...Array.from(childrenIds),
    ])

    // Keep all folders expanded during search to ensure all matches are visible
    // Store current expanded state first
    const currentExpandedItems = tree.getState().expandedItems || []

    // Get all folder IDs that need to be expanded to show matches
    const folderIdsToExpand = allItems
      .filter((item) => item.isFolder())
      .map((item) => item.getId())

    // Update expanded items in the tree state
    setState((prevState) => ({
      ...prevState,
      expandedItems: [
        ...new Set([...currentExpandedItems, ...folderIdsToExpand]),
      ],
    }))
  }, [searchValue, tree])

  return (
    <div className="flex h-full flex-col gap-2 *:nth-2:grow">
      <div className="relative">
        <Input
          ref={inputRef}
          className="peer ps-9 !bg-background [&::-webkit-search-cancel-button]:hidden [&::-webkit-search-decoration]:hidden"
          value={searchValue}
          onChange={(e) => {
            const value = e.target.value
            setSearchValue(value)

            // Apply the search to the tree's internal state as well
            const searchProps = tree.getSearchInputElementProps()
            if (searchProps.onChange) {
              searchProps.onChange(e)
            }

            if (value.length > 0) {
              // If input has at least one character, expand all items
              tree.expandAll()
            } else {
              // If input is cleared, reset to initial expanded state
              setState((prevState) => ({
                ...prevState,
                expandedItems: initialExpandedItems,
              }))
              setSearchFilteredItems([])
            }
          }}
          // Prevent the internal search from being cleared on blur
          onBlur={(e) => {
            // Prevent default blur behavior
            e.preventDefault()

            // Re-apply the search to ensure it stays active
            if (searchValue && searchValue.length > 0) {
              const searchProps = tree.getSearchInputElementProps()
              if (searchProps.onChange) {
                const syntheticEvent = {
                  target: { value: searchValue },
                } as React.ChangeEvent<HTMLInputElement>
                searchProps.onChange(syntheticEvent)
              }
            }
          }}
          type="search"
          placeholder={placeholder}
        />
        <div className="pointer-events-none absolute inset-y-0 start-0 flex items-center justify-center ps-3 text-muted-foreground/80 peer-disabled:opacity-50">
          <SearchIcon className="size-4" aria-hidden="true" />
        </div>
        {searchValue && (
          <button
            className="absolute inset-y-0 end-0 flex h-full w-9 items-center justify-center rounded-e-md text-muted-foreground/80 transition-[color,box-shadow] outline-none hover:text-foreground focus:z-10 focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50"
            aria-label="Clear search"
            onClick={handleClearSearch}
          >
            <CircleXIcon className="size-4" aria-hidden="true" />
          </button>
        )}
      </div>

      <Tree key={treeKey} indent={customIndent} tree={tree}>
        {searchValue && searchFilteredItems.length === 0 ? (
          <p className="px-3 py-4 text-center text-sm">
            No results found for "{searchValue}"
          </p>
        ) : (
          tree.getItems().map((item) => {
            const isVisible = shouldShowItem(item.getId())

            return (
              <TreeItem
                key={item.getId()}
                item={item}
                data-visible={isVisible || !searchValue}
                className="data-[visible=false]:hidden"
              >
                <TreeItemLabel>
                  <span className="flex items-center gap-2">
                    {item.isFolder() &&
                      (item.isExpanded() ? (
                        <FolderOpenIcon className="pointer-events-none size-4 text-muted-foreground" />
                      ) : (
                        <FolderIcon className="pointer-events-none size-4 text-muted-foreground" />
                      ))}
                    {item.getItemName()}
                  </span>
                </TreeItemLabel>
              </TreeItem>
            )
          })
        )}
      </Tree>
    </div>
  )
}
