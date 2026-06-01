import React from 'react';
import {
    CONTENT_PAGE_HEADER_ACTIONS_ROW_NOWRAP,
    CONTENT_PAGE_HEADER_CLASS_STANDARD,
    CONTENT_PAGE_HEADER_INNER,
    CONTENT_PAGE_HEADER_TOOLBAR_ROW,
} from '../lib/contentPageHeader';

type ContentPageHeaderProps = {
    heading: React.ReactNode;
    subtitle?: React.ReactNode;
    actions?: React.ReactNode;
    secondaryRow?: React.ReactNode;
    headingClassName?: string;
};

/** Faixa roxa padrão do app — altura fixa e controles em uma linha. */
const ContentPageHeader: React.FC<ContentPageHeaderProps> = ({
    heading,
    subtitle,
    actions,
    secondaryRow,
    headingClassName,
}) => (
    <header className={`${CONTENT_PAGE_HEADER_CLASS_STANDARD} flex flex-col justify-end overflow-hidden`}>
        <div className={`${CONTENT_PAGE_HEADER_INNER} flex flex-col ${secondaryRow ? 'gap-3' : ''}`}>
            <div className={`${CONTENT_PAGE_HEADER_TOOLBAR_ROW} sm:flex-nowrap`}>
                <div className="min-w-0 shrink">
                    <h1 className={headingClassName ?? 'text-xl font-bold text-white sm:text-2xl'}>{heading}</h1>
                    {subtitle ? <p className="mt-1 text-sm text-white/85">{subtitle}</p> : null}
                </div>
                {actions ? (
                    <div className={`shrink-0 min-w-0 ${CONTENT_PAGE_HEADER_ACTIONS_ROW_NOWRAP}`}>{actions}</div>
                ) : null}
            </div>
            {secondaryRow ? <div className="flex flex-wrap items-end gap-2">{secondaryRow}</div> : null}
        </div>
    </header>
);

export default ContentPageHeader;
