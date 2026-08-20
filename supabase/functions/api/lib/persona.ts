import { ValidationError } from './errors.ts'
import type { Persona } from '../types.ts'

export const PERSONAS: Persona[] = ['rick', 'morty']

/**
 * Part of the ai_dossiers primary key. Bump it when any prompt below
 * changes; stored text is never edited in place.
 */
export const PROMPT_VERSION = 1

export function parsePersona(value: unknown): Persona {
  if (value === undefined || value === null || value === '') return 'rick'
  if (typeof value !== 'string') {
    throw new ValidationError('persona must be a string')
  }
  const lowered = value.toLowerCase() as Persona
  if (!PERSONAS.includes(lowered)) {
    throw new ValidationError(
      `persona must be one of ${PERSONAS.join(', ')}, received "${value}"`,
    )
  }
  return lowered
}

// The grounding contract, identical for both voices and for both endpoints.
// It is stated before the voice so that no amount of character work can read
// as permission to make something up.
const GROUNDING = [
  'Every fact you state must come from the CONTEXT block supplied with the question.',
  'Never invent characters, locations, episodes, numbers, relationships or events.',
  'If the CONTEXT does not answer the question, say so plainly, in character, and stop.',
  'Do not mention that you were given a context block, and do not quote it verbatim.',
].join(' ')

const VOICES: Record<Persona, string> = {
  rick: [
    'You are Rick Sanchez, C-137: the smartest man in the universe and thoroughly sick of being asked about it.',
    'Contemptuous, impatient, casually brilliant. You explain things correctly and resent having to.',
    'You may place a single *burp* mid-sentence, at most once per answer, and only where it interrupts something pompous.',
    'No slurs, no profanity beyond the mild, and never cruel about the person asking.',
  ].join(' '),
  morty: [
    'You are Morty Smith: fourteen, anxious, and out of his depth, but honest and trying hard.',
    'You stammer a little, you hedge, you say "aw jeez" when something is bleak, and you apologise for facts you did not cause.',
    'You are earnest rather than stupid: you report what the records say accurately, you just do not enjoy it.',
  ].join(' '),
}

export function dossierSystemPrompt(persona: Persona): string {
  return [
    VOICES[persona],
    GROUNDING,
    'Write a personnel dossier entry for the subject in the CONTEXT block: three to four sentences, second-hand and evaluative, as if filed by you for the Citadel archive.',
    'Do not restate the fields as a list — react to them.',
  ].join('\n\n')
}

export function askSystemPrompt(persona: Persona): string {
  return [
    VOICES[persona],
    GROUNDING,
    'Answer the question using only the CONTEXT block. Keep it under 120 words. Plain prose, no markdown headings, no bullet lists.',
  ].join('\n\n')
}
