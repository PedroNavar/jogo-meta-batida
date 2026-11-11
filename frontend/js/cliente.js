import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.4';
import { API, SUPABASE_URL, SUPABASE_KEY, CLIENTE } from './config.js';
export const pausa=ms=>new Promise(resolve=>setTimeout(resolve,ms));
// URL absoluta da PASTA da página atual (sem o nome do arquivo). Serve pra montar links pra
// copiar/compartilhar que funcionem tanto na raiz quanto numa subpasta de cliente (ex.: /vilarejo/).
export const baseUrl=()=>new URL('.',location.href).href;
// Marca por tenant: cor_primaria substitui o amarelo padrão nas páginas do jogo (jogo/telão/
// gerente) sem precisar de CSS por cliente. Chame de novo a cada /config recebido — idempotente.
export function aplicarMarca(config) {
 if(config?.tenant?.cor)document.documentElement.style.setProperty('--amarelo',config.tenant.cor);
}
const sb=createClient(SUPABASE_URL,SUPABASE_KEY,{auth:{persistSession:false}});
// /config, /entrar, /gerente e /admin(/csv) resolvem o tenant por ?c=; as demais rotas já
// identificam a rodada pelo token/id.
export function urlDaRota(rota) {
 const [caminho,busca='']=rota.replace(/^\/api/,'').split('?');
 const params=new URLSearchParams(busca);
 if(['/config','/entrar','/gerente','/admin','/admin/csv'].includes(caminho) && !params.has('c'))params.set('c',CLIENTE);
 const qs=params.toString();
 return API+caminho+(qs?'?'+qs:'');
}
// Um canal Broadcast por rodada (equivalente ao antigo EventSource('/api/eventos')); troca de
// rodada reabre o canal. NÃO filtra por loja (o motor ainda não separa o ranking por loja).
export function conectarRanking({aoReceber,aoStatus=()=>{}}) {
 let canal=null,assinado='';
 return function atualizar(rodadaId) {
  const chave=rodadaId || '';
  if(canal && assinado===chave)return;
  if(canal)sb.removeChannel(canal);
  canal=null;assinado=chave;
  if(!chave)return;
  canal=sb.channel('rodada:'+chave)
   .on('broadcast',{event:'ranking'},({payload})=>aoReceber(payload))
   .subscribe(aoStatus);
 };
}
export function lerToken(id,storage) {
 try { return (storage ?? globalThis.localStorage).getItem('meta-batida:rodada:'+id) || null; } catch { return null; }
}
export function guardarToken(id,token,storage) {
 try { (storage ?? globalThis.localStorage).setItem('meta-batida:rodada:'+id,token);return true; } catch { return false; }
}
export function relogio(restanteMs,agora=()=>performance.now()) {
 const inicio=agora();return ()=>Math.max(0,restanteMs-(agora()-inicio));
}
export async function api(rota,{token,body,timeout=5000}={}) {
 const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),timeout);
 try {
  const res=await fetch(urlDaRota(rota),{method:body===undefined?'GET':'POST',cache:'no-store',signal:controller.signal,headers:{
   apikey:SUPABASE_KEY,...(token?{Authorization:'Bearer '+token}:{}),...(body===undefined?{}:{'Content-Type':'application/json','X-Requested-With':'jogo'})
  },...(body===undefined?{}:{body:JSON.stringify(body)})});
  const dados=await res.json();
  if(!res.ok) throw Object.assign(new Error(dados.erro || 'Não foi possível continuar.'),{status:res.status});
  return dados;
 } finally {clearTimeout(timer);}
}
export async function enviarResposta(body,{pedir,restante,avisar=()=>{},pausa:esperar=pausa}) {
 // Reenvia a mesma resposta: o servidor reconhece uma resposta já registrada.
 while(restante()>0) {
  try {return await pedir(body);} catch(e) {
   if(e.status===409) return null;
   if(e.status && e.status<500) throw e;
   avisar('Reconectando');if(restante()<=0) break;
   await esperar(Math.min(600,restante()));
  }
 }
 return null;
}
export function imagemLocal(caminho) {
 return typeof caminho==='string' && /^\/?(?:img|img-upload)\/[a-zA-Z0-9_./-]+$/.test(caminho) && !caminho.includes('..') ? '/'+caminho.replace(/^\//,'') : null;
}
export const elemento=(tag,texto,classe)=>{
 const el=document.createElement(tag);if(texto!==undefined)el.textContent=texto;if(classe)el.className=classe;return el;
};
// Regional e Outro jogam sem loja: mostra o cargo no lugar dela.
export const origem=(p,lojas)=>p.loja?(lojas.get(p.loja) || p.loja):(p.cargo || '');
export function desenharPodio(container,linhas,lojas,compacto=false) {
 linhas=linhas.filter(p=>p.pontos>0); // Ninguém aparece antes de fazer ponto.
 const antigas=new Map([...container.children].map(el=>[el.dataset.id,el.getBoundingClientRect()]));
 container.replaceChildren(...Array.from({length:3},(_,i)=>{
  const p=linhas[i],li=elemento('li',undefined,'medalha');li.dataset.id=p?.id || 'vazio-'+i;
  const nome=p?(compacto?p.nome.trim().split(/\s+/)[0].slice(0,12):p.nome):'Aguardando';
  li.append(elemento('span',(i+1)+'º','colocacao'),elemento('strong',nome,'nome-podio'),elemento('span',p?p.pontos+' pts':'—','pontos-podio'));
  if(p) {li.title=p.nome;li.append(elemento('span',origem(p,lojas),'loja-podio'));}
  return li;
 }));
 if(!globalThis.matchMedia?.('(prefers-reduced-motion: reduce)').matches) {
  for(const el of container.children) {
   const antes=antigas.get(el.dataset.id),atual=el.getBoundingClientRect();
   const x=antes?(antes.left-atual.left):0,y=antes?(antes.top-atual.top):0;
   if((x || y) && el.animate) el.animate([{transform:'translate('+x+'px,'+y+'px)'},{transform:'translate(0,0)'}],{duration:300});
  }
 }
}
// A lista de cada cargo só é pedida e mostrada depois do clique.
export function listasPorCargo(botoes,lista,contexto) {
 let aberta=null,pedindo=false;
 const carregar=async()=>{
  if(!aberta || pedindo)return;
  const cargo=aberta,{rodadaId,lojas,id}=contexto();pedindo=true;
  try {
   const r=await api('/api/ranking?'+new URLSearchParams({...(rodadaId?{rodadaId}:{}),cargo}));
   if(aberta===cargo){desenharRanking(lista,r.linhas,lojas,id);lista.hidden=false;lista.scrollIntoView?.({block:'nearest'});}
  } catch {if(aberta===cargo){lista.replaceChildren(elemento('p','Não foi possível carregar a lista.'));lista.hidden=false;}}
  finally {pedindo=false;}
 };
 botoes.replaceChildren(...['Regional','Gerente','Vendedor','Outro'].map(cargo=>{
  const b=elemento('button',cargo,'discreto');b.type='button';b.setAttribute('aria-pressed','false');
  b.addEventListener('click',()=>{
   aberta=aberta===cargo?null:cargo;
   for(const x of botoes.children)x.setAttribute('aria-pressed',String(x.textContent===aberta));
   lista.hidden=true;lista.replaceChildren();void carregar();
  });
  return b;
 }));
 return carregar;
}
export function desenharRanking(container,linhas,lojas,id) {
 container.replaceChildren(...linhas.map(p=>{
  const linha=elemento('div',undefined,'linha'+(p.id===id?' eu':''));
  const nome=elemento('span',p.nome);nome.append(elemento('small',origem(p,lojas)));
  linha.append(elemento('strong',p.posicao+'º'),nome,elemento('strong',p.pontos+' pts'));
  return linha;
 }));
 if(!linhas.length) container.append(elemento('p','Ninguém neste cargo ainda.'));
}
