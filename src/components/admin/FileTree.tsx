import React, { useEffect, useRef, useState } from "react"
import {
  expandAllFeature,
  hotkeysCoreFeature,
  searchFeature,
  selectionFeature,
  syncDataLoaderFeature,
  dragAndDropFeature,
  keyboardDragAndDropFeature,
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
import { Tree, TreeItem, TreeItemLabel, TreeDragLine } from "@/components/ui/tree"
import { cn } from "@/lib/utils"
import { iconThemeClasses } from "@/lib/form-builder/core/iconThemes"

interface Item {
  name: string
  children?: string[]
  icon?: React.ReactNode
  iconTheme?: string
}

interface FileTreeProps {
  items?: Record<string, Item>
  rootItemId?: string
  initialExpandedItems?: string[]
  placeholder?: string
  onItemClick?: (itemId: string, shouldScroll?: boolean) => void
  indent?: number
  filterRegex?: string
  onReorder?: (parentId: string, newChildren: string[]) => void
}

const indent = 20

export default function Component({
  items = {},
  rootItemId = "",
  initialExpandedItems = [],
  placeholder = "Filter items...",
  onItemClick,
  indent: customIndent = indent,
  filterRegex,
  onReorder
}: FileTreeProps = {}) {
  const [state, setState] = useState<Partial<TreeState<Item>>>({})
  const [searchValue, setSearchValue] = useState("")
  const inputRef = useRef<HTMLInputElement>(null)

  // Force remount counter when items change
  const [mountKey, setMountKey] = useState(0)
  const prevItemsRef = useRef(items)

  // Detect when items change and increment mount key
  React.useEffect(() => {
    const prevItemIds = Object.keys(prevItemsRef.current).sort().join(',')
    const currentItemIds = Object.keys(items).sort().join(',')

    if (prevItemIds !== currentItemIds) {
      setMountKey(prev => prev + 1)
      prevItemsRef.current = items
    }
  }, [items])

  // Filter items based on regex pattern
  const filteredItems = React.useMemo(() => {
    if (!filterRegex) {
      return items
    }

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

  // Create a stable key that changes when items or rootItemId changes
  // This forces the tree to re-mount when the data structure changes
  const treeKey = React.useMemo(() => {
    // Include mountKey to force remount when items change
    return `${rootItemId}-${mountKey}`;
  }, [rootItemId, mountKey]);

  // Compute expanded items based on filteredItems
  const computedExpandedItems = React.useMemo(() => {
    return Object.keys(filteredItems).filter(itemId => {
      const item = filteredItems[itemId];
      return item && item.children && item.children.length > 0;
    });
  }, [filteredItems]);

  const tree = useTree<Item>({
    state,
    setState,
    initialState: {
      expandedItems: computedExpandedItems,
    },
    indent: customIndent,
    rootItemId,
    getItemName: (item) => {
      try {
        const data = item.getItemData();
        return data?.name ?? 'Unknown';
      } catch (error) {
        return 'Unknown';
      }
    },
    isItemFolder: (item) => {
      try {
        const data = item.getItemData();
        return (data?.children?.length ?? 0) > 0;
      } catch (error) {
        return false;
      }
    },
    dataLoader: {
      getItem: (itemId) => {
        const item = filteredItems[itemId];
        if (!item) {
          return { name: 'Deleted', children: [] };
        }
        return item;
      },
      getChildren: (itemId) => {
        const item = filteredItems[itemId];
        if (!item) return [];
        return (item.children ?? []).filter(childId => filteredItems[childId] !== undefined);
      },
    },
    canReorder: true,
    onDrop: (items, target) => {
      // Determine the parent based on target type
      let targetParentId: string;

      console.log('[FileTree onDrop] Target:', target);
      console.log('[FileTree onDrop] Target item ID:', target.item.getId());
      console.log('[FileTree onDrop] Target item parent:', target.item.getParent()?.getId());
      console.log('[FileTree onDrop] Items:', items.map(i => ({ id: i.getId(), parent: i.getParent()?.getId() })));

      // Check if it's a between-items drop (has childIndex property)
      if ('childIndex' in target) {
        // If dragLineLevel indicates we're inside a folder, use the target.item as parent
        // Otherwise, use the target.item's parent
        if ('dragLineLevel' in target && target.item.isFolder()) {
          // Dropping into a folder to reorder its children
          targetParentId = target.item.getId();
          console.log('[FileTree onDrop] Reordering inside folder:', targetParentId);
        } else {
          // Dropping between siblings
          const targetParent = target.item.getParent();
          if (!targetParent) return;
          targetParentId = targetParent.getId();
          console.log('[FileTree onDrop] Reordering between siblings, parent:', targetParentId);
        }
      } else {
        // When dropping onto an item (making it a child)
        targetParentId = target.item.getId();
        console.log('[FileTree onDrop] Onto-item drop (making child), parent:', targetParentId);
      }

      // Check if all dragged items have the same parent as the target
      const allItemsFromSameParent = items.every(item => {
        const itemParent = item.getParent();
        const itemParentId = itemParent?.getId();
        console.log('[FileTree onDrop] Checking item:', item.getId(), 'parent:', itemParentId, 'vs target parent:', targetParentId);
        return itemParent && itemParentId === targetParentId;
      });

      if (!allItemsFromSameParent) {
        console.log('Cannot drag items from different folders');
        return;
      }

      // Get current children of the parent
      const parentItem = filteredItems[targetParentId];
      if (!parentItem || !parentItem.children) return;

      const currentChildren = [...parentItem.children];
      const draggedItemIds = items.map(item => item.getId());

      // Remove dragged items from current position
      const childrenWithoutDragged = currentChildren.filter(
        id => !draggedItemIds.includes(id)
      );

      // Find target position based on target type
      let insertIndex = 0;

      if ('childIndex' in target) {
        // Use the insertionIndex from the ordered target (accounts for items being removed first)
        insertIndex = target.insertionIndex;
      } else {
        // Find target position when dropping onto an item to make it a child
        insertIndex = 0; // Add as first child
      }

      const newChildren = [
        ...childrenWithoutDragged.slice(0, insertIndex),
        ...draggedItemIds,
        ...childrenWithoutDragged.slice(insertIndex),
      ];

      // Call the onReorder callback with the parent ID and new children order
      onReorder?.(targetParentId, newChildren);
    },
    canDrop: (items, target) => {
      // Determine the parent based on target type
      let targetParentId: string;

      // Check if it's a between-items drop (has childIndex property)
      if ('childIndex' in target) {
        // If dragLineLevel indicates we're inside a folder, use the target.item as parent
        // Otherwise, use the target.item's parent
        if ('dragLineLevel' in target && target.item.isFolder()) {
          // Dropping into a folder to reorder its children
          targetParentId = target.item.getId();
        } else {
          // Dropping between siblings
          const targetParent = target.item.getParent();
          if (!targetParent) return false;
          targetParentId = targetParent.getId();
        }
      } else {
        // When dropping onto an item (making it a child)
        targetParentId = target.item.getId();
      }

      // Check if all dragged items have the same parent as the target
      return items.every(item => {
        const itemParent = item.getParent();
        return itemParent && itemParent.getId() === targetParentId;
      });
    },
    features: [
      syncDataLoaderFeature,
      hotkeysCoreFeature,
      selectionFeature,
      searchFeature,
      expandAllFeature,
      dragAndDropFeature,
      keyboardDragAndDropFeature,
    ],
  })

  // Track the last processed selection to avoid duplicate calls
  const lastProcessedSelection = useRef<string | null>(null);
  const isDragging = useRef(false);
  const dragStartTime = useRef<number>(0);
  const mouseDownPos = useRef<{ x: number; y: number } | null>(null);
  const hasMoved = useRef(false);

  // Listen for selection changes and call onItemClick
  useEffect(() => {
    // Don't trigger click if we detected mouse movement (indicating a drag)
    if (hasMoved.current) {
      hasMoved.current = false;
      return;
    }

    // Don't trigger click if we recently started dragging
    const timeSinceDragStart = Date.now() - dragStartTime.current;
    if (isDragging.current || timeSinceDragStart < 300) {
      return;
    }

    const selectedItems = state.selectedItems || []
    if (selectedItems.length > 0) {
      const selectedItemId = selectedItems[selectedItems.length - 1] // Get the most recently selected item

      // Only process if this is a new selection
      if (selectedItemId !== lastProcessedSelection.current) {
        lastProcessedSelection.current = selectedItemId;

        // Pass true to indicate this should trigger scroll
        onItemClick?.(selectedItemId, true);
      }
    }
  }, [state.selectedItems, onItemClick])

  // Track drag events to prevent click during drag
  useEffect(() => {
    const handleMouseDown = (e: MouseEvent) => {
      mouseDownPos.current = { x: e.clientX, y: e.clientY };
      hasMoved.current = false;
    };

    const handleMouseMove = (e: MouseEvent) => {
      if (mouseDownPos.current) {
        const dx = Math.abs(e.clientX - mouseDownPos.current.x);
        const dy = Math.abs(e.clientY - mouseDownPos.current.y);
        // If mouse moved more than 5px, consider it a drag
        if (dx > 5 || dy > 5) {
          hasMoved.current = true;
        }
      }
    };

    const handleMouseUp = () => {
      mouseDownPos.current = null;
    };

    const handleDragStart = () => {
      isDragging.current = true;
      dragStartTime.current = Date.now();
      hasMoved.current = true;
    };

    const handleDragEnd = () => {
      // Keep the flag set for a short duration after drag ends
      setTimeout(() => {
        isDragging.current = false;
      }, 300);
    };

    // Add listeners to the document to catch all drag events
    document.addEventListener('mousedown', handleMouseDown);
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
    document.addEventListener('dragstart', handleDragStart);
    document.addEventListener('dragend', handleDragEnd);
    document.addEventListener('drop', handleDragEnd);

    return () => {
      document.removeEventListener('mousedown', handleMouseDown);
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      document.removeEventListener('dragstart', handleDragStart);
      document.removeEventListener('dragend', handleDragEnd);
      document.removeEventListener('drop', handleDragEnd);
    };
  }, []);

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
    <div className="flex h-full flex-col gap-2">
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

      <div className="relative">
        <Tree
          key={treeKey}
          indent={customIndent}
          tree={tree}
          className="before:absolute before:inset-0 before:-ms-1 before:bg-[repeating-linear-gradient(to_right,transparent_0,transparent_calc(var(--tree-indent)-1px),var(--border)_calc(var(--tree-indent)-1px),var(--border)_calc(var(--tree-indent)))]"
        >
          {searchValue && searchFilteredItems.length === 0 ? (
            <p className="px-3 py-4 text-center text-sm">
              No results found for "{searchValue}"
            </p>
          ) : (
            <>
              {tree.getItems()
                .filter((item) => {
                  const itemId = item.getId();
                  return filteredItems[itemId] !== undefined;
                })
                .map((item) => {
                  const isVisible = shouldShowItem(item.getId())
                  const itemData = item.getItemData();
                  const hasIcon = itemData?.icon;
                  const iconTheme = itemData?.iconTheme;

                  // Clone icon with proper styling to inherit color
                  const getStyledIcon = (icon: React.ReactNode) => {
                    if (!icon) return null;
                    if (React.isValidElement(icon)) {
                      return React.cloneElement(icon as React.ReactElement<any>, {
                        className: "h-4 w-4",
                        style: { color: "currentColor" }
                      });
                    }
                    return icon;
                  };

                  return (
                    <TreeItem
                      key={item.getId()}
                      item={item}
                      data-visible={isVisible || !searchValue}
                      className="data-[visible=false]:hidden"
                    >
                      <TreeItemLabel className="relative before:absolute before:inset-x-0 before:-inset-y-0.5 before:-z-10 before:bg-sidebar">
                        <span className="flex items-center gap-2">
                          {item.isFolder() ? (
                            item.isExpanded() ? (
                              <FolderOpenIcon className="pointer-events-none size-4 text-muted-foreground" />
                            ) : (
                              <FolderIcon className="pointer-events-none size-4 text-muted-foreground" />
                            )
                          ) : hasIcon ? (
                            <div className={cn(
                              "flex-shrink-0 flex items-center justify-center w-5 h-5 rounded",
                              iconTheme && iconTheme in iconThemeClasses
                                ? iconThemeClasses[iconTheme as keyof typeof iconThemeClasses]
                                : "bg-muted text-muted-foreground"
                            )}>
                              {getStyledIcon(itemData.icon)}
                            </div>
                          ) : null}
                          {item.getItemName()}
                        </span>
                      </TreeItemLabel>
                    </TreeItem>
                  )
                })
              }
              <TreeDragLine />
            </>
          )}
        </Tree>
      </div>
    </div>
  )
}
