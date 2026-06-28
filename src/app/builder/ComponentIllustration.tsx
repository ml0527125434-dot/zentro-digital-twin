/**
 * ComponentIllustration — shared 64×64 SVG mini-preview.
 * Used by both BuilderPalettePanel cards and BuilderPropertyPanel hero.
 */
import React from 'react';

export function ComponentIllustration({ typeId, accent }: { typeId: string; accent: string }) {
  const dim  = '#0d1829';
  const dim2 = '#1e3a5f';

  switch (typeId) {
    case 'storage_tank': case 'buffer_tank':
      return (
        <svg width={64} height={64} viewBox="0 0 64 64">
          <ellipse cx={32} cy={13} rx={22} ry={6} fill={dim} stroke={accent} strokeWidth="1.5" />
          <rect x={10} y={13} width={44} height={36} fill={accent} fillOpacity="0.07" stroke={accent} strokeWidth="1.5" />
          <rect x={11} y={34} width={42} height={15} fill={accent} opacity="0.18" rx="1" />
          <ellipse cx={32} cy={49} rx={22} ry={6} fill={dim} stroke={accent} strokeWidth="1.5" />
          <text x={32} y={36} textAnchor="middle" fill={accent} fontSize="13" fontWeight="900">58°C</text>
          <line x1={32} y1={49} x2={32} y2={58} stroke={accent} strokeWidth="2.5" opacity="0.6" />
        </svg>
      );
    case 'expansion_vessel':
      return (
        <svg width={64} height={64} viewBox="0 0 64 64">
          <ellipse cx={32} cy={32} rx={24} ry={27} fill={dim} stroke={accent} strokeWidth="1.5" />
          <line x1={8} y1={32} x2={56} y2={32} stroke={accent} strokeWidth="1.2" strokeDasharray="4 3" opacity="0.6" />
          <text x={32} y={26} textAnchor="middle" fill={accent} fontSize="9" opacity="0.65">אוויר</text>
          <text x={32} y={44} textAnchor="middle" fill={accent} fontSize="9" opacity="0.5">מים</text>
          <rect x={29} y={55} width={6} height={8} rx={2} fill={dim} stroke={accent} strokeWidth="1.2" />
        </svg>
      );
    case 'heat_pump':
      return (
        <svg width={64} height={64} viewBox="0 0 64 64">
          <rect x={6} y={12} width={52} height={38} rx={7} fill={dim} stroke={accent} strokeWidth="1.5" />
          <circle cx={32} cy={31} r={11} fill="none" stroke={accent} strokeWidth="1.5" opacity="0.7" />
          <circle cx={32} cy={31} r={4} fill={accent} opacity="0.85" />
          <path d="M21,31 C21,24 27,21 32,21" fill="none" stroke={accent} strokeWidth="2" strokeLinecap="round" />
          <path d="M43,31 C43,38 37,41 32,41" fill="none" stroke="#38bdf8" strokeWidth="2" strokeLinecap="round" />
        </svg>
      );
    case 'recirc_pump': case 'variable_speed_pump':
      return (
        <svg width={64} height={64} viewBox="0 0 64 64">
          <circle cx={32} cy={32} r={26} fill={dim} stroke={accent} strokeWidth="1.5" />
          <circle cx={32} cy={32} r={7} fill={accent} opacity="0.85" />
          {[0,90,180,270].map(deg => {
            const r = (deg * Math.PI / 180) + 0.4;
            const x1 = 32 + 7 * Math.cos(r - 0.4);
            const y1 = 32 + 7 * Math.sin(r - 0.4);
            const x2 = 32 + 19 * Math.cos(r);
            const y2 = 32 + 19 * Math.sin(r);
            return <path key={deg} d={`M${x1},${y1} Q${x2},${y2} ${x2},${y2}`} fill={accent} opacity="0.55" />;
          })}
        </svg>
      );
    case 'mixing_valve': case 'control_valve':
      return (
        <svg width={64} height={64} viewBox="0 0 64 64">
          <polygon points="8,14 8,50 28,32" fill={accent} opacity="0.75" stroke={accent} strokeWidth="1" />
          <polygon points="56,14 56,50 36,32" fill={dim} stroke={accent} strokeWidth="1.5" opacity="0.7" />
          <circle cx={32} cy={32} r={6} fill={accent} />
          <line x1={32} y1={12} x2={32} y2={22} stroke={accent} strokeWidth="3" opacity="0.6" strokeLinecap="round" />
        </svg>
      );
    case 'isolation_valve': case 'safety_valve':
      return (
        <svg width={64} height={64} viewBox="0 0 64 64">
          <polygon points="8,14 8,50 28,32" fill={dim} stroke={accent} strokeWidth="1.5" opacity="0.6" />
          <polygon points="56,14 56,50 36,32" fill={dim} stroke={accent} strokeWidth="1.5" opacity="0.6" />
          <circle cx={32} cy={32} r={6} fill={accent} />
          <line x1={32} y1={32} x2={32} y2={14} stroke={accent} strokeWidth="3" opacity="0.7" strokeLinecap="round" />
          <line x1={26} y1={12} x2={38} y2={12} stroke={accent} strokeWidth="2.5" strokeLinecap="round" />
        </svg>
      );
    case 'temperature_sensor':
      return (
        <svg width={64} height={64} viewBox="0 0 64 64">
          <circle cx={32} cy={34} r={24} fill={dim} stroke="#f97316" strokeWidth="1.5" />
          <path d="M 12,46 A 24,24 0 0,1 42,16" fill="none" stroke="#f97316" strokeWidth="4" strokeLinecap="round" />
          <line x1={32} y1={34} x2={26} y2={18} stroke="#f97316" strokeWidth="2.5" strokeLinecap="round" />
          <circle cx={32} cy={34} r={4} fill="#f97316" />
          <text x={32} y={56} textAnchor="middle" fill="#f97316" fontSize="9" fontWeight="800">°C</text>
        </svg>
      );
    case 'pressure_sensor':
      return (
        <svg width={64} height={64} viewBox="0 0 64 64">
          <circle cx={32} cy={34} r={24} fill={dim} stroke="#818cf8" strokeWidth="1.5" />
          <path d="M 12,46 A 24,24 0 0,1 48,30" fill="none" stroke="#818cf8" strokeWidth="4" strokeLinecap="round" />
          <line x1={32} y1={34} x2={44} y2={22} stroke="#818cf8" strokeWidth="2.5" strokeLinecap="round" />
          <circle cx={32} cy={34} r={4} fill="#818cf8" />
          <text x={32} y={56} textAnchor="middle" fill="#818cf8" fontSize="9" fontWeight="800">bar</text>
        </svg>
      );
    case 'flow_sensor':
      return (
        <svg width={64} height={64} viewBox="0 0 64 64">
          <circle cx={32} cy={34} r={24} fill={dim} stroke="#22d3ee" strokeWidth="1.5" />
          <path d="M 12,46 A 24,24 0 0,1 32,10" fill="none" stroke="#22d3ee" strokeWidth="4" strokeLinecap="round" />
          <line x1={32} y1={34} x2={32} y2={14} stroke="#22d3ee" strokeWidth="2.5" strokeLinecap="round" />
          <circle cx={32} cy={34} r={4} fill="#22d3ee" />
          <text x={32} y={56} textAnchor="middle" fill="#22d3ee" fontSize="9" fontWeight="800">ל/ד</text>
        </svg>
      );
    case 'energy_meter': case 'water_meter':
      return (
        <svg width={64} height={64} viewBox="0 0 64 64">
          <rect x={8} y={14} width={48} height={36} rx={6} fill={dim} stroke={accent} strokeWidth="1.5" />
          <rect x={14} y={22} width={36} height={16} rx={3} fill={dim2} stroke={accent} strokeWidth="0.8" opacity="0.6" />
          <text x={32} y={34} textAnchor="middle" fill={accent} fontSize="13" fontWeight="900" fontFamily="monospace">
            {typeId === 'energy_meter' ? '4.7kW' : '12m³'}
          </text>
        </svg>
      );
    case 'gas_backup':
      return (
        <svg width={64} height={64} viewBox="0 0 64 64">
          <rect x={12} y={16} width={40} height={38} rx={5} fill={dim} stroke={accent} strokeWidth="1.5" />
          {[24,30,36,42].map(y => (
            <line key={y} x1={12} y1={y} x2={52} y2={y} stroke={accent} strokeWidth="0.7" opacity="0.25" />
          ))}
          <path d="M32,36 C24,26 22,18 28,12 C25,18 34,18 32,12 C38,18 36,26 40,32 C36,28 28,28 32,36Z"
            fill={accent} opacity="0.9" />
          <path d="M32,36 C29,30 30,25 32,21 C31,25 33,25 32,21 C34,25 33,30 32,36Z"
            fill="#fff" opacity="0.45" />
        </svg>
      );
    case 'electric_heater':
      return (
        <svg width={64} height={64} viewBox="0 0 64 64">
          <rect x={6} y={14} width={52} height={36} rx={7} fill={dim} stroke={accent} strokeWidth="1.5" />
          {[24,32,40,48].map((y, i) => (
            <g key={y}>
              <line x1={14} y1={y} x2={50} y2={y} stroke={accent} strokeWidth="3" strokeLinecap="round" opacity="0.85" />
              {i < 3 && (
                <path d={i%2===0 ? `M50,${y} A5,5 0 0,1 50,${y+8}` : `M14,${y} A5,5 0 0,0 14,${y+8}`}
                  fill="none" stroke={accent} strokeWidth="3" strokeLinecap="round" opacity="0.85" />
              )}
            </g>
          ))}
        </svg>
      );
    case 'solar_collector':
      return (
        <svg width={64} height={64} viewBox="0 0 64 64">
          <rect x={4} y={16} width={56} height={36} rx={4} fill={dim} stroke="#fbbf24" strokeWidth="1.5" />
          {[12,20,28,36,44,52].map(x => (
            <rect key={x} x={x} y={19} width={6} height={30} rx={3} fill="#fbbf24" opacity="0.55" />
          ))}
          <text x={32} y={40} textAnchor="middle" fill="#fbbf24" fontSize="20" opacity="0.9">☀</text>
        </svg>
      );
    case 'plate_heat_exchanger':
      return (
        <svg width={64} height={64} viewBox="0 0 64 64">
          <rect x={4} y={12} width={56} height={40} rx={7} fill={dim} stroke={accent} strokeWidth="1.5" />
          {[18,25,32,39,46].map((x, i) => (
            <rect key={x} x={x} y={16} width={5} height={32} rx={2.5}
              fill={i%2===0 ? '#38bdf8' : '#f97316'} opacity="0.6" />
          ))}
          <path d="M4,24 L16,24 M48,24 L60,24" stroke="#38bdf8" strokeWidth="2" opacity="0.7" />
          <path d="M4,40 L16,40 M48,40 L60,40" stroke="#f97316" strokeWidth="2" opacity="0.7" />
        </svg>
      );
    case 'filter':
      return (
        <svg width={64} height={64} viewBox="0 0 64 64">
          <rect x={8} y={18} width={48} height={28} rx={6} fill={dim} stroke={accent} strokeWidth="1.5" />
          {[18,24,30,36,42,48].map(x => (
            <line key={x} x1={x} y1={21} x2={x} y2={43} stroke={accent} strokeWidth="1.2" opacity="0.55" />
          ))}
          <rect x={0} y={26} width={12} height={12} rx={3} fill={dim} stroke={accent} strokeWidth="1.2" />
          <rect x={52} y={26} width={12} height={12} rx={3} fill={dim} stroke={accent} strokeWidth="1.2" />
        </svg>
      );
    case 'air_separator':
      return (
        <svg width={64} height={64} viewBox="0 0 64 64">
          <rect x={20} y={18} width={24} height={36} rx={5} fill={dim} stroke={accent} strokeWidth="1.5" />
          <circle cx={28} cy={38} r={4} fill="none" stroke={accent} strokeWidth="1.5" opacity="0.7" />
          <circle cx={36} cy={32} r={2.5} fill="none" stroke={accent} strokeWidth="1.2" opacity="0.5" />
          <rect x={29} y={6} width={6} height={14} rx={3} fill={dim} stroke={accent} strokeWidth="1.2" />
          <rect x={4} y={27} width={16} height={10} rx={3} fill={dim} stroke={accent} strokeWidth="1.2" />
          <rect x={44} y={27} width={16} height={10} rx={3} fill={dim} stroke={accent} strokeWidth="1.2" />
        </svg>
      );
    case 'distribution_manifold':
      return (
        <svg width={64} height={64} viewBox="0 0 64 64">
          <rect x={4} y={12} width={56} height={14} rx={5} fill={dim} stroke="#f97316" strokeWidth="1.5" />
          {[16,32,48].map(x => (
            <g key={x}>
              <line x1={x} y1={26} x2={x} y2={44} stroke="#f97316" strokeWidth="5" strokeLinecap="round" opacity="0.7" />
              <circle cx={x} cy={44} r={3.5} fill="#f97316" opacity="0.7" />
            </g>
          ))}
          <rect x={4} y={50} width={56} height={12} rx={5} fill={dim} stroke="#38bdf8" strokeWidth="1.5" />
        </svg>
      );
    case 'point_of_use': case 'tap':
      return (
        <svg width={64} height={64} viewBox="0 0 64 64">
          <circle cx={32} cy={28} r={22} fill={dim} stroke={accent} strokeWidth="1.5" />
          <rect x={21} y={14} width={22} height={10} rx={3} fill={dim} stroke={accent} strokeWidth="1.3" opacity="0.9" />
          {[-10,0,10].map((dx, i) => (
            <ellipse key={i} cx={32+dx} cy={43} rx={2.5} ry={3.5}
              fill={accent} opacity="0.75"
              style={{ animation: 'dropFall 1.2s ease-in infinite', animationDelay: `${i*0.28}s` }} />
          ))}
        </svg>
      );
    default:
      return (
        <svg width={64} height={64} viewBox="0 0 64 64">
          <rect x={8} y={8} width={48} height={48} rx={10} fill={dim} stroke={accent} strokeWidth="1.5" />
          <text x={32} y={38} textAnchor="middle" fill={accent} fontSize="22">⬡</text>
        </svg>
      );
  }
}
