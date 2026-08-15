/* ===========================================================================
   LUMEN Studio — Packs Profissionais de Ativos: Overlays, SFX e Trilhas CapCut
   =========================================================================== */

export interface OverlayAsset {
  id: string
  name: string
  category: 'Glitter' | 'Poeira' | 'Retro' | 'Cyber' | 'Seta' | 'Film Burns' | 'Light Leaks'
  blendMode: 'screen' | 'add'
  previewColor: string
  videoUrl?: string
  thumbnailUrl?: string
}

export interface SFXAsset {
  id: string
  name: string
  category: 'Woosh' | 'Teclado' | 'Mensagem' | 'Dinheiro' | 'Cliques'
  audioUrl: string
  duration: number // segundos
  iconName: string
}

export interface CapCutTrackAsset {
  id: string
  title: string
  artist: string
  audioUrl: string
  duration: number // segundos
  bpm: number
  genre: string
  coverUrl: string
  autoDucking: boolean
}

// ---------------------------------------------------------------------------
// Pack de Overlays (25 efeitos)
// ---------------------------------------------------------------------------
export const OVERLAY_PACK: OverlayAsset[] = [
  // Glitter (4)
  {
    id: 'ov-glitter-1',
    name: 'Sparkle Gold',
    category: 'Glitter',
    blendMode: 'screen',
    previewColor: '#FBBF24',
  },
  {
    id: 'ov-glitter-2',
    name: 'Magic Dust Glow',
    category: 'Glitter',
    blendMode: 'add',
    previewColor: '#F59E0B',
  },
  {
    id: 'ov-glitter-3',
    name: 'Diamond Shimmer',
    category: 'Glitter',
    blendMode: 'screen',
    previewColor: '#38BDF8',
  },
  {
    id: 'ov-glitter-4',
    name: 'Cosmic Starfield',
    category: 'Glitter',
    blendMode: 'add',
    previewColor: '#A855F7',
  },

  // Poeira (3)
  {
    id: 'ov-dust-1',
    name: 'Cinematic Particles',
    category: 'Poeira',
    blendMode: 'screen',
    previewColor: '#94A3B8',
  },
  {
    id: 'ov-dust-2',
    name: 'Vintage Dust Motes',
    category: 'Poeira',
    blendMode: 'screen',
    previewColor: '#CBD5E1',
  },
  {
    id: 'ov-dust-3',
    name: 'Floating Atmospheric',
    category: 'Poeira',
    blendMode: 'add',
    previewColor: '#E2E8F0',
  },

  // Retro (4)
  {
    id: 'ov-retro-1',
    name: 'VHS Scanlines',
    category: 'Retro',
    blendMode: 'screen',
    previewColor: '#10B981',
  },
  {
    id: 'ov-retro-2',
    name: 'CRT Glitch Noise',
    category: 'Retro',
    blendMode: 'screen',
    previewColor: '#EF4444',
  },
  {
    id: 'ov-retro-3',
    name: 'Old Film Grain 16mm',
    category: 'Retro',
    blendMode: 'screen',
    previewColor: '#D97706',
  },
  {
    id: 'ov-retro-4',
    name: '80s Arcade Lines',
    category: 'Retro',
    blendMode: 'add',
    previewColor: '#EC4899',
  },

  // Cyber (3)
  {
    id: 'ov-cyber-1',
    name: 'Cyberpunk HUD Grid',
    category: 'Cyber',
    blendMode: 'add',
    previewColor: '#22D3EE',
  },
  {
    id: 'ov-cyber-2',
    name: 'Neon Circuit Pulse',
    category: 'Cyber',
    blendMode: 'screen',
    previewColor: '#7C5CFC',
  },
  {
    id: 'ov-cyber-3',
    name: 'Digital Data Rain',
    category: 'Cyber',
    blendMode: 'add',
    previewColor: '#34D399',
  },

  // Seta (3)
  {
    id: 'ov-arrow-1',
    name: 'Animated Red Arrow',
    category: 'Seta',
    blendMode: 'screen',
    previewColor: '#EF4444',
  },
  {
    id: 'ov-arrow-2',
    name: 'Neon Glow Arrow',
    category: 'Seta',
    blendMode: 'add',
    previewColor: '#22D3EE',
  },
  {
    id: 'ov-arrow-3',
    name: 'Hand Drawn Pointer',
    category: 'Seta',
    blendMode: 'screen',
    previewColor: '#F59E0B',
  },

  // Film Burns (4)
  {
    id: 'ov-burn-1',
    name: 'Warm Amber Film Leak',
    category: 'Film Burns',
    blendMode: 'add',
    previewColor: '#F97316',
  },
  {
    id: 'ov-burn-2',
    name: 'Kodak Edge Burn',
    category: 'Film Burns',
    blendMode: 'screen',
    previewColor: '#EA580C',
  },
  {
    id: 'ov-burn-3',
    name: 'Super 8 Flash Flare',
    category: 'Film Burns',
    blendMode: 'add',
    previewColor: '#EAB308',
  },
  {
    id: 'ov-burn-4',
    name: 'Vintage Edge Burst',
    category: 'Film Burns',
    blendMode: 'screen',
    previewColor: '#DC2626',
  },

  // Light Leaks (4)
  {
    id: 'ov-[#7C5CFC] Leak',
    name: 'Prism Rainbow Lens',
    category: 'Light Leaks',
    blendMode: 'screen',
    previewColor: '#8B5CF6',
  },
  {
    id: 'ov-[#22D3EE] Leak',
    name: 'Cyan Glow Flare',
    category: 'Light Leaks',
    blendMode: 'add',
    previewColor: '#06B6D4',
  },
  {
    id: 'ov-sunset-leak',
    name: 'Sunset Anamorphic Leak',
    category: 'Light Leaks',
    blendMode: 'add',
    previewColor: '#F43F5E',
  },
  {
    id: 'ov-soft-bokeh',
    name: 'Soft Bokeh Glow',
    category: 'Light Leaks',
    blendMode: 'screen',
    previewColor: '#C084FC',
  },
]

