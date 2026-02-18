/**
 * Google Apps Script for collecting ethics test results.
 *
 * Expected client payload examples:
 * 1) application/x-www-form-urlencoded with key "payload" containing JSON string
 *    payload={"student_id":"20300", ...}
 * 2) raw JSON body
 */

const SHEET_NAME = 'responses';

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

  // 2) POST body fallback (JSON or querystring-like)
  const raw = e.postData && e.postData.contents ? e.postData.contents : '';
  if (!raw) throw new Error('payload가 비어 있습니다.');

  // raw JSON
  if (raw.trim().startsWith('{')) {
    return parseJsonSafe_(raw, '본문(JSON) 파싱 실패');
  }

  // querystring style (payload=...)
  const map = parseQueryString_(raw);
  if (map.payload) {
    return parseJsonSafe_(map.payload, '본문 payload(JSON) 파싱 실패');
  }

  throw new Error('지원하지 않는 payload 형식입니다.');
}

function normalizePayload_(p) {
  if (!p || typeof p !== 'object') throw new Error('payload 객체가 아닙니다.');

  const studentId = String(p.student_id || '').trim();
  if (!/^\d{5}$/.test(studentId)) {
    throw new Error('student_id는 숫자 5자리여야 합니다.');
  }

  return {
    timestamp: new Date(),
    student_id: studentId,
    version: safeStr_(p.version),
    code: safeStr_(p.code),
    A_side: safeStr_(p.A_side),
    A_strength: safeNum_(p.A_strength),
    B_side: safeStr_(p.B_side),
    B_strength: safeNum_(p.B_strength),
    C_side: safeStr_(p.C_side),
    C_strength: safeNum_(p.C_strength),
    D_side: safeStr_(p.D_side),
    D_strength: safeNum_(p.D_strength),
    neutral_rate: safeNum_(p.neutral_rate),
    max_same_rate: safeNum_(p.max_same_rate),
    raw_json: JSON.stringify(p)
  };
}

function appendRow_(d) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName(SHEET_NAME);
  if (!sheet) {
    sheet = ss.insertSheet(SHEET_NAME);
  }

  ensureHeader_(sheet);

  sheet.appendRow([
    d.timestamp,
    d.student_id,
    d.version,
    d.code,
    d.A_side,
    d.A_strength,
    d.B_side,
    d.B_strength,
    d.C_side,
    d.C_strength,
    d.D_side,
    d.D_strength,
    d.neutral_rate,
    d.max_same_rate,
    d.raw_json
  ]);
}

function ensureHeader_(sheet) {
  if (sheet.getLastRow() > 0) return;

  sheet.getRange(1, 1, 1, 15).setValues([[
    'timestamp',
    'student_id',
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
  ]]);
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
