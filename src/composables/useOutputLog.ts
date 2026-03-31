import { ref } from 'vue'

export type OutputKind = 'stdout' | 'stderr' | 'system'

export interface OutputSegment {
  id: number
  kind: OutputKind
  text: string
}

let segmentId = 0

export function useOutputLog() {
  const segments = ref<OutputSegment[]>([])

  function append(kind: OutputKind, text: string) {
    // Coalesce consecutive segments of the same kind for efficiency
    const last = segments.value[segments.value.length - 1]
    if (last && last.kind === kind) {
      last.text += text
    } else {
      segments.value.push({ id: segmentId++, kind, text })
    }
  }

  function clear() {
    segments.value = []
  }

  return { segments, append, clear }
}
