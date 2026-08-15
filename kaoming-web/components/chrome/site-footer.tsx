import Image from 'next/image';
import { getTranslations } from 'next-intl/server';
import { Link } from '@/i18n/navigation';
import { CERTIFICATIONS, COMPANY } from '@/lib/company';
import { navSections } from '@/lib/nav';
import { productCategories } from '@/lib/taxonomy';
import { LanguageSwitcher } from './language-switcher';

/**
 * Part E.2 — four columns (Products / Company / Resources / Contact + HQ),
 * certifications strip, language switcher, legal.
 * Every fact comes from content/company/company.json.
 */
export async function SiteFooter() {
  const t = await getTranslations('Footer');
  const tNav = await getTranslations('Nav');

  const companySection = navSections.find((section) => section.key === 'company');
  const resourceSection = navSections.find((section) => section.key === 'resources');

  return (
    <footer className="relative z-1 border-t border-km-steel-600/60 bg-km-charcoal">
      <div className="mx-auto max-w-[1600px] px-5 py-16 sm:px-6 xl:px-10">
        <div className="grid gap-12 md:grid-cols-2 xl:grid-cols-4">
          <nav aria-labelledby="footer-products">
            <h2 id="footer-products" className="km-label mb-5 text-km-steel-400">
              {tNav('products')}
            </h2>
            <ul>
              {productCategories.map((category) => (
                <li key={category.slug}>
                  <FooterLink href={`/products/${category.slug}`}>{category.name}</FooterLink>
                </li>
              ))}
            </ul>
          </nav>

          <nav aria-labelledby="footer-company">
            <h2 id="footer-company" className="km-label mb-5 text-km-steel-400">
              {tNav('company')}
            </h2>
            <ul>
              {companySection?.children.map((child) => (
                <li key={child.href}>
                  <FooterLink href={child.href}>
                    {child.kind === 'literal' ? child.label : tNav(child.key)}
                  </FooterLink>
                </li>
              ))}
            </ul>
          </nav>

          <nav aria-labelledby="footer-resources">
            <h2 id="footer-resources" className="km-label mb-5 text-km-steel-400">
              {tNav('resources')}
            </h2>
            <ul>
              {resourceSection?.children.map((child) => (
                <li key={child.href}>
                  <FooterLink href={child.href}>
                    {child.kind === 'literal' ? child.label : tNav(child.key)}
                  </FooterLink>
                </li>
              ))}
            </ul>
          </nav>

          <section aria-labelledby="footer-contact">
            <h2 id="footer-contact" className="km-label mb-5 text-km-steel-400">
              {t('headquarters')}
            </h2>
            <address className="text-small text-km-offwhite not-italic">
              <p className="mb-1 font-display">{COMPANY.legalName}</p>
              <p className="mb-4 text-km-steel-400">{COMPANY.address}</p>
              {/* max-content, not a fixed column: the Chinese labels (電子郵件)
                  are wider than the English ones and must not wrap. */}
              <dl className="grid grid-cols-[max-content_1fr] gap-x-4 gap-y-1 font-mono text-spec">
                <dt className="text-km-steel-400">{t('tel')}</dt>
                <dd>
                  <a className="hover:text-km-blue" href={`tel:${COMPANY.tel.replace(/[^+\d]/g, '')}`}>
                    {COMPANY.tel}
                  </a>
                </dd>
                <dt className="text-km-steel-400">{t('fax')}</dt>
                <dd>{COMPANY.fax}</dd>
                <dt className="text-km-steel-400">{t('email')}</dt>
                <dd>
                  <a className="hover:text-km-blue" href={`mailto:${COMPANY.email}`}>
                    {COMPANY.email}
                  </a>
                </dd>
              </dl>
            </address>
          </section>
        </div>

        {/* Certifications strip */}
        <div className="mt-16 flex flex-wrap items-center gap-x-6 gap-y-3 border-t border-km-steel-600/60 pt-6">
          <h2 className="km-label text-km-steel-400">{t('certifications')}</h2>
          <ul className="flex flex-wrap gap-x-6 gap-y-2">
            {CERTIFICATIONS.map((certification) => (
              <li key={certification.id} className="font-mono text-spec text-km-offwhite">
                {certification.id}
              </li>
            ))}
          </ul>
        </div>

        <div className="mt-10 flex flex-col gap-6 border-t border-km-steel-600/60 pt-6 lg:flex-row lg:items-end lg:justify-between">
          <div className="flex items-end gap-4">
            <span className="block bg-km-paper p-2">
              <Image
                src="/brand/KMC_CIS_Final_20240108_LOGO.png"
                alt={COMPANY.legalName}
                width={3657}
                height={4091}
                loading="lazy"
                sizes="80px"
                className="h-20 w-auto"
              />
            </span>
            <p className="text-small text-km-steel-400">
              <span className="block text-km-offwhite">{COMPANY.chineseName}</span>
              {t('tagline')}
            </p>
          </div>

          <div className="flex flex-col gap-3 lg:items-end">
            <LanguageSwitcher className="-ms-2 lg:-me-2 lg:ms-0" />
            <p className="text-small text-km-steel-400">
              © {new Date().getFullYear()} {COMPANY.legalName} {t('rights')}
            </p>
          </div>
        </div>
      </div>
    </footer>
  );
}

function FooterLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      className="block py-1.5 text-small text-km-offwhite transition-colors duration-(--duration-km) ease-(--ease-km) hover:text-km-blue"
    >
      {children}
    </Link>
  );
}
