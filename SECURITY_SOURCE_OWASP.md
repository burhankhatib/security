# 🔒 Security Intelligence Agent - OWASP Source

## ✅ New Crawl Source: OWASP Cheat Sheet Series

I've updated your Sentinel Security Intelligence Agent to crawl **OWASP Cheat Sheet Series** - the industry-standard resource for web application security.

### Why OWASP?

**OWASP (Open Web Application Security Project)** is:
- ✅ **Well-indexed** by search engines and Tavily
- ✅ **Authoritative** - Industry standard for web security
- ✅ **Comprehensive** - Covers all aspects of web security
- ✅ **Up-to-date** - Regularly updated with latest threats
- ✅ **Practical** - Cheat sheets with actionable guidance
- ✅ **Free & Open** - No authentication required

### What's Included

The OWASP Cheat Sheet Series covers:
- **Authentication** - Secure login systems
- **Authorization** - Access control best practices
- **Input Validation** - Preventing injection attacks
- **Session Management** - Secure session handling
- **Cryptography** - Encryption best practices
- **XSS Prevention** - Cross-Site Scripting defenses
- **SQL Injection** - Database security
- **CSRF Protection** - Cross-Site Request Forgery
- **API Security** - REST/GraphQL security
- **Password Storage** - Secure password hashing
- **And 50+ more security topics!**

---

## 🧪 Testing Your Security Agent

### Step 1: Clear Cache & Initialize
1. Visit: **https://security-pearl-gamma.vercel.app/**
2. Press `F12` → Console
3. Right-click refresh → "Empty Cache and Hard Reload"
4. Click **"Initialize RAG System"** when modal appears
5. Wait for success message

### Step 2: Expected Console Output
```
[Crawl API] Starting crawl for: https://cheatsheetseries.owasp.org/
[Crawl API] Search returned 20 results
Processing 20 pages
Page 1 added 8 chunks
Page 2 added 12 chunks
...
Total chunks added: 200+
✅ Knowledge base initialized! 20+ pages crawled
```

---

## 📋 Test Questions - Website Security

### **Category 1: Authentication & Authorization**

1. **"How do I implement secure authentication?"**
   - **Expected**: JWT best practices, session management, MFA recommendations

2. **"What's the best way to store passwords?"**
   - **Expected**: bcrypt, Argon2, salting, hashing algorithms

3. **"How can I prevent brute force attacks?"**
   - **Expected**: Rate limiting, account lockouts, CAPTCHA

4. **"What is OAuth 2.0 and how do I use it securely?"**
   - **Expected**: OAuth flows, token validation, security considerations

### **Category 2: Input Validation**

5. **"How do I prevent SQL injection attacks?"**
   - **Expected**: Parameterized queries, prepared statements, input sanitization

6. **"What is XSS and how do I prevent it?"**
   - **Expected**: Cross-Site Scripting types, output encoding, Content Security Policy

7. **"How do I validate user input securely?"**
   - **Expected**: Whitelist validation, regex patterns, length limits

8. **"What is LDAP injection and how to prevent it?"**
   - **Expected**: LDAP security, input encoding, parameterized queries

### **Category 3: Session Management**

9. **"How do I secure user sessions?"**
   - **Expected**: Session tokens, HTTPOnly cookies, Secure flag, SameSite

10. **"What is session fixation and how to prevent it?"**
    - **Expected**: Session regeneration, token rotation, secure session handling

11. **"How long should session timeouts be?"**
    - **Expected**: Idle timeouts, absolute timeouts, sensitive operations

### **Category 4: Cryptography**

12. **"What encryption algorithm should I use for passwords?"**
    - **Expected**: Argon2, bcrypt, scrypt, work factors

13. **"How do I implement HTTPS correctly?"**
    - **Expected**: TLS 1.3, certificate management, HSTS

14. **"What is a salt and why is it important?"**
    - **Expected**: Random salts, rainbow table prevention, per-user salts

### **Category 5: API Security**

15. **"How do I secure my REST API?"**
    - **Expected**: API authentication, rate limiting, input validation, CORS

16. **"What is API rate limiting and how to implement it?"**
    - **Expected**: Token bucket, sliding window, rate limit headers

17. **"How do I prevent API abuse?"**
    - **Expected**: API keys, throttling, monitoring, anomaly detection

### **Category 6: Cross-Site Attacks**

