import bowWayJson from '@/content/machines/kmc-bow-way.json';
import ceChJson from '@/content/machines/kmc-ce-ch.json';
import gmJson from '@/content/machines/kmc-gm.json';
import gnJson from '@/content/machines/kmc-gn.json';
import { assertValidContent } from './content-schema';
import { catalogueDocuments, imagesForSeries } from './images';
import { productCategories, type SeriesEntry } from './taxonomy';

/**
 * One normalised model over four differently shaped source files, all of them
 * verbatim transcriptions of the 2026 catalogues.
 *
 * SOURCE AUTHORITY (CLAUDE.md): every value below is copied, never computed,
 * never rounded, never inferred. Where a catalogue page has not been transcribed
 * yet the series says so out loud rather than showing a thinner table as if it
 * were the whole truth — see `completeness`.
 *
 * Labels are message keys resolved in the UI, so the German and Japanese phases
 * translate the vocabulary without anyone touching a number. The numbers and
 * their units are never translated.
 */

export type SpecRow = {
  /** Key under the `Spec` namespace in messages/*.json. */
  label: string;
  value: string;
};

export type SpecGroup = {
  /** Key under `Spec.group` in messages/*.json. */
  label: string;
  rows: SpecRow[];
};

export type ModelRow = {
  model: string;
  cells: string[];
};

export type SeriesImage = {
  model: string;
  view: string;
  bestFor: string;
  plate: { src: string; width: number; height: number };
  cut: { src: string; width: number; height: number };
};

/**
 * A named component of a machine, as the catalogue describes it (Part G.5).
 *
 * `object` is the KM_* node in the 3D model this annotates — the same name the
 * H.2 authoring contract puts on the mesh. It is a pointer into the model, never
 * a model code and never a displayed name.
 */
export type MachineComponent = {
  id: string;
  object: string;
  hotspot: string;
  /** Verbatim catalogue title. */
  title: string;
  /** True where the geometry is a plausible stand-in, not engineering truth. */
  conceptual: boolean;
  specs: SpecRow[];
};

/**
 * A part this machine makes (Part G.9).
 *
 * **No series states any of these yet.** The kit carries no workpiece
 * photography and no `workpieces[]` block, and Part G.9 is explicit that the
 * photograph is the authoritative visual — so Scene 07 says so rather than
 * illustrating a claim nobody made. The shape is here so that transcribing one
 * workpiece is a content change and nothing else.
 */
export type Workpiece = {
  id: string;
  name: string;
  material: string | null;
  /** Approximate dimensions, as the source states them. Never derived. */
  dimensions: string | null;
  requirements: string | null;
  /** Catalogue model code of the machine used. */
  machine: string | null;
  image: { src: string; width: number; height: number } | null;
};

export type Completeness =
  /** Full catalogue specification table transcribed. */
  | 'full'
  /** Model ranges and geometry transcribed; remaining rows pending. */
  | 'partial'
  /** Catalogue page not transcribed at all — no model list. */
  | 'pending';

export type Series = {
  slug: string;
  categorySlug: string;
  /** "KMC-GM · Gantry Mercury" — the naming policy's primary label. */
  name: string;
  /** "Gantry Mercury" */
  epithet: string;
  /** Catalogue type line. */
  type: string;
  /** Longer catalogue positioning, where the source file carries one. */
  positioning: string | null;
  /** Architecture note, where the catalogue states one. */
  architecture: string | null;
  source: { document: string; note: string | null } | null;
  specGroups: SpecGroup[];
  /** Message keys for the model table header, in column order. */
  modelColumns: string[];
  models: ModelRow[];
  features: { id: string; title: string; copy: string }[];
  modelCodeRule: string | null;
  completeness: Completeness;
  /** Verbatim transcription status, shown when completeness is not 'full'. */
  transcriptionNote: string | null;
  legacyAliases: string[];
  flagship: boolean;
  images: SeriesImage[];
  /** Named components, where the catalogue names any. Empty otherwise. */
  components: MachineComponent[];
  /** Parts this machine makes. Empty until KAO MING supplies them (Part G.9). */
  workpieces: Workpiece[];
};

