// Only manifest-approved dependencies can be rewritten into this capability.
function relativeArtifact(href, path, artifacts) {
 if (!href || /[\u0000-\u0020\u007f\\]/.test(href) || /^[a-z][a-z0-9+.-]*:/i.test(href) || href.startsWith('/')) return;
 const pathname = href.split(/[?#]/, 1)[0];
 if (!pathname || /%2f|%5c/i.test(pathname)) return;
 let decoded;
 try { decoded = decodeURIComponent(pathname); } catch { return; }
 if (/[\u0000-\u001f\u007f\\]/.test(decoded) || decoded.startsWith('/') || /^[a-z][a-z0-9+.-]*:/i.test(decoded)) return;
 const parts = path.split('/').slice(0,-1);
 for (const part of decoded.split('/')) {
  if (part === '..') { if (!parts.length) return; parts.pop(); }
  else if (part !== '.') { if (!part) return; parts.push(part); }
 }
 return artifacts.find(artifact => artifact.path === parts.join('/'));
}

export function renderMarkdown(source, marked, DOMPurify, context) {
 const fragment = DOMPurify.sanitize(marked.parse(source, { gfm: true, breaks: false }), {
  ALLOWED_TAGS: ['h1','h2','h3','h4','h5','h6','p','br','hr','strong','em','del','blockquote','ul','ol','li','pre','code','table','thead','tbody','tr','th','td','a','img'],
  ALLOWED_ATTR: ['href','title','src','alt'], ALLOW_DATA_ATTR: false, ALLOW_ARIA_ATTR: false,
  RETURN_DOM_FRAGMENT: true,
 });
 const resolve = href => context && relativeArtifact(href, context.path, context.artifacts);
 // Work in an inert fragment; no original image URL is inserted into the reader.
 for (const image of fragment.querySelectorAll('img')) {
  const artifact = resolve(image.getAttribute('src'));
  if (!artifact || artifact.type !== 'image' || !/\.(png|jpe?g|gif|webp)$/i.test(artifact.path)) { image.remove(); continue; }
  const url = new URL('api/artifact', context.baseUrl); url.searchParams.set('path',artifact.path);
  image.setAttribute('src',url.href); image.setAttribute('referrerpolicy','no-referrer');
 }
 for (const link of fragment.querySelectorAll('a')) {
  const href=link.getAttribute('href');
  link.rel='noopener noreferrer'; link.setAttribute('referrerpolicy','no-referrer');
  if (/^https?:\/\//i.test(href || '')) {
   try { new URL(href); link.target='_blank'; }
   catch { link.removeAttribute('href'); }
   continue;
  }
  const artifact=resolve(href);
  if (!artifact) { link.removeAttribute('href'); continue; }
  const url=new URL(context.baseUrl); url.searchParams.set('artifact',artifact.path);
  link.setAttribute('href',url.href);
 }
 const container=fragment.ownerDocument.createElement('div'); container.append(fragment);
 return container.innerHTML;
}
