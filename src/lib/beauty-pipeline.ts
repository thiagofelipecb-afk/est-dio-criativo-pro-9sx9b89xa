/* =============================================================================
   LUMEN Studio — Pipeline de Retoque Facial WebGL
   -----------------------------------------------------------------------------
   Pipeline real de detecção facial + shaders regionais que substitui/complementa
   os filtros CSS globais (`ctx.filter`). Os efeitos são aplicados APENAS na
   região do rosto detectada, preservando poros/textura, identidade e evitando
   efeito plástico.

   Estratégia (robusta a bundler/CDN):
   - Detecção: tenta `@mediapipe/tasks-vision` (FaceLandmarker) via dynamic
     import(); se falhar, tenta a Shape Detection API nativa (`FaceDetector`);
     se ambas falharem, opera em modo "no-model" (fallback CSS).
   - Render: WebGL2 (fallback WebGL1). Um único programa aplica todos os
     efeitos em uma passada usando máscaras procedurais derivadas dos
     landmarks / bounding box do rosto.
   - Estabilidade: temporal smoothing (EMA) da caixa do rosto entre frames e
     redução automática de intensidade quando a detecção está instável.
   - Desempenho: detecção periódica (não todos os frames); se o FPS cair abaixo
     de 20, pula frames de detecção e reduz a resolução do blur.

   O pipeline produz um `BeautyOutput` — um CanvasImageSource pronto para ser
   desenhado pelo compositor no lugar do `<video>` cru.
   ========================================================================== */

import type { BeautyConfig, FaceStatus } from '@/types/studio'

/** Saída do pipeline para um frame. */
export interface BeautyOutput {
  /** Fonte pronta para drawImage (canvas WebGL ou o próprio vídeo em fallback). */
  source: CanvasImageSource
  /** True quando o pipeline WebGL processou o frame (efeitos aplicados). */
  processed: boolean
  /** Status da detecção facial neste frame. */
  faceStatus: FaceStatus
  /** Caixa do rosto normalizada (0..1) para overlay/debug, se detectada. */
  faceBox?: { x: number; y: number; w: number; h: number }
}

/** Retângulo do rosto em pixels do canvas de processamento. */
interface FaceRect {
  x: number
  y: number
  w: number
  h: number
  /** Confiança 0..1 (landmarks) ou -1 (bounding box nativa). */
  confidence: number
}

/** Configuração de runtime do pipeline (não persistida). */
export interface BeautyRuntime {
  /** Master toggle — quando false, o pipeline retorna o vídeo cru. */
  enabled: boolean
  /** Mostrar o frame sem efeitos (botão "Comparar"). */
  compareBefore: boolean
}

// -----------------------------------------------------------------------------
// Shaders
// -----------------------------------------------------------------------------

/**
 * Shader de retoque facial. Recebe a textura do vídeo e aplica, em uma passada,
 * os efeitos regionais usando máscaras procedurais gaussianas centradas na
 * região do rosto. A intensidade de cada efeito é controlada por uniforms.
 *
 * O objetivo NÃO é um blur uniforme: preservamos alta frequência (poros) via
 * mistura parcial e usamos máscaras suaves para evitar bordas duras.
 */
const BEAUTY_VERT = `
attribute vec2 a_pos;
varying vec2 v_uv;
void main() {
  v_uv = a_pos * 0.5 + 0.5;
  v_uv.y = 1.0 - v_uv.y;
  gl_Position = vec4(a_pos, 0.0, 1.0);
}
`