/* ------------------------------------------------------------------ helpers */

/** Thousands separator on bare figures, so 15,000 rpm sits beside 50,000 kg
 *  rather than 15000 rpm. Formatting only — the value is never changed. */
const n = (value: number): string => value.toLocaleString('en-US');

/**
 * `kg/m2` → `kg/m²`.
 *
 * The transcription stores the catalogue's superscript in a JSON-safe form, and
 * printing it back as "m2" reads as "m-two" on a specification a buyer's
 * engineer is reading. This is typography, not data: the exponent is restored
 * only where it directly follows a unit and a slash, so nothing that could be a
 * model code — `325GM`, `28H8x200` — is ever touched.
 */
const unitText = (unit: string): string =>
  unit.replace(/\/([a-z]+)([23])\b/gi, (_, base: string, power: string) =>
    `/${base}${power === '2' ? '²' : '³'}`,
  );

const text = (value: unknown): string | null => {
  if (value === null || value === undefined) return null;
  if (typeof value === 'number') return value.toLocaleString('en-US');
  return String(value);
};

/** Drops rows whose source value is absent, so no empty cell is ever rendered. */
function group(label: string, rows: (readonly [string, unknown])[]): SpecGroup | null {
  const present = rows
    .map(([key, value]) => ({ label: key, value: text(value) }))
    .filter((row): row is SpecRow => row.value !== null && row.value !== '');
  return present.length ? { label, rows: present } : null;
}

const compact = (groups: (SpecGroup | null)[]): SpecGroup[] =>
  groups.filter((entry): entry is SpecGroup => entry !== null);

/**
 * Component specification keys become message keys, the same way every other
 * label on the site does — `spindle_taper` reads out as `spindleTaper` under the
 * `Component.spec` namespace. Nested blocks compose, so the head's A-axis
 * rotation is `aAxisRotation`. The transformation is mechanical on purpose: the
 * source key is the only thing that decides it, so a transcription cannot end up
 * relabelled by hand on its way to the page.
 */
const camel = (key: string): string => key.replace(/_([a-z0-9])/g, (_, c: string) => c.toUpperCase());

function componentSpecs(specs: Record<string, unknown>, prefix = ''): SpecRow[] {
  return Object.entries(specs).flatMap(([key, value]) => {
    const name = camel(key);
    const label = prefix ? prefix + name[0].toUpperCase() + name.slice(1) : name;

    if (value && typeof value === 'object' && !Array.isArray(value)) {
      return componentSpecs(value as Record<string, unknown>, label);
    }

    const rendered = text(value);
    return rendered ? [{ label, value: rendered }] : [];
  });
}

/* -------------------------------------------------------------- source data */

/**
 * The four source files have four different shapes, all of them hand-written
 * transcriptions rather than a schema anyone designed. Reading them through an
 * index signature keeps that mess contained to this file: everything that
 * leaves it is the typed `Series` above. Zod validation of the content
 * collections lands with the data layer in M2.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Loose = Record<string, any>;

const gm = (gmJson as Loose).series as Loose;
const gn = (gnJson as Loose).series as Loose;
const ceCh = (ceChJson as Loose).series as Loose;
const bowWay = bowWayJson as Loose;

/** Series slug is derivable from a catalogue model code, and only from that. */
export function seriesSlugForModel(model: string): string | null {
  const code = model.toUpperCase();
  if (code.includes('GM')) return 'kmc-gm';
  if (code.includes('GN')) return 'kmc-gn';
  if (code.includes('HMA')) return 'kmc-hma';
  if (code.includes('HA14')) return 'kmc-ha14';
  if (code.includes('HA11')) return 'kmc-ha11';
  if (code.includes('H11')) return 'kmc-h11';
  if (/H7|H8/.test(code)) return 'kmc-h7-h8';
  if (code.includes('CE')) return 'kmc-ce';
  if (code.includes('CH')) return 'kmc-ch';
  return null;
}

