/**
 * PROMPT 6 — Testes da lógica pura de controles profissionais de câmera.
 * Cobrem: parsing de capacidades, resoluções/FPS suportados, construção de
 * constraints (applyConstraints), zoom digital (crop), presets, restauração
 * e tratamento de erro de permissão negada.
 */
import { describe, it, expect } from 'vitest'
import {
  parseCapabilities,
  supportedResolutions,
  supportedFrameRates,
  aspectLabel,
  buildTrackConstraints,
  isControlSupported,
  resolutionById,
  CAMERA_PRO_PRESETS,
  getPreset,
  detectActivePreset,
  DEFAULT_CAMERA_PRO_VALUES,
  clampZoom,
  clampPan,
  makeCrop,
  centerCropOnPoint,
  restoreCrop,
  cameraErrorMessage,
  RESOLUTION_OPTIONS,
  FPS_OPTIONS,
  DIGITAL_ZOOM_MIN,
  DIGITAL_ZOOM_MAX,
  type CameraCapabilities,
  type CameraHardwareSettings,
} from './camera-controls'

const FULL_CAPS: CameraCapabilities = {
  width: { min: 320, max: 3840 },
  height: { min: 240, max: 2160 },
  frameRate: { min: 10, max: 60 },
  zoom: { min: 100, max: 400, step: 10 },
  exposureMode: ['continuous', 'manual'],
  exposureCompensation: { min: -3, max: 3, step: 0.1 },
  focusMode: ['continuous', 'manual'],
  focusDistance: { min: 0, max: 10, step: 0.1 },
  whiteBalanceMode: ['continuous', 'manual'],
  colorTemperature: { min: 2800, max: 6500, step: 50 },
  brightness: { min: 0, max: 255, step: 1 },
  contrast: { min: 0, max: 255, step: 1 },
  saturation: { min: 0, max: 255, step: 1 },
  sharpness: { min: 0, max: 255, step: 1 },
}

describe('parseCapabilities', () => {
  it('retorna capacidades vazias para input nulo/indefinido', () => {
    expect(parseCapabilities(null).height).toBeNull()
    expect(parseCapabilities(undefined).frameRate).toBeNull()
  })

  it('normaliza ranges e arrays de modos', () => {
    const caps = parseCapabilities({
      width: { min: 320, max: 1920 },
      height: { min: 240, max: 1080 },
      frameRate: { min: 10, max: 30 },
      exposureMode: ['continuous', 'manual'],
      zoom: { min: 100, max: 400, step: 10 },
    })
    expect(caps.width).toEqual({ min: 320, max: 1920 })
    expect(caps.exposureMode).toEqual(['continuous', 'manual'])
    expect(caps.zoom).toEqual({ min: 100, max: 400, step: 10 })
  })

  it('descarta ranges inválidos (max <= 0)', () => {
    const caps = parseCapabilities({ height: { min: 0, max: 0 }, brightness: { max: 0 } })
    expect(caps.height).toBeNull()
    expect(caps.brightness).toBeNull()
  })
})

describe('supportedResolutions / supportedFrameRates', () => {
  it('mostra 4K apenas quando o hardware entrega 2160p de altura', () => {
    expect(supportedResolutions(FULL_CAPS).map((r) => r.id)).toEqual([
      '720p',
      '1080p',
      '1440p',
      '4k',
    ])
  })

  it('oculta 4K e 1440p para uma webcam 1080p', () => {
    const caps: CameraCapabilities = { ...FULL_CAPS, height: { min: 240, max: 1080 } }
    expect(supportedResolutions(caps).map((r) => r.id)).toEqual(['720p', '1080p'])
  })

  it('mostra 60 FPS apenas quando o hardware entrega >= 60', () => {
    expect(supportedFrameRates(FULL_CAPS)).toEqual([24, 30, 60])
    const caps: CameraCapabilities = { ...FULL_CAPS, frameRate: { min: 10, max: 30 } }
    expect(supportedFrameRates(caps)).toEqual([24, 30])
  })

  it('não promete resolução inexistente: 720p-only device', () => {
    const caps: CameraCapabilities = { ...FULL_CAPS, height: { min: 240, max: 720 } }
    expect(supportedResolutions(caps).map((r) => r.id)).toEqual(['720p'])
  })
})

describe('aspectLabel', () => {
  it('computa proporção 16:9', () => {
    expect(aspectLabel(1920, 1080)).toBe('16:9')
  })
  it('computa proporção 4:3', () => {
    expect(aspectLabel(640, 480)).toBe('4:3')
  })
  it('retorna — para zeros', () => {
    expect(aspectLabel(0, 0)).toBe('—')
  })
})

