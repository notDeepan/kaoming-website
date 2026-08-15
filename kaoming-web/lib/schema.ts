import { contact, identity } from './company';
import type { Series } from './machines';
import { SITE_URL } from './site';

/**
 * schema.org for the pages a buyer finds through search (Part R).
 *
 * Two rules, both of which matter more here than anywhere else on the site:
 *
 *  1. **Only transcribed values.** `additionalProperty` is where a machine's
 *     specification is offered to Google in machine-readable form, so an
 *     invented figure here would be an invented figure republished by search
 *     engines. Every value comes from the same `Series` the page renders.
 *
 *  2. **No `offers`, no `aggregateRating`, no `review`.** KAO MING publishes no
 *     prices and no reviews. Structured data that claims either would be
 *     fabricated, and would be flagged as such the first time anyone checked.
 */

type Json = Record<string, unknown>;

const absolute = (path: string) => new URL(path, SITE_URL).toString();

export function organizationSchema(): Json {
  return {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: identity.legalName,
    alternateName: [identity.chineseName, ...identity.brandMarks],
    url: SITE_URL,
    logo: absolute('/brand/KMC_CIS_Final_20240108_LOGO.png'),
    foundingDate: String(identity.founding.match(/\d{4}/)?.[0] ?? ''),
    slogan: identity.tagline,
    address: {
      '@type': 'PostalAddress',
      streetAddress: contact.address,
      addressCountry: 'TW',
    },
    telephone: contact.tel,
    faxNumber: contact.fax,
    email: contact.email,
    sameAs: Object.values(contact.social),
  };
}

/**
 * A machine series. `additionalProperty` carries the catalogue specification as
 * `PropertyValue` pairs — the schema.org way to publish a spec table, and the
 * reason a search result can answer "what is the X travel" without a click.
 */
export function productSchema(series: Series, locale: string, labelFor: (key: string) => string): Json {
  const path = `/${locale}/products/${series.categorySlug}/${series.slug}`;
  const specs = series.specGroups.flatMap((group) => group.rows);

  return {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: series.name,
    category: series.type,
    description: series.positioning ?? series.type,
    url: absolute(path),
    image: series.images.slice(0, 3).map((image) => absolute(image.plate.src)),
    brand: { '@type': 'Brand', name: 'KAO MING' },
    manufacturer: { '@type': 'Organization', name: identity.legalName },
    // Legacy KMC codes stay searchable without ever being displayed (CLAUDE.md).
    ...(series.legacyAliases.length ? { alternateName: series.legacyAliases } : {}),
    ...(series.models.length
      ? {
          model: series.models.map((model) => ({
            '@type': 'ProductModel',
            name: model.model,
          })),
        }
      : {}),
    additionalProperty: specs.map((row) => ({
      '@type': 'PropertyValue',
      name: labelFor(row.label),
      value: row.value,
    })),
  };
}

export function breadcrumbSchema(
  trail: { name: string; path: string }[],
): Json {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: trail.map((entry, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: entry.name,
      item: absolute(entry.path),
    })),
  };
}

/** Renders a block. Stringified with `JSON.stringify`, which escapes `<`. */
export function schemaScript(schema: Json): string {
  return JSON.stringify(schema).replace(/</g, '\\u003c');
}