/* ------------------------------------------------------------ spec builders */

function gmSpecs(): SpecGroup[] {
  const s = gm.specs_series as Loose;
  return compact([
    group('travel', [
      ['travelY', s.travel.y_mm && `${n(s.travel.y_mm)} mm`],
      ['travelZ', s.travel.z_mm && `${n(s.travel.z_mm)} mm`],
      ['columnsDistance', `${n(s.distance_between_columns_mm)} mm`],
      ['spindleNoseToTable', `${s.travel.vertical_spindle_nose_to_table_mm} mm`],
      ['spindleCenterToTable', `${s.travel.horizontal_spindle_center_to_table_mm} mm`],
    ]),
    group('table', [
      ['tableLoad', `${n(s.table.max_load_capacity.value)} ${unitText(s.table.max_load_capacity.unit)}`],
      ['tableTSlot', s.table.t_slot],
    ]),
    group('spindle', [
      ['spindleTaper', s.spindle.taper],
      ['spindleSpeed', `${n(s.spindle.speed_rpm)} rpm`],
      ['spindleConversion', s.spindle.speed_conversion],
      ['spindleMotor', s.spindle.motor],
      ['spindleTorque', `${n(s.spindle.max_torque_nm)} Nm`],
    ]),
    group('feed', [['feedCutting', `${s.feed.cutting_feed_mm_min} mm/min`]]),
    group('toolMagazine', [
      ['atcCapacity', s.tool_magazine.capacity],
      ['atcShank', s.tool_magazine.shank],
      ['atcToolDiameter', `${s.tool_magazine.max_tool_diameter_mm} mm`],
      ['atcToolLength', `${n(s.tool_magazine.max_tool_length_mm)} mm`],
      ['atcToolWeight', `${s.tool_magazine.max_tool_weight_kg} kg`],
    ]),
    group('accuracy', [
      ['accuracyPositioning', `${s.accuracy.positioning_mm} mm`],
      ['accuracyRepeatability', `${s.accuracy.repeatability_mm} mm`],
    ]),
    group('machine', [
      ['machineHeight', `${n(s.machine_height_mm)} mm`],
      ['power', `${s.electrical_power_kva} kVA`],
      ['air', `${s.compressed_air_kg_cm2} kg/cm²`],
      ['controller', s.controller],
    ]),
  ]);
}

function gnSpecs(): SpecGroup[] {
  const s = gn.specs_series as Loose;
  return compact([
    group('travel', [
      ['travelZ', `${n(s.travel.z_mm)} mm`],
      ['spindleNoseToTable', `${s.travel.vertical_spindle_nose_to_table_mm} mm`],
      ['spindleCenterToTable', `${s.travel.horizontal_spindle_center_to_table_mm} mm`],
    ]),
    group('table', [
      ['tableLoad', `${n(s.table.max_load_capacity.value)} ${unitText(s.table.max_load_capacity.unit)}`],
      ['tableTSlot', s.table.t_slot],
    ]),
    group('spindle', [
      ['spindleTaper', s.spindle.taper],
      ['spindleSpeedVertical', `${s.spindle.speed_rpm_vertical} rpm`],
      ['spindleSpeedHorizontal', `${n(s.spindle.speed_rpm_horizontal)} rpm`],
      ['spindleConversion', s.spindle.speed_conversion],
      ['spindleMotor', s.spindle.motor],
      ['spindleTorque', `${n(s.spindle.max_torque_nm)} Nm`],
      ['spindleHeavyCutting', `${n(s.spindle.heavy_cutting_low_speed_rpm)} rpm`],
    ]),
    group('feed', [
      ['feedRapid', `${s.feed.rapid_traverse_m_min} m/min`],
      ['feedCutting', `${s.feed.cutting_feed_m_min} m/min`],
    ]),
    group('toolMagazine', [
      ['atcCapacity', s.atc_v_h.capacity],
      ['atcShank', s.atc_v_h.shank],
      ['atcPullStud', s.atc_v_h.pull_stud],
      ['atcToolDiameter', s.atc_v_h.max_tool_diameter_mm],
      ['atcToolLength', `${n(s.atc_v_h.max_tool_length_mm)} mm`],
      ['atcToolWeight', `${s.atc_v_h.max_tool_weight_kg} kg`],
    ]),
    group('accuracy', [
      ['accuracyPositioning', `${s.accuracy.positioning_mm} mm`],
      ['accuracyRepeatability', `${s.accuracy.repeatability_mm} mm`],
      ['headIndexing', s.horizontal_head_indexing.indexing],
      ['headIndexingRepeatability', `${s.horizontal_head_indexing.indexing_repeatability_sec}″`],
    ]),
    group('machine', [
      ['machineHeight', `${n(s.machine_height_mm)} mm`],
      ['power', `${s.electrical_power_kva} kVA`],
      ['air', `${s.compressed_air_kg_cm2} kg/cm²`],
      ['controller', s.controller],
      ['aac', s.aac],
    ]),
  ]);
}

