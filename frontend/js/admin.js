import { api, elemento } from './cliente.js';
import { API, CLIENTE } from './config.js';
const $=id=>document.getElementById(id);
let senha='',estado=null;
const mensagem=m=>{$('mensagem').textContent=m;};
const chamar=(acao,extra={})=>api('/api/admin',{body:{senha,acao,...extra}});
const input=(tipo,placeholder)=>{const i=elemento('input');i.type=tipo;i.placeholder=placeholder;return i;};
function botao(texto,fn,classe='discreto') {
 const b=elemento('button',texto,classe);b.type='button';
 b.addEventListener('click',async()=>{try{await fn();}catch(err){mensagem(err.message||'Não foi possível concluir.');}});
 return b;
}

// ---- Rodadas ----------------------------------------------------------
function desenharRodadas() {
 $('lista-rodadas').replaceChildren(...estado.rodadas.map(r=>{
  const card=elemento('article',undefined,'painel');
  card.append(elemento('h3',r.nome));
  card.append(elemento('p',`${r.status} · ${r.travada?'travada (aguardando início)':'liberada'} · ${r.segundos}s/pergunta · pódio ${r.podio}${r.bloco?' · bloco "'+r.bloco+'"':''}`));
  const barra=elemento('div',undefined,'barra');
  if(r.status==='aberta') {
   if(r.travada)barra.append(botao('Começar para todos',()=>acaoRodada('rodada-comecar-todos',r.id),'principal'));
   barra.append(botao('Resetar',async()=>{if(confirm('Resetar '+r.nome+'? Apaga os pontos e trava de novo.'))await acaoRodada('rodada-resetar',r.id);}));
   barra.append(botao('Encerrar',async()=>{if(confirm('Encerrar '+r.nome+'? Não dá pra reabrir.'))await acaoRodada('rodada-encerrar',r.id);}));
  }
  barra.append(botao('Ver ranking',()=>verRanking(r.id)));
  const csv=elemento('a','Exportar CSV','discreto');
  csv.href=API+'/admin/csv?c='+encodeURIComponent(CLIENTE)+'&rodadaId='+encodeURIComponent(r.id)+'&senha='+encodeURIComponent(senha);
  csv.target='_blank';csv.rel='noopener';
  barra.append(csv);
  card.append(barra);
  return card;
 }));
 if(!estado.rodadas.length)$('lista-rodadas').replaceChildren(elemento('p','Nenhuma rodada ainda.'));
}
async function acaoRodada(acao,id) {await chamar(acao,{id});await atualizar();}

function desenharBlocos() {
 const sel=$('r-bloco'),atual=sel.value;
 sel.replaceChildren(elemento('option','Todas (sem bloco)'));sel.firstChild.value='';
 for(const b of estado.blocos){const o=elemento('option',b);o.value=b;sel.append(o);}
 sel.value=atual;
 // Sugestão (datalist) nos campos de texto "Bloco" do cadastro/edição de pergunta —
 // evita digitar o nome de um bloco já existente com erro de digitação.
 $('blocos-existentes').replaceChildren(...estado.blocos.map(b=>{const o=elemento('option');o.value=b;return o;}));
}
function desenharLojas() {
 const sel=$('r-loja'),atual=sel.value;
 sel.replaceChildren(elemento('option','Nenhuma (qualquer loja)'));sel.firstChild.value='';
 for(const l of estado.lojas){const o=elemento('option',l.rotulo);o.value=l.filial;sel.append(o);}
 sel.value=atual;
}
$('r-podio').addEventListener('change',()=>{$('r-campo-loja').hidden=$('r-podio').value!=='loja';});
$('form-rodada').addEventListener('submit',async e=>{
 e.preventDefault();
 try {
  await chamar('rodada-criar',{
   nome:$('r-nome').value,segundos:Number($('r-segundos').value),podio:$('r-podio').value,
   loja:$('r-loja').value||null,bloco:$('r-bloco').value||null,publico:$('r-publico').value||null,
  });
  $('form-rodada').reset();$('r-segundos').value='30';mensagem('Rodada criada — ela só começa quando você clicar em "Começar para todos".');
  await atualizar();
 } catch(err) {mensagem(err.message);}
});

