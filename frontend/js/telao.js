import { api, desenharPodio, listasPorCargo, conectarRanking, aplicarMarca } from './cliente.js';
const $=id=>document.getElementById(id);
const rodadaLink=new URLSearchParams(globalThis.location?.search ?? '').get('r');
let lojas=new Map(),dados=null,config=null,ocupado=false,listaEm=0;
const atualizarLista=listasPorCargo($('listas'),$('ranking'),()=>({rodadaId:dados?.rodadaId,lojas}));
function renderizar() {
 if(!dados)return;
 desenharPodio($('podio'),dados.top,lojas);
 $('contagem').textContent=dados.liberada===false?dados.jogando+' a postos · aguardando o instrutor':dados.jogando+' jogando · '+dados.terminadas+' terminaram';
 $('situacao').textContent=config?.rodada?.id===dados.rodadaId?config.rodada.nome:dados.rodadaId?'Última rodada encerrada':'Aguarde o instrutor abrir o jogo';
}
const assinarRanking=conectarRanking({
 aoReceber:d=>{dados=d;$('status').textContent='';renderizar();if(performance.now()-listaEm>5000){listaEm=performance.now();void atualizarLista();}},
 aoStatus:s=>{$('status').textContent=s==='SUBSCRIBED'?'':'Reconectando…';}
});
async function configurar(){
 if(ocupado)return;ocupado=true;
 try {config=await api('/api/config'+(rodadaLink?'?r='+encodeURIComponent(rodadaLink):''));lojas=new Map(config.lojas.map(l=>[l.filial,l.rotulo]));aplicarMarca(config);assinarRanking(rodadaLink || config.rodada?.id || null);renderizar();}
 catch {$('status').textContent='Reconectando…';}
 finally {ocupado=false;}
}
setInterval(configurar,5000);void configurar();
