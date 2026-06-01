import React from 'react';

type FilterDropdownProps = {
    label: string;
    name: string;
    options: { value: string; label: string }[];
    disabled?: boolean;
    value: string;
    onChange: (name: string, value: string) => void;
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
    labelClassName,
    selectClassName,
}) => {
    const labelCn = labelClassName ?? 'text-xs font-medium text-gray-700 dark:text-gray-300 mb-1';
    const selectCn =
        selectClassName ??
        'bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm py-1.5 px-2.5 text-xs focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed min-w-[120px]';
    return (
        <div className="flex flex-col">
            <label className={labelCn}>{label}</label>
            <select
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
