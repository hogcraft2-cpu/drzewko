/**
 * Drzewko API — Cloudflare Worker + D1
 * Public GET, editor-link-only PUT. No GitHub PAT is ever sent by visitors.
 * Configure D1 binding DB and Worker secret EDIT_SECRET (at least 32 characters).
 */
const ORIGINS = new Set([
  'https://hogcraft2-cpu.github.io',
  'http://localhost:8000',
  'http://127.0.0.1:8000'
]);
const MAX_BYTES = 180000;
const GROUPS = new Set(['wladza','dwor','wojsko','kosciol','gospodarstwo']);
const encoder = new TextEncoder();

function respond(data, status = 200, origin = '') {
  const headers = new Headers({
    'Content-Type':'application/json; charset=utf-8',
    'Cache-Control':'no-store',
    'X-Content-Type-Options':'nosniff',
    'Referrer-Policy':'no-referrer',
    'Vary':'Origin'
  });
  if (ORIGINS.has(origin)) {
    headers.set('Access-Control-Allow-Origin',origin);
    headers.set('Access-Control-Allow-Methods','GET, PUT, OPTIONS');
    headers.set('Access-Control-Allow-Headers','Authorization, Content-Type');
    headers.set('Access-Control-Max-Age','600');
  }
  return new Response(status===204?null:JSON.stringify(data), {status,headers});
}
async function equalSecret(candidate, actual) {
  // Hash both values and compare digests without an early exit.
  const [a,b] = await Promise.all([candidate,actual].map(value =>
    crypto.subtle.digest('SHA-256', encoder.encode(value))));
  const x = new Uint8Array(a), y = new Uint8Array(b);
  let result = 0;
  for(let i=0;i<x.length;i++) result |= x[i]^y[i];
  return result===0;
}
function validate(raw) {
  if (!raw || typeof raw !== 'object' || !Array.isArray(raw.nodes) ||
      !Array.isArray(raw.edges) || raw.nodes.length > 400 || raw.edges.length > 1200)
    throw Error('Nieprawidłowe dane schematu');
  const ids = new Set();
  const nodes = raw.nodes.map(n=>{
    if (!n || typeof n !== 'object' || typeof n.id!=='string' ||
        !/^[a-zA-Z0-9_-]{1,90}$/.test(n.id) || ids.has(n.id))
      throw Error('Nieprawidłowy lub powtórzony identyfikator urzędu');
    ids.add(n.id);
    const coord = value => {
      if (typeof value !== 'number' || !Number.isFinite(value) ||
          value<0 || value>20000) throw Error('Nieprawidłowa pozycja urzędu');
      return Math.round(value);
    };
    return {
      id:n.id,
      title:String(n.title||'Nowy urząd').slice(0,140),
      people:String(n.people||'').slice(0,300),
      note:String(n.note||'').slice(0,600),
      group:GROUPS.has(n.group)?n.group:'dwor',
      x:coord(n.x),y:coord(n.y)
    };
  });
  const edgeKeys = new Set();
  const edges = raw.edges.map(e=>{
    if(!e || !ids.has(e.from) || !ids.has(e.to) || e.from===e.to ||
       typeof e.id!=='string' || !/^[a-zA-Z0-9_-]{1,90}$/.test(e.id) ||
       edgeKeys.has(e.id)) throw Error('Nieprawidłowe połączenie');
    edgeKeys.add(e.id);
    return {id:e.id,from:e.from,to:e.to};
  });
  return {version:1,title:String(raw.title||'Regestr Dworu').slice(0,180),
    subtitle:String(raw.subtitle||'').slice(0,320),nodes,edges};
}
async function ensureDb(env) {
  if (!env.DB) throw Error('Nie podłączono bazy D1 (binding DB)');
  await env.DB.prepare(`CREATE TABLE IF NOT EXISTS trees (
    id TEXT PRIMARY KEY, payload TEXT NOT NULL,
    revision INTEGER NOT NULL, updated_at TEXT NOT NULL
  )`).run();
}
export default {
  async fetch(request, env) {
    const origin = request.headers.get('Origin') || '';
    const url = new URL(request.url);
    if(origin && !ORIGINS.has(origin))
      return respond({error:'Nieobsługiwany adres strony'},403,origin);
    if(request.method==='OPTIONS')
      return respond({},204,origin);
    if(url.pathname==='/health' && request.method==='GET')
      return respond({ok:true,databaseConfigured:!!env.DB,secretConfigured:!!env.EDIT_SECRET},200,origin);
    if(url.pathname!=='/tree')return respond({error:'Nie znaleziono'},404,origin);
    try {
      await ensureDb(env);
      if(request.method==='GET') {
        const row = await env.DB.prepare(
          "SELECT payload, revision, updated_at FROM trees WHERE id = 'main'").first();
        if(!row)return respond({error:'Jeszcze nie opublikowano drzewka',revision:0},404,origin);
        return respond({tree:JSON.parse(row.payload),revision:row.revision,
          updatedAt:row.updated_at},200,origin);
      }
      if(request.method!=='PUT')
        return respond({error:'Nieobsługiwana metoda'},405,origin);
      if(typeof env.EDIT_SECRET!=='string' || env.EDIT_SECRET.length<32)
        return respond({error:'Nie skonfigurowano sekretu edycyjnego'},503,origin);
      const authorization=request.headers.get('Authorization') || '';
      const key=authorization.startsWith('Bearer ')?authorization.slice(7):'';
      if(!key || key.length>500 || !(await equalSecret(key,env.EDIT_SECRET)))
        return respond({error:'Brak uprawnień do zapisu'},403,origin);
      const length=Number(request.headers.get('Content-Length'));
      if(length>MAX_BYTES)return respond({error:'Plik jest zbyt duży'},413,origin);
      const rawText=await request.text();
      if(encoder.encode(rawText).length>MAX_BYTES)
        return respond({error:'Plik jest zbyt duży'},413,origin);
      let payload;
      try {payload=JSON.parse(rawText)}
      catch {return respond({error:'Nieprawidłowy JSON'},400,origin)}
      if(!Number.isSafeInteger(payload?.baseRevision) || payload.baseRevision<0)
        return respond({error:'Brak prawidłowej wersji bazowej'},400,origin);
      let tree;
      try {tree=validate(payload.tree)}
      catch(e) {return respond({error:e.message},400,origin)}
      const now = new Date().toISOString();
      const result=await env.DB.prepare(`INSERT INTO trees
        (id,payload,revision,updated_at) VALUES ('main', ?, 1, ?)
        ON CONFLICT(id) DO UPDATE SET
          payload=excluded.payload,
          revision=trees.revision+1,
          updated_at=excluded.updated_at
        WHERE trees.revision=?`)
        .bind(JSON.stringify(tree),now,payload.baseRevision).run();
      if((result.meta?.changes??0)<1){
        const current=await env.DB.prepare(
          "SELECT revision FROM trees WHERE id='main'").first();
        return respond({error:'Ktoś opublikował nowszą wersję. Zapisz szkic i odśwież.',
          revision:current?.revision||0},409,origin);
      }
      const saved=await env.DB.prepare(
        "SELECT revision FROM trees WHERE id='main'").first();
      return respond({ok:true,revision:saved.revision,updatedAt:now},200,origin);
    } catch(e) {
      console.error('Drzewko Worker:',e);
      return respond({error:'Błąd serwera lub konfiguracji bazy danych'},500,origin);
    }
  }
};
