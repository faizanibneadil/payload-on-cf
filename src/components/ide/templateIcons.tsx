import React from 'react'
import {
  Code2,
  Box,
  Terminal,
  Zap,
  Globe,
  Layout,
} from 'lucide-react'

export function getTemplateIcon(templateId: string): React.ReactNode {
  switch (templateId) {
    case 'react':
    case 'react-ts':
      return <Code2 className="size-5 text-cyan-400" />
    case 'node':
    case 'express':
      return <Terminal className="size-5 text-emerald-500" />
    case 'next':
    case 'nextjs':
      return <Box className="size-5 text-slate-100" />
    case 'vue':
      return <Code2 className="size-5 text-emerald-400" />
    case 'svelte':
      return <Zap className="size-5 text-orange-500" />
    case 'astro':
      return <Globe className="size-5 text-purple-400" />
    case 'vanilla':
    default:
      return <Layout className="size-5 text-amber-400" />
  }
}

export function TemplateIcon({ id, icon, className }: { id?: string; icon?: string; className?: string }) {
  const target = id || icon || ''
  const iconEl = getTemplateIcon(target)
  if (className && React.isValidElement(iconEl)) {
    return React.cloneElement(iconEl as React.ReactElement<{ className?: string }>, {
      className: `${(iconEl.props as { className?: string }).className || ''} ${className}`,
    })
  }
  return iconEl
}
