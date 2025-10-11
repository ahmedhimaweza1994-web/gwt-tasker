export const arabicNumbers = {
  '0': '٠',
  '1': '١',
  '2': '٢',
  '3': '٣',
  '4': '٤',
  '5': '٥',
  '6': '٦',
  '7': '٧',
  '8': '٨',
  '9': '٩',
};

export function toArabicNumerals(text: string): string {
  return text.replace(/[0-9]/g, (digit) => arabicNumbers[digit as keyof typeof arabicNumbers] || digit);
}

export function formatArabicTime(hours: number, minutes: number): string {
  const h = hours.toString().padStart(2, '0');
  const m = minutes.toString().padStart(2, '0');
  return `${toArabicNumerals(h)}:${toArabicNumerals(m)}`;
}

export function formatDuration(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;
  
  if (hours > 0) {
    return `${toArabicNumerals(hours.toString())} ساعة ${toArabicNumerals(minutes.toString())} دقيقة`;
  } else if (minutes > 0) {
    return `${toArabicNumerals(minutes.toString())} دقيقة ${toArabicNumerals(secs.toString())} ثانية`;
  } else {
    return `${toArabicNumerals(secs.toString())} ثانية`;
  }
}

export const auxStatusLabels = {
  ready: 'في انتظار مهمة',
  working: 'قيد العمل علي مهمة',
  personal: 'شخصي',
  break: 'استراحة',
  offline: 'غير متصل'
};

export const taskStatusLabels = {
  pending: 'معلق',
  in_progress: 'قيد التنفيذ',
  completed: 'مكتمل',
  cancelled: 'ملغي'
};

export const priorityLabels = {
  low: 'منخفض',
  medium: 'متوسط',
  high: 'عالي',
  urgent: 'عاجل'
};

export const departmentLabels = {
  development: 'التطوير',
  design: 'التصميم',
  marketing: 'التسويق',
  sales: 'المبيعات',
  hr: 'الموارد البشرية',
  finance: 'المالية',
  operations: 'العمليات'
};
