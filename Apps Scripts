const SHEET_NAME = 'responses';

function ensureSheet_() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sh = ss.getSheetByName(SHEET_NAME);
  if (!sh) sh = ss.insertSheet(SHEET_NAME);

  if (sh.getLastRow() === 0) {
    sh.appendRow([
      'server_timestamp',
      'app_version',
      'type_code',
      'A_side','A_strength',
      'B_side','B_strength',
      'C_side','C_strength',
      'D_side','D_strength',
      'neutral_rate',
      'max_same_rate',
      'raw_payload' // (선택) 디버깅용
    ]);
  }
  return sh;
}

function doGet() {
  return ContentService
    .createTextOutput('ok')
    .setMimeType(ContentService.MimeType.TEXT);
}

function doPost(e) {
  const lock = LockService.getScriptLock();
  const gotLock = lock.tryLock(15000); // ✅ tryLock 권장

  if (!gotLock) {
    return ContentService
      .createTextOutput('lock_timeout')
      .setMimeType(ContentService.MimeType.TEXT);
  }

  try {
    const sh = ensureSheet_();

    const payloadStr =
      (e && e.parameter && e.parameter.payload) ? e.parameter.payload :
      (e && e.postData && e.postData.contents) ? e.postData.contents : '';

    let data = {};
    let raw = payloadStr || '';

    try {
      data = raw ? JSON.parse(raw) : {};
    } catch (err) {
      data = {};
      // Logger에 남겨 두면 GAS 실행 로그에서 확인 가능
      console.log('JSON parse error: ' + err);
    }

    sh.appendRow([
      new Date(),
      data.version || '',
      data.code || '',
      data.A_side || '', data.A_strength || '',
      data.B_side || '', data.B_strength || '',
      data.C_side || '', data.C_strength || '',
      data.D_side || '', data.D_strength || '',
      (data.neutral_rate ?? ''),
      (data.max_same_rate ?? ''),
      raw
    ]);

    return ContentService
      .createTextOutput('ok')
      .setMimeType(ContentService.MimeType.TEXT);

  } catch (err) {
    console.log('doPost error: ' + err);
    return ContentService
      .createTextOutput('error:' + err)
      .setMimeType(ContentService.MimeType.TEXT);

  } finally {
    lock.releaseLock();
  }
}
