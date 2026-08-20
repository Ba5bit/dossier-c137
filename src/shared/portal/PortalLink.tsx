import { Link } from 'react-router-dom'
import type { ComponentProps, MouseEvent } from 'react'
import { usePortalNavigation } from './usePortalNavigation'
import type { PortalVariant } from './usePortalMachine'

type PortalLinkProps = Omit<ComponentProps<typeof Link>, 'to'> & {
  to: string
  variant?: PortalVariant
}

export function PortalLink({
  to,
  variant = 'full',
  onClick,
  children,
  ...rest
}: PortalLinkProps) {
  const navigateThroughPortal = usePortalNavigation()

  function handleClick(event: MouseEvent<HTMLAnchorElement>) {
    onClick?.(event)

    // Modified clicks open tabs and windows. Leave them to the browser.
    if (event.defaultPrevented || event.button !== 0) return
    if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return

    event.preventDefault()
    navigateThroughPortal(to, variant)
  }

  return (
    <Link to={to} onClick={handleClick} {...rest}>
      {children}
    </Link>
  )
}
