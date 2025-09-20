# Claude Code Assistant - Project Context

## Important Model Updates

### GPT-5 Nano is Available (August 2025)
- Model name: `gpt-5-nano`
- Pricing: $0.05/1M input tokens, $0.40/1M output tokens
- Released: August 7, 2025
- Supports: reasoning_effort, verbosity parameters, parallel tool calling, structured outputs
- Best for: Cost-effective personalization at scale with GPT-5 capabilities

## Project Overview
This is a LinkedIn automation platform with AI-powered message personalization.

### Key Components
1. **Web App** (Next.js/Vercel) - Campaign management UI
2. **Local Runner** (Node.js/Playwright) - LinkedIn automation
3. **AI Service** (GPT-5 Nano) - Message personalization
4. **Database** (Supabase) - Data persistence

### AI Integration Status
- ✅ Database tables for AI personalization created
- ✅ Profile scraping implemented
- ✅ GPT-5 Nano service integrated
- ✅ Safety validators and content filters
- ✅ API endpoints for personalization
- ✅ Caching layer for cost efficiency

### Important Files
- `/lib/ai/personalization-service.ts` - AI service using GPT-5 Nano
- `/runner/run-local-ai.js` - AI-enhanced runner
- `/runner/profile-scraper.js` - LinkedIn profile extraction
- `/supabase/migrations/20250919_ai_personalization.sql` - AI database schema

### Environment Variables Needed
```env
OPENAI_API_KEY=sk-...
AI_ENABLED=true
AI_TONE=professional
SCRAPE_PROFILES=true
```

### Safety Considerations
- LinkedIn automation may violate ToS
- Rate limiting enforced (3-7 min delays)
- Content filters prevent spam language
- Human approval required for AI messages

### Testing
- Run `node verify-setup.js` to check configuration
- Use `node run-local-ai.js` for AI-enhanced messaging
- Test with small campaigns first (5-10 messages)

### Notes for Future Development
- Update to latest OpenAI SDK when upgrading
- Monitor GPT-5 Nano performance vs cost
- Consider GPT-5 Mini for higher quality at higher cost
- Implement A/B testing for AI vs template messages