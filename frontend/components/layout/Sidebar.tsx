// components/layout/Sidebar.tsx
'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { LayoutDashboard, Activity, History, Zap, Bell } from 'lucide-react'

const navigation = [
  { name: 'Analyze Incident', href: '/', icon: LayoutDashboard },
  { name: 'Results', href: '/results', icon: Activity },
  { name: 'History', href: '/history', icon: History },
]

export function Sidebar() {
  const pathname = usePathname()

  return (
    <aside className="w-64 border-r border-gray-800 bg-gray-950/50 backdrop-blur-sm flex flex-col">
      <div className="p-6 border-b border-gray-800">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center">
            <Zap className="w-5 h-5 text-white" />
          </div>
          <span className="font-semibold text-lg tracking-tight">RespondIQ</span>
        </div>
        <p className="text-xs text-gray-500 mt-1">AI Incident Platform</p>
      </div>

      <nav className="flex-1 p-4 space-y-1">
        {navigation.map((item) => {
          const isActive = pathname === item.href
          return (
            <Link
              key={item.name}
              href={item.href}
              className={`
                flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200 group
                ${isActive 
                  ? 'bg-gradient-to-r from-blue-500/10 to-purple-500/10 text-blue-400 border border-blue-500/20' 
                  : 'text-gray-400 hover:text-gray-200 hover:bg-gray-800/50'
                }
              `}
            >
              <item.icon className={`w-5 h-5 transition-colors ${isActive ? 'text-blue-400' : 'group-hover:text-gray-300'}`} />
              <span className="text-sm font-medium">{item.name}</span>
            </Link>
          )
        })}
      </nav>

      <div className="p-4 border-t border-gray-800">
        <div className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-gray-800/50 transition-colors">
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-gray-700 to-gray-800 flex items-center justify-center">
            <Bell className="w-4 h-4 text-gray-300" />
          </div>
          <div className="flex-1">
            <p className="text-sm font-medium">Incident Workspace</p>
            <p className="text-xs text-gray-500">Ready</p>
          </div>
        </div>
      </div>
    </aside>
  )
}