// ---- Ranking e detalhe por jogador (clicar no nome) --------------------
function abrirDetalhe(titulo,conteudo) {$('detalhe-titulo').textContent=titulo;$('detalhe-conteudo').replaceChildren(conteudo);if(!$('detalhe').open)$('detalhe').showModal();}
$('fechar-detalhe').addEventListener('click',()=>$('detalhe').close());
async function verRanking(rodadaId) {
 const r=await api('/api/ranking?'+new URLSearchParams({rodadaId}));
 const div=elemento('div');
 for(const l of r.linhas) {
  const b=botao(`${l.posicao}º ${l.nome} — ${l.pontos} pts`,()=>verDetalheJogador(l.id,l.nome));
  const p=elemento('p');p.append(b);div.append(p);
 }
 if(!r.linhas.length)div.append(elemento('p','Ninguém jogou ainda.'));
 abrirDetalhe('Ranking',div);
}
async function verDetalheJogador(jogadorId,nome) {
 const d=await chamar('jogador-detalhe',{jogadorId});
 const div=elemento('div');
 div.append(elemento('p',`${d.jogador.pontos} pts · ${d.jogador.acertos} acertos · ${d.jogador.erros} erros`));
 for(const l of d.respostas) {
  const p=elemento('p');
  p.append(elemento('strong',`${l.numero}. ${l.tema?l.tema+' — ':''}`));
  p.append(elemento('span',l.respondeu
   ?(l.acertou?`acertou: "${l.opcaoEscolhida}"`:`errou: "${l.opcaoEscolhida}" (certa: "${l.opcaoCorreta}")`)
   :`não respondeu (certa: "${l.opcaoCorreta}")`));
  div.append(p);
 }
 abrirDetalhe(nome,div);
}

