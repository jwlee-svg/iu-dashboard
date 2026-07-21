/**
 * 마이노멀 협찬 관리 시트의 "인플루언서" 탭을 인플루언서 대시보드가 읽을 수 있는
 * JSON 형태로 반환하는 Web App.
 *
 * 배포 방법:
 * 1. 구글시트에서 확장 프로그램 > Apps Script 클릭
 * 2. 기본 코드를 지우고 이 파일 내용 전체를 붙여넣기
 * 3. 우측 상단 배포 > 새 배포
 * 4. 유형: 웹 앱 선택
 * 5. 실행 대상: 나 / 액세스 권한: 전체 공개 (URL을 아는 모든 사용자)
 * 6. 배포 후 나오는 웹 앱 URL을 복사해서 대시보드의 "구글시트 불러오기" 설정에 붙여넣기
 */
function doGet() {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('인플루언서')
  const data = sheet.getDataRange().getValues()
  // 1행은 "계정 영향력" 등 그룹 라벨이고, 실제 컬럼명은 2행에 있다.
  const headers = data[1]
  const rows = data.slice(2)

  const col = (name) => headers.findIndex((h) => String(h).trim() === name)

  const idx = {
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

  if (idx.no === -1 || idx.name === -1) {
    return ContentService.createTextOutput(
      JSON.stringify({ error: '헤더를 찾지 못했습니다. "no." 또는 "크리에이터명" 컬럼명을 확인하세요.', headers }),
    ).setMimeType(ContentService.MimeType.JSON)
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
  const toDate = (v) => {
    if (!v) return ''
    if (Object.prototype.toString.call(v) === '[object Date]') {
      return Utilities.formatDate(v, Session.getScriptTimeZone(), 'yyyy-MM-dd')
    }
    return String(v)
  }

  const result = rows
    .filter((r) => r[idx.no] !== '' && r[idx.name])
    .map((r) => ({
      creatorId: 'cr_' + r[idx.no],
      name: toText(r[idx.name]),
      realName: toText(r[idx.realName]),
      affection: toText(r[idx.affection]) || '발송전검토',
      ytUrl: toText(r[idx.ytUrl]),
      ytSubscribers: toNumber(r[idx.ytSubscribers]),
      ytLastUpdated: '',
      igUrl: toText(r[idx.igUrl]),
      igFollowers: toNumber(r[idx.igFollowers]),
      tkUrl: toText(r[idx.tkUrl]),
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
      notionUrl: toText(r[idx.exposureUrl]),
      notes: toText(r[idx.notes]),
    }))

  return ContentService.createTextOutput(JSON.stringify(result)).setMimeType(ContentService.MimeType.JSON)
}
