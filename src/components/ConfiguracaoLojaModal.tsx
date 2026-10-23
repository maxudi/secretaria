import React, { useEffect, useRef, useState } from 'react';
import {
  DEFAULT_LOJA_ALPHA_OMEGA_ID,
  uploadLogoLojaSupabase,
} from '../lib/supabase';
import {
  ConfiguracaoLoja,
  DEFAULT_CONFIGURACAO_LOJA,
} from '../types/balaustre';

interface ConfiguracaoLojaModalProps {
  isOpen: boolean;
  onClose: () => void;
  configAtual: ConfiguracaoLoja;
  lojaId?: string;
  onSaveConfig: (novaConfig: ConfiguracaoLoja) => void;
}

export const ConfiguracaoLojaModal: React.FC<ConfiguracaoLojaModalProps> = ({
  isOpen,
  onClose,
  configAtual,
  lojaId = DEFAULT_LOJA_ALPHA_OMEGA_ID,
  onSaveConfig,
}) => {
  const [draft, setDraft] = useState<ConfiguracaoLoja>(configAtual);
  const [erroUpload, setErroUpload] = useState<string | null>(null);
  const [msgUpload, setMsgUpload] = useState<string | null>(null);
  const [enviandoLogo, setEnviandoLogo] = useState<boolean>(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (isOpen) {
      setDraft(configAtual);
      setErroUpload(null);
      setMsgUpload(null);
    }
  }, [isOpen, configAtual]);

  if (!isOpen) return null;

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    setErroUpload(null);
    setMsgUpload(null);
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setErroUpload(
        'Por favor, selecione um arquivo de imagem válido (PNG, JPG, SVG, WEBP).'
      );
      return;
    }

    if (file.size > 4 * 1024 * 1024) {
      setErroUpload('A imagem deve ter no máximo 4MB.');
      return;
    }

    setEnviandoLogo(true);
    try {
      const res = await uploadLogoLojaSupabase(file, lojaId);
      setDraft((prev) => ({ ...prev, logoUrl: res.url }));
      setMsgUpload(res.mensagem);
    } catch (err: any) {
      setErroUpload(err?.message || 'Erro ao fazer upload da logomarca.');
    } finally {
      setEnviandoLogo(false);
    }
  };

  const handleRestaurarPadrao = () => {
    setDraft(DEFAULT_CONFIGURACAO_LOJA);
    setErroUpload(null);
  };

  const handleSalvar = (e: React.FormEvent) => {
    e.preventDefault();
    onSaveConfig(draft);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/75 p-4 backdrop-blur-sm overflow-y-auto">
      <div className="relative my-8 w-full max-w-2xl rounded-2xl border-2 border-[#D4AF37] bg-[#F9F8F6] dark:bg-slate-900 text-slate-900 dark:text-slate-100 shadow-2xl overflow-hidden animate-fadeIn">
        {/* Cabeçalho do Modal */}
        <div className="flex items-center justify-between bg-[#0B192C] px-6 py-4 text-white border-b-2 border-[#D4AF37]">
          <div className="flex items-center gap-2.5">
            <span className="text-xl text-[#D4AF37]">⚙</span>
            <div>
              <h3 className="text-base font-bold tracking-wide text-white">
                Configurações da Loja & Cabeçalho Oficial
              </h3>
              <p className="text-xs text-slate-300">
                Personalize a logomarca, nome, número e endereço para montar o
                timbre dos Balaústres
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="rounded-md p-1.5 text-slate-300 hover:bg-slate-800 hover:text-white"
          >
            ✕
          </button>
        </div>

        <form onSubmit={handleSalvar} className="p-6 space-y-6 max-h-[80vh] overflow-y-auto">
          {/* PRÉVIA EM TEMPO REAL DO CABEÇALHO NO FORMATO OFICIAL DA ATA */}
          <div className="rounded-xl border-2 border-[#D4AF37] bg-white p-5 text-black shadow">
            <span className="block text-[10px] uppercase tracking-widest text-[#1a365d] mb-3 font-bold">
              Pré-visualização Oficial do Cabeçalho (Logo à esquerda + 5 linhas em negrito):
            </span>
            <div className="flex flex-col sm:flex-row items-center gap-5">
              {draft.logoUrl ? (
                <img
                  src={draft.logoUrl}
                  alt="Logo da Loja"
                  className="h-24 w-24 object-contain shrink-0"
                />
              ) : (
                <div className="flex h-24 w-24 shrink-0 items-center justify-center rounded-full border-2 border-dashed border-[#1a365d]/50 bg-slate-50 text-2xl font-bold text-[#1a365d]">
                  LOGO
                </div>
              )}

              <div className="flex-1 text-center font-sans font-bold text-black leading-snug space-y-0.5">
                <p className="text-base sm:text-lg font-extrabold uppercase">
                  {(draft.nomeLoja || 'LOJA MAÇÔNICA ALPHA E ÔMEGA').toUpperCase()}
                  {draft.numeroLoja ? ` N° ${draft.numeroLoja}` : ''}
                </p>
                {draft.potenciaJurisdicao && (
                  <p className="text-xs sm:text-sm font-bold">
                    {draft.potenciaJurisdicao}
                  </p>
                )}
                {(draft.reunioesDiaHora || draft.ritoPotencia) && (
                  <p className="text-xs sm:text-sm font-bold">
                    {[
                      draft.reunioesDiaHora,
                      draft.ritoPotencia?.toUpperCase(),
                    ]
                      .filter(Boolean)
                      .join(' – ')}
                  </p>
                )}
                <p className="text-xs sm:text-sm font-bold">
                  {[draft.enderecoTemplo, draft.orienteCidadeUf]
                    .filter(Boolean)
                    .join(' – ')}
                </p>
                {draft.emailLoja && (
                  <p className="text-xs sm:text-sm font-bold">
                    {draft.emailLoja.toLowerCase().startsWith('e-mail:')
                      ? draft.emailLoja
                      : `e-mail: ${draft.emailLoja}`}
                  </p>
                )}
                {draft.gestao && (
                  <p className="text-xs sm:text-sm font-bold">
                    {draft.gestao.toLowerCase().startsWith('gestão') ||
                    draft.gestao.toLowerCase().startsWith('gestao')
                      ? draft.gestao
                      : `Gestão: ${draft.gestao}`}
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* UPLOAD DE LOGOMARCA NO BUCKET `logomarcas` */}
          <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-4 space-y-3">
            <label className="block text-xs font-bold uppercase tracking-wider text-[#1a365d] dark:text-[#D4AF37]">
              1. Logomarca da Loja (Salva no Bucket &quot;logomarcas&quot; do Supabase)
            </label>

            <div className="flex flex-wrap items-center gap-3">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleFileUpload}
                className="hidden"
              />
              <button
                type="button"
                disabled={enviandoLogo}
                onClick={() => fileInputRef.current?.click()}
                className="rounded-lg bg-[#1a365d] px-4 py-2 text-xs font-bold text-white hover:bg-[#0B192C] transition-colors disabled:opacity-50"
              >
                {enviandoLogo
                  ? '⏳ Enviando para bucket logomarcas...'
                  : '☁️ Enviar Logomarca para o Bucket (PNG/JPG/SVG)'}
              </button>

              {draft.logoUrl && (
                <button
                  type="button"
                  onClick={() => setDraft((prev) => ({ ...prev, logoUrl: '' }))}
                  className="rounded-lg border border-red-300 bg-red-50 px-3 py-2 text-xs font-semibold text-red-700 hover:bg-red-100"
                >
                  ✕ Remover Logo
                </button>
              )}
            </div>

            <div>
              <label className="block text-xs text-slate-500 dark:text-slate-400 mb-1">
                URL da logomarca no bucket `logomarcas` (ou link externo):
              </label>
              <input
                type="text"
                value={draft.logoUrl || ''}
                onChange={(e) =>
                  setDraft((prev) => ({ ...prev, logoUrl: e.target.value }))
                }
                placeholder="https://...supabase.co/storage/v1/object/public/logomarcas/..."
                className="w-full rounded-lg border border-slate-300 dark:border-slate-600 bg-[#F9F8F6] dark:bg-slate-900 px-3 py-2 text-xs"
              />
            </div>

            {msgUpload && (
              <p className="text-xs font-semibold text-emerald-700 dark:text-emerald-400">
                ✓ {msgUpload}
              </p>
            )}

            {erroUpload && (
              <p className="text-xs font-semibold text-red-600">{erroUpload}</p>
            )}
          </div>

          {/* DADOS INSTITUCIONAIS DA LOJA (5 LINHAS DO CABEÇALHO) */}
          <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-4 space-y-4">
            <label className="block text-xs font-bold uppercase tracking-wider text-[#1a365d] dark:text-[#D4AF37]">
              2. Linhas do Cabeçalho Oficial da Loja
            </label>

            <div className="grid grid-cols-1 sm:grid-cols-12 gap-4">
              {/* Linha 1: Nome da Loja e Número */}
              <div className="sm:col-span-9">
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  1ª Linha: Nome da Loja (sai em MAIÚSCULA e negrito)
                </label>
                <input
                  type="text"
                  required
                  value={draft.nomeLoja}
                  onChange={(e) =>
                    setDraft((prev) => ({ ...prev, nomeLoja: e.target.value }))
                  }
                  placeholder="Ex: LOJA MAÇÔNICA ALPHA E ÔMEGA"
                  className="w-full rounded-lg border border-slate-300 dark:border-slate-600 bg-[#F9F8F6] dark:bg-slate-900 px-3 py-2 text-sm font-bold uppercase"
                />
              </div>

              <div className="sm:col-span-3">
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Número (N°)
                </label>
                <input
                  type="text"
                  required
                  value={draft.numeroLoja}
                  onChange={(e) =>
                    setDraft((prev) => ({
                      ...prev,
                      numeroLoja: e.target.value,
                    }))
                  }
                  placeholder="Ex: 3402"
                  className="w-full rounded-lg border border-slate-300 dark:border-slate-600 bg-[#F9F8F6] dark:bg-slate-900 px-3 py-2 text-sm font-bold"
                />
              </div>

              {/* Linha 2: Potência / Jurisdição */}
              <div className="sm:col-span-12">
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  2ª Linha: Potência / Jurisdição
                </label>
                <input
                  type="text"
                  value={draft.potenciaJurisdicao || ''}
                  onChange={(e) =>
                    setDraft((prev) => ({
                      ...prev,
                      potenciaJurisdicao: e.target.value,
                    }))
                  }
                  placeholder="Ex: Jurisdicionada ao GRANDE ORIENTE DO BRASIL"
                  className="w-full rounded-lg border border-slate-300 dark:border-slate-600 bg-[#F9F8F6] dark:bg-slate-900 px-3 py-2 text-sm font-semibold"
                />
              </div>

              {/* Linha 3: Dia/Hora das Reuniões + Rito */}
              <div className="sm:col-span-7">
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  3ª Linha: Dia e Horário das Reuniões
                </label>
                <input
                  type="text"
                  value={draft.reunioesDiaHora || ''}
                  onChange={(e) =>
                    setDraft((prev) => ({
                      ...prev,
                      reunioesDiaHora: e.target.value,
                    }))
                  }
                  placeholder="Ex: Reuniões às terças-feiras – 20:00 horas"
                  className="w-full rounded-lg border border-slate-300 dark:border-slate-600 bg-[#F9F8F6] dark:bg-slate-900 px-3 py-2 text-sm"
                />
              </div>

              <div className="sm:col-span-5">
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Rito (na 3ª Linha)
                </label>
                <input
                  type="text"
                  value={draft.ritoPotencia || ''}
                  onChange={(e) =>
                    setDraft((prev) => ({
                      ...prev,
                      ritoPotencia: e.target.value,
                    }))
                  }
                  placeholder="Ex: RITO BRASILEIRO"
                  className="w-full rounded-lg border border-slate-300 dark:border-slate-600 bg-[#F9F8F6] dark:bg-slate-900 px-3 py-2 text-sm uppercase font-semibold"
                />
              </div>

              {/* Linha 4: Endereço e Cidade-UF */}
              <div className="sm:col-span-7">
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  4ª Linha: Endereço do Templo
                </label>
                <input
                  type="text"
                  required
                  value={draft.enderecoTemplo}
                  onChange={(e) =>
                    setDraft((prev) => ({
                      ...prev,
                      enderecoTemplo: e.target.value,
                    }))
                  }
                  placeholder="Ex: Rua do Fazendeiro, 680"
                  className="w-full rounded-lg border border-slate-300 dark:border-slate-600 bg-[#F9F8F6] dark:bg-slate-900 px-3 py-2 text-sm"
                />
              </div>

              <div className="sm:col-span-5">
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Cidade - UF (Oriente)
                </label>
                <input
                  type="text"
                  required
                  value={draft.orienteCidadeUf}
                  onChange={(e) =>
                    setDraft((prev) => ({
                      ...prev,
                      orienteCidadeUf: e.target.value,
                    }))
                  }
                  placeholder="Ex: Uberlândia-MG"
                  className="w-full rounded-lg border border-slate-300 dark:border-slate-600 bg-[#F9F8F6] dark:bg-slate-900 px-3 py-2 text-sm"
                />
              </div>

              {/* Linha 5: E-mail */}
              <div className="sm:col-span-7">
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  5ª Linha: E-mail da Loja
                </label>
                <input
                  type="text"
                  value={draft.emailLoja || ''}
                  onChange={(e) =>
                    setDraft((prev) => ({
                      ...prev,
                      emailLoja: e.target.value,
                    }))
                  }
                  placeholder="Ex: alphaeomega@cmt.org.br"
                  className="w-full rounded-lg border border-slate-300 dark:border-slate-600 bg-[#F9F8F6] dark:bg-slate-900 px-3 py-2 text-sm"
                />
              </div>

              {/* Linha 6: Gestão da Diretoria */}
              <div className="sm:col-span-5">
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  6ª Linha: Gestão da Diretoria
                </label>
                <input
                  type="text"
                  value={draft.gestao || ''}
                  onChange={(e) =>
                    setDraft((prev) => ({
                      ...prev,
                      gestao: e.target.value,
                    }))
                  }
                  placeholder="Ex: 2025-2027"
                  className="w-full rounded-lg border border-slate-300 dark:border-slate-600 bg-[#F9F8F6] dark:bg-slate-900 px-3 py-2 text-sm font-bold"
                />
              </div>
            </div>
          </div>

          {/* Botões de Ação */}
          <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-slate-200 dark:border-slate-700">
            <button
              type="button"
              onClick={handleRestaurarPadrao}
              className="rounded-lg border border-slate-300 px-3.5 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100"
            >
              ↺ Restaurar Padrão (Alpha e Ômega Nº 3402)
            </button>

            <div className="flex items-center gap-2.5">
              <button
                type="button"
                onClick={onClose}
                className="rounded-lg border border-slate-300 px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="rounded-lg bg-[#D4AF37] px-5 py-2.5 text-xs font-extrabold text-[#0B192C] shadow hover:bg-[#c5a02e] transition-colors"
              >
                ✓ Salvar e Aplicar ao Cabeçalho
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
