import { HttpClient } from '@angular/common/http';
import { computed, inject, Injectable, Injector, signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { CONFIG } from '../config';
import { Usuario } from './modelos';
import { PainelApiDemo } from './painel-api-demo';

const CHAVE_TOKEN = 'gastrotech-token';
const CHAVE_USUARIO = 'gastrotech-usuario';

function ler(chave: string): string | null {
  try {
    return localStorage.getItem(chave);
  } catch {
    return null;
  }
}

function gravar(chave: string, valor: string | null): void {
  try {
    if (valor === null) localStorage.removeItem(chave);
    else localStorage.setItem(chave, valor);
  } catch {
    // navegador sem armazenamento: a sessão dura só até recarregar a página
  }
}

@Injectable({ providedIn: 'root' })
export class Sessao {
  private http = inject(HttpClient);
  private injector = inject(Injector);

  // na demonstração a sessão não fica salva: ao recarregar, pede login de novo
  readonly token = signal<string | null>(CONFIG.modoDemonstracao ? null : ler(CHAVE_TOKEN));
  readonly usuario = signal<Usuario | null>(CONFIG.modoDemonstracao ? null : JSON.parse(ler(CHAVE_USUARIO) ?? 'null'));
  readonly logado = computed(() => !!this.token());

  pode(permissao: string): boolean {
    return !!this.usuario()?.permissoes.includes(permissao);
  }

  async entrar(email: string, senha: string): Promise<void> {
    if (CONFIG.modoDemonstracao) {
      await new Promise((r) => setTimeout(r, 400));
      const usuario = this.injector.get(PainelApiDemo).autenticar(email, senha);
      this.token.set('demonstracao');
      this.usuario.set(usuario);
      return;
    }

    const resposta = await firstValueFrom(
      this.http.post<{ token: string; usuario: Usuario }>(`${CONFIG.apiUrl}/login`, { email, senha }),
    );
    this.token.set(resposta.token);
    this.usuario.set(resposta.usuario);
    gravar(CHAVE_TOKEN, resposta.token);
    gravar(CHAVE_USUARIO, JSON.stringify(resposta.usuario));
  }

  async sair(): Promise<void> {
    if (this.token() && !CONFIG.modoDemonstracao) {
      await firstValueFrom(this.http.post(`${CONFIG.apiUrl}/logout`, {})).catch(() => null);
    }
    this.limpar();
  }

  limpar(): void {
    this.token.set(null);
    this.usuario.set(null);
    gravar(CHAVE_TOKEN, null);
    gravar(CHAVE_USUARIO, null);
  }
}
