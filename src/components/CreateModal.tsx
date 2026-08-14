import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { useStudio } from '@/context/StudioContext'
import {
  Video,
  Sparkles,
  Layers,
  FileImage,
  ScrollText,
  Camera,
  Youtube,
  Plus,
  ArrowRight,
} from 'lucide-react'

export const CreateModal: React.FC = () => {
  const { isCreateModalOpen, setIsCreateModalOpen, createProject } = useStudio()
  const navigate = useNavigate()
  const [activeTab, setActiveTab] = useState<'video' | 'social' | 'tools'>('video')

  const handleCreateVideo = (type: 'reel' | 'youtube' | 'video') => {
    const proj = createProject({
      title: type === 'youtube' ? 'Novo Vídeo Horizontal' : 'Novo Reel Viral com IA',
      type: type,
      aspectRatio: type === 'youtube' ? '16:9' : '9:16',
    })
    setIsCreateModalOpen(false)
    navigate(`/editor/${proj.id}`)
  }

  const handleGoTo = (path: string) => {
    setIsCreateModalOpen(false)
    navigate(path)
  }

  return (
    <Dialog open={isCreateModalOpen} onOpenChange={setIsCreateModalOpen}>
      <DialogContent className="max-w-2xl bg-[#14141C]/95 border-white/10 backdrop-blur-2xl text-white p-6 shadow-2xl rounded-2xl">
        <DialogHeader className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="p-2 rounded-xl bg-gradient-to-br from-[#7C5CFC]/20 to-[#22D3EE]/20 border border-[#7C5CFC]/30">
              <Sparkles className="w-5 h-5 text-[#7C5CFC]" />
            </span>
            <div>
              <DialogTitle className="text-xl font-bold tracking-tight">
                Iniciar Nova Criação
              </DialogTitle>
              <DialogDescription className="text-sm text-[#9494A8]">
                Selecione o formato ideal para começar sua gravação ou edição assistida por IA.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="flex border-b border-white/10 mt-2 mb-4 gap-4 text-sm font-medium">
          <button
            onClick={() => setActiveTab('video')}
            className={`pb-2 border-b-2 transition-all ${
              activeTab === 'video'
                ? 'border-[#7C5CFC] text-white font-semibold'
                : 'border-transparent text-[#9494A8] hover:text-white'
            }`}
          >
            Vídeos & Gravação
          </button>
          <button
            onClick={() => setActiveTab('social')}
            className={`pb-2 border-b-2 transition-all ${
              activeTab === 'social'
                ? 'border-[#7C5CFC] text-white font-semibold'
                : 'border-transparent text-[#9494A8] hover:text-white'
            }`}
          >
            Carrossel & Posts
          </button>
          <button
            onClick={() => setActiveTab('tools')}
            className={`pb-2 border-b-2 transition-all ${
              activeTab === 'tools'
                ? 'border-[#7C5CFC] text-white font-semibold'
                : 'border-transparent text-[#9494A8] hover:text-white'
            }`}
          >
            Ferramentas de Estúdio
          </button>
        </div>

        {activeTab === 'video' && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 py-1">
            <button
              onClick={() => handleGoTo('/gravadora')}
              className="group text-left p-4 rounded-xl bg-[#1C1C27] hover:bg-[#252535] border border-white/5 hover:border-[#7C5CFC]/40 transition-all duration-200 flex flex-col justify-between h-36 relative overflow-hidden"
            >
              <div className="absolute -right-4 -bottom-4 w-20 h-20 bg-[#7C5CFC]/10 rounded-full blur-xl group-hover:bg-[#7C5CFC]/20 transition-all" />
              <div className="flex items-center justify-between">
                <span className="p-2.5 rounded-lg bg-red-500/10 text-red-400 border border-red-500/20">
                  <Camera className="w-5 h-5" />
                </span>
                <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-red-500/20 text-red-300">
                  Ao Vivo
                </span>
              </div>
              <div>
                <h4 className="font-semibold text-white group-hover:text-[#22D3EE] transition-colors">
                  Estúdio de Gravação
                </h4>
                <p className="text-xs text-[#9494A8] mt-0.5">
                  Câmera, microfone, teleprompter e filtros de beleza em tempo real
                </p>
              </div>
            </button>

            <button
              onClick={() => handleCreateVideo('reel')}
              className="group text-left p-4 rounded-xl bg-[#1C1C27] hover:bg-[#252535] border border-white/5 hover:border-[#7C5CFC]/40 transition-all duration-200 flex flex-col justify-between h-36 relative overflow-hidden"
            >
              <div className="flex items-center justify-between">
                <span className="p-2.5 rounded-lg bg-[#7C5CFC]/10 text-[#7C5CFC] border border-[#7C5CFC]/20">
                  <Video className="w-5 h-5" />
                </span>
                <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-[#7C5CFC]/20 text-[#7C5CFC]">
                  9:16 Vertical
                </span>
              </div>
              <div>
                <h4 className="font-semibold text-white group-hover:text-[#7C5CFC] transition-colors">
                  Reels & TikTok Pro
                </h4>
                <p className="text-xs text-[#9494A8] mt-0.5">
                  Edição vertical com cortes de silêncio e legendas automáticas
                </p>
              </div>
            </button>

            <button
              onClick={() => handleCreateVideo('youtube')}
              className="group text-left p-4 rounded-xl bg-[#1C1C27] hover:bg-[#252535] border border-white/5 hover:border-[#7C5CFC]/40 transition-all duration-200 flex flex-col justify-between h-36 relative overflow-hidden"
            >
              <div className="flex items-center justify-between">
                <span className="p-2.5 rounded-lg bg-red-600/10 text-red-500 border border-red-600/20">
                  <Youtube className="w-5 h-5" />
                </span>
                <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-red-600/20 text-red-400">
                  16:9 4K
                </span>
              </div>
              <div>
                <h4 className="font-semibold text-white group-hover:text-red-400 transition-colors">
                  YouTube Long-Form
                </h4>
                <p className="text-xs text-[#9494A8] mt-0.5">
                  Edição widescreen completa com trilhas múltiplas e B-roll
                </p>
              </div>
            </button>

            <button
              onClick={() => handleCreateVideo('video')}
              className="group text-left p-4 rounded-xl bg-[#1C1C27] hover:bg-[#252535] border border-white/5 hover:border-[#7C5CFC]/40 transition-all duration-200 flex flex-col justify-between h-36 relative overflow-hidden"
            >
              <div className="flex items-center justify-between">
                <span className="p-2.5 rounded-lg bg-[#22D3EE]/10 text-[#22D3EE] border border-[#22D3EE]/20">
                  <Sparkles className="w-5 h-5" />
                </span>
                <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-[#22D3EE]/20 text-[#22D3EE]">
                  IA Auto
                </span>
              </div>
              <div>
                <h4 className="font-semibold text-white group-hover:text-[#22D3EE] transition-colors">
                  Vídeo do Zero com IA
                </h4>
                <p className="text-xs text-[#9494A8] mt-0.5">
                  Importe sua mídia e deixe o assistente aplicar ritmo e legendas
                </p>
              </div>
            </button>
          </div>
        )}

        {activeTab === 'social' && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 py-1">
            <button
              onClick={() => handleGoTo('/carrossel')}
              className="group text-left p-4 rounded-xl bg-[#1C1C27] hover:bg-[#252535] border border-white/5 hover:border-[#7C5CFC]/40 transition-all duration-200 flex flex-col justify-between h-36"
            >
              <div className="flex items-center justify-between">
                <span className="p-2.5 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                  <Layers className="w-5 h-5" />
                </span>
                <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400">
                  Multi-slides
                </span>
              </div>
              <div>
                <h4 className="font-semibold text-white group-hover:text-emerald-400 transition-colors">
                  Editor de Carrossel
                </h4>
                <p className="text-xs text-[#9494A8] mt-0.5">
                  Slides contínuos, templates prontos, storytelling e exportação
                </p>
              </div>
            </button>

            <button
              onClick={() => handleGoTo('/post')}
              className="group text-left p-4 rounded-xl bg-[#1C1C27] hover:bg-[#252535] border border-white/5 hover:border-[#7C5CFC]/40 transition-all duration-200 flex flex-col justify-between h-36"
            >
              <div className="flex items-center justify-between">
                <span className="p-2.5 rounded-lg bg-amber-500/10 text-amber-400 border border-amber-500/20">
                  <FileImage className="w-5 h-5" />
                </span>
                <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-400">
                  1:1 / 4:5 / 9:16
                </span>
              </div>
              <div>
                <h4 className="font-semibold text-white group-hover:text-amber-400 transition-colors">
                  Post Estático & Frases
                </h4>
                <p className="text-xs text-[#9494A8] mt-0.5">
                  Tipografia de impacto, marcas d’água e blur dinâmico
                </p>
              </div>
            </button>
          </div>
        )}

        {activeTab === 'tools' && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 py-1">
            <button
              onClick={() => handleGoTo('/teleprompter')}
              className="group text-left p-4 rounded-xl bg-[#1C1C27] hover:bg-[#252535] border border-white/5 hover:border-[#7C5CFC]/40 transition-all duration-200 flex flex-col justify-between h-36"
            >
              <div className="flex items-center justify-between">
                <span className="p-2.5 rounded-lg bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                  <ScrollText className="w-5 h-5" />
                </span>
                <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-400">
                  Tela Cheia
                </span>
              </div>
              <div>
                <h4 className="font-semibold text-white group-hover:text-indigo-400 transition-colors">
                  Teleprompter Profissional
                </h4>
                <p className="text-xs text-[#9494A8] mt-0.5">
                  Rolagem inteligente, modo espelho, controle de palavras e timer
                </p>
              </div>
            </button>

            <button
              onClick={() => handleGoTo('/agendamento')}
              className="group text-left p-4 rounded-xl bg-[#1C1C27] hover:bg-[#252535] border border-white/5 hover:border-[#7C5CFC]/40 transition-all duration-200 flex flex-col justify-between h-36"
            >
              <div className="flex items-center justify-between">
                <span className="p-2.5 rounded-lg bg-pink-500/10 text-pink-400 border border-pink-500/20">
                  <Sparkles className="w-5 h-5" />
                </span>
                <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-pink-500/20 text-pink-400">
                  Automação
                </span>
              </div>
              <div>
                <h4 className="font-semibold text-white group-hover:text-pink-400 transition-colors">
                  Agendador de Publicações
                </h4>
                <p className="text-xs text-[#9494A8] mt-0.5">
                  Calendário unificado para Instagram, TikTok e YouTube
                </p>
              </div>
            </button>
          </div>
        )}

        <div className="mt-4 pt-3 border-t border-white/10 flex items-center justify-between text-xs text-[#9494A8]">
          <span>Dica: Pressione ⌘+N a qualquer momento para abrir esta janela</span>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsCreateModalOpen(false)}
            className="text-[#9494A8] hover:text-white"
          >
            Cancelar
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
