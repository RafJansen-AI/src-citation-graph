// Concepts that appear meaningfully in SRC research — everything else → "Other"
export const SRC_CONCEPTS = new Set([
  'Environmental science',
  'Ecology',
  'Geography',
  'Sociology',
  'Economics',
  'Political science',
  'Computer science',
  'Medicine',
  'Biology',
  'Psychology',
  'Business', // OpenAlex L0 label for sustainability governance, management, etc.
])

const OTHER_COLOR = '#6B7280'

/**
 * Returns the display colour for a focus area concept.
 * Non-SRC concepts all get the neutral "Other" grey so the legend stays readable.
 */
export function resolveConceptColor(
  concept: string,
  conceptColors: Record<string, string>,
): string {
  if (SRC_CONCEPTS.has(concept)) {
    return conceptColors[concept] ?? conceptColors['Other'] ?? OTHER_COLOR
  }
  return conceptColors['Other'] ?? OTHER_COLOR
}