describe('buildTrackConstraints', () => {
  it('inclui resolução e FPS quando suportados', () => {
    const settings: CameraHardwareSettings = { resolutionId: '1080p', frameRate: 30 }
    const c = buildTrackConstraints(settings, FULL_CAPS)
    expect(c.width).toEqual({ ideal: 1920 })
    expect(c.height).toEqual({ ideal: 1080 })
    expect(c.frameRate).toEqual({ ideal: 30 })
  })

  it('OMITE resolução não suportada (não promete aumento inexistente)', () => {
    const caps: CameraCapabilities = { ...FULL_CAPS, height: { min: 240, max: 1080 } }
    const settings: CameraHardwareSettings = { resolutionId: '4k', frameRate: 'auto' }
    const c = buildTrackConstraints(settings, caps)
    expect(c.width).toBeUndefined()
    expect(c.height).toBeUndefined()
  })

  it('OMITE FPS não suportado', () => {
    const caps: CameraCapabilities = { ...FULL_CAPS, frameRate: { min: 10, max: 30 } }
    const settings: CameraHardwareSettings = { resolutionId: 'auto', frameRate: 60 }
    const c = buildTrackConstraints(settings, caps)
    expect(c.frameRate).toBeUndefined()
  })

  it('inclui controles manuais (exposição, foco, WB) quando suportados', () => {
    const settings: CameraHardwareSettings = {
      resolutionId: 'auto',
      frameRate: 'auto',
      exposureMode: 'manual',
      focusMode: 'manual',
      focusDistance: 2.5,
      whiteBalanceMode: 'manual',
      colorTemperature: 4200,
      brightness: 128,
      contrast: 128,
      saturation: 128,
      sharpness: 128,
    }
    const c = buildTrackConstraints(settings, FULL_CAPS)
    expect(c.exposureMode).toBe('manual')
    expect(c.focusMode).toBe('manual')
    expect(c.focusDistance).toBe(2.5)
    expect(c.whiteBalanceMode).toBe('manual')
    expect(c.colorTemperature).toBe(4200)
    expect(c.brightness).toBe(128)
    expect(c.contrast).toBe(128)
    expect(c.saturation).toBe(128)
    expect(c.sharpness).toBe(128)
  })

  it('OMITE controles fora do intervalo suportado', () => {
    const settings: CameraHardwareSettings = {
      resolutionId: 'auto',
      frameRate: 'auto',
      exposureCompensation: 999, // fora do range [-3, 3]
      colorTemperature: 99999, // fora do range
    }
    const c = buildTrackConstraints(settings, FULL_CAPS)
    expect(c.exposureCompensation).toBeUndefined()
    expect(c.colorTemperature).toBeUndefined()
  })

  it('produz constraints vazias para dispositivo sem capacidades', () => {
    const c = buildTrackConstraints(
      { resolutionId: '1080p', frameRate: 30 },
      parseCapabilities(null),
    )
    expect(Object.keys(c).length).toBe(0)
  })
})

describe('isControlSupported', () => {
  it('detecta suporte para cada controle', () => {
    expect(isControlSupported(FULL_CAPS, 'exposureMode')).toBe(true)
    expect(isControlSupported(FULL_CAPS, 'zoom')).toBe(true)
    expect(isControlSupported(FULL_CAPS, 'sharpness')).toBe(true)
  })
  it('retorna false para controle ausente', () => {
    const caps = parseCapabilities({ brightness: { min: 0, max: 255 } })
    expect(isControlSupported(caps, 'sharpness')).toBe(false)
    expect(isControlSupported(caps, 'brightness')).toBe(true)
  })
})

describe('resolutionById', () => {
  it('resolve ResolutionOption pelo id', () => {
    expect(resolutionById('1080p')?.height).toBe(1080)
    expect(resolutionById('4k')?.width).toBe(3840)
  })
  it('retorna null para auto', () => {
    expect(resolutionById('auto')).toBeNull()
  })
})

