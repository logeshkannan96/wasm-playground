// ─── Main → Worker ───────────────────────────────────────────────────────────

export interface InitMessage {
  type: 'INIT'
  interruptSab: SharedArrayBuffer // Uint8[0]: 0=none, 2=KeyboardInterrupt
}

export interface RunMessage {
  type: 'RUN'
  code: string
  stdin?: string   // pre-filled stdin for Ruby/Lua
}

export interface CancelMessage {
  type: 'CANCEL'
}

export interface InputResponseMessage {
  type: 'INPUT_RESPONSE'
  value: string
}

export type MainToWorker = InitMessage | RunMessage | CancelMessage | InputResponseMessage

// ─── Worker → Main ───────────────────────────────────────────────────────────

export interface ReadyMessage {
  type: 'READY'
}

export interface StdoutMessage {
  type: 'STDOUT'
  text: string
}

export interface StderrMessage {
  type: 'STDERR'
  text: string
}

export interface InputRequestMessage {
  type: 'INPUT_REQUEST'
  prompt: string
}

export interface DoneMessage {
  type: 'DONE'
  durationMs: number
}

export interface ErrorMessage {
  type: 'ERROR'
  text: string
}

export interface LoadingMessage {
  type: 'LOADING'
  text: string
}

export interface SystemMessage {
  type: 'SYSTEM'
  text: string
}

export type WorkerToMain =
  | ReadyMessage
  | StdoutMessage
  | StderrMessage
  | SystemMessage
  | InputRequestMessage
  | DoneMessage
  | ErrorMessage
  | LoadingMessage
