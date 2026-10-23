import React from 'react';
import {
  Control,
  UseFormRegister,
  UseFormSetValue,
  UseFormWatch,
  useFieldArray,
} from 'react-hook-form';
import {
  BalaustreFormData,
  carregarIrmaosQuadroSalvos,
} from '../types/balaustre';
import { CARGOS_MACONICOS_ITEM8 } from '../data/frasesPadraoItem8';
import {
  formatarAutorFalaComCargoOuLoja,
  identificarCargoDoIrmaoNaSessao,
} from '../utils/liturgyFormatter';
import { SeletorLojaVisitante } from './SeletorLojaVisitante';

interface ColunaFalasFieldArrayProps {
  tituloColuna: string;
  subtituloRitualistico: string;
  fieldArrayName:
    | 'palavraBemDaOrdem.colunaSul'
    | 'palavraBemDaOrdem.colunaNorte'
    | 'palavraBemDaOrdem.colunaOriente'
    | 'palavraBemDaOrdem.colunaAltar';
  control: Control<BalaustreFormData>;
  register: UseFormRegister<BalaustreFormData>;
  watch: UseFormWatch<BalaustreFormData>;
  setValue: UseFormSetValue<BalaustreFormData>;
  listaIrmaos?: string[];
}

export const ColunaFalasFieldArray: React.FC<ColunaFalasFieldArrayProps> = ({
  tituloColuna,
  subtituloRitualistico,
  fieldArrayName,
  control,
  register,
  watch,
  setValue,
  listaIrmaos,
}) => {
  const irmaosOpcoes = listaIrmaos || carregarIrmaosQuadroSalvos();
  const { fields, append, remove } = useFieldArray({
    control,
    name: fieldArrayName,
  });

  const cargosSessao = watch('cargos');

  return (
    <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/70 p-5 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#D4AF37]/40 pb-3 mb-4">
        <div>
          <h4 className="text-base font-bold text-[#1a365d] dark:text-amber-300 flex items-center gap-2">
            <span className="text-[#D4AF37]">∴</span> {tituloColuna}
          </h4>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            {subtituloRitualistico}
          </p>
        </div>

        <button
          type="button"
          onClick={() =>
            append({
              irmaoSelecionado: '',
              nomeOutro: '',
              lojaVisitante: '',
              orienteVisitante: '',
              cargoIrmao: '',
              resumoFala: '',
            })
          }
          className="inline-flex items-center gap-1.5 rounded-lg bg-[#1a365d] px-3.5 py-2 text-xs font-semibold text-white shadow-sm hover:bg-[#0B192C] transition-colors"
        >
          <span>＋</span>{' '}
          {tituloColuna.toLowerCase().startsWith('altar')
            ? `Registrar Fala no ${tituloColuna}`
            : `Registrar Fala na ${tituloColuna}`}
        </button>
      </div>

      {fields.length === 0 ? (
        <div className="rounded-lg border border-dashed border-slate-300 dark:border-slate-700 bg-[#F9F8F6]/70 dark:bg-slate-900/40 py-6 text-center text-xs text-slate-500 dark:text-slate-400">
          Reinou o silêncio nesta Coluna (nenhuma fala adicionada).
        </div>
      ) : (
        <div className="space-y-3">
          {fields.map((field, index) => {
            const irmaoPath = `${fieldArrayName}.${index}.irmaoSelecionado` as const;
            const outroPath = `${fieldArrayName}.${index}.nomeOutro` as const;
            const lojaPath = `${fieldArrayName}.${index}.lojaVisitante` as const;
            const orientePath =
              `${fieldArrayName}.${index}.orienteVisitante` as const;
            const cargoPath = `${fieldArrayName}.${index}.cargoIrmao` as const;
            const resumoPath = `${fieldArrayName}.${index}.resumoFala` as const;

            const selecionado = watch(irmaoPath);
            const nomeOutroVal = watch(outroPath);
            const lojaVal = watch(lojaPath);
            const orienteVal = watch(orientePath);
            const cargoCustomVal = watch(cargoPath);

            const cargoDetectadoSessao = identificarCargoDoIrmaoNaSessao(
              selecionado,
              cargosSessao
            );

            const previaIdentificacao = formatarAutorFalaComCargoOuLoja(
              {
                irmaoSelecionado: selecionado || '',
                nomeOutro: nomeOutroVal,
                lojaVisitante: lojaVal,
                orienteVisitante: orienteVal,
                cargoIrmao: cargoCustomVal,
              },
              cargosSessao
            );

            return (
              <div
                key={field.id}
                className="rounded-lg border border-slate-200 dark:border-slate-700 bg-[#F9F8F6] dark:bg-slate-900/70 p-4 transition-all space-y-3"
              >
                <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-start">
                  <div className="md:col-span-5 space-y-2">
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                      Irmão que fez uso da palavra
                    </label>
                    <select
                      {...register(irmaoPath)}
                      className="w-full rounded-md border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 px-3 py-2 text-sm text-slate-800 dark:text-slate-100 focus:border-[#1a365d] focus:outline-none"
                    >
                      <option value="">-- Selecione um Irmão --</option>
                      {irmaosOpcoes.map((nome) => (
                        <option key={nome} value={nome}>
                          {nome}
                        </option>
                      ))}
                      <option value="outro">
                        -- Outro (Irmão Visitante...) --
                      </option>
                    </select>

                    {/* Se for Irmão do Quadro: mostra cargo detectado automaticamente na sessão ou permite ajustar */}
                    {selecionado && selecionado !== 'outro' && (
                      <div className="rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-2.5 space-y-1.5">
                        <div className="flex items-center justify-between text-[11px]">
                          <span className="font-semibold text-slate-600 dark:text-slate-300">
                            Cargo na sessão:
                          </span>
                          <span className="font-bold text-[#1a365d] dark:text-[#D4AF37]">
                            {cargoCustomVal === 'SEM_CARGO'
                              ? 'Obreiro (Sem cargo)'
                              : cargoCustomVal ||
                                cargoDetectadoSessao ||
                                'Obreiro (Sem cargo)'}
                          </span>
                        </div>
                        <select
                          {...register(cargoPath)}
                          className="w-full rounded border border-slate-200 dark:border-slate-700 bg-[#F9F8F6] dark:bg-slate-900 px-2 py-1 text-xs"
                        >
                          <option value="">
                            {cargoDetectadoSessao
                              ? `Automático da Sessão (${cargoDetectadoSessao})`
                              : '-- Sem cargo entre parênteses (ou selecione) --'}
                          </option>
                          <option value="SEM_CARGO">
                            🚫 Sem cargo (Exibir apenas o nome do Irmão)
                          </option>
                          {CARGOS_MACONICOS_ITEM8.map((cg) => (
                            <option key={cg} value={cg}>
                              {cg}
                            </option>
                          ))}
                        </select>
                      </div>
                    )}

                    {/* Se for "-- Outro (Visitante) --": exibe filtro em cascata UF -> Oriente -> Loja + cadastro de nova Loja */}
                    {selecionado === 'outro' && (
                      <SeletorLojaVisitante
                        nomeVisitante={nomeOutroVal || ''}
                        onChangeNomeVisitante={(val) =>
                          setValue(outroPath, val, { shouldDirty: true })
                        }
                        lojaSelecionada={lojaVal || ''}
                        onChangeLoja={(val) =>
                          setValue(lojaPath, val, { shouldDirty: true })
                        }
                        orienteSelecionado={orienteVal || ''}
                        onChangeOriente={(val) =>
                          setValue(orientePath, val, { shouldDirty: true })
                        }
                      />
                    )}
                  </div>

                  <div className="md:col-span-6">
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      Resumo do teor da manifestação
                    </label>
                    <textarea
                      rows={3}
                      {...register(resumoPath)}
                      placeholder="Ex: Saudou os visitantes, trouxe o abraço fraterno de sua Loja e..."
                      className="w-full rounded-md border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 px-3 py-2 text-sm text-slate-800 dark:text-slate-100 focus:border-[#1a365d] focus:outline-none"
                    />
                  </div>

                  <div className="md:col-span-1 flex md:justify-end pt-5">
                    <button
                      type="button"
                      onClick={() => remove(index)}
                      className="rounded-md bg-red-50 dark:bg-red-950/50 border border-red-200 dark:border-red-800 px-2.5 py-2 text-xs font-bold text-red-600 dark:text-red-300 hover:bg-red-100 transition-colors"
                      title="Remover esta fala"
                    >
                      ✕
                    </button>
                  </div>
                </div>

                {/* Prévia de como sairá no relatório / ata */}
                {previaIdentificacao && (
                  <div className="rounded border border-[#D4AF37]/40 bg-white/80 dark:bg-slate-800/80 px-3 py-1.5 text-xs text-slate-700 dark:text-slate-300">
                    <span className="font-semibold text-slate-500">
                      Saída na Ata:{' '}
                    </span>
                    <strong className="text-[#1a365d] dark:text-[#D4AF37]">
                      {previaIdentificacao}:
                    </strong>{' '}
                    <span>{watch(resumoPath) || '...'}</span>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
