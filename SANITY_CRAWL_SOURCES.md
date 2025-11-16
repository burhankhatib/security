# ✅ Sanity-Managed Crawl Sources - Complete Implementation

## Overview

You can now manage ALL crawl sources through Sanity CMS! No more editing code or environment variables. Add, edit, and remove security sources directly from the Sanity Studio.

---

## 🎯 What Was Implemented

### 1. **New Sanity Schema: `crawlSource`**
Created `/src/sanity/schemaTypes/crawlSource.ts` with:
- **Name**: Friendly name (e.g., "OWASP Cheat Sheets")
- **URL**: Website URL to crawl
- **Active**: Enable/disable toggle
- **Description**: Optional notes about the source
- **Order**: Crawl priority (lower numbers first)

### 2. **Multi-Source Crawling**
The system now:
- Fetches ALL active sources from Sanity
- Crawls each source sequentially
- Combines content into one knowledge base
- Tags content with source name (e.g., `[OWASP] Authentication Best Practices`)

### 3. **Smart Cache Invalidation**
Cache automatically invalidates when:
- Any source is added
- Any source is removed
- Any URL is changed
- Active status changes

### 4. **Complete Integration**
Updated all components:
- `/api/admin/crawl` - Multi-source crawling
- `/api/crawl/check` - Sanity source validation
- `/lib/config/crawl.ts` - Sanity fetching logic
- `/lib/tools/crawl.ts` - Agent tool integration
- Sanity Studio structure

---

## 🚀 How to Use

### Step 1: Access Sanity Studio
1. Go to: **https://your-domain.vercel.app/studio**
2. Or locally: **http://localhost:3000/studio**

### Step 2: Add Crawl Sources
1. Click **"Crawl Sources"** in the sidebar (top item)
2. Click **"+ Create"** button
3. Fill in the form:

**Example 1: OWASP**
```
Name: OWASP Cheat Sheets
URL: https://cheatsheetseries.owasp.org/
Active: ✅ Yes
Description: Comprehensive web security cheat sheets
Order: 1
```

**Example 2: Mozilla Security**
```
Name: Mozilla Web Security
URL: https://infosec.mozilla.org/guidelines/web_security
Active: ✅ Yes
Description: Mozilla's security guidelines
Order: 2
```

**Example 3: PortSwigger**
```
Name: PortSwigger Web Security Academy
URL: https://portswigger.net/web-security
Active: ✅ Yes
Description: Interactive security labs and tutorials
Order: 3
```

4. Click **"Publish"**

### Step 3: Initialize Crawl
1. Go to your chatbot page
2. Clear browser cache (F12 → Empty Cache and Hard Reload)
3. Click **"Initialize RAG System"** when modal appears
4. Watch console logs:

```
[Crawl API] Found 3 active sources from Sanity:
  - OWASP Cheat Sheets (https://cheatsheetseries.owasp.org/)
  - Mozilla Web Security (https://infosec.mozilla.org/...)
  - PortSwigger Web Security Academy (https://portswigger.net/...)

[Crawl API] Starting crawl for: OWASP Cheat Sheets
[Crawl] Search API returned 20 results
[Crawl API] ✅ OWASP Cheat Sheets: 150 chunks added

[Crawl API] Starting crawl for: Mozilla Web Security
[Crawl] Search API returned 15 results
[Crawl API] ✅ Mozilla Web Security: 95 chunks added

[Crawl API] Starting crawl for: PortSwigger Web Security Academy
[Crawl] Search API returned 18 results
[Crawl API] ✅ PortSwigger Web Security Academy: 120 chunks added

Total chunks added: 365
✅ Successfully crawled 3 sources
```

---

## 📊 Schema Fields Reference

### **name** (required)
- Type: String
- Min: 3 characters
- Max: 100 characters
- Purpose: Friendly display name
- Example: "OWASP Cheat Sheets"

### **url** (required)
- Type: URL
- Validation: Must be valid http:// or https:// URL
- Purpose: Website to crawl
- Example: "https://cheatsheetseries.owasp.org/"

### **active** (required)
- Type: Boolean
- Default: `true`
- Purpose: Enable/disable source without deleting
- Use case: Temporarily disable a slow source

### **description** (optional)
- Type: Text (multiline)
- Rows: 3
- Purpose: Notes about what this source provides
- Example: "Comprehensive web security cheat sheets covering SQL injection, XSS, authentication, etc."

### **order** (required)
- Type: Number
- Default: `0`
- Purpose: Crawl priority (lower = earlier)
- Example: Set OWASP to `1`, Mozilla to `2`, etc.

---

## 🎨 Sanity Studio Features

### Visual Indicators
Sources show status in the list:
- ✅ **Active Source Name** (green checkmark)
- ⏸️ **Inactive Source Name** (pause icon)

