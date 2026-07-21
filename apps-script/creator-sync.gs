/**
 * 마이노멀 협찬 관리 시트의 "인플루언서" 탭과 인플루언서 대시보드를 양방향으로 동기화하는 Web App.
 *
 * - GET: 시트 → 대시보드. 시트의 모든 행을 JSON으로 반환한다.
 * - POST: 대시보드 → 시트. 크리에이터 1명을 받아 기존 행을 업데이트하거나(no. 일치),
 *   없으면 새 행을 추가한다. 삭제는 지원하지 않는다(대시보드에서 지워도 시트 행은 남는다).
 *
 * 배포 방법:
 * 1. 구글시트에서 확장 프로그램 > Apps Script 클릭
 * 2. 기본 코드를 지우고 이 파일 내용 전체를 붙여넣기
 * 3. 우측 상단 배포 > 새 배포 (이미 배포했다면 배포 관리 > 연필 아이콘 > 새 버전)
 * 4. 유형: 웹 앱 선택
 * 5. 실행 대상: 나 / 액세스 권한: 전체 공개 (URL을 아는 모든 사용자)
 * 6. 배포 후 나오는 웹 앱 URL을 복사해서 대시보드의 "구글시트 불러오기" 설정에 붙여넣기
 *
 * 주의: YT/IG/TK 링크, 노출URL 셀이 원래 "스마트 칩"이었어도, 대시보드에서 값을 수정해
 * 다시 쓰면 해당 셀은 일반 텍스트 URL로 바뀐다(칩 모양은 사라지지만 URL 값 자체는 유지된다).
 */
function jsonOutput(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON)
}

function getIdx(headers) {
  const col = (name) => headers.findIndex((h) => String(h).trim() === name)
  return {
    no: col('no.'),
    affection: col('애정도'),
    name: col('크리에이터명'),
    ytUrl: col('YT 링크'),
    ytSubscribers: col('YT 구독자수'),
    igUrl: col('IG 링크'),
    igFollowers: col('IG 팔로워'),
    tkUrl: col('TK 링크'),
    tkFollowers: col('TK팔로워'),
    faceExposure: col('얼굴 노출'),
    ageTargets: col('연령타겟'),
    keywords: col('키워드, 주제'),
    hasChildren: col('자녀(유의미한 경우만)'),
    isCommerce: col('커머스 후보'),
    isCelebrity: col('연예인'),
    isDoctor: col('의사'),
    isNutritionFitness: col('영양/피트니스전문가'),
    isDiabeticLowCarb: col('당뇨/저탄고지'),
    isOrganic: col('오가닉 노출'),
    hasPaidCollab: col('광고/협업'),
    hasGroupBuy: col('공구'),
    notes: col('비고'),
    exposureUrl: col('노출URL'),
    agencyName: col('소속사'),
    agencyContact: col('컨택포인트'),
    shippingNote: col('배송 참고'),
    smsName: col('문자 발송 이름'),
    realName: col('수령인'),
    phone: col('연락처'),
    address: col('주소'),
    firstSeedingDate: col('첫 시딩일'),
  }
}

function getInfluencerSheet() {
  return SpreadsheetApp.getActiveSpreadsheet().getSheetByName('인플루언서')
}

