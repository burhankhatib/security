# Crawl RAG Integration Setup Guide

This guide explains how to use the Crawl RAG feature integrated into your Security chatbot. The system allows you to crawl websites and automatically add their content to your knowledge base for AI-powered question answering.

## ✅ What's Already Done

1. **Enhanced Loading Indicators**: The chatbot now shows animated thinking states with pulsing dots and status messages when generating responses.

2. **Crawl Tool Integration**: The AI agent can automatically crawl websites when needed using Tavily's crawling API.

3. **Knowledge Base Integration**: Crawled content is automatically chunked, embedded, and added to your existing knowledge base for retrieval.

4. **API Endpoints**: Created `/api/admin/crawl` endpoint for manual website crawling.

5. **Auto-Crawl on Page Load**: The website automatically crawls the configured source on page load and caches the data for 1 hour.

6. **Smart Caching System**: Crawled content is cached with metadata, automatically refreshing every hour to keep data fresh while minimizing API calls.

## 🔧 Prerequisites

You already have `TAVILY_API_KEY` in your `.env.local` file, which is perfect! Make sure it's also added to your Vercel environment variables for production.

## ⚙️ Configuration

### Setting the Crawl Source URL

The crawl system is configured to crawl **https://www.lanaline.ae/** by default. To change the source website:

**Option 1: Environment Variable (Recommended)**
Add to your `.env.local` file:
```bash
CRAWL_SOURCE_URL=https://your-website.com
```

**Option 2: Edit Config File**
Edit `src/lib/config/crawl.ts` and change the default URL:
```typescript
export const CRAWL_SOURCE_URL =
  process.env.CRAWL_SOURCE_URL || "https://your-website.com";
```

**Important**: Only admins can control the crawl source. Users cannot specify URLs - the system uses the configured source automatically.

### Automatic Crawling & Caching

The system automatically crawls the configured website when the page loads:

- **First Load**: Crawls the website and adds content to knowledge base
- **Subsequent Loads**: Checks cache - if less than 1 hour old, uses cached data
- **Cache Refresh**: Automatically refreshes after 1 hour
- **Visual Indicator**: Shows crawl status in the header (green = ready, yellow = loading)

The cache is stored in `public/knowledge/crawl-cache.json` and includes:
- Last crawl timestamp
- URL crawled
- Number of chunks added

To force a refresh (bypass cache), use:
```bash
curl -X POST http://localhost:3000/api/admin/crawl \
  -H "Content-Type: application/json" \
  -d '{"addToKnowledge": true, "forceRefresh": true}'
```

## 📋 Setup Instructions

### 1. Verify Environment Variables

Ensure these are set in both `.env.local` (local) and Vercel (production):

```bash
TAVILY_API_KEY=your-tavily-api-key-here
OPENAI_API_KEY=your-openai-api-key-here
```

### 2. How to Use Crawl RAG

#### Option A: Automatic Crawling via Chatbot

Simply ask the chatbot to crawl the configured website:

```
"Can you crawl the website and tell me about it?"
```

or

```
"Please analyze the content from the website"
```

or

```
"What products are available on the website?"
```

The agent will:
1. Automatically use the configured crawl source URL
2. Use the `crawl` tool to fetch content from the configured website
3. Add it to the knowledge base
4. Answer questions based on the crawled content

**Note**: The chatbot uses the URL configured in `src/lib/config/crawl.ts` or `CRAWL_SOURCE_URL` environment variable. Users cannot specify custom URLs.

#### Option B: Manual Crawling via API

You can manually crawl the configured website using the API endpoint:

```bash
# Crawl the default configured URL
curl -X POST http://localhost:3000/api/admin/crawl \
  -H "Content-Type: application/json" \
  -d '{
    "addToKnowledge": true
  }'
```

Or override the URL for testing (admin only):

```bash
curl -X POST http://localhost:3000/api/admin/crawl \
  -H "Content-Type: application/json" \
  -d '{
    "url": "https://example.com",
    "addToKnowledge": true
  }'
```

