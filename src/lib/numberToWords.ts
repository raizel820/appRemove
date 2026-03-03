/**
 * Number to Words Converter
 * Converts numbers to text in multiple languages (English, French, Arabic)
 */

interface NumberToWordsOptions {
  language?: 'en' | 'fr' | 'ar';
  currency?: string;
}

const ONES = {
  en: ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine'],
  fr: ['', 'un', 'deux', 'trois', 'quatre', 'cinq', 'six', 'sept', 'huit', 'neuf'],
  ar: ['', 'واحد', 'اثنان', 'ثلاثة', 'أربعة', 'خمسة', 'ستة', 'سبعة', 'ثمانية', 'تسعة']
};

const TEENS = {
  en: ['Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'],
  fr: ['dix', 'onze', 'douze', 'treize', 'quatorze', 'quinze', 'seize', 'dix-sept', 'dix-huit', 'dix-neuf'],
  ar: ['عشرة', 'أحد عشر', 'اثنا عشر', 'ثلاثة عشر', 'أربعة عشر', 'خمسة عشر', 'ستة عشر', 'سبعة عشر', 'ثمانية عشر', 'تسعة عشر']
};

const TENS = {
  en: ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'],
  fr: ['', '', 'vingt', 'trente', 'quarante', 'cinquante', 'soixante', 'soixante-dix', 'quatre-vingt', 'quatre-vingt-dix'],
  ar: ['', '', 'عشرون', 'ثلاثون', 'أربعون', 'خمسون', 'ستون', 'سبعون', 'ثمانون', 'تسعون']
};

const THOUSANDS = {
  en: ['', 'Thousand', 'Million', 'Billion', 'Trillion'],
  fr: ['', 'mille', 'million', 'milliard', 'billion'],
  ar: ['', 'ألف', 'مليون', 'مليار', 'تريليون']
};

const TIME_UNITS = {
  en: { day: 'day', days: 'days', week: 'week', weeks: 'weeks', month: 'month', months: 'months', year: 'year', years: 'years' },
  fr: { day: 'jour', days: 'jours', week: 'semaine', weeks: 'semaines', month: 'mois', months: 'mois', year: 'an', years: 'ans' },
  ar: { day: 'يوم', days: 'أيام', week: 'أسبوع', weeks: 'أسابيع', month: 'شهر', months: 'أشهر', year: 'سنة', years: 'سنوات' }
};

/**
 * Convert a number to words in the specified language
 */
export function numberToWords(num: number, language: 'en' | 'fr' | 'ar' = 'en'): string {
  if (num === 0) {
    return language === 'ar' ? 'صفر' : (language === 'fr' ? 'zéro' : 'Zero');
  }

  if (language === 'ar') {
    return numberToWordsArabic(num);
  }

  return numberToWordsEnglishFrench(num, language);
}

function numberToWordsEnglishFrench(num: number, language: 'en' | 'fr'): string {
  if (num >= 1000000000000) {
    // Handle very large numbers by breaking them down
    const billions = Math.floor(num / 1000000000000);
    const remainder = num % 1000000000000;
    return `${numberToWordsEnglishFrench(billions, language)} ${THOUSANDS[language][4]}${remainder > 0 ? ' ' + numberToWordsEnglishFrench(remainder, language) : ''}`;
  }

  if (num >= 1000000000) {
    const millions = Math.floor(num / 1000000000);
    const remainder = num % 1000000000;
    return `${numberToWordsEnglishFrench(millions, language)} ${THOUSANDS[language][3]}${remainder > 0 ? (language === 'fr' && millions > 1 ? 's' : '') + ' ' + numberToWordsEnglishFrench(remainder, language) : ''}`;
  }

  if (num >= 1000000) {
    const millions = Math.floor(num / 1000000);
    const remainder = num % 1000000;
    return `${numberToWordsEnglishFrench(millions, language)} ${THOUSANDS[language][2]}${remainder > 0 ? (language === 'fr' && millions > 1 ? 's' : '') + ' ' + numberToWordsEnglishFrench(remainder, language) : ''}`;
  }

  if (num >= 1000) {
    const thousands = Math.floor(num / 1000);
    const remainder = num % 1000;
    return `${thousands === 1 && language === 'fr' ? THOUSANDS[language][1] : numberToWordsEnglishFrench(thousands, language) + ' ' + THOUSANDS[language][1]}${remainder > 0 ? ' ' + numberToWordsEnglishFrench(remainder, language) : ''}`;
  }

  if (num >= 100) {
    const hundreds = Math.floor(num / 100);
    const remainder = num % 100;
    const hundredWord = language === 'fr' ? 'cent' : 'Hundred';
    return `${ONES[language][hundreds]} ${hundredWord}${remainder > 0 ? (language === 'fr' && hundreds > 1 ? 's' : '') + ' ' + numberToWordsEnglishFrench(remainder, language) : ''}`;
  }

  if (num >= 20) {
    const tens = Math.floor(num / 10);
    const remainder = num % 10;
    if (remainder === 0) {
      return TENS[language][tens];
    }
    if (language === 'fr' && (tens === 7 || tens === 9)) {
      // French special cases: 70-79, 90-99
      return `${TENS[language][tens]}-${ONES[language][10 + remainder]}`;
    }
    return `${TENS[language][tens]}${language === 'en' ? '-' : '-'}${ONES[language][remainder]}`;
  }

  if (num >= 10) {
    return TEENS[language][num - 10];
  }

  return ONES[language][num];
}

