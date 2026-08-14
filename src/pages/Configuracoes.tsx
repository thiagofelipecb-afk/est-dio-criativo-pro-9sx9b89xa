import React, { useState, useEffect, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { usePlatform } from '@/context/PlatformContext'
import { ModuleHeader, Field, inputClass } from '@/components/marketing/Shared'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from '@/components/ui/tooltip'
import {
  Settings,
  Copy,
  RefreshCw,
  CheckCircle2,
  ExternalLink,
  Chrome,
  Shield,
  User,
  Cpu,
  Link2,
  Database,
  Download,
  Trash2,
  Instagram,
  Youtube,
  AlertTriangle,
  Sparkles,
} from 'lucide-react'
import { toast } from 'sonner'

interface UserProfile {
  name: string
  email: string
  avatar: string
}

const DEFAULT_PROFILE: UserProfile = { name: '', email: '', avatar: '' }

function loadProfile(): UserProfile {
  try {
    const saved = localStorage.getItem('lumen_profile')
    return saved ? { ...DEFAULT_PROFILE, ...JSON.parse(saved) } : DEFAULT_PROFILE
  } catch {
    return DEFAULT_PROFILE
  }
}

// Lista de chaves localStorage do LUMEN (para exportar/excluir)
const LUMEN_KEYS = [
  'lumen_brand_profile',
  'lumen_jobs',
  'lumen_content',
  'lumen_ideas',
  'lumen_funnel_diagnosis',
  'lumen_funnel_ecosystem',
  'lumen_funnel_plans',
  'lumen_pages',
  'lumen_video_scripts',
  'lumen_ad_creations',
  'lumen_ad_intel',
  'lumen_sales_requests',
  'lumen_sales_scripts',
  'lumen_captured',
  'lumen_profiles',
  'lumen_metrics',
  'lumen_token',
  'lumen_clara',
  'lumen_schedule_events',
  'lumen_elementos',
  'lumen_templates',
  'lumen_academy_progress',
  'lumen_profile',
  'lumen_assessoria',
  'lumen_scheduled_posts',
]

export default function Configuracoes() {
  const navigate = useNavigate()
  const { token, rotateToken, hasBrandOS, brandProfile } = usePlatform()
  const [copied, setCopied] = useState(false)
  const [profile, setProfile] = useState<UserProfile>(loadProfile)
  const [tokenInput, setTokenInput] = useState(token?.token || '')
  const [tokenValid, setTokenValid] = useState<boolean | null>(null)
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [confirmText, setConfirmText] = useState('')

  useEffect(() => {
    localStorage.setItem('lumen_profile', JSON.stringify(profile))
  }, [profile])

  useEffect(() => {
    setTokenInput(token?.token || '')
  }, [token])

  const copyToken = () => {
    if (!token) return
    navigator.clipboard.writeText(token.token)
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
    toast.success('Token copiado!')
  }

  const validateToken = (val: string) => {
    setTokenInput(val)
    if (val.length === 0) {
      setTokenValid(null)
      return
    }
    setTokenValid(val.trim().length >= 8)
  }

  const steps = [
    'Instale a extensão na Chrome Web Store',
    'Abra a extensão e clique em "Configurar"',
    'Cole seu token pessoal de acesso',
    'Abra um perfil do Instagram',
    'Verifique o botão "Analisar perfil"',
    'Capture posts, anúncios e perfis',
    'Em vídeos, a extensão transcreve o áudio',
    'Os criativos aparecem na Biblioteca',
  ]

  const exportData = () => {
    const data: Record<string, any> = {}
    LUMEN_KEYS.forEach((k) => {
      try {
        const raw = localStorage.getItem(k)
        data[k] = raw ? JSON.parse(raw) : null
      } catch {
        data[k] = localStorage.getItem(k)
      }
    })
    const blob = new Blob(
      [JSON.stringify({ exportedAt: new Date().toISOString(), data }, null, 2)],
      {
        type: 'application/json',
      },
    )
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `lumen-studio-backup-${new Date().toISOString().slice(0, 10)}.json`
    a.click()
    URL.revokeObjectURL(url)
    toast.success('Dados exportados com sucesso!')
  }

  const deleteAllData = () => {
    if (confirmText !== 'EXCLUIR') {
      toast.error('Digite EXCLUIR para confirmar.')
      return
    }
    LUMEN_KEYS.forEach((k) => localStorage.removeItem(k))
    setConfirmOpen(false)
    setConfirmText('')
    toast.success('Todos os dados foram excluídos. Recarregando…')
    setTimeout(() => window.location.reload(), 1200)
  }

  return (
    <TooltipProvider delayDuration={200}>
      <div className="p-4 sm:p-6 lg:p-8 max-w-4xl mx-auto space-y-6 animate-fade-in">
        <ModuleHeader
          title="Configurações"
          description="Perfil, Brand OS ativo, provedor de IA, token de captura, integrações e gerenciamento de dados."
          icon={<Settings className="w-5 h-5" />}
          accent="#7C5CFC"
        />

        {/* Perfil */}
        <Section icon={<User className="w-4 h-4 text-[#7C5CFC]" />} title="Perfil">
          <div className="flex items-center gap-4 mb-3">
            <div className="h-14 w-14 rounded-full bg-gradient-to-tr from-[#7C5CFC] to-[#22D3EE] flex items-center justify-center text-white font-bold text-lg overflow-hidden">
              {profile.avatar ? (
                <img src={profile.avatar} alt="Avatar" className="w-full h-full object-cover" />
              ) : (
                profile.name?.charAt(0).toUpperCase() || <User className="w-6 h-6" />
              )}
            </div>
            <Field label="URL do avatar (opcional)">
              <input
                type="text"
                aria-label="URL do avatar"
                className={inputClass}
                value={profile.avatar}
                onChange={(e) => setProfile({ ...profile, avatar: e.target.value })}
                placeholder="https://…"
              />
            </Field>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Field label="Nome">
              <input
                type="text"
                aria-label="Nome"
                className={inputClass}
                value={profile.name}
                onChange={(e) => setProfile({ ...profile, name: e.target.value })}
                placeholder="Seu nome"
              />
            </Field>
            <Field label="E-mail">
              <input
                type="email"
                aria-label="E-mail"
                className={inputClass}
                value={profile.email}
                onChange={(e) => setProfile({ ...profile, email: e.target.value })}
                placeholder="voce@email.com"
              />
            </Field>
          </div>
          <p className="text-[10px] text-[#9494A8] mt-2">Salvo automaticamente em lumen_profile.</p>
        </Section>

        {/* Brand OS Ativo */}
        <Section icon={<Sparkles className="w-4 h-4 text-[#7C5CFC]" />} title="Brand OS Ativo">
          {hasBrandOS ? (
            <div className="space-y-2">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                <SummaryItem label="Serviço" value={brandProfile.base.service} />
                <SummaryItem label="Nicho" value={brandProfile.base.niche} />
                <SummaryItem label="Tom de voz" value={brandProfile.base.voice} />
              </div>
              <div className="flex items-center justify-between flex-wrap gap-2 pt-1">
                <span className="text-[11px] text-[#9494A8]">
                  Versão atual: <b className="text-white">{brandProfile.activeVersion}</b>
                  {brandProfile.lastGeneratedAt && (
                    <>
                      {' '}
                      • Gerado em {new Date(brandProfile.lastGeneratedAt).toLocaleString('pt-BR')}
                    </>
                  )}
                </span>
                <Button
                  size="sm"
                  variant="outline"
                  className="border-white/10 text-xs"
                  onClick={() => navigate('/posicionamento')}
                >
                  Editar Brand OS
                </Button>
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-between gap-3 flex-wrap">
              <p className="text-xs text-[#9494A8]">
                Nenhum Brand OS configurado. Ele alimenta todos os geradores de IA.
              </p>
              <Button
                size="sm"
                className="bg-[#7C5CFC] text-xs"
                onClick={() => navigate('/posicionamento')}
              >
                Configurar em /posicionamento
              </Button>
            </div>
          )}
        </Section>

        {/* Provedor de IA */}
        <Section icon={<Cpu className="w-4 h-4 text-[#22D3EE]" />} title="Provedor de IA">
          <div className="space-y-2">
            <label className="text-xs text-[#9494A8]">Provedor ativo</label>
            <select aria-label="Provedor de IA" className={inputClass} defaultValue="simulado">
              <option value="simulado">Simulado (local)</option>
            </select>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-2">
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className="flex items-center justify-between rounded-lg bg-[#0e0e15]/60 border border-white/5 p-2.5 opacity-60 cursor-not-allowed">
                    <span className="text-xs text-slate-300">OpenAI</span>
                    <Badge className="bg-white/5 text-[#9494A8] border-white/10 text-[9px]">
                      Indisponível
                    </Badge>
                  </div>
                </TooltipTrigger>
                <TooltipContent className="bg-[#1C1C27] text-white border-white/10 text-xs">
                  Configure a integração com Supabase primeiro
                </TooltipContent>
              </Tooltip>
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className="flex items-center justify-between rounded-lg bg-[#0e0e15]/60 border border-white/5 p-2.5 opacity-60 cursor-not-allowed">
                    <span className="text-xs text-slate-300">Claude (Anthropic)</span>
                    <Badge className="bg-white/5 text-[#9494A8] border-white/10 text-[9px]">
                      Indisponível
                    </Badge>
                  </div>
                </TooltipTrigger>
                <TooltipContent className="bg-[#1C1C27] text-white border-white/10 text-xs">
                  Configure a integração com Supabase primeiro
                </TooltipContent>
              </Tooltip>
            </div>
            <p className="text-[11px] text-emerald-400 mt-1">
              Limites de uso: ilimitado (modo simulado)
            </p>
          </div>
        </Section>

        {/* Token de Captura */}
        <Section icon={<Shield className="w-4 h-4 text-[#7C5CFC]" />} title="Tokens de Captura">
          {token ? (
            <div className="space-y-2">
              <div className="flex items-center gap-2 bg-[#0e0e15]/60 border border-white/10 rounded-xl p-3">
                <code className="flex-1 text-xs text-[#22D3EE] font-mono truncate">
                  {token.token}
                </code>
                <Button
                  size="sm"
                  variant="outline"
                  className="border-white/10 text-xs gap-1 shrink-0"
                  onClick={copyToken}
                >
                  {copied ? (
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                  ) : (
                    <Copy className="w-3.5 h-3.5" />
                  )}{' '}
                  {copied ? 'Copiado' : 'Copiar'}
                </Button>
              </div>
              <p className="text-[10px] text-[#9494A8]">
                Criado em {new Date(token.createdAt).toLocaleString('pt-BR')}
                {token.lastUsedAt
                  ? ` • Último uso: ${new Date(token.lastUsedAt).toLocaleString('pt-BR')}`
                  : ' • Sem uso registrado'}
              </p>
              <Button
                size="sm"
                variant="outline"
                className="border-amber-500/30 text-amber-400 hover:bg-amber-500/10 text-xs gap-1.5"
                onClick={() => {
                  rotateToken()
                  toast.success(
                    'Novo token gerado! O anterior foi invalidado — atualize na extensão.',
                  )
                }}
              >
                <RefreshCw className="w-3.5 h-3.5" /> Gerar novo token (UUID)
              </Button>
            </div>
          ) : (
            <div className="space-y-2">
              <p className="text-xs text-[#9494A8]">
                Nenhum token ativo. Gere um para conectar a extensão.
              </p>
              <Button
                size="sm"
                onClick={() => {
                  rotateToken()
                  toast.success('Token gerado! Copie e cole na extensão.')
                }}
                className="bg-[#7C5CFC] text-xs gap-1.5"
              >
                <RefreshCw className="w-3.5 h-3.5" /> Gerar novo token
              </Button>
            </div>
          )}

          {/* Validação de formato */}
          <div className="mt-3 pt-3 border-t border-white/5">
            <Field
              label="Validar token manualmente"
              hint="Mínimo de 8 caracteres. Cole um token para validar o formato."
            >
              <input
                type="text"
                aria-label="Validar token"
                className={inputClass}
                value={tokenInput}
                onChange={(e) => validateToken(e.target.value)}
                placeholder="Cole um token…"
              />
            </Field>
            {tokenValid !== null && (
              <p className={`text-[11px] mt-1 ${tokenValid ? 'text-emerald-400' : 'text-red-400'}`}>
                {tokenValid ? '✓ Formato válido (≥ 8 caracteres)' : '✗ Token muito curto'}
              </p>
            )}
          </div>
        </Section>

        {/* Integrações */}
        <Section icon={<Link2 className="w-4 h-4 text-[#22D3EE]" />} title="Integrações">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {[
              { name: 'Instagram', icon: <Instagram className="w-4 h-4" /> },
              { name: 'TikTok', icon: <Youtube className="w-4 h-4" /> },
              { name: 'YouTube', icon: <Youtube className="w-4 h-4" /> },
            ].map((int) => (
              <Tooltip key={int.name}>
                <TooltipTrigger asChild>
                  <div className="rounded-xl bg-[#0e0e15]/60 border border-white/5 p-3 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="flex items-center gap-1.5 text-xs font-semibold text-white">
                        {int.icon} {int.name}
                      </span>
                      <Badge className="bg-white/5 text-[#9494A8] border-white/10 text-[9px]">
                        Não conectado
                      </Badge>
                    </div>
                    <Button
                      size="sm"
                      disabled
                      className="w-full bg-white/5 text-[#9494A8] text-[11px] cursor-not-allowed"
                    >
                      Conectar
                    </Button>
                  </div>
                </TooltipTrigger>
                <TooltipContent className="bg-[#1C1C27] text-white border-white/10 text-xs">
                  Disponível após configurar Supabase
                </TooltipContent>
              </Tooltip>
            ))}
          </div>
        </Section>

        {/* Extensão Chrome — mantido */}
        <Section icon={<Chrome className="w-4 h-4 text-[#22D3EE]" />} title="Extensão Chrome">
          <a
            href="https://chromewebstore.google.com/"
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1.5 text-xs text-[#22D3EE] hover:underline"
          >
            <ExternalLink className="w-3.5 h-3.5" /> Abrir Chrome Web Store
          </a>
          <div className="space-y-2 mt-2">
            <p className="text-xs font-semibold text-[#9494A8] uppercase">Tutorial — 8 passos</p>
            {steps.map((s, i) => (
              <div key={i} className="flex items-start gap-3 rounded-lg bg-[#0e0e15]/60 p-2.5">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#7C5CFC]/20 text-[#7C5CFC] text-[10px] font-bold">
                  {i + 1}
                </span>
                <span className="text-xs text-slate-300 pt-0.5">{s}</span>
              </div>
            ))}
          </div>
        </Section>

        {/* Dados */}
        <Section icon={<Database className="w-4 h-4 text-[#7C5CFC]" />} title="Dados">
          <div className="flex flex-col sm:flex-row gap-2">
            <Button
              size="sm"
              variant="outline"
              className="border-white/10 text-xs gap-1.5"
              onClick={exportData}
            >
              <Download className="w-3.5 h-3.5" /> Exportar todos os dados (JSON)
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="border-red-500/30 text-red-400 hover:bg-red-500/10 text-xs gap-1.5"
              onClick={() => setConfirmOpen(true)}
            >
              <Trash2 className="w-3.5 h-3.5" /> Excluir todos os dados
            </Button>
          </div>
          <p className="text-[10px] text-[#9494A8] mt-2">
            A exportação inclui todas as chaves LUMEN do localStorage. A exclusão é irreversível.
          </p>
        </Section>

        {/* Modal de confirmação dupla */}
        {confirmOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
            <div className="w-full max-w-md rounded-2xl bg-[#14141C] border border-red-500/30 p-5 space-y-4">
              <div className="flex items-center gap-2 text-red-400">
                <AlertTriangle className="w-5 h-5" />
                <h3 className="text-sm font-bold">Excluir todos os dados</h3>
              </div>
              <p className="text-xs text-slate-300">
                Esta ação removerá <b>permanentemente</b> todos os dados do LUMEN Studio deste
                navegador (Brand OS, conteúdos, funis, ativos, métricas, capturas, agendamentos,
                conversas da Clara, etc.). Não pode ser desfeito.
              </p>
              <Field label='Digite "EXCLUIR" para confirmar'>
                <input
                  type="text"
                  aria-label="Confirmar exclusão"
                  className={`${inputClass} border-red-500/30`}
                  value={confirmText}
                  onChange={(e) => setConfirmText(e.target.value)}
                  placeholder="EXCLUIR"
                />
              </Field>
              <div className="flex justify-end gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  className="border-white/10 text-xs"
                  onClick={() => {
                    setConfirmOpen(false)
                    setConfirmText('')
                  }}
                >
                  Cancelar
                </Button>
                <Button
                  size="sm"
                  className="bg-red-500 hover:bg-red-600 text-xs gap-1.5"
                  onClick={deleteAllData}
                >
                  <Trash2 className="w-3.5 h-3.5" /> Excluir tudo
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </TooltipProvider>
  )
}

function Section({
  icon,
  title,
  children,
}: {
  icon: React.ReactNode
  title: string
  children: React.ReactNode
}) {
  return (
    <div className="rounded-2xl bg-[#14141C] border border-white/5 p-5 space-y-4">
      <h3 className="text-sm font-bold text-white flex items-center gap-2">
        {icon} {title}
      </h3>
      {children}
    </div>
  )
}

function SummaryItem({ label, value }: { label: string; value?: string }) {
  return (
    <div className="rounded-lg bg-[#0e0e15]/60 border border-white/5 p-2.5">
      <p className="text-[10px] text-[#9494A8] uppercase">{label}</p>
      <p className="text-xs text-white font-medium truncate">{value || '—'}</p>
    </div>
  )
}
