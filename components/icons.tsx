
import React from 'react';

const IconBase: React.FC<{ children: React.ReactNode; className?: string }> = ({ children, className }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    {children}
  </svg>
);

export {
    StaticIcon,
    VideoIcon,
    CarouselIcon,
    ReelsIcon,
    StoryIcon,
    StickyNotesTaskIcon,
} from './mediaTypeIcons';
export const ClipboardListIcon: React.FC<{ className?: string }> = ({ className = 'w-4 h-4' }) => <IconBase className={className}><rect x="8" y="2" width="8" height="4" rx="1" ry="1"></rect><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"></path><line x1="12" y1="11" x2="12" y2="17"></line><line x1="9" y1="14" x2="15" y2="14"></line></IconBase>;
export const LayoutGridIcon: React.FC<{ className?: string }> = ({ className = 'w-5 h-5' }) => <IconBase className={className}><rect x="3" y="3" width="7" height="7" rx="1"></rect><rect x="14" y="3" width="7" height="7" rx="1"></rect><rect x="3" y="14" width="7" height="7" rx="1"></rect><rect x="14" y="14" width="7" height="7" rx="1"></rect></IconBase>;


export const PlusIcon: React.FC<{ className?: string }> = ({ className = 'w-5 h-5' }) => <IconBase className={className}><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></IconBase>;
export const ChevronLeftIcon: React.FC<{ className?: string }> = ({ className = 'w-5 h-5' }) => <IconBase className={className}><polyline points="15 18 9 12 15 6" /></IconBase>;
export const ChevronRightIcon: React.FC<{ className?: string }> = ({ className = 'w-5 h-5' }) => <IconBase className={className}><polyline points="9 18 15 12 9 6" /></IconBase>;
export const ChevronDownIcon: React.FC<{ className?: string }> = ({ className = 'w-5 h-5' }) => <IconBase className={className}><polyline points="6 9 12 15 18 9" /></IconBase>;
export const SunIcon: React.FC<{ className?: string }> = ({ className = 'w-6 h-6' }) => <IconBase className={className}><circle cx="12" cy="12" r="5" /><line x1="12" y1="1" x2="12" y2="3" /><line x1="12" y1="21" x2="12" y2="23" /><line x1="4.22" y1="4.22" x2="5.64" y2="5.64" /><line x1="18.36" y1="18.36" x2="19.78" y2="19.78" /><line x1="1" y1="12" x2="3" y2="12" /><line x1="21" y1="12" x2="23" y2="12" /><line x1="4.22" y1="19.78" x2="5.64" y2="18.36" /><line x1="18.36" y1="5.64" x2="19.78" y2="4.22" /></IconBase>;
export const MoonIcon: React.FC<{ className?: string }> = ({ className = 'w-6 h-6' }) => <IconBase className={className}><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" /></IconBase>;
export const GlobeIcon: React.FC<{ className?: string }> = ({ className = 'w-6 h-6' }) => <IconBase className={className}><circle cx="12" cy="12" r="10" /><line x1="2" y1="12" x2="22" y2="12" /><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" /></IconBase>;