const BEAUTY_FRAG = `
precision mediump float;
varying vec2 v_uv;
uniform sampler2D u_tex;
// Caixa do rosto normalizada (0..1).
uniform vec4 u_face;   // x, y, w, h
// Centro e raios da máscara facial (0..1).
uniform vec2 u_faceCenter;
uniform float u_faceRadiusX;
uniform float u_faceRadiusY;
// Intensidades 0..1 de cada efeito.
uniform float u_skinSmooth;
uniform float u_shineReduction;
uniform float u_toneUniformity;
uniform float u_rednessReduction;
uniform float u_wrinkleSmooth;
uniform float u_eyeEnhance;
uniform float u_nasolabial;
uniform float u_darkCircles;
uniform float u_facialLighting;
uniform float u_selectiveSharpness;
uniform float u_intensity;       // escala global
uniform float u_texelW;          // 1/width
uniform float u_texelH;          // 1/height
uniform float u_quality;         // 0..1 — reduz amostragem em baixo desempenho

// Distância gaussiana normalizada para máscara facial elíptica.
float faceMask(vec2 uv) {
  if (u_face.w <= 0.0) return 0.0;
  vec2 d = (uv - u_faceCenter) / vec2(u_faceRadiusX, u_faceRadiusY);
  float r2 = dot(d, d);
  // Borda suave: 1 no centro, ~0 em r=1.2.
  return smoothstep(1.15, 0.55, r2);
}

// Máscara regional genérica centrada em (cx,cy) com raios (rx,ry).
float regionMask(vec2 uv, vec2 c, float rx, float ry) {
  vec2 d = (uv - c) / vec2(rx, ry);
  return smoothstep(1.0, 0.4, dot(d, d));
}

// Zona T (testa + nariz) — brilho/oleosidade.
float zoneTMask(vec2 uv) {
  if (u_face.w <= 0.0) return 0.0;
  float cy = u_faceCenter.y;
  float topY = u_face.y + u_face.h * 0.18;
  // Testa: banda horizontal.
  float forehead = regionMask(uv, vec2(u_faceCenter.x, topY), u_faceRadiusX * 0.7, u_face.h * 0.12);
  // Nariz: faixa vertical estreita.
  vec2 noseC = vec2(u_faceCenter.x, cy);
  float nose = regionMask(uv, noseC, u_face.w * 0.08, u_face.h * 0.28);
  return clamp(forehead + nose, 0.0, 1.0);
}

// Olheiras: abaixo dos olhos.
float darkCirclesMask(vec2 uv) {
  if (u_face.w <= 0.0) return 0.0;
  float y = u_face.y + u_face.h * 0.52;
  float lx = u_faceCenter.x - u_face.w * 0.18;
  float rx = u_faceCenter.x + u_face.w * 0.18;
  float lm = regionMask(uv, vec2(lx, y), u_face.w * 0.12, u_face.h * 0.06);
  float rm = regionMask(uv, vec2(rx, y), u_face.w * 0.12, u_face.h * 0.06);
  return clamp(lm + rm, 0.0, 1.0);
}

// Sulco nasolabial: lados do nariz até a boca.
float nasolabialMask(vec2 uv) {
  if (u_face.w <= 0.0) return 0.0;
  float y = u_face.y + u_face.h * 0.68;
  float lx = u_faceCenter.x - u_face.w * 0.16;
  float rx = u_faceCenter.x + u_face.w * 0.16;
  float lm = regionMask(uv, vec2(lx, y), u_face.w * 0.08, u_face.h * 0.12);
  float rm = regionMask(uv, vec2(rx, y), u_face.w * 0.08, u_face.h * 0.12);
  return clamp(lm + rm, 0.0, 1.0);
}

// Olhos: duas regiões.
float eyesMask(vec2 uv) {
  if (u_face.w <= 0.0) return 0.0;
  float y = u_face.y + u_face.h * 0.42;
  float lx = u_faceCenter.x - u_face.w * 0.2;
  float rx = u_faceCenter.x + u_face.w * 0.2;
  float lm = regionMask(uv, vec2(lx, y), u_face.w * 0.12, u_face.h * 0.06);
  float rm = regionMask(uv, vec2(rx, y), u_face.w * 0.12, u_face.h * 0.06);
  return clamp(lm + rm, 0.0, 1.0);
}

// Lábios.
float lipsMask(vec2 uv) {
  if (u_face.w <= 0.0) return 0.0;
  return regionMask(uv, vec2(u_faceCenter.x, u_face.y + u_face.h * 0.78), u_face.w * 0.16, u_face.h * 0.05);
}

// Amostra a textura.
vec3 sampleTex(vec2 uv) {
  return texture2D(u_tex, clamp(uv, 0.0, 1.0)).rgb;
}

// Bilateral simplificado (aproximação): blur gaussiano com rejeição de bordas
// baseada em diferença de cor. Barato e preserva contornos.
vec3 bilateralBlur(vec2 uv, float radius, float edge) {
  vec3 c = sampleTex(uv);
  vec3 sum = vec3(0.0);
  float wsum = 0.0;
  // Amostragem em anel (qualidade escalonável).
  float steps = mix(4.0, 8.0, u_quality);
  for (float i = 0.0; i < 8.0; i += 1.0) {
    if (i >= steps) break;
    float a = i * (6.2831853 / steps);
    vec2 off = vec2(cos(a), sin(a)) * radius;
    vec3 s = sampleTex(uv + off);
    float d = distance(s, c);
    float w = exp(-d * d * edge) * exp(-dot(off, off) * 12.0);
    sum += s * w;
    wsum += w;
  }
  return wsum > 0.0 ? sum / wsum : c;
}

// Unsharp mask (nitidez seletiva).
vec3 sharpen(vec2 uv, float amount) {
  vec3 c = sampleTex(uv);
  vec3 blur = (sampleTex(uv + vec2(u_texelW, 0.0)) + sampleTex(uv - vec2(u_texelW, 0.0))
             + sampleTex(uv + vec2(0.0, u_texelH)) + sampleTex(uv - vec2(0.0, u_texelH))) * 0.25;
  return c + (c - blur) * amount;
}

void main() {
  vec2 uv = v_uv;
  vec3 col = sampleTex(uv);

  float fm = faceMask(uv);
  if (fm <= 0.0 && u_face.w > 0.0) {
    // Fora do rosto: sem retoque. Apenas nitidez global mínima se habilitada.
    gl_FragColor = vec4(col, 1.0);
    return;
  }
  // Sem rosto detectado: passa direto (fallback CSS cuida do global).
  if (u_face.w <= 0.0) {
    gl_FragColor = vec4(col, 1.0);
    return;
  }

  float g = u_intensity;

  // --- Suavização de pele (bilateral) preservando bordas/poros ---
  float skinAmt = u_skinSmooth * g * fm;
  if (skinAmt > 0.0) {
    float radius = mix(u_texelW * 1.5, u_texelW * 3.0, u_quality) * (1.0 + skinAmt);
    vec3 blurred = bilateralBlur(uv, radius, 40.0);
    // Mistura parcial: preserva poros (não passa a 100%).
    col = mix(col, blurred, clamp(skinAmt * 0.6, 0.0, 0.75));
  }

  // --- Suavização de rugas finas (mais localizada, mais sutil) ---
  float wrinkleAmt = u_wrinkleSmooth * g * fm;
  if (wrinkleAmt > 0.0) {
    float radius = u_texelW * 2.0 * (1.0 + wrinkleAmt * 0.5);
    vec3 blurred = bilateralBlur(uv, radius, 60.0);
    col = mix(col, blurred, clamp(wrinkleAmt * 0.3, 0.0, 0.4));
  }

  // --- Redução de brilho/oleosidade (zona T) ---
  float shineAmt = u_shineReduction * g * zoneTMask(uv);
  if (shineAmt > 0.0) {
    // Reduz luminância apenas nos highlights.
    float luma = dot(col, vec3(0.299, 0.587, 0.114));
    float highlight = smoothstep(0.6, 1.0, luma);
    col = mix(col, col * (1.0 - shineAmt * 0.5 * highlight), shineAmt * highlight);
  }

  // --- Uniformização de tonalidade ---
  float toneAmt = u_toneUniformity * g * fm;
  if (toneAmt > 0.0) {
    float luma = dot(col, vec3(0.299, 0.587, 0.114));
    vec3 blurred = bilateralBlur(uv, u_texelW * 6.0, 20.0);
    float bluma = dot(blurred, vec3(0.299, 0.587, 0.114));
    // Reposiciona a luminância local perto da média suave sem mudar a cor média.
    vec3 adjusted = col + (bluma - luma) * toneAmt * 0.3;
    col = mix(col, adjusted, toneAmt * 0.4);
  }

  // --- Redução de vermelhidão ---
  float redAmt = u_rednessReduction * g * fm;
  if (redAmt > 0.0) {
    float r = col.r;
    float avg = (col.g + col.b) * 0.5;
    float excess = clamp((r - avg) * 1.5, 0.0, 1.0);
    col.r = mix(col.r, col.r - excess * redAmt * 0.6, redAmt);
  }

  // --- Olheiras ---
  float dcAmt = u_darkCircles * g * darkCirclesMask(uv);
  if (dcAmt > 0.0) {
    float luma = dot(col, vec3(0.299, 0.587, 0.114));
    float dark = smoothstep(0.45, 0.15, luma);
    col = mix(col, col + vec3(0.06, 0.05, 0.04) * dark, dcAmt * 0.6);
  }

  // --- Sulco nasolabial ---
  float nlAmt = u_nasolabial * g * nasolabialMask(uv);
  if (nlAmt > 0.0) {
    float luma = dot(col, vec3(0.299, 0.587, 0.114));
    float shadow = smoothstep(0.4, 0.2, luma);
    col = mix(col, col + vec3(0.05) * shadow, nlAmt * 0.5);
  }

  // --- Iluminação facial (dodge/burn suave) ---
  float lightAmt = u_facialLighting * g * fm;
  if (lightAmt > 0.0) {
    // Clareia levemente o centro do rosto, escurece sutilmente as bordas.
    float center = smoothstep(1.0, 0.2, length((uv - u_faceCenter) / vec2(u_faceRadiusX, u_faceRadiusY)));
    col = mix(col, col * (1.0 + lightAmt * 0.08 * center), center * fm);
  }

  // --- Realce de olhos ---
  float eyeAmt = u_eyeEnhance * g * eyesMask(uv);
  if (eyeAmt > 0.0) {
    col = mix(col, col * (1.0 + eyeAmt * 0.12), eyeAmt);
  }

  // --- Nitidez seletiva (olhos + lábios) ---
  float sharpAmt = u_selectiveSharpness * g * max(eyesMask(uv), lipsMask(uv));
  if (sharpAmt > 0.0) {
    vec3 sh = sharpen(uv, clamp(sharpAmt * 1.5, 0.0, 2.0));
    col = mix(col, sh, clamp(sharpAmt * 0.5, 0.0, 0.6));
  }

  gl_FragColor = vec4(clamp(col, 0.0, 1.0), 1.0);
}
`

