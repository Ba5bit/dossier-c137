/**
 * A *burp* is a stage direction, not prose. Spec section 10.1 wants it
 * styled rather than printed with its asterisks inline.
 */
export function BurpText({ text }: { text: string }) {
  const parts = text.split(/(\*burp\*)/gi)

  return (
    <>
      {parts.map((part, index) =>
        /^\*burp\*$/i.test(part) ? (
          <span
            key={index}
            data-testid="burp"
            className="mx-1 font-mono text-xs uppercase tracking-widest text-accent"
          >
            {part}
          </span>
        ) : (
          <span key={index}>{part}</span>
        ),
      )}
    </>
  )
}
