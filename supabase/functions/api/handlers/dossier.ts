import { parseDossierBody, readJsonBody } from '../lib/validate.ts'
import type { Dossier, Persona } from '../types.ts'

export type DossierService = {
  getDossier(
    entityType: string,
    entityId: number,
    persona: Persona,
    onGenerate?: () => Promise<void> | void,
  ): Promise<Dossier>
}

export type QuotaLike = {
  check(request: Request, endpoint: 'ask' | 'dossier'): Promise<void>
}

export async function handleDossier(
  request: Request,
  service: DossierService,
  quota: QuotaLike,
): Promise<{ body: Dossier }> {
  // Validation first, so a malformed request never spends a day's allowance —
  // and the quota travels into the service, which spends it only when it is
  // about to call the provider.
  const body = parseDossierBody(await readJsonBody(request))

  return {
    body: await service.getDossier(
      body.entityType,
      body.entityId,
      body.persona,
      () => quota.check(request, 'dossier'),
    ),
  }
}
