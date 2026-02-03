# CMS Performance Debugging Guide

This guide helps you identify and fix performance issues in your Capsulo CMS.

## Quick Start: Performance Monitor

### Activating the Monitor
Press **Shift + P** anywhere in the CMS admin to toggle the performance monitor.

### Understanding the Metrics

#### 1. FPS (Frames Per Second)
**Like Minecraft TPS** - Shows how smooth your CMS is running:

- **🟢 55-60 FPS (Excellent)** - Green indicator, CMS is running smoothly
- **🟡 45-54 FPS (Good)** - Yellow indicator, minor lag but acceptable
- **🟠 30-44 FPS (Fair)** - Orange indicator, noticeable lag
- **🔴 Below 30 FPS (Poor)** - Red indicator, significant performance issues

**What it means:** 60 FPS means your CMS updates 60 times per second. Below 30 FPS, users will notice lag and stuttering.

#### 2. Average Render Time
Shows how long components take to render in milliseconds.

- **Good:** Under 16ms (needed for 60 FPS)
- **Concerning:** 16-50ms (causes lag)
- **Bad:** Over 50ms (major performance issue)

#### 3. Memory Usage
Shows JavaScript memory consumption in MB.

- **Normal:** 50-150MB for a CMS
- **High:** 200-500MB (possible memory leak)
- **Critical:** Over 500MB (serious leak)

#### 4. Slow Components
Lists components taking over 16ms to render, sorted by slowest first.

**These are your performance bottlenecks!**

## Finding Performance Issues

### Step 1: Identify the Problem
1. Open the Performance Monitor (**Shift + P**)
2. Use your CMS normally
3. Watch the metrics:
   - Low FPS? → Rendering is slow
   - High render times? → Components are expensive
   - Slow components list? → These are the culprits
   - Memory growing? → Possible memory leak

### Step 2: Common Issues with PlateJS Editor

#### Issue: RichEditor causing lag

**Symptoms:**
- FPS drops when typing
- "RichEditor" appears in slow components
- High render times (>50ms)

**Fixes:**

1. **Add debouncing to onChange:**
```tsx
// In richeditor.field.tsx
import { useMemo, useCallback } from 'react';
import { debounce } from 'lodash';

// Inside component
const debouncedOnChange = useMemo(
  () => debounce((value) => {
    onChange(value);
  }, 300),
  [onChange]
);
```

2. **Memoize the editor configuration:**
```tsx
const editorConfig = useMemo(() => ({
  plugins: EditorKit,
  // ... other config
}), []);
```

3. **Use React.memo for the field component:**
```tsx
export const RichEditorField = React.memo(function RichEditorField(props) {
  // ... component code
});
```

#### Issue: Entire form re-rendering on every keystroke

**Symptoms:**
- Multiple components rendering together
- Typing feels laggy

**Fix: Add React.memo to form fields:**
```tsx
// In your field components
export const InputField = React.memo(function InputField({ value, onChange }) {
  // ... component
}, (prevProps, nextProps) => {
  // Only re-render if value changed
  return prevProps.value === nextProps.value;
});
```

#### Issue: Memory keeps growing

**Symptoms:**
- Memory usage increasing over time
- CMS gets slower the longer you use it
- Browser eventually crashes

**Fixes:**

1. **Check for event listener leaks:**
```tsx
useEffect(() => {
  const handler = () => { /* ... */ };
  window.addEventListener('event', handler);
  
  // Must cleanup!
  return () => window.removeEventListener('event', handler);
}, []);
```

2. **Check for PlateJS plugin leaks:**
- PlateJS plugins may hold references
- Try disabling plugins one by one to find the culprit

### Step 3: Advanced Debugging Tools

#### Using the Browser DevTools

1. **React DevTools Profiler:**
   - Install React DevTools extension
   - Open DevTools → Profiler tab
   - Click record (⚫)
   - Interact with your CMS
   - Stop recording
   - See flame graph of what rendered

2. **Performance Tab:**
   - Open DevTools → Performance
   - Record while using CMS
   - Look for:
     - Long tasks (yellow blocks)
     - Layout thrashing (purple spikes)
     - Memory allocations

3. **Memory Tab:**
   - Take heap snapshot
   - Use CMS for a minute
   - Take another snapshot
   - Compare to find leaks

#### Using Console Performance Hooks

Add to components you suspect:

```tsx
import { useRenderTracking, useWhyDidYouUpdate } from './PerformanceMonitor';

function MyComponent(props) {
  // Tracks how many times component renders
  const renderCount = useRenderTracking('MyComponent');
  
  // Logs what props changed causing re-render
  useWhyDidYouUpdate('MyComponent', props);
  
  // Your component code...
}
```

**Read the console output:**
- Warning about rapid renders? → Component re-rendering too much
- Props changing unnecessarily? → Parent passing new objects/functions

## Common PlateJS Performance Optimizations

### 1. Lazy Load the Editor
Only load PlateJS when needed:

```tsx
const RichEditorField = lazy(() => import('./richeditor.field'));

// In parent
<Suspense fallback={<div>Loading editor...</div>}>
  <RichEditorField />
</Suspense>
```

### 2. Virtualize Long Documents
If documents get large, use virtualization:

```tsx
import { useVirtualizer } from '@tanstack/react-virtual';

// In editor container
const virtualizer = useVirtualizer({
  count: editor.children.length,
  getScrollElement: () => parentRef.current,
  estimateSize: () => 50,
});
```

### 3. Disable Unused Plugins
Remove plugins you don't use from `EditorKit`:

```tsx
// In editor-kit.tsx
export const EditorKit = [
  // Remove plugins you don't need
  // ...BasicBlocksKit,
  // ...CodeBlockKit,  // ← Remove if not using code blocks
  // ...TableKit,      // ← Remove if not using tables
];
```

### 4. Optimize Field Updates
Batch updates instead of individual changes:

```tsx
// Bad: Triggers re-render for each field
fields.forEach(field => updateField(field));

// Good: Batch updates
const updates = fields.map(field => ({ id: field.id, value: field.value }));
batchUpdateFields(updates);
```

## Benchmarking Your Fixes

1. **Before fixing:**
   - Open Performance Monitor
   - Note FPS, render time, slow components
   - Take screenshot

2. **Apply fix**

3. **After fixing:**
   - Clear cache and reload
   - Open Performance Monitor again
   - Compare metrics
   - FPS improved? ✅
   - Render time decreased? ✅
   - Component removed from slow list? ✅

## When to Optimize

**Optimize if:**
- ✅ FPS consistently below 45
- ✅ Users complain about lag
- ✅ Typing feels sluggish
- ✅ Memory usage over 300MB

**Don't optimize if:**
- ❌ FPS is 50-60
- ❌ CMS feels fast
- ❌ No user complaints
- ❌ Memory stable around 100-150MB

> "Premature optimization is the root of all evil" - Donald Knuth

## Quick Wins Checklist

- [ ] Remove unused PlateJS plugins
- [ ] Add React.memo to large components
- [ ] Debounce editor onChange handlers
- [ ] Use useMemo for expensive calculations
- [ ] Use useCallback for event handlers
- [ ] Check for missing useEffect cleanup
- [ ] Lazy load heavy components
- [ ] Disable editor features you don't use

## Getting Help

If performance is still poor after optimizations:

1. Export Performance Monitor metrics (screenshot)
2. Record React DevTools profiler session
3. Share in GitHub issues with:
   - Browser version
   - Number of components
   - Average document size
   - Specific actions causing lag
