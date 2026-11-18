import { api, elemento, baseUrl } from './cliente.js';
const $=id=>document.getElementById(id);
let senhaMaster='';
const mensagem=m=>{$('mensagem').textContent=m;};

$('login').addEventListener('submit',e=>{
 e.preventDefault();senhaMaster=$('senha-login').value;
 $('login').hidden=true;$('aplicacao').hidden=false;mensagem('');
 // Não dá pra validar a senha master sem já criar algo — ela só é checada mesmo no envio
 // do formulário de criar cliente (se estiver errada, o erro aparece lá).
});

function linkCopiavel(rotulo,url) {
 const p=elemento('p');
 const campo=elemento('input');campo.readOnly=true;campo.value=url;
 const copiar=elemento('button','Copiar','discreto');copiar.type='button';
 copiar.addEventListener('click',async()=>{
  try {await navigator.clipboard.writeText(url);mensagem(rotulo+' copiado.');}
  catch {campo.select();mensagem('Selecione e copie o link.');}
 });
 p.append(rotulo+': ',campo,copiar);
 return p;
}

$('form-cliente').addEventListener('submit',async e=>{
 e.preventDefault();
 try {
  const slug=$('c-slug').value.trim().toLowerCase();
  await api('/api/tenant-criar',{body:{
   senhaMaster,
   nome:$('c-nome').value.trim(),slug,
   logoUrl:$('c-logo').value.trim()||null,cor:$('c-cor').value.trim()||null,
   senhaGerente:$('c-senha-gerente').value,senhaAdmin:$('c-senha-admin').value,
  }});
  const base=baseUrl();
  $('links-resultado').replaceChildren(
   linkCopiavel('Link do jogo',base+'?c='+encodeURIComponent(slug)),
   linkCopiavel('Link do telão',base+'telao.html?c='+encodeURIComponent(slug)),
   linkCopiavel('Criar rodada (gerente)',base+'gerente.html?c='+encodeURIComponent(slug)),
   linkCopiavel('Admin do cliente',base+'admin.html?c='+encodeURIComponent(slug)),
  );
  $('resultado').hidden=false;mensagem('Cliente "'+$('c-nome').value.trim()+'" criado.');
  $('form-cliente').reset();
 } catch(err) {mensagem(err.message||'Não foi possível criar o cliente.');}
});
