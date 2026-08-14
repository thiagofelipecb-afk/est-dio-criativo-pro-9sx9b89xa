import React, { useState } from 'react'
import { Outlet, useLocation, useNavigate, Link } from 'react-router-dom'
import { useStudio } from '@/context/StudioContext'
import { CreateModal } from '@/components/CreateModal'
import { MediaLibraryModal } from '@/components/MediaLibraryModal'
import {
  Home,
  Compass,
  PenSquare,
  GitBranch,
  Boxes,
  Megaphone,
  Headphones,
  Camera,
  Layers,
  FileImage,
  ScrollText,
  Calendar,
  Library,
  BarChart3,
  Settings,
  Smartphone,
  Briefcase,
  Sparkles,
  Plus,
  ChevronLeft,
  ChevronRight,
  Bell,
  HelpCircle,
  Menu,
  X,
  CheckCircle,
  FolderKanban,
  Film,
} from 'lucide-react'
import ClaraWidget from '@/components/ClaraWidget'
import { usePlatform } from '@/context/PlatformContext'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { toast } from 'sonner'

export default function Layout() {
  const { projects, activeProjectId, setActiveProjectId, setIsCreateModalOpen } = useStudio()
  const { hasBrandOS } = usePlatform()
  const location = useLocation()
  const navigate = useNavigate()

  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false)
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  const [isMediaLibraryOpen, setIsMediaLibraryOpen] = useState(false)
  const [mediaModalCategory, setMediaModalCategory] = useState<'all' | 'video' | 'image' | 'audio'>(
    'all',
  )

  const activeProject = projects.find((p) => p.id === activeProjectId)

  const moduleItems = [
    {
      label: 'Módulo 1 — Posicionamento',
      path: '/modulo-1',
      icon: Compass,
      badge: hasBrandOS ? undefined : 'Pendente',
    },
    { label: 'Módulo 2 — Conteúdo', path: '/modulo-2', icon: PenSquare },
    { label: 'Módulo 3 — Funis', path: '/modulo-3', icon: GitBranch },
    { label: 'Módulo 4 — Ativos', path: '/modulo-4', icon: Boxes },
    { label: 'Módulo 5 — Escala', path: '/modulo-5', icon: Megaphone },
    { label: 'Módulo 6 — Vendas', path: '/modulo-6', icon: Headphones },
  ]

  type NavItem = {
    label: string
    path: string
    icon: React.ComponentType<{ className?: string }>
    badge?: string
  }

  const studioItems: NavItem[] = [
    { label: 'Gravadora', path: '/gravadora', icon: Camera, badge: 'REC' },
    { label: 'Criar Carrossel', path: '/carrossel', icon: Layers },
    { label: 'Criar Post', path: '/post', icon: FileImage },
    { label: 'Teleprompter', path: '/teleprompter', icon: ScrollText },
    { label: 'Agendamento', path: '/agendamento', icon: Calendar, badge: 'Auto' },
  ]

  const transversalItems: NavItem[] = [
    { label: 'Biblioteca', path: '/biblioteca', icon: Library },
    { label: 'Métricas', path: '/metricas', icon: BarChart3 },
    { label: 'Configurações', path: '/configuracoes', icon: Settings },
    { label: 'Versão Mobile', path: '/versao-mobile', icon: Smartphone },
    { label: 'Assessoria', path: '/assessoria', icon: Briefcase },
  ]

  const navItems: NavItem[] = [
    { label: 'Início', path: '/', icon: Home },
    { label: 'Meus Projetos', path: '/projetos', icon: FolderKanban },
    ...moduleItems,
    ...studioItems,
    ...transversalItems,
  ]

  const libraryItems = [
    { label: 'Modelos', category: 'all' as const, icon: Layers },
    { label: 'Músicas', category: 'audio' as const, icon: ScrollText },
    { label: 'Mídias', category: 'video' as const, icon: Film },
    { label: 'Elementos', category: 'image' as const, icon: FileImage },
  ]

  const openLibrary = (cat: 'all' | 'video' | 'image' | 'audio') => {
    setMediaModalCategory(cat)
    setIsMediaLibraryOpen(true)
  }

  const handleShowHelp = () => {
    toast.info('Central de Ajuda LUMEN Studio', {
      description:
        'Dúvidas com IA, teleprompter ou conexões com Instagram/TikTok? Todos os recursos possuem guias passo a passo integrados.',
    })
  }

  const handleShowNotifications = () => {
    toast('Notificações do Sistema', {
      description: 'Você tem 1 publicação agendada com sucesso para hoje às 18:00.',
      icon: <CheckCircle className="w-4 h-4 text-emerald-400" />,
    })
  }

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-[#0B0B10] text-[#F4F4F7] font-sans antialiased selection:bg-[#7C5CFC]/30 selection:text-white">
      {/* Mobile Drawer Overlay */}
      {isMobileMenuOpen && (
        <div
          className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm lg:hidden transition-opacity"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed lg:static top-0 left-0 bottom-0 z-50 flex flex-col justify-between border-r border-white/5 bg-[#0e0e15] transition-all duration-250 ease-out ${
          isSidebarCollapsed ? 'w-[68px]' : 'w-[240px]'
        } ${isMobileMenuOpen ? 'translate-x-0 !w-[260px]' : '-translate-x-full lg:translate-x-0'}`}
      >
        {/* Top brand */}
        <div>
          <div className="flex h-14 items-center justify-between px-3.5 border-b border-white/5">
            <Link
              to="/"
              className="flex items-center gap-2.5 overflow-hidden group"
              onClick={() => setIsMobileMenuOpen(false)}
            >
              {/* Prisma Brand Icon */}
              <div className="relative flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-gradient-to-tr from-[#7C5CFC] via-[#906BFC] to-[#22D3EE] p-[1.5px] shadow-lg shadow-[#7C5CFC]/20 group-hover:shadow-[#7C5CFC]/40 transition-all">
                <div className="flex h-full w-full items-center justify-center rounded-[6px] bg-[#0B0B10]">
                  <Sparkles className="h-4 w-4 text-[#22D3EE] animate-pulse" />
                </div>
              </div>

              {(!isSidebarCollapsed || isMobileMenuOpen) && (
                <div className="flex flex-col">
                  <span className="text-sm font-bold tracking-tight bg-gradient-to-r from-white via-slate-100 to-[#9494A8] bg-clip-text text-transparent">
                    LUMEN <span className="text-[#7C5CFC] font-extrabold">Studio</span>
                  </span>
                  <span className="text-[10px] text-[#9494A8] font-medium tracking-widest uppercase">
                    Vídeo & IA Pro
                  </span>
                </div>
              )}
            </Link>

            {/* Collapse toggle (Desktop) */}
            <button
              onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
              className="hidden lg:flex h-6 w-6 items-center justify-center rounded-md text-[#9494A8] hover:bg-white/5 hover:text-white transition-colors"
              title={isSidebarCollapsed ? 'Expandir Menu' : 'Recolher Menu'}
            >
              {isSidebarCollapsed ? (
                <ChevronRight className="h-4 w-4" />
              ) : (
                <ChevronLeft className="h-4 w-4" />
              )}
            </button>

            {/* Close button (Mobile) */}
            <button
              onClick={() => setIsMobileMenuOpen(false)}
              className="lg:hidden flex h-7 w-7 items-center justify-center rounded-md text-[#9494A8] hover:bg-white/5 hover:text-white"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Nav Links */}
          <nav className="p-2 space-y-1">
            {navItems.map((item) => {
              const isActive = location.pathname === item.path
              const Icon = item.icon

              return (
                <Tooltip key={item.path} delayDuration={isSidebarCollapsed ? 100 : 1000}>
                  <TooltipTrigger asChild>
                    <Link
                      to={item.path}
                      onClick={() => setIsMobileMenuOpen(false)}
                      className={`relative flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-medium transition-all duration-150 ${
                        isActive
                          ? 'bg-[#1C1C27] text-white shadow-sm font-semibold'
                          : 'text-[#9494A8] hover:bg-white/5 hover:text-white'
                      }`}
                    >
                      {isActive && (
                        <span className="absolute left-0 top-1.5 bottom-1.5 w-1 rounded-r-full bg-[#7C5CFC] shadow-[0_0_8px_#7C5CFC]" />
                      )}
                      <Icon
                        className={`h-4 w-4 shrink-0 transition-transform ${
                          isActive ? 'text-[#7C5CFC] scale-105' : 'text-[#9494A8]'
                        }`}
                      />
                      {(!isSidebarCollapsed || isMobileMenuOpen) && (
                        <span className="truncate">{item.label}</span>
                      )}
                      {(!isSidebarCollapsed || isMobileMenuOpen) && item.badge && (
                        <span
                          className={`ml-auto text-[9px] font-bold px-1.5 py-0.5 rounded-full ${
                            item.badge === 'REC'
                              ? 'bg-red-500/20 text-red-400 border border-red-500/30 animate-pulse'
                              : 'bg-[#7C5CFC]/20 text-[#7C5CFC] border border-[#7C5CFC]/30'
                          }`}
                        >
                          {item.badge}
                        </span>
                      )}
                    </Link>
                  </TooltipTrigger>
                  {isSidebarCollapsed && !isMobileMenuOpen && (
                    <TooltipContent
                      side="right"
                      className="bg-[#1C1C27] text-white border-white/10 text-xs"
                    >
                      {item.label}
                    </TooltipContent>
                  )}
                </Tooltip>
              )
            })}
          </nav>

          {/* Section: Bibliotecas */}
          <div className="px-3 pt-3 pb-1">
            {(!isSidebarCollapsed || isMobileMenuOpen) && (
              <div className="flex items-center gap-1 text-[10px] font-semibold tracking-wider text-[#9494A8]/70 uppercase px-2 mb-1.5">
                <Library className="w-3 h-3" />
                <span>Bibliotecas</span>
              </div>
            )}
            <div className="space-y-0.5">
              {libraryItems.map((lib) => {
                const Icon = lib.icon
                return (
                  <Tooltip key={lib.label} delayDuration={isSidebarCollapsed ? 100 : 1000}>
                    <TooltipTrigger asChild>
                      <button
                        onClick={() => openLibrary(lib.category)}
                        className="w-full flex items-center gap-3 px-3 py-1.5 rounded-lg text-xs text-[#9494A8] hover:bg-white/5 hover:text-white transition-colors text-left"
                      >
                        <Icon className="h-3.5 w-3.5 shrink-0 text-[#9494A8]" />
                        {(!isSidebarCollapsed || isMobileMenuOpen) && <span>{lib.label}</span>}
                      </button>
                    </TooltipTrigger>
                    {isSidebarCollapsed && !isMobileMenuOpen && (
                      <TooltipContent
                        side="right"
                        className="bg-[#1C1C27] text-white border-white/10 text-xs"
                      >
                        Biblioteca: {lib.label}
                      </TooltipContent>
                    )}
                  </Tooltip>
                )
              })}
            </div>
          </div>
        </div>

        {/* Footer info & profile */}
        <div className="p-2 border-t border-white/5 bg-[#0B0B10]/40">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="flex w-full items-center gap-2.5 p-1.5 rounded-xl hover:bg-white/5 transition-all text-left">
                <img
                  src="https://img.usecurling.com/ppl/medium?seed=88"
                  alt="Avatar"
                  className="h-8 w-8 rounded-lg object-cover ring-1 ring-white/20 shrink-0"
                />
                {(!isSidebarCollapsed || isMobileMenuOpen) && (
                  <div className="flex flex-col min-w-0">
                    <span className="text-xs font-semibold text-white truncate">
                      Marcos Silveira
                    </span>
                    <span className="text-[10px] text-[#22D3EE] truncate flex items-center gap-1 font-medium">
                      <Sparkles className="w-2.5 h-2.5" /> Pro Criador IA
                    </span>
                  </div>
                )}
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent
              align="end"
              side="top"
              className="w-56 bg-[#14141C] border-white/10 text-white rounded-xl shadow-2xl p-1"
            >
              <DropdownMenuLabel className="text-xs text-[#9494A8]">
                Minha Conta LUMEN
              </DropdownMenuLabel>
              <DropdownMenuSeparator className="bg-white/10" />
              <DropdownMenuItem
                onClick={() => navigate('/projetos')}
                className="text-xs hover:bg-white/10 cursor-pointer"
              >
                Gerenciar Projetos
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => setIsMediaLibraryOpen(true)}
                className="text-xs hover:bg-white/10 cursor-pointer"
              >
                Biblioteca de Arquivos
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() =>
                  toast.success('Configurações salvas!', {
                    description: 'Preferências de renderização e IA atualizadas.',
                  })
                }
                className="text-xs hover:bg-white/10 cursor-pointer flex items-center justify-between"
              >
                <span>Configurações</span>
                <Settings className="w-3.5 h-3.5 text-[#9494A8]" />
              </DropdownMenuItem>
              <DropdownMenuSeparator className="bg-white/10" />
              <DropdownMenuItem
                onClick={() => toast.info('Sessão ativa em modo Pro Studio')}
                className="text-xs text-red-400 hover:bg-red-500/10 cursor-pointer"
              >
                Sair
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 h-full overflow-hidden">
        {/* Topbar (56px) */}
        <header className="h-14 shrink-0 glass-header flex items-center justify-between px-3 sm:px-6 z-40">
          <div className="flex items-center gap-3">
            {/* Mobile Hamburger */}
            <button
              onClick={() => setIsMobileMenuOpen(true)}
              className="lg:hidden p-2 rounded-lg bg-white/5 text-[#9494A8] hover:text-white"
            >
              <Menu className="h-5 w-5" />
            </button>

            {/* Project Switcher Dropdown */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg bg-[#14141C] border border-white/10 hover:border-white/20 text-left transition-all max-w-[200px] sm:max-w-xs">
                  <div className="h-4 w-4 rounded bg-[#7C5CFC]/20 text-[#7C5CFC] flex items-center justify-center shrink-0">
                    <Film className="w-2.5 h-2.5" />
                  </div>
                  <span className="text-xs font-semibold text-white truncate">
                    {activeProject ? activeProject.title : 'Selecionar Projeto'}
                  </span>
                  <ChevronRight className="w-3.5 h-3.5 text-[#9494A8] shrink-0 rotate-90" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                align="start"
                className="w-72 bg-[#14141C] border-white/10 text-white rounded-xl shadow-2xl p-1 max-h-80 overflow-y-auto"
              >
                <DropdownMenuLabel className="text-[11px] text-[#9494A8] uppercase tracking-wider">
                  Projetos Recentes
                </DropdownMenuLabel>
                <DropdownMenuSeparator className="bg-white/10" />
                {projects.map((proj) => (
                  <DropdownMenuItem
                    key={proj.id}
                    onClick={() => {
                      setActiveProjectId(proj.id)
                      if (proj.type === 'carousel') navigate('/carrossel')
                      else if (proj.type === 'post') navigate('/post')
                      else navigate(`/editor/${proj.id}`)
                    }}
                    className={`flex items-center gap-2 text-xs py-2 px-2.5 rounded-lg cursor-pointer ${
                      activeProjectId === proj.id
                        ? 'bg-[#7C5CFC]/20 text-white font-medium'
                        : 'hover:bg-white/5'
                    }`}
                  >
                    <img
                      src={proj.thumbnail}
                      alt={proj.title}
                      className="w-7 h-7 rounded object-cover shrink-0 border border-white/10"
                    />
                    <div className="truncate flex-1">
                      <p className="truncate font-medium">{proj.title}</p>
                      <span className="text-[10px] text-[#9494A8] capitalize">
                        {proj.type} • {proj.aspectRatio}
                      </span>
                    </div>
                  </DropdownMenuItem>
                ))}
                <DropdownMenuSeparator className="bg-white/10" />
                <DropdownMenuItem
                  onClick={() => setIsCreateModalOpen(true)}
                  className="text-xs text-[#22D3EE] font-medium hover:bg-[#22D3EE]/10 cursor-pointer flex items-center gap-1.5"
                >
                  <Plus className="w-3.5 h-3.5" /> Criar Novo Projeto
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          {/* Center CTA Button */}
          <div className="flex items-center">
            <Button
              onClick={() => setIsCreateModalOpen(true)}
              className="bg-gradient-to-r from-[#7C5CFC] to-[#6A48E0] hover:from-[#6A48E0] hover:to-[#5835D8] text-white font-semibold text-xs px-4 py-2 rounded-xl shadow-lg shadow-[#7C5CFC]/25 hover:shadow-[#7C5CFC]/40 hover:scale-[1.02] transition-all duration-150 flex items-center gap-1.5"
            >
              <Plus className="w-4 h-4" />
              <span className="hidden sm:inline">Nova Criação</span>
              <span className="sm:hidden">Novo</span>
            </Button>
          </div>

          {/* Right Tools */}
          <div className="flex items-center gap-2">
            <Tooltip delayDuration={300}>
              <TooltipTrigger asChild>
                <button
                  onClick={handleShowNotifications}
                  className="relative p-2 rounded-xl bg-[#14141C] border border-white/10 hover:border-white/20 text-[#9494A8] hover:text-white transition-all"
                >
                  <Bell className="w-4 h-4" />
                  <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-[#22D3EE] animate-ping" />
                  <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-[#22D3EE]" />
                </button>
              </TooltipTrigger>
              <TooltipContent className="bg-[#1C1C27] text-white border-white/10 text-xs">
                Notificações
              </TooltipContent>
            </Tooltip>

            <Tooltip delayDuration={300}>
              <TooltipTrigger asChild>
                <button
                  onClick={handleShowHelp}
                  className="p-2 rounded-xl bg-[#14141C] border border-white/10 hover:border-white/20 text-[#9494A8] hover:text-white transition-all"
                >
                  <HelpCircle className="w-4 h-4" />
                </button>
              </TooltipTrigger>
              <TooltipContent className="bg-[#1C1C27] text-white border-white/10 text-xs">
                Ajuda & Dicas
              </TooltipContent>
            </Tooltip>

            <img
              src="https://img.usecurling.com/ppl/thumbnail?seed=88"
              alt="Avatar"
              className="w-8 h-8 rounded-xl object-cover ring-1 ring-white/20 ml-1 cursor-pointer hover:ring-[#7C5CFC] transition-all"
              onClick={() => navigate('/projetos')}
            />
          </div>
        </header>

        {/* Dynamic Route View */}
        <main className="flex-1 overflow-y-auto min-w-0 bg-[#0B0B10]">
          <Outlet />
        </main>
      </div>

      {/* Global Creation Modal */}
      <CreateModal />

      {/* Global Shared Media Modal */}
      <MediaLibraryModal
        open={isMediaLibraryOpen}
        onOpenChange={setIsMediaLibraryOpen}
        categoryFilter={mediaModalCategory}
      />

      {/* Clara — Assistente IA global */}
      <ClaraWidget />
    </div>
  )
}
