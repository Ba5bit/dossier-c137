import { http, HttpResponse } from 'msw'
import { setupServer } from 'msw/node'

const BASE = 'https://api.test/api'

function character(id: number, name: string, status = 'Alive') {
  return {
    id,
    name,
    status,
    species: 'Human',
    type: '',
    gender: 'Male',
    image: `https://example.test/${id}.jpeg`,
    origin: { name: 'Earth (C-137)', id: 1 },
    location: { name: 'Citadel of Ricks', id: 3 },
    episodeCount: 51,
  }
}

function summary(id: number, name: string) {
  return { id, name, status: 'Alive', image: `https://example.test/${id}.jpeg` }
}

export const handlers = [
  http.get(`${BASE}/characters`, ({ request }) => {
    const url = new URL(request.url)
    const page = Number(url.searchParams.get('page') ?? '1')
    const status = url.searchParams.get('status')

    if (status === 'dead') {
      return HttpResponse.json({
        items: [],
        pagination: { page: 1, pageCount: 0, total: 0, pageSize: 20 },
      })
    }

    return HttpResponse.json({
      items: [character(page, `Character Page ${page}`)],
      pagination: { page, pageCount: 42, total: 826, pageSize: 20 },
    })
  }),

  http.get(`${BASE}/characters/:id`, ({ params }) => {
    const id = Number(params.id)

    if (id === 99999) {
      return HttpResponse.json(
        { error: { code: 'NOT_FOUND', message: 'No such character' } },
        { status: 404 },
      )
    }

    return HttpResponse.json({
      character: character(id, 'Rick Sanchez'),
      origin: { id: 1, name: 'Earth (C-137)', resolved: true },
      location: { id: 3, name: 'Citadel of Ricks', resolved: true },
      episodes: [{ id: 1, name: 'Pilot', episode: 'S01E01' }],
    })
  }),

  http.get(`${BASE}/locations`, ({ request }) => {
    const url = new URL(request.url)
    const page = Number(url.searchParams.get('page') ?? '1')

    if (url.searchParams.get('dimension') === 'nowhere') {
      return HttpResponse.json({
        items: [],
        pagination: { page: 1, pageCount: 0, total: 0, pageSize: 20 },
      })
    }

    return HttpResponse.json({
      items: [
        {
          id: page,
          name: `Location Page ${page}`,
          type: 'Planet',
          dimension: 'Dimension C-137',
          residentCount: 27,
        },
      ],
      pagination: { page, pageCount: 7, total: 126, pageSize: 20 },
    })
  }),

  http.get(`${BASE}/locations/:id`, ({ params }) =>
    HttpResponse.json({
      location: {
        id: Number(params.id),
        name: 'Earth (C-137)',
        type: 'Planet',
        dimension: 'Dimension C-137',
        residentCount: 2,
      },
      residents: [summary(38, 'Beth Smith'), summary(45, 'Bruce Chutback')],
    }),
  ),

  http.get(`${BASE}/episodes`, ({ request }) => {
    const url = new URL(request.url)
    const page = Number(url.searchParams.get('page') ?? '1')

    return HttpResponse.json({
      items: [
        {
          id: page,
          name: `Episode Page ${page}`,
          airDate: 'December 2, 2013',
          episode: 'S01E01',
          characterCount: 19,
        },
      ],
      pagination: { page, pageCount: 3, total: 51, pageSize: 20 },
    })
  }),

  http.get(`${BASE}/episodes/:id`, ({ params }) =>
    HttpResponse.json({
      episode: {
        id: Number(params.id),
        name: 'Pilot',
        airDate: 'December 2, 2013',
        episode: 'S01E01',
        characterCount: 2,
      },
      characters: [summary(1, 'Rick Sanchez'), summary(2, 'Morty Smith')],
    }),
  ),
]

export const server = setupServer(...handlers)
