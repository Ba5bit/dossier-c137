import { assertEquals, assertStringIncludes, assertThrows } from 'jsr:@std/assert'
import {
  askSystemPrompt,
  dossierSystemPrompt,
  parsePersona,
  PERSONAS,
  PROMPT_VERSION,
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

Deno.test('every prompt forbids facts outside the context', () => {
  for (const prompt of [
    dossierSystemPrompt('rick'),
    dossierSystemPrompt('morty'),
    askSystemPrompt('rick'),
    askSystemPrompt('morty'),
  ]) {
    assertStringIncludes(prompt, 'CONTEXT')
    assertStringIncludes(prompt, 'Never invent')
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
  assertEquals(PROMPT_VERSION, 2)
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