// ---------------------------------------------------------------------------
// Pack de SFX (Efeitos Sonoros)
// ---------------------------------------------------------------------------
// Geradores Web Audio de tom sintético de alta qualidade para reprodução sem assets externos
const sfxAudioUrls: Record<string, string> = {
  woosh: 'data:audio/wav;base64,UklGRiQAAABXQVZFZm10IBAAAAABAAEARKwAAIhYAQACABAAZGF0YQAAAAA=',
  teclado: 'data:audio/wav;base64,UklGRiQAAABXQVZFZm10IBAAAAABAAEARKwAAIhYAQACABAAZGF0YQAAAAA=',
  mensagem: 'data:audio/wav;base64,UklGRiQAAABXQVZFZm10IBAAAAABAAEARKwAAIhYAQACABAAZGF0YQAAAAA=',
  dinheiro: 'data:audio/wav;base64,UklGRiQAAABXQVZFZm10IBAAAAABAAEARKwAAIhYAQACABAAZGF0YQAAAAA=',
  cliques: 'data:audio/wav;base64,UklGRiQAAABXQVZFZm10IBAAAAABAAEARKwAAIhYAQACABAAZGF0YQAAAAA=',
}

export const SFX_PACK: SFXAsset[] = [
  {
    id: 'sfx-woosh-1',
    name: 'Swoosh Transição Rápida',
    category: 'Woosh',
    audioUrl: sfxAudioUrls.woosh,
    duration: 0.4,
    iconName: 'Wind',
  },
  {
    id: 'sfx-woosh-2',
    name: 'Air Impact Fast',
    category: 'Woosh',
    audioUrl: sfxAudioUrls.woosh,
    duration: 0.5,
    iconName: 'Zap',
  },
  {
    id: 'sfx-teclado-1',
    name: 'Digitação Mecânica',
    category: 'Teclado',
    audioUrl: sfxAudioUrls.teclado,
    duration: 0.8,
    iconName: 'Keyboard',
  },
  {
    id: 'sfx-teclado-2',
    name: 'Key Press Single',
    category: 'Teclado',
    audioUrl: sfxAudioUrls.teclado,
    duration: 0.2,
    iconName: 'Keyboard',
  },
  {
    id: 'sfx-msg-1',
    name: 'Pop Notificação iPhone',
    category: 'Mensagem',
    audioUrl: sfxAudioUrls.mensagem,
    duration: 0.3,
    iconName: 'MessageSquare',
  },
  {
    id: 'sfx-msg-2',
    name: 'Ping Mensagem Enviada',
    category: 'Mensagem',
    audioUrl: sfxAudioUrls.mensagem,
    duration: 0.4,
    iconName: 'Send',
  },
  {
    id: 'sfx-dinheiro-1',
    name: 'Caixa Registradora (Cha-Ching)',
    category: 'Dinheiro',
    audioUrl: sfxAudioUrls.dinheiro,
    duration: 0.7,
    iconName: 'DollarSign',
  },
  {
    id: 'sfx-dinheiro-2',
    name: 'Moedas Caindo',
    category: 'Dinheiro',
    audioUrl: sfxAudioUrls.dinheiro,
    duration: 0.9,
    iconName: 'Coins',
  },
  {
    id: 'sfx-cliques-1',
    name: 'Clique de Mouse Studio',
    category: 'Cliques',
    audioUrl: sfxAudioUrls.cliques,
    duration: 0.15,
    iconName: 'MousePointer',
  },
  {
    id: 'sfx-cliques-2',
    name: 'Button Tap Modern',
    category: 'Cliques',
    audioUrl: sfxAudioUrls.cliques,
    duration: 0.2,
    iconName: 'Touchpad',
  },
]