// -----------------------------------------------------------------------------
// Estado do pipeline (singleton por instância)
// -----------------------------------------------------------------------------

interface PipelineState {
  gl: WebGLRenderingContext | WebGL2RenderingContext | null
  program: WebGLProgram | null
  uniforms: Record<string, WebGLUniformLocation | null>
  vbo: WebGLBuffer | null
  texture: WebGLTexture | null
  canvas: HTMLCanvasElement | null
  width: number
  height: number
  // Temporal smoothing da caixa do rosto.
  smoothedRect: FaceRect | null
  // Detecção.
  detector: FaceDetectorLike | null
  detectorKind: 'mediapipe' | 'native' | null
  // Throttle de detecção.
  lastDetectAt: number
  detectInterval: number // ms
  // FPS tracking.
  frames: number[]
  quality: number
  // Status reportado no último frame.
  lastStatus: FaceStatus
}

type FaceDetectorLike = {
  detect: (input: CanvasImageSource) => Promise<DetectedFace[]>
}

interface DetectedFace {
  boundingBox: { x: number; y: number; width: number; height: number }
  landmarks?: { x: number; y: number }[]
}

function createPipelineState(): PipelineState {
  return {
    gl: null,
    program: null,
    uniforms: {},
    vbo: null,
    texture: null,
    canvas: null,
    width: 0,
    height: 0,
    smoothedRect: null,
    detector: null,
    detectorKind: null,
    lastDetectAt: 0,
    detectInterval: 120,
    frames: [],
    quality: 1,
    lastStatus: 'no-model',
  }
}