describe('Presets de câmera profissionais', () => {
  it('tem 9 presets incluindo personalizado', () => {
    expect(CAMERA_PRO_PRESETS).toHaveLength(9)
    expect(CAMERA_PRO_PRESETS.map((p) => p.id)).toContain('personalizado')
  })

  it('cada preset tem label e descrição', () => {
    for (const p of CAMERA_PRO_PRESETS) {
      expect(p.label.length).toBeGreaterThan(0)
      expect(p.description.length).toBeGreaterThan(0)
    }
  })

  it('getPreset retorna o preset correto (fallback natural)', () => {
    expect(getPreset('estudio').id).toBe('estudio')
    expect(getPreset('inexistente' as any).id).toBe('natural')
  })

  it('Luz Baixa aumenta brilho e reduz nitidez', () => {
    const p = getPreset('luz-baixa')
    expect(p.brightness).toBeGreaterThan(DEFAULT_CAMERA_PRO_VALUES.brightness)
    expect(p.sharpness).toBeLessThanOrEqual(DEFAULT_CAMERA_PRO_VALUES.sharpness)
  })

  it('Alto Contraste tem contraste máximo entre os presets', () => {
    const max = Math.max(...CAMERA_PRO_PRESETS.map((p) => p.contrast))
    expect(getPreset('alto-contraste').contrast).toBe(max)
  })

  it('detectActivePreset identifica o preset ativo pelos valores', () => {
    expect(detectActivePreset(getPreset('natural'))).toBe('natural')
    expect(detectActivePreset(getPreset('estudio'))).toBe('estudio')
  })

  it('detectActivePreset retorna personalizado para valores custom', () => {
    expect(detectActivePreset({ ...DEFAULT_CAMERA_PRO_VALUES, brightness: 123 })).toBe(
      'personalizado',
    )
  })
})

describe('Zoom digital (crop + scale)', () => {
  it('clampZoom limita entre 1x e 4x', () => {
    expect(clampZoom(0.5)).toBe(DIGITAL_ZOOM_MIN)
    expect(clampZoom(10)).toBe(DIGITAL_ZOOM_MAX)
    expect(clampZoom(2.5)).toBe(2.5)
  })

  it('clampPan limita entre -1 e 1', () => {
    expect(clampPan(-2)).toBe(-1)
    expect(clampPan(2)).toBe(1)
    expect(clampPan(0.3)).toBeCloseTo(0.3)
  })

  it('makeCrop produz CameraCrop válido', () => {
    const crop = makeCrop(2, 0.5, -0.5, true)
    expect(crop).toEqual({ zoom: 2, panX: 0.5, panY: -0.5, mirror: true })
  })

  it('centerCropOnPoint centraliza o rosto no recorte', () => {
    // Rosto no centro → pan 0
    const c = centerCropOnPoint(2, 0.5, 0.5, false)
    expect(c.panX).toBe(0)
    expect(c.panY).toBe(0)
    // Rosto à direita (faceX=1) → panX negativo (recorte move para esquerda)
    const c2 = centerCropOnPoint(2, 1, 0.5, false)
    expect(c2.panX).toBeLessThan(0)
  })

  it('restoreCrop volta para 1x, centro', () => {
    const crop = restoreCrop(true)
    expect(crop.zoom).toBe(1)
    expect(crop.panX).toBe(0)
    expect(crop.panY).toBe(0)
    expect(crop.mirror).toBe(true)
  })
})

describe('cameraErrorMessage', () => {
  it('mapeia NotAllowedError para permissão negada', () => {
    const r = cameraErrorMessage({ name: 'NotAllowedError' })
    expect(r.kind).toBe('denied')
    expect(r.message).toContain('configurações')
  })

  it('mapeia NotReadableError para dispositivo ocupado', () => {
    const r = cameraErrorMessage({ name: 'NotReadableError' })
    expect(r.kind).toBe('busy')
    expect(r.message).toContain('uso')
  })

  it('mapeia NotFoundError para sem câmera', () => {
    const r = cameraErrorMessage({ name: 'NotFoundError' })
    expect(r.kind).toBe('notfound')
  })

  it('mapeia OverconstrainedError', () => {
    const r = cameraErrorMessage({ name: 'OverconstrainedError' })
    expect(r.kind).toBe('overconstrained')
  })

  it('fallback desconhecido usa a mensagem do erro', () => {
    const r = cameraErrorMessage({ name: 'X', message: 'falha estranha' })
    expect(r.kind).toBe('unknown')
    expect(r.message).toBe('falha estranha')
  })
})

describe('Constantes exportadas', () => {
  it('RESOLUTION_OPTIONS contém 720p/1080p/1440p/4k', () => {
    expect(RESOLUTION_OPTIONS.map((r) => r.id)).toEqual(['720p', '1080p', '1440p', '4k'])
  })
  it('FPS_OPTIONS contém 24/30/60', () => {
    expect(FPS_OPTIONS).toEqual([24, 30, 60])
  })
})
