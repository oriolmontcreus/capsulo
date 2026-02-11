import { ArrowLeft, ChevronLeft, ChevronRight } from "lucide-react";
import type React from "react";
import { useCallback, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { FieldGroup } from "@/components/ui/field";
import { useRepeaterEdit } from "../../../context/RepeaterEditContext";
import { FieldRenderer } from "../../../core/FieldRenderer";
import type { Field } from "../../../core/types";
import type { RepeaterField } from "../repeater.types";

interface RepeaterItemEditViewContentProps {
  field: RepeaterField;
  items: any[];
  onSave?: (index: number, data: any) => void;
  fieldErrors?: Record<string, string>;
  fieldPath?: string;
  componentData?: any;
  formData?: any;
  currentItemIndex: number;
  closeEdit: () => void;
  navigateToItem: (index: number) => void;
}

const RepeaterItemEditViewContent: React.FC<
  RepeaterItemEditViewContentProps
> = ({
  field,
  items,
  onSave,
  fieldErrors,
  fieldPath,
  componentData,
  formData,
  currentItemIndex,
  closeEdit,
  navigateToItem,
}) => {
  const { updateItems } = useRepeaterEdit();
  const saveTimerRef = useRef<NodeJS.Timeout | null>(null);
  const onSaveRef = useRef(onSave);
  const currentItemIndexRef = useRef(currentItemIndex);
  const currentItemData = items[currentItemIndex] || {};

  // Update refs when props change
  useEffect(() => {
    onSaveRef.current = onSave;
    currentItemIndexRef.current = currentItemIndex;
  }, [onSave, currentItemIndex]);

  // Cleanup timer on unmount - FLUSH PENDING SAVE
  useEffect(() => {
    return () => {
      if (saveTimerRef.current && onSaveRef.current) {
        clearTimeout(saveTimerRef.current);
        saveTimerRef.current = null;
        // Use current item data
        onSaveRef.current(currentItemIndexRef.current, currentItemData);
      }
    };
  }, [currentItemData]);

  const handleFieldChange = useCallback(
    (childField: Field, update: any) => {
      const prev = currentItemData;
      const newData =
        "name" in childField
          ? { ...prev, [childField.name]: update }
          : { ...prev, ...update };

      // Update items in context immediately
      const updatedItems = [...items];
      updatedItems[currentItemIndex] = newData;
      updateItems(updatedItems);

      // Debounced auto-save: wait 700ms after last change before saving
      if (onSaveRef.current) {
        // Clear any existing timer
        if (saveTimerRef.current) {
          clearTimeout(saveTimerRef.current);
        }

        // Set new timer to save after 700ms of inactivity
        saveTimerRef.current = setTimeout(() => {
          if (onSaveRef.current) {
            onSaveRef.current(currentItemIndexRef.current, newData);
          }
          saveTimerRef.current = null;
        }, 700);
      }
    },
    [items, currentItemIndex, updateItems, currentItemData]
  );

  // Flush any pending save immediately
  const flushPendingSave = useCallback(() => {
    if (saveTimerRef.current && onSaveRef.current) {
      clearTimeout(saveTimerRef.current);
      saveTimerRef.current = null;
      const savedData = currentItemData;
      onSaveRef.current(currentItemIndexRef.current, savedData);

      // Update items in context
      const updatedItems = [...items];
      updatedItems[currentItemIndex] = savedData;
      updateItems(updatedItems);
    }
  }, [items, currentItemIndex, updateItems, currentItemData]);

  const handleNavigate = useCallback(
    (direction: "prev" | "next") => {
      // Save current changes before navigating
      flushPendingSave();

      const newIndex =
        direction === "prev" ? currentItemIndex - 1 : currentItemIndex + 1;
      if (newIndex >= 0 && newIndex < items.length) {
        navigateToItem(newIndex);
      }
    },
    [currentItemIndex, items, navigateToItem, flushPendingSave]
  );

  const handleClose = useCallback(() => {
    // Save current changes before closing
    flushPendingSave();
    closeEdit();
  }, [flushPendingSave, closeEdit]);

  const canNavigatePrev = currentItemIndex > 0;
  const canNavigateNext = currentItemIndex < items.length - 1;
  const itemNumber = currentItemIndex + 1;
  const totalItems = items.length;

  return (
    <div className="flex h-full flex-col">
      <header className="z-10 flex shrink-0 items-center gap-4 border-b py-4">
        <Button
          aria-label="Back"
          onClick={handleClose}
          size="icon"
          variant="ghost"
        >
          <ArrowLeft size={16} />
        </Button>
        <div className="flex flex-1 items-center justify-between">
          <h1 className="font-semibold text-lg">
            {field.itemName || "Item"} {itemNumber} of {totalItems}
          </h1>
          <div className="flex items-center gap-2">
            <Button
              aria-label="Previous item"
              disabled={!canNavigatePrev}
              onClick={() => handleNavigate("prev")}
              size="icon"
              variant="outline"
            >
              <ChevronLeft size={16} />
            </Button>
            <Button
              aria-label="Next item"
              disabled={!canNavigateNext}
              onClick={() => handleNavigate("next")}
              size="icon"
              variant="outline"
            >
              <ChevronRight size={16} />
            </Button>
          </div>
        </div>
      </header>

      <div className="flex-1 overflow-y-auto py-8">
        <FieldGroup className="pl-1">
          {field.fields.map((childField: Field, fieldIndex: number) => {
            const childFieldName =
              "name" in childField ? childField.name : `field-${fieldIndex}`;
            const itemFieldPath = fieldPath
              ? `${fieldPath}.${currentItemIndex}.${childFieldName}`
              : `${field.name}.${currentItemIndex}.${childFieldName}`;
            const childValue =
              "name" in childField
                ? currentItemData[childField.name]
                : currentItemData;
            const childError = fieldErrors
              ? fieldErrors[itemFieldPath]
              : undefined;

            return (
              <FieldRenderer
                componentData={componentData}
                error={childError}
                field={childField}
                fieldErrors={fieldErrors}
                fieldPath={itemFieldPath}
                formData={formData}
                key={
                  "name" in childField
                    ? childField.name
                    : `${fieldIndex}-${currentItemIndex}`
                }
                onChange={(update) => handleFieldChange(childField, update)}
                value={childValue}
              />
            );
          })}
        </FieldGroup>
      </div>
    </div>
  );
};

export const RepeaterItemEditView: React.FC<{
  externalErrors?: Record<string, string>;
}> = ({ externalErrors }) => {
  const { editState, closeEdit, navigateToItem } = useRepeaterEdit();

  if (!(editState?.isOpen && editState.field && editState.items)) {
    return null;
  }

  const {
    field,
    items,
    onSave,
    fieldErrors,
    fieldPath,
    componentData,
    formData,
  } = editState;
  const currentItemIndex = editState.itemIndex ?? 0;

  // Merge context errors with external validation errors (external takes precedence)
  const mergedErrors = { ...fieldErrors, ...externalErrors };

  return (
    <RepeaterItemEditViewContent
      closeEdit={closeEdit}
      componentData={componentData}
      currentItemIndex={currentItemIndex}
      field={field}
      fieldErrors={mergedErrors}
      fieldPath={fieldPath}
      formData={formData}
      items={items}
      key={currentItemIndex}
      navigateToItem={navigateToItem}
      onSave={onSave}
    />
  );
};