**Response:**
```json
{
  "success": true,
  "url": "https://example.com",
  "title": "Example Domain",
  "content": "...",
  "pages": [...],
  "pageCount": 5,
  "knowledgeBase": {
    "added": true,
    "chunksAdded": 15,
    "error": null
  }
}
```

### 3. Using Crawled Content in Chat

Once content is crawled and added to the knowledge base, you can ask questions about it:

```
"What security best practices are mentioned on that website?"
```

```
"Summarize the main points from the crawled content"
```

The system will automatically retrieve relevant chunks from the crawled content using semantic search.

## 🎨 Enhanced Loading Indicators

The chatbot now includes:

- **Animated Thinking Bubble**: Shows pulsing dots when the AI is generating a response
- **Status Messages**: Displays "Analyzing and generating response..." during streaming
- **Visual Status Indicator**: Green pulsing dot shows when the agent is active
- **Smooth Transitions**: All loading states have smooth animations

## 🔍 How It Works

1. **Crawling**: Uses Tavily's `/crawl` endpoint to extract content from websites
2. **Chunking**: Content is split into semantic chunks using the same system as your knowledge documents
3. **Embedding**: Chunks are embedded using OpenAI's `text-embedding-3-large` model
4. **Storage**: Embedded chunks are added to `public/knowledge/knowledge-base.json`
5. **Retrieval**: When you ask questions, the system retrieves relevant chunks using cosine similarity

## 📁 File Structure

```
src/
├── lib/
│   ├── tools/
│   │   └── crawl.ts              # Crawl tool for the AI agent
│   └── knowledge/
│       └── crawl.ts               # Functions to add crawled content to knowledge base
├── app/
│   ├── api/
│   │   ├── admin/
│   │   │   └── crawl/
│   │   │       └── route.ts      # Manual crawl API endpoint
│   │   └── agent/
│   │       └── route.ts          # Updated with crawl tool integration
│   └── (website)/
│       └── page.tsx               # Enhanced with loading indicators
```

## 🚀 Next Steps

1. **Test the Integration**:
   - Start your dev server: `npm run dev`
   - Try asking the chatbot to crawl a website
   - Verify the content appears in your knowledge base

2. **Monitor Knowledge Base**:
   - Check `public/knowledge/knowledge-base.json` to see crawled content
   - Run `/api/admin/knowledge/sync` to regenerate the index if needed

3. **Production Deployment**:
   - Ensure `TAVILY_API_KEY` is set in Vercel environment variables
   - Deploy and test the crawl functionality in production

## 🛠️ Troubleshooting

### Crawl Tool Not Working

- **Check API Key**: Verify `TAVILY_API_KEY` is set correctly
- **Check API Limits**: Ensure your Tavily account has sufficient credits
- **Check URL Format**: URLs must start with `http://` or `https://`

### Content Not Appearing in Knowledge Base

- **Check Logs**: Look for errors in the API response
- **Verify Embedding**: Ensure `OPENAI_API_KEY` is set
- **Check File Permissions**: Ensure the app can write to `public/knowledge/`

### Agent Not Using Crawl Tool

- The agent decides when to use tools automatically
- Try being more explicit: "Crawl this website: https://example.com"
- Check that the tool is registered in `src/app/api/agent/route.ts`

## 📚 Additional Resources

- [Tavily API Documentation](https://docs.tavily.com/)
- [Tavily Crawl2RAG Repository](https://github.com/tavily-ai/crawl2rag)
- [OpenAI Embeddings Guide](https://platform.openai.com/docs/guides/embeddings)

## ✨ Features Summary

✅ Enhanced loading indicators with animations  
✅ Automatic website crawling via chatbot  
✅ Manual crawling via API endpoint  
✅ Automatic knowledge base integration  
✅ Semantic search over crawled content  
✅ Chunked and embedded content storage  
✅ Production-ready error handling  

---

**Ready to use!** Your chatbot can now crawl websites and answer questions about them automatically. 🎉

