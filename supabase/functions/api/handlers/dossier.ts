import { parseDossierBody, readJsonBody } from '../lib/validate.ts'
import type { Dossier, Persona } from '../types.ts'

export type DossierService = {
  getDossier(entityType: string, entityId: number, persona: Persona): Promise<Dossier>
}

export type QuotaLike = {
  check(request: Request, endpoint: 'ask' | 'dossier'): Promise<void>
}

export async function handleDossier(
  request: Request,
  service: DossierService,
  quota: QuotaLike,
): Promise<{ body: Dossier }> {
  const body = parseDossierBody(await readJsonBody(request))

  // Validation first, so a malformed request never spends a day's allowance.
  await quota.check(request, 'dossier')

  return { body: await service.getDossier(body.entityType, body.entityId, body.persona) }
}
