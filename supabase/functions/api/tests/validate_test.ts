import { assertEquals, assertThrows } from 'jsr:@std/assert'
import {
  parseCharacterQuery,
  parseEpisodeQuery,
  parseId,
  parseLocationQuery,
  parseSearchQuery,
} from '../lib/validate.ts'
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

Deno.test('reads every location filter out of the query string', () => {
  const query = parseLocationQuery(
    new URLSearchParams('page=2&name=earth&type=Planet&dimension=C-137'),
  )

  assertEquals(query, {
    page: 2,
    name: 'earth',
    type: 'Planet',
    dimension: 'C-137',
  })
})

Deno.test('defaults the location page to 1', () => {
  const query = parseLocationQuery(new URLSearchParams(''))
  assertEquals(query.page, 1)
})

Deno.test('rejects a malformed location page', () => {
  assertThrows(
    () => parseLocationQuery(new URLSearchParams('page=abc')),
    ValidationError,
  )
})

Deno.test('reads every episode filter out of the query string', () => {
  const query = parseEpisodeQuery(new URLSearchParams('page=3&name=pilot&episode=S01'))

  assertEquals(query, { page: 3, name: 'pilot', episode: 'S01' })
})

Deno.test('defaults the episode page to 1', () => {
  assertEquals(parseEpisodeQuery(new URLSearchParams('')).page, 1)
})

Deno.test('accepts a trimmed search query', () => {
  assertEquals(parseSearchQuery(new URLSearchParams('q=  morty  ')), 'morty')
})

Deno.test('rejects a search query shorter than two characters', () => {
  assertThrows(
    () => parseSearchQuery(new URLSearchParams('q=m')),
    Error,
    'at least 2 characters',
  )
})

Deno.test('rejects a missing search query', () => {
  assertThrows(() => parseSearchQuery(new URLSearchParams('')), Error, 'q is required')
})

Deno.test('rejects a search query longer than a hundred characters', () => {
  const long = 'm'.repeat(101)
  assertThrows(
    () => parseSearchQuery(new URLSearchParams(`q=${long}`)),
    Error,
    'at most 100 characters',
  )
})
