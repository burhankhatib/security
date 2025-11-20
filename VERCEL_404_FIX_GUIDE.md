# Vercel 404 NOT_FOUND Fix Guide

This document explains exactly what was changed to fix the persistent 404 errors on Vercel deployment.

---

## 🔴 **The Problem**

- ✅ App works perfectly on `localhost:3000`
- ✅ `npm run build` succeeds locally
- ❌ Production deployment on Vercel returns **404 NOT_FOUND**
- ❌ Even `/api/health` endpoint returns 404

---

## ✅ **Root Causes & Fixes**

### **1. Incorrect File Structure (PRIMARY ISSUE)**

#### **Problem:**
The page was inside a route group `(website)` instead of at the root:

```
❌ WRONG:
src/app/(website)/page.tsx

✅ CORRECT:
src/app/page.tsx
```

#### **Fix:**
**Moved `page.tsx` from route group to root:**

```bash
# Before
src/app/(website)/page.tsx

# After  
src/app/page.tsx
```

**Why:** Next.js App Router requires `page.tsx` directly in `src/app/` for the root route (`/`). Route groups like `(website)` are for organization but don't create routes.

---

### **2. Missing Dynamic Export**

#### **Problem:**
Next.js was trying to statically generate a page that needs to be dynamic (uses client-side hooks, API calls, etc.).

#### **Fix:**
**Added to `src/app/page.tsx`:**

```typescript
export const dynamic = "force-dynamic";

export default function RootPage() {
  return <HomePage />;
}
```

**Why:** Forces Next.js to treat the page as dynamic (server-rendered on each request) instead of trying to pre-render it statically.

---

### **3. Sanity Environment Variables Causing Build Crashes**

#### **Problem:**
Missing Sanity environment variables caused the build to crash during the Sanity client initialization.

#### **Fix:**
**Made Sanity config optional in `src/sanity/env.ts`:**

```typescript
// Before (CRASHES if env vars missing)
export const projectId = process.env.NEXT_PUBLIC_SANITY_PROJECT_ID!;
export const dataset = process.env.NEXT_PUBLIC_SANITY_DATASET!;

// After (GRACEFUL FALLBACK)
export const projectId = process.env.NEXT_PUBLIC_SANITY_PROJECT_ID || 'fallback-id';
export const dataset = process.env.NEXT_PUBLIC_SANITY_DATASET || 'production';
```

**Also updated `sanity.cli.ts`:**

```typescript
// Before
export default defineConfig({
  projectId: process.env.NEXT_PUBLIC_SANITY_PROJECT_ID!,
  dataset: process.env.NEXT_PUBLIC_SANITY_DATASET!,
  // ...
});

// After
export default defineConfig({
  projectId: process.env.NEXT_PUBLIC_SANITY_PROJECT_ID || 'fallback-id',
  dataset: process.env.NEXT_PUBLIC_SANITY_DATASET || 'production',
  // ...
});
```

**Why:** Prevents build crashes when environment variables are missing. The app can still build and deploy, even if Sanity features don't work until env vars are added.

---

### **4. Vercel Build Cache Issues**

#### **Problem:**
Vercel was serving cached build output that didn't include the new root page.

#### **Fix:**
**On Vercel Dashboard:**

1. **Settings → General → Root Directory**
   - Ensure it's **blank** (root) or explicitly `.`
   - ❌ NOT set to `src/app/(website)` or any subdirectory

2. **Settings → General → Build & Development Settings**
   - Click **"Clear Build Cache"**
   - This forces a fresh build

3. **Redeploy**
   - Push a new commit OR
   - Click "Redeploy" in Vercel dashboard

**Why:** Vercel caches build outputs. If the cache contains the old structure, it will serve 404s even after code changes.

---

## 📋 **Complete Checklist**

Use this checklist for any Next.js App Router project with 404 issues:

### **File Structure**
- [ ] `src/app/page.tsx` exists (not in a route group)
- [ ] `src/app/layout.tsx` exists
- [ ] No conflicting routes

### **Page Configuration**
- [ ] Added `export const dynamic = "force-dynamic"` if page uses:
  - Client components (`"use client"`)
  - API calls on mount
  - Dynamic data fetching
  - User interactions

### **Environment Variables**
- [ ] All required env vars are set in Vercel
- [ ] Optional dependencies have fallbacks
- [ ] No hardcoded `!` assertions on env vars

### **Build Configuration**
- [ ] `package.json` has correct build script: `"build": "next build"`
- [ ] No custom `vercel.json` overriding routes
- [ ] `.vercelignore` doesn't exclude necessary files

### **Vercel Settings**
- [ ] Root Directory is blank or `.`
- [ ] Build Command is `npm run build` (or `next build`)
- [ ] Output Directory is `.next` (default)
- [ ] Build cache cleared

### **Verification**
- [ ] `npm run build` succeeds locally
- [ ] `npm run start` serves the page correctly
- [ ] Check build logs in Vercel for errors
- [ ] Test `/api/health` endpoint works