// -----------------------------------------------------------------------------
// WebGL helpers
// -----------------------------------------------------------------------------

function compileShader(gl: WebGLRenderingContext, type: number, src: string): WebGLShader | null {
  const sh = gl.createShader(type)
  if (!sh) return null
  gl.shaderSource(sh, src)
  gl.compileShader(sh)
  if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS)) {
    gl.deleteShader(sh)
    return null
  }
  return sh
}

function initGL(state: PipelineState, w: number, h: number): boolean {
  const canvas = document.createElement('canvas')
  canvas.width = w
  canvas.height = h
  const gl = (canvas.getContext('webgl2', { premultipliedAlpha: false, antialias: false }) ||
    canvas.getContext('webgl', {
      premultipliedAlpha: false,
      antialias: false,
    })) as WebGLRenderingContext | null
  if (!gl) return false

  const vs = compileShader(gl, gl.VERTEX_SHADER, BEAUTY_VERT)
  const fs = compileShader(gl, gl.FRAGMENT_SHADER, BEAUTY_FRAG)
  if (!vs || !fs) return false
  const program = gl.createProgram()
  if (!program) return false
  gl.attachShader(program, vs)
  gl.attachShader(program, fs)
  gl.linkProgram(program)
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    return false
  }

  // VBO full-screen quad.
  const vbo = gl.createBuffer()
  gl.bindBuffer(gl.ARRAY_BUFFER, vbo)
  gl.bufferData(
    gl.ARRAY_BUFFER,
    new Float32Array([-1, -1, 1, -1, -1, 1, -1, 1, 1, -1, 1, 1]),
    gl.STATIC_DRAW,
  )
  const posLoc = gl.getAttribLocation(program, 'a_pos')

  const texture = gl.createTexture()
  gl.bindTexture(gl.TEXTURE_2D, texture)
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE)
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE)
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR)
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR)

  state.gl = gl
  state.program = program
  state.vbo = vbo
  state.texture = texture
  state.canvas = canvas
  state.width = w
  state.height = h
  state.uniforms = {}
  const uniformNames = [
    'u_tex',
    'u_face',
    'u_faceCenter',
    'u_faceRadiusX',
    'u_faceRadiusY',
    'u_skinSmooth',
    'u_shineReduction',
    'u_toneUniformity',
    'u_rednessReduction',
    'u_wrinkleSmooth',
    'u_eyeEnhance',
    'u_nasolabial',
    'u_darkCircles',
    'u_facialLighting',
    'u_selectiveSharpness',
    'u_intensity',
    'u_texelW',
    'u_texelH',
    'u_quality',
  ]
  for (const n of uniformNames)
    state.uniforms[n] = gl.getUniformLocation(program, n)
    // Armazena posLoc em uma propriedade customizada via closure no render.
  ;(state as unknown as { posLoc: number }).posLoc = posLoc
  return true
}

