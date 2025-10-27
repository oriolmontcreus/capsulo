'use client';

import * as React from 'react';

import type { Point, TElement } from 'platejs';

import {
  type ComboboxItemProps,
  Combobox,
  ComboboxGroup,
  ComboboxGroupLabel,
  ComboboxItem,
  ComboboxPopover,
  ComboboxProvider,
  ComboboxRow,
  Portal,
  useComboboxContext,
  useComboboxStore,
} from '@ariakit/react';
import { filterWords } from '@platejs/combobox';
import {
  type UseComboboxInputResult,
  useComboboxInput,
  useHTMLInputCursorState,
} from '@platejs/combobox/react';
import { cva } from 'class-variance-authority';
import { useComposedRef, useEditorRef } from 'platejs/react';

import { cn } from '@/lib/utils';

type FilterFn = (
  item: { value: string; group?: string; keywords?: string[]; label?: string },
  search: string
) => boolean;

interface InlineComboboxContextValue {
  filter: FilterFn | false;
  inputProps: UseComboboxInputResult['props'];
  inputRef: React.RefObject<HTMLInputElement | null>;
  removeInput: UseComboboxInputResult['removeInput'];
  showTrigger: boolean;
  trigger: string;
  setHasEmpty: (hasEmpty: boolean) => void;
}

const InlineComboboxContext = React.createContext<InlineComboboxContextValue>(
  null as unknown as InlineComboboxContextValue
);

const defaultFilter: FilterFn = (
  { group, keywords = [], label, value },
  search
) => {
  const uniqueTerms = new Set(
    [value, ...keywords, group, label].filter(Boolean)
  );

  return Array.from(uniqueTerms).some((keyword) =>
    filterWords(keyword!, search)
  );
};

interface InlineComboboxProps {
  children: React.ReactNode;
  element: TElement;
  trigger: string;
  filter?: FilterFn | false;
  hideWhenNoValue?: boolean;
  showTrigger?: boolean;
  value?: string;
  setValue?: (value: string) => void;
}

const InlineCombobox = React.memo(({
  children,
  element,
  filter = defaultFilter,
  hideWhenNoValue = false,
  setValue: setValueProp,
  showTrigger = true,
  trigger,
  value: valueProp,
}: InlineComboboxProps) => {
  const editor = useEditorRef();
  const inputRef = React.useRef<HTMLInputElement>(null);
  const cursorState = useHTMLInputCursorState(inputRef);

  const [valueState, setValueState] = React.useState('');
  const hasValueProp = valueProp !== undefined;
  const value = hasValueProp ? valueProp : valueState;

  const setValue = React.useCallback(
    (newValue: string) => {
      setValueProp?.(newValue);

      if (!hasValueProp) {
        setValueState(newValue);
      }
    },
    [setValueProp, hasValueProp]
  );

  /**
   * Track the point just before the input element so we know where to
   * insertText if the combobox closes due to a selection change.
   */
  const insertPoint = React.useRef<Point | null>(null);

  React.useEffect(() => {
    const path = editor.api.findPath(element);

    if (!path) return;

    const point = editor.api.before(path);

    if (!point) return;

    const pointRef = editor.api.pointRef(point);
    insertPoint.current = pointRef.current;

    return () => {
      pointRef.unref();
    };
  }, [editor, element]);

  const onCancelInput = React.useCallback((cause: string) => {
    if (cause !== 'backspace') {
      editor.tf.insertText(trigger + value, {
        at: insertPoint?.current ?? undefined,
      });
    }
    if (cause === 'arrowLeft' || cause === 'arrowRight') {
      editor.tf.move({
        distance: 1,
        reverse: cause === 'arrowLeft',
      });
    }
  }, [editor, trigger, value]);

  const { props: inputProps, removeInput } = useComboboxInput({
    cancelInputOnBlur: true,
    cursorState,
    ref: inputRef,
    onCancelInput,
  });

  const [hasEmpty, setHasEmpty] = React.useState(false);

  const contextValue: InlineComboboxContextValue = React.useMemo(
    () => ({
      filter,
      inputProps,
      inputRef,
      removeInput,
      setHasEmpty,
      showTrigger,
      trigger,
    }),
    [
      trigger,
      showTrigger,
      filter,
      inputRef,
      inputProps,
      removeInput,
      setHasEmpty,
    ]
  );

  const store = useComboboxStore({
    setValue: (newValue) => {
      React.startTransition(() => setValue(newValue));
    },
  });

  // CRITICAL FIX: Don't subscribe to items state - it causes multiple re-renders
  // Use a ref to track if we've set the initial active ID
  const hasSetInitialActiveRef = React.useRef(false);

  // Set active ID once when store is created, not on every items change
  React.useEffect(() => {
    if (!hasSetInitialActiveRef.current) {
      const checkAndSetActive = () => {
        const state = store.getState();
        if (!state.activeId && state.items.length > 0) {
          store.setActiveId(store.first());
          hasSetInitialActiveRef.current = true;
        }
      };

      // Check immediately and after a short delay to catch async item updates
      checkAndSetActive();
      const timeout = setTimeout(checkAndSetActive, 0);

      return () => clearTimeout(timeout);
    }
  }, [store]);  // Calculate open state without subscribing - let ComboboxProvider handle it
  const isOpen = React.useMemo(() => {
    // Let Ariakit manage the open state based on items internally
    // We just control it based on our value and hasEmpty flags
    return !hideWhenNoValue || value.length > 0;
  }, [hideWhenNoValue, value, hasEmpty]);

  return (
    <span contentEditable={false} style={{ contain: 'layout style paint' }}>
      <ComboboxProvider
        open={isOpen}
        store={store}
      >
        <InlineComboboxContext.Provider value={contextValue}>
          {children}
        </InlineComboboxContext.Provider>
      </ComboboxProvider>
    </span>
  );
}, (prevProps, nextProps) => {
  // Only re-render if element or trigger changes
  return (
    prevProps.element === nextProps.element &&
    prevProps.trigger === nextProps.trigger
  );
});

