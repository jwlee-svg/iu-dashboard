import type { Creator } from '../types/creator'

export async function fetchCreatorsFromSheet(url: string): Promise<Creator[]> {
  const res = await fetch(url)
  if (!res.ok) throw new Error(`구글시트 연동 응답 오류 (${res.status})`)
  const data = await res.json()
  if (!Array.isArray(data)) throw new Error('구글시트 응답 형식이 올바르지 않습니다. Apps Script 배포를 확인하세요.')
  return data as Creator[]
}

export function mergeCreatorsById(existing: Creator[], incoming: Creator[]) {
  const map = new Map(existing.map((c) => [c.creatorId, c]))
  let added = 0
  let updated = 0
  incoming.forEach((c) => {
    if (map.has(c.creatorId)) updated += 1
    else added += 1
    map.set(c.creatorId, c)
  })
  return { merged: Array.from(map.values()), added, updated }
}