/** Clymene specs are per model, so the series table carries what is shared. */
function clymeneSpecs(variant: 'CE' | 'CH'): SpecGroup[] {
  const sub = (ceCh.sub_series as Loose)[variant] as Loose;
  return compact([
    group('construction', [
      ['description', sub.description],
      ['notable', sub.notable],
    ]),
    group('options', [['optionsSeries', ceCh.options_series]]),
  ]);
}

/* ----------------------------------------------------------- model builders */

const gmModels = (): ModelRow[] =>
  (gm.models as Loose[]).map((m) => ({
    model: m.model,
    cells: [
      `${n(m.x_travel_mm)} mm`,
      `${m.working_table_mm} mm`,
      `${m.rapid_traverse_m_min} m/min`,
      `${m.floor_space_mm} mm`,
      `${(m.net_weight_kg as number).toLocaleString('en-US')} kg`,
    ],
  }));

const gnModels = (): ModelRow[] =>
  (gn.models as Loose[]).map((m) => ({
    model: m.model,
    cells: [
      `${n(m.x_travel_mm)} mm`,
      `${n(m.y_travel_mm)} mm`,
      `${n(m.columns_mm)} mm`,
      `${m.table_mm} mm`,
      `${m.floor_space_mm} mm`,
      `${(m.net_weight_kg as number).toLocaleString('en-US')} kg`,
    ],
  }));

const clymeneModels = (variant: 'CE' | 'CH'): ModelRow[] =>
  (ceCh.models as Loose[])
    .filter((m) => (m.model as string).endsWith(variant))
    .map((m) => ({
      model: m.model,
      cells: [
        `${n(m.travel.x_mm)} mm`,
        `${n(m.travel.y_mm)} mm`,
        `${n(m.travel.z_mm)} mm`,
        `${m.table.working_surface_mm} mm`,
        `${(m.table.max_load_kg as number).toLocaleString('en-US')} kg`,
        m.spindle.taper,
        `${m.spindle.speed_rpm} rpm`,
        `${(m.dimensions.machine_weight_kg as number).toLocaleString('en-US')} kg`,
      ],
    }));

/**
 * Reads `workpieces[]` from a source file if one ever states it. Every field is
 * copied; nothing is derived, and a workpiece with no photograph is dropped
 * rather than shown as a card with a hole in it (Part G.9).
 */
function workpiecesOf(source: Loose): Workpiece[] {
  return ((source.workpieces as Loose[]) ?? []).map((entry) => ({
    id: entry.id as string,
    name: entry.name as string,
    material: text(entry.material),
    dimensions: text(entry.dimensions),
    requirements: text(entry.requirements),
    machine: text(entry.machine),
    image: (entry.image as Workpiece['image']) ?? null,
  }));
}

