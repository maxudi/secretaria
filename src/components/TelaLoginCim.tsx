import React, { useState } from 'react';
import { autenticarPorCim } from '../lib/supabase';
import {
  aplicarMascaraCim,
  carregarConfiguracaoLojaSalva,
  SessaoUsuarioLogado,
} from '../types/balaustre';

interface TelaLoginCimProps {
  onLoginSuccess: (sessao: SessaoUsuarioLogado) => void;
}

export const TelaLoginCim: React.FC<TelaLoginCimProps> = ({
  onLoginSuccess,
}) => {
  const configLoja = carregarConfiguracaoLojaSalva();
  const [cim, setCim] = useState('');
  const [senha, setSenha] = useState('');
  const [mostrarSenha, setMostrarSenha] = useState(false);
  const [carregando, setCarregando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  const linkWhatsappSolicitarAcesso = `https://wa.me/5534988012700?text=${encodeURIComponent(
    `Olá Ir∴ Secretário! Gostaria de solicitar liberação de acesso ao Sistema de Secretaria (${configLoja.nomeLoja} Nº ${configLoja.numeroLoja})${cim.trim() ? ` para o meu CIM ${cim.trim()}` : ''}.`
  )}`;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErro(null);
    setCarregando(true);

    try {
      const resultado = await autenticarPorCim(cim, senha);
      if (!resultado.sucesso || !resultado.sessao) {
        setErro(resultado.mensagem);
      } else {
        onLoginSuccess(resultado.sessao);
      }
    } catch (err: any) {
      setErro(err?.message || 'Erro ao validar credenciais CIM.');
    } finally {
      setCarregando(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col justify-between bg-gradient-to-br from-[#07111e] via-[#0B192C] to-[#1a365d] text-white px-4 py-8">
      {/* Topo discreto */}
      <div className="text-center">
        <p className="text-[11px] font-bold tracking-[0.28em] text-[#D4AF37]/90 uppercase">
          {configLoja.invocacao || 'À GL∴ DO SUPR∴ ARQ∴ DO UNIV∴'}
        </p>
      </div>

      {/* Card Central de Autenticação por CIM */}
      <div className="mx-auto w-full max-w-md">
        <div className="rounded-2xl border-2 border-[#D4AF37]/80 bg-[#0B192C]/95 shadow-2xl overflow-hidden backdrop-blur-md">
          {/* Cabeçalho do Card */}
          <div className="border-b border-[#D4AF37]/40 bg-gradient-to-b from-[#132847] to-[#0B192C] px-6 py-6 text-center">
            <div className="mx-auto mb-3 flex h-20 w-20 items-center justify-center rounded-full border-2 border-[#D4AF37] bg-[#07111e] shadow-inner overflow-hidden">
              {configLoja.logoUrl ? (
                <img
                  src={configLoja.logoUrl}
                  alt="Brasão da Loja"
                  className="h-full w-full object-contain p-1"
                />
              ) : (
                <span className="font-serif text-3xl font-bold text-[#D4AF37]">
                  G∴
                </span>
              )}
            </div>

            <h1 className="font-serif text-lg font-extrabold tracking-wide text-white uppercase">
              {configLoja.nomeLoja} Nº {configLoja.numeroLoja}
            </h1>
            <p className="mt-1 text-xs font-medium text-amber-200/90">
              {configLoja.potenciaJurisdicao}
            </p>
            <p className="mt-0.5 text-[11px] text-slate-300">
              {configLoja.orienteCidadeUf} • Gestão{' '}
              {configLoja.gestao || '2025-2027'}
            </p>
          </div>

          {/* Formulário de Login por CIM */}
          <form onSubmit={handleSubmit} className="p-6 space-y-5">
            <div className="text-center">
              <span className="inline-flex items-center gap-1.5 rounded-full border border-[#D4AF37]/40 bg-[#D4AF37]/10 px-3 py-1 text-[11px] font-bold uppercase tracking-wider text-[#D4AF37]">
                🔒 Acesso Restrito à Secretaria
              </span>
              <p className="mt-2 text-xs text-slate-300">
                Identifique-se com o seu <strong>Número CIM</strong> e senha
                para acessar a lavratura e o histórico de Balaústres.
              </p>
            </div>

            {erro && (
              <div className="rounded-xl border border-red-400/60 bg-red-950/70 px-4 py-3 text-xs font-semibold text-red-200 flex items-start gap-2">
                <span className="text-base leading-none">⚠️</span>
                <span>{erro}</span>
              </div>
            )}

            <div>
              <label
                htmlFor="input-cim"
                className="block text-xs font-bold uppercase tracking-wider text-amber-200 mb-1.5"
              >
                Número do CIM (Cadastro de Identificação Maçônica)
              </label>
              <div className="relative">
                <input
                  id="input-cim"
                  type="text"
                  inputMode="numeric"
                  maxLength={6}
                  autoFocus
                  required
                  value={cim}
                  onChange={(e) => setCim(aplicarMascaraCim(e.target.value))}
                  placeholder="Digite seu CIM"
                  className="w-full rounded-xl border border-[#D4AF37]/60 bg-[#07111e] px-4 py-3 text-base font-mono font-bold tracking-wider text-white placeholder-slate-500 focus:border-[#D4AF37] focus:outline-none focus:ring-2 focus:ring-[#D4AF37]/30"
                />
                <span className="pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2 text-xs font-bold text-[#D4AF37]/70">
                  CIM
                </span>
              </div>
            </div>

            <div>
              <label
                htmlFor="input-senha-cim"
                className="block text-xs font-bold uppercase tracking-wider text-amber-200 mb-1.5"
              >
                Senha de Acesso
              </label>
              <div className="relative">
                <input
                  id="input-senha-cim"
                  type={mostrarSenha ? 'text' : 'password'}
                  required
                  value={senha}
                  onChange={(e) => setSenha(e.target.value)}
                  placeholder="••••••••"
                  className="w-full rounded-xl border border-[#D4AF37]/60 bg-[#07111e] px-4 py-3 pr-16 text-base font-bold text-white placeholder-slate-500 focus:border-[#D4AF37] focus:outline-none focus:ring-2 focus:ring-[#D4AF37]/30"
                />
                <button
                  type="button"
                  onClick={() => setMostrarSenha((v) => !v)}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded-md px-2 py-1 text-[11px] font-semibold text-amber-200/80 hover:bg-white/10 hover:text-white"
                >
                  {mostrarSenha ? 'Ocultar' : 'Mostrar'}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={carregando}
              className="w-full flex items-center justify-center gap-2 rounded-xl bg-[#D4AF37] px-5 py-3.5 text-sm font-extrabold uppercase tracking-wider text-[#0B192C] shadow-lg hover:bg-[#e3be42] disabled:opacity-60 transition-all cursor-pointer"
            >
              <span>🔐</span>
              <span>
                {carregando
                  ? 'Verificando CIM na Chancelaria...'
                  : 'Ingressar no Sistema'}
              </span>
            </button>

            {/* Solicitação de Acesso via WhatsApp após conferência */}
            <div className="pt-3 border-t border-white/10 text-center space-y-1.5">
              <p className="text-[11px] text-slate-400">
                Ainda não possui senha de acesso ou esqueceu sua credencial?
              </p>
              <a
                href={linkWhatsappSolicitarAcesso}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center justify-center gap-2 rounded-xl border border-emerald-500/50 bg-emerald-600/15 px-4 py-2 text-xs font-bold text-emerald-300 hover:bg-emerald-600/25 hover:text-emerald-200 transition-colors"
              >
                <span>💬</span>
                <span>Solicitar acesso à Secretaria via WhatsApp</span>
              </a>
            </div>
          </form>
        </div>
      </div>

      {/* Rodapé */}
      <div className="text-center text-[11px] text-slate-400">
        Sistema Digital de Lavratura Litúrgica de Balaústres •{' '}
        {configLoja.ritoPotencia}
      </div>
    </div>
  );
};

