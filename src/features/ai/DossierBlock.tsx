import { useDossier } from './useDossier'
import { BurpText } from './BurpText'
import { COPY } from '../../shared/lore/copy'
import { useSettings } from '../../shared/settings/useSettings'
import { Skeleton } from '../../shared/ui/Skeleton'
import { ApiError } from '../../shared/api/client'

type DossierBlockProps = {
  entityId: number
}

function messageFor(error: unknown): string {
  if (error instanceof ApiError) return error.message
  return COPY.ai.dossierFailed
}

export function DossierBlock({ entityId }: DossierBlockProps) {
  const { settings } = useSettings()
  const { mutate, data, error, isPending, isError } = useDossier(entityId, settings.persona)

  return (
    <section className="space-y-3 border border-line bg-surface p-6">
      <div className="flex items-baseline justify-between gap-4">
        <h2 className="font-mono text-xs tracking-widest text-muted">
          {COPY.ai.dossierTitle}
        </h2>
        <span className="font-mono text-xs text-accent">
          {COPY.ai.personaNames[settings.persona]}
        </span>
      </div>

      {isPending && (
        <div className="space-y-2">
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-11/12" />
          <Skeleton className="h-4 w-9/12" />
        </div>
      )}

      {data && (
        <p className="text-fg text-sm leading-relaxed">
          <BurpText text={data.text} />
        </p>
      )}

      {isError && (
        // A provider failure is confined here: the rest of the dossier page
        // is untouched. Spec section 6.6.
        <p className="text-sm text-dead">{messageFor(error)}</p>
      )}

      {!data && !isPending && (
        <button
          type="button"
          onClick={() => mutate()}
          className="border border-line px-4 py-2 font-mono text-xs text-fg transition-colors hover:border-accent hover:text-accent"
        >
          {isError ? COPY.ai.dossierRetry : COPY.ai.dossierGenerate}
        </button>
      )}
    </section>
  )
}