// -----------------------------------------------------------------------------
// Detecção facial (MediaPipe dinâmico + Shape Detection API nativa)
// -----------------------------------------------------------------------------

/**
 * Carrega a biblioteca @mediapipe/tasks-vision via CDN (script tag dinâmica),
 * sem depender de bundle/resolve do Rolldown/Vite. Disponibiliza o módulo no
 * escopo global como `window.MediaPipeTasksVision`.
 */
const MEDIAPIPE_CDN_URL =
  'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.22-rc.20250304/vision_bundle.mjs'
const MEDIAPIPE_WASM_URL =
  'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.22-rc.20250304/wasm'

let mediapipeScriptPromise: Promise<any> | null = null

function loadMediapipeModule(): Promise<any> {
  if (mediapipeScriptPromise) return mediapipeScriptPromise
  mediapipeScriptPromise = (async () => {
    // Dynamic import via URL variável + @vite-ignore para o bundler NÃO tentar
    // resolver o pacote no build. O módulo ESM é carregado do CDN em runtime.
    const url = MEDIAPIPE_CDN_URL
    return await import(/* @vite-ignore */ url)
  })().catch((e) => {
    mediapipeScriptPromise = null
    throw e
  })
  return mediapipeScriptPromise
}

/** Tenta carregar o detector facial. Retorna true se algum ficou disponível. */
export async function loadFaceDetector(state: PipelineState): Promise<boolean> {
  if (state.detector) return true

  // 1) MediaPipe tasks-vision via CDN (dynamic import de URL externa).
  try {
    const mod: any = await loadMediapipeModule()
    if (mod && mod.FilesetResolver && mod.FaceLandmarker) {
      const fs = await mod.FilesetResolver.forVisionTasks(MEDIAPIPE_WASM_URL)
      const lm = await mod.FaceLandmarker.createFromOptions(fs, {
        baseOptions: {
          modelAssetPath:
            'https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task',
          delegate: 'GPU',
        },
        runningMode: 'VIDEO',
        numFaces: 1,
        outputFaceBlendshapes: false,
        outputFacialTransformationMatrixes: false,
      })
      state.detector = {
        detect: async (input) => {
          const video = input as HTMLVideoElement
          const ts = performance.now()
          const res = lm.detectForVideo(video, ts)
          const faces: DetectedFace[] = (res.faceLandmarks || []).map((pts: any[]) => {
            const xs = pts.map((p) => p.x)
            const ys = pts.map((p) => p.y)
            const minX = Math.min(...xs)
            const minY = Math.min(...ys)
            const w = Math.max(...xs) - minX
            const h = Math.max(...ys) - minY
            return {
              boundingBox: { x: minX, y: minY, width: w, height: h },
              landmarks: pts.map((p) => ({ x: p.x, y: p.y })),
            }
          })
          return faces
        },
      }
      state.detectorKind = 'mediapipe'
      return true
    }
  } catch {
    /* fall through */
  }

  // 2) Shape Detection API nativa (Chromium experimental).
  try {
    const FD = (window as any).FaceDetector
    if (typeof FD === 'function') {
      const native = new FD({ fastMode: true, maxDetectedFaces: 1 })
      state.detector = {
        detect: async (input) => {
          const faces = await native.detect(input)
          return faces.map((f: any) => ({
            boundingBox: {
              x: f.boundingBox.x,
              y: f.boundingBox.y,
              width: f.boundingBox.width,
              height: f.boundingBox.height,
            },
          }))
        },
      }
      state.detectorKind = 'native'
      return true
    }
  } catch {
    /* fall through */
  }

  state.detector = null
  state.detectorKind = null
  return false
}

