import React from 'react';

type SectionHeaderProps = {
  title: string;
  legendSlot?: React.ReactNode;
  filtersSlot?: React.ReactNode;
  summarySlot?: React.ReactNode;
  rightSlot?: React.ReactNode;
};

const SectionHeader: React.FC<SectionHeaderProps> = ({
  title,
  legendSlot,
  filtersSlot,
  summarySlot,
  rightSlot,
}) => {
  return (
    <div className="w-full mb-6 flex-shrink-0">
      <div className="flex flex-wrap items-center gap-2 mb-4">
        <h1 className="text-2xl font-bold flex-shrink-0">{title}</h1>
        {legendSlot}
      </div>
      <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
        {filtersSlot && <div className="flex items-center gap-2 flex-shrink-0">{filtersSlot}</div>}
        <div className="flex-1 min-w-0 flex flex-wrap items-center gap-2">
          {summarySlot}
        </div>
        {rightSlot}
      </div>
    </div>
  );
};

export default SectionHeader;