18. **"What is CSRF and how do I prevent it?"**
    - **Expected**: CSRF tokens, SameSite cookies, double-submit cookies

19. **"How does Content Security Policy work?"**
    - **Expected**: CSP headers, nonce, hash-based CSP, directives

20. **"What is clickjacking and how to prevent it?"**
    - **Expected**: X-Frame-Options, frame-ancestors CSP

### **Category 7: Security Headers**

21. **"What security headers should my website have?"**
    - **Expected**: CSP, HSTS, X-Frame-Options, X-Content-Type-Options

22. **"What is HSTS and why is it important?"**
    - **Expected**: HTTP Strict Transport Security, preload lists, max-age

23. **"How do I prevent MIME sniffing attacks?"**
    - **Expected**: X-Content-Type-Options: nosniff

### **Category 8: File Upload Security**

24. **"How do I secure file uploads?"**
    - **Expected**: File type validation, size limits, virus scanning, separate storage

25. **"What is path traversal and how to prevent it?"**
    - **Expected**: Input sanitization, whitelist validation, absolute paths

### **Category 9: Error Handling**

26. **"How should I handle errors securely?"**
    - **Expected**: Generic error messages, logging, no stack traces in production

27. **"What information should I not expose in error messages?"**
    - **Expected**: Database details, file paths, version numbers, stack traces

### **Category 10: Security Misconfiguration**

28. **"What are common security misconfigurations?"**
    - **Expected**: Default credentials, unnecessary services, verbose errors

29. **"How do I secure my database connections?"**
    - **Expected**: Least privilege, encrypted connections, connection pooling

30. **"What is the principle of least privilege?"**
    - **Expected**: Minimal permissions, role-based access, need-to-know basis

---

## 🎯 Expected Agent Behavior

### ✅ **Good Response Example**

**User**: "How do I prevent SQL injection?"

**Agent**: 
```
Based on OWASP security guidelines, here are the best practices to prevent SQL injection attacks:

1. **Use Parameterized Queries (Prepared Statements)**
   - Never concatenate user input directly into SQL queries
   - Example: `SELECT * FROM users WHERE id = ?` with bound parameters

2. **Use ORM/Query Builders**
   - Frameworks like Hibernate, Entity Framework automatically parameterize queries

3. **Input Validation**
   - Validate all user input against expected patterns
   - Use allowlists, not denylists

4. **Least Privilege Database Access**
   - Application should use database accounts with minimal permissions
   - Avoid using 'sa' or 'root' accounts

5. **Stored Procedures** (with caution)
   - Can provide additional layer of security
   - Must still use parameterization inside procedures

For more details, refer to the OWASP SQL Injection Prevention Cheat Sheet.
```

### ❌ **Bad Response Example**

**User**: "How do I prevent SQL injection?"

**Agent**: 
```
I couldn't find specific information about this in the available content. Based on general knowledge, you should validate inputs and use prepared statements.
```
*This shouldn't happen with OWASP source - if it does, something is wrong!*

---

## 🔍 Verification Steps

### Check 1: Initialization Success
- ✅ Modal appears on first visit
- ✅ "Initialize RAG System" completes without errors
- ✅ Success message shows "20+ pages crawled"
- ✅ Console shows "Total chunks added: 200+"

### Check 2: Content Quality
- ✅ Answers mention "OWASP" or security best practices
- ✅ Answers are detailed and actionable
- ✅ Answers include code examples or step-by-step guides
- ✅ No "I couldn't find information" for security questions

### Check 3: Source Attribution
- ✅ Answers reference security guidelines
- ✅ Content matches OWASP Cheat Sheet topics
- ✅ Technical depth matches OWASP quality

---

## 🛠️ Additional Security Sources (Alternatives)

If you want to add more security sources, here are other well-indexed options:

### Option 1: **PortSwigger Web Security Academy**
```typescript
export const CRAWL_SOURCE_URL = "https://portswigger.net/web-security";
```
- **Pros**: Interactive labs, detailed explanations, Burp Suite integration
- **Topics**: All major web vulnerabilities with labs

### Option 2: **NIST Cybersecurity Framework**
```typescript
export const CRAWL_SOURCE_URL = "https://www.nist.gov/cyberframework";
```
- **Pros**: Enterprise-level guidance, compliance frameworks
- **Topics**: Organizational security, risk management

