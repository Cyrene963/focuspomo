#!/usr/bin/env node

const endpoint = process.env.FOCUSPOMO_ENDPOINT || 'https://focuspomo.bz9.me/api/agent/tasks';
const token = process.env.FOCUSPOMO_AGENT_KEY || process.env.FOCUSPOMO_AGENT_TOKEN || '';

const tools = [
  {
    name: 'focuspomo_get',
    description: 'Read FocusPomo resources: overview, tasks, todayTasks, focusRecords, calendar, summary, or snapshot.',
    inputSchema: {
      type: 'object',
      properties: {
        resource: {
          type: 'string',
          enum: ['overview', 'tasks', 'todayTasks', 'focusRecords', 'calendar', 'summary', 'snapshot'],
          default: 'overview',
        },
      },
    },
  },
  {
    name: 'focuspomo_replace_today',
    description: 'Replace the FocusPomo Today Top 3 planned tasks. Pass one to three task objects.',
    inputSchema: {
      type: 'object',
      properties: {
        tasks: {
          type: 'array',
          minItems: 1,
          maxItems: 3,
          items: { $ref: '#/$defs/task' },
        },
      },
      required: ['tasks'],
      $defs: {
        task: {
          type: 'object',
          properties: {
            title: { type: 'string' },
            notes: { type: 'string' },
            priority: { type: 'string', enum: ['low', 'medium', 'high'] },
            important: { type: 'boolean' },
            urgent: { type: 'boolean' },
            estimatedPomodoros: { type: 'number' },
          },
          required: ['title'],
        },
      },
    },
  },
  {
    name: 'focuspomo_add_task',
    description: 'Add one FocusPomo task without marking it as Today by default.',
    inputSchema: {
      type: 'object',
      properties: {
        title: { type: 'string' },
        notes: { type: 'string' },
        priority: { type: 'string', enum: ['low', 'medium', 'high'] },
        important: { type: 'boolean' },
        urgent: { type: 'boolean' },
        estimatedPomodoros: { type: 'number' },
      },
      required: ['title'],
    },
  },
  {
    name: 'focuspomo_update_task',
    description: 'Update an existing FocusPomo task by task id.',
    inputSchema: {
      type: 'object',
      properties: {
        taskId: { type: 'string' },
        patch: { type: 'object' },
      },
      required: ['taskId', 'patch'],
    },
  },
  {
    name: 'focuspomo_delete_task',
    description: 'Delete a FocusPomo task by task id.',
    inputSchema: {
      type: 'object',
      properties: { taskId: { type: 'string' } },
      required: ['taskId'],
    },
  },
  {
    name: 'focuspomo_plan_today',
    description: 'Mark up to three existing task ids as Today planned tasks.',
    inputSchema: {
      type: 'object',
      properties: {
        taskIds: { type: 'array', minItems: 1, maxItems: 3, items: { type: 'string' } },
      },
      required: ['taskIds'],
    },
  },
];

function send(message) {
  process.stdout.write(JSON.stringify(message) + '\n');
}

function textResult(value) {
  return { content: [{ type: 'text', text: JSON.stringify(value, null, 2) }] };
}

async function focuspomoRequest(method, payload, resource) {
  if (!token) throw new Error('Missing FOCUSPOMO_AGENT_KEY or FOCUSPOMO_AGENT_TOKEN');
  const url = new URL(endpoint);
  if (resource && resource !== 'overview') url.searchParams.set('resource', resource);
  const res = await fetch(url, {
    method,
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json; charset=utf-8',
      Accept: 'application/json',
      'User-Agent': 'focuspomo-mcp/0.1',
    },
    body: payload ? JSON.stringify(payload) : undefined,
  });
  const text = await res.text();
  let data;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = { raw: text };
  }
  if (!res.ok) {
    const detail = data && typeof data === 'object' ? JSON.stringify(data) : String(data);
    throw new Error(`FocusPomo API ${res.status}: ${detail}`);
  }
  return data;
}

async function callTool(name, args = {}) {
  if (name === 'focuspomo_get') {
    return textResult(await focuspomoRequest('GET', null, args.resource || 'overview'));
  }
  if (name === 'focuspomo_replace_today') {
    return textResult(await focuspomoRequest('POST', { action: 'replace_today', tasks: args.tasks || [] }));
  }
  if (name === 'focuspomo_add_task') {
    return textResult(await focuspomoRequest('POST', { action: 'add_task', tasks: [args] }));
  }
  if (name === 'focuspomo_update_task') {
    return textResult(await focuspomoRequest('POST', { action: 'update_task', taskId: args.taskId, patch: args.patch || {} }));
  }
  if (name === 'focuspomo_delete_task') {
    return textResult(await focuspomoRequest('POST', { action: 'delete_task', taskId: args.taskId }));
  }
  if (name === 'focuspomo_plan_today') {
    return textResult(await focuspomoRequest('POST', { action: 'plan_today', tasks: args.taskIds || [] }));
  }
  throw new Error(`Unknown tool: ${name}`);
}

async function handle(request) {
  const { id, method, params = {} } = request;
  if (method === 'initialize') {
    return {
      jsonrpc: '2.0',
      id,
      result: {
        protocolVersion: '2024-11-05',
        capabilities: { tools: {} },
        serverInfo: { name: 'focuspomo-mcp', version: '0.1.0' },
      },
    };
  }
  if (method === 'notifications/initialized') return null;
  if (method === 'tools/list') return { jsonrpc: '2.0', id, result: { tools } };
  if (method === 'tools/call') {
    const result = await callTool(params.name, params.arguments || {});
    return { jsonrpc: '2.0', id, result };
  }
  return { jsonrpc: '2.0', id, error: { code: -32601, message: `Method not found: ${method}` } };
}

let buffer = '';
process.stdin.setEncoding('utf8');
process.stdin.on('data', chunk => {
  buffer += chunk;
  let newline;
  while ((newline = buffer.indexOf('\n')) >= 0) {
    const line = buffer.slice(0, newline).trim();
    buffer = buffer.slice(newline + 1);
    if (!line) continue;
    Promise.resolve()
      .then(() => handle(JSON.parse(line)))
      .then(response => { if (response) send(response); })
      .catch(error => {
        let id = null;
        try { id = JSON.parse(line).id ?? null; } catch {}
        send({ jsonrpc: '2.0', id, error: { code: -32000, message: error.message || String(error) } });
      });
  }
});
