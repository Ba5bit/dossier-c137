import { assertEquals, assertStringIncludes } from 'jsr:@std/assert'
import { createDossierService } from '../services/dossier.ts'
import { PROMPT_VERSION } from '../lib/persona.ts'
import type { ChatMessage } from '../clients/grokClient.ts'
import type { CharacterDetail } from '../types.ts'

const detail: CharacterDetail = {
  character: {
    id: 1,
    name: 'Rick Sanchez',
    status: 'Alive',
    species: 'Human',
    type: '',
    gender: 'Male',
    image: 'https://example.test/1.jpeg',
    origin: { name: 'Earth (C-137)', id: 1 },
    location: { name: 'Citadel of Ricks', id: 3 },
    episodeCount: 51,
  },
  origin: { id: 1, name: 'Earth (C-137)', resolved: true },
  location: { id: 3, name: 'Citadel of Ricks', resolved: true },
  episodes: [
    { id: 1, name: 'Pilot', episode: 'S01E01' },
    { id: 2, name: 'Lawnmower Dog', episode: 'S01E02' },
  ],
}

function stubCharacters() {
  const ids: number[] = []
  return {
    ids,
    service: {
      getCharacter: async (id: number) => {
        ids.push(id)
        return { payload: { ...detail, character: { ...detail.character, id } }, stale: false }
      },
    },
  }
}

function stubGrok(text = 'He drinks. He invents. *burp* Mostly in that order.') {
  const calls: ChatMessage[][] = []
  return {
    calls,
    client: {
      model: 'grok-test',
      complete: async (messages: ChatMessage[]) => {
        calls.push(messages)
        return text
      },
    },
  }
}

function memoryStore(seed: Record<string, { text: string; model: string }> = {}) {
  const writes: unknown[] = []
  return {
    writes,
    store: {
      read: async (entityType: string, entityId: number, persona: string, version: number) =>
        seed[`${entityType}/${entityId}/${persona}/${version}`] ?? null,
      write: async (row: unknown) => {
        writes.push(row)
      },
    },
  }
}

Deno.test('generates a dossier and stores it', async () => {
  const characters = stubCharacters()
  const grok = stubGrok()
  const store = memoryStore()
  const service = createDossierService(characters.service, grok.client, store.store)

  const dossier = await service.getDossier('character', 1, 'rick')

  assertEquals(dossier.text, 'He drinks. He invents. *burp* Mostly in that order.')
  assertEquals(dossier.cached, false)
  assertEquals(dossier.model, 'grok-test')
  assertEquals(dossier.persona, 'rick')
  assertEquals(dossier.promptVersion, PROMPT_VERSION)
  assertEquals(store.writes.length, 1)
})

Deno.test('returns a stored dossier without calling the provider', async () => {
  const characters = stubCharacters()
  const grok = stubGrok()
  const store = memoryStore({
    [`character/1/rick/${PROMPT_VERSION}`]: { text: 'On file.', model: 'grok-old' },
  })
  const service = createDossierService(characters.service, grok.client, store.store)

  const dossier = await service.getDossier('character', 1, 'rick')

  assertEquals(dossier.text, 'On file.')
  assertEquals(dossier.cached, true)
  assertEquals(dossier.model, 'grok-old')
  assertEquals(grok.calls.length, 0)
  assertEquals(characters.ids.length, 0)
})

Deno.test('keeps the two personas apart', async () => {
  const characters = stubCharacters()
  const grok = stubGrok()
  const store = memoryStore({
    [`character/1/rick/${PROMPT_VERSION}`]: { text: 'Rick wrote this.', model: 'grok-old' },
  })
  const service = createDossierService(characters.service, grok.client, store.store)

  const dossier = await service.getDossier('character', 1, 'morty')

  assertEquals(dossier.cached, false)
  assertEquals(grok.calls.length, 1)
})

Deno.test('grounds the prompt in the real record', async () => {
  const characters = stubCharacters()
  const grok = stubGrok()
  const store = memoryStore()
  const service = createDossierService(characters.service, grok.client, store.store)

  await service.getDossier('character', 1, 'rick')

  const [system, user] = grok.calls[0]
  assertEquals(system.role, 'system')
  assertStringIncludes(system.content, 'Rick Sanchez')
  assertEquals(user.role, 'user')
  assertStringIncludes(user.content, 'CONTEXT')
  assertStringIncludes(user.content, 'Citadel of Ricks')
  assertStringIncludes(user.content, 'Pilot')
  assertStringIncludes(user.content, '51')
})

Deno.test('rejects an entity type that has no biography', async () => {
  const characters = stubCharacters()
  const grok = stubGrok()
  const store = memoryStore()
  const service = createDossierService(characters.service, grok.client, store.store)

  let code = ''
  try {
    await service.getDossier('location', 3, 'rick')
  } catch (error) {
    code = (error as { code: string }).code
  }

  assertEquals(code, 'INVALID_PARAMETER')
})

Deno.test('does not spend the allowance on a stored dossier', async () => {
  const characters = stubCharacters()
  const grok = stubGrok()
  const store = memoryStore({
    [`character/1/rick/${PROMPT_VERSION}`]: { text: 'On file.', model: 'grok-old' },
  })
  const service = createDossierService(characters.service, grok.client, store.store)

  let spent = 0
  const dossier = await service.getDossier('character', 1, 'rick', () => {
    spent += 1
  })

  assertEquals(dossier.cached, true)
  assertEquals(spent, 0)
})

Deno.test('spends the allowance before generating a new dossier', async () => {
  const characters = stubCharacters()
  const grok = stubGrok()
  const store = memoryStore()
  const service = createDossierService(characters.service, grok.client, store.store)

  const order: string[] = []
  await service.getDossier('character', 1, 'rick', () => {
    order.push('quota')
  })

  assertEquals(order, ['quota'])
  assertEquals(grok.calls.length, 1)
})

Deno.test('a refused allowance never reaches the provider', async () => {
  const characters = stubCharacters()
  const grok = stubGrok()
  const store = memoryStore()
  const service = createDossierService(characters.service, grok.client, store.store)

  let message = ''
  try {
    await service.getDossier('character', 1, 'rick', () => {
      throw new Error('out of fluid')
    })
  } catch (error) {
    message = (error as Error).message
  }

  assertEquals(message, 'out of fluid')
  assertEquals(grok.calls.length, 0)
  assertEquals(store.writes.length, 0)
})
