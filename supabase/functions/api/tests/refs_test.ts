import { assertEquals } from 'jsr:@std/assert'
import { idFromUrl, idsFromUrls, toRef, toRelationRef } from '../services/refs.ts'

Deno.test('reads the trailing id out of a relation URL', () => {
  assertEquals(idFromUrl('https://rickandmortyapi.com/api/location/20'), 20)
})

Deno.test('reports no id for an empty relation URL', () => {
  assertEquals(idFromUrl(''), null)
})

Deno.test('reports no id for a URL that does not end in a number', () => {
  assertEquals(idFromUrl('https://rickandmortyapi.com/api/location'), null)
})

Deno.test('builds a list-shaped ref', () => {
  assertEquals(
    toRef({ name: 'Earth (C-137)', url: 'https://rickandmortyapi.com/api/location/1' }),
    { name: 'Earth (C-137)', id: 1 },
  )
})

Deno.test('marks a resolvable relation as resolved', () => {
  assertEquals(
    toRelationRef({ name: 'Earth (C-137)', url: 'https://rickandmortyapi.com/api/location/1' }),
    { id: 1, name: 'Earth (C-137)', resolved: true },
  )
})

Deno.test('marks an unknown relation as unresolved', () => {
  assertEquals(
    toRelationRef({ name: 'unknown', url: '' }),
    { id: null, name: 'unknown', resolved: false },
  )
})

Deno.test('collects the ids from a list of relation URLs', () => {
  assertEquals(
    idsFromUrls([
      'https://rickandmortyapi.com/api/episode/1',
      'https://rickandmortyapi.com/api/episode/2',
    ]),
    [1, 2],
  )
})

Deno.test('drops relations that carry no id', () => {
  assertEquals(
    idsFromUrls(['https://rickandmortyapi.com/api/episode/1', '']),
    [1],
  )
})