export const HomeIcon: React.FC<{ className?: string }> = ({ className = 'w-6 h-6' }) => <IconBase className={className}><path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" /><polyline points="9 22 9 12 15 12 15 22" /></IconBase>;
export const CalendarIcon: React.FC<{ className?: string }> = ({ className = 'w-6 h-6' }) => <IconBase className={className}><rect x="3" y="4" width="18" height="18" rx="2" ry="2" /><line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" /></IconBase>;
export const UsersIcon: React.FC<{ className?: string }> = ({ className = 'w-6 h-6' }) => <IconBase className={className}><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M23 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" /></IconBase>;
export const DollarSignIcon: React.FC<{ className?: string }> = ({ className = 'w-6 h-6' }) => <IconBase className={className}><line x1="12" y1="1" x2="12" y2="23"></line><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"></path></IconBase>;
export const ZapIcon: React.FC<{ className?: string }> = ({ className = 'w-6 h-6' }) => <IconBase className={className}><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" /></IconBase>;
export const SettingsIcon: React.FC<{ className?: string }> = ({ className = 'w-6 h-6' }) => <IconBase className={className}><circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" /></IconBase>;
export const XIcon: React.FC<{ className?: string }> = ({ className = 'w-6 h-6' }) => <IconBase className={className}><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></IconBase>;
export const TrashIcon: React.FC<{ className?: string }> = ({ className = 'w-5 h-5' }) => <IconBase className={className}><polyline points="3 6 5 6 21 6" /><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" /><line x1="10" y1="11" x2="10" y2="17" /><line x1="14" y1="11" x2="14" y2="17" /></IconBase>;
export const EditIcon: React.FC<{ className?: string }> = ({ className = 'w-4 h-4' }) => <IconBase className={className}><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" /><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" /></IconBase>;

export const BellIcon: React.FC<{ className?: string }> = ({ className = 'w-6 h-6' }) => <IconBase className={className}><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" /><path d="M13.73 21a2 2 0 0 1-3.46 0" /></IconBase>;
export const CheckCircleIcon: React.FC<{ className?: string }> = ({ className = 'w-6 h-6' }) => <IconBase className={className}><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" /><polyline points="22 4 12 14.01 9 11.01" /></IconBase>;
export const CheckIcon: React.FC<{ className?: string }> = ({ className = 'w-6 h-6' }) => <IconBase className={className}><polyline points="20 6 9 17 4 12" /></IconBase>;
export const CheckSquareIcon: React.FC<{ className?: string }> = ({ className = 'w-4 h-4' }) => <IconBase className={className}><polyline points="9 11 12 14 22 4"></polyline><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"></path></IconBase>;
export const ClockIcon: React.FC<{ className?: string }> = ({ className = 'w-6 h-6' }) => <IconBase className={className}><circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" /></IconBase>;
/** Despertador — previsão de post na Agenda (mesmo traço minimalista dos demais ícones). */
export const AlarmClockIcon: React.FC<{ className?: string }> = ({ className = 'w-4 h-4' }) => (
    <IconBase className={className}>
        <circle cx="12" cy="13" r="7" />
        <polyline points="12 10 12 13 14 14" />
        <line x1="5" y1="3" x2="3" y2="5" />
        <line x1="19" y1="3" x2="21" y2="5" />
        <line x1="3" y1="13" x2="1" y2="13" />
        <line x1="23" y1="13" x2="21" y2="13" />
    </IconBase>
);
export const AlertTriangleIcon: React.FC<{ className?: string }> = ({ className = 'w-6 h-6' }) => <IconBase className={className}><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" /><line x1="12" y1="9" x2="12" y2="13" /><line x1="12" y1="17" x2="12.01" y2="17" /></IconBase>;
export const InfoIcon: React.FC<{ className?: string }> = ({ className = 'w-6 h-6' }) => <IconBase className={className}><circle cx="12" cy="12" r="10" /><line x1="12" y1="16" x2="12" y2="12" /><line x1="12" y1="8" x2="12.01" y2="8" /></IconBase>;
export const GripVerticalIcon: React.FC<{ className?: string }> = ({ className = 'w-5 h-5' }) => <IconBase className={className}><circle cx="9" cy="12" r="1" /><circle cx="9" cy="5" r="1" /><circle cx="9" cy="19" r="1" /><circle cx="15" cy="12" r="1" /><circle cx="15" cy="5" r="1" /><circle cx="15" cy="19" r="1" /></IconBase>;
export const EllipsisVerticalIcon: React.FC<{ className?: string }> = ({ className = 'w-5 h-5' }) => <IconBase className={className}><circle cx="12" cy="6" r="1.25" /><circle cx="12" cy="12" r="1.25" /><circle cx="12" cy="18" r="1.25" /></IconBase>;
export const UploadCloudIcon: React.FC<{ className?: string }> = ({ className = 'w-6 h-6' }) => <IconBase className={className}><path d="M4 14.899A7 7 0 1 1 15.71 8h1.79a4.5 4.5 0 0 1 2.5 8.242" /><path d="M12 12v9" /><path d="m16 16-4-4-4 4" /></IconBase>;
export const EyeIcon: React.FC<{ className?: string }> = ({ className = 'w-5 h-5' }) => <IconBase className={className}><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" /><circle cx="12" cy="12" r="3" /></IconBase>;
export const EyeOffIcon: React.FC<{ className?: string }> = ({ className = 'w-5 h-5' }) => <IconBase className={className}><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" /><line x1="1" y1="1" x2="23" y2="23" /></IconBase>;
export const MenuIcon: React.FC<{ className?: string }> = ({ className = 'w-6 h-6' }) => <IconBase className={className}><line x1="3" y1="12" x2="21" y2="12"></line><line x1="3" y1="6" x2="21" y2="6"></line><line x1="3" y1="18" x2="21" y2="18"></line></IconBase>;
export const SlidersHorizontalIcon: React.FC<{ className?: string }> = ({ className = 'w-5 h-5' }) => <IconBase className={className}><line x1="21" y1="10" x2="3" y2="10"></line><line x1="21" y1="6" x2="3" y2="6"></line><line x1="21" y1="14" x2="3" y2="14"></line><line x1="21" y1="18" x2="3" y2="18"></line></IconBase>;
/** Funil — filtros / “ver só este cliente” no planejamento editorial. */
export const FunnelIcon: React.FC<{ className?: string }> = ({ className = 'w-4 h-4' }) => (
    <IconBase className={className}>
        <path d="M22 3H2l8 9.46V19l4 2v-8.54L22 3z" />
    </IconBase>
);
export const CopyIcon: React.FC<{ className?: string }> = ({ className = 'w-5 h-5' }) => <IconBase className={className}><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></IconBase>;

