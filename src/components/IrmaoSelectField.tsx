import React from 'react';
import { UseFormRegister, UseFormWatch, UseFormSetValue } from 'react-hook-form';
import {
  BalaustreFormData,
  carregarDetalhesIrmaosQuadroLocal,
  carregarIrmaosQuadroSalvos,
} from '../types/balaustre';
import { VALOR_CARGO_NAO_POSSUI } from '../utils/liturgyFormatter';

interface IrmaoSelectFieldProps {
  label: string;
  selectPath: any;
  outroPath: any;
  titularPath?: any;
  titularPadrao?: string;
  listaIrmaos?: string[];
  register: UseFormRegister<BalaustreFormData>;
  watch: UseFormWatch<BalaustreFormData>;
  setValue: UseFormSetValue<BalaustreFormData>;
  allowEmpty?: boolean;
  emptyLabel?: string;
  allowNaoPossui?: boolean;
  errorMessage?: string;
}

export const IrmaoSelectField: React.FC<IrmaoSelectFieldProps> = ({
  label,
  selectPath,
  outroPath,
  titularPath,
  titularPadrao,
  listaIrmaos,
  register,
  watch,
  setValue,
  allowEmpty = false,
  emptyLabel = '-- Selecione um Irmão --',
  allowNaoPossui,
  errorMessage,
}) => {
  const irmaosOpcoes = listaIrmaos || carregarIrmaosQuadroSalvos();
  const detalhesIrmaos = carregarDetalhesIrmaosQuadroLocal();
  const valorSelecionado = watch(selectPath);
  const isTitular = titularPath ? watch(titularPath) : true;
  const mostrarCampoOutro = valorSelecionado === 'outro';
  const ehSuprimidoNoBalaustre = valorSelecionado === VALOR_CARGO_NAO_POSSUI;
  const permitirNaoPossui = allowNaoPossui ?? Boolean(titularPath);
  const selectRegister = register(selectPath);
  const selecionadoEhHonorario = Boolean(
    valorSelecionado &&
      !ehSuprimidoNoBalaustre &&
      detalhesIrmaos[valorSelecionado]?.membroHonorario
  );

  return (
    <div
      className={`rounded-lg border p-3.5 shadow-sm transition-all ${
        ehSuprimidoNoBalaustre
          ? 'border-dashed border-slate-300 dark:border-slate-700 bg-slate-100/70 dark:bg-slate-900/40 opacity-80'
          : selecionadoEhHonorario
            ? 'border-sky-300 dark:border-sky-700 bg-sky-500/10 dark:bg-sky-900/20'
            : 'border-slate-200 dark:border-slate-700/80 bg-white dark:bg-slate-800/70 hover:border-[#D4AF37]/60'
      }`}
    >
      <div className="flex items-center justify-between gap-2 mb-2">
        <div className="flex items-center gap-1.5 flex-wrap">
          <label className="text-sm font-semibold text-[#1a365d] dark:text-slate-100">
            {label}
          </label>
          {selecionadoEhHonorario && (
            <span className="inline-flex items-center gap-1 rounded-full border border-sky-300 bg-sky-500/15 px-2 py-0.5 text-[10px] font-bold text-sky-800 dark:border-sky-700 dark:bg-sky-900/35 dark:text-sky-200">
              🎖️ Honorário
            </span>
          )}
        </div>

        {titularPath &&
          (ehSuprimidoNoBalaustre ? (
            <span className="inline-flex items-center gap-1 rounded-full border border-slate-300 dark:border-slate-700 bg-slate-200/80 dark:bg-slate-800 px-2.5 py-0.5 text-[11px] font-semibold text-slate-600 dark:text-slate-300">
              🚫 Omitido no Balaústre
            </span>
          ) : (
            <button
              type="button"
              onClick={() =>
                setValue(titularPath, !isTitular, { shouldDirty: true })
              }
              className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium transition-colors border ${
                isTitular
                  ? 'bg-[#1a365d]/10 text-[#1a365d] border-[#1a365d]/25 dark:bg-blue-950/60 dark:text-blue-200 dark:border-blue-800'
                  : 'bg-amber-50 text-amber-800 border-[#D4AF37] dark:bg-amber-950/50 dark:text-amber-300 dark:border-amber-700'
              }`}
              title={
                titularPadrao
                  ? `Titular da Diretoria: ${titularPadrao}. Clique caso queira alternar manualmente.`
                  : 'Alternar entre Oficial Titular e Substituto / Ad-hoc'
              }
            >
              <span
                className={`h-1.5 w-1.5 rounded-full ${
                  isTitular ? 'bg-[#1a365d] dark:bg-blue-400' : 'bg-[#D4AF37]'
                }`}
              />
              {isTitular ? 'Titular' : 'Substituto / Ad-hoc'}
            </button>
          ))}
      </div>

      <select
        {...selectRegister}
        onChange={(e) => {
          selectRegister.onChange(e);
          if (titularPath && titularPadrao) {
            const ehTitularDaDiretoria =
              e.target.value.trim() === titularPadrao.trim();
            setValue(titularPath, ehTitularDaDiretoria, { shouldDirty: true });
          }
        }}
        className="w-full rounded-md border border-slate-300 dark:border-slate-600 bg-[#F9F8F6] dark:bg-slate-900 px-3 py-2 text-sm text-slate-800 dark:text-slate-100 focus:border-[#1a365d] focus:outline-none focus:ring-2 focus:ring-[#1a365d]/20"
      >
        {allowEmpty && <option value="">{emptyLabel}</option>}
        {permitirNaoPossui && (
          <option value={VALOR_CARGO_NAO_POSSUI}>
            -- Não possui no Rito / Omitir do Balaústre --
          </option>
        )}
        {irmaosOpcoes.map((nome) => {
          const det = detalhesIrmaos[nome];
          const marcaHonorario = det?.membroHonorario ? ' 🎖️ (Honorário)' : '';
          return (
            <option key={nome} value={nome}>
              {nome}
              {marcaHonorario}
            </option>
          );
        })}
        <option value="outro">-- Outro (Digitar nome...) --</option>
      </select>

      {mostrarCampoOutro && (
        <div className="mt-2.5 animate-fadeIn">
          <div className="relative flex items-center">
            <span className="inline-flex items-center rounded-l-md border border-r-0 border-[#D4AF37] bg-amber-50/90 dark:bg-amber-950/40 px-2.5 py-1.5 text-xs font-bold text-[#1a365d] dark:text-[#D4AF37]">
              Ir∴
            </span>
            <input
              type="text"
              {...register(outroPath)}
              placeholder="Digite o nome completo do Irmão..."
              className="w-full rounded-r-md border border-[#D4AF37] bg-amber-50/40 dark:bg-slate-900 px-3 py-1.5 text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:border-[#1a365d] focus:outline-none"
            />
          </div>
        </div>
      )}

      {errorMessage && (
        <p className="mt-1.5 text-xs font-medium text-red-600 dark:text-red-400">
          {errorMessage}
        </p>
      )}
    </div>
  );
};

