# Test Crawl Locally to See Full Logs

## Quick Test (2 Minutes)

### Step 1: Start Dev Server
```bash
npm run dev
```

### Step 2: Open Browser
Go to: http://localhost:3000

### Step 3: Open TWO Consoles
1. **Browser Console**: F12 → Console tab (client logs)
2. **Terminal**: Where `npm run dev` is running (server logs)

### Step 4: Click "Start Knowledge Base Setup"

### Step 5: Watch BOTH Consoles

**Terminal (Server) will show:**
```
[Crawl API] Found 1 active sources from Sanity: OWASP Cheat Sheets
[Crawl API] Starting crawl for: OWASP Cheat Sheets
[Crawl] Search API returned 20 results
[Process] Processing data for OWASP Cheat Sheets: { hasPages: true, pagesCount: 20 }
[Process] Found 20 pages to process
[Process] Page 1: content length = 1234, title = "..."
[Process] Page 1 added 5 chunks
...
[Process] Total chunks added: 150
```

**Browser Console will show:**
```
Crawling website pages...
Successfully crawled 150 content chunks!
```

---

## If You See 0 Chunks

The terminal will tell us WHY:

### Scenario 1: No Pages Found
```
[Process] No pages array found in rawData
```
**Fix needed**: Response format issue

### Scenario 2: Pages Empty
```
[Process] Page 1: content length = 0
[Process] Page 1 skipped - content too short
```
**Fix needed**: Tavily not returning content

### Scenario 3: Pages Have Content But Not Added
```
[Process] Page 1: content length = 1234
[Process] Page 1 added 0 chunks
```
**Fix needed**: Chunking or embedding issue

---

## Share the Logs

Once you run locally, **copy the entire terminal output** and share it with me. I'll see exactly what's wrong and fix it!