const gmComponents = (): MachineComponent[] =>
  ((gm.components as Loose[]) ?? []).map((component) => ({
    id: component.id as string,
    object: component.glb_object as string,
    hotspot: component.hotspot as string,
    title: component.title as string,
    conceptual: component.conceptual === true,
    specs: componentSpecs((component.specs ?? {}) as Record<string, unknown>),
  }));

/** Bow Way transcription reached table geometry only. */
const bowWayModels = (models: Loose[], withLoad = false): ModelRow[] =>
  models.map((m) => ({
    model: m.model,
    cells: [
      `${n(m.table_length_mm)} mm`,
      `${n(m.columns_mm)} mm`,
      `${n(m.table_width_mm)} mm`,
      ...(withLoad ? [`${m.max_load_t} t`] : []),
    ],
  }));

/* ----------------------------------------------------------------- assembly */

const hephaestus = (bowWay.HEPHAESTUS as Loose) ?? {};
const minerva = (bowWay.MINERVA as Loose) ?? {};
const bowWayGroup = (bowWay.series_group as Loose) ?? {};
const bowWaySource = {
  document: bowWayGroup.catalogue as string,
  note: bowWayGroup.transcription_status as string,
};

/** Catalogue feature names with no body copy yet — titles only, verbatim. */
const titlesOnly = (names: string[] = []) =>
  names.map((title, index) => ({ id: `f${index}`, title, copy: '' }));

type Partial = {
  positioning?: string | null;
  architecture?: string | null;
  source?: Series['source'];
  specGroups?: SpecGroup[];
  modelColumns?: string[];
  models?: ModelRow[];
  features?: Series['features'];
  modelCodeRule?: string | null;
  completeness: Completeness;
  transcriptionNote?: string | null;
  components?: MachineComponent[];
  workpieces?: Workpiece[];
};

const BOW_WAY_COLUMNS = ['tableLength', 'columnsDistance', 'tableWidth'];

