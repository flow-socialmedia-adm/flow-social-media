import React from 'react';

export type SummaryChip = {
  label: string;
  count?: number;
  color: string;
};

const colorClasses: Record<string, string> = {
  pink: 'bg-pink-100 dark:bg-pink-900/30 text-pink-700 dark:text-pink-300',
  green: 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300',
  amber: 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300',
  blue: 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300',
  gray: 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300',
  red: 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300',
  indigo: 'bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300',
};

type SummaryChipsProps = {
  chips: SummaryChip[];
  className?: string;
};

const SummaryChips: React.FC<SummaryChipsProps> = ({ chips, className = '' }) => {
  if (!chips.length) return null;
  return (
    <div className={`flex flex-wrap items-center gap-2 ${className}`}>
      {chips.map((chip, idx) => (
        <div
          key={idx}
          className={`px-3 py-1.5 rounded-full text-xs font-medium flex items-center gap-2 flex-shrink-0 ${
            colorClasses[chip.color] ?? colorClasses.gray
          }`}
        >
          {chip.count != null && <span className="font-bold">{chip.count}</span>}
          <span>{chip.count != null ? chip.label.replace(/^\d+\s*/, '') : chip.label}</span>
        </div>
      ))}
    </div>
  );
};

export default SummaryChips;
