import { ValidationError } from '../lib/errors.ts'
import { dossierSystemPrompt, PROMPT_VERSION } from '../lib/persona.ts'
import type { ChatMessage } from '../clients/grokClient.ts'
import type { Resolved } from '../lib/cache.ts'
import type { CharacterDetail, Dossier, Persona } from '../types.ts'

/** Only a character has a life worth summarising. Spec section 10.1. */
export const DOSSIER_ENTITY_TYPES = ['character']

type CharacterSource = {
  getCharacter(id: number): Promise<Resolved<CharacterDetail>>
}

type GrokLike = {
  model: string
  complete(messages: ChatMessage[]): Promise<string>
}

export type DossierRow = {
  entityType: string
  entityId: number
  persona: Persona
  text: string
  model: string
  promptVersion: number
}

export type DossierStore = {
  read(
    entityType: string,
    entityId: number,
    persona: Persona,
    promptVersion: number,
  ): Promise<{ text: string; model: string } | null>
  write(row: DossierRow): Promise<void>
}

/**
 * The context block is the model's entire permitted knowledge of the subject.
 * Anything absent here cannot appear in the answer without being an invention.
 */
export function buildCharacterContext(detail: CharacterDetail): string {
  const { character, origin, location, episodes } = detail
  const lines = [
    `name: ${character.name}`,
    `status: ${character.status}`,
    `species: ${character.species}`,
    `type: ${character.type || 'none recorded'}`,
    `gender: ${character.gender}`,
    `origin: ${origin.name}`,
    `last known location: ${location.name}`,
    `episodes on record: ${character.episodeCount}`,
    `first appearances: ${
      episodes.slice(0, 3).map((e) => `${e.episode} ${e.name}`).join('; ') || 'none recorded'
    }`,
  ]
  return `CONTEXT\n${lines.join('\n')}\nEND CONTEXT`
}

export function createDossierService(
  characters: CharacterSource,
  grok: GrokLike,
  store: DossierStore,
) {
  /**
   * `onGenerate` runs only when a dossier is about to be written — never on a
   * store hit. The ceiling counts generations, which are what cost money;
   * counting views would refuse the eleventh reader of a dossier written last
   * week. The service is the only code that knows which path it is on.
   */
  async function getDossier(
    entityType: string,
    entityId: number,
    persona: Persona,
    onGenerate: () => Promise<void> | void = () => {},
  ): Promise<Dossier> {
    if (!DOSSIER_ENTITY_TYPES.includes(entityType)) {
      throw new ValidationError(
        `entityType must be one of ${DOSSIER_ENTITY_TYPES.join(', ')}, received "${entityType}"`,
      )
    }

    const stored = await store.read(entityType, entityId, persona, PROMPT_VERSION)
    if (stored) {
      return {
        entityType,
        entityId,
        persona,
        text: stored.text,
        model: stored.model,
        promptVersion: PROMPT_VERSION,
        cached: true,
      }
    }

    await onGenerate()

    // The detail request goes through the ordinary cached service, so a
    // dossier for a character somebody has already viewed costs no upstream
    // traffic at all.
    const { payload } = await characters.getCharacter(entityId)

    const text = await grok.complete([
      { role: 'system', content: dossierSystemPrompt(persona) },
      { role: 'user', content: buildCharacterContext(payload) },
    ])

    const row: DossierRow = {
      entityType,
      entityId,
      persona,
      text,
      model: grok.model,
      promptVersion: PROMPT_VERSION,
    }
    await store.write(row)

    return { ...row, cached: false }
  }

  return { getDossier }
}

export type DossierService = ReturnType<typeof createDossierService>