const BY_SLUG: Record<string, Partial> = {
  'kmc-gm': {
    positioning: gm.positioning as string,
    source: { document: gm.source.document, note: gm.source.note },
    specGroups: gmSpecs(),
    modelColumns: ['travelX', 'workingTable', 'feedRapid', 'floorSpace', 'netWeight'],
    models: gmModels(),
    features: gm.features as Series['features'],
    modelCodeRule: gm.model_code_rule as string,
    completeness: 'full',
    components: gmComponents(),
    workpieces: workpiecesOf(gm),
  },
  'kmc-gn': {
    positioning: gn.positioning as string,
    architecture: gn.architecture as string,
    source: { document: gn.source.document, note: gn.source.note },
    specGroups: gnSpecs(),
    modelColumns: ['travelX', 'travelY', 'columnsDistance', 'workingTable', 'floorSpace', 'netWeight'],
    models: gnModels(),
    features: gn.features as Series['features'],
    modelCodeRule: gn.model_code_rule as string,
    completeness: 'full',
  },
  'kmc-ce': {
    positioning: ceCh.positioning as string,
    source: { document: ceCh.source.document, note: ceCh.source.note },
    specGroups: clymeneSpecs('CE'),
    modelColumns: [
      'travelX',
      'travelY',
      'travelZ',
      'workingTable',
      'tableLoad',
      'spindleTaper',
      'spindleSpeed',
      'netWeight',
    ],
    models: clymeneModels('CE'),
    completeness: 'full',
  },
  'kmc-ch': {
    positioning: ceCh.positioning as string,
    source: { document: ceCh.source.document, note: ceCh.source.note },
    specGroups: clymeneSpecs('CH'),
    modelColumns: [
      'travelX',
      'travelY',
      'travelZ',
      'workingTable',
      'tableLoad',
      'spindleTaper',
      'spindleSpeed',
      'netWeight',
    ],
    models: clymeneModels('CH'),
    completeness: 'full',
  },
  'kmc-h7-h8': {
    positioning: hephaestus.positioning_verbatim_from_catalogue as string,
    source: bowWaySource,
    modelColumns: BOW_WAY_COLUMNS,
    models: bowWayModels(hephaestus.sub_series?.H7_H8?.models ?? []),
    features: titlesOnly(hephaestus.catalogue_features_named),
    modelCodeRule: bowWayGroup.model_code_rule as string,
    completeness: 'partial',
    transcriptionNote: bowWayGroup.transcription_status as string,
  },
  'kmc-h11': {
    positioning: hephaestus.positioning_verbatim_from_catalogue as string,
    source: bowWaySource,
    specGroups: compact([
      group('spindle', [['spindleMotor', hephaestus.sub_series?.H11?.spindle_motor]]),
    ]),
    features: titlesOnly(hephaestus.catalogue_features_named),
    completeness: 'pending',
    transcriptionNote: bowWayGroup.transcription_status as string,
  },
  'kmc-ha11': {
    positioning: hephaestus.positioning_verbatim_from_catalogue as string,
    source: bowWaySource,
    features: titlesOnly(hephaestus.catalogue_features_named),
    completeness: 'pending',
    transcriptionNote: bowWayGroup.transcription_status as string,
  },
  'kmc-ha14': {
    positioning: hephaestus.sub_series?.HA14?.catalogue_note_verbatim as string,
    source: bowWaySource,
    modelColumns: [...BOW_WAY_COLUMNS, 'tableLoad'],
    models: bowWayModels(hephaestus.sub_series?.HA14?.models ?? [], true),
    features: titlesOnly(hephaestus.catalogue_features_named),
    modelCodeRule: bowWayGroup.model_code_rule as string,
    completeness: 'partial',
    transcriptionNote: bowWayGroup.transcription_status as string,
  },
  'kmc-hma': {
    positioning: minerva.positioning_verbatim_from_catalogue as string,
    source: bowWaySource,
    modelColumns: BOW_WAY_COLUMNS,
    models: bowWayModels(minerva.models ?? []),
    features: titlesOnly(minerva.catalogue_features_named),
    modelCodeRule: bowWayGroup.model_code_rule as string,
    completeness: 'partial',
    transcriptionNote: bowWayGroup.transcription_status as string,
  },
};

function build(category: { slug: string }, entry: SeriesEntry): Series {
  const extra = BY_SLUG[entry.slug] ?? { completeness: 'pending' as Completeness };
  return {
    slug: entry.slug,
    categorySlug: category.slug,
    name: entry.name,
    epithet: entry.name.split('·')[1]?.trim() ?? entry.name,
    type: entry.type,
    positioning: extra.positioning ?? null,
    architecture: extra.architecture ?? null,
    source: extra.source ?? null,
    specGroups: extra.specGroups ?? [],
    modelColumns: extra.modelColumns ?? [],
    models: extra.models ?? [],
    features: extra.features ?? [],
    modelCodeRule: extra.modelCodeRule ?? null,
    completeness: extra.completeness,
    transcriptionNote: extra.transcriptionNote ?? null,
    legacyAliases: entry.legacyAliases,
    flagship: entry.flagship,
    images: imagesForSeries(entry.slug, seriesSlugForModel),
    components: extra.components ?? [],
    workpieces: extra.workpieces ?? [],
  };
}

export const allSeries: Series[] = productCategories.flatMap((category) =>
  category.series.map((entry) => build(category, entry)),
);

/**
 * Checked once, at module evaluation — which happens while the pages are being
 * generated. A transcription that has drifted out of shape fails the build with
 * the series named, rather than reaching a buyer as a specification table with a
 * column shifted by one.
 */
assertValidContent(allSeries, catalogueDocuments);

export const seriesBySlug = new Map(allSeries.map((series) => [series.slug, series]));

export function getSeries(categorySlug: string, seriesSlug: string): Series | undefined {
  const series = seriesBySlug.get(seriesSlug);
  return series?.categorySlug === categorySlug ? series : undefined;
}

