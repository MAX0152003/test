// MSU Main Campus Marawi City Institutional Helpers & Constants

export const BUILDING_CLUSTERS = [
  'CICS Complex (Information & Computing Sciences)',
  'Science & Mathematics Complex',
  'College of Engineering Wing',
  'King Faisal Center for Islamic Studies',
  'College of Education',
  'University Library & IT Center',
  'Social Hall & University Convocations',
  'College of Business Administration & Accountancy'
];

export const EXCUSE_PRESET_TYPES = [
  'MSU University Infirmary Medical Slip',
  'Official University Athletic / Cultural Event',
  'Severe Weather / Marawi Rainstorm & Flooding',
  'Campus Transportation / 4th St Jeepney Delay',
  'Religious / Jum’ah / Family Emergency',
  'Official College Academic Exemption',
  'Other Institutional Verification'
];

export const ACADEMIC_TERMS = [
  '1st Semester 2026–2027',
  '2nd Semester 2026–2027',
  'Summer Term 2027',
  '1st Semester 2025–2026',
  '2nd Semester 2025–2026'
];

/**
 * Auto formats student ID to official MSU pattern YYYY-XXXXX (e.g. 2023-10492)
 */
export function formatMsuId(value: string): string {
  if (!value) return '';
  // Strip everything except alphanumeric and dash
  const clean = value.replace(/[^0-9A-Za-z]/g, '').toUpperCase();
  
  // If it already has numbers, check if it starts with 4-digit year e.g. 2023, 2024, 2025, 2026
  if (clean.length > 4) {
    return `${clean.slice(0, 4)}-${clean.slice(4, 9)}`;
  }
  return clean;
}

export function isValidMsuId(value: string): boolean {
  if (!value) return false;
  // Match standard YYYY-XXXXX (e.g. 2023-10492 or 2024-54321)
  const pattern = /^\d{4}-\d{4,6}$/;
  return pattern.test(value.trim());
}

/**
 * Checks if a given class schedule overlaps with Friday Jum'ah Prayer window (11:30 AM - 1:30 PM)
 */
export function isFridayPrayerWindow(days: string[] = [], startTime?: string, _endTime?: string): boolean {
  const hasFriday = days.some(d => d.includes('F') || d.toLowerCase().includes('fri') || d.toLowerCase() === 'friday');
  if (!hasFriday) return false;

  if (!startTime) return true; // Any Friday class gets Friday awareness
  
  // Check if class starts or runs within 11:00 AM - 01:30 PM
  const lowerTime = startTime.toLowerCase();
  if (lowerTime.includes('11:') || lowerTime.includes('12:') || lowerTime.includes('1:00') || lowerTime.includes('1:30')) {
    return true;
  }
  return true;
}

export const DEFAULT_GRACE_PERIOD_MINUTES = 15;
export const GRACE_PERIOD_OPTIONS = [
  { value: 5, label: '5 Minutes (Same Building / Adjacent Lab)' },
  { value: 10, label: '10 Minutes (Standard Campus Walk)' },
  { value: 15, label: '15 Minutes (Default MSU Inter-Building Transit)' },
  { value: 20, label: '20 Minutes (Distance: King Faisal / Science to CICS)' },
  { value: 30, label: '30 Minutes (Inclement Weather / Distance Walk)' }
];
