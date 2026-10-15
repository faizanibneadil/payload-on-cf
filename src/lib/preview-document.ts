// Preview ka HTML document banata hai: project files se ek self-contained `srcdoc`.
// Isme koi network ya third-party service nahi lagti, isliye campus network par bhi chalta hai.
// Student ka code sandboxed iframe (allow-same-origin ke baghair) me chalta hai, is liye
// woh app ki cookies/session tak nahi pahunch sakta.

/** Iframe ke andar console/error/link-click ko parent tak pahunchane wali script */
const HOOK_SCRIPT = `(function(){
  function send(type,payload){try{parent.postMessage({__pg:1,type:type,payload:payload},'*')}catch(e){}}
  function fmt(v){
    try{
      if(typeof v==='string')return v;
      if(v instanceof Error)return v.stack||v.message||String(v);
      if(typeof v==='function')return String(v);
      if(typeof v==='undefined')return 'undefined';
      var seen=[];
      var out=JSON.stringify(v,function(k,val){
        if(typeof val==='object'&&val!==null){if(seen.indexOf(val)!==-1)return '[Circular]';seen.push(val)}
        if(typeof val==='function')return '[Function]';
        return val;
      },2);
      return out===undefined?String(v):out;
    }catch(e){return String(v)}
  }
  ['log','info','warn','error','debug'].forEach(function(level){
    var original=console[level];
    console[level]=function(){
      var args=[].slice.call(arguments).map(fmt);
      send('console',{level:level,text:args.join(' ').slice(0,4000)});
      if(original)original.apply(console,arguments);
    };
  });
  var clear=console.clear;
  console.clear=function(){send('clear');if(clear)clear.call(console)};
  window.addEventListener('error',function(e){
    var where=e.lineno?' (line '+e.lineno+')':'';
    send('console',{level:'error',text:(e.message||'Script error')+where});
  });
  window.addEventListener('unhandledrejection',function(e){
    send('console',{level:'error',text:'Unhandled promise rejection: '+fmt(e.reason)});
  });
  document.addEventListener('click',function(e){
    var a=e.target&&e.target.closest&&e.target.closest('a[href]');
    if(!a)return;
    var href=a.getAttribute('href');
    if(!href||href.charAt(0)==='#'||/^[a-z][a-z0-9+.-]*:|^\\/\\//i.test(href))return;
    e.preventDefault();
    send('navigate',{href:href});
  },true);
})();`

const ABSOLUTE_URL = /^(?:[a-z][a-z0-9+.-]*:|\/\/)/i

/** "css/app.css" ko base file ke folder ke hisaab se "/css/app.css" me resolve karta hai */
export function resolvePath(base: string, href: string): string {
  const clean = href.split('#')[0].split('?')[0]
  const parts = clean.startsWith('/') ? [] : base.split('/').slice(0, -1).filter(Boolean)
  for (const segment of clean.split('/')) {
    if (!segment || segment === '.') continue
    if (segment === '..') parts.pop()
    else parts.push(segment)
  }
  return `/${parts.join('/')}`
}

/** Exact path, warna case-insensitive match (students aksar index.HTML jaisi galti karte hain) */
export function lookupFile(files: Record<string, string>, path: string): string | undefined {
  if (path in files) return files[path]
  const lower = path.toLowerCase()
  const key = Object.keys(files).find((k) => k.toLowerCase() === lower)
  return key === undefined ? undefined : files[key]
}

const attr = (tag: string, name: string): string | undefined => {
  const match = new RegExp(`\\b${name}\\s*=\\s*(?:"([^"]*)"|'([^']*)')`, 'i').exec(tag)
  return match ? (match[1] ?? match[2]) : undefined
}

/** Sirf .html/.htm files preview ho sakti hain */
export const isHtmlPath = (path: string) => /\.html?$/i.test(path)

/** Preview ka default page: /index.html, warna root ki pehli html file */
export function defaultEntry(files: Record<string, string>): string | null {
  const htmlFiles = Object.keys(files).filter(isHtmlPath).sort()
  return (
    htmlFiles.find((p) => p.toLowerCase() === '/index.html') ??
    htmlFiles.find((p) => p.split('/').length === 2) ??
    htmlFiles[0] ??
    null
  )
}

const notice = (message: string) =>
  `<!DOCTYPE html><html><body style="font-family:system-ui,sans-serif;display:grid;place-items:center;min-height:100vh;margin:0;color:#64748b;text-align:center;padding:1rem"><p>${message}</p></body></html>`

export function buildPreviewDocument(files: Record<string, string>, entry: string | null): string {
  if (!entry) return notice('Create an <code>index.html</code> file to see a preview.')
  const source = lookupFile(files, entry)
  if (source === undefined) return notice(`File <code>${entry}</code> was not found.`)

  let html = source
    // <link rel="stylesheet" href="x.css"> -> <style>
    .replace(/<link\b[^>]*>/gi, (tag) => {
      if (!/\brel\s*=\s*["']?stylesheet/i.test(tag)) return tag
      const href = attr(tag, 'href')
      if (!href || ABSOLUTE_URL.test(href)) return tag
      const css = lookupFile(files, resolvePath(entry, href))
      return css === undefined ? tag : `<style>${css.replace(/<\/style/gi, '<\\/style')}</style>`
    })
    // <script src="x.js"></script> -> inline <script>
    .replace(/<script\b([^>]*)>\s*<\/script>/gi, (tag, attrs: string) => {
      const src = attr(attrs, 'src')
      if (!src || ABSOLUTE_URL.test(src)) return tag
      const js = lookupFile(files, resolvePath(entry, src))
      if (js === undefined) return tag
      const rest = attrs.replace(/\bsrc\s*=\s*(?:"[^"]*"|'[^']*')/i, '')
      return `<script${rest}>${js.replace(/<\/script/gi, '<\\/script')}</script>`
    })

  const hook = `<script>${HOOK_SCRIPT}</script>`
  if (/<head\b[^>]*>/i.test(html)) html = html.replace(/<head\b[^>]*>/i, (m) => `${m}${hook}`)
  else if (/<html\b[^>]*>/i.test(html)) html = html.replace(/<html\b[^>]*>/i, (m) => `${m}${hook}`)
  else html = `${hook}${html}`
  return html
}
