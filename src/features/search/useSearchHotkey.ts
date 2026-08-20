import { useEffect } from 'react'

/**
 * Cmd+K on a Mac, Ctrl+K everywhere else. Spec section 7.4. The default is
 * prevented because Firefox binds Ctrl+K to its own search bar.
 */
export function useSearchHotkey(onOpen: () => void): void {
  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault()
        onOpen()
      }
    }

    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [onOpen])
}
