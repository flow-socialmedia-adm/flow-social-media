import React from 'react';

type FilterDropdownProps = {
    label: string;
    name: string;
    options: { value: string; label: string }[];
    disabled?: boolean;
    value: string;
    onChange: (name: string, value: string) => void;
    /** `stacked` = rótulo acima; `inline` = mesma linha (toolbar) */
    layout?: 'stacked' | 'inline';
    /** Sobrescreve classes do rótulo (ex.: header degradê) */
    labelClassName?: string;
    /** Sobrescreve classes do select */
    selectClassName?: string;
};

const FilterDropdown: React.FC<FilterDropdownProps> = ({
    label,
    name,
    options,
    disabled = false,
    value,
    onChange,
    layout = 'stacked',
    labelClassName,
    selectClassName,
}) => {
    const isInline = layout === 'inline';
    const labelCn =
        labelClassName ??
        (isInline
            ? 'shrink-0 text-sm font-medium text-gray-700 dark:text-gray-300'
            : 'mb-1 text-xs font-medium text-gray-700 dark:text-gray-300');
    const selectCn =
        selectClassName ??
        (isInline
            ? 'h-10 min-h-[2.5rem] min-w-[120px] rounded-lg border border-gray-300 bg-white px-3 text-sm font-medium text-gray-800 shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-1 disabled:cursor-not-allowed disabled:opacity-50 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100'
            : 'min-w-[120px] rounded-md border border-gray-300 bg-white px-2.5 py-1.5 text-xs shadow-sm focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:cursor-not-allowed disabled:opacity-50 dark:border-gray-600 dark:bg-gray-700');
    return (
        <div className={isInline ? 'flex h-10 shrink-0 items-center gap-2' : 'flex flex-col'}>
            <label htmlFor={name} className={labelCn}>
                {label}
            </label>
            <select
                id={name}
                name={name}
                onChange={(e) => {
                    e.stopPropagation();
                    onChange(name, e.target.value);
                }}
                onClick={(e) => e.stopPropagation()}
                onMouseDown={(e) => e.stopPropagation()}
                value={value}
                disabled={disabled}
                className={selectCn}
            >
                {options.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
            </select>
        </div>
    );
};

export default FilterDropdown;
