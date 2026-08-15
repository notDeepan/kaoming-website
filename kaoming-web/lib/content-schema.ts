import { z } from 'zod';

/**
 * Schemas for the content the site renders (Part N).
 *
 * These validate the *output* of the loaders rather than each raw source file.
 * The four catalogue JSONs have four different hand-written shapes, and pinning
 * each one down separately would mean four schemas to keep in step with a
 * transcription that is still being extended. What the pages actually depend on
 * is the normalised `Series`, so that is what is guaranteed here.
 *
 * A failure throws during module evaluation, which happens while the pages are
 * being generated — so a broken transcription fails the build with the series
 * named, instead of quietly rendering a specification table with holes in it.
 */

export const seriesImageSchema = z.object({
  model: z.string().min(1),
  view: z.string(),
  bestFor: z.string(),
  plate: z.object({
    src: z.string().startsWith('/img/'),
    width: z.number().int().positive(),
    height: z.number().int().positive(),
  }),
  cut: z.object({
    src: z.string().startsWith('/img/'),
    width: z.number().int().positive(),
    height: z.number().int().positive(),
  }),
});

export const specRowSchema = z.object({
  label: z.string().min(1),
  // Never empty: a row with no value must be dropped by the loader, not rendered.
  value: z.string().min(1),
});

/**
 * A component annotation. `object` and `hotspot` are pointers into the 3D model
 * (Part H.2), so they are constrained to the authoring contract's naming — a
 * typo there produces a hotspot that silently points at nothing.
 */
export const componentSchema = z.object({
  id: z.string().min(1),
  object: z.string().regex(/^KM_[A-Za-z0-9_]+$/),
  hotspot: z.string().regex(/^HS_[A-Za-z0-9_]+$/),
  title: z.string().min(1),
  conceptual: z.boolean(),
  specs: z.array(specRowSchema).min(1),
});

export const seriesSchema = z
  .object({
    slug: z.string().regex(/^kmc-[a-z0-9-]+$/),
    categorySlug: z.string().min(1),
    name: z.string().min(1),
    epithet: z.string().min(1),
    type: z.string().min(1),
    positioning: z.string().nullable(),
    architecture: z.string().nullable(),
    source: z.object({ document: z.string().min(1), note: z.string().nullable() }).nullable(),
    specGroups: z.array(z.object({ label: z.string().min(1), rows: z.array(specRowSchema).min(1) })),
    modelColumns: z.array(z.string().min(1)),
    models: z.array(z.object({ model: z.string().min(1), cells: z.array(z.string()) })),
    features: z.array(
      z.object({ id: z.string(), title: z.string().min(1), copy: z.string() }),
    ),
    modelCodeRule: z.string().nullable(),
    completeness: z.enum(['full', 'partial', 'pending']),
    transcriptionNote: z.string().nullable(),
    legacyAliases: z.array(z.string()),
    flagship: z.boolean(),
    images: z.array(seriesImageSchema),
    components: z.array(componentSchema),
    // Part G.9 is explicit that the photograph is the authoritative visual, so a
    // workpiece without one is a card that cannot do its job.
    workpieces: z.array(
      z.object({
        id: z.string().min(1),
        name: z.string().min(1),
        material: z.string().nullable(),
        dimensions: z.string().nullable(),
        requirements: z.string().nullable(),
        machine: z.string().nullable(),
        image: z
          .object({
            src: z.string().startsWith('/img/'),
            width: z.number().int().positive(),
            height: z.number().int().positive(),
          })
          .nullable(),
      }),
    ),
  })
  .superRefine((series, ctx) => {
    // Every model row must line up with the header, or the table silently
    // shifts a figure into the wrong column — the worst kind of specification bug.
    for (const model of series.models) {
      if (model.cells.length !== series.modelColumns.length) {
        ctx.addIssue({
          code: 'custom',
          message: `${series.slug}: model ${model.model} has ${model.cells.length} cells but the table has ${series.modelColumns.length} columns`,
        });
      }
    }

    // A series claiming a complete specification must actually carry one.
    if (series.completeness === 'full' && series.models.length === 0) {
      ctx.addIssue({
        code: 'custom',
        message: `${series.slug}: marked complete but states no models`,
      });
    }

    // Two components pointing at one mesh would make the exploded view
    // annotate the same volume twice under two different names.
    const objects = series.components.map((component) => component.object);
    if (new Set(objects).size !== objects.length) {
      ctx.addIssue({
        code: 'custom',
        message: `${series.slug}: two components name the same model object`,
      });
    }

    // Anything less than complete has to say so, or the page cannot be honest.
    if (series.completeness !== 'full' && !series.transcriptionNote && !series.source) {
      ctx.addIssue({
        code: 'custom',
        message: `${series.slug}: incomplete but carries no note explaining what is missing`,
      });
    }
  });

export const documentSchema = z.object({
  id: z.string().min(1),
  path: z.string().startsWith('/docs/'),
  fileType: z.string().min(1),
  sizeBytes: z.number().int().positive(),
  language: z.string().min(2),
  version: z.string().min(4),
  covers: z.array(z.string()).min(1),
});

/** Throws with every problem listed, not just the first. */
export function assertValidContent(series: unknown[], documents: unknown[]): void {
  const problems: string[] = [];

  for (const entry of series) {
    const result = seriesSchema.safeParse(entry);
    if (!result.success) {
      problems.push(...result.error.issues.map((issue) => `series: ${issue.path.join('.')} ${issue.message}`));
    }
  }

  for (const entry of documents) {
    const result = documentSchema.safeParse(entry);
    if (!result.success) {
      problems.push(...result.error.issues.map((issue) => `document: ${issue.path.join('.')} ${issue.message}`));
    }
  }

  if (problems.length) {
    throw new Error(
      `Content failed validation (${problems.length} problems):\n  ${problems.join('\n  ')}`,
    );
  }
}