export function seriesInCategory(categorySlug: string): Series[] {
  return allSeries.filter((series) => series.categorySlug === categorySlug);
}

/**
 * The big-number grid that opens a specification section (Scene 09): never the
 * table first.
 *
 * Two sources, both transcribed. A travel column in the model table becomes the
 * range across that series — the same range line the catalogue prints on its
 * own overview page — and the rest are series-constant rows lifted verbatim in
 * a fixed order of buyer interest. Selecting a minimum and a maximum from
 * transcribed figures is selection; no value here is calculated.
 */
const HIGHLIGHT_PRIORITY = [
  'spindleSpeed',
  'spindleSpeedVertical',
  'spindleTaper',
  'tableLoad',
  'accuracyPositioning',
  'spindleMotor',
  'spindleTorque',
];

export function specHighlights(series: Series, limit = 4): SpecRow[] {
  const highlights: SpecRow[] = [];

  const rangeFor = (column: string): SpecRow | null => {
    const index = series.modelColumns.indexOf(column);
    if (index === -1 || !series.models.length) return null;

    const parsed = series.models
      .map((model) => model.cells[index])
      .filter(Boolean)
      .map((cell) => ({ cell, number: Number(cell.replace(/[^\d.]/g, '')) }))
      .filter((entry) => Number.isFinite(entry.number) && entry.number > 0);
    if (!parsed.length) return null;

    const min = parsed.reduce((a, b) => (b.number < a.number ? b : a));
    const max = parsed.reduce((a, b) => (b.number > a.number ? b : a));
    const unit = max.cell.replace(/^[\d.,\s]+/, '').trim();

    return {
      label: column,
      value:
        min.number === max.number
          ? max.cell
          : `${min.number.toLocaleString('en-US')} – ${max.number.toLocaleString('en-US')} ${unit}`.trim(),
    };
  };

  for (const column of ['travelX', 'tableLength']) {
    const range = rangeFor(column);
    if (range) {
      highlights.push(range);
      break;
    }
  }

  const flat = series.specGroups.flatMap((group) => group.rows);
  for (const label of HIGHLIGHT_PRIORITY) {
    if (highlights.length >= limit) break;
    const row = flat.find((entry) => entry.label === label);
    if (row) highlights.push(row);
  }

  return highlights.slice(0, limit);
}

/** The catalogue that covers a series, for the downloads block. */
export function catalogueForSeries<T extends { covers: string[] }>(
  slug: string,
  documents: readonly T[],
): T | undefined {
  return documents.find((document) => document.covers.includes(slug));
}

/**
 * Aligned comparison rows for /compare (Part M.2).
 *
 * The row set is the union of every specification label the selected series
 * state, so a machine that simply does not publish a figure shows an empty cell
 * rather than borrowing a neighbour's. `differs` marks the rows where the
 * machines actually disagree — which is the only reason anyone opens this page.
 */
export type CompareRow = {
  label: string;
  values: (string | null)[];
  differs: boolean;
};

export function compareRows(selected: Series[]): CompareRow[] {
  if (!selected.length) return [];

  const order: string[] = [];
  const byLabel = new Map<string, Map<string, string>>();

  for (const series of selected) {
    const rows = [
      ...specHighlights(series, 2),
      ...series.specGroups.flatMap((group) => group.rows),
    ];
    for (const row of rows) {
      if (!byLabel.has(row.label)) {
        byLabel.set(row.label, new Map());
        order.push(row.label);
      }
      const cells = byLabel.get(row.label)!;
      if (!cells.has(series.slug)) cells.set(series.slug, row.value);
    }
  }

  return order.map((label) => {
    const cells = byLabel.get(label)!;
    const values = selected.map((series) => cells.get(series.slug) ?? null);
    const stated = values.filter((value): value is string => value !== null);
    return {
      label,
      values,
      differs: stated.length > 1 && new Set(stated).size > 1,
    };
  });
}
