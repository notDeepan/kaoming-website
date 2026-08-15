import { catalogueDocuments } from './images';
import { allSeries } from './machines';
import { navSections } from './nav';

/**
 * The search index (Part M.5), built from the same data the pages render, so it
 * cannot describe a page that does not exist.
 *
 * Legacy KMC codes are indexed as invisible synonyms: buyers still search
 * "KMC-SR" and that equity must not be discarded (CLAUDE.md), but the code never
 * appears as a machine's name. The synonym is matched against and then the
 * catalogue name is what gets shown.
 */

export type SearchKind = 'series' | 'model' | 'document' | 'page';

export type SearchDocument = {
  id: string;
  kind: SearchKind;
  title: string;
  subtitle: string;
  href: string;
  /** Matched against but never displayed. */
  synonyms: string;
};

export function buildSearchIndex(
  labelFor: (key: string) => string,
  catalogueTitle: (id: string) => string,
): SearchDocument[] {
  const documents: SearchDocument[] = [];

  for (const series of allSeries) {
    documents.push({
      id: `series:${series.slug}`,
      kind: 'series',
      title: series.name,
      subtitle: series.type,
      href: `/products/${series.categorySlug}/${series.slug}`,
      synonyms: [series.slug, series.epithet, ...series.legacyAliases].join(' '),
    });

    for (const model of series.models) {
      documents.push({
        id: `model:${model.model}`,
        kind: 'model',
        title: model.model,
        subtitle: series.name,
        href: `/products/${series.categorySlug}/${series.slug}`,
        synonyms: [series.name, series.epithet, ...series.legacyAliases].join(' '),
      });
    }
  }

  for (const document of catalogueDocuments) {
    documents.push({
      id: `doc:${document.id}`,
      kind: 'document',
      title: catalogueTitle(document.id),
      subtitle: `${document.fileType} · ${document.version}`,
      href: document.path,
      synonyms: document.covers.join(' '),
    });
  }

  for (const section of navSections) {
    documents.push({
      id: `page:${section.key}`,
      kind: 'page',
      title: labelFor(section.key),
      subtitle: section.href,
      href: section.href,
      synonyms: section.key,
    });
    for (const child of section.children) {
      documents.push({
        id: `page:${child.href}`,
        kind: 'page',
        title: child.kind === 'literal' ? child.label : labelFor(child.key),
        subtitle: labelFor(section.key),
        href: child.href,
        synonyms: '',
      });
    }
  }

  return documents;
}
