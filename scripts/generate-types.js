const fs = require('fs');
const path = require('path');

// Read env vars from .env.local
const envContent = fs.readFileSync(path.join(__dirname, '..', '.env.local'), 'utf-8');
const getEnv = (key) => {
  const match = envContent.match(new RegExp(`${key}=(.+)`));
  return match ? match[1].trim() : null;
};

const accessToken = getEnv('SUPABASE_ACCESS_TOKEN');
const projectId = 'gpuvqonjpdjxehihpuke';

async function runSQL(sql) {
  const response = await fetch(`https://api.supabase.com/v1/projects/${projectId}/database/query`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ query: sql })
  });
  return response.json();
}

// Map PostgreSQL types to TypeScript
function pgToTs(pgType, udtName, isNullable) {
  let tsType;
  switch (udtName || pgType) {
    case 'uuid':
    case 'text':
    case 'varchar':
    case 'character varying':
      tsType = 'string';
      break;
    case 'int4':
    case 'int8':
    case 'integer':
    case 'bigint':
    case 'smallint':
      tsType = 'number';
      break;
    case 'float4':
    case 'float8':
    case 'numeric':
    case 'real':
    case 'double precision':
      tsType = 'number';
      break;
    case 'bool':
    case 'boolean':
      tsType = 'boolean';
      break;
    case 'json':
    case 'jsonb':
      tsType = 'Json';
      break;
    case 'timestamptz':
    case 'timestamp':
    case 'timestamp with time zone':
    case 'timestamp without time zone':
    case 'date':
      tsType = 'string';
      break;
    case '_text':
    case 'ARRAY':
      tsType = 'string[]';
      break;
    case 'bytea':
      tsType = 'string';
      break;
    default:
      tsType = 'unknown';
  }

  return isNullable === 'YES' ? `${tsType} | null` : tsType;
}

async function main() {
  console.log('Fetching schema info...');

  const result = await runSQL(`
    SELECT
      table_name,
      column_name,
      data_type,
      is_nullable,
      column_default,
      udt_name
    FROM information_schema.columns
    WHERE table_schema = 'public'
    ORDER BY table_name, ordinal_position
  `);

  // Group by table
  const tables = {};
  for (const col of result) {
    if (!tables[col.table_name]) tables[col.table_name] = [];
    tables[col.table_name].push(col);
  }

  console.log('Tables found:', Object.keys(tables).length);

  // Generate types
  let output = `export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  public: {
    Tables: {
`;

  for (const [tableName, columns] of Object.entries(tables)) {
    // Skip internal tables
    if (tableName.startsWith('_')) continue;

    output += `      ${tableName}: {\n`;

    // Row type
    output += `        Row: {\n`;
    for (const col of columns) {
      const tsType = pgToTs(col.data_type, col.udt_name, col.is_nullable);
      output += `          ${col.column_name}: ${tsType}\n`;
    }
    output += `        }\n`;

    // Insert type
    output += `        Insert: {\n`;
    for (const col of columns) {
      const hasDefault = col.column_default !== null;
      const isNullable = col.is_nullable === 'YES';
      const tsType = pgToTs(col.data_type, col.udt_name, 'YES');
      const optional = hasDefault || isNullable ? '?' : '';
      output += `          ${col.column_name}${optional}: ${tsType}\n`;
    }
    output += `        }\n`;

    // Update type
    output += `        Update: {\n`;
    for (const col of columns) {
      const tsType = pgToTs(col.data_type, col.udt_name, 'YES');
      output += `          ${col.column_name}?: ${tsType}\n`;
    }
    output += `        }\n`;

    output += `        Relationships: []\n`;
    output += `      }\n`;
  }

  output += `    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      claim_next_task: {
        Args: {
          p_runner_id: string
          p_rate_limits_ok?: boolean
        }
        Returns: {
          task_id: string
          campaign_id: string
          target_id: string
        }[]
      }
      check_rate_limits: {
        Args: {
          p_user_id: string
        }
        Returns: {
          can_send: boolean
          reason: string
        }[]
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

export type Tables<
  PublicTableNameOrOptions extends
    | keyof (Database["public"]["Tables"] & Database["public"]["Views"])
    | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
    ? keyof (Database[PublicTableNameOrOptions["schema"]]["Tables"] &
        Database[PublicTableNameOrOptions["schema"]]["Views"])
    : never = never
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? (Database[PublicTableNameOrOptions["schema"]]["Tables"] &
      Database[PublicTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : PublicTableNameOrOptions extends keyof (Database["public"]["Tables"] &
      Database["public"]["Views"])
  ? (Database["public"]["Tables"] &
      Database["public"]["Views"])[PublicTableNameOrOptions] extends {
      Row: infer R
    }
    ? R
    : never
  : never

export type TablesInsert<
  PublicTableNameOrOptions extends
    | keyof Database["public"]["Tables"]
    | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
    ? keyof Database[PublicTableNameOrOptions["schema"]]["Tables"]
    : never = never
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? Database[PublicTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : PublicTableNameOrOptions extends keyof Database["public"]["Tables"]
  ? Database["public"]["Tables"][PublicTableNameOrOptions] extends {
      Insert: infer I
    }
    ? I
    : never
  : never

export type TablesUpdate<
  PublicTableNameOrOptions extends
    | keyof Database["public"]["Tables"]
    | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
    ? keyof Database[PublicTableNameOrOptions["schema"]]["Tables"]
    : never = never
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? Database[PublicTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : PublicTableNameOrOptions extends keyof Database["public"]["Tables"]
  ? Database["public"]["Tables"][PublicTableNameOrOptions] extends {
      Update: infer U
    }
    ? U
    : never
  : never
`;

  fs.writeFileSync(path.join(__dirname, '..', 'lib', 'supabase', 'types.ts'), output);
  console.log('Types written to lib/supabase/types.ts');
  console.log('Lines:', output.split('\n').length);
}

main().catch(console.error);
