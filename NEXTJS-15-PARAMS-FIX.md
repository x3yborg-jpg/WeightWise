# Next.js 15 Async Params Fix

## 🔧 Issue
```
Error: A param property was accessed directly with `params.binId`. 
`params` is now a Promise and should be unwrapped with `React.use()` 
before accessing properties of the underlying params object.
```

## 📋 What Changed in Next.js 15

In Next.js 15, **route params are now asynchronous** to improve performance and enable streaming.

### **Before (Next.js 14):**
```typescript
interface BinPageProps {
    params: {
        binId: string;
    }
}

export default function BinPage({ params }: BinPageProps) {
  const { binId } = params; // ✅ Direct access worked
}
```

### **After (Next.js 15):**
```typescript
import { use } from 'react';

interface BinPageProps {
    params: Promise<{  // 👈 Now a Promise!
        binId: string;
    }>
}

export default function BinPage({ params }: BinPageProps) {
  const { binId } = use(params); // 👈 Must unwrap with React.use()
}
```

## ✅ Files Fixed

### `src/app/bin/[binId]/page.tsx`
- ✅ Added `use` import from React
- ✅ Changed `params` type to `Promise<{...}>`
- ✅ Unwrapped params with `use(params)`

## 🎯 Migration Guide

If you add more dynamic routes in the future, follow this pattern:

### **1. Client Components ("use client")**
```typescript
"use client";
import { use } from 'react';

export default function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  // ... rest of component
}
```

### **2. Server Components (async/await)**
```typescript
export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = (await params).id;
  // ... rest of component
}
```

### **3. API Routes**
API routes still use synchronous params (no changes needed):
```typescript
export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  const { id } = params; // ✅ Still works!
}
```

## 📚 References

- [Next.js 15 Upgrade Guide](https://nextjs.org/docs/app/building-your-application/upgrading/version-15)
- [React.use() RFC](https://github.com/acdlite/rfcs/blob/first-class-promises/text/0000-first-class-support-for-promises.md)

---

**Status:** ✅ **FIXED**  
**Affected Files:** 1  
**Breaking Change:** Yes (Next.js 15)  

*Fixed: January 2025*

