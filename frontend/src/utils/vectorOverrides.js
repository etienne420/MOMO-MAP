const STORAGE_KEY = 'momo-map.vector-overrides'

export function loadVectorOverrides() {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (!raw) return { roomOverrides: {}, pinOverrides: {} }
    const parsed = JSON.parse(raw)
    return {
      roomOverrides:
        parsed?.roomOverrides && typeof parsed.roomOverrides === 'object'
          ? parsed.roomOverrides
          : {},
      pinOverrides:
        parsed?.pinOverrides && typeof parsed.pinOverrides === 'object'
          ? parsed.pinOverrides
          : {},
    }
  } catch {
    return { roomOverrides: {}, pinOverrides: {} }
  }
}

export function saveVectorOverrides(overrides) {
  try {
    window.localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        roomOverrides: overrides?.roomOverrides || {},
        pinOverrides: overrides?.pinOverrides || {},
      }),
    )
  } catch {
    // ignore storage errors
  }
}