function doGet() {
  const sheet = getInfluencerSheet()
  const range = sheet.getDataRange()
  const data = range.getValues()
  // 스마트 칩(URL 붙여넣기 시 페이지 제목으로 표시됨) 링크의 실제 URL을 얻기 위해 필요하다.
  const richValues = range.getRichTextValues()
  // 1행은 "계정 영향력" 등 그룹 라벨이고, 실제 컬럼명은 2행에 있다.
  const headers = data[1]
  const rows = data.slice(2)
  const idx = getIdx(headers)

  if (idx.no === -1 || idx.name === -1) {
    return jsonOutput({ error: '헤더를 찾지 못했습니다. "no." 또는 "크리에이터명" 컬럼명을 확인하세요.', headers })
  }

  const toNumber = (v) => {
    if (typeof v === 'number') return v
    if (!v) return 0
    const n = Number(String(v).replace(/,/g, '').trim())
    return isNaN(n) ? 0 : n
  }
  const toBool = (v) => v === true || v === 'TRUE'
  const toList = (v) => {
    if (!v || v === '-') return []
    return String(v).split(',').map((s) => s.trim()).filter(Boolean)
  }
  const toText = (v) => (v === undefined || v === null || v === '-' ? '' : String(v))
  // 스마트 칩 셀은 getValues()로는 표시 제목만 나오므로, 리치 텍스트에서 실제 링크 URL을 우선 추출한다.
  const linkOrText = (rowAbsIdx, colIdx) => {
    if (colIdx === -1) return ''
    const rich = richValues[rowAbsIdx][colIdx]
    const wholeLink = rich && rich.getLinkUrl && rich.getLinkUrl()
    if (wholeLink) return wholeLink
    const runs = rich && rich.getRuns ? rich.getRuns() : []
    for (let i = 0; i < runs.length; i += 1) {
      const runLink = runs[i].getLinkUrl && runs[i].getLinkUrl()
      if (runLink) return runLink
    }
    return toText(data[rowAbsIdx][colIdx])
  }
  const toDate = (v) => {
    if (!v) return ''
    if (Object.prototype.toString.call(v) === '[object Date]') {
      return Utilities.formatDate(v, Session.getScriptTimeZone(), 'yyyy-MM-dd')
    }
    return String(v)
  }

  const result = rows
    .filter((r) => r[idx.no] !== '' && r[idx.name])
    .map((r, i) => {
      const rowAbsIdx = i + 2
      return {
        creatorId: 'cr_' + r[idx.no],
        name: toText(r[idx.name]),
        realName: toText(r[idx.realName]),
        affection: toText(r[idx.affection]) || '발송전검토',
        ytUrl: linkOrText(rowAbsIdx, idx.ytUrl),
        ytSubscribers: toNumber(r[idx.ytSubscribers]),
        ytLastUpdated: '',
        igUrl: linkOrText(rowAbsIdx, idx.igUrl),
        igFollowers: toNumber(r[idx.igFollowers]),
        tkUrl: linkOrText(rowAbsIdx, idx.tkUrl),
        tkFollowers: toNumber(r[idx.tkFollowers]),
        faceExposure: toBool(r[idx.faceExposure]),
        ageTargets: toList(r[idx.ageTargets]),
        keywords: toList(r[idx.keywords]),
        hasChildren: toBool(r[idx.hasChildren]) || toText(r[idx.hasChildren]) === 'ㅇ',
        isCommerce: toBool(r[idx.isCommerce]),
        isCelebrity: toBool(r[idx.isCelebrity]),
        isDoctor: toBool(r[idx.isDoctor]),
        isNutritionFitness: toBool(r[idx.isNutritionFitness]),
        isDiabeticLowCarb: toBool(r[idx.isDiabeticLowCarb]),
        isOrganic: toBool(r[idx.isOrganic]),
        hasPaidCollab: toBool(r[idx.hasPaidCollab]),
        hasGroupBuy: toBool(r[idx.hasGroupBuy]),
        phone: toText(r[idx.phone]),
        address: toText(r[idx.address]),
        firstSeedingDate: toDate(r[idx.firstSeedingDate]),
        agencyName: toText(r[idx.agencyName]),
        agencyContact: toText(r[idx.agencyContact]),
        shippingNote: toText(r[idx.shippingNote]),
        smsName: toText(r[idx.smsName]),
        notionUrl: linkOrText(rowAbsIdx, idx.exposureUrl),
        notes: toText(r[idx.notes]),
      }
    })

  return jsonOutput(result)
}

