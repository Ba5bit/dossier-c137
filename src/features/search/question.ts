/**
 * The two shapes of input the search box accepts. A lookup goes to the
 * archive; a question goes to the chat. Spec section 7.4.
 */
const INTERROGATIVES = [
  'who', 'what', 'where', 'when', 'why', 'how', 'is', 'are', 'was', 'were',
  'does', 'do', 'did', 'can', 'could', 'should', 'would', 'tell',
]

export function isQuestion(text: string): boolean {
  const trimmed = text.trim().toLowerCase()
  if (trimmed === '') return false
  if (trimmed.endsWith('?')) return true
  return INTERROGATIVES.includes(trimmed.split(/\s+/)[0])
}