const InlineComboboxInput = React.forwardRef<
  HTMLInputElement,
  React.HTMLAttributes<HTMLInputElement>
>(({ className, ...props }, propRef) => {
  const {
    inputProps,
    inputRef: contextRef,
    showTrigger,
    trigger,
  } = React.useContext(InlineComboboxContext);

  const store = useComboboxContext()!;
  const value = store.useState('value');

  const ref = useComposedRef(propRef, contextRef);

  /**
   * To create an auto-resizing input, we render a visually hidden span
   * containing the input value and position the input element on top of it.
   * This works well for all cases except when input exceeds the width of the
   * container.
   */

  return (
    <>
      {showTrigger && trigger}

      <span className="relative min-h-[1lh]">
        <span
          className="invisible overflow-hidden text-nowrap"
          aria-hidden="true"
        >
          {value || '\u200B'}
        </span>

        <Combobox
          ref={ref}
          className={cn(
            'absolute top-0 left-0 size-full bg-transparent outline-none',
            className
          )}
          value={value}
          autoSelect
          {...inputProps}
          {...props}
        />
      </span>
    </>
  );
});

InlineComboboxInput.displayName = 'InlineComboboxInput';

const InlineComboboxContent = React.memo<React.ComponentProps<typeof ComboboxPopover>>(({
  className,
  children,
  ...props
}) => {
  // Portal prevents CSS from leaking into popover
  return (
    <Portal>
      <ComboboxPopover
        className={cn(
          'z-500 w-[300px] max-h-[288px] rounded-md bg-popover shadow-lg overflow-y-auto overflow-x-hidden border p-1 will-change-[transform,opacity] [contain:layout_style_paint]',
          className
        )}
        {...props}
      >
        {children}
      </ComboboxPopover>
    </Portal>
  );
});

const comboboxItemVariants = cva(
  'relative mx-1 flex h-[28px] items-center rounded-sm px-2 text-sm text-foreground outline-none select-none [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0',
  {
    defaultVariants: {
      interactive: true,
    },
    variants: {
      interactive: {
        false: '',
        true: 'cursor-pointer hover:bg-accent hover:text-accent-foreground data-[active-item=true]:bg-accent data-[active-item=true]:text-accent-foreground',
      },
    },
  }
);

const InlineComboboxItem = React.memo(({
  className,
  focusEditor = true,
  group,
  keywords,
  label,
  onClick,
  ...props
}: {
  focusEditor?: boolean;
  group?: string;
  keywords?: string[];
  label?: string;
} & ComboboxItemProps &
  Required<Pick<ComboboxItemProps, 'value'>>) => {
  const { value } = props;

  const { removeInput } = React.useContext(InlineComboboxContext);

  const handleClick = React.useCallback((event: React.MouseEvent<HTMLDivElement>) => {
    removeInput(focusEditor);
    onClick?.(event);
  }, [removeInput, focusEditor, onClick]);

  // Let Ariakit handle filtering natively - it's much more performant
  // Remove custom filtering to prevent re-renders
  return (
    <ComboboxItem
      className={cn(comboboxItemVariants(), className)}
      onClick={handleClick}
      {...props}
    />
  );
}, (prevProps, nextProps) => {
  // Custom comparison - only re-render if value or label changes
  return (
    prevProps.value === nextProps.value &&
    prevProps.label === nextProps.label &&
    prevProps.className === nextProps.className
  );
});

const InlineComboboxEmpty = ({
  children,
  className,
}: React.HTMLAttributes<HTMLDivElement>) => {
  const { setHasEmpty } = React.useContext(InlineComboboxContext);
  const store = useComboboxContext()!;
  const items = store.useState('items');

  React.useEffect(() => {
    setHasEmpty(true);

    return () => {
      setHasEmpty(false);
    };
  }, [setHasEmpty]);

  if (items.length > 0) return null;

  return (
    <div
      className={cn(comboboxItemVariants({ interactive: false }), className)}
    >
      {children}
    </div>
  );
};

const InlineComboboxRow = ComboboxRow;

const InlineComboboxGroup = React.memo(({
  className,
  ...props
}: React.ComponentProps<typeof ComboboxGroup>) => {
  return (
    <ComboboxGroup
      {...props}
      className={cn(
        'hidden py-1.5 not-last:border-b [&:has([role=option])]:block',
        className
      )}
    />
  );
});

InlineComboboxGroup.displayName = 'InlineComboboxGroup';

const InlineComboboxGroupLabel = React.memo(({
  className,
  ...props
}: React.ComponentProps<typeof ComboboxGroupLabel>) => {
  return (
    <ComboboxGroupLabel
      {...props}
      className={cn(
        'mt-1.5 mb-2 px-3 text-xs font-medium text-muted-foreground',
        className
      )}
    />
  );
});

InlineComboboxGroupLabel.displayName = 'InlineComboboxGroupLabel';

export {
  InlineCombobox,
  InlineComboboxContent,
  InlineComboboxEmpty,
  InlineComboboxGroup,
  InlineComboboxGroupLabel,
  InlineComboboxInput,
  InlineComboboxItem,
  InlineComboboxRow,
};