function numberToWordsArabic(num: number): string {
  if (num === 0) return 'صفر';
  if (num === 1) return 'واحد';
  if (num === 2) return 'اثنان';

  let result = '';

  // Handle trillions
  if (num >= 1000000000000) {
    const trillions = Math.floor(num / 1000000000000);
    result += `${numberToWordsArabic(trillions)} ${THOUSANDS.ar[4]}`;
    num %= 1000000000000;
    if (num > 0) result += ' و';
  }

  // Handle billions
  if (num >= 1000000000) {
    const billions = Math.floor(num / 1000000000);
    result += `${numberToWordsArabic(billions)} ${billions === 2 ? 'مليار' : 'مليار'}`;
    num %= 1000000000;
    if (num > 0) result += ' و';
  }

  // Handle millions
  if (num >= 1000000) {
    const millions = Math.floor(num / 1000000);
    result += `${numberToWordsArabic(millions)} ${millions === 2 ? 'مليون' : 'مليون'}`;
    num %= 1000000;
    if (num > 0) result += ' و';
  }

  // Handle thousands
  if (num >= 1000) {
    const thousands = Math.floor(num / 1000);
    result += `${thousands === 2 ? 'ألفان' : (thousands > 2 && thousands < 11 ? 'آلاف' : (thousands + ' ألف'))}`;
    num %= 1000;
    if (num > 0) result += ' و';
  }

  // Handle hundreds
  if (num >= 100) {
    const hundreds = Math.floor(num / 100);
    result += `${hundreds} مائة`;
    num %= 100;
    if (num > 0) result += ' و';
  }

  // Handle tens and ones
  if (num >= 20) {
    const tens = Math.floor(num / 10);
    const remainder = num % 10;
    if (remainder === 0) {
      result += TENS.ar[tens];
    } else {
      result += `${ONES.ar[remainder]} و${TENS.ar[tens]}`;
    }
  } else if (num >= 11) {
    result += TEENS.ar[num - 10];
  } else if (num >= 1) {
    result += ONES.ar[num];
  }

  return result.trim();
}

/**
 * Format a time period as text
 */
export function formatTimePeriod(
  timeFrom: number,
  timeTo: number | null,
  timeUnit: 'days' | 'weeks' | 'months' | 'years',
  language: 'en' | 'fr' | 'ar' = 'en'
): string {
  const units = TIME_UNITS[language];
  const unitKey = timeUnit.replace('s', '') as 'day' | 'week' | 'month' | 'year';

  if (timeTo === null || timeFrom === timeTo) {
    // Fixed time period
    const pluralKey = timeFrom === 1 ? unitKey : (unitKey + 's') as 'days' | 'weeks' | 'months' | 'years';
    if (language === 'ar') {
      return `${timeFrom} ${units[pluralKey]}`;
    }
    return `${timeFrom} ${units[pluralKey]}`;
  } else {
    // Time range
    const pluralKey = timeFrom === 1 ? unitKey : (unitKey + 's') as 'days' | 'weeks' | 'months' | 'years';
    if (language === 'ar') {
      return `${timeFrom}-${timeTo} ${units[pluralKey]}`;
    }
    return `${timeFrom}-${timeTo} ${units[pluralKey]}`;
  }
}

/**
 * Convert currency amount to words
 */
export function currencyToWords(
  amount: number,
  currency: string,
  language: 'en' | 'fr' | 'ar' = 'en'
): string {
  const integerPart = Math.floor(amount);
  const decimalPart = Math.round((amount - integerPart) * 100);

  let result = numberToWords(integerPart, language);

  if (language === 'fr') {
    result += ` ${currency}`;
    if (integerPart > 1) result += 's';
  } else if (language === 'ar') {
    result += ` ${currency}`;
  } else {
    result += ` ${currency}`;
  }

  if (decimalPart > 0) {
    result += ` ${language === 'ar' ? 'و' : 'and'} ${numberToWords(decimalPart, language)} ${language === 'ar' ? 'سنت' : 'cents'}`;
  }

  return result;
}
