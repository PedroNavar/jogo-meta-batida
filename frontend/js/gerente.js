import { api, elemento } from './cliente.js';
const $=id=>document.getElementById(id);
let config=null,senha='',rodada=null,espera=null,ocupado=false;
const status=m=>{$('status').textContent=m;};
function verCampos() {
 const papel=$('papel').value,nomes=config?.nomes?.[papel] ?? [],lista=nomes.length>0,campo=$('nome-lista');
 if(lista && campo.dataset.papel!==papel) {
  const opcoes=[['','Escolha seu nome'],...nomes.map(n=>[n,n]),['outro','Outro: meu nome não está na lista']];
  campo.replaceChildren(...opcoes.map(([valor,texto])=>{const op=elemento('option',texto);op.value=valor;return op;}));campo.dataset.papel=papel;
 }
 const aberto=!lista || campo.value==='outro';
 $('campo-nome-lista').hidden=!lista;campo.required=lista;$('campo-nome').hidden=!aberto;$('nome').required=aberto;
 $('campo-loja').hidden=papel!=='Gerente';$('loja').required=papel==='Gerente';
 $('campo-publico').hidden=papel!=='Regional';$('publico').required=papel==='Regional';
}
function mostrar() {
 $('criar').hidden=true;$('criada').hidden=false;$('nome-rodada').textContent=rodada.nome;
 const fim=rodada.status==='encerrada';$('contagem').textContent=rodada.aPostos.length+' a postos · '+rodada.emJogo+' jogando · '+rodada.terminaram+' terminaram'+(fim?' · rodada encerrada':rodada.travada?' · jogo travado':'');$('encerrar').hidden=fim;$('resetar').hidden=fim;$('comecar-todos').hidden=fim || !rodada.travada;$('a-postos').replaceChildren(...rodada.aPostos.map(p=>elemento('li',p.nome+' · '+p.cargo)));if(fim)clearInterval(espera);
 $('link-jogo').value=location.origin+'/?r='+rodada.id;$('link-telao').value=location.origin+'/telao.html?r='+rodada.id;$('abrir-telao').href=$('link-telao').value;$('whatsapp').href='https://wa.me/?text='+encodeURIComponent('Jogo da Meta Batida: '+$('link-jogo').value);
}
async function acompanhar() {
 try {rodada=await api('/api/gerente',{body:{senha,acao:'ver',id:rodada.id}});mostrar();} catch {status('Reconectando…');}
}
$('papel').addEventListener('change',verCampos);$('nome-lista').addEventListener('change',verCampos);
$('formulario').addEventListener('submit',async e=>{
 e.preventDefault();if(ocupado)return;ocupado=true;status('');senha=$('senha').value;
 try {
  const responsavel=$('nome-lista').required && $('nome-lista').value!=='outro'?$('nome-lista').value:$('nome').value;
  rodada=await api('/api/gerente',{body:{senha,acao:'criar',papel:$('papel').value,responsavel,loja:$('loja').value,publico:$('publico').value}});
  mostrar();espera=setInterval(acompanhar,3000);
 } catch(erro) {status(erro.message);} finally {ocupado=false;}
});
$('copiar').addEventListener('click',async()=>{
 try {await navigator.clipboard.writeText($('link-jogo').value);status('Link copiado.');}
 catch {$('link-jogo').select();status('Selecione e copie o link.');}
});
async function controlar(acao,pergunta) {
 if(pergunta && !confirm(pergunta))return;
 try {rodada=await api('/api/gerente',{body:{senha,acao,id:rodada.id}});mostrar();status('');} catch(erro) {status(erro.message);}
}
$('comecar-todos').addEventListener('click',()=>controlar('comecar'));
$('resetar').addEventListener('click',()=>controlar('resetar','Resetar o jogo? Os pontos desta rodada serão apagados, todos voltam para a espera e o jogo fica travado até você começar de novo.'));
$('encerrar').addEventListener('click',async()=>{
 if(!confirm('Encerrar esta rodada? Ninguém mais poderá jogar nela e ela não poderá ser reaberta.'))return;
 try {await api('/api/gerente',{body:{senha,acao:'encerrar',id:rodada.id}});clearInterval(espera);$('criada').hidden=true;$('criar').hidden=false;status('Rodada encerrada. O resultado fica guardado no admin.');}
 catch(erro) {status(erro.message);}
});
async function iniciar() {
 try {
  config=await api('/api/config');
  for(const l of config.lojas){const op=elemento('option',l.rotulo);op.value=l.filial;$('loja').append(op);}
 } catch {status('Não foi possível carregar. Atualize a página.');}
}
void iniciar();
