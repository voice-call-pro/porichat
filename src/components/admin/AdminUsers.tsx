'use client'

import { useState, useEffect, useCallback } from 'react'
import { Loader2, Shield, ShieldOff, Ban, ChevronDown, ChevronUp, Search } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { useAppStore } from '@/store/use-app-store'
import { t } from '@/lib/i18n'
import { toast } from 'sonner'

interface UserItem {
  id: string
  name: string
  email: string
  role: string
  status: string
  createdAt: string
}

export default function AdminUsers() {
  const language = useAppStore((s) => s.language)
  const [users, setUsers] = useState<UserItem[]>([])
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')

  const fetchUsers = useCallback(async () => {
    try {
      const params = new URLSearchParams({ page: String(page), limit: '15' })
      if (search) params.set('search', search)

      const res = await fetch(`/api/admin/users?${params}`)
      if (res.ok) {
        const data = await res.json()
        setUsers(Array.isArray(data) ? data : data.users || [])
      }
    } catch {
      // fallback
    } finally {
      setLoading(false)
    }
  }, [page, search])

  useEffect(() => {
    fetchUsers()
  }, [fetchUsers])

  const handleAction = async (userId: string, action: string) => {
    try {
      const res = await fetch(`/api/admin/users/${userId}/action`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action }),
      })
      if (res.ok) {
        toast.success(t('success', language))
        fetchUsers()
      } else {
        toast.error(t('error', language))
      }
    } catch {
      toast.error(t('error', language))
    }
  }

  const statusColor = (status: string) => {
    switch (status) {
      case 'online': return 'bg-green-500'
      case 'banned': return 'bg-red-500'
      case 'suspended': return 'bg-yellow-500'
      default: return 'bg-gray-400'
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-6 h-6 animate-spin text-red-500" />
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Search */}
      <div className="neo-card-sm p-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            placeholder={t('search', language)}
            className="neo-input pl-10"
          />
        </div>
      </div>

      {/* Users list */}
      {users.length === 0 ? (
        <div className="neo-card p-8 text-center text-muted-foreground">
          No users found
        </div>
      ) : (
        <div className="space-y-2">
          {users.map((user) => (
            <div key={user.id} className="neo-card-sm p-4">
              <div className="flex flex-wrap items-center gap-3">
                <Avatar className="w-10 h-10">
                  <AvatarFallback className="bg-red-500/10 text-red-600 text-xs font-bold">
                    {user.name?.charAt(0).toUpperCase()}
                  </AvatarFallback>
                </Avatar>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="font-medium text-sm truncate">{user.name}</p>
                    <Badge
                      variant="secondary"
                      className="text-[10px] shrink-0"
                    >
                      {user.role}
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground truncate">{user.email}</p>
                  <p className="text-[10px] text-muted-foreground">{user.createdAt}</p>
                </div>

                <div className="flex items-center gap-1.5">
                  <div className={`w-2.5 h-2.5 rounded-full ${statusColor(user.status)}`} />
                  <span className="text-xs text-muted-foreground capitalize">{user.status}</span>
                </div>

                <div className="flex gap-1 shrink-0">
                  {user.role !== 'moderator' && user.role !== 'admin' && (
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => handleAction(user.id, 'promote')}
                      className="text-xs h-8"
                      title={t('promote', language)}
                    >
                      <Shield className="w-3 h-3" />
                    </Button>
                  )}
                  {user.role === 'moderator' && (
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => handleAction(user.id, 'demote')}
                      className="text-xs h-8"
                      title={t('demote', language)}
                    >
                      <ShieldOff className="w-3 h-3" />
                    </Button>
                  )}
                  {user.status !== 'banned' && user.role !== 'admin' && (
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => handleAction(user.id, 'ban')}
                      className="text-xs h-8 text-red-500 hover:text-red-600"
                      title={t('banUser', language)}
                    >
                      <Ban className="w-3 h-3" />
                    </Button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Pagination */}
      <div className="flex justify-center gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={() => setPage((p) => Math.max(1, p - 1))}
          disabled={page <= 1}
          className="neo-button"
        >
          {t('previous', language)}
        </Button>
        <span className="flex items-center text-sm text-muted-foreground px-3">Page {page}</span>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setPage((p) => p + 1)}
          disabled={users.length < 15}
          className="neo-button"
        >
          {t('next', language)}
        </Button>
      </div>
    </div>
  )
}
