import React from 'react';

/**
 * Red pulsing badge displayed when a node has active alarms.
 * Position absolutely in top-right corner of the node wrapper.
 */
export function AlarmBadge({ count }: { count: number }) {
  if (count === 0) return null;
  return (
    <span
      aria-label={`${count} active alarm${count > 1 ? 's' : ''}`}
      style={{
        position:        'absolute',
        top:             -6,
        insetInlineEnd:  -6,
        minWidth:        16,
        height:          16,
        borderRadius:    8,
        background:      'var(--status-critical)',
        color:           '#fff',
        fontSize:        9,
        fontWeight:      800,
        lineHeight:      '16px',
        textAlign:       'center',
        padding:         '0 3px',
        boxShadow:       'var(--glow-critical)',
        animation:       'alarmPulse 1.8s ease-in-out infinite',
        zIndex:          20,
        pointerEvents:   'none',
      }}
    >
      {count > 9 ? '9+' : count}
    </span>
  );
}
