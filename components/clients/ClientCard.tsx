import React, { useState, useContext } from 'react';
import { AppContext } from '../../contexts/AppContext';
import type { Client, ClientContact } from '../../types';
import { ChevronRightIcon, GlobeIcon, WhatsAppIcon, PhoneIcon } from '../icons';
import { formatPhoneNumber, resolveColorHex } from '../../lib/utils';
import { toUploadUrl } from '../../lib/api';
import { resolveClientImageUrl } from '../../lib/clientVisual';
import { cardSocialIcons } from './socialHelpers';
import TooltipHint from '../TooltipHint';

export const ClientCard: React.FC<{ client: Client; onSelect: () => void }> = ({ client, onSelect }) => {
    const ctx = useContext(AppContext);
    const t = ctx?.t ?? ((key: string) => key);
    const language = ctx?.language ?? 'pt';
    const [socialIndex, setSocialIndex] = useState(0);
    const links = client.socialLinks || [];
    const primaryContact = client.contacts?.find((c: ClientContact) => c.isPrimary) || client.contacts?.[0];
    const hasWa = !!(primaryContact?.whatsapp?.trim());
    const hasPhone = !!(primaryContact?.landlinePhone?.trim());
    const hasWebsite = !!(client.website?.trim());
    const hasSocial = links.length > 0;

    const imgUrl = resolveClientImageUrl(client);
    const barColor = resolveColorHex(client.color);
    const lang = (language || 'pt') as 'pt' | 'en' | 'es';

    return (
        <div
            onClick={onSelect}
            className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 flex flex-col cursor-pointer overflow-hidden transition-all duration-300 hover:shadow-xl hover:border-indigo-500/40 hover:-translate-y-1 dark:hover:border-indigo-500/50 h-[260px]"
        >
            <div className="h-[64px] flex-shrink-0 flex items-center pl-[112px] pr-4 relative overflow-visible" style={{ backgroundColor: barColor }}>
                <div className="absolute left-4 top-4 z-10">
                    {imgUrl ? (
                        <div
                            className="w-20 h-20 rounded-full overflow-hidden flex items-center justify-center border-4 border-white dark:border-gray-800 shadow-md"
                            style={{ backgroundColor: '#ffffff' }}
                        >
                            <img src={toUploadUrl(imgUrl)} alt={client.name} className="max-w-full max-h-full w-auto h-auto object-contain" style={{ background: 'transparent' }} />
                        </div>
                    ) : (
                        <div className="w-20 h-20 rounded-full flex items-center justify-center text-white text-2xl font-bold border-4 border-white dark:border-gray-800 shadow-md" style={{ backgroundColor: barColor }}>
                            {client.name?.charAt(0)?.toUpperCase() || '?'}
                        </div>
                    )}
                </div>
                <h3 className="text-lg font-bold text-white truncate flex-1 min-w-0 pt-2">{client.name}</h3>
            </div>

            <div className="pl-6 pr-4 pb-4 pt-12 flex flex-col gap-1.5 flex-1 min-h-0">
                {hasSocial && links.length > 0 && (() => {
                    const current = links[socialIndex % links.length];
                    const displayUrl = current.url?.replace(/^https?:\/\/(www\.)?/, '').replace(/\/$/, '') || '';
                    const Icon = cardSocialIcons[current.platform];
                    return (
                        <div className="flex items-center gap-1 min-h-[28px] min-w-0 w-fit max-w-full">
                            <a
                                href={current.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                onClick={(e) => e.stopPropagation()}
                                className="flex items-center gap-1.5 text-sm text-gray-600 dark:text-gray-400 hover:text-indigo-600 dark:hover:text-indigo-400 min-w-0 overflow-hidden"
                            >
                                <Icon className="w-4 h-4 shrink-0" />
                                <span className="truncate">{displayUrl}</span>
                            </a>
                            {links.length > 1 && (
                                <TooltipHint label={t('next_social_link')}>
                                    <button
                                        type="button"
                                        onClick={(e) => { e.stopPropagation(); setSocialIndex((i) => (i + 1) % links.length); }}
                                        className="p-1 rounded text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 shrink-0"
                                        aria-label={t('next_social_link')}
                                    >
                                        <ChevronRightIcon className="w-4 h-4" />
                                    </button>
                                </TooltipHint>
                            )}
                        </div>
                    );
                })()}
                {hasWebsite && (
                    <a
                        href={client.website!.startsWith('http') ? client.website! : `https://${client.website}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={(e) => e.stopPropagation()}
                        className="flex items-center gap-1.5 text-sm text-gray-600 dark:text-gray-400 hover:text-indigo-600 dark:hover:text-indigo-400 truncate"
                    >
                        <GlobeIcon className="w-4 h-4 shrink-0" />
                        <span className="truncate">{client.website!.replace(/^https?:\/\/(www\.)?/, '').replace(/\/$/, '')}</span>
                    </a>
                )}
                {hasWa && (
                    <a
                        href={`https://wa.me/${(primaryContact!.whatsapp || '').replace(/\D/g, '')}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={(e) => e.stopPropagation()}
                        className="flex items-center gap-1.5 text-sm text-gray-600 dark:text-gray-400 hover:text-indigo-600 dark:hover:text-indigo-400"
                    >
                        <WhatsAppIcon className="w-4 h-4 shrink-0" />
                        <span>{formatPhoneNumber(primaryContact!.whatsapp!, lang)}</span>
                    </a>
                )}
                {hasPhone && (
                    <a
                        href={`tel:${(primaryContact!.landlinePhone || '').replace(/\D/g, '')}`}
                        onClick={(e) => e.stopPropagation()}
                        className="flex items-center gap-1.5 text-sm text-gray-600 dark:text-gray-400 hover:text-indigo-600 dark:hover:text-indigo-400"
                    >
                        <PhoneIcon className="w-4 h-4 shrink-0" />
                        <span>{formatPhoneNumber(primaryContact!.landlinePhone!, lang)}</span>
                    </a>
                )}
            </div>
        </div>
    );
};
