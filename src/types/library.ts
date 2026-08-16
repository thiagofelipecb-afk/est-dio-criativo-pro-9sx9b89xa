/* ===========================================================================
   LUMEN Studio — Tipos das Bibliotecas e ferramentas de criação aditivas.
   Nenhum tipo existente é alterado. São apenas acréscimos para as novas
   rotas: /agendamento (Post), /carrossel (Carousel), /criar-post (StaticPost),
   /modelos, /musicas, /midias, /elementos.
   =========================================================================== */

/** Plataforma social alvo de uma postagem agendada. */
export type PostPlatform = 'instagram' | 'tiktok' | 'youtube'

/** Status de uma postagem agendada. */
export type PostStatus = 'scheduled' | 'draft' | 'published' | 'failed'

/** Postagem agendada (chave localStorage `lumen_posts`). */
export interface Post {
  id: string
  title: string
  caption: string
  mediaUrls: string[]
  platforms: PostPlatform[]
  scheduledAt: string // ISO string
  status: PostStatus
  hashtags: string[]
  createdAt: string
  updatedAt: string
  /** ID do post na plataforma (preenchido quando a publicação é real). */
  platformPostId?: string
  /** URL do post na plataforma (preenchido quando a publicação é real). */
  platformPostUrl?: string
}

/** Texto arrastável num slide de carrossel. */
export interface CarouselText {
  id: string
  content: string
  fontFamily: string
  fontSize: number
  color: string
  x: number
  y: number
  bold?: boolean
  italic?: boolean
}

/** Forma geométrica arrastável num slide de carrossel. */
export interface CarouselElement {
  id: string
  type: 'rectangle' | 'circle' | 'line'
  color: string
  opacity: number
  x: number
  y: number
  width: number
  height: number
}

/** Sticker/emoji arrastável num slide de carrossel. */
export interface CarouselSticker {
  id: string
  emoji: string
  size: number
  x: number
  y: number
}

/** Slide de um carrossel (chave `lumen_carousels`). */
export interface CarouselSlideV2 {
  id: string
  background: string // cor (#hex) ou URL de imagem
  backgroundType: 'color' | 'image'
  backgroundFit: 'cover' | 'contain' | 'fill'
  texts: CarouselText[]
  elements: CarouselElement[]
  stickers: CarouselSticker[]
  order: number
}

/** Carrossel completo (chave `lumen_carousels`). */
export interface CarouselV2 {
  id: string
  name: string
  aspectRatio: '1:1' | '16:9'
  slides: CarouselSlideV2[]
  createdAt: string
  updatedAt: string
}

/** Elemento arrastável no canvas de post estático (chave `lumen_static_posts_v2`). */
export interface StaticPostElement {
  id: string
  type: 'text' | 'shape' | 'image' | 'line'
  content: string
  x: number
  y: number
  width: number
  height: number
  color: string
  fontFamily?: string
  fontSize?: number
  align?: 'left' | 'center' | 'right'
  bold?: boolean
  italic?: boolean
  shape?: 'rectangle' | 'circle' | 'line' | 'star' | 'triangle'
  opacity?: number
  imageUrl?: string
  rotation?: number
}

/** Post estático (chave `lumen_static_posts_v2`). */
export interface StaticPostV2 {
  id: string
  name: string
  canvasWidth: number
  canvasHeight: number
  backgroundColor: string
  backgroundType: 'color' | 'gradient' | 'image'
  backgroundGradient?: string
  backgroundImage?: string
  elements: StaticPostElement[]
  createdAt: string
  updatedAt: string
}

/** Template de modelo (mockado, rota /modelos). */
export interface TemplateModel {
  id: string
  name: string
  category: 'Reels' | 'TikTok' | 'YouTube' | 'Stories' | 'Carrossel' | 'Post'
  duration: string
  gradient: string
  icon: string
  editorRoute: string
  description: string
}

/** Música (mockada, rota /musicas). */
export interface MusicTrack {
  id: string
  title: string
  artist: string
  album: string
  duration: number // segundos
  genre: 'Lo-fi' | 'Cinematic' | 'Eletrônico' | 'Pop' | 'Hip-hop' | 'Ambiente'
  bpm: number
  cover: string
  color: string
}

/**
 * Mídia da biblioteca.
 *
 * PROMPT 2 — agora alinhada ao modelo canônico `MediaAsset` (única fonte de
 * verdade, persistida em `lumen_media_assets`). O tipo é mantido como um
 * alias estreito de `MediaAsset` para compatibilidade de imports existentes.
 */
export interface MediaLibraryItem {
  id: string
  name: string
  type: 'image' | 'video' | 'audio'
  /** Data URL base64 da mídia (alias de `publicUrl` no MediaAsset canônico). */
  dataUrl: string
  /** Thumbnail (data URL) quando disponível. */
  thumbnailUrl?: string
  size: number
  mimeType?: string
  width?: number
  height?: number
  /** Duração em segundos (vídeos/áudios). */
  duration?: number
  createdAt: string
  updatedAt?: string
  source?: 'upload' | 'recording' | 'generated' | 'pexels' | 'library'
  /** Itens de demonstração — nunca tratados como arquivo real. */
  demo?: boolean
}

/** Elemento decorativo da biblioteca (mockado, rota /elementos). */
export interface DecorElement {
  id: string
  name: string
  category: 'Formas' | 'Ícones' | 'Molduras' | 'Efeitos' | 'Tipografia'
  render: 'svg' | 'emoji'
  svg?: string
  emoji?: string
  color: string
}
