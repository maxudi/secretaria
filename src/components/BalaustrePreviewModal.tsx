import React, { useEffect, useRef, useState } from 'react';
import {
  BalaustreFormData,
  DEFAULT_CONFIGURACAO_LOJA,
} from '../types/balaustre';
import {
  comporRedacaoItemOrdemDia,
  dataPorExtensoLiturgica,
  ehCargoSuprimido,
  ehRitoBrasileiro,
  formatarAutorFalaComCargoOuLoja,
  formatarListaBalaustresLidos,
  formatarNomeIrmao,
  formatarRotuloCargoComSubstituto,
  formatarTroncoComExtenso,
  gerarTextoLiturgico,
  obterCargosAtivosNaSessao,
  obterDescricaoGrau,
  obterDescricaoTipoSessao,
} from '../utils/liturgyFormatter';

interface BalaustrePreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  data: BalaustreFormData;
  onExportTxt: () => void;
}

export const BalaustrePreviewModal: React.FC<BalaustrePreviewModalProps> = ({
  isOpen,
  onClose,
  data,
  onExportTxt,
}) => {
  const [copiado, setCopiado] = useState(false);
  const [totalPaginasEstimadas, setTotalPaginasEstimadas] = useState(1);
  const folhaRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    const timer = setTimeout(() => {
      if (folhaRef.current) {
        // Altura útil aproximada de uma folha A4 com margens de impressão (~960px)
        const alturaPx = folhaRef.current.scrollHeight;
        const estimativa = Math.max(1, Math.ceil(alturaPx / 960));
        setTotalPaginasEstimadas(estimativa);
      }
    }, 80);
    return () => clearTimeout(timer);
  }, [isOpen, data]);

  if (!isOpen) return null;

  const loja = data.configuracaoLoja || DEFAULT_CONFIGURACAO_LOJA;
  const nomeCompletoLoja = `${loja.nomeLoja}${
    loja.numeroLoja ? ` Nº ${loja.numeroLoja}` : ''
  }`;
  const gestaoLimpa =
    (loja.gestao || DEFAULT_CONFIGURACAO_LOJA.gestao || '2025-2027')
      .replace(/^gest[aã]o\s*:?\s*/i, '')
      .trim() || '2025-2027';
  const identificacaoRodape =
    `Balaústre Nº ${data.numeroBalaustre}-${gestaoLimpa} — ${nomeCompletoLoja}`.replace(
      /"/g,
      "'"
    );
  const textoCompleto = gerarTextoLiturgico(data);

  const copiarTexto = async () => {
    await navigator.clipboard.writeText(textoCompleto);
    setCopiado(true);
    setTimeout(() => setCopiado(false), 2500);
  };

  const c = data.cargos;
  const cargosAtivos = obterCargosAtivosNaSessao(c);
  const ritoBrasileiro = ehRitoBrasileiro(loja.ritoPotencia);
  const possuiMestreCerimonias = !ehCargoSuprimido(
    c.mestreCerimonias?.irmaoSelecionado
  );
  const vm = formatarNomeIrmao(
    c.veneravelMestre.irmaoSelecionado,
    c.veneravelMestre.nomeOutro
  );
  const orador = formatarNomeIrmao(
    c.orador.irmaoSelecionado,
    c.orador.nomeOutro
  );
  const secretario = formatarNomeIrmao(
    c.secretario.irmaoSelecionado,
    c.secretario.nomeOutro
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/75 p-4 backdrop-blur-sm overflow-y-auto print:static print:block print:bg-white print:p-0 print:overflow-visible">
      {/* Regra CSS Dinâmica de Paginação Oficial A4 ("Página X de Y" em cada folha impressa) */}
      <style>{`
        @media print {
          @page {
            size: A4 portrait;
            margin: 12mm 12mm 18mm 12mm;
            @bottom-left {
              content: "${identificacaoRodape}";
              font-family: Georgia, "Times New Roman", serif;
              font-size: 8.5pt;
              color: #475569;
            }
            @bottom-right {
              content: "Página " counter(page) " de " counter(pages);
              font-family: Georgia, "Times New Roman", serif;
              font-size: 9.5pt;
              font-weight: bold;
              color: #0f172a;
            }
          }
        }
      `}</style>

      <div className="relative my-8 w-full max-w-4xl rounded-xl border-2 border-[#D4AF37] bg-[#F9F8F6] text-slate-900 shadow-2xl overflow-hidden print:my-0 print:max-w-none print:rounded-none print:border-0 print:bg-white print:shadow-none print:overflow-visible">
        {/* Barra Superior de Controle do Modal (Oculta na impressão) */}
        <div className="print:hidden flex flex-wrap items-center justify-between gap-3 bg-[#0B192C] px-6 py-4 text-white border-b-2 border-[#D4AF37]">
          <div className="flex items-center gap-2.5">
            <span className="text-xl text-[#D4AF37]">∴</span>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="text-base font-bold tracking-wide text-white">
                  Pré-visualização Oficial do Balaústre Nº {data.numeroBalaustre}
                </h3>
                <span className="rounded-full border border-[#D4AF37]/60 bg-[#D4AF37]/15 px-2.5 py-0.5 text-[11px] font-bold text-[#D4AF37]">
                  📄 A4: {totalPaginasEstimadas}{' '}
                  {totalPaginasEstimadas === 1 ? 'página' : 'páginas'} (Página X
                  de Y na impressão)
                </span>
              </div>
              <p className="text-xs text-slate-300">
                Timbrado Litúrgico — {nomeCompletoLoja}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={copiarTexto}
              className="rounded-md border border-[#D4AF37]/60 bg-[#1a365d] px-3 py-1.5 text-xs font-semibold text-amber-100 hover:bg-[#1a365d]/80 transition-colors"
            >
              {copiado ? '✓ Copiado!' : 'Copiar Texto Litúrgico'}
            </button>
            <button
              type="button"
              onClick={onExportTxt}
              className="rounded-md bg-[#D4AF37] px-3 py-1.5 text-xs font-bold text-[#0B192C] hover:bg-[#c29d2f] transition-colors"
            >
              ⬇ Baixar .TXT
            </button>
            <button
              type="button"
              onClick={() => window.print()}
              className="rounded-md border border-slate-500 bg-slate-800 px-3 py-1.5 text-xs font-semibold text-white hover:bg-slate-700 transition-colors"
            >
              🖨 Imprimir
            </button>
            <button
              type="button"
              onClick={onClose}
              className="ml-1 rounded-md p-1.5 text-slate-300 hover:bg-slate-800 hover:text-white"
              aria-label="Fechar modal"
            >
              ✕
            </button>
          </div>
        </div>

        {/* Corpo Pergaminho Oficial */}
        <div className="max-h-[78vh] overflow-y-auto p-8 sm:p-12 bg-[#F9F8F6] font-serif leading-relaxed text-slate-900 print:max-h-none print:overflow-visible print:p-0 print:bg-white">
          <div
            ref={folhaRef}
            className="mx-auto max-w-3xl border border-[#D4AF37]/70 bg-[#FCFBF9] p-8 sm:p-10 shadow-inner print:max-w-none print:bg-white print:shadow-none print:p-6"
          >
            {/* Timbre Dinâmico da Loja com Logomarca à Esquerda e 5 Linhas em Negrito */}
            <header className="border-b-2 border-[#D4AF37] pb-6 mb-6">
              <div className="flex flex-row items-center gap-4 sm:gap-6">
                {loja.logoUrl && (
                  <div className="shrink-0">
                    <img
                      src={loja.logoUrl}
                      alt={`Logomarca ${nomeCompletoLoja}`}
                      className="h-24 w-24 sm:h-28 sm:w-28 object-contain"
                    />
                  </div>
                )}

                <div className="flex-1 text-center font-sans font-bold text-black leading-snug space-y-0.5">
                  <h1 className="text-base sm:text-xl font-extrabold text-black uppercase tracking-normal">
                    {(loja.nomeLoja || 'LOJA MAÇÔNICA ALPHA E ÔMEGA').toUpperCase()}
                    {loja.numeroLoja ? ` N° ${loja.numeroLoja}` : ''}
                  </h1>
                  {(loja.potenciaJurisdicao ||
                    DEFAULT_CONFIGURACAO_LOJA.potenciaJurisdicao) && (
                    <p className="text-xs sm:text-[15px] font-bold text-black">
                      {loja.potenciaJurisdicao ||
                        DEFAULT_CONFIGURACAO_LOJA.potenciaJurisdicao}
                    </p>
                  )}
                  {(loja.reunioesDiaHora || loja.ritoPotencia) && (
                    <p className="text-xs sm:text-[15px] font-bold text-black">
                      {[
                        loja.reunioesDiaHora ||
                          DEFAULT_CONFIGURACAO_LOJA.reunioesDiaHora,
                        (
                          loja.ritoPotencia ||
                          DEFAULT_CONFIGURACAO_LOJA.ritoPotencia
                        )?.toUpperCase(),
                      ]
                        .filter(Boolean)
                        .join(' – ')}
                    </p>
                  )}
                  <p className="text-xs sm:text-[15px] font-bold text-black">
                    {[loja.enderecoTemplo, loja.orienteCidadeUf]
                      .filter(Boolean)
                      .join(' – ')}
                  </p>
                  {(loja.emailLoja || DEFAULT_CONFIGURACAO_LOJA.emailLoja) && (
                    <p className="text-xs sm:text-[15px] font-bold text-black">
                      {(() => {
                        const mail =
                          loja.emailLoja || DEFAULT_CONFIGURACAO_LOJA.emailLoja;
                        return mail.toLowerCase().startsWith('e-mail:')
                          ? mail
                          : `e-mail: ${mail}`;
                      })()}
                    </p>
                  )}
                  {(loja.gestao || DEFAULT_CONFIGURACAO_LOJA.gestao) && (
                    <p className="text-xs sm:text-[15px] font-bold text-black">
                      {(() => {
                        const g = (
                          loja.gestao ||
                          DEFAULT_CONFIGURACAO_LOJA.gestao ||
                          ''
                        ).trim();
                        return g.toLowerCase().startsWith('gestão') ||
                          g.toLowerCase().startsWith('gestao')
                          ? g
                          : `Gestão: ${g}`;
                      })()}
                    </p>
                  )}
                </div>
              </div>

              <div className="mt-5 text-center">
                <div className="inline-flex flex-wrap items-center justify-center gap-3 rounded-full border border-[#D4AF37] bg-[#1a365d]/5 px-5 py-1.5 text-xs font-bold text-[#1a365d]">
                  <span>BALAÚSTRE Nº {data.numeroBalaustre}</span>
                  <span className="text-[#D4AF37]">•</span>
                  <span>
                    {obterDescricaoTipoSessao(data.tipoSessao).toUpperCase()}
                  </span>
                  <span className="text-[#D4AF37]">•</span>
                  <span>{obterDescricaoGrau(data.grauTrabalhos)}</span>
                </div>
              </div>
            </header>

            {/* Abertura Litúrgica */}
            <section className="space-y-4 text-justify text-sm sm:text-[15px]">

              <p className="indent-0">
                Sob emanações iluminadas do Supremo Arquiteto do Universo.
                <br />
                <strong>{dataPorExtensoLiturgica(data.dataSessao)}</strong>, achando-se
                abertos os Augustos trabalhos da nossa Ordem, no{' '}
                <strong>{obterDescricaoGrau(data.grauTrabalhos)}</strong>. reuniram-se os
                obreiros às <strong>{data.horarioAbertura} horas</strong>, com número legal, a
                fim de realizar{' '}
                <strong>{obterDescricaoTipoSessao(data.tipoSessao)}</strong>, no Templo da{' '}
                <strong>{nomeCompletoLoja}</strong>, situada à{' '}
                <strong>{loja.enderecoTemplo}</strong>, sendo os trabalhos abertos
                Ritualisticamente, debaixo do Ponto Geométrico conhecido dos filhos da V∴,
                Oriente de <strong>{loja.orienteCidadeUf}</strong>.
              
                {cargosAtivos.length > 0 && (
                  <>
                    {' '}
                    Os cargos em Loja foram ocupados da seguinte maneira:{' '}
                    {cargosAtivos.map((item, idx) => (
                      <React.Fragment key={item.chave}>
                        {idx > 0 && '; '}
                        {item.ehVeneravel
                          ? `empunhando o Malhete da Sabedoria o ${item.rotuloComSubstituto} `
                          : `${item.rotuloComSubstituto} `}
                        <strong>{item.nomeFormatado}</strong>
                      </React.Fragment>
                    ))}
                    .
                  </>
                )}
              </p>
              <p>
                {possuiMestreCerimonias
                  ? 'Após o preenchimento dos lugares vagos e da Câmara do Meio pelo Ir∴ Mestre de Cerimônias é verificada a segurança do Templo.'
                  : 'Após o preenchimento dos lugares vagos e da Câmara do Meio é verificada a segurança do Templo.'}
              </p>

              {/* Quórum / Presenças */}
                <p className="my-3">
                  <strong>PRESENÇA DE IRMÃOS:</strong> Na sessão de hoje, compareceram o total
                  de <strong>{data.quorum.qtdQuadroPresentes}</strong> irmãos do quadro e{' '}
                  <strong>{data.quorum.qtdVisitantesPresentes}</strong> irmãos visitantes.
                </p>

              {/* Balaústres Lidos */}
              <div>
                <h4 className="font-bold text-[#1a365d] uppercase text-xs tracking-wider border-b border-[#D4AF37]/40 pb-1 mb-2">
                  Leitura e Aprovação de Balaústres
                </h4>
                {data.balaustresLidos.length > 0 ? (
                  <div className="space-y-1">
                    {formatarListaBalaustresLidos(
                      data.balaustresLidos,
                      loja.gestao
                    ).map((frase, i) => (
                      <p key={i}>{frase}</p>
                    ))}
                  </div>
                ) : (
                  <p className="italic text-slate-600">Leitura suprimida</p>
                )}
              </div>

              {/* Expedientes */}
              <div>
                <h4 className="font-bold text-[#1a365d] uppercase text-xs tracking-wider border-b border-[#D4AF37]/40 pb-1 mb-2">
                  Expediente e Pranchas Recebidas
                </h4>
                {data.expedientesRecebidos.length > 0 ? (
                  <ul className="list-disc pl-5 space-y-1">
                    {data.expedientesRecebidos.map((e, i) => (
                      <li key={i}>{e.descricao}</li>
                    ))}
                  </ul>
                ) : (
                  <p className="italic text-slate-600">
                    Nenhum expediente recebido.
                  </p>
                )}
              </div>

              {/* Saco de Propostas */}
              <div>
                <h4 className="font-bold text-[#1a365d] uppercase text-xs tracking-wider border-b border-[#D4AF37]/40 pb-1 mb-2">
                  Saco de Propostas e Informações
                </h4>
                <p>
                  {data.sacoPropostasResultadoGeral?.trim() ||
                    (data.itensSacoPropostas.length > 0
                      ? `O saco de propostas e informações colheu além de bons fluidos ${String(
                          data.itensSacoPropostas.length
                        ).padStart(
                          2,
                          '0'
                        )} colunas gravadas sendo assim decifradas pelo Venerável Mestre como:`
                      : 'O saco de propostas e informações colheu apenas bons fluidos.')}
                </p>
                {data.itensSacoPropostas.length > 0 && (
                  <ul className="list-disc pl-5 mt-1 space-y-1">
                    {data.itensSacoPropostas.map((item, i) => (
                      <li key={i}>{item.descricao}</li>
                    ))}
                  </ul>
                )}
              </div>

              {/* Ordem do Dia & Instrução */}
              <div>
                <h4 className="font-bold text-[#1a365d] uppercase text-xs tracking-wider border-b border-[#D4AF37]/40 pb-1 mb-2">
                  Ordem do Dia & Tempo de Instrução
                </h4>
                {data.itensOrdemDia.length > 0 ? (
                  <ol className="list-decimal pl-5 space-y-2.5 mb-3">
                    {data.itensOrdemDia.map((od, i) => {
                      const redacao =
                        od.textoRedacaoFinal?.trim() ||
                        comporRedacaoItemOrdemDia(od);
                      return (
                        <li key={i}>
                          <strong>{od.titulo}:</strong>{' '}
                          <span>{redacao}</span>
                        </li>
                      );
                    })}
                  </ol>
                ) : (
                  <p className="italic text-slate-600 mb-2">
                    Nada constou na Ordem do Dia.
                  </p>
                )}

                <p>
                  <strong>Tempo de Instrução:</strong>{' '}
                  {data.tempoInstrucao.temaTitulo
                    ? `"${data.tempoInstrucao.temaTitulo}" — Apresentado por ${formatarNomeIrmao(
                        data.tempoInstrucao.apresentadorSelecionado,
                        data.tempoInstrucao.apresentadorOutro
                      )}`
                    : 'Não houve peça de arquitetura.'}
                </p>
                {data.tempoInstrucao.resumoInstrucao?.trim() && (
                  <p className="mt-1 text-slate-800">
                    <strong>Resumo da Instrução:</strong>{' '}
                    {data.tempoInstrucao.resumoInstrucao.trim()}
                  </p>
                )}
              </div>

              {/* Tronco de Beneficência */}
              <div>
                <h4 className="font-bold text-[#1a365d] uppercase text-xs tracking-wider border-b border-[#D4AF37]/40 pb-1 mb-2">
                  Tronco de Beneficência
                </h4>
                <p>
                  Fez o seu giro habitual, produzindo a medalha cunhada no valor
                  de{' '}
                  <strong>
                    {formatarTroncoComExtenso(
                      data.troncoBeneficencia.valorApurado,
                      data.troncoBeneficencia.valorPorExtenso
                    )}
                  </strong>
                  . Destino:{' '}
                  <strong>
                    {data.troncoBeneficencia.destinoConferencia?.trim() ||
                      'A cargo e julgo da hospitalaria'}
                  </strong>
                  .
                </p>
              </div>

              {/* Palavra a Bem Geral e da Ordem */}
              <div>
                <h4 className="font-bold text-[#1a365d] uppercase text-xs tracking-wider border-b border-[#D4AF37]/40 pb-1 mb-2">
                  Palavra a Bem Geral e da Ordem
                </h4>
                <div className="space-y-2">
                  {data.palavraBemDaOrdem.textoConsolidadoAta?.trim() && (
                    <div className="mb-3 rounded border border-[#D4AF37]/40 bg-[#F9F8F6] p-3 whitespace-pre-line">
                      <strong className="block text-[#1a365d] text-xs uppercase tracking-wider mb-1">
                        Manifestações Registradas na Sessão:
                      </strong>
                      {data.palavraBemDaOrdem.textoConsolidadoAta.trim()}
                    </div>
                  )}
                  {(ritoBrasileiro
                    ? [
                        {
                          key: 'sul',
                          titulo: 'Coluna do Sul',
                          falas: data.palavraBemDaOrdem.colunaSul,
                          fraseSilencio: 'Reinou o silêncio na coluna do Sul.',
                        },
                        {
                          key: 'norte',
                          titulo: 'Coluna do Norte',
                          falas: data.palavraBemDaOrdem.colunaNorte,
                          fraseSilencio:
                            'Reinou o silêncio em ambas as colunas.',
                        },
                      ]
                    : [
                        {
                          key: 'norte',
                          titulo: 'Coluna do Norte',
                          falas: data.palavraBemDaOrdem.colunaNorte,
                          fraseSilencio:
                            'Reinou o silêncio na coluna do Norte.',
                        },
                        {
                          key: 'sul',
                          titulo: 'Coluna do Sul',
                          falas: data.palavraBemDaOrdem.colunaSul,
                          fraseSilencio:
                            'Reinou o silêncio em ambas as colunas.',
                        },
                      ]
                  ).map((col) => (
                    <div key={col.key}>
                      <strong>{col.titulo}:</strong>
                      {col.falas.length > 0 ? (
                        <>
                          <ul className="list-disc pl-5">
                            {col.falas.map((f, i) => (
                              <li key={i}>
                                <strong>
                                  {formatarAutorFalaComCargoOuLoja(
                                    f,
                                    data.cargos
                                  )}
                                  :
                                </strong>{' '}
                                {f.resumoFala}
                              </li>
                            ))}
                          </ul>
                          <p className="mt-1 italic text-slate-700">
                            {col.fraseSilencio}
                          </p>
                        </>
                      ) : (
                        <span className="ml-2 italic text-slate-600">
                          {col.fraseSilencio}
                        </span>
                      )}
                    </div>
                  ))}

                  <div>
                    <strong>Oriente:</strong>
                    {data.palavraBemDaOrdem.colunaOriente.length > 0 ? (
                      <>
                        <ul className="list-disc pl-5">
                          {data.palavraBemDaOrdem.colunaOriente.map((f, i) => (
                            <li key={i}>
                              <strong>
                                {formatarAutorFalaComCargoOuLoja(
                                  f,
                                  data.cargos
                                )}
                                :
                              </strong>{' '}
                              {f.resumoFala}
                            </li>
                          ))}
                        </ul>
                        <p className="mt-1 italic text-slate-700">
                          Reinou o silêncio no Oriente.
                        </p>
                      </>
                    ) : (
                      <span className="ml-2 italic text-slate-600">
                        Reinou o silêncio no Oriente.
                      </span>
                    )}
                  </div>

                  <div>
                    <strong>Altar:</strong>
                    {(data.palavraBemDaOrdem.colunaAltar || []).length > 0 ? (
                      <>
                        <ul className="list-disc pl-5">
                          {(data.palavraBemDaOrdem.colunaAltar || []).map(
                            (f, i) => (
                              <li key={i}>
                                <strong>
                                  {formatarAutorFalaComCargoOuLoja(
                                    f,
                                    data.cargos
                                  )}
                                  :
                                </strong>{' '}
                                {f.resumoFala}
                              </li>
                            )
                          )}
                        </ul>
                        <p className="mt-1 italic text-slate-700">
                          Reinou o silêncio no Altar.
                        </p>
                      </>
                    ) : (
                      <span className="ml-2 italic text-slate-600">
                        Reinou o silêncio no Altar.
                      </span>
                    )}
                  </div>

                  {vm && (
                    <p>
                      <strong>
                        {formatarAutorFalaComCargoOuLoja(
                          {
                            irmaoSelecionado: c.veneravelMestre.irmaoSelecionado,
                            nomeOutro: c.veneravelMestre.nomeOutro,
                            cargoIrmao: 'Venerável Mestre',
                          },
                          data.cargos
                        )}
                        :
                      </strong>{' '}
                      {data.palavraBemDaOrdem.palavraVeneravelMestre ||
                        'Agradeceu a presença dos Irmãos e encerrou ritualisticamente a sessão.'}
                    </p>
                  )}
                  {orador && (
                    <p>
                      <strong>
                        {formatarAutorFalaComCargoOuLoja(
                          {
                            irmaoSelecionado: c.orador.irmaoSelecionado,
                            nomeOutro: c.orador.nomeOutro,
                            cargoIrmao: 'Orador',
                          },
                          data.cargos
                        )}
                        :
                      </strong>{' '}
                      {data.palavraBemDaOrdem.palavraOrador ||
                        'Conclusões legais favoráveis, declarando os trabalhos justos e perfeitos.'}
                    </p>
                  )}
                </div>
              </div>

              {/* Encerramento e Assinaturas (protegido contra quebra de página no meio das assinaturas) */}
              <div className="pt-4 border-t border-[#D4AF37]/60 break-inside-avoid">
                <p className="indent-8">
                  Trabalhos encerrados ritualisticamente às{' '}
                  <strong>{data.horarioEncerramento.replace(':', 'h')}</strong>{' '}
                  no Or∴ de <strong>{loja.orienteCidadeUf}</strong>. Para
                  constar, eu, <strong>{secretario || 'Ir∴ Secretário'}</strong>,{' '}
                  {formatarRotuloCargoComSubstituto(
                    secretario,
                    'Secretário',
                    c
                  )}
                  , lavrei o presente Balaústre que vai assinado por mim
                  {orador && (
                    <>
                      , pelo Ir∴{' '}
                      {formatarRotuloCargoComSubstituto(orador, 'Orador', c)}
                    </>
                  )}{' '}
                  e pelo{' '}
                  {formatarRotuloCargoComSubstituto(
                    vm,
                    'Venerável Mestre',
                    c
                  )}
                  .
                </p>

                <div className="mt-12 grid grid-cols-1 sm:grid-cols-3 print:grid-cols-3 gap-8 text-center text-xs">
                  {secretario && (
                    <div className="border-t border-slate-700 pt-2">
                      <p className="font-bold text-[#0B192C]">{secretario}</p>
                      <p className="text-slate-600">
                        {formatarRotuloCargoComSubstituto(
                          secretario,
                          'Secretário',
                          c
                        )}
                      </p>
                    </div>
                  )}
                  {vm && (
                    <div className="border-t border-slate-700 pt-2">
                      <p className="font-bold text-[#0B192C]">{vm}</p>
                      <p className="text-slate-600">
                        {formatarRotuloCargoComSubstituto(
                          vm,
                          'Venerável Mestre',
                          c
                        )}
                      </p>
                    </div>
                  )}
                  {orador && (
                    <div className="border-t border-slate-700 pt-2">
                      <p className="font-bold text-[#0B192C]">{orador}</p>
                      <p className="text-slate-600">
                        {formatarRotuloCargoComSubstituto(orador, 'Orador', c)}
                      </p>
                    </div>
                  )}
                </div>
              </div>

              {/* Rodapé Visual de Paginação na Pré-visualização (Na impressão A4, o @page imprime "Página X de Y" em cada folha) */}
              <div className="mt-8 pt-3 border-t border-dashed border-slate-300 flex items-center justify-between text-[11px] font-sans text-slate-600 print:hidden">
                <span>
                  {identificacaoRodape}
                </span>
                <span className="font-bold text-[#0B192C]">
                  {totalPaginasEstimadas === 1
                    ? 'Página 1 de 1'
                    : `Página 1 a ${totalPaginasEstimadas} de ${totalPaginasEstimadas} (Numerado em cada folha A4 na impressão)`}
                </span>
              </div>
            </section>
          </div>
        </div>
      </div>
    </div>
  );
};
