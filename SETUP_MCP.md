# Setting Up Supabase MCP Server in Claude

## What You Need to Do

### 1. Open Claude Desktop Settings
- Press `Cmd+,` (Mac) or go to Claude → Settings
- Look for "Developer" or "MCP" section

### 2. Add MCP Server Configuration
You need to add this configuration to Claude's MCP servers:

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

### 3. Restart Claude
After adding the configuration, you need to restart Claude for the MCP tools to become available.

## What This Will Enable

Once configured, I'll have access to MCP tools like:
- `mcp_supabase_query` - Execute any SQL queries
- `mcp_supabase_create_table` - Create tables
- `mcp_supabase_storage_create_bucket` - Create storage buckets
- `mcp_supabase_storage_upload` - Upload files
- And many more Supabase operations

## Current Status
- ✅ Access token: `sbp_78b071b26a13f1054c5cf4380246723f1ec4cc02`
- ✅ Project ref: `gpuvqonjpdjxehihpuke`
- ❌ MCP server not configured in Claude yet

## After Setup
Once you've added the MCP configuration and restarted Claude, I'll be able to:
1. Create the storage buckets directly
2. Run any SQL operations needed
3. Manage the database fully
4. Test all operations

Please:
1. Add the MCP server configuration to Claude settings
2. Restart Claude
3. Let me know when it's done, and I'll have full Supabase access through MCP tools