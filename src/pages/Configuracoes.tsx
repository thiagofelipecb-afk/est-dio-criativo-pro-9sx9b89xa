import React, { useState } from 'react'
import { usePlatform } from '@/context/PlatformContext'
import { ModuleHeader, Field, inputClass } from '@/components/marketing/Shared'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Settings, Copy, RefreshCw, CheckCircle2, ExternalLink, Chrome, Shield } from 'lucide-react'
import { toast } from 'sonner'

export default function Configuracoes() {
  const { token, rotateToken } = usePlatform()
  const [copied, setCopied] = useState(false)

  const copyToken = () => {
    if (!token) return
    navigator.clipboard.writeText(token.token)
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
    toast.success('Token copiado!')
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

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-4xl mx-auto space-y-6 animate-fade-in">
      <ModuleHeader
        title="Configurações e Extensão"
        description="Token pessoal de acesso, instalação da extensão Chrome e tutorial passo a passo."
        icon={<Settings className="w-5 h-5" />}
        accent="#7C5CFC"
      />

      {/* Token */}
      <div className="rounded-2xl bg-[#14141C] border border-white/5 p-5 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold text-white">Token pessoal de acesso</h3>
          <Badge className="bg-[#7C5CFC]/15 text-[#7C5CFC] border-[#7C5CFC]/30 text-[10px] gap-1">
            <Shield className="w-3 h-3" /> Escopo: somente captura
          </Badge>
        </div>
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
              <RefreshCw className="w-3.5 h-3.5" /> Gerar novo token (invalida o anterior)
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
              <RefreshCw className="w-3.5 h-3.5" /> Gerar token
            </Button>
          </div>
        )}
        <div className="rounded-lg bg-amber-500/5 border border-amber-500/20 p-3 text-[11px] text-amber-300 space-y-1">
          <p className="font-bold">Segurança</p>
          <p>• O token tem escopo somente de captura. Revogação imediata ao gerar novo.</p>
          <p>• Validamos origem, tamanho, tipo de arquivo e duplicidade por URL/hash.</p>
          <p>• A captura respeita termos das plataformas e privacidade.</p>
        </div>
      </div>

      {/* Extensão */}
      <div className="rounded-2xl bg-[#14141C] border border-white/5 p-5 space-y-4">
        <h3 className="text-sm font-bold text-white flex items-center gap-2">
          <Chrome className="w-4 h-4 text-[#22D3EE]" /> Instalação da extensão Chrome
        </h3>
        <a
          href="https://chromewebstore.google.com/"
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center gap-1.5 text-xs text-[#22D3EE] hover:underline"
        >
          <ExternalLink className="w-3.5 h-3.5" /> Abrir Chrome Web Store
        </a>
        <div className="space-y-2">
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
        <div className="rounded-lg bg-[#22D3EE]/5 border border-[#22D3EE]/20 p-3 text-[11px] text-[#22D3EE]">
          Teste recomendado: abra um perfil do Instagram e verifique o botão "Analisar perfil".
        </div>
      </div>
    </div>
  )
}
