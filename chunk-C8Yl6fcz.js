import{t as m$1}from"./chunk-CYwvz1b0.js";import{S as H}from"./chunk-yeC_gSU0.js";var m=class o{comanda(t){let e=t.consumo?.valor===`viagem`?`<p class="faixa">PARA LEVAR</p>`:`<p class="faixa leve">COMER AQUI</p>`,a=t.status_pagamento.valor===`pendente`?`<p class="aviso">PAGAR NO CAIXA: ${m$1(t.total)}</p>`:``;this.imprimir(`Comanda ${t.codigo}`,`
      <p class="centro pequeno">COMANDA DA COZINHA</p>
      <h1>${n(t.codigo)}</h1>
      <p class="centro">${n(t.nome_cliente||`Cliente`)}</p>
      ${e}
      <p class="centro pequeno">${d(t.criado_em)} \xB7 previsto ${t.tempo_estimado_min} min</p>
      <hr />
      ${t.itens.map(l).join(``)}
      <hr />
      ${a}
    `)}comprovante(t,e){let a=t.desconto?`<p class="linha"><span>Subtotal</span><span>${m$1(t.subtotal)}</span></p>
         <p class="linha"><span>Desconto${t.cupom?` (${n(t.cupom)})`:``}</span><span>- ${m$1(t.desconto)}</span></p>`:``;this.imprimir(`Pedido ${t.codigo}`,`
      <p class="centro forte">${n(e)}</p>
      <p class="centro pequeno">${h(t.criado_em)}</p>
      <hr />
      <p class="centro pequeno">SEU C\xD3DIGO</p>
      <h1>${n(t.codigo)}</h1>
      <p class="centro">${n(t.nome_cliente||`Cliente`)} \xB7 ${n(t.consumo?.rotulo??``)}</p>
      <hr />
      ${t.itens.map(u).join(``)}
      <hr />
      ${a}
      <p class="linha forte"><span>TOTAL</span><span>${m$1(t.total)}</span></p>
      <p class="linha"><span>Pagamento</span><span>${n(t.forma_pagamento.rotulo)} (${n(t.status_pagamento.rotulo.toLowerCase())})</span></p>
      ${t.status_pagamento.valor===`pendente`?`<p class="aviso">Pague no caixa antes de retirar</p>`:``}
      <hr />
      <p class="centro pequeno">Acompanhe e avalie seu pedido em</p>
      <p class="centro pequeno forte quebra">${n(g(t.codigo))}</p>
      <p class="centro pequeno">N\xE3o \xE9 documento fiscal.</p>
    `)}imprimir(t,e){let a=document.createElement(`iframe`);a.setAttribute(`aria-hidden`,`true`),a.style.cssText=`position:fixed;right:0;bottom:0;width:0;height:0;border:0;visibility:hidden`,document.body.appendChild(a);let i=a.contentDocument;i.open(),i.write(`<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><title>${n(t)}</title><style>${$}</style></head><body>${e}</body></html>`),i.close();let r=a.contentWindow,c=()=>setTimeout(()=>a.remove(),500);r.addEventListener(`afterprint`,c,{once:!0}),setTimeout(()=>{r.focus(),r.print(),setTimeout(c,6e4)},50)}static ɵfac=function(e){return new(e||o)};static ɵprov=H({token:o,factory:o.ɵfac,providedIn:`root`})};function l(o){let t=o.personalizacoes.map(a=>`<li>${n(a.opcao)}</li>`).join(``),e=o.observacao?`<li class="obs">OBS: ${n(o.observacao)}</li>`:``;return`<div class="item"><p class="forte grande">${o.quantidade}\xD7 ${n(o.nome)}</p>${t||e?`<ul>${t}${e}</ul>`:``}</div>`}function u(o){let t=o.personalizacoes.map(e=>`${n(e.grupo)}: ${n(e.opcao)}`).join(`, `);return`<div class="item"><p class="linha"><span>${o.quantidade}\xD7 ${n(o.nome)}</span><span>${m$1(o.total)}</span></p>${t?`<p class="pequeno">${t}</p>`:``}</div>`}function g(o){return`${location.origin}${location.pathname}#/totem/pedido/${o}`}function d(o){return new Date(o).toLocaleTimeString(`pt-BR`,{hour:`2-digit`,minute:`2-digit`})}function h(o){return new Date(o).toLocaleString(`pt-BR`,{dateStyle:`short`,timeStyle:`short`})}function n(o){return o.replace(/[&<>"']/g,t=>({"&":`&amp;`,"<":`&lt;`,">":`&gt;`,'"':`&quot;`,"'":`&#39;`})[t])}var $=`
  @page { size: 80mm auto; margin: 4mm; }
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { width: 72mm; font: 12px/1.35 'Courier New', monospace; color: #000; }
  h1 { margin: 2mm 0; font-size: 34px; text-align: center; letter-spacing: 2px; }
  hr { margin: 2.5mm 0; border: 0; border-top: 1px dashed #000; }
  ul { margin: 0.5mm 0 0 4mm; list-style: '- '; }
  .centro { text-align: center; }
  .forte { font-weight: 700; }
  .grande { font-size: 15px; }
  .pequeno { font-size: 10.5px; }
  .item { margin-bottom: 2mm; }
  .obs { font-weight: 700; }
  .quebra { word-break: break-all; }
  .linha { display: flex; justify-content: space-between; gap: 3mm; }
  .linha span:last-child { white-space: nowrap; }
  .faixa { margin: 1.5mm 0; padding: 1mm; background: #000; color: #fff; text-align: center; font-weight: 700; font-size: 15px; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  .faixa.leve { background: none; color: #000; border: 1px solid #000; }
  .aviso { margin-top: 1.5mm; padding: 1mm; border: 2px solid #000; text-align: center; font-weight: 700; }
`;export{m as t};