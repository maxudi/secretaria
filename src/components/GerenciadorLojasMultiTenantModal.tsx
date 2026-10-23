import React, { useEffect, useRef, useState } from 'react';
import {
  alternarStatusLojaTenantSupabase,
  criarOuAtualizarLojaComAdminSupabase,
  listarTodasLojasTenantSupabase,
  uploadLogoLojaSupabase,
} from '../lib/supabase';
import {
  aplicarMascaraCim,
  aplicarMascaraTelefoneCelular,
  LojaTenant,
} from '../types/balaustre';

interface GerenciadorLojasMultiTenantModalProps {
  isOpen: boolean;
  onClose: () => void;
  lojaIdAtiva: string;
  onSelecionarLojaAtiva: (loja: LojaTenant) => void;
}

export const GerenciadorLojasMultiTenantModal: React.FC<
  GerenciadorLojasMultiTenantModalProps
> = ({ isOpen, onClose, lojaIdAtiva, onSelecionarLojaAtiva }) => {
  const [aba, setAba] = useState<'lista' | 'nova_loja'>('lista');
  const [lojas, setLojas] = useState<LojaTenant[]>([]);
  const [carregando, setCarregando] = useState(false);
  const [salvando, setSalvando] = useState(false);
  const [enviandoLogo, setEnviandoLogo] = useState(false);
  const [feedback, setFeedback] = useState<{
    tipo: 'sucesso' | 'erro';
    texto: string;
  } | null>(null);

  // Estado do formulário de Nova Loja / Edição de Loja + Admin CIM
  const [idEditando, setIdEditando] = useState<string | undefined>(undefined);
  const [nomeLoja, setNomeLoja] = useState('');
  const [numeroLoja, setNumeroLoja] = useState('');
  const [potenciaJurisdicao, setPotenciaJurisdicao] = useState(
    'Jurisdicionada ao GRANDE ORIENTE DO BRASIL'
  );
  const [reunioesDiaHora, setReunioesDiaHora] = useState(
    'Reuniões às terças-feiras – 20:00 horas'
  );
  const [ritoPotencia, setRitoPotencia] = useState('RITO BRASILEIRO');
  const [enderecoTemplo, setEnderecoTemplo] = useState('');
  const [orienteCidadeUf, setOrienteCidadeUf] = useState('Uberlândia-MG');
  const [emailLoja, setEmailLoja] = useState('');
  const [gestao, setGestao] = useState('2025-2027');
  const [logoUrl, setLogoUrl] = useState('');

  // Dados do Usuário Admin da Loja
  const [adminCim, setAdminCim] = useState('');
  const [adminNome, setAdminNome] = useState('');
  const [adminPapel, setAdminPapel] = useState<'secretario' | 'veneravel'>(
    'secretario'
  );
  const [adminTelefone, setAdminTelefone] = useState('');
  const [adminSenha, setAdminSenha] = useState('');

  const fileInputNovaLojaRef = useRef<HTMLInputElement | null>(null);

  const recarregarLojas = async () => {
    setCarregando(true);
    try {
      const lista = await listarTodasLojasTenantSupabase();
      setLojas(lista);
    } finally {
      setCarregando(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      setFeedback(null);
      recarregarLojas();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const limparFormulario = () => {
    setIdEditando(undefined);
    setNomeLoja('');
    setNumeroLoja('');
    setPotenciaJurisdicao('Jurisdicionada ao GRANDE ORIENTE DO BRASIL');
    setReunioesDiaHora('Reuniões às terças-feiras – 20:00 horas');
    setRitoPotencia('RITO BRASILEIRO');
    setEnderecoTemplo('');
    setOrienteCidadeUf('Uberlândia-MG');
    setEmailLoja('');
    setGestao('2025-2027');
    setLogoUrl('');
    setAdminCim('');
    setAdminNome('');
    setAdminPapel('secretario');
    setAdminTelefone('');
    setAdminSenha('');
  };

  const iniciarEdicaoLoja = (loja: LojaTenant) => {
    setIdEditando(loja.id);
    setNomeLoja(loja.nomeLoja);
    setNumeroLoja(loja.numeroLoja);
    setPotenciaJurisdicao(loja.potenciaJurisdicao);
    setReunioesDiaHora(loja.reunioesDiaHora);
    setRitoPotencia(loja.ritoPotencia);
    setEnderecoTemplo(loja.enderecoTemplo);
    setOrienteCidadeUf(loja.orienteCidadeUf);
    setEmailLoja(loja.emailLoja);
    setGestao(loja.gestao);
    setLogoUrl(loja.logoUrl || '');
    setAdminCim('');
    setAdminNome('');
    setAdminSenha('');
    setAdminTelefone('');
    setAba('nova_loja');
  };

  const handleUploadLogoFormulario = async (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setEnviandoLogo(true);
    setFeedback(null);
    try {
      const tempId =
        idEditando ||
        `loja-${numeroLoja || Date.now()}`;
      const res = await uploadLogoLojaSupabase(file, tempId);
      setLogoUrl(res.url);
      setFeedback({
        tipo: 'sucesso',
        texto: res.mensagem,
      });
    } catch (err: any) {
      setFeedback({
        tipo: 'erro',
        texto: err?.message || 'Erro ao enviar logomarca para o bucket.',
      });
    } finally {
      setEnviandoLogo(false);
    }
  };

  const handleSalvarLojaEAdmin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nomeLoja.trim() || !numeroLoja.trim()) {
      setFeedback({
        tipo: 'erro',
        texto: 'Informe o Nome e o Número da Loja.',
      });
      return;
    }

    if (!idEditando && (!adminCim.trim() || !adminSenha.trim())) {
      setFeedback({
        tipo: 'erro',
        texto:
          'Ao cadastrar uma nova Loja, informe o Número CIM e a Senha Inicial do Usuário Admin da Loja.',
      });
      return;
    }

    setSalvando(true);
    setFeedback(null);

    try {
      const res = await criarOuAtualizarLojaComAdminSupabase({
        id: idEditando,
        nomeLoja,
        numeroLoja,
        potenciaJurisdicao,
        reunioesDiaHora,
        ritoPotencia,
        enderecoTemplo: enderecoTemplo || 'Templo Maçônico',
        orienteCidadeUf: orienteCidadeUf || 'Uberlândia-MG',
        emailLoja,
        gestao,
        logoUrl,
        adminCim,
        adminNome,
        adminPapel,
        adminSenha,
        adminTelefone,
      });

      setFeedback({
        tipo: res.sucesso ? 'sucesso' : 'erro',
        texto: res.mensagem,
      });

      if (res.sucesso) {
        await recarregarLojas();
        limparFormulario();
        setAba('lista');
      }
    } finally {
      setSalvando(false);
    }
  };

  const handleAlternarStatusLoja = async (loja: LojaTenant) => {
    const novoStatus = !loja.ativa;
    await alternarStatusLojaTenantSupabase(loja.id, novoStatus);
    await recarregarLojas();
    setFeedback({
      tipo: 'sucesso',
      texto: `Loja ${loja.nomeLoja} Nº ${loja.numeroLoja} ${
        novoStatus ? 'ATIVADA' : 'SUSPENSA'
      } com sucesso!`,
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 p-4 backdrop-blur-sm overflow-y-auto print:hidden">
      <div className="relative my-8 w-full max-w-5xl rounded-2xl border-2 border-[#D4AF37] bg-[#F9F8F6] dark:bg-slate-900 text-slate-900 dark:text-slate-100 shadow-2xl overflow-hidden animate-fadeIn">
        {/* Cabeçalho */}
        <div className="flex items-center justify-between bg-[#0B192C] px-6 py-4 text-white border-b-2 border-[#D4AF37]">
          <div className="flex items-center gap-3">
            <span className="text-2xl text-[#D4AF37]">🏛️</span>
            <div>
              <h3 className="text-base sm:text-lg font-extrabold tracking-wide text-white uppercase">
                Painel Super Usuário — Gestão Multi-Tenant de Lojas
              </h3>
              <p className="text-xs text-amber-200/90">
                Cadastre Lojas clientes, envie logomarcas para o bucket{' '}
                <code className="rounded bg-white/10 px-1 py-0.5 text-[#D4AF37]">
                  logomarcas
                </code>{' '}
                e gere o Usuário Admin (CIM/Senha) de cada Loja
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

        {/* Abas */}
        <div className="flex border-b border-slate-200 dark:border-slate-800 bg-slate-100 dark:bg-slate-950 px-6 pt-3 gap-2">
          <button
            type="button"
            onClick={() => setAba('lista')}
            className={`rounded-t-xl px-4 py-2.5 text-xs sm:text-sm font-bold transition-colors border-b-2 ${
              aba === 'lista'
                ? 'border-[#D4AF37] bg-[#F9F8F6] dark:bg-slate-900 text-[#1a365d] dark:text-[#D4AF37]'
                : 'border-transparent text-slate-600 dark:text-slate-400 hover:text-slate-900'
            }`}
          >
            🏛️ Lojas Cadastradas ({lojas.length})
          </button>
          <button
            type="button"
            onClick={() => {
              limparFormulario();
              setAba('nova_loja');
            }}
            className={`rounded-t-xl px-4 py-2.5 text-xs sm:text-sm font-bold transition-colors border-b-2 ${
              aba === 'nova_loja'
                ? 'border-[#D4AF37] bg-[#F9F8F6] dark:bg-slate-900 text-[#1a365d] dark:text-[#D4AF37]'
                : 'border-transparent text-slate-600 dark:text-slate-400 hover:text-slate-900'
            }`}
          >
            {idEditando
              ? '✏️ Editando Loja / Novo Admin CIM'
              : '＋ Cadastrar Nova Loja + Gerar Admin CIM'}
          </button>
        </div>

        <div className="p-6 max-h-[75vh] overflow-y-auto space-y-5">
          {feedback && (
            <div
              className={`rounded-xl border px-4 py-3 text-xs font-bold flex items-center justify-between ${
                feedback.tipo === 'sucesso'
                  ? 'border-emerald-300 bg-emerald-50 text-emerald-900 dark:bg-emerald-950/50 dark:text-emerald-200'
                  : 'border-red-300 bg-red-50 text-red-800 dark:bg-red-950/50 dark:text-red-200'
              }`}
            >
              <span>{feedback.texto}</span>
              <button
                type="button"
                onClick={() => setFeedback(null)}
                className="ml-3 text-xs underline"
              >
                Fechar
              </button>
            </div>
          )}

          {aba === 'lista' ? (
            <div className="space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-xs text-slate-600 dark:text-slate-300">
                  Selecione qualquer Loja abaixo para <strong>Alternar o Ambiente Ativo</strong>, editar a Logomarca no bucket{' '}
                  <code>logomarcas</code> ou gerar um novo Usuário Admin (CIM).
                </p>
                <button
                  type="button"
                  onClick={() => {
                    limparFormulario();
                    setAba('nova_loja');
                  }}
                  className="rounded-xl bg-[#1a365d] px-4 py-2 text-xs font-extrabold text-[#D4AF37] border border-[#D4AF37] hover:bg-[#0B192C]"
                >
                  ＋ Nova Loja Cliente
                </button>
              </div>

              {carregando ? (
                <div className="py-12 text-center text-sm font-semibold text-slate-500">
                  Carregando Lojas cadastradas no Supabase...
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-3">
                  {lojas.map((loja) => {
                    const ehAtivaNoMomento = loja.id === lojaIdAtiva;
                    return (
                      <div
                        key={loja.id}
                        className={`flex flex-col sm:flex-row sm:items-center justify-between gap-4 rounded-xl border p-4 transition-all ${
                          ehAtivaNoMomento
                            ? 'border-2 border-[#D4AF37] bg-amber-50/40 dark:bg-slate-800'
                            : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/80'
                        }`}
                      >
                        <div className="flex items-center gap-4">
                          <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full border-2 border-[#D4AF37] bg-white overflow-hidden shadow-sm">
                            {loja.logoUrl ? (
                              <img
                                src={loja.logoUrl}
                                alt={loja.nomeLoja}
                                className="h-full w-full object-contain p-1"
                              />
                            ) : (
                              <span className="font-serif text-xl font-bold text-[#1a365d]">
                                G∴
                              </span>
                            )}
                          </div>

                          <div className="space-y-1">
                            <div className="flex flex-wrap items-center gap-2">
                              <h4 className="text-sm sm:text-base font-extrabold text-[#0B192C] dark:text-white uppercase">
                                {loja.nomeLoja} Nº {loja.numeroLoja}
                              </h4>
                              {ehAtivaNoMomento && (
                                <span className="rounded-full bg-[#0B192C] px-2.5 py-0.5 text-[10px] font-extrabold text-[#D4AF37] border border-[#D4AF37]">
                                  ★ LOJA SELECIONADA AGORA
                                </span>
                              )}
                              <span
                                className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
                                  loja.ativa
                                    ? 'bg-emerald-500/15 text-emerald-800 border border-emerald-300'
                                    : 'bg-red-500/15 text-red-700 border border-red-300'
                                }`}
                              >
                                {loja.ativa ? '● Ativa' : '○ Suspensa'}
                              </span>
                            </div>

                            <p className="text-xs text-slate-600 dark:text-slate-300">
                              {loja.orienteCidadeUf} • {loja.ritoPotencia} •{' '}
                              {loja.potenciaJurisdicao}
                            </p>
                            <p className="text-[11px] text-slate-500">
                              Endereço: {loja.enderecoTemplo} • Gestão:{' '}
                              <strong>{loja.gestao}</strong>
                            </p>
                          </div>
                        </div>

                        <div className="flex flex-wrap items-center gap-2">
                          <button
                            type="button"
                            onClick={() => {
                              onSelecionarLojaAtiva(loja);
                              onClose();
                            }}
                            className="rounded-lg bg-[#1a365d] px-3.5 py-2 text-xs font-extrabold text-[#D4AF37] border border-[#D4AF37]/60 hover:bg-[#0B192C] transition-colors"
                          >
                            🔄 Operar nesta Loja
                          </button>

                          <button
                            type="button"
                            onClick={() => iniciarEdicaoLoja(loja)}
                            className="rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 px-3 py-2 text-xs font-bold text-slate-700 dark:text-slate-200 hover:bg-slate-100"
                          >
                            ✏️ Editar / Novo Admin CIM
                          </button>

                          <button
                            type="button"
                            onClick={() => handleAlternarStatusLoja(loja)}
                            className={`rounded-lg border px-3 py-2 text-xs font-bold ${
                              loja.ativa
                                ? 'border-amber-300 bg-amber-50 text-amber-800 hover:bg-amber-100'
                                : 'border-emerald-300 bg-emerald-50 text-emerald-800 hover:bg-emerald-100'
                            }`}
                          >
                            {loja.ativa ? 'Suspender' : 'Ativar'}
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          ) : (
            <form onSubmit={handleSalvarLojaEAdmin} className="space-y-6">
              {/* Bloco 1: Dados da Loja e Logomarca no Bucket `logomarcas` */}
              <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-5 space-y-4">
                <h4 className="text-xs font-extrabold uppercase tracking-wider text-[#1a365d] dark:text-[#D4AF37]">
                  1. Dados Institucionais da Loja & Logomarca (Bucket `logomarcas`)
                </h4>

                {/* Upload da Logomarca */}
                <div className="flex flex-col sm:flex-row items-center gap-4 rounded-xl border border-dashed border-[#D4AF37] bg-amber-50/30 dark:bg-slate-900/50 p-4">
                  <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-full border-2 border-[#D4AF37] bg-white overflow-hidden">
                    {logoUrl ? (
                      <img
                        src={logoUrl}
                        alt="Prévia Logo"
                        className="h-full w-full object-contain p-1"
                      />
                    ) : (
                      <span className="text-xs font-bold text-slate-400">
                        SEM LOGO
                      </span>
                    )}
                  </div>

                  <div className="flex-1 space-y-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <input
                        ref={fileInputNovaLojaRef}
                        type="file"
                        accept="image/*"
                        onChange={handleUploadLogoFormulario}
                        className="hidden"
                      />
                      <button
                        type="button"
                        disabled={enviandoLogo}
                        onClick={() => fileInputNovaLojaRef.current?.click()}
                        className="rounded-lg bg-[#1a365d] px-3.5 py-2 text-xs font-bold text-white hover:bg-[#0B192C] disabled:opacity-50"
                      >
                        {enviandoLogo
                          ? '⏳ Enviando para bucket logomarcas...'
                          : '☁️ Enviar Logomarca para Bucket "logomarcas"'}
                      </button>
                      {logoUrl && (
                        <button
                          type="button"
                          onClick={() => setLogoUrl('')}
                          className="rounded-lg border border-red-200 bg-red-50 px-2.5 py-1.5 text-xs font-semibold text-red-600"
                        >
                          Remover
                        </button>
                      )}
                    </div>
                    <input
                      type="text"
                      value={logoUrl}
                      onChange={(e) => setLogoUrl(e.target.value)}
                      placeholder="URL pública gerada no bucket logomarcas (ou cole um link externo)..."
                      className="w-full rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 px-3 py-1.5 text-xs"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
                  <div className="sm:col-span-9">
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                      Nome da Loja *
                    </label>
                    <input
                      type="text"
                      required
                      value={nomeLoja}
                      onChange={(e) => setNomeLoja(e.target.value)}
                      placeholder="Ex: LOJA MAÇÔNICA FRATERNIDADE TRIANGULINA"
                      className="w-full rounded-lg border border-slate-300 dark:border-slate-600 bg-[#F9F8F6] dark:bg-slate-900 px-3 py-2 text-xs font-bold uppercase"
                    />
                  </div>

                  <div className="sm:col-span-3">
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                      Número da Loja *
                    </label>
                    <input
                      type="text"
                      required
                      value={numeroLoja}
                      onChange={(e) => setNumeroLoja(e.target.value)}
                      placeholder="Ex: 4120"
                      className="w-full rounded-lg border border-slate-300 dark:border-slate-600 bg-[#F9F8F6] dark:bg-slate-900 px-3 py-2 text-xs font-bold"
                    />
                  </div>

                  <div className="sm:col-span-7">
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                      Potência / Jurisdição
                    </label>
                    <input
                      type="text"
                      value={potenciaJurisdicao}
                      onChange={(e) => setPotenciaJurisdicao(e.target.value)}
                      placeholder="Jurisdicionada ao GRANDE ORIENTE DO BRASIL"
                      className="w-full rounded-lg border border-slate-300 dark:border-slate-600 bg-[#F9F8F6] dark:bg-slate-900 px-3 py-2 text-xs"
                    />
                  </div>

                  <div className="sm:col-span-5">
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                      Rito Praticado
                    </label>
                    <input
                      type="text"
                      value={ritoPotencia}
                      onChange={(e) => setRitoPotencia(e.target.value)}
                      placeholder="Ex: RITO ESCOCÊS ANTIGO E ACEITO"
                      className="w-full rounded-lg border border-slate-300 dark:border-slate-600 bg-[#F9F8F6] dark:bg-slate-900 px-3 py-2 text-xs font-bold uppercase"
                    />
                  </div>

                  <div className="sm:col-span-6">
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                      Dia e Horário das Sessões
                    </label>
                    <input
                      type="text"
                      value={reunioesDiaHora}
                      onChange={(e) => setReunioesDiaHora(e.target.value)}
                      placeholder="Reuniões às terças-feiras – 20:00 horas"
                      className="w-full rounded-lg border border-slate-300 dark:border-slate-600 bg-[#F9F8F6] dark:bg-slate-900 px-3 py-2 text-xs"
                    />
                  </div>

                  <div className="sm:col-span-6">
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                      Endereço do Templo *
                    </label>
                    <input
                      type="text"
                      required
                      value={enderecoTemplo}
                      onChange={(e) => setEnderecoTemplo(e.target.value)}
                      placeholder="Rua..., nº..."
                      className="w-full rounded-lg border border-slate-300 dark:border-slate-600 bg-[#F9F8F6] dark:bg-slate-900 px-3 py-2 text-xs"
                    />
                  </div>

                  <div className="sm:col-span-4">
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                      Oriente (Cidade-UF) *
                    </label>
                    <input
                      type="text"
                      required
                      value={orienteCidadeUf}
                      onChange={(e) => setOrienteCidadeUf(e.target.value)}
                      placeholder="Ex: Uberlândia-MG"
                      className="w-full rounded-lg border border-slate-300 dark:border-slate-600 bg-[#F9F8F6] dark:bg-slate-900 px-3 py-2 text-xs font-bold"
                    />
                  </div>

                  <div className="sm:col-span-5">
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                      E-mail da Secretaria da Loja
                    </label>
                    <input
                      type="text"
                      value={emailLoja}
                      onChange={(e) => setEmailLoja(e.target.value)}
                      placeholder="secretaria@loja.org.br"
                      className="w-full rounded-lg border border-slate-300 dark:border-slate-600 bg-[#F9F8F6] dark:bg-slate-900 px-3 py-2 text-xs"
                    />
                  </div>

                  <div className="sm:col-span-3">
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                      Período de Gestão
                    </label>
                    <input
                      type="text"
                      value={gestao}
                      onChange={(e) => setGestao(e.target.value)}
                      placeholder="2025-2027"
                      className="w-full rounded-lg border border-slate-300 dark:border-slate-600 bg-[#F9F8F6] dark:bg-slate-900 px-3 py-2 text-xs font-bold"
                    />
                  </div>
                </div>
              </div>

              {/* Bloco 2: Gerar Usuário Admin da Loja (Secretário / Venerável) */}
              <div className="rounded-xl border-2 border-[#D4AF37] bg-amber-50/40 dark:bg-slate-800 p-5 space-y-4">
                <div>
                  <h4 className="text-xs font-extrabold uppercase tracking-wider text-[#0B192C] dark:text-[#D4AF37]">
                    2. Gerar Usuário Admin da Loja (Acesso por CIM e Senha)
                  </h4>
                  <p className="text-xs text-slate-600 dark:text-slate-300 mt-0.5">
                    Este Irmão será criado automaticamente no Quadro da Loja com
                    permissão total de Administrador da Loja (pode cadastrar os
                    demais Obreiros, Diretoria e lavrar Balaústres).
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
                  <div className="sm:col-span-4">
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                      Nome do Irmão Admin {idEditando ? '(Opcional)' : '*'}
                    </label>
                    <input
                      type="text"
                      required={!idEditando}
                      value={adminNome}
                      onChange={(e) => setAdminNome(e.target.value)}
                      placeholder="Ex: JOÃO CARLOS DA SILVA"
                      className="w-full rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 px-3 py-2 text-xs font-bold uppercase"
                    />
                  </div>

                  <div className="sm:col-span-2">
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                      Nº CIM (Login) {idEditando ? '' : '*'}
                    </label>
                    <input
                      type="text"
                      inputMode="numeric"
                      maxLength={6}
                      required={!idEditando}
                      value={adminCim}
                      onChange={(e) =>
                        setAdminCim(aplicarMascaraCim(e.target.value))
                      }
                      placeholder="99999"
                      className="w-full rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 px-3 py-2 text-xs font-mono font-bold tracking-wider"
                    />
                  </div>

                  <div className="sm:col-span-2">
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                      Celular / WhatsApp
                    </label>
                    <input
                      type="tel"
                      inputMode="numeric"
                      maxLength={15}
                      value={adminTelefone}
                      onChange={(e) =>
                        setAdminTelefone(
                          aplicarMascaraTelefoneCelular(e.target.value)
                        )
                      }
                      placeholder="(34) 99999-9999"
                      className="w-full rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 px-3 py-2 text-xs font-mono"
                    />
                  </div>

                  <div className="sm:col-span-2">
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                      Cargo Admin
                    </label>
                    <select
                      value={adminPapel}
                      onChange={(e) =>
                        setAdminPapel(
                          e.target.value as 'secretario' | 'veneravel'
                        )
                      }
                      className="w-full rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 px-2.5 py-2 text-xs font-bold"
                    >
                      <option value="secretario">Secretário (Admin)</option>
                      <option value="veneravel">Venerável (Admin)</option>
                    </select>
                  </div>

                  <div className="sm:col-span-2">
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                      Senha Inicial {idEditando ? '' : '*'}
                    </label>
                    <input
                      type="text"
                      required={!idEditando}
                      value={adminSenha}
                      onChange={(e) => setAdminSenha(e.target.value)}
                      placeholder="Senha..."
                      className="w-full rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 px-3 py-2 text-xs font-bold"
                    />
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    limparFormulario();
                    setAba('lista');
                  }}
                  className="rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-xs font-bold text-slate-700 hover:bg-slate-100"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={salvando}
                  className="rounded-xl bg-[#D4AF37] px-6 py-2.5 text-xs font-extrabold uppercase tracking-wider text-[#0B192C] shadow-md hover:bg-[#c5a02e] disabled:opacity-50"
                >
                  {salvando
                    ? 'Gravando no Supabase...'
                    : idEditando
                      ? '✓ Salvar Alterações da Loja / Admin'
                      : '✓ Cadastrar Loja & Gerar Usuário Admin'}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};

