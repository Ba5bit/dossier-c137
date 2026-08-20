import { http, HttpResponse } from 'msw'
import { setupServer } from 'msw/node'

const BASE = 'https://api.test/api'

function character(id: number, name: string) {
  return {
    id,
    name,
    status: 'Alive',
    species: 'Human',
    type: '',
    gender: 'Male',
    image: `https://example.test/${id}.jpeg`,
    origin: { name: 'Earth (C-137)', id: 1 },
    location: { name: 'Citadel of Ricks', id: 3 },
    episodeCount: 51,
  }
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
]

export const server = setupServer(...handlers)