export const UserCircleIcon: React.FC<{ className?: string }> = ({ className = 'w-6 h-6' }) => <IconBase className={className}><path d="M5.52 19c.64-2.2 1.84-3 3.22-3h6.52c1.38 0 2.58.8 3.22 3" /><circle cx="12" cy="10" r="3" /><circle cx="12" cy="12" r="10" /></IconBase>;
/** "Em execução por" — em cards brancos use `CARD_ROW_CALENDAR_EXEC_ICON_CLASS` (downscale óptico) de `lib/cardRowVisual`. */
export const TaskExecutionByIcon: React.FC<{ className?: string }> = ({ className = 'h-6 w-6' }) => (
	<IconBase className={className}>
		<path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
		<circle cx="12" cy="7" r="4" />
	</IconBase>
);
export const SaveIcon: React.FC<{ className?: string }> = ({ className = 'w-5 h-5' }) => <IconBase className={className}><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z" /><polyline points="17 21 17 13 7 13 7 21" /><polyline points="7 3 7 8 15 8" /></IconBase>;
export const LogOutIcon: React.FC<{ className?: string }> = ({ className = 'w-5 h-5' }) => <IconBase className={className}><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path><polyline points="16 17 21 12 16 7"></polyline><line x1="21" y1="12" x2="9" y2="12"></line></IconBase>;
export const GoogleIcon: React.FC<{ className?: string }> = ({ className = 'w-5 h-5' }) => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" className={className}>
        <path fill="#FFC107" d="M43.611,20.083H42V20H24v8h11.303c-1.649,4.657-6.08,8-11.303,8c-6.627,0-12-5.373-12-12s5.373-12,12-12c3.059,0,5.842,1.154,7.961,3.039l5.657-5.657C34.046,6.053,29.268,4,24,4C12.955,4,4,12.955,4,24s8.955,20,20,20s20-8.955,20-20C44,22.659,43.862,21.35,43.611,20.083z"></path>
        <path fill="#FF3D00" d="M6.306,14.691l6.571,4.819C14.655,15.108,18.961,12,24,12c3.059,0,5.842,1.154,7.961,3.039l5.657-5.657C34.046,6.053,29.268,4,24,4C16.318,4,9.656,8.337,6.306,14.691z"></path>
        <path fill="#4CAF50" d="M24,44c5.166,0,9.86-1.977,13.409-5.192l-6.19-5.238C29.211,35.091,26.715,36,24,36c-5.223,0-9.657-3.357-11.303-8H6.393c3.56,7.625,11.23,13,19.607,13C21.72,44,22.863,44,24,44z"></path>
        <path fill="#1976D2" d="M43.611,20.083H42V20H24v8h11.303c-0.792,2.237-2.231,4.166-4.087,5.571l6.19,5.238C43.021,36.213,44,34,44,24C44,22.659,43.862,21.35,43.611,20.083z"></path>
    </svg>
);
export const PaletteIcon: React.FC<{ className?: string }> = ({ className = 'w-5 h-5' }) => <IconBase className={className}><circle cx="13.5" cy="6.5" r=".5" fill="currentColor"/><circle cx="17.5" cy="10.5" r=".5" fill="currentColor"/><circle cx="17.5" cy="14.5" r=".5" fill="currentColor"/><circle cx="13.5" cy="18.5" r=".5" fill="currentColor"/><path d="M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10z"/><path d="M12 18.5A6.5 6.5 0 1 1 18.5 12"/></IconBase>;
export const PaintBrushIcon: React.FC<{ className?: string }> = ({ className = 'w-5 h-5' }) => (
  <IconBase className={className}>
    <path d="M5 19Q5 16 7 14L18 5"/>
    <path d="M8 12L17 6"/>
  </IconBase>
);
export const ShieldIcon: React.FC<{ className?: string }> = ({ className = 'w-5 h-5' }) => <IconBase className={className}><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" /></IconBase>;
/** Bloquear / banir — uso em “desativar acesso” (estilo Lucide Ban). */
export const BanIcon: React.FC<{ className?: string }> = ({ className = 'w-5 h-5' }) => (
	<IconBase className={className}>
		<circle cx="12" cy="12" r="10" />
		<line x1="4.93" y1="4.93" x2="19.07" y2="19.07" />
	</IconBase>
);
export const GoogleDriveIcon: React.FC<{ className?: string }> = ({ className = 'w-6 h-6' }) => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
        <path d="M18.96 11.91 12 22.14 5.04 11.91"/><path d="m5.04 11.91 6.96-10.23 6.96 10.23"/><path d="M22.14 15.09 12 15.09l-3.03-4.52"/>
    </svg>
);

