import { Routes } from '@angular/router';
import { exigeArea, exigeLogin } from './core/autenticacao';

export const routes: Routes = [
  { path: '', pathMatch: 'full', title: 'GastroTech', loadComponent: () => import('./inicio/inicio').then((m) => m.Inicio) },
  {
    path: 'totem',
    loadComponent: () => import('./totem/totem-shell').then((m) => m.TotemShell),
    children: [
      { path: '', title: 'Bem-vindo', loadComponent: () => import('./totem/boas-vindas').then((m) => m.BoasVindas) },
      { path: 'cardapio', title: 'Cardápio', loadComponent: () => import('./totem/cardapio').then((m) => m.CardapioPagina) },
      { path: 'pedido', title: 'Seu pedido', loadComponent: () => import('./totem/revisao').then((m) => m.Revisao) },
      { path: 'pagamento', title: 'Pagamento', loadComponent: () => import('./totem/pagamento').then((m) => m.Pagamento) },
      { path: 'acompanhar', title: 'Acompanhar pedido', loadComponent: () => import('./totem/acompanhar').then((m) => m.Acompanhar) },
      { path: 'pedido/:codigo', title: 'Pedido confirmado', loadComponent: () => import('./totem/confirmacao').then((m) => m.Confirmacao) },
    ],
  },
  { path: 'entrar', title: 'Entrar', loadComponent: () => import('./entrar/entrar').then((m) => m.Entrar) },
  {
    path: 'cozinha',
    title: 'Cozinha',
    canActivate: [exigeLogin, exigeArea('pedidos')],
    loadComponent: () => import('./cozinha/cozinha').then((m) => m.Cozinha),
  },
  {
    path: 'retirada',
    title: 'Retirada',
    canActivate: [exigeLogin, exigeArea('pedidos')],
    loadComponent: () => import('./retirada/retirada').then((m) => m.Retirada),
  },
  {
    path: 'painel',
    canActivate: [exigeLogin],
    loadComponent: () => import('./painel/painel-shell').then((m) => m.PainelShell),
    children: [
      { path: '', title: 'Visão geral', loadComponent: () => import('./painel/visao-geral').then((m) => m.VisaoGeral) },
      { path: 'pedidos', title: 'Pedidos', canActivate: [exigeArea('pedidos')], loadComponent: () => import('./painel/pedidos').then((m) => m.PedidosPagina) },
      { path: 'cardapio', title: 'Cardápio', canActivate: [exigeArea('cardapio')], loadComponent: () => import('./painel/cardapio-admin').then((m) => m.CardapioAdmin) },
      { path: 'cupons', title: 'Promoções', canActivate: [exigeArea('cardapio')], loadComponent: () => import('./painel/cupons').then((m) => m.Cupons) },
      { path: 'financeiro', title: 'Financeiro', canActivate: [exigeArea('caixa')], loadComponent: () => import('./painel/financeiro').then((m) => m.Financeiro) },
      {
        path: 'equipe',
        title: 'Equipe',
        canActivate: [exigeArea('usuarios')],
        loadComponent: () => import('./painel/equipe').then((m) => m.Equipe),
      },
      { path: 'configuracoes', title: 'Configurações', canActivate: [exigeArea('configuracoes')], loadComponent: () => import('./painel/configuracoes').then((m) => m.Configuracoes) },
    ],
  },
  { path: '**', redirectTo: '' },
];
