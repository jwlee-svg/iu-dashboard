import type { Creator } from '../types/creator'

export async function fetchCreatorsFromSheet(url: string): Promise<Creator[]> {
  const res = await fetch(url)
  if (!res.ok) throw new Error(`구글시트 연동 응답 오류 (${res.status})`)
  const data = await res.json()
  if (!Array.isArray(data)) {
    const message = data && typeof data === 'object' && 'error' in data ? String((data as { error: unknown }).error) : '구글시트 응답 형식이 올바르지 않습니다. Apps Script 배포를 확인하세요.'
    throw new Error(message)
  }
  return data as Creator[]
}

/**
 * Apps Script 웹 앱은 CORS preflight(OPTIONS)를 처리하지 못하므로, 프리플라이트를
 * 유발하지 않는 "simple request"로 보내기 위해 Content-Type을 text/plain으로 둔다.
 * (Apps Script는 e.postData.contents를 그대로 JSON.parse 하므로 실제 형식과 무관하다.)
 */
export async function pushCreatorToSheet(url: string, creator: Creator): Promise<string> {
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'text/plain;charset=utf-8' },
    body: JSON.stringify({ creator }),
  })
  if (!res.ok) throw new Error(`구글시트 저장 응답 오류 (${res.status})`)
  const data = await res.json()
  if (!data || typeof data !== 'object' || !('ok' in data)) {
    const message = data && typeof data === 'object' && 'error' in data ? String((data as { error: unknown }).error) : '구글시트에 저장하지 못했습니다.'
    throw new Error(message)
  }
  return (data as { ok: true; creatorId: string }).creatorId
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
