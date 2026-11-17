import { Pipe, PipeTransform } from '@angular/core';

const formato = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });

@Pipe({ name: 'dinheiro' })
export class DinheiroPipe implements PipeTransform {
  transform(valor: number | null | undefined): string {
    return formato.format(valor ?? 0);
  }
}
