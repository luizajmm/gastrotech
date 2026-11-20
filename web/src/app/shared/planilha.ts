// gera um .csv que abre direto no Excel em português:
// ponto e vírgula separando as colunas, vírgula nos decimais e BOM pra acentuação não quebrar
export type Celula = string | number | null | undefined;

export function numeroPlanilha(valor: number): string {
  return valor.toFixed(2).replace('.', ',');
}

export function baixarPlanilha(nomeArquivo: string, linhas: Celula[][]): void {
  const texto = linhas.map((linha) => linha.map(celula).join(';')).join('\r\n');
  const arquivo = new Blob(['﻿' + texto], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(arquivo);
  const link = document.createElement('a');
  link.href = url;
  link.download = nomeArquivo;
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function celula(valor: Celula): string {
  const texto = valor === null || valor === undefined ? '' : String(valor);
  return /[;"\r\n]/.test(texto) ? `"${texto.replace(/"/g, '""')}"` : texto;
}
