/**
 * ISO 3166-1 alpha-2 codes for the country dropdown (Part M.1).
 *
 * Only the codes are stored; the names come from `Intl.DisplayNames`, so the
 * list is in the reader's own language in every locale the site adds, and no
 * country name ever needs translating by hand.
 */
export const COUNTRY_CODES = [
  'AE','AR','AT','AU','BD','BE','BG','BH','BR','CA','CH','CL','CN','CO','CZ','DE','DK','EE','EG',
  'ES','FI','FR','GB','GR','HK','HR','HU','ID','IE','IL','IN','IQ','IR','IS','IT','JO','JP','KR',
  'KW','KZ','LT','LU','LV','MA','MX','MY','NG','NL','NO','NZ','OM','PE','PH','PK','PL','PT','QA',
  'RO','RS','RU','SA','SE','SG','SI','SK','TH','TN','TR','TW','UA','US','UY','VN','ZA',
] as const;

export function countryOptions(locale: string): { code: string; name: string }[] {
  const display = new Intl.DisplayNames([locale], { type: 'region' });
  return COUNTRY_CODES.map((code) => ({ code, name: display.of(code) ?? code })).sort((a, b) =>
    a.name.localeCompare(b.name, locale),
  );
}