### Option 3: **Mozilla Web Security Guidelines**
```typescript
export const CRAWL_SOURCE_URL = "https://infosec.mozilla.org/guidelines/web_security";
```
- **Pros**: Practical guidelines, browser security focus
- **Topics**: TLS, CSP, cookies, authentication

### Option 4: **SANS Security Resources**
```typescript
export const CRAWL_SOURCE_URL = "https://www.sans.org/security-resources";
```
- **Pros**: Enterprise security, incident response, training
- **Topics**: Comprehensive security topics

### Option 5: **CWE (Common Weakness Enumeration)**
```typescript
export const CRAWL_SOURCE_URL = "https://cwe.mitre.org/";
```
- **Pros**: Detailed vulnerability taxonomy
- **Topics**: Software weaknesses, vulnerability patterns

---

## 📊 Expected Performance

### Crawl Statistics (OWASP)
```
Source: https://cheatsheetseries.owasp.org/
Expected Pages: 20-30 cheat sheets
Content Length: 500KB - 2MB total
Chunks Generated: 200-400 chunks
Crawl Time: 15-30 seconds
Cache Duration: 1 hour
```

### Query Performance
```
Average Response Time: 2-5 seconds
Context Retrieval: 10-15 relevant chunks
Answer Quality: High (authoritative source)
Coverage: 50+ security topics
```

---

## 🚀 Deployment Status

✅ **Already Deployed**
- **Commit**: `81ca2bb`
- **Source**: `https://cheatsheetseries.owasp.org/`
- **Live**: https://security-pearl-gamma.vercel.app/

---

## 📝 Configuration

### Current Setup
**File**: `src/lib/config/crawl.ts`
```typescript
export const CRAWL_SOURCE_URL =
  process.env.CRAWL_SOURCE_URL || "https://cheatsheetseries.owasp.org/";
```

### Change Source (If Needed)
1. **Edit config file**:
   ```typescript
   export const CRAWL_SOURCE_URL = "https://your-security-site.com";
   ```

2. **Or use environment variable** (Vercel):
   ```bash
   CRAWL_SOURCE_URL=https://your-security-site.com
   ```

3. **Deploy**:
   ```bash
   git add . && git commit -m "Update security source" && git push
   ```

---

## 🎓 Learning Resources

### OWASP Project Links
- **Main Site**: https://owasp.org
- **Cheat Sheets**: https://cheatsheetseries.owasp.org
- **Top 10**: https://owasp.org/www-project-top-ten
- **Testing Guide**: https://owasp.org/www-project-web-security-testing-guide
- **ASVS**: https://owasp.org/www-project-application-security-verification-standard

### Your Agent Will Know About
- ✅ SQL Injection Prevention
- ✅ XSS (Cross-Site Scripting) Protection
- ✅ CSRF (Cross-Site Request Forgery) Defense
- ✅ Authentication Best Practices
- ✅ Session Management
- ✅ Cryptographic Storage
- ✅ API Security
- ✅ Input Validation
- ✅ Security Headers
- ✅ And 40+ more topics!

---

## 🎯 Success Criteria

Your Security Intelligence Agent is working correctly when:

1. ✅ **Initialization**: Completes without errors in 15-30 seconds
2. ✅ **Content Quality**: Answers are detailed, actionable, and accurate
3. ✅ **Coverage**: Can answer questions across all security categories
4. ✅ **Source**: Responses clearly come from security best practices
5. ✅ **Technical Depth**: Includes code examples, configurations, step-by-step guides
6. ✅ **Relevance**: Answers directly address the security question asked
7. ✅ **Completeness**: Doesn't say "I couldn't find information" for basic security topics

---

## 💡 Next Steps

### 1. **Test the Deployment** (5 minutes)
- Clear cache
- Visit https://security-pearl-gamma.vercel.app/
- Initialize RAG system
- Verify success message

### 2. **Ask Test Questions** (10 minutes)
Try 5-10 questions from the list above to verify quality

### 3. **Customize (Optional)**
- Add more security sources
- Adjust system prompt for specific security focus
- Configure crawl depth/frequency

### 4. **Production Ready**
Your agent is now ready to provide authoritative security guidance! 🎉

---

**Status**: ✅ **DEPLOYED WITH OWASP SOURCE**

**Test it now**: https://security-pearl-gamma.vercel.app/

