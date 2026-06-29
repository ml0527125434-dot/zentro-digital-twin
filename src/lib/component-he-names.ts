/**
 * Zentro Digital Twin — Hebrew component names (Stage 35)
 *
 * Single source of truth for the Hebrew display name of each component type.
 * Used by the palette (card labels) and by the Builder when auto-naming a newly
 * placed component, so a Hebrew-first technician never sees English type names.
 */

export const HE_COMPONENT_NAMES: Record<string, string> = {
  storage_tank:          'מיכל אחסון',
  buffer_tank:           'מיכל חיץ',
  expansion_vessel:      'כלי התפשטות',
  heat_pump:             'משאבת חום',
  gas_backup:            'תנור גז',
  electric_heater:       'מחמם חשמלי',
  solar_collector:       'קולט שמש',
  plate_heat_exchanger:  'מחליף חום',
  recirc_pump:           'משאבת סירקולציה',
  variable_speed_pump:   'משאבה מתכווננת',
  mixing_valve:          'שסתום ערבוב',
  control_valve:         'שסתום בקרה',
  isolation_valve:       'שסתום ניתוק',
  safety_valve:          'שסתום בטיחות',
  temperature_sensor:    'חיישן טמפרטורה',
  pressure_sensor:       'חיישן לחץ',
  flow_sensor:           'חיישן זרימה',
  energy_meter:          'מד אנרגיה',
  water_meter:           'מד מים',
  filter:                'מסנן',
  air_separator:         'מפריד אוויר',
  distribution_manifold: 'מניפולד הפצה',
  point_of_use:          'מקלחת',
  tap:                   'ברז',
};

/** Hebrew name for a component type, falling back to the given label/typeId. */
export function heComponentName(typeId: string, fallback?: string): string {
  return HE_COMPONENT_NAMES[typeId] ?? fallback ?? typeId;
}
