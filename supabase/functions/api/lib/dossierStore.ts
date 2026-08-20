import { createClient } from 'jsr:@supabase/supabase-js@2'
import type { DossierRow, DossierStore } from '../services/dossier.ts'
import type { Persona } from '../types.ts'

export function createPostgresDossierStore(
  url: string,
  serviceKey: string,
): DossierStore {
  const db = createClient(url, serviceKey)

  return {
    async read(entityType: string, entityId: number, persona: Persona, promptVersion: number) {
      const { data, error } = await db
        .from('ai_dossiers')
        .select('text, model')
        .eq('entity_type', entityType)
        .eq('entity_id', entityId)
        .eq('persona', persona)
        .eq('prompt_version', promptVersion)
        .maybeSingle()

      if (error || !data) return null
      return { text: data.text, model: data.model }
    },

    async write(row: DossierRow) {
      // A failed write costs one regeneration, never the answer in hand.
      await db.from('ai_dossiers').upsert({
        entity_type: row.entityType,
        entity_id: row.entityId,
        persona: row.persona,
        text: row.text,
        model: row.model,
        prompt_version: row.promptVersion,
      })
    },
  }
}
