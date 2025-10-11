# Async Client Component Fix

## 🐛 The Error

```
Uncaught Error: An unknown Component is an async Client Component. 
Only Server Components can be async at the moment.
```

## 🔍 Root Cause

Two components were calling **async functions directly in the component body**, which React interprets as making the entire component async. Client components (with `client:load`) cannot be async - only Server Components can.

## ❌ The Problems

### Problem 1: CMSManager.tsx

**Before** (Wrong):
```typescript
const loadPage = useCallback(async () => {
  // async logic
}, [selectedPage, initialData]);

useEffect(() => {
  loadPage(); // Returns a Promise! ❌
}, [loadPage]);
```

**Issue**: `useEffect` was returning a Promise from the async function, which React doesn't allow.

### Problem 2: PublishButton.tsx

**Before** (Wrong):
```typescript
export const PublishButton: React.FC<...> = ({ onPublished }) => {
  const draftBranch = getCurrentDraftBranch(); // ❌ Async call in component body!
  
  return (
    <div>
      {draftBranch && <p>Branch: {draftBranch}</p>}
    </div>
  );
};
```

**Issue**: Calling an async function directly in the component render makes React think the component itself is async.

## ✅ The Solutions

### Solution 1: CMSManager.tsx

**After** (Correct):
```typescript
useEffect(() => {
  // Define async function INSIDE useEffect
  const loadPage = async () => {
    try {
      const hasDraft = await hasDraftChanges();
      // ... rest of logic
    } catch (error) {
      console.error('Failed to load page:', error);
    }
  };
  
  // Call it immediately
  loadPage();
}, [selectedPage, initialData]);
```

**Why it works**: 
- Async function is defined and called inside `useEffect`
- `useEffect` itself returns nothing (not a Promise)
- React sees a normal, synchronous component

### Solution 2: PublishButton.tsx

**After** (Correct):
```typescript
export const PublishButton: React.FC<...> = ({ onPublished }) => {
  const [draftBranch, setDraftBranch] = useState<string | null>(null);

  useEffect(() => {
    const fetchBranch = async () => {
      try {
        const branch = await getCurrentDraftBranch();
        setDraftBranch(branch);
      } catch (err) {
        console.error('Failed to get draft branch:', err);
      }
    };
    
    fetchBranch();
  }, []);
  
  return (
    <div>
      {draftBranch && <p>Branch: {draftBranch}</p>}
    </div>
  );
};
```

**Why it works**:
- Async call moved to `useEffect`
- Component body only contains synchronous code
- State updated after async operation completes

## 📋 Rules for Async in React Client Components

### ✅ Allowed:
1. **Inside `useEffect`**:
   ```typescript
   useEffect(() => {
     const fetchData = async () => { ... };
     fetchData();
   }, []);
   ```

2. **In event handlers**:
   ```typescript
   const handleClick = async () => {
     await doSomething();
   };
   ```

3. **In custom hooks**:
   ```typescript
   const useData = () => {
     useEffect(() => {
       const load = async () => { ... };
       load();
     }, []);
   };
   ```

### ❌ Not Allowed:
1. **Component itself being async**:
   ```typescript
   // ❌ WRONG
   export const MyComponent = async () => { ... };
   ```

2. **Async calls in component body**:
   ```typescript
   // ❌ WRONG
   export const MyComponent = () => {
     const data = await fetchData(); // Can't use await here
   };
   ```

3. **useEffect returning a Promise**:
   ```typescript
   // ❌ WRONG
   useEffect(async () => {
     await fetchData();
   }, []);
   ```

## 🎯 Quick Reference

**If you need async data in a component:**

1. **Use state** to hold the data:
   ```typescript
   const [data, setData] = useState(null);
   ```

2. **Use useEffect** to fetch it:
   ```typescript
   useEffect(() => {
     const fetch = async () => {
       const result = await fetchData();
       setData(result);
     };
     fetch();
   }, []);
   ```

3. **Handle loading states**:
   ```typescript
   const [loading, setLoading] = useState(true);
   const [data, setData] = useState(null);
   
   useEffect(() => {
     const fetch = async () => {
       try {
         const result = await fetchData();
         setData(result);
       } finally {
         setLoading(false);
       }
     };
     fetch();
   }, []);
   ```

## 🧪 Testing the Fix

After the fix, the components should:
- ✅ Load without errors
- ✅ Fetch data properly in the background
- ✅ Update UI when data arrives
- ✅ Handle errors gracefully

No more "async Client Component" errors! 🎉