export const SendIcon: React.FC<{ className?: string }> = ({ className = 'w-5 h-5' }) => <IconBase className={className}><line x1="22" y1="2" x2="11" y2="13"></line><polygon points="22 2 15 22 11 13 2 9 22 2"></polygon></IconBase>;
export const SparklesIcon: React.FC<{ className?: string }> = ({ className = 'w-6 h-6' }) => <IconBase className={className}><path d="M12 2L14.5 9.5L22 12L14.5 14.5L12 22L9.5 14.5L2 12L9.5 9.5L12 2Z"/><path d="M5 3L6 5.5L8.5 6.5L6 7.5L5 10L4 7.5L1.5 6.5L4 5.5L5 3Z"/><path d="M19 14L20 16.5L22.5 17.5L20 18.5L19 21L18 18.5L15.5 17.5L18 16.5L19 14Z"/></IconBase>;

export const LinkIcon: React.FC<{ className?: string }> = ({ className = 'w-5 h-5' }) => <IconBase className={className}><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.72"></path><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.72-1.72"></path></IconBase>;
export const AtSignIcon: React.FC<{ className?: string }> = ({ className = 'w-5 h-5' }) => <IconBase className={className}><circle cx="12" cy="12" r="4"></circle><path d="M16 8v5a3 3 0 0 0 6 0v-1a10 10 0 1 0-3.92 7.94"></path></IconBase>;
export const PhoneIcon: React.FC<{ className?: string }> = ({ className = 'w-5 h-5' }) => <IconBase className={className}><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"></path></IconBase>;
export const FileTextIcon: React.FC<{ className?: string }> = ({ className = 'w-5 h-5' }) => <IconBase className={className}><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line><polyline points="10 9 9 9 8 9"></polyline></IconBase>;
export const TypeIcon: React.FC<{ className?: string }> = ({ className = 'w-5 h-5' }) => <IconBase className={className}><polyline points="4 7 4 4 20 4 20 7"></polyline><line x1="9" y1="20" x2="15" y2="20"></line><line x1="12" y1="4" x2="12" y2="20"></line></IconBase>;
export const StarIcon: React.FC<{ className?: string }> = ({ className = 'w-5 h-5' }) => <IconBase className={className}><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon></IconBase>;
export const KeyIcon: React.FC<{ className?: string }> = ({ className = 'w-5 h-5' }) => <IconBase className={className}><path d="M21 2l-2 2m-7.61 7.61a5.5 5.5 0 1 1-7.778 7.778 5.5 5.5 0 0 1 7.777-7.777zm0 0L15.5 7.5m0 0l3 3L22 7l-3-3m-3.5 3.5L19 4"></path></IconBase>;
export const BriefcaseIcon: React.FC<{ className?: string }> = ({ className = 'w-5 h-5' }) => <IconBase className={className}><rect x="2" y="7" width="20" height="14" rx="2" ry="2"></rect><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"></path></IconBase>;
export const BuildingIcon: React.FC<{ className?: string }> = ({ className = 'w-5 h-5' }) => <IconBase className={className}><path d="M3 21h18M5 21V7l8-4 8 4v14M10 9a3 3 0 0 1 3 3v9" /></IconBase>;
export const MapPinIcon: React.FC<{ className?: string }> = ({ className = 'w-5 h-5' }) => <IconBase className={className}><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" /><circle cx="12" cy="10" r="3" /></IconBase>;

