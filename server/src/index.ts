import { serve } from '@hono/node-server'
import { Hono } from 'hono'
import { cors } from 'hono/cors'

type Field = { key: string; label: string; type: 'text' | 'textarea' | 'select'; required?: boolean; options?: string[] }
type Template = { id: string; title: string; description: string; category: string; body: string; fields: Field[]; version: number }
const template: Template = { id: 'clear-first-draft', title: 'Clear first draft', description: 'Turn a rough idea into a clear, useful first draft without losing your own voice.', category: 'Writing', body: "You are a thoughtful writing partner.\n\nCreate a {{idea}} for {{audience}} in a {{tone}} voice. Keep it {{length}} and easy to scan.\n\nStart with the clearest version of the idea, remove filler, and preserve the writer's intent. Do not invent facts or make the tone sound generic.", version: 3, fields: [{ key: 'idea', label: 'What are you writing?', type: 'textarea', required: true }, { key: 'audience', label: 'Who is it for?', type: 'text', required: true }, { key: 'tone', label: 'Tone', type: 'select', options: ['clear and conversational', 'warm and encouraging', 'direct and confident'] }, { key: 'length', label: 'Length', type: 'select', options: ['short and skimmable', 'a few useful paragraphs', 'detailed and thorough'] }] }
const app = new Hono()
app.use('*', cors())
app.get('/health', (c) => c.json({ ok: true, service: 'prompt-shelf-api' }))
app.get('/api/templates/:id', (c) => c.req.param('id') === template.id ? c.json(template) : c.json({ error: 'Template not found' }, 404))
app.post('/api/templates/:id/compile', async (c) => { if (c.req.param('id') !== template.id) return c.json({ error: 'Template not found' }, 404); const values = await c.req.json<Record<string, string>>(); const missing = template.fields.filter((f) => f.required && !values[f.key]?.trim()).map((f) => f.key); if (missing.length) return c.json({ error: 'Required fields are missing', missing }, 422); const segments: { type: 'static' | 'value'; text: string; key?: string }[] = []; let last = 0; const token = /{{\s*([\w-]+)\s*}}/g; let match: RegExpExecArray | null; while ((match = token.exec(template.body))) { if (match.index > last) segments.push({ type: 'static', text: template.body.slice(last, match.index) }); segments.push({ type: 'value', key: match[1], text: values[match[1]] ?? '' }); last = match.index + match[0].length } if (last < template.body.length) segments.push({ type: 'static', text: template.body.slice(last) }); return c.json({ text: segments.map((s) => s.text).join(''), segments }) })
const port = Number(process.env.PORT ?? 8787)
serve({ fetch: app.fetch, port }, (info) => console.log(`Prompt Shelf API listening on http://localhost:${info.port}`))
