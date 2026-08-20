import { useSearchParams } from 'react-router-dom'
import { ChatPanel } from '../features/ai/ChatPanel'

export function AskPage() {
  const [params] = useSearchParams()
  const question = params.get('q') ?? undefined

  return (
    <main className="mx-auto max-w-[840px] space-y-8 px-6 py-10">
      <header className="space-y-3">
        <p className="font-mono text-xs tracking-widest text-muted">
          ARCHIVE INTERROGATION TERMINAL
        </p>
        <h1 className="text-fg text-3xl font-bold tracking-tight">ASK THE ARCHIVE</h1>
        <p className="text-muted text-sm">
          Answers come from the records only. Whoever is answering will tell you
          when there are none — in their own way.
        </p>
      </header>

      <ChatPanel initialQuestion={question} />
    </main>
  )
}