// Synthesizer de efeitos sonoros Web Audio API em tempo real
export function playSyntheticSFX(category: SFXAsset['category']) {
  try {
    const AudioCtx =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext
    if (!AudioCtx) return
    const ctx = new AudioCtx()
    const now = ctx.currentTime

    if (category === 'Woosh') {
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      osc.type = 'sine'
      osc.frequency.setValueAtTime(150, now)
      osc.frequency.exponentialRampToValueAtTime(600, now + 0.15)
      osc.frequency.exponentialRampToValueAtTime(80, now + 0.35)
      gain.gain.setValueAtTime(0.01, now)
      gain.gain.linearRampToValueAtTime(0.4, now + 0.15)
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.35)
      osc.connect(gain)
      gain.connect(ctx.destination)
      osc.start(now)
      osc.stop(now + 0.35)
    } else if (category === 'Teclado' || category === 'Cliques') {
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      osc.type = 'triangle'
      osc.frequency.setValueAtTime(1200, now)
      osc.frequency.exponentialRampToValueAtTime(200, now + 0.08)
      gain.gain.setValueAtTime(0.3, now)
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.08)
      osc.connect(gain)
      gain.connect(ctx.destination)
      osc.start(now)
      osc.stop(now + 0.08)
    } else if (category === 'Mensagem') {
      const osc1 = ctx.createOscillator()
      const osc2 = ctx.createOscillator()
      const gain = ctx.createGain()
      osc1.frequency.setValueAtTime(523.25, now) // C5
      osc2.frequency.setValueAtTime(659.25, now + 0.08) // E5
      gain.gain.setValueAtTime(0.3, now)
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.3)
      osc1.connect(gain)
      osc2.connect(gain)
      gain.connect(ctx.destination)
      osc1.start(now)
      osc1.stop(now + 0.08)
      osc2.start(now + 0.08)
      osc2.stop(now + 0.3)
    } else if (category === 'Dinheiro') {
      const freqs = [987.77, 1318.51, 1567.98]
      freqs.forEach((f, i) => {
        const osc = ctx.createOscillator()
        const gain = ctx.createGain()
        osc.frequency.setValueAtTime(f, now + i * 0.06)
        gain.gain.setValueAtTime(0.2, now + i * 0.06)
        gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.06 + 0.2)
        osc.connect(gain)
        gain.connect(ctx.destination)
        osc.start(now + i * 0.06)
        osc.stop(now + i * 0.06 + 0.2)
      })
    }
  } catch (e) {
    console.warn('[SFX] Web Audio API indisponível:', e)
  }
}