// New Icons for SaaS/Teams
export const CreditCardIcon: React.FC<{ className?: string }> = ({ className = 'w-6 h-6' }) => <IconBase className={className}><rect x="1" y="4" width="22" height="16" rx="2" ry="2"></rect><line x1="1" y1="10" x2="23" y2="10"></line></IconBase>;
export const ShieldCheckIcon: React.FC<{ className?: string }> = ({ className = 'w-6 h-6' }) => <IconBase className={className}><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" /><polyline points="9 12 11 14 15 10" /></IconBase>;
export const UserPlusIcon: React.FC<{ className?: string }> = ({ className = 'w-6 h-6' }) => <IconBase className={className}><path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="8.5" cy="7" r="4"></circle><line x1="20" y1="8" x2="20" y2="14"></line><line x1="23" y1="11" x2="17" y2="11"></line></IconBase>;
export const HistoryIcon: React.FC<{ className?: string }> = ({ className = 'w-6 h-6' }) => <IconBase className={className}><path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/><path d="M12 7v5l4 2"/></IconBase>;
export const TrendingUpIcon: React.FC<{ className?: string }> = ({ className = 'w-6 h-6' }) => <IconBase className={className}><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"></polyline><polyline points="17 6 23 6 23 12"></polyline></IconBase>;
export const TrendingDownIcon: React.FC<{ className?: string }> = ({ className = 'w-6 h-6' }) => <IconBase className={className}><polyline points="23 18 13.5 8.5 8.5 13.5 1 6"></polyline><polyline points="17 18 23 18 23 12"></polyline></IconBase>;
export const ArrowUpIcon: React.FC<{ className?: string }> = ({ className = 'w-6 h-6' }) => <IconBase className={className}><line x1="12" y1="19" x2="12" y2="5"></line><polyline points="5 12 12 5 19 12"></polyline></IconBase>;
export const ArrowDownIcon: React.FC<{ className?: string }> = ({ className = 'w-6 h-6' }) => <IconBase className={className}><line x1="12" y1="5" x2="12" y2="19"></line><polyline points="19 12 12 19 5 12"></polyline></IconBase>;
export const ExternalLinkIcon: React.FC<{ className?: string }> = ({ className = 'w-5 h-5' }) => <IconBase className={className}><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path><polyline points="15 3 21 3 21 9"></polyline><line x1="10" y1="14" x2="21" y2="3"></line></IconBase>;

