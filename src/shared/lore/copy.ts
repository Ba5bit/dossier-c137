/** Seven pages print this; it is defined once and referenced from both keys. */
const CLEARANCE_STAMP = 'DOSSIER C-137 // CLEARANCE: UNRESTRICTED'

/**
 * Every user-facing string in the app. Spec section 7.3: the voice here is
 * strong and specific, and keeping it consistent is only possible with the
 * text collected in one place.
 *
 * `quotes.ts` is the one exception — portal quotes are a data set that gets
 * sampled at random, not microcopy a component renders by name.
 */
export const COPY = {
  clearanceStamp: CLEARANCE_STAMP,
  states: {
    emptyTitle: 'NO RECORDS FOUND',
    emptyMessage: 'Oooh, nothing here! Existence is pain!',
    errorTitle: 'REGISTRY UNREACHABLE',
    errorMessage: 'The portal fluid is out. Blame Jerry.',
    errorRetry: 'RETRY',
    notFoundLabel: 'ERROR // DIMENSION NOT FOUND',
    notFoundHeading: "This dimension doesn't exist.",
    notFoundBody: "Try one where you're less of an idiot.",
    notFoundAction: 'RETURN TO ARCHIVE',
  },
  pagination: {
    label: 'Pagination',
    previous: 'Previous page',
    next: 'Next page',
    previousText: '← JUMP',
    nextText: 'JUMP →',
    position: (page: number, pageCount: number) => `DIMENSION ${page} / ${pageCount}`,
  },
  refresh: {
    label: 'Refreshing',
  },
  search: {
    label: 'Search the archive',
    hubLabel: 'Archive coordinates',
    placeholder: 'ENTER COORDINATES OR ASK A QUESTION',
    ask: 'ASK ▸',
    tooShort: 'Two characters minimum. The archive is big, not psychic.',
    nothing: 'Nothing on file. Try a different dimension.',
    hint: '↑ ↓ TO AIM · ENTER TO FIRE · ESC TO ABORT',
    overlayLabel: 'Search the archive',
    pageLabel: 'ARCHIVE SEARCH',
    pageEmpty: 'Enter coordinates above. Two characters minimum.',
    groupCharacters: 'CHARACTERS',
    groupLocations: 'LOCATIONS',
    groupEpisodes: 'EPISODES',
    onFile: (total: number) => `${total} ON FILE`,
    allOf: (total: number, title: string) => `ALL ${total} ${title} →`,
  },
  ai: {
    personaNames: {
      rick: 'RICK C-137',
      morty: 'MORTY SMITH',
    },
    greetings: {
      rick: 'Ask something. Preferably something the archive actually knows.',
      morty: 'Aw jeez, okay — I-I can look stuff up in the archive. Ask me something?',
    },
    voiceLabel: 'AI voice',
    you: 'YOU',
    inputLabel: 'Ask a question',
    inputPlaceholder: 'ASK ABOUT ANYTHING ON FILE',
    send: 'SEND ▸',
    groundedIn: 'GROUNDED IN',
    dossierTitle: 'FIELD ASSESSMENT',
    dossierGenerate: 'GENERATE DOSSIER',
    dossierRetry: 'TRY AGAIN',
    dossierFailed: 'The dossier never arrived. The archive is not saying why.',
  },
  layout: {
    brand: 'DOSSIER C-137',
    navLabel: 'Sections',
    sections: [
      { to: '/characters', label: 'CHARACTERS' },
      { to: '/locations', label: 'LOCATIONS' },
      { to: '/episodes', label: 'EPISODES' },
      { to: '/ask', label: 'ASK' },
    ],
    searchButton: '⌕ SEARCH',
    searchButtonLabel: 'Search',
    gunButton: '◎ GUN',
    gunButtonLabel: 'Portal gun',
  },
  hub: {
    stamp: CLEARANCE_STAMP,
    heading: 'DOSSIER C-137',
    tagline:
      "The Citadel's archive. Everything on file, nothing you're cleared to question.",
    destinations: [
      { to: '/characters', label: 'CHARACTERS', key: 'characters' },
      { to: '/locations', label: 'LOCATIONS', key: 'locations' },
      { to: '/episodes', label: 'EPISODES', key: 'episodes' },
    ],
    figures: [
      'ENTITIES INDEXED',
      'LOCATIONS ON FILE',
      'EPISODES LOGGED',
      'RICKS ON FILE',
      'MORTYS ON FILE',
    ],
  },
  sections: {
    charactersHeading: 'Characters',
    locationsHeading: 'Locations',
    episodesHeading: 'Episodes',
  },
  ask: {
    stamp: 'ARCHIVE INTERROGATION TERMINAL',
    heading: 'ASK THE ARCHIVE',
    tagline:
      'Answers come from the records only. Whoever is answering will tell you when there are none — in their own way.',
  },
  filters: {
    name: 'Search by name',
    namePlaceholder: 'ENTER DESIGNATION',
    titlePlaceholder: 'ENTER TITLE',
    species: 'Species',
    status: 'Status',
    gender: 'Gender',
    type: 'Type',
    dimension: 'Dimension',
    code: 'Season or episode code',
    codePlaceholder: 'S01 OR S01E01',
    any: 'ANY',
    clear: 'CLEAR',
  },
} as const
