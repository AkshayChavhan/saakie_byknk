'use client'

import { useEffect } from 'react'
import { GT_SUPPORTED, activeGoogleLanguage } from '@/lib/google-translate'

declare global {
  interface Window {
    googleTranslateElementInit?: () => void
    google?: {
      translate?: {
        TranslateElement?: new (
          options: { pageLanguage: string; includedLanguages: string; autoDisplay: boolean },
          elementId: string
        ) => unknown
      }
    }
  }
}

/**
 * Google's page-translation widget wraps translated text nodes in <font>
 * elements it owns. When React later reconciles those nodes it calls
 * removeChild/insertBefore on children that are no longer where it left
 * them and crashes ("Failed to execute 'removeChild' on 'Node'"). The
 * standard mitigation: make both calls tolerate a moved child instead of
 * throwing. Applied once, and only on visits where translation is active.
 */
function patchDomForTranslate(): void {
  const marker = '__saakieTranslatePatched'
  const proto = Node.prototype as Node & Record<string, unknown>
  if (proto[marker]) return
  proto[marker] = true

  const originalRemoveChild = Node.prototype.removeChild
  Node.prototype.removeChild = function <T extends Node>(this: Node, child: T): T {
    if (child.parentNode !== this) return child
    return originalRemoveChild.call(this, child) as T
  }

  const originalInsertBefore = Node.prototype.insertBefore
  Node.prototype.insertBefore = function <T extends Node>(
    this: Node,
    node: T,
    reference: Node | null
  ): T {
    if (reference && reference.parentNode !== this) {
      this.appendChild(node)
      return node
    }
    return originalInsertBefore.call(this, node, reference) as T
  }
}

/**
 * Boots Google website-translate, but only when the shopper has picked a
 * non-English language on /account/language (the `googtrans` cookie is the
 * signal — see lib/google-translate.ts). English visitors pay nothing: no
 * patch, no script, no DOM.
 */
export function GoogleTranslateLoader() {
  useEffect(() => {
    const lang = activeGoogleLanguage()
    document.documentElement.lang = lang
    if (lang === 'en') return

    patchDomForTranslate()

    if (!document.getElementById('google_translate_element')) {
      const host = document.createElement('div')
      host.id = 'google_translate_element'
      host.style.display = 'none'
      document.body.appendChild(host)
    }

    window.googleTranslateElementInit = () => {
      const TranslateElement = window.google?.translate?.TranslateElement
      if (!TranslateElement) return
      new TranslateElement(
        {
          pageLanguage: 'en',
          includedLanguages: GT_SUPPORTED.join(','),
          autoDisplay: false,
        },
        'google_translate_element'
      )
    }

    if (!document.getElementById('google-translate-script')) {
      const script = document.createElement('script')
      script.id = 'google-translate-script'
      script.src =
        'https://translate.google.com/translate_a/element.js?cb=googleTranslateElementInit'
      script.async = true
      document.body.appendChild(script)
    }
  }, [])

  return null
}