### Ordering
- Drag to reorder (if enabled)
- Or set `order` field manually
- Lower numbers crawl first

### Filtering
- View all sources
- Filter by active/inactive
- Search by name or URL

---

## 🔧 Technical Details

### How Multi-Source Crawling Works

1. **Fetch Sources from Sanity**
```typescript
const sources = await getCrawlSourcesFromSanity()
// Returns: Array of active sources, ordered by 'order' field
```

2. **Create URL Signature**
```typescript
const urlsSignature = sources.map(s => s.url).sort().join('|')
// Example: "https://owasp.org/|https://mozilla.org/"
```

3. **Check Cache**
```typescript
const isValid = await isCrawlCacheValid(urlsSignature)
// Validates cache matches current sources
```

4. **Crawl Each Source**
```typescript
for (const source of sources) {
  const rawData = await crawlSingleSource(source.url, apiKey)
  const chunks = await processAndAddToKnowledge(rawData, source.url, source.name)
  totalChunks += chunks
}
```

5. **Tag Content**
Each chunk is tagged with source name:
```
"[OWASP] SQL Injection Prevention Cheat Sheet"
"[Mozilla] Content Security Policy Guidelines"
"[PortSwigger] Cross-Site Scripting Lab"
```

### API Response Format

**Success Response:**
```json
{
  "success": true,
  "message": "Successfully crawled 3 sources",
  "totalChunksAdded": 365,
  "sources": [
    {
      "source": "OWASP Cheat Sheets",
      "url": "https://cheatsheetseries.owasp.org/",
      "success": true,
      "chunksAdded": 150
    },
    {
      "source": "Mozilla Web Security",
      "url": "https://infosec.mozilla.org/...",
      "success": true,
      "chunksAdded": 95
    },
    {
      "source": "PortSwigger Web Security Academy",
      "url": "https://portswigger.net/...",
      "success": true,
      "chunksAdded": 120
    }
  ],
  "cached": false
}
```

**Error Response (No Sources):**
```json
{
  "success": false,
  "error": "No active crawl sources found in Sanity. Please add crawl sources in Sanity Studio.",
  "hint": "Go to /studio and add documents to 'Crawl Sources'"
}
```

---

## 🎯 Recommended Security Sources

### Tier 1: Essential (Add These)

1. **OWASP Cheat Sheet Series**
   - URL: `https://cheatsheetseries.owasp.org/`
   - Coverage: 50+ security topics
   - Quality: ⭐⭐⭐⭐⭐
   - Order: 1

2. **Mozilla Web Security Guidelines**
   - URL: `https://infosec.mozilla.org/guidelines/web_security`
   - Coverage: Browser security, TLS, CSP
   - Quality: ⭐⭐⭐⭐⭐
   - Order: 2

3. **PortSwigger Web Security Academy**
   - URL: `https://portswigger.net/web-security`
   - Coverage: Labs, tutorials, vulnerabilities
   - Quality: ⭐⭐⭐⭐⭐
   - Order: 3

### Tier 2: Advanced (Optional)

4. **NIST Cybersecurity Framework**
   - URL: `https://www.nist.gov/cyberframework`
   - Coverage: Enterprise security, compliance
   - Quality: ⭐⭐⭐⭐
   - Order: 4

5. **CWE (Common Weakness Enumeration)**
   - URL: `https://cwe.mitre.org/`
   - Coverage: Software weaknesses, vulnerability taxonomy
   - Quality: ⭐⭐⭐⭐
   - Order: 5

6. **SANS Security Resources**
   - URL: `https://www.sans.org/security-resources`
   - Coverage: Incident response, training
   - Quality: ⭐⭐⭐⭐
   - Order: 6

### Tier 3: Specialized (Use Case Specific)

7. **OWASP Top 10**
   - URL: `https://owasp.org/www-project-top-ten/`
   - Coverage: Top 10 web vulnerabilities
   - Quality: ⭐⭐⭐⭐⭐
   - Order: 7

8. **Web Security Testing Guide**
   - URL: `https://owasp.org/www-project-web-security-testing-guide/`
   - Coverage: Penetration testing methodology
   - Quality: ⭐⭐⭐⭐
   - Order: 8

---

## ⚡ Performance Considerations

### Crawl Time Estimates

**Single Source:**
- Time: 15-30 seconds
- Pages: 20-30
- Chunks: 100-200

**Three Sources:**
- Time: 45-90 seconds
- Pages: 60-90
- Chunks: 300-600

**Five Sources:**
- Time: 2-3 minutes
- Pages: 100-150
- Chunks: 500-1000

### API Quota (Tavily Free Tier)
- Search API: ~100 requests/day
- Crawl API: ~50 requests/day
- Rate Limit: 10 requests/minute

