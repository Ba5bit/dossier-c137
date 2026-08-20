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
    previousText: '← PREV',
    nextText: 'NEXT →',
    position: (page: number, pageCount: number) => `DIMENSION ${page} / ${pageCount}`,
  },
  refresh: {
    label: 'Refreshing',
  },
  search: {
    label: 'SEARCH THE ARCHIVE',
    hubLabel: 'ARCHIVE COORDINATES',
    // FINDING-009: a placeholder disappears the moment the visitor types, so
    // the prompt it carried has to be printed somewhere that stays.
    visibleLabel: 'ARCHIVE COORDINATES',
    placeholder: 'ENTER COORDINATES OR ASK A QUESTION',
    ask: 'ASK ▸',
    tooShort: 'Two characters minimum. The archive is big, not psychic.',
    nothing: 'Nothing on file. Try a different dimension.',
    hint: '↑ ↓ TO AIM · ENTER TO FIRE · ESC TO ABORT',
    overlayTitle: 'SEARCH THE ARCHIVE',
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
      rick: 'Ask me anything about the show. Try to make it interesting.',
      morty: 'Aw jeez, okay — I-I know the show pretty well, I guess. Ask me something?',
    },
    voiceLabel: 'AI voice',
    you: 'YOU',
    openersLabel: 'TRY ASKING',
    clear: 'WIPE LOG',
    askAbout: 'ASK AI ABOUT THIS',
    focusLabel: 'QUESTIONS ARE ABOUT',
    focusHint: 'Its full record — relations included — goes in with every question. Ask elsewhere for anything else.',
    nextLabel: 'ASK NEXT',
    // Openers that need an opinion, not a lookup — the first answer a visitor
    // sees should show the guide can actually talk about the show.
    openers: [
      'What makes Evil Morty so compelling?',
      'Why did Birdperson matter to Rick?',
      'What is the point of the Citadel?',
      'Is Rick actually the smartest man alive?',
    ],
    inputLabel: 'Ask a question',
    visibleInputLabel: 'YOUR QUESTION',
    inputPlaceholder: 'ASK ABOUT ANYONE IN THE SHOW',
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
    // ASK is not in this list any more. It is the one section that answers
    // back, so it sits beside the search box as its own emphasised control
    // rather than as the fourth entry in a row of registries.
    sections: [
      { to: '/characters', label: 'CHARACTERS' },
      { to: '/locations', label: 'LOCATIONS' },
      { to: '/episodes', label: 'EPISODES' },
    ],
    searchButton: 'SEARCH THE ARCHIVE',
    // A phone header carries three controls; the long form truncates there.
    searchButtonShort: 'SEARCH',
    searchButtonLabel: 'Search',
    // The hotkey is Cmd on a Mac and Ctrl everywhere else; printing the Mac
    // glyph to a Windows visitor is a symbol they have no key for.
    searchHint: 'CTRL K',
    searchHintApple: '⌘ K',
    askButton: 'ASK AI',
    askButtonLabel: 'Ask the archive',
    gunButton: '◎ PORTAL',
    gunButtonLabel: 'Portal settings',
    back: '← BACK',
    backLabel: 'Go back',
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
    // Locations and episodes are not repeated here: the destination cards
    // above already carry those two counts, and showing them twice on one
    // screen reads as a contradiction rather than a summary.
    figures: ['ENTITIES INDEXED', 'RICKS ON FILE', 'MORTYS ON FILE'],
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
  // FINDING-007: every other label on the site is uppercase mono, and these
  // used to be sentence-case sans. One type system, and it is the mono one.
  filters: {
    name: 'SEARCH BY NAME',
    namePlaceholder: 'ENTER DESIGNATION',
    titlePlaceholder: 'ENTER TITLE',
    species: 'SPECIES',
    status: 'STATUS',
    gender: 'GENDER',
    type: 'TYPE',
    dimension: 'DIMENSION',
    code: 'EPISODE CODE',
    codePlaceholder: 'S01E01',
    season: 'SEASON',
    seasonAll: 'ALL',
    any: 'ANY',
    clear: 'CLEAR',
  },
  carousel: {
    previous: 'Previous',
    next: 'Next',
    position: (page: number, pageCount: number) => `${page} / ${pageCount}`,
  },
  redaction: {
    redacted: 'REDACTED',
    notOnFile: 'NOT ON FILE',
  },
} as const