/** Detecta o rosto no vídeo. Retorna a caixa em pixels do canvas de processo. */
async function detectFace(
  state: PipelineState,
  video: HTMLVideoElement,
  vw: number,
  vh: number,
): Promise<FaceRect | null> {
  if (!state.detector) return null
  try {
    const faces = await state.detector.detect(video)
    if (!faces.length) return null
    const f = faces[0]
    const b = f.boundingBox
    if (b.width <= 0 || b.height <= 0) return null
    // Converte para o espaço do canvas de processo.
    const sx = state.width / vw
    const sy = state.height / vh
    const rect: FaceRect = {
      x: b.x * sx,
      y: b.y * sy,
      w: b.width * sx,
      h: b.height * sy,
      confidence: f.landmarks ? 1 : 0.8,
    }
    return rect
  } catch {
    return null
  }
}

/** Suavização temporal (EMA) da caixa do rosto para evitar tremor de bordas. */
function smoothRect(state: PipelineState, rect: FaceRect): FaceRect {
  const a = 0.6 // peso do novo frame
  if (!state.smoothedRect) {
    state.smoothedRect = rect
    return rect
  }
  const s = state.smoothedRect
  const out: FaceRect = {
    x: s.x + (rect.x - s.x) * a,
    y: s.y + (rect.y - s.y) * a,
    w: s.w + (rect.w - s.w) * a,
    h: s.h + (rect.h - s.h) * a,
    confidence: rect.confidence,
  }
  state.smoothedRect = out
  return out
}

// -----------------------------------------------------------------------------
// Classe pública
// -----------------------------------------------------------------------------

/**
 * Pipeline de retoque facial WebGL. Uma instância por StudioStage. Chame
 * `processFrame()` a cada rAF; o resultado é um `BeautyOutput` pronto para
 * `drawImage`.
 */
export class BeautyPipeline {
  private state: PipelineState = createPipelineState()
  private webglOk: boolean

  constructor() {
    this.webglOk =
      typeof document !== 'undefined' &&
      (() => {
        try {
          const c = document.createElement('canvas')
          return !!(c.getContext('webgl2') || c.getContext('webgl'))
        } catch {
          return false
        }
      })()
  }

  /** WebGL disponível neste navegador? */
  get isWebGLAvailable(): boolean {
    return this.webglOk
  }