---

## 🔍 **Debugging Steps**

### **Step 1: Verify Local Build**
```bash
npm run build
npm run start
# Visit http://localhost:3000
```

If this works, the code is correct. The issue is deployment.

### **Step 2: Check Vercel Build Logs**
1. Go to Vercel Dashboard → Your Project → Deployments
2. Click latest deployment
3. Check "Build Logs" tab
4. Look for:
   - ❌ Build errors
   - ❌ Missing environment variables
   - ❌ TypeScript errors
   - ❌ Import errors

### **Step 3: Check Function Logs**
1. Vercel Dashboard → Functions tab
2. Look for `/api/*` endpoints
3. If they're missing, the build didn't include them

### **Step 4: Verify Route Generation**
After build, check:
```
.next/server/app/
```
You should see:
- `page.js` or `page.jsx` for your routes
- `route.js` for API routes

### **Step 5: Test API Endpoints**
```bash
# Test health endpoint
curl https://your-app.vercel.app/api/health

# Should return JSON, not 404
```

---

## 🎯 **Quick Fix Template**

If you're getting 404s right now, try this:

### **1. Move Page to Root**
```bash
# If page is in route group, move it:
mv src/app/(website)/page.tsx src/app/page.tsx
```

### **2. Add Dynamic Export**
```typescript
// src/app/page.tsx
export const dynamic = "force-dynamic";

export default function Page() {
  // Your component
}
```

### **3. Make Optional Dependencies Safe**
```typescript
// Any file that uses env vars or external services
const apiKey = process.env.API_KEY || 'fallback';
// NOT: process.env.API_KEY!
```

### **4. Clear Vercel Cache**
- Vercel Dashboard → Settings → Clear Build Cache
- Redeploy

### **5. Verify**
```bash
git add .
git commit -m "Fix 404: Move page to root, add dynamic export"
git push origin main
```

---

## 📝 **Files Changed (This Project)**

1. **`src/app/page.tsx`** (moved from `src/app/(website)/page.tsx`)
   - Added `export const dynamic = "force-dynamic"`

2. **`src/sanity/env.ts`**
   - Made `projectId` and `dataset` optional with fallbacks

3. **`sanity.cli.ts`**
   - Made `projectId` and `dataset` optional with fallbacks

4. **Deleted:**
   - `src/app/(website)/page.tsx` (moved to root)

---

## 🚨 **Common Mistakes**

### **Mistake 1: Route Groups Create Routes**
```typescript
// ❌ WRONG: This doesn't create a route
src/app/(website)/page.tsx

// ✅ CORRECT: This creates the root route
src/app/page.tsx
```

### **Mistake 2: Missing Dynamic Export**
```typescript
// ❌ WRONG: Next.js tries to pre-render
export default function Page() {
  return <ClientComponent />; // Uses hooks, API calls
}

// ✅ CORRECT: Force dynamic rendering
export const dynamic = "force-dynamic";
export default function Page() {
  return <ClientComponent />;
}
```

### **Mistake 3: Hardcoded Env Var Assertions**
```typescript
// ❌ WRONG: Crashes if missing
const key = process.env.API_KEY!;

// ✅ CORRECT: Graceful fallback
const key = process.env.API_KEY || 'fallback';
```

### **Mistake 4: Wrong Root Directory in Vercel**
- ❌ Root Directory: `src/app`
- ✅ Root Directory: (blank) or `.`

---

## ✅ **Success Indicators**

After applying fixes, you should see:

1. ✅ **Build succeeds** in Vercel logs
2. ✅ **Routes listed** in build output:
   ```
   Route (app)
   ┌ ƒ /
   ├ ƒ /api/health
   └ ...
   ```
3. ✅ **Page loads** at `https://your-app.vercel.app/`
4. ✅ **API endpoints work** at `https://your-app.vercel.app/api/*`

---

## 📚 **References**

- [Next.js App Router Documentation](https://nextjs.org/docs/app)
- [Next.js Route Groups](https://nextjs.org/docs/app/building-your-application/routing/route-groups)
- [Next.js Dynamic Rendering](https://nextjs.org/docs/app/building-your-application/rendering/server-components#dynamic-rendering)
- [Vercel Deployment Troubleshooting](https://vercel.com/docs/concepts/deployments/troubleshooting)

---

## 🎓 **Key Takeaway**

**The #1 cause of 404s on Vercel with Next.js App Router:**

> **Your `page.tsx` must be directly in `src/app/` for the root route (`/`). Route groups like `(website)` are for organization only and don't create routes.**

If you have a similar issue, check:
1. File structure (page at root?)
2. Dynamic export (if using client components)
3. Environment variables (optional with fallbacks?)
4. Vercel cache (cleared?)

---

**Last Updated:** Based on fixes applied to this project  
**Project:** security (RAG chatbot with Tavily crawling)

