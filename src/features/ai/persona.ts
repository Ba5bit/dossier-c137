import type { Persona } from '../../shared/api/types'

export const PERSONA_NAMES: Record<Persona, string> = {
  rick: 'RICK C-137',
  morty: 'MORTY SMITH',
}

export const PERSONA_GREETINGS: Record<Persona, string> = {
  rick: 'Ask something. Preferably something the archive actually knows.',
  morty: 'Aw jeez, okay — I-I can look stuff up in the archive. Ask me something?',
}

export const PERSONA_BUTTON: Record<Persona, string> = {
  rick: 'ASK RICK',
  morty: 'ASK MORTY',
}
