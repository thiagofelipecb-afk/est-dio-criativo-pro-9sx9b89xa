import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useStudio } from '@/context/StudioContext'
import { Project, ProjectType } from '@/types/studio'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  FolderKanban,
  Search,
  Plus,
  MoreVertical,
  Edit2,
  Copy,
  Trash2,
  Video,
  Layers,
  FileImage,
  Tv,
  Clock,
  Sparkles,
  SlidersHorizontal,
  Calendar,
} from 'lucide-react'
import { toast } from 'sonner'

export default function Projetos() {
  const navigate = useNavigate()
  const {
    projects,
    setActiveProjectId,
    deleteProject,
    duplicateProject,
    updateProject,
    setIsCreateModalOpen,
  } = useStudio()

  const [filterType, setFilterType] = useState<string>('todos')
  const [searchQuery, setSearchQuery] = useState('')
  const [sortBy, setSortBy] = useState<'recent' | 'title' | 'duration'>('recent')

  // Modals
  const [deleteTarget, setDeleteTarget] = useState<Project | null>(null)
  const [renameTarget, setRenameTarget] = useState<Project | null>(null)
  const [newTitle, setNewTitle] = useState('')

  const handleOpenProject = (proj: Project) => {
    setActiveProjectId(proj.id)
    if (proj.type === 'carousel') navigate('/carrossel')
    else if (proj.type === 'post') navigate('/post')
    else navigate(`/editor/${proj.id}`)
  }

  const handleConfirmDelete = () => {
    if (deleteTarget) {
      deleteProject(deleteTarget.id)
      toast.success('Projeto excluído com sucesso!')
      setDeleteTarget(null)
    }
  }

  const handleConfirmRename = () => {
    if (renameTarget && newTitle.trim()) {
      updateProject(renameTarget.id, { title: newTitle.trim() })
      toast.success('Projeto renomeado!')
      setRenameTarget(null)
      setNewTitle('')
    }
  }

  const handleDuplicate = (id: string) => {
    const dup = duplicateProject(id)
    toast.success(`Projeto duplicado: ${dup.title}`)
  }

  const filteredProjects = projects
    .filter((p) => {
      if (filterType !== 'todos' && p.type !== filterType) return false
      if (searchQuery && !p.title.toLowerCase().includes(searchQuery.toLowerCase())) return false
      return true
    })
    .sort((a, b) => {
      if (sortBy === 'recent') {
        return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
      }
      if (sortBy === 'title') {
        return a.title.localeCompare(b.title)
      }
      return b.duration - a.duration
    })

  const tabs = [
    { id: 'todos', label: 'Todos' },
    { id: 'reel', label: 'Reels & TikTok' },
    { id: 'video', label: 'Vídeos IA' },
    { id: 'youtube', label: 'YouTube' },
    { id: 'carousel', label: 'Carrosséis' },
    { id: 'post', label: 'Posts Estáticos' },
  ]

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight flex items-center gap-2.5">
            <FolderKanban className="w-7 h-7 text-[#7C5CFC]" />
            Meus Projetos
          </h1>
          <p className="text-xs sm:text-sm text-[#9494A8] mt-1">
            Gerencie, edite e exporte suas produções de vídeo, carrosséis e posts.
          </p>
        </div>

        <Button
          onClick={() => setIsCreateModalOpen(true)}
          className="bg-[#7C5CFC] hover:bg-[#6A48E0] text-white font-semibold text-xs sm:text-sm px-4 py-2.5 rounded-xl shadow-lg shadow-[#7C5CFC]/25 gap-2 shrink-0"
        >
          <Plus className="w-4 h-4" /> Novo Projeto
        </Button>
      </div>

      {/* Filters and Search Bar */}
      <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 p-3 rounded-2xl bg-[#14141C] border border-white/5">
        {/* Type Tabs */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0 scrollbar-none">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setFilterType(tab.id)}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
                filterType === tab.id
                  ? 'bg-[#7C5CFC] text-white shadow-md shadow-[#7C5CFC]/30'
                  : 'text-[#9494A8] hover:text-white hover:bg-white/5'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Search & Sort */}
        <div className="flex items-center gap-2">
          <div className="relative flex-1 md:w-64">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[#9494A8]" />
            <input
              type="text"
              placeholder="Buscar por nome..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-[#1C1C27] border border-white/10 rounded-xl pl-9 pr-3 py-1.5 text-xs text-white placeholder-[#9494A8] focus:outline-none focus:ring-1 focus:ring-[#7C5CFC]"
            />
          </div>

          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as any)}
            className="bg-[#1C1C27] border border-white/10 rounded-xl px-3 py-1.5 text-xs text-white focus:outline-none focus:ring-1 focus:ring-[#7C5CFC]"
          >
            <option value="recent">Mais Recentes</option>
            <option value="title">Ordem Alfabética</option>
            <option value="duration">Duração</option>
          </select>
        </div>
      </div>

      {/* Projects Grid */}
      {filteredProjects.length === 0 ? (
        <div className="text-center py-20 rounded-2xl bg-[#14141C] border border-dashed border-white/10 space-y-4">
          <div className="mx-auto w-16 h-16 rounded-2xl bg-[#7C5CFC]/10 border border-[#7C5CFC]/20 flex items-center justify-center text-[#7C5CFC]">
            <FolderKanban className="w-8 h-8" />
          </div>
          <div className="space-y-1 max-w-sm mx-auto">
            <h3 className="text-lg font-bold text-white">Nenhum projeto encontrado</h3>
            <p className="text-xs text-[#9494A8]">
              {searchQuery
                ? 'Nenhum resultado corresponde à sua busca. Tente outros termos.'
                : 'Você ainda não possui projetos nesta categoria. Crie seu primeiro vídeo agora!'}
            </p>
          </div>
          <Button
            onClick={() => setIsCreateModalOpen(true)}
            className="bg-[#7C5CFC] hover:bg-[#6A48E0] text-white text-xs font-semibold px-4 py-2 rounded-xl"
          >
            <Plus className="w-4 h-4 mr-1.5" /> Criar Projeto
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filteredProjects.map((proj) => (
            <div
              key={proj.id}
              className="group rounded-2xl bg-[#14141C] border border-white/5 hover:border-[#7C5CFC]/40 overflow-hidden transition-all duration-200 flex flex-col justify-between shadow-lg glow-card-hover"
            >
              {/* Thumbnail header */}
              <div
                onClick={() => handleOpenProject(proj)}
                className="relative aspect-video w-full bg-[#1C1C27] overflow-hidden cursor-pointer"
              >
                <img
                  src={proj.thumbnail}
                  alt={proj.title}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/20" />

                {/* Badge Type */}
                <div className="absolute top-2.5 left-2.5 flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-black/60 backdrop-blur-md text-[10px] font-bold uppercase tracking-wider text-white border border-white/10">
                  {proj.type === 'reel' && <Video className="w-3 h-3 text-[#7C5CFC]" />}
                  {proj.type === 'youtube' && <Tv className="w-3 h-3 text-red-400" />}
                  {proj.type === 'carousel' && <Layers className="w-3 h-3 text-emerald-400" />}
                  {proj.type === 'post' && <FileImage className="w-3 h-3 text-amber-400" />}
                  <span>{proj.type}</span>
                </div>

                {/* Duration */}
                <span className="absolute bottom-2.5 right-2.5 px-2 py-0.5 rounded bg-black/80 text-[10px] font-mono text-white flex items-center gap-1">
                  <Clock className="w-3 h-3 text-[#22D3EE]" />
                  {proj.duration > 0 ? `${proj.duration}s` : 'Slide'}
                </span>

                {/* Aspect Ratio tag */}
                <span className="absolute top-2.5 right-2.5 px-1.5 py-0.5 rounded bg-white/10 backdrop-blur-md text-[10px] font-mono text-[#9494A8]">
                  {proj.aspectRatio}
                </span>
              </div>

              {/* Info Body */}
              <div className="p-3.5 space-y-2 flex-1 flex flex-col justify-between">
                <div>
                  <div className="flex items-start justify-between gap-2">
                    <h3
                      onClick={() => handleOpenProject(proj)}
                      className="text-xs sm:text-sm font-bold text-white group-hover:text-[#7C5CFC] transition-colors line-clamp-1 cursor-pointer"
                      title={proj.title}
                    >
                      {proj.title}
                    </h3>

                    {/* Context Menu */}
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <button className="p-1 rounded-lg text-[#9494A8] hover:text-white hover:bg-white/10 transition-colors">
                          <MoreVertical className="w-4 h-4" />
                        </button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent
                        align="end"
                        className="w-44 bg-[#14141C] border-white/10 text-white rounded-xl shadow-2xl p-1"
                      >
                        <DropdownMenuItem
                          onClick={() => handleOpenProject(proj)}
                          className="text-xs hover:bg-white/10 cursor-pointer flex items-center gap-2"
                        >
                          <Edit2 className="w-3.5 h-3.5 text-[#22D3EE]" /> Editar Projeto
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => {
                            setRenameTarget(proj)
                            setNewTitle(proj.title)
                          }}
                          className="text-xs hover:bg-white/10 cursor-pointer flex items-center gap-2"
                        >
                          <Edit2 className="w-3.5 h-3.5 text-[#9494A8]" /> Renomear
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => handleDuplicate(proj.id)}
                          className="text-xs hover:bg-white/10 cursor-pointer flex items-center gap-2"
                        >
                          <Copy className="w-3.5 h-3.5 text-[#7C5CFC]" /> Duplicar
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => {
                            navigate('/agendamento')
                            toast.info(`Agendando publicação para "${proj.title}"`)
                          }}
                          className="text-xs hover:bg-white/10 cursor-pointer flex items-center gap-2"
                        >
                          <Calendar className="w-3.5 h-3.5 text-pink-400" /> Agendar Post
                        </DropdownMenuItem>
                        <DropdownMenuSeparator className="bg-white/10" />
                        <DropdownMenuItem
                          onClick={() => setDeleteTarget(proj)}
                          className="text-xs text-red-400 hover:bg-red-500/10 cursor-pointer flex items-center gap-2"
                        >
                          <Trash2 className="w-3.5 h-3.5" /> Excluir
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>

                  <p className="text-[11px] text-[#9494A8] mt-1 line-clamp-1">
                    {proj.scriptText || 'Sem roteiro anexado'}
                  </p>
                </div>

                <div className="pt-2 border-t border-white/5 flex items-center justify-between text-[10px] text-[#9494A8]">
                  <span>
                    Modificado há{' '}
                    {Math.max(
                      1,
                      Math.floor(
                        (Date.now() - new Date(proj.updatedAt).getTime()) / (1000 * 60 * 60),
                      ),
                    )}
                    h
                  </span>
                  <span
                    className={`px-1.5 py-0.5 rounded capitalize ${
                      proj.status === 'ready'
                        ? 'bg-emerald-500/20 text-emerald-400'
                        : proj.status === 'scheduled'
                          ? 'bg-[#7C5CFC]/20 text-[#7C5CFC]'
                          : 'bg-white/5 text-[#9494A8]'
                    }`}
                  >
                    {proj.status}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal: Delete Confirmation */}
      <Dialog open={!!deleteTarget} onOpenChange={() => setDeleteTarget(null)}>
        <DialogContent className="max-w-md bg-[#14141C] border-white/10 text-white rounded-2xl p-6">
          <DialogHeader>
            <div className="flex items-center gap-3">
              <span className="p-2.5 rounded-xl bg-red-500/20 text-red-400 border border-red-500/30">
                <Trash2 className="w-5 h-5" />
              </span>
              <div>
                <DialogTitle className="text-lg font-bold">Excluir Projeto</DialogTitle>
                <DialogDescription className="text-xs text-[#9494A8]">
                  Tem certeza que deseja excluir "{deleteTarget?.title}"? Esta ação não pode ser
                  desfeita.
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          <DialogFooter className="mt-4 flex gap-2 sm:justify-end">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setDeleteTarget(null)}
              className="text-xs text-[#9494A8] hover:text-white"
            >
              Cancelar
            </Button>
            <Button
              size="sm"
              onClick={handleConfirmDelete}
              className="bg-red-500 hover:bg-red-600 text-white text-xs font-semibold"
            >
              Excluir Definitivamente
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal: Rename Project */}
      <Dialog open={!!renameTarget} onOpenChange={() => setRenameTarget(null)}>
        <DialogContent className="max-w-md bg-[#14141C] border-white/10 text-white rounded-2xl p-6 space-y-4">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold">Renomear Projeto</DialogTitle>
            <DialogDescription className="text-xs text-[#9494A8]">
              Digite o novo título para sua criação.
            </DialogDescription>
          </DialogHeader>

          <div>
            <label className="text-xs text-[#9494A8] block mb-1">Título</label>
            <input
              type="text"
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              className="w-full bg-[#1C1C27] border border-white/10 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:ring-1 focus:ring-[#7C5CFC]"
              autoFocus
            />
          </div>

          <DialogFooter className="flex gap-2 sm:justify-end">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setRenameTarget(null)}
              className="text-xs text-[#9494A8]"
            >
              Cancelar
            </Button>
            <Button
              size="sm"
              onClick={handleConfirmRename}
              className="bg-[#7C5CFC] hover:bg-[#6A48E0] text-white text-xs font-semibold"
            >
              Salvar Alteração
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