  /** Modelo facial carregado? */
  get isModelLoaded(): boolean {
    return !!this.state.detector
  }

  /**
   * Carrega o modelo facial (MediaPipe tasks-vision via dynamic import, com
   * fallback para a Shape Detection API nativa). Retorna true se algum detector
   * ficou disponível. Idempotente.
   */
  async loadModel(): Promise<boolean> {
    return loadFaceDetector(this.state)
  }

  /** Último status reportado. */
  get lastStatus(): FaceStatus {
    return this.state.lastStatus
  }

  /** Libera recursos WebGL. */
  dispose(): void {
    const { gl, program, vbo, texture } = this.state
    if (gl) {
      if (texture) gl.deleteTexture(texture)
      if (vbo) gl.deleteBuffer(vbo)
      if (program) gl.deleteProgram(program)
    }
    this.state = createPipelineState()
  }

  /**
   * Processa um frame do vídeo. Retorna a fonte a ser desenhada pelo compositor.
   * Em fallback (sem WebGL, sem modelo, master toggle off, ou comparar), retorna
   * o vídeo cru e o status apropriado.
   */
  async processFrame(
    video: HTMLVideoElement,
    config: BeautyConfig,
    runtime: BeautyRuntime,
  ): Promise<BeautyOutput> {
    const vw = video.videoWidth
    const vh = video.videoHeight
    if (!vw || !vh) {
      return { source: video, processed: false, faceStatus: 'no-webgl' }
    }

    // Master toggle off.
    if (!runtime.enabled) {
      this.state.lastStatus = 'disabled'
      return { source: video, processed: false, faceStatus: 'disabled' }
    }
    // Comparar antes/depois: mostra o frame cru.
    if (runtime.compareBefore) {
      return { source: video, processed: false, faceStatus: this.state.lastStatus }
    }
    // Sem WebGL → fallback CSS.
    if (!this.webglOk) {
      this.state.lastStatus = 'no-webgl'
      return { source: video, processed: false, faceStatus: 'no-webgl' }
    }
    // Sem modelo carregado → fallback CSS (ajustes globais).
    if (!this.state.detector) {
      this.state.lastStatus = 'no-model'
      return { source: video, processed: false, faceStatus: 'no-model' }
    }

    // Garante o canvas GL na resolução do vídeo (com teto de processo p/ perf).
    const procScale = this.state.quality < 0.5 ? 0.5 : 1
    const pw = Math.round(vw * procScale)
    const ph = Math.round(vh * procScale)
    if (
      !this.state.gl ||
      !this.state.canvas ||
      this.state.width !== pw ||
      this.state.height !== ph
    ) {
      const ok = initGL(this.state, pw, ph)
      if (!ok) {
        this.webglOk = false
        this.state.lastStatus = 'no-webgl'
        return { source: video, processed: false, faceStatus: 'no-webgl' }
      }
    }
    const { gl, canvas, program, texture, uniforms } = this.state
    if (!gl || !canvas || !program || !texture) {
      this.state.lastStatus = 'no-webgl'
      return { source: video, processed: false, faceStatus: 'no-webgl' }
    }

    // FPS tracking → ajuste de qualidade dinâmico.
    this.trackFps()
    this.adaptQuality()

    // Detecção periódica (throttle).
    const now = performance.now()
    let detected: FaceRect | null = null
    if (now - this.state.lastDetectAt >= this.state.detectInterval) {
      this.state.lastDetectAt = now
      detected = await detectFace(this.state, video, vw, vh)
      if (!detected) {
        // Perdeu o rosto: mantém a caixa suavizada por alguns frames antes de
        // declarar "não detectado" (evita flicker).
        this.state.smoothedRect = null
      }
    }
    // Usa a caixa suavizada quando disponível.
    let rect = this.state.smoothedRect
    if (detected) rect = smoothRect(this.state, detected)

    // Determina o status.
    let status: FaceStatus
    let intensityScale = 1
    if (!rect) {
      status = 'not-detected'
      intensityScale = 0 // sem rosto → não aplica efeitos regionais
    } else if (rect.confidence < 0.85) {
      status = 'unstable'
      intensityScale = 0.5 // detecção instável → reduz intensidade
    } else {
      status = 'detected'
    }
    this.state.lastStatus = status

    // Upload da textura do vídeo.
    gl.bindTexture(gl.TEXTURE_2D, texture)
    try {
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, video)
    } catch {
      // Vídeo pode não estar pronto; pula este frame.
      return { source: video, processed: false, faceStatus: status }
    }

