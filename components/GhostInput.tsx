import React, { useMemo, useState, useRef, useEffect } from 'react';
import { formatIsoDateForDisplayBr } from '../lib/utils';
import TooltipHint from './TooltipHint';

const MASKS = {
  cpf: (v: string) => v.replace(/\D/g, '').replace(/(\d{3})(\d)/, '$1.$2').replace(/(\d{3})(\d)/, '$1.$2').replace(/(\d{3})(\d{1,2})$/, '$1-$2').slice(0, 14),
  cnpj: (v: string) => v.replace(/\D/g, '').replace(/^(\d{2})(\d)/, '$1.$2').replace(/^(\d{2})\.(\d{3})(\d)/, '$1.$2.$3').replace(/\.(\d{3})(\d)/, '.$1/$2').replace(/(\d{4})(\d)/, '$1-$2').slice(0, 18),
  cep: (v: string) => v.replace(/\D/g, '').replace(/(\d{5})(\d)/, '$1-$2').slice(0, 9),
} as const;

export type GhostInputMask = keyof typeof MASKS;

export type GhostInputProps = {
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
  type?: 'text' | 'email' | 'date';
  label?: string;
  className?: string;
  disabled?: boolean;
  mask?: GhostInputMask;
  /** Chamado ao sair do modo edição (blur do input), antes de voltar ao modo leitura. */
  onEditBlur?: () => void;
  /**
   * Largura do input/sublinhado acompanha o conteúdo (ch), não ocupa 100% — útil ao lado de ações (ex.: CEP + check).
   */
  sizeToContent?: boolean;
  /** Texto do hint quando `disabled` (não é o atributo HTML `title`). */
  disabledHint?: string;
};

/**
 * Input com estilo ghost: modo leitura exibe texto/placeholder sem borda;
 * ao clicar vira input; ao blur volta a texto.
 */
export const GhostInput: React.FC<GhostInputProps> = ({
  value,
  onChange,
  placeholder,
  type = 'text',
  label,
  className = '',
  disabled = false,
  mask,
  onEditBlur,
  sizeToContent = false,
  disabledHint,
}) => {
  const tip = disabled && disabledHint ? disabledHint : undefined;
  const applyMask = (v: string) => (mask && MASKS[mask] ? MASKS[mask](v) : v);
  const rawValue = value ?? '';
  const displayValue = mask ? applyMask(rawValue) : rawValue;
  const readModeText =
    type === 'date' && rawValue.trim() && /^\d{4}-\d{2}-\d{2}/.test(rawValue.trim())
      ? formatIsoDateForDisplayBr(rawValue.trim())
      : displayValue;
  const showAsEmpty = !rawValue.trim();
  const contentCh = useMemo(() => {
    if (!sizeToContent) return undefined;
    const shown = showAsEmpty ? placeholder : type === 'date' ? readModeText : displayValue;
    return Math.max(9, (shown || '').length || 9);
  }, [sizeToContent, showAsEmpty, placeholder, displayValue, readModeText, type]);
  const [isEditing, setIsEditing] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!isEditing || !inputRef.current) return;
    const el = inputRef.current;
    el.focus();
    // type="email" | "date" etc. não suportam setSelectionRange em vários browsers (lança InvalidStateError).
    try {
      const len = el.value.length;
      el.setSelectionRange(len, len);
    } catch {
      /* ignorar */
    }
  }, [isEditing]);

  const showPlaceholder = showAsEmpty && !isEditing;

  if (isEditing) {
    const widthStyle = contentCh !== undefined ? ({ width: `${contentCh}ch`, maxWidth: '100%' } as const) : undefined;
    const inputWidthClass = sizeToContent
      ? 'w-auto min-w-0 text-sm bg-transparent border-b border-gray-300 dark:border-gray-500 py-1 px-0 focus:outline-none focus:border-gray-400 dark:focus:border-gray-400 box-content'
      : 'w-full text-sm bg-transparent border-b border-gray-300 dark:border-gray-500 py-1 px-0 focus:outline-none focus:border-gray-400 dark:focus:border-gray-400 min-w-[120px]';
    const inputEl = (
      <input
        ref={inputRef}
        type={type}
        value={displayValue}
        style={widthStyle}
        onChange={(e) => onChange(mask ? applyMask(e.target.value) : e.target.value)}
        onBlur={() => {
          onEditBlur?.();
          setIsEditing(false);
        }}
        onKeyDown={(e) => {
          if (e.key === 'Enter') (e.target as HTMLInputElement).blur();
          else if (e.key === ' ') e.stopPropagation();
        }}
        disabled={disabled}
        placeholder={placeholder}
        className={inputWidthClass}
        aria-label={tip || label || placeholder}
      />
    );
    return (
      <div className={sizeToContent ? `inline-block max-w-full ${className}` : className}>
        {label && <label className="text-xs font-medium text-gray-500 dark:text-gray-400">{label}</label>}
        {tip ? <TooltipHint label={tip}>{inputEl}</TooltipHint> : inputEl}
      </div>
    );
  }

  const readWrapClass = sizeToContent
    ? `inline-block max-w-full text-sm py-1 px-0 min-h-[1.5rem] rounded transition-colors ${disabled ? 'cursor-default opacity-90' : 'cursor-text hover:bg-gray-50/50 dark:hover:bg-gray-800/30'} ${showPlaceholder ? 'text-gray-400 dark:text-gray-500' : 'text-gray-800 dark:text-gray-200'} ${className}`
    : `text-sm py-1 px-0 min-h-[1.5rem] rounded transition-colors ${disabled ? 'cursor-default opacity-90' : 'cursor-text hover:bg-gray-50/50 dark:hover:bg-gray-800/30'} ${showPlaceholder ? 'text-gray-400 dark:text-gray-500' : 'text-gray-800 dark:text-gray-200'} ${className}`;

  const readStyle =
    sizeToContent && contentCh !== undefined
      ? ({ width: `${contentCh}ch`, maxWidth: '100%', boxSizing: 'content-box' } as const)
      : undefined;

  const readBody = (
    <div
      role={disabled ? 'text' : 'button'}
      tabIndex={disabled ? -1 : 0}
      onClick={() => !disabled && setIsEditing(true)}
      onKeyDown={(e) => {
        if (!disabled && (e.key === 'Enter' || e.key === ' ')) {
          e.preventDefault();
          setIsEditing(true);
        }
      }}
      style={readStyle}
      className={readWrapClass}
      aria-label={label || placeholder}
    >
      {label && <span className="text-xs font-medium text-gray-500 dark:text-gray-400 block">{label}</span>}
      <span>{showPlaceholder ? placeholder : readModeText}</span>
    </div>
  );
  if (tip) {
    return (
      <TooltipHint label={tip} className="block w-full min-w-0 max-w-full">
        {readBody}
      </TooltipHint>
    );
  }
  return readBody;
};
