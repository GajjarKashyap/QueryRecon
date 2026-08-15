export interface ChartSpec {
  title: string;
  labels: string[];
  values: number[];
  unit?: string;
}

export function parseChartSpec(source: string): ChartSpec | null {
  try {
    const value = JSON.parse(source.trim());
    if (!value || typeof value.title !== 'string' || !Array.isArray(value.labels) || !Array.isArray(value.values)) return null;
    if (!value.labels.length || value.labels.length !== value.values.length || value.labels.length > 20) return null;
    if (!value.labels.every((item: unknown) => typeof item === 'string' && item.length <= 80)) return null;
    if (!value.values.every((item: unknown) => typeof item === 'number' && Number.isFinite(item) && item >= 0)) return null;
    if (value.unit !== undefined && typeof value.unit !== 'string') return null;
    return { title: value.title.slice(0, 120), labels: value.labels, values: value.values, unit: value.unit?.slice(0, 20) };
  } catch {
    return null;
  }
}