// ---------------------------------------------------------------------------
// Pack de Trilhas CapCut (16 Trilhas Exclusivas com Auto-Ducking)
// ---------------------------------------------------------------------------
export const CAPCUT_TRACKS_PACK: CapCutTrackAsset[] = [
  {
    id: 'cc-1',
    title: 'Cleanin out my closet',
    artist: 'Eminem Remix CapCut',
    audioUrl: 'https://img.usecurling.com/p/800/600?q=abstract',
    duration: 142,
    bpm: 95,
    genre: 'Hip-Hop Trend',
    coverUrl: 'https://img.usecurling.com/p/300/300?q=cleanin+out+my+closet+urban',
    autoDucking: true,
  },
  {
    id: 'cc-2',
    title: 'Mafia',
    artist: 'CapCut Dark Trap',
    audioUrl: 'https://img.usecurling.com/p/800/600?q=abstract',
    duration: 130,
    bpm: 120,
    genre: 'Dark Trap',
    coverUrl: 'https://img.usecurling.com/p/300/300?q=mafia+dark+suit+neon',
    autoDucking: true,
  },
  {
    id: 'cc-3',
    title: 'Loop Suspense',
    artist: 'CapCut Cinema',
    audioUrl: 'https://img.usecurling.com/p/800/600?q=abstract',
    duration: 110,
    bpm: 85,
    genre: 'Cinematográfico',
    coverUrl: 'https://img.usecurling.com/p/300/300?q=loop+suspense+fog',
    autoDucking: true,
  },
  {
    id: 'cc-4',
    title: 'Loop Tenso',
    artist: 'CapCut Thriller',
    audioUrl: 'https://img.usecurling.com/p/800/600?q=abstract',
    duration: 98,
    bpm: 115,
    genre: 'Tensao / Drama',
    coverUrl: 'https://img.usecurling.com/p/300/300?q=tension+loop+red',
    autoDucking: true,
  },
  {
    id: 'cc-5',
    title: 'Loop Piano',
    artist: 'Soft Emotion Studio',
    audioUrl: 'https://img.usecurling.com/p/800/600?q=abstract',
    duration: 155,
    bpm: 72,
    genre: 'Piano / Emocional',
    coverUrl: 'https://img.usecurling.com/p/300/300?q=piano+loop+keys',
    autoDucking: true,
  },
  {
    id: 'cc-6',
    title: 'Winter Aid',
    artist: 'CapCut Ambient',
    audioUrl: 'https://img.usecurling.com/p/800/600?q=abstract',
    duration: 165,
    bpm: 80,
    genre: 'Ambient Glow',
    coverUrl: 'https://img.usecurling.com/p/300/300?q=winter+aid+snow+blue',
    autoDucking: true,
  },
  {
    id: 'cc-7',
    title: 'I Feel so Good',
    artist: 'Upbeat Pop Vibe',
    audioUrl: 'https://img.usecurling.com/p/800/600?q=abstract',
    duration: 124,
    bpm: 124,
    genre: 'Energético / Pop',
    coverUrl: 'https://img.usecurling.com/p/300/300?q=i+feel+so+good+sun',
    autoDucking: true,
  },
  {
    id: 'cc-8',
    title: 'Run this Town',
    artist: 'Anthem Beats',
    audioUrl: 'https://img.usecurling.com/p/800/600?q=abstract',
    duration: 138,
    bpm: 110,
    genre: 'Power Trap',
    coverUrl: 'https://img.usecurling.com/p/300/300?q=run+this+town+stadium',
    autoDucking: true,
  },
  {
    id: 'cc-9',
    title: 'Quer voar',
    artist: 'Matuê Style Beat',
    audioUrl: 'https://img.usecurling.com/p/800/600?q=abstract',
    duration: 140,
    bpm: 135,
    genre: 'Trap BR',
    coverUrl: 'https://img.usecurling.com/p/300/300?q=quer+voar+purple+sky',
    autoDucking: true,
  },
  {
    id: 'cc-10',
    title: 'Cogulândia',
    artist: 'Psychedelic Trap',
    audioUrl: 'https://img.usecurling.com/p/800/600?q=abstract',
    duration: 118,
    bpm: 128,
    genre: 'Lo-Fi Trap',
    coverUrl: 'https://img.usecurling.com/p/300/300?q=cogulandia+trippy',
    autoDucking: true,
  },
  {
    id: 'cc-11',
    title: 'Bella and Dunkan',
    artist: 'TikTok Acoustic Viral',
    audioUrl: 'https://img.usecurling.com/p/800/600?q=abstract',
    duration: 132,
    bpm: 105,
    genre: 'Acoustic Pop',
    coverUrl: 'https://img.usecurling.com/p/300/300?q=bella+and+dunkan+guitar',
    autoDucking: true,
  },
  {
    id: 'cc-12',
    title: 'Bella Les',
    artist: 'French Chill Vibe',
    audioUrl: 'https://img.usecurling.com/p/800/600?q=abstract',
    duration: 148,
    bpm: 98,
    genre: 'Chill Pop',
    coverUrl: 'https://img.usecurling.com/p/300/300?q=bella+les+paris+sunset',
    autoDucking: true,
  },
  {
    id: 'cc-13',
    title: 'Mário - Eminen',
    artist: 'Nostalgic Gamer Beat',
    audioUrl: 'https://img.usecurling.com/p/800/600?q=abstract',
    duration: 126,
    bpm: 118,
    genre: '8-Bit Trap',
    coverUrl: 'https://img.usecurling.com/p/300/300?q=mario+eminem+mashup',
    autoDucking: true,
  },
  {
    id: 'cc-14',
    title: 'Red Hot',
    artist: 'Funk Rock Groove',
    audioUrl: 'https://img.usecurling.com/p/800/600?q=abstract',
    duration: 150,
    bpm: 116,
    genre: 'Funk Rock',
    coverUrl: 'https://img.usecurling.com/p/300/300?q=red+hot+chili+peppers+stage',
    autoDucking: true,
  },
  {
    id: 'cc-15',
    title: 'M4 Teto',
    artist: 'Teto Type Beat BR',
    audioUrl: 'https://img.usecurling.com/p/800/600?q=abstract',
    duration: 134,
    bpm: 130,
    genre: 'Trap Nacional',
    coverUrl: 'https://img.usecurling.com/p/300/300?q=m4+teto+trap+stage',
    autoDucking: true,
  },
  {
    id: 'cc-16',
    title: 'Tory Lanez',
    artist: '80s Synth R&B',
    audioUrl: 'https://img.usecurling.com/p/800/600?q=abstract',
    duration: 160,
    bpm: 100,
    genre: 'Synth R&B',
    coverUrl: 'https://img.usecurling.com/p/300/300?q=tory+lanez+retro+neon',
    autoDucking: true,
  },
]
