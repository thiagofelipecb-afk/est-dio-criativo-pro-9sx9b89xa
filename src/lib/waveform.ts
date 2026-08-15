/* ===========================================================================
   src/lib/waveform.ts — FASE 5
   Gerador de waveform a partir do áudio de um vídeo/blob, usando AudioContext +
   AnalyserNode (sem FFmpeg). Desenha em canvas a forma de onda e expõe os
   picos normalizados para reuso (ex.: timeline não destrutiva).
   =========================================================================== */

/** Resultado da análise de waveform. */
export interface WaveformData {
  /** Número de amostras (barras) geradas. */
  samples: number
  /** Picos normalizados 0..1 por amostra. */
  peaks: number[]
  /** Duração total do áudio em segundos. */
  duration: number
  /** Sample rate do AudioContext usado. */
  sampleRate: number
}

/**
 * Extrai os picos de waveform de um Blob de áudio/vídeo.
 *
 * Estratégia: decodifica o arraybuffer com AudioContext.decodeAudioData,
 * percorre o PCM em janelas e calcula o pico absoluto de cada janela.
 * Não depende de FFmpeg — apenas da Web Audio API.
 *
 * @param blob Blob de mídia (vídeo ou áudio)
 * @param samples Número desejado de barras (padrão 400)
 */
export async function extractWaveform(blob: Blob, samples = 400): Promise<WaveformData> {
  const arrayBuffer = await blob.arrayBuffer()
  const AC: typeof AudioContext = window.AudioContext || (window as any).webkitAudioContext
  const ctx = new AC()
  try {
    const audioBuffer = await ctx.decodeAudioData(arrayBuffer.slice(0))
    const channelData = audioBuffer.getChannelData(0)
    const total = channelData.length
    const blockSize = Math.max(1, Math.floor(total / samples))
    const peaks: number[] = []
    for (let i = 0; i < samples; i++) {
      const start = i * blockSize
      const end = Math.min(start + blockSize, total)
      let peak = 0
      for (let j = start; j < end; j++) {
        const v = Math.abs(channelData[j])
        if (v > peak) peak = v
      }
      peaks.push(peak)
    }
    // Normaliza pelo maior pico para preencher bem o canvas.
    const maxPeak = peaks.reduce((m, p) => Math.max(m, p), 0) || 1
    const normalized = peaks.map((p) => p / maxPeak)
    return {
      samples,
      peaks: normalized,
      duration: audioBuffer.duration,
      sampleRate: audioBuffer.sampleRate,
    }
  } finally {
    if (ctx.state !== 'closed') {
      try {
        await ctx.close()
      } catch {
        /* noop */
      }
    }
  }
}

/**
 * Desenha um waveform em um canvas 2D.
 *
 * @param ctx Contexto 2D do canvas
 * @param data Dados de waveform (peaks normalizados)
 * @param width Largura em pixels
 * @param height Altura em pixels
 * @param color Cor de preenchimento (padrão roxo LUMEN)
 * @param options Segmento destacado (in/out) e opacidade fora do segmento
 */
export function drawWaveform(
  ctx: CanvasRenderingContext2D,
  data: WaveformData,
  width: number,
  height: number,
  color = '#7C5CFC',
  options?: {
    /** Início do segmento destacado (fração 0..1). */
    inFraction?: number
    /** Fim do segmento destacado (fração 0..1). */
    outFraction?: number
    /** Cor do segmento fora do destaque (mais opaco). */
    dimColor?: string
    /** Cor de fundo. */
    bgColor?: string
  },
): void {
  const {
    inFraction = 0,
    outFraction = 1,
    dimColor = 'rgba(124, 92, 252, 0.25)',
    bgColor = 'transparent',
  } = options || {}

  ctx.clearRect(0, 0, width, height)
  if (bgColor !== 'transparent') {
    ctx.fillStyle = bgColor
    ctx.fillRect(0, 0, width, height)
  }

  const mid = height / 2
  const barCount = data.peaks.length
  if (barCount === 0) return
  const barWidth = width / barCount
  const inX = inFraction * width
  const outX = outFraction * width

  for (let i = 0; i < barCount; i++) {
    const x = i * barWidth
    const peak = data.peaks[i]
    const barH = Math.max(1, peak * (height * 0.92))
    ctx.fillStyle = x >= inX && x <= outX ? color : dimColor
    ctx.fillRect(x, mid - barH / 2, Math.max(1, barWidth - 0.5), barH)
  }
}

/**
 * Fallback de waveform quando não é possível decodificar o áudio
 * (ex.: codec não suportado, vídeo sem áudio). Gera um waveform sintético
 * baseado em uma função pseudo-aleatória determinística.
 */
export function syntheticWaveform(duration: number, samples = 400): WaveformData {
  const peaks: number[] = []
  let seed = 1337
  const rand = () => {
    seed = (seed * 9301 + 49297) % 233280
    return seed / 233280
  }
  for (let i = 0; i < samples; i++) {
    // Combina senoides + ruído para parecer áudio de fala.
    const t = i / samples
    const env = 0.4 + 0.6 * Math.abs(Math.sin(t * Math.PI * 6))
    const noise = 0.2 + 0.8 * rand()
    peaks.push(Math.min(1, env * noise * 0.85))
  }
  return {
    samples,
    peaks,
    duration,
    sampleRate: 44100,
  }
}
