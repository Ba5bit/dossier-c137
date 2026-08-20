import { useMutation } from '@tanstack/react-query'
import { postDossier } from '../../shared/api/client'
import type { Persona } from '../../shared/api/types'

/**
 * A mutation rather than a query: generation is an explicit act with a cost,
 * so it never fires on render.
 */
export function useDossier(entityId: number, persona: Persona) {
  return useMutation({
    mutationFn: () => postDossier({ entityType: 'character', entityId, persona }),
  })
}
