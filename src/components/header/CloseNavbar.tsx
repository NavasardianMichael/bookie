'use client'

import { FC, useEffect, useRef } from 'react'
import { useRouter } from 'next/router'

type Props = {
  closeMobileNav: () => void
}

export const CloseNavbar: FC<Props> = ({ closeMobileNav }) => {
  const router = useRouter()
  const navToggleRef = useRef<HTMLInputElement>(null)
  const mobileNavRef = useRef<HTMLElement>(null)

  // Handle outside click to close mobile nav
  useEffect(() => {
    const handleOutsideClick = (event: MouseEvent) => {
      if (
        navToggleRef.current?.checked &&
        mobileNavRef.current &&
        !mobileNavRef.current.contains(event.target as Node) &&
        !(event.target as Element).closest('label[for="nav-toggle"]')
      ) {
        closeMobileNav()
      }
    }

    document.addEventListener('mousedown', handleOutsideClick)
    return () => document.removeEventListener('mousedown', handleOutsideClick)
  }, [closeMobileNav])

  useEffect(() => {
    const routeChangeComplete = () => {
      closeMobileNav()
    }

    router.events.on('routeChangeComplete', routeChangeComplete)

    // If the component is unmounted, unsubscribe
    // from the event with the `off` method:
    return () => {
      router.events.off('routeChangeComplete', routeChangeComplete)
    }
  }, [closeMobileNav, router])

  return <noscript>Mobile Navbar Closing Falsy Block</noscript>
}