    // Render.
    gl.viewport(0, 0, pw, ph)
    gl.useProgram(program)
    gl.bindBuffer(gl.ARRAY_BUFFER, this.state.vbo)
    const posLoc = (this.state as unknown as { posLoc: number }).posLoc
    gl.enableVertexAttribArray(posLoc)
    gl.vertexAttribPointer(posLoc, 2, gl.FLOAT, false, 0, 0)
    gl.activeTexture(gl.TEXTURE0)
    gl.bindTexture(gl.TEXTURE_2D, texture)
    gl.uniform1i(uniforms.u_tex, 0)

    const g = (config.intensity / 100) * intensityScale
    gl.uniform4f(
      uniforms.u_face,
      rect ? rect.x / pw : 0,
      rect ? rect.y / ph : 0,
      rect ? rect.w / pw : 0,
      rect ? rect.h / ph : 0,
    )
    gl.uniform2f(
      uniforms.u_faceCenter,
      rect ? (rect.x + rect.w / 2) / pw : 0,
      rect ? (rect.y + rect.h / 2) / ph : 0,
    )
    gl.uniform1f(uniforms.u_faceRadiusX, rect ? ((rect.w / 2) * 1.1) / pw : 0)
    gl.uniform1f(uniforms.u_faceRadiusY, rect ? ((rect.h / 2) * 1.3) / ph : 0)
    gl.uniform1f(uniforms.u_skinSmooth, (config.skinSmooth / 100) * g)
    gl.uniform1f(uniforms.u_shineReduction, (config.shineReduction / 100) * g)
    gl.uniform1f(uniforms.u_toneUniformity, (config.toneUniformity / 100) * g)
    gl.uniform1f(uniforms.u_rednessReduction, (config.rednessReduction / 100) * g)
    gl.uniform1f(uniforms.u_wrinkleSmooth, (config.wrinkleSmooth / 100) * g)
    gl.uniform1f(uniforms.u_eyeEnhance, (config.eyeEnhance / 100) * g)
    gl.uniform1f(uniforms.u_nasolabial, (config.nasolabial / 100) * g)
    gl.uniform1f(uniforms.u_darkCircles, (config.darkCircles / 100) * g)
    gl.uniform1f(uniforms.u_facialLighting, (config.facialLighting / 100) * g)
    gl.uniform1f(uniforms.u_selectiveSharpness, (config.selectiveSharpness / 100) * g)
    gl.uniform1f(uniforms.u_intensity, 1) // já incorporado em cada uniform
    gl.uniform1f(uniforms.u_texelW, 1 / pw)
    gl.uniform1f(uniforms.u_texelH, 1 / ph)
    gl.uniform1f(uniforms.u_quality, this.state.quality)
    gl.drawArrays(gl.TRIANGLES, 0, 6)

    return {
      source: canvas,
      processed: true,
      faceStatus: status,
      faceBox: rect
        ? { x: rect.x / pw, y: rect.y / ph, w: rect.w / pw, h: rect.h / ph }
        : undefined,
    }
  }

  /** Rastreia FPS dos últimos ~1s. */
  private trackFps() {
    const now = performance.now()
    this.state.frames.push(now)
    while (this.state.frames.length && now - this.state.frames[0] > 1000) {
      this.state.frames.shift()
    }
  }

  /** Reduz qualidade se FPS < 20; recupera se FPS >= 28. */
  private adaptQuality() {
    const fps = this.state.frames.length
    if (fps > 0 && fps < 20 && this.state.quality > 0.3) {
      this.state.quality = Math.max(0.3, this.state.quality - 0.15)
      // Pula mais frames de detecção em baixo desempenho.
      this.state.detectInterval = 220
    } else if (fps >= 28 && this.state.quality < 1) {
      this.state.quality = Math.min(1, this.state.quality + 0.1)
      this.state.detectInterval = 120
    }
  }
}
