#!/usr/bin/env node

import 'dotenv/config'
import { createClient } from '@supabase/supabase-js'
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js'
import { z } from 'zod'

const {
  SUPABASE_URL,
  SUPABASE_SERVICE_ROLE,
  ALLOW_SCHEMAS = 'public,ai,storage',
} = process.env

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE) {
  console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE')
  process.exit(1)
}

const supaAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE, {
  auth: { persistSession: false, autoRefreshToken: false },
})

const allowedSchemas = new Set(ALLOW_SCHEMAS.split(',').map(s => s.trim()))

const server = new McpServer({ name: 'supabase-mcp', version: '0.1.0' })

// ---------- Tools ----------
server.registerTool(
  'schema',
  {
    title: 'Database Schema',
    description: 'Liste tables/colonnes via ai.v_tables',
    inputSchema: {},
  },
  async () => {
    try {
      const { data, error } = await supaAdmin
        .from('v_tables')
        .select('*')
        .schema('ai')
      if (error) throw new Error(error.message)
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({ ok: true, schema: data }, null, 2),
          },
        ],
      }
    } catch (error) {
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({ ok: false, error: error.message }, null, 2),
          },
        ],
        isError: true,
      }
    }
  }
)

server.registerTool(
  'indexes',
  {
    title: 'Database Indexes',
    description: 'Liste les index via ai.v_indexes',
    inputSchema: {},
  },
  async () => {
    try {
      const { data, error } = await supaAdmin
        .from('v_indexes')
        .select('*')
        .schema('ai')
      if (error) throw new Error(error.message)
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({ ok: true, indexes: data }, null, 2),
          },
        ],
      }
    } catch (error) {
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({ ok: false, error: error.message }, null, 2),
          },
        ],
        isError: true,
      }
    }
  }
)

server.registerTool(
  'policies',
  {
    title: 'RLS Policies',
    description: 'Liste les policies via ai.v_policies',
    inputSchema: {},
  },
  async () => {
    try {
      const { data, error } = await supaAdmin
        .from('v_policies')
        .select('*')
        .schema('ai')
      if (error) throw new Error(error.message)
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({ ok: true, policies: data }, null, 2),
          },
        ],
      }
    } catch (error) {
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({ ok: false, error: error.message }, null, 2),
          },
        ],
        isError: true,
      }
    }
  }
)

server.registerTool(
  'triggers',
  {
    title: 'Database Triggers',
    description: 'Liste les triggers via ai.v_triggers',
    inputSchema: {},
  },
  async () => {
    try {
      const { data, error } = await supaAdmin
        .from('v_triggers')
        .select('*')
        .schema('ai')
      if (error) throw new Error(error.message)
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({ ok: true, triggers: data }, null, 2),
          },
        ],
      }
    } catch (error) {
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({ ok: false, error: error.message }, null, 2),
          },
        ],
        isError: true,
      }
    }
  }
)

server.registerTool(
  'explain',
  {
    title: 'SQL Explain',
    description: 'EXPLAIN via RPC ai.fn_explain(p_sql text)',
    inputSchema: {
      sql: z.string().describe('SQL query to explain'),
    },
  },
  async ({ sql }) => {
    try {
      if (!sql) throw new Error('SQL parameter is required')

      const lower = sql.toLowerCase()
      const touchesAllowed =
        [...allowedSchemas].some(s => lower.includes(`${s}.`)) ||
        !lower.includes('.')
      if (!touchesAllowed) throw new Error('Forbidden schema')

      const { data, error } = await supaAdmin
        .rpc('fn_explain', { p_sql: sql })
        .schema('ai')
      if (error) throw new Error(error.message)
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({ ok: true, plan: data }, null, 2),
          },
        ],
      }
    } catch (error) {
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({ ok: false, error: error.message }, null, 2),
          },
        ],
        isError: true,
      }
    }
  }
)

server.registerTool(
  'diagnose_rls',
  {
    title: 'RLS Audit',
    description: 'Audit RLS via ai.fn_rls_audit()',
    inputSchema: {},
  },
  async () => {
    try {
      const { data, error } = await supaAdmin.rpc('fn_rls_audit').schema('ai')
      if (error) throw new Error(error.message)
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({ ok: true, rls: data }, null, 2),
          },
        ],
      }
    } catch (error) {
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({ ok: false, error: error.message }, null, 2),
          },
        ],
        isError: true,
      }
    }
  }
)

server.registerTool(
  'diagnose_fk_indexes',
  {
    title: 'FK Index Gaps',
    description: 'Trouve les FK sans index via ai.fn_fk_index_gaps()',
    inputSchema: {},
  },
  async () => {
    try {
      const { data, error } = await supaAdmin
        .rpc('fn_fk_index_gaps')
        .schema('ai')
      if (error) throw new Error(error.message)
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({ ok: true, gaps: data }, null, 2),
          },
        ],
      }
    } catch (error) {
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({ ok: false, error: error.message }, null, 2),
          },
        ],
        isError: true,
      }
    }
  }
)

// ---- Boot (Stdio) ----
async function main() {
  const transport = new StdioServerTransport()
  await server.connect(transport)
  console.error('MCP Supabase Server connected via stdio')
}

main().catch(error => {
  console.error('Failed to start MCP server:', error)
  process.exit(1)
})
