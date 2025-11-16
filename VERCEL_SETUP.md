# Vercel Deployment Setup Guide

## 🚀 Quick Fix for 404 Errors

Your app builds successfully locally but gets 404 on Vercel. Here's the complete fix:

---

## Step 1: Set Environment Variables on Vercel

Go to your Vercel project → **Settings** → **Environment Variables** and add these:

### Required Variables:

```bash
OPENAI_API_KEY=sk-...
TAVILY_API_KEY=tvly-...
NEXT_PUBLIC_SANITY_PROJECT_ID=your-project-id
NEXT_PUBLIC_SANITY_DATASET=production
NEXT_PUBLIC_SANITY_API_VERSION=2025-10-31
```

### Optional Variables:

```bash
KNOWLEDGE_SYNC_KEY=your-random-secret
CRAWL_SOURCE_URL=https://www.lanaline.ae/
```

**Important:** Make sure to select **Production**, **Preview**, and **Development** for each variable!

---

## Step 2: Verify Root Directory Setting

1. Go to **Settings** → **General** → **Root Directory**
2. Make sure it's **blank** or set to `.` (dot)
3. If it shows anything else (like `src` or `app`), **clear it** and save

---

## Step 3: Clear Build Cache & Redeploy

1. Go to **Deployments** tab
2. Click **three dots (•••)** on the latest deployment
3. Click **"Redeploy"**
4. **UNCHECK** "Use existing build cache" (important!)
5. Click **"Redeploy"**

---

## Step 4: Check Build Logs

After redeploying:

1. Go to **Deployments**
2. Click on the new deployment
3. Check the **"Building"** section for errors
4. Look for any red error messages about missing environment variables

Common errors:
- ❌ `Missing environment variable: NEXT_PUBLIC_SANITY_PROJECT_ID`
  - **Fix:** Add the variable in Vercel Settings
- ❌ `Dataset "production" not found`
  - **Fix:** Check your Sanity project dashboard for the correct dataset name
- ❌ `DEPLOYMENT_NOT_FOUND`
  - **Fix:** The domain isn't pointing to a valid deployment (see Step 5)

---

## Step 5: Promote to Production (if needed)

If deployment succeeds but you still get 404:

1. Go to **Deployments**
2. Find the successful deployment (green checkmark)
3. Click **"..."** → **"Promote to Production"**
4. Wait 30 seconds, then refresh your domain

---

## Step 6: Test Your Deployment

1. Visit your Vercel URL (e.g., `https://security-xyz.vercel.app/`)
2. You should see: **"✅ Next.js is working!"**
3. If successful, the full chatbot will be restored in the next step

---

## Troubleshooting

### Issue: Still getting 404 after all steps

**Solution A:** Check Domain Settings
1. Go to **Settings** → **Domains**
2. Make sure your domain is listed and pointing to the latest deployment
3. Try removing and re-adding the domain

**Solution B:** Check for Sanity Issues
1. Go to [Sanity Manage](https://www.sanity.io/manage)
2. Verify your project ID matches `NEXT_PUBLIC_SANITY_PROJECT_ID`
3. Verify your dataset name (usually `production`)
4. Make sure the dataset exists (if not, create it)

**Solution C:** Check Build Output
1. Look at the full build logs in Vercel
2. Search for `error` or `fail`
3. If you see Sanity-related errors, double-check your Sanity env vars

---

## Need Help?

### Get Your API Keys:

1. **OpenAI:** https://platform.openai.com/api-keys
2. **Tavily:** https://app.tavily.com/
3. **Sanity:** https://www.sanity.io/manage

### Generate KNOWLEDGE_SYNC_KEY (optional):

```bash
# On Mac/Linux:
openssl rand -base64 32

# Or use any random string generator
```

---

## After Vercel is Working

Once you see "✅ Next.js is working!" on Vercel, let me know and I'll restore the full chatbot interface with:
- ✅ AI Agent with OpenAI GPT-5
- ✅ Crawl RAG integration
- ✅ Knowledge base sync
- ✅ Sanity CMS integration

The simplified page proves your deployment works - then we can safely restore all features!

