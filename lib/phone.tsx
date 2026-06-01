import React from 'react';

export type Country = { code: string; dial: string; name: string; flagSvg: React.ReactNode };

// Minimal inline SVG flags for consistent rendering on all OS/browsers.
// For compactness, many flags are approximations with main colors/stripes only.
const W = 20, H = 14;
const rect = (fill: string, y = 0, h = H, x = 0, w = W) => <rect x={x} y={y} width={w} height={h} fill={fill}/>;

export const getFlagSvg = (code: string): React.ReactNode => {
  switch ((code || '').toUpperCase()) {
    case 'BR': return (
      <svg width="20" height="14" viewBox={`0 0 ${W} ${H}`} aria-hidden="true">
        {rect('#009B3A')}
        <polygon points="10,2 17,7 10,12 3,7" fill="#FFDF00"/>
        <circle cx="10" cy="7" r="3" fill="#002776"/>
      </svg>
    );
    case 'US': return (
      <svg width="20" height="14" viewBox={`0 0 ${W} ${H}`} aria-hidden="true">
        {rect('#B22234')}
        {[...Array(6)].map((_,i)=><rect key={i} y={i*2+1} width={W} height={1} fill="#FFFFFF"/>)}
        <rect width={9} height={7} fill="#3C3B6E"/>
        {[...Array(3)].map((_,r)=>[...Array(4)].map((_,c)=>(
          <circle key={`${r}-${c}`} cx={1.2 + c*2} cy={1 + r*2} r={0.25} fill="#FFFFFF"/>
        )))}
      </svg>
    );
    case 'AR': return (
      <svg width="20" height="14" viewBox={`0 0 ${W} ${H}`} aria-hidden="true">
        {rect('#75AADB')}
        {rect('#FFFFFF', 4, 6)}
        <circle cx="10" cy="7" r="1.5" fill="#F6B40E"/>
      </svg>
    );
    case 'PT': return (
      <svg width="20" height="14" viewBox={`0 0 ${W} ${H}`} aria-hidden="true">
        {rect('#FF0000')}
        {rect('#006600', 0, H, 0, 8)}
        <circle cx="8" cy="7" r="2.2" fill="#FFCC00"/>
      </svg>
    );
    case 'ES': return (
      <svg width="20" height="14" viewBox={`0 0 ${W} ${H}`} aria-hidden="true">
        {rect('#AA151B')}
        {rect('#F1BF00', 3, 8)}
      </svg>
    );
    case 'FR': return (
      <svg width="20" height="14" viewBox={`0 0 ${W} ${H}`} aria-hidden="true">
        {rect('#ED2939')}
        {rect('#FFFFFF', 0, H, 0, 13.3)}
        {rect('#002395', 0, H, 0, 6.6)}
      </svg>
    );
    case 'DE': return (
      <svg width="20" height="14" viewBox={`0 0 ${W} ${H}`} aria-hidden="true">
        {rect('#000000')}
        {rect('#DD0000', H/3, H/3)}
        {rect('#FFCE00', (2*H)/3, H/3)}
      </svg>
    );
    case 'IT': return (
      <svg width="20" height="14" viewBox={`0 0 ${W} ${H}`} aria-hidden="true">
        {rect('#CE2B37')}
        {rect('#FFFFFF', 0, H, 0, W/3*2)}
        {rect('#009246', 0, H, 0, W/3)}
      </svg>
    );
    case 'GB': return (
      <svg width="20" height="14" viewBox={`0 0 ${W} ${H}`} aria-hidden="true">
        {rect('#012169')}
        <polygon points="0,0 8,0 20,9 20,14 12,14 0,5" fill="#FFFFFF"/>
        <polygon points="12,0 20,0 20,5 8,14 0,14 0,9" fill="#FFFFFF"/>
        <polygon points="0,0 9,0 20,7 20,9 11,9 0,2" fill="#C8102E"/>
        <polygon points="20,14 11,14 0,7 0,5 9,5 20,12" fill="#C8102E"/>
        <rect x={8} width={4} height={14} fill="#FFFFFF"/>
        <rect y={5} width={20} height={4} fill="#FFFFFF"/>
        <rect x={9} width={2} height={14} fill="#C8102E"/>
        <rect y={6} width={20} height={2} fill="#C8102E"/>
      </svg>
    );
    case 'IE': return (
      <svg width="20" height="14" viewBox={`0 0 ${W} ${H}`} aria-hidden="true">
        {rect('#FF883E')}
        {rect('#FFFFFF', 0, H, 0, W*2/3)}
        {rect('#169B62', 0, H, 0, W/3)}
      </svg>
    );
    case 'NL': return (
      <svg width="20" height="14" viewBox={`0 0 ${W} ${H}`} aria-hidden="true">
        {rect('#AE1C28')}
        {rect('#FFFFFF', H/3, H/3)}
        {rect('#21468B', (2*H)/3, H/3)}
      </svg>
    );
    case 'BE': return (
      <svg width="20" height="14" viewBox={`0 0 ${W} ${H}`} aria-hidden="true">
        {rect('#ED2939')}
        {rect('#FFD90C', 0, H, 0, W*2/3)}
        {rect('#000000', 0, H, 0, W/3)}
      </svg>
    );
    case 'CH': return (
      <svg width="20" height="14" viewBox={`0 0 ${W} ${H}`} aria-hidden="true">
        {rect('#D52B1E')}
        <rect x={7} y={3} width={6} height={8} fill="#FFFFFF"/>
        <rect x={5} y={5} width={10} height={4} fill="#FFFFFF"/>
      </svg>
    );
    case 'AT': return (
      <svg width="20" height="14" viewBox={`0 0 ${W} ${H}`} aria-hidden="true">
        {rect('#ED2939')}
        {rect('#FFFFFF', H/3, H/3)}
      </svg>
    );
    case 'CA': return (
      <svg width="20" height="14" viewBox={`0 0 ${W} ${H}`} aria-hidden="true">
        {rect('#FF0000')}
        {rect('#FFFFFF', 0, H, W/4, W/2)}
        <rect x={9} y={3} width={2} height={8} fill="#FF0000"/>
      </svg>
    );
    case 'MX': return (
      <svg width="20" height="14" viewBox={`0 0 ${W} ${H}`} aria-hidden="true">
        {rect('#CE1126')}
        {rect('#FFFFFF', 0, H, W/3, W/3)}
        {rect('#006847', 0, H, 0, W/3)}
        <circle cx={10} cy={7} r={1.2} fill="#CE1126"/>
      </svg>
    );
    case 'CL': return (
      <svg width="20" height="14" viewBox={`0 0 ${W} ${H}`} aria-hidden="true">
        {rect('#D52B1E', H/2, H/2)}
        {rect('#FFFFFF', 0, H/2)}
        <rect width={W/3} height={H/2} fill="#0039A6"/>
        <circle cx={W/6} cy={H/4} r={1} fill="#FFFFFF"/>
      </svg>
    );
    case 'CO': return (
      <svg width="20" height="14" viewBox={`0 0 ${W} ${H}`} aria-hidden="true">
        {rect('#FCD116', 0, H/2)}
        {rect('#003893', H/2, H/4)}
        {rect('#CE1126', (3*H)/4, H/4)}
      </svg>
    );
    case 'PE': return (
      <svg width="20" height="14" viewBox={`0 0 ${W} ${H}`} aria-hidden="true">
        {rect('#D91023')}
        {rect('#FFFFFF', 0, H, W/3, W/3)}
      </svg>
    );
    case 'UY': return (
      <svg width="20" height="14" viewBox={`0 0 ${W} ${H}`} aria-hidden="true">
        {rect('#FFFFFF')}
        {[...Array(4)].map((_,i)=> <rect key={i} y={i*3+1} width={W} height={1} fill="#0038A8"/>)}
        <rect width={W/3} height={H/2} fill="#FFFFFF"/>
        <circle cx={W/6} cy={H/4} r={1.2} fill="#FCD116"/>
      </svg>
    );
    case 'PY': return (
      <svg width="20" height="14" viewBox={`0 0 ${W} ${H}`} aria-hidden="true">
        {rect('#D52B1E')}
        {rect('#FFFFFF', H/3, H/3)}
        {rect('#0038A8', (2*H)/3, H/3)}
      </svg>
    );
    case 'BO': return (
      <svg width="20" height="14" viewBox={`0 0 ${W} ${H}`} aria-hidden="true">
        {rect('#D52B1E')}
        {rect('#FCD116', H/3, H/3)}
        {rect('#007934', (2*H)/3, H/3)}
      </svg>
    );
    case 'VE': return (
      <svg width="20" height="14" viewBox={`0 0 ${W} ${H}`} aria-hidden="true">
        {rect('#F4D900', 0, H/3)}
        {rect('#0033A0', H/3, H/3)}
        {rect('#EF3340', (2*H)/3, H/3)}
      </svg>
    );
    case 'EC': return (
      <svg width="20" height="14" viewBox={`0 0 ${W} ${H}`} aria-hidden="true">
        {rect('#FFD100', 0, H/2)}
        {rect('#034EA2', H/2, H/4)}
        {rect('#E03C31', (3*H)/4, H/4)}
      </svg>
    );
    case 'GT': return (
      <svg width="20" height="14" viewBox={`0 0 ${W} ${H}`} aria-hidden="true">
        {rect('#4997D0')}
        {rect('#FFFFFF', 0, H, W/3, W/3)}
      </svg>
    );
    case 'CR': return (
      <svg width="20" height="14" viewBox={`0 0 ${W} ${H}`} aria-hidden="true">
        {rect('#002B7F')}
        {rect('#FFFFFF', 2, 10)}
        {rect('#CE1126', 3, 8)}
        {rect('#FFFFFF', 6, 5)}
        {rect('#002B7F', 7, 4)}
      </svg>
    );
    case 'PA': return (
      <svg width="20" height="14" viewBox={`0 0 ${W} ${H}`} aria-hidden="true">
        {rect('#FFFFFF')}
        {rect('#005293', 0, H/2, 0, W/2)}
        {rect('#D21034', H/2, H/2, W/2, W/2)}
      </svg>
    );
    case 'HN': return (
      <svg width="20" height="14" viewBox={`0 0 ${W} ${H}`} aria-hidden="true">
        {rect('#18AAE2')}
        {rect('#FFFFFF', H/3, H/3)}
      </svg>
    );
    case 'NI': return (
      <svg width="20" height="14" viewBox={`0 0 ${W} ${H}`} aria-hidden="true">
        {rect('#0067C6')}
        {rect('#FFFFFF', H/3, H/3)}
      </svg>
    );
    case 'SV': return (
      <svg width="20" height="14" viewBox={`0 0 ${W} ${H}`} aria-hidden="true">
        {rect('#0047AB')}
        {rect('#FFFFFF', H/3, H/3)}
      </svg>
    );
    case 'JP': return (
      <svg width="20" height="14" viewBox={`0 0 ${W} ${H}`} aria-hidden="true">
        {rect('#FFFFFF')}
        <circle cx={10} cy={7} r={3} fill="#BC002D"/>
      </svg>
    );
    case 'KR': return (
      <svg width="20" height="14" viewBox={`0 0 ${W} ${H}`} aria-hidden="true">
        {rect('#FFFFFF')}
        <circle cx={10} cy={7} r={3} fill="#003478"/>
        <circle cx={10} cy={7} r={3} fill="#C60C30" style={{clipPath:'inset(50% 0 0 0)'}}/>
      </svg>
    );
    case 'IN': return (
      <svg width="20" height="14" viewBox={`0 0 ${W} ${H}`} aria-hidden="true">
        {rect('#FF9933')}
        {rect('#FFFFFF', H/3, H/3)}
        {rect('#138808', (2*H)/3, H/3)}
        <circle cx={10} cy={7} r={1.2} fill="#000080"/>
      </svg>
    );
    case 'CN': return (
      <svg width="20" height="14" viewBox={`0 0 ${W} ${H}`} aria-hidden="true">
        {rect('#DE2910')}
        <circle cx={5} cy={4} r={1.2} fill="#FFDE00"/>
        <circle cx={7.5} cy={2} r={0.5} fill="#FFDE00"/>
        <circle cx={8.5} cy={3.5} r={0.5} fill="#FFDE00"/>
        <circle cx={8.2} cy={5.5} r={0.5} fill="#FFDE00"/>
        <circle cx={7} cy={6.8} r={0.5} fill="#FFDE00"/>
      </svg>
    );
    case 'AU': return (
      <svg width="20" height="14" viewBox={`0 0 ${W} ${H}`} aria-hidden="true">
        {rect('#00008B')}
        {/* simplified UK canton */}
        <rect width={8} height={6} fill="#012169"/>
        <rect x={3} width={2} height={6} fill="#FFFFFF"/>
        <rect y={2} width={8} height={2} fill="#FFFFFF"/>
        <rect x={3.5} width={1} height={6} fill="#C8102E"/>
        <rect y={2.5} width={8} height={1} fill="#C8102E"/>
      </svg>
    );
    case 'NZ': return (
      <svg width="20" height="14" viewBox={`0 0 ${W} ${H}`} aria-hidden="true">
        {rect('#00247D')}
        <rect width={8} height={6} fill="#012169"/>
        <rect x={3} width={2} height={6} fill="#FFFFFF"/>
        <rect y={2} width={8} height={2} fill="#FFFFFF"/>
        <rect x={3.5} width={1} height={6} fill="#C8102E"/>
        <rect y={2.5} width={8} height={1} fill="#C8102E"/>
      </svg>
    );
    case 'ZA': return (
      <svg width="20" height="14" viewBox={`0 0 ${W} ${H}`} aria-hidden="true">
        {rect('#FFB612')}
        {rect('#FFFFFF', H/3, H/3)}
        <polygon points="0,0 8,7 0,14" fill="#007A4D"/>
      </svg>
    );
    case 'RU': return (
      <svg width="20" height="14" viewBox={`0 0 ${W} ${H}`} aria-hidden="true">
        {rect('#FFFFFF')}
        {rect('#0039A6', H/3, H/3)}
        {rect('#D52B1E', (2*H)/3, H/3)}
      </svg>
    );
    case 'TR': return (
      <svg width="20" height="14" viewBox={`0 0 ${W} ${H}`} aria-hidden="true">
        {rect('#E30A17')}
        <circle cx={8} cy={7} r={3} fill="#FFFFFF"/>
        <circle cx={8.7} cy={7} r={2.2} fill="#E30A17"/>
        <circle cx={10} cy={7} r={0.9} fill="#FFFFFF"/>
      </svg>
    );
    case 'AE': return (
      <svg width="20" height="14" viewBox={`0 0 ${W} ${H}`} aria-hidden="true">
        {rect('#FFFFFF')}
        {rect('#00732F', 0, H/3)}
        {rect('#000000', (2*H)/3, H/3)}
        {rect('#FF0000', 0, H, 0, W/4)}
      </svg>
    );
    default: return (
      <svg width="20" height="14" viewBox={`0 0 ${W} ${H}`} aria-hidden="true">
        {rect('#CCCCCC')}
        {rect('#999999', H/2, H/2)}
      </svg>
    );
  }
};