// ---- Perguntas: cadastro em lote + ativas/ocultas/excluídas ------------
function novaLinhaPergunta() {
 const linha=elemento('div',undefined,'painel');
 const texto=input('text','Pergunta');
 const tipo=input('text','Tipo (ex.: Venda)');
 const tema=input('text','Tema (ex.: Aborde)');
 const opcoes=[0,1,2,3].map(i=>input('text','Opção '+String.fromCharCode(65+i)));
 const correta=elemento('select');
 for(let i=0;i<4;i++){const o=elemento('option','Correta: '+String.fromCharCode(65+i));o.value=String(i);correta.append(o);}
 const segundos=input('number','Segundos (padrão da rodada)');segundos.min='5';segundos.max='3600';
 const bloco=input('text','Bloco (opcional, ex.: Bloco 1)');bloco.setAttribute('list','blocos-existentes');
 const imagem=input('text','URL da imagem (opcional)');
 const remover=botao('Remover esta pergunta',()=>linha.remove());
 linha.append(texto,tipo,tema,...opcoes,correta,segundos,bloco,imagem,remover);
 linha._coletar=()=>({
  texto:texto.value.trim(),tipo:tipo.value.trim()||null,tema:tema.value.trim()||null,
  opcoes:opcoes.map(o=>o.value.trim()),correta:Number(correta.value),
  segundos:segundos.value?Number(segundos.value):null,bloco:bloco.value.trim()||null,imagem:imagem.value.trim()||null,
 });
 return linha;
}
$('add-pergunta').addEventListener('click',()=>{$('lote-perguntas').append(novaLinhaPergunta());});
$('salvar-lote').addEventListener('click',async()=>{
 const linhas=[...$('lote-perguntas').children];
 if(!linhas.length)return mensagem('Clique em "+ Nova pergunta" pelo menos uma vez.');
 const perguntas=linhas.map(l=>l._coletar());
 for(const p of perguntas)if(!p.texto || p.opcoes.some(o=>!o))return mensagem('Preencha o texto e as 4 opções de cada pergunta.');
 try {
  const r=await chamar('perguntas-criar',{perguntas});
  mensagem(r.criadas+' pergunta(s) cadastrada(s).');
  $('lote-perguntas').replaceChildren();
  await atualizar();
 } catch(err) {mensagem(err.message);}
});
function linhaPerguntaExistente(p,acoes) {
 const div=elemento('article',undefined,'painel');
 div.append(elemento('p',p.texto));
 if(p.bloco)div.append(elemento('p','Bloco: '+p.bloco));
 const barra=elemento('div',undefined,'barra');
 for(const [texto,fn] of acoes)barra.append(botao(texto,fn));
 div.append(barra);
 return div;
}
async function acaoPergunta(acao,id) {await chamar(acao,{id});await atualizar();}
function editarPergunta(p) {
 const div=elemento('div');
 const texto=input('text','Pergunta');texto.value=p.texto;
 const tipo=input('text','Tipo');tipo.value=p.tipo||'';
 const tema=input('text','Tema');tema.value=p.tema||'';
 const opcoes=p.opcoes.map((o,i)=>{const inp=input('text','Opção '+String.fromCharCode(65+i));inp.value=o;return inp;});
 const correta=elemento('select');
 for(let i=0;i<4;i++){const o=elemento('option','Correta: '+String.fromCharCode(65+i));o.value=String(i);correta.append(o);}
 correta.value=String(p.correta);
 const segundos=input('number','Segundos (padrão da rodada)');segundos.min='5';segundos.max='3600';if(p.segundos)segundos.value=p.segundos;
 const bloco=input('text','Bloco (opcional)');bloco.value=p.bloco||'';bloco.setAttribute('list','blocos-existentes');
 const imagem=input('text','URL da imagem (opcional)');imagem.value=p.imagem||'';
 const salvar=botao('Salvar alterações',async()=>{
  const opcoesVal=opcoes.map(o=>o.value.trim());
  if(!texto.value.trim() || opcoesVal.some(o=>!o)) {mensagem('Preencha o texto e as 4 opções.');return;}
  await chamar('pergunta-editar',{
   id:p.id,texto:texto.value.trim(),tipo:tipo.value.trim()||null,tema:tema.value.trim()||null,
   opcoes:opcoesVal,correta:Number(correta.value),segundos:segundos.value?Number(segundos.value):null,
   bloco:bloco.value.trim()||null,imagem:imagem.value.trim()||null,
  });
  $('detalhe').close();mensagem('Pergunta atualizada.');
  await atualizar();
 },'principal');
 div.append(texto,tipo,tema,...opcoes,correta,segundos,bloco,imagem,salvar);
 abrirDetalhe('Editar pergunta',div);
}
function desenharPerguntas() {
 $('lista-ativas').replaceChildren(...estado.perguntasAtivas.map(p=>linhaPerguntaExistente(p,[
  ['Editar',()=>editarPergunta(p)],
  ['Ocultar',()=>acaoPergunta('pergunta-ocultar',p.id)],['Excluir',()=>acaoPergunta('pergunta-excluir',p.id)],
 ])));
 $('lista-ocultas').replaceChildren(...estado.perguntasOcultas.map(p=>linhaPerguntaExistente(p,[
  ['Editar',()=>editarPergunta(p)],
  ['Reativar',()=>acaoPergunta('pergunta-reativar',p.id)],['Excluir',()=>acaoPergunta('pergunta-excluir',p.id)],
 ])));
 $('lista-excluidas').replaceChildren(...estado.perguntasExcluidas.map(p=>linhaPerguntaExistente(p,[
  ['Restaurar',()=>acaoPergunta('pergunta-restaurar',p.id)],
 ])));
 if(!estado.perguntasAtivas.length)$('lista-ativas').append(elemento('p','Nenhuma.'));
 if(!estado.perguntasOcultas.length)$('lista-ocultas').append(elemento('p','Nenhuma.'));
 if(!estado.perguntasExcluidas.length)$('lista-excluidas').append(elemento('p','Nenhuma.'));
}

// ---- Abas, login e atualização geral ------------------------------------
for(const btn of $('abas').children) {
 btn.addEventListener('click',()=>{
  for(const b of $('abas').children)b.classList.toggle('aba-ativa',b===btn);
  $('aba-rodadas').hidden=btn.dataset.aba!=='rodadas';
  $('aba-perguntas').hidden=btn.dataset.aba!=='perguntas';
 });
}
async function atualizar() {
 estado=await chamar('estado');
 desenharRodadas();desenharPerguntas();desenharBlocos();desenharLojas();
}
$('login').addEventListener('submit',async e=>{
 e.preventDefault();senha=$('senha-login').value;
 try {
  await atualizar();
  $('login').hidden=true;$('aplicacao').hidden=false;mensagem('');
 } catch(err) {senha='';mensagem(err.message||'Senha incorreta.');}
});