**Recommendations:**
- Start with 2-3 sources
- Add more only if needed
- Cache is valid for 1 hour
- Use "Refresh" button sparingly

---

## 🔒 Cache Management

### How Cache Works

1. **URL Signature**: Combines all active source URLs
   ```
   signature = "url1|url2|url3"
   ```

2. **Cache Validation**: Checks if:
   - Cache age < 1 hour
   - URL signature matches current sources

3. **Auto-Invalidation**: Cache clears when:
   - Any source added/removed
   - Any URL changed
   - Any active status toggled

### Manual Cache Clear

**Method 1: Refresh Button**
- Click "↻ Refresh" on the chatbot page
- Forces new crawl of all sources

**Method 2: Browser Cache**
- F12 → "Empty Cache and Hard Reload"
- Clears both server and browser cache

---

## 🐛 Troubleshooting

### Issue 1: "No active crawl sources found"
**Cause**: No sources in Sanity or all inactive  
**Fix**:
1. Go to `/studio`
2. Navigate to "Crawl Sources"
3. Add at least one source
4. Ensure "Active" is checked
5. Click "Publish"

### Issue 2: Some sources fail to crawl
**Symptom**: Console shows `❌ Failed to crawl [Source Name]`  
**Possible Causes**:
- Website blocks Tavily crawlers
- URL is incorrect
- Website requires authentication
- Tavily API quota exceeded

**Fix**:
1. Check console for specific error
2. Verify URL is correct and accessible
3. Try a different source
4. Check Tavily API quota

### Issue 3: Crawl takes too long
**Cause**: Too many sources configured  
**Recommendations**:
- Start with 2-3 sources
- Disable slower sources
- Focus on highest quality sources

### Issue 4: Duplicate content
**Cause**: Same URL added multiple times  
**Fix**:
1. Check for duplicate sources in Sanity
2. Remove duplicates
3. Click "Refresh" to re-crawl

---

## 📝 Example Configurations

### Configuration 1: OWASP Only (Fastest)
```
Source 1:
  Name: OWASP Cheat Sheets
  URL: https://cheatsheetseries.owasp.org/
  Active: Yes
  Order: 1

Result:
- Crawl time: ~20 seconds
- Chunks: ~150
- Coverage: 50+ security topics
```

### Configuration 2: Comprehensive (Recommended)
```
Source 1:
  Name: OWASP Cheat Sheets
  URL: https://cheatsheetseries.owasp.org/
  Active: Yes
  Order: 1

Source 2:
  Name: Mozilla Web Security
  URL: https://infosec.mozilla.org/guidelines/web_security
  Active: Yes
  Order: 2

Source 3:
  Name: PortSwigger Academy
  URL: https://portswigger.net/web-security
  Active: Yes
  Order: 3

Result:
- Crawl time: ~60 seconds
- Chunks: ~400
- Coverage: Multiple perspectives on security
```

### Configuration 3: Enterprise (Advanced)
```
All Tier 1 + Tier 2 sources (6 sources)

Result:
- Crawl time: ~3 minutes
- Chunks: ~800
- Coverage: Comprehensive enterprise security
```

---

## 🚀 Deployment Status

✅ **DEPLOYED TO PRODUCTION**
- **Commit**: `0118c9a`
- **Features**: Sanity crawl sources, multi-source support
- **Live**: https://security-pearl-gamma.vercel.app/
- **Studio**: https://security-pearl-gamma.vercel.app/studio

---

## 📖 Quick Start Guide

1. ✅ **Go to Sanity Studio** (`/studio`)
2. ✅ **Click "Crawl Sources"**
3. ✅ **Add OWASP source**:
   - Name: "OWASP Cheat Sheets"
   - URL: `https://cheatsheetseries.owasp.org/`
   - Active: Yes
   - Order: 1
4. ✅ **Publish**
5. ✅ **Go to chatbot** (`/`)
6. ✅ **Clear cache** (F12 → Hard Reload)
7. ✅ **Click "Initialize RAG System"**
8. ✅ **Wait ~20 seconds**
9. ✅ **Start asking security questions!**

---

## 🎉 Benefits

1. **No Code Changes**: Manage sources without redeployment
2. **Multiple Sources**: Comprehensive knowledge base
3. **Easy Management**: Visual Sanity Studio interface
4. **Flexible**: Enable/disable sources anytime
5. **Prioritization**: Control crawl order
6. **Source Attribution**: Know where answers come from
7. **Cache Smart**: Automatic invalidation when sources change
8. **Production Ready**: Enterprise-grade implementation

---

**Your Security Intelligence Agent is now fully dynamic and powered by Sanity CMS!** 🎯

