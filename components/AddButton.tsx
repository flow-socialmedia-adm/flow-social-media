import React, { useState, useRef, useEffect } from 'react';
import { PlusIcon } from './icons';
import TooltipHint from './TooltipHint';

export type AddButtonDropdownItem = {
  label: string;
  onClick: () => void;
};

type AddButtonProps = {
  onClick?: () => void;
  tooltip: string;
  ariaLabel: string;
  dropdownItems?: AddButtonDropdownItem[];
};

const AddButton: React.FC<AddButtonProps> = ({
  onClick,
  tooltip,
  ariaLabel,
  dropdownItems,
}) => {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    if (open) document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [open]);

  const handleClick = () => {
    if (dropdownItems && dropdownItems.length > 0) {
      setOpen((prev) => !prev);
    } else if (onClick) {
      onClick();
    }
  };

  const handleItemClick = (item: AddButtonDropdownItem) => {
    item.onClick();
    setOpen(false);
  };

  const buttonClass =
    'w-9 h-9 sm:w-10 sm:h-10 flex items-center justify-center bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-xl shadow-lg hover:shadow-xl hover:from-indigo-700 hover:to-purple-700 transition-all group flex-shrink-0 transform hover:scale-105 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 dark:focus:ring-offset-gray-800';

  return (
    <TooltipHint label={tooltip} className="inline-flex flex-shrink-0">
      <div className="relative" ref={ref}>
        <button
          type="button"
          onClick={handleClick}
          className={buttonClass}
          aria-label={ariaLabel}
          aria-expanded={open && !!dropdownItems?.length}
          aria-haspopup={!!(dropdownItems && dropdownItems.length > 0)}
        >
          <PlusIcon className="w-5 h-5 sm:w-6 sm:h-6 group-hover:rotate-90 transition-transform duration-300" />
        </button>
        {open && dropdownItems && dropdownItems.length > 0 && (
          <div
            className="absolute right-0 top-full mt-2 w-48 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 py-1 z-50"
            role="menu"
          >
            {dropdownItems.map((item, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => handleItemClick(item)}
                className="w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors first:rounded-t-lg last:rounded-b-lg"
                role="menuitem"
              >
                {item.label}
              </button>
            ))}
          </div>
        )}
      </div>
    </TooltipHint>
  );
};

export default AddButton;