function doPost(e) {
  let body
  try {
    body = JSON.parse(e.postData.contents)
  } catch (err) {
    return jsonOutput({ error: '요청 본문이 올바른 JSON이 아닙니다.' })
  }

  const creator = body.creator
  if (!creator || !creator.creatorId || !creator.name) {
    return jsonOutput({ error: 'creator.creatorId / creator.name이 필요합니다.' })
  }

  const sheet = getInfluencerSheet()
  const data = sheet.getDataRange().getValues()
  const headers = data[1]
  const idx = getIdx(headers)

  if (idx.no === -1 || idx.name === -1) {
    return jsonOutput({ error: '헤더를 찾지 못했습니다.', headers })
  }

  let targetRowAbsIdx = -1
  for (let i = 2; i < data.length; i += 1) {
    if (data[i][idx.no] !== '' && 'cr_' + data[i][idx.no] === creator.creatorId) {
      targetRowAbsIdx = i
      break
    }
  }

  let assignedCreatorId = creator.creatorId
  if (targetRowAbsIdx === -1) {
    let maxNo = 0
    for (let i = 2; i < data.length; i += 1) {
      const n = Number(data[i][idx.no])
      if (!isNaN(n) && n > maxNo) maxNo = n
    }
    const newNo = maxNo + 1
    targetRowAbsIdx = data.length
    assignedCreatorId = 'cr_' + newNo
    sheet.getRange(targetRowAbsIdx + 1, idx.no + 1).setValue(newNo)
  }

  const rowNum = targetRowAbsIdx + 1
  const setIfIdx = (colIdx, value) => {
    if (colIdx !== -1) sheet.getRange(rowNum, colIdx + 1).setValue(value)
  }
  const joinList = (arr) => (Array.isArray(arr) ? arr.join(', ') : '')

  setIfIdx(idx.affection, creator.affection)
  setIfIdx(idx.name, creator.name)
  setIfIdx(idx.ytUrl, creator.ytUrl)
  setIfIdx(idx.ytSubscribers, creator.ytSubscribers)
  setIfIdx(idx.igUrl, creator.igUrl)
  setIfIdx(idx.igFollowers, creator.igFollowers)
  setIfIdx(idx.tkUrl, creator.tkUrl)
  setIfIdx(idx.tkFollowers, creator.tkFollowers)
  setIfIdx(idx.faceExposure, creator.faceExposure)
  setIfIdx(idx.ageTargets, joinList(creator.ageTargets))
  setIfIdx(idx.keywords, joinList(creator.keywords))
  setIfIdx(idx.hasChildren, creator.hasChildren ? 'ㅇ' : '')
  setIfIdx(idx.isCommerce, creator.isCommerce)
  setIfIdx(idx.isCelebrity, creator.isCelebrity)
  setIfIdx(idx.isDoctor, creator.isDoctor)
  setIfIdx(idx.isNutritionFitness, creator.isNutritionFitness)
  setIfIdx(idx.isDiabeticLowCarb, creator.isDiabeticLowCarb)
  setIfIdx(idx.isOrganic, creator.isOrganic)
  setIfIdx(idx.hasPaidCollab, creator.hasPaidCollab)
  setIfIdx(idx.hasGroupBuy, creator.hasGroupBuy)
  setIfIdx(idx.notes, creator.notes)
  setIfIdx(idx.exposureUrl, creator.notionUrl)
  setIfIdx(idx.agencyName, creator.agencyName)
  setIfIdx(idx.agencyContact, creator.agencyContact)
  setIfIdx(idx.shippingNote, creator.shippingNote)
  setIfIdx(idx.smsName, creator.smsName)
  setIfIdx(idx.realName, creator.realName)
  setIfIdx(idx.phone, creator.phone)
  setIfIdx(idx.address, creator.address)
  setIfIdx(idx.firstSeedingDate, creator.firstSeedingDate)

  return jsonOutput({ ok: true, creatorId: assignedCreatorId })
}