// Social Media Icons
const SocialIconBase: React.FC<{ children: React.ReactNode; className?: string }> = ({ children, className }) => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>{children}</svg>
);
export const InstagramIcon: React.FC<{ className?: string }> = ({ className = "w-5 h-5" }) => <SocialIconBase className={className}><rect x="2" y="2" width="20" height="20" rx="5" ry="5"></rect><path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"></path><line x1="17.5" y1="6.5" x2="17.51" y2="6.5"></line></SocialIconBase>;
export const FacebookIcon: React.FC<{ className?: string }> = ({ className = "w-5 h-5" }) => <SocialIconBase className={className}><path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z"></path></SocialIconBase>;
export const LinkedinIcon: React.FC<{ className?: string }> = ({ className = "w-5 h-5" }) => <SocialIconBase className={className}><path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6z"></path><rect x="2" y="9" width="4" height="12"></rect><circle cx="4" cy="4" r="2"></circle></SocialIconBase>;
export const TiktokIcon: React.FC<{ className?: string }> = ({ className = "w-5 h-5" }) => <SocialIconBase className={className}><path d="M12 12a4 4 0 1 0 4 4V8a8 8 0 1 0-8 8"></path></SocialIconBase>;
export const YoutubeIcon: React.FC<{ className?: string }> = ({ className = "w-5 h-5" }) => <SocialIconBase className={className}><path d="M22.54 6.42a2.78 2.78 0 0 0-1.94-2C18.88 4 12 4 12 4s-6.88 0-8.6.46a2.78 2.78 0 0 0-1.94 2A29 29 0 0 0 1 11.75a29 29 0 0 0 .46 5.33A2.78 2.78 0 0 0 3.4 19c1.72.46 8.6.46 8.6.46s6.88 0 8.6-.46a2.78 2.78 0 0 0 1.94-2 29 29 0 0 0 .46-5.25 29 29 0 0 0-.46-5.33z"></path><polygon points="9.75 15.02 15.5 11.75 9.75 8.48 9.75 15.02"></polygon></SocialIconBase>;
export const XIconSocial: React.FC<{ className?: string }> = ({ className = "w-5 h-5" }) => <SocialIconBase className={className}><path d="M18 6L6 18M6 6l12 12"></path></SocialIconBase>;
export const PinterestIcon: React.FC<{ className?: string }> = ({ className = "w-5 h-5" }) => <SocialIconBase className={className}><path d="M12.5 12c-1 0-2 .5-2 2s1 2 2 2 2-1 2-2-1-2-2-2zm-5 0c0-4 3-7 7-7s7 3 7 7c0 3-2 5-2 5s-1-4-1-4c-1 2-3 2-3 2s-1-2-1-3c0-1 0-2 1-2s1 1 1 1c1 0 2-2 1-3s-3-1-3-1c-2 0-3 2-3 3z"></path><circle cx="12" cy="12" r="10"></circle></SocialIconBase>;
/** Ícone WhatsApp em estilo outline (bolha de chat), alinhado aos demais ícones sociais */
export const WhatsAppIcon: React.FC<{ className?: string }> = ({ className = "w-5 h-5" }) => (
    <SocialIconBase className={className}>
        <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" />
    </SocialIconBase>
);
