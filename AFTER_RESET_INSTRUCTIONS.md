# Instructions After Claude Reset

## Copy and paste this to Claude after adding MCP:

---

I have a LinkedIn Messenger application that needs final setup. The Supabase MCP server should now be configured with these credentials:
- Project: gpuvqonjpdjxehihpuke
- Token: sbp_78b071b26a13f1054c5cf4380246723f1ec4cc02

Please complete the setup:

1. Check if you have MCP tools available (look for functions starting with `mcp_`)
2. If MCP tools are available, use them to:
   - Create storage bucket "screenshots" (private)
   - Create storage bucket "sessions" (private)
   - Verify all tables exist (they should already be created)
   - Get the service role key if possible
3. Test that the application at http://localhost:3003 is fully functional

The app is running on port 3003. Database tables are already created. We just need the storage buckets created using the Supabase MCP tools.

Project path: /Users/johnconnor/Documents/GitHub/Linkedin-messenger

---

## If MCP is not working, tell Claude:

"The Supabase MCP server is not connecting. Here's the configuration that should be in Claude settings:

```json
{
  "supabase": {
    "command": "npx",
    "args": [
      "-y",
      "@supabase/mcp-server-supabase@latest",
      "--project-ref=gpuvqonjpdjxehihpuke"
    ],
    "env": {
      "SUPABASE_ACCESS_TOKEN": "sbp_78b071b26a13f1054c5cf4380246723f1ec4cc02"
    }
  }
}
```

Please help me troubleshoot why the MCP tools aren't available."