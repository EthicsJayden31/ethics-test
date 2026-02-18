/**
 * Google Apps Script for collecting ethics test results.
 *
 * Expected client payload examples:
 * 1) application/x-www-form-urlencoded with key "payload" containing JSON string
 *    payload={"student_id":"20300", ...}
 * 2) raw JSON body
 * 3) form/querystring fields directly (student_id=20300&code=...)
 */

const SHEET_NAME = 'responses';
const REQUIRED_HEADERS = [
  'server_timestamp',
  'app_version',
  'type_code',
  'timestamp',
  'student_id',
  'Students_id',
  'version',
  'code',
  'A_side',
  'A_strength',
  'B_side',
  'B_strength',
  'C_side',
  'C_strength',
  'D_side',
  'D_strength',
  'neutral_rate',
  'max_same_rate',
  'raw_json'
];

function doPost(e) {
  try {
    const payload = parsePayload_(e);
    const normalized = normalizePayload_(payload);
    appendRow_(normalized);

    return jsonOutput_({ ok: true, message: 'saved' });
  } catch (err) {
    console.error(err);
    return jsonOutput_({ ok: false, message: String(err && err.message ? err.message : err) });
  }
}

function doGet() {
  return jsonOutput_({ ok: true, message: 'ethics collector is running' });
}

function parsePayload_(e) {
  if (!e) throw new Error('요청 이벤트(e)가 없습니다.');

  // 1) Preferred: form parameter payload
  if (e.parameter && e.parameter.payload) {
    return parseJsonSafe_(e.parameter.payload, 'payload 파라미터 JSON 파싱 실패');
  }

  // 1-1) Direct form field fallback
  if (e.parameter && (e.parameter.student_id || e.parameter.Students_id)) {
    return e.parameter;
  }

  // 2) POST body fallback (JSON or querystring-like)
  const raw = e.postData && e.postData.contents ? e.postData.contents : '';
  if (!raw) throw new Error('payload가 비어 있습니다.');

  // raw JSON
  if (raw.trim().startsWith('{')) {
    return parseJsonSafe_(raw, '본문(JSON) 파싱 실패');
  }

  // querystring style (payload=... or direct fields)
  const map = parseQueryString_(raw);
  if (map.payload) {
    return parseJsonSafe_(map.payload, '본문 payload(JSON) 파싱 실패');
  }

  if (map.student_id || map.Students_id) {
    return map;
  }

  throw new Error('지원하지 않는 payload 형식입니다.');
}

function normalizePayload_(p) {
  if (!p || typeof p !== 'object') throw new Error('payload 객체가 아닙니다.');

  // Handle nested payload pattern: { payload: {...} }
  if (p.payload && typeof p.payload === 'object') {
    p = p.payload;
  }

  const studentIdRaw = p.student_id || p.Students_id || p.students_id || p.STUDENT_ID;
  const studentId = String(studentIdRaw || '').trim();
  if (!/^\d{5}$/.test(studentId)) {
    throw new Error('student_id(Students_id)는 숫자 5자리여야 합니다.');
  }

  return {
    server_timestamp: safeStr_(p.server_timestamp) || new Date().toISOString(),
    app_version: safeStr_(p.app_version) || safeStr_(p.version),
    type_code: safeStr_(p.type_code) || safeStr_(p.code),
    timestamp: new Date(),
    student_id: studentId,
    Students_id: studentId,
    version: safeStr_(p.version) || safeStr_(p.app_version),
    code: safeStr_(p.code) || safeStr_(p.type_code),
    A_side: safeStr_(p.A_side),
    A_strength: safeNum_(pickAny_(p, ['A_strength', 'a_strength'])),
    B_side: safeStr_(p.B_side),
    B_strength: safeNum_(pickAny_(p, ['B_strength', 'b_strength'])),
    C_side: safeStr_(p.C_side),
    C_strength: safeNum_(pickAny_(p, ['C_strength', 'c_strength'])),
    D_side: safeStr_(p.D_side),
    D_strength: safeNum_(pickAny_(p, ['D_strength', 'd_strength'])),
    neutral_rate: safeNum_(pickAny_(p, ['neutral_rate', 'neutralRate'])),
    max_same_rate: safeNum_(pickAny_(p, ['max_same_rate', 'maxSameRate'])),
    raw_json: JSON.stringify(p)
  };
}

function appendRow_(d) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName(SHEET_NAME);
  if (!sheet) {
    sheet = ss.insertSheet(SHEET_NAME);
  }

  const headers = ensureColumns_(sheet, REQUIRED_HEADERS);
  const row = headers.map(function (h) {
    return d[h] !== undefined ? d[h] : '';
  });

  sheet.appendRow(row);
}

function ensureColumns_(sheet, requiredHeaders) {
  const firstRowRange = sheet.getRange(1, 1, 1, Math.max(1, sheet.getMaxColumns()));
  const firstRowValues = firstRowRange.getValues()[0];
  let headers = firstRowValues.map(function (v) { return String(v || '').trim(); });

  const hasAnyHeader = headers.some(function (h) { return h !== ''; });
  if (!hasAnyHeader) {
    headers = requiredHeaders.slice();
    sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
    return headers;
  }

  requiredHeaders.forEach(function (h) {
    if (headers.indexOf(h) === -1) {
      headers.push(h);
      sheet.getRange(1, headers.length).setValue(h);
    }
  });

  return headers;
}

function parseQueryString_(qs) {
  const out = {};
  if (!qs) return out;

  qs.split('&').forEach(function (pair) {
    const idx = pair.indexOf('=');
    if (idx < 0) return;
    const k = decodeURIComponent(pair.slice(0, idx));
    const v = decodeURIComponent(pair.slice(idx + 1).replace(/\+/g, ' '));
    out[k] = v;
  });
  return out;
}

function parseJsonSafe_(text, errMsg) {
  try {
    return JSON.parse(text);
  } catch (err) {
    throw new Error(errMsg + ': ' + err.message);
  }
}

function pickAny_(obj, keys) {
  for (var i = 0; i < keys.length; i++) {
    var key = keys[i];
    if (obj[key] !== undefined && obj[key] !== null && obj[key] !== '') {
      return obj[key];
    }
  }
  return '';
}

function safeStr_(v) {
  return v == null ? '' : String(v);
}

function safeNum_(v) {
  const n = Number(v);
  return Number.isFinite(n) ? n : '';
}

function jsonOutput_(obj) {
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}
