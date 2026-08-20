import { assertEquals, assertThrows } from 'jsr:@std/assert'
import { parseCharacterQuery, parseId } from '../lib/validate.ts'
import { ValidationError } from '../lib/errors.ts'

Deno.test('defaults to page 1 when no page is supplied', () => {
  const result = parseCharacterQuery(new URLSearchParams(''))
  assertEquals(result.page, 1)
})

Deno.test('reads a valid page number', () => {
  const result = parseCharacterQuery(new URLSearchParams('page=7'))
  assertEquals(result.page, 7)
})

Deno.test('rejects a page below 1', () => {
  assertThrows(
    () => parseCharacterQuery(new URLSearchParams('page=0')),
    ValidationError,
  )
})

Deno.test('rejects a non-numeric page', () => {
  assertThrows(
    () => parseCharacterQuery(new URLSearchParams('page=abc')),
    ValidationError,
  )
})

Deno.test('lowercases status and accepts valid values', () => {
  const result = parseCharacterQuery(new URLSearchParams('status=Alive'))
  assertEquals(result.status, 'alive')
})

Deno.test('rejects an unknown status', () => {
  assertThrows(
    () => parseCharacterQuery(new URLSearchParams('status=undead')),
    ValidationError,
  )
})

Deno.test('trims the name and drops it when empty', () => {
  assertEquals(parseCharacterQuery(new URLSearchParams('name=  ')).name, undefined)
  assertEquals(parseCharacterQuery(new URLSearchParams('name= rick ')).name, 'rick')
})

Deno.test('omits absent optional filters', () => {
  const result = parseCharacterQuery(new URLSearchParams('page=2'))
  assertEquals(result.name, undefined)
  assertEquals(result.status, undefined)
  assertEquals(result.species, undefined)
  assertEquals(result.gender, undefined)
})

Deno.test('accepts a numeric id', () => {
  assertEquals(parseId('42'), 42)
})

Deno.test('rejects a non-numeric id', () => {
  assertThrows(() => parseId('rick'), ValidationError)
})

Deno.test('rejects a zero id', () => {
  assertThrows(() => parseId('0'), ValidationError)
})