export const COUNTRIES: Country[] = [
  { code: 'BR', dial: '+55', name: 'Brasil', flagSvg: getFlagSvg('BR') },
  { code: 'US', dial: '+1', name: 'Estados Unidos', flagSvg: getFlagSvg('US') },
  { code: 'CA', dial: '+1', name: 'Canadá', flagSvg: getFlagSvg('CA') },
  { code: 'MX', dial: '+52', name: 'México', flagSvg: getFlagSvg('MX') },
  { code: 'AR', dial: '+54', name: 'Argentina', flagSvg: getFlagSvg('AR') },
  { code: 'CL', dial: '+56', name: 'Chile', flagSvg: getFlagSvg('CL') },
  { code: 'CO', dial: '+57', name: 'Colômbia', flagSvg: getFlagSvg('CO') },
  { code: 'PE', dial: '+51', name: 'Peru', flagSvg: getFlagSvg('PE') },
  { code: 'UY', dial: '+598', name: 'Uruguai', flagSvg: getFlagSvg('UY') },
  { code: 'PY', dial: '+595', name: 'Paraguai', flagSvg: getFlagSvg('PY') },
  { code: 'BO', dial: '+591', name: 'Bolívia', flagSvg: getFlagSvg('BO') },
  { code: 'VE', dial: '+58', name: 'Venezuela', flagSvg: getFlagSvg('VE') },
  { code: 'EC', dial: '+593', name: 'Equador', flagSvg: getFlagSvg('EC') },
  { code: 'GT', dial: '+502', name: 'Guatemala', flagSvg: getFlagSvg('GT') },
  { code: 'CR', dial: '+506', name: 'Costa Rica', flagSvg: getFlagSvg('CR') },
  { code: 'PA', dial: '+507', name: 'Panamá', flagSvg: getFlagSvg('PA') },
  { code: 'HN', dial: '+504', name: 'Honduras', flagSvg: getFlagSvg('HN') },
  { code: 'NI', dial: '+505', name: 'Nicarágua', flagSvg: getFlagSvg('NI') },
  { code: 'SV', dial: '+503', name: 'El Salvador', flagSvg: getFlagSvg('SV') },
  { code: 'PT', dial: '+351', name: 'Portugal', flagSvg: getFlagSvg('PT') },
  { code: 'ES', dial: '+34', name: 'Espanha', flagSvg: getFlagSvg('ES') },
  { code: 'FR', dial: '+33', name: 'França', flagSvg: getFlagSvg('FR') },
  { code: 'DE', dial: '+49', name: 'Alemanha', flagSvg: getFlagSvg('DE') },
  { code: 'IT', dial: '+39', name: 'Itália', flagSvg: getFlagSvg('IT') },
  { code: 'GB', dial: '+44', name: 'Reino Unido', flagSvg: getFlagSvg('GB') },
  { code: 'IE', dial: '+353', name: 'Irlanda', flagSvg: getFlagSvg('IE') },
  { code: 'NL', dial: '+31', name: 'Holanda', flagSvg: getFlagSvg('NL') },
  { code: 'BE', dial: '+32', name: 'Bélgica', flagSvg: getFlagSvg('BE') },
  { code: 'CH', dial: '+41', name: 'Suíça', flagSvg: getFlagSvg('CH') },
  { code: 'AT', dial: '+43', name: 'Áustria', flagSvg: getFlagSvg('AT') },
  { code: 'JP', dial: '+81', name: 'Japão', flagSvg: getFlagSvg('JP') },
  { code: 'KR', dial: '+82', name: 'Coreia do Sul', flagSvg: getFlagSvg('KR') },
  { code: 'IN', dial: '+91', name: 'Índia', flagSvg: getFlagSvg('IN') },
  { code: 'CN', dial: '+86', name: 'China', flagSvg: getFlagSvg('CN') },
  { code: 'AU', dial: '+61', name: 'Austrália', flagSvg: getFlagSvg('AU') },
  { code: 'NZ', dial: '+64', name: 'Nova Zelândia', flagSvg: getFlagSvg('NZ') },
  { code: 'ZA', dial: '+27', name: 'África do Sul', flagSvg: getFlagSvg('ZA') },
  { code: 'RU', dial: '+7', name: 'Rússia', flagSvg: getFlagSvg('RU') },
  { code: 'TR', dial: '+90', name: 'Turquia', flagSvg: getFlagSvg('TR') },
  { code: 'AE', dial: '+971', name: 'Emirados Árabes', flagSvg: getFlagSvg('AE') },
];

export const getCountryByPhone = (phone?: string): Country => {
  const match = COUNTRIES.find(c => (phone || '').startsWith(c.dial));
  return match || COUNTRIES[0];
};

export const getFlagByPhone = (phone?: string): React.ReactNode => {
  const c = getCountryByPhone(phone);
  return getFlagSvg(c.code);
};


