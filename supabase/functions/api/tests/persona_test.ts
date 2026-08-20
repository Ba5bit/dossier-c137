import { assertEquals, assertStringIncludes, assertThrows } from 'jsr:@std/assert'
import {
  askSystemPrompt,
  dossierSystemPrompt,
  parsePersona,
  PERSONAS,
  PROMPT_VERSION,
  SUGGEST_MARKER,
} from '../lib/persona.ts'

Deno.test('accepts both personas in any casing', () => {
  assertEquals(parsePersona('rick'), 'rick')
  assertEquals(parsePersona('Morty'), 'morty')
})

Deno.test('defaults to Rick when no persona is supplied', () => {
  assertEquals(parsePersona(undefined), 'rick')
  assertEquals(parsePersona(null), 'rick')
})

Deno.test('rejects an unknown persona', () => {
  assertThrows(() => parsePersona('jerry'), Error, 'persona must be one of')
})

Deno.test('every prompt keeps the records authoritative and bans invention', () => {
  for (const prompt of [
    dossierSystemPrompt('rick'),
    dossierSystemPrompt('morty'),
    askSystemPrompt('rick'),
    askSystemPrompt('morty'),
  ]) {
    assertStringIncludes(prompt, 'CONTEXT')
    assertStringIncludes(prompt, 'Never invent')
    assertStringIncludes(prompt, 'override your memory')
  }
})

Deno.test('the two voices are actually different', () => {
  assertStringIncludes(dossierSystemPrompt('rick'), 'Rick Sanchez')
  assertStringIncludes(dossierSystemPrompt('morty'), 'Morty Smith')
  assertEquals(dossierSystemPrompt('rick') === dossierSystemPrompt('morty'), false)
})

Deno.test('the prompt version is an integer the store can key on', () => {
  assertEquals(Number.isInteger(PROMPT_VERSION), true)
})

Deno.test('the prompt version moved with the reword', () => {
  assertEquals(PROMPT_VERSION, 5)
})

Deno.test('the ask prompt never lets a thin archive become a refusal', () => {
  for (const persona of PERSONAS) {
    assertStringIncludes(askSystemPrompt(persona), 'Never refuse a question')
  }
})

Deno.test('only the ask prompt asks for follow-ups', () => {
  for (const persona of PERSONAS) {
    assertStringIncludes(askSystemPrompt(persona), SUGGEST_MARKER)
    assertEquals(dossierSystemPrompt(persona).includes(SUGGEST_MARKER), false)
  }
})

Deno.test('the ask prompt forbids mirroring an earlier voice', () => {
  for (const persona of PERSONAS) {
    assertStringIncludes(askSystemPrompt(persona), 'answer in yours')
  }
})

Deno.test('each ask voice carries its own opening instruction', () => {
  assertStringIncludes(askSystemPrompt('rick'), 'dismiss')
  assertStringIncludes(askSystemPrompt('morty'), 'aw jeez')
})
