/**
 * IPB LEAP account mailer (Google Apps Script web app).
 *
 * Sends activation / password-reset links that a Super Admin has just created
 * in Kelola Program. The request must carry the admin's own Supabase session
 * token; this script checks that token with Supabase and only sends when the
 * caller is an active Super Admin and the recipient is a registered account.
 * No password, service key or other secret is stored here.
 */
const SUPABASE_URL = 'https://sqtbxflczscxrsvgyepu.supabase.co';
const PUBLISHABLE_KEY = 'sb_publishable_NyJicpJ0eYMehMnAYwc6Nw_Qcxrxtnm';
const LINK_PATTERN = /^https:\/\/ipbleap\.com\/login\/#(activate|setup)=[a-f0-9]{64}$/;
const SENDER_NAME = 'IPB LEAP';
const MAX_PER_ADMIN_PER_HOUR = 60;

function doGet() {
  return json({ ok: true, service: 'ipbleap-mailer', quotaLeft: MailApp.getRemainingDailyQuota() });
}

function doPost(e) {
  let body = {};
  try { body = JSON.parse((e && e.postData && e.postData.contents) || '{}'); } catch (error) { return json({ ok: false, error: 'Permintaan tidak valid.' }); }
  if (body.action === 'forgot') return forgotPassword(body);
  return adminSend(body);
}

/** Admin-triggered: send a link the Super Admin has just created in Kelola Program. */
function adminSend(body) {
  try {
    const token = String(body.token || '');
    const email = String(body.email || '').trim().toLowerCase();
    const url = String(body.url || '');
    const kind = body.kind === 'reset' ? 'reset' : 'activate';
    if (!/^[\w.-]+\.[\w.-]+\.[\w.-]+$/.test(token)) throw new Error('Sesi admin tidak valid. Muat ulang halaman lalu coba lagi.');
    if (!/^\S+@\S+\.\S+$/.test(email) || email.length > 254) throw new Error('Email penerima tidak valid.');
    if (!LINK_PATTERN.test(url)) throw new Error('Tautan tidak dikenali.');

    const actor = supabase('/rest/v1/rpc/erp_bootstrap', token, {});
    if (!actor || !actor.active || !(actor.roles || []).includes('system')) throw new Error('Hanya Super Admin aktif yang dapat mengirim tautan.');

    const workspace = supabase('/rest/v1/rpc/erp_management_workspace', token, { p_cohort: body.cohort || null });
    const person = (workspace.profiles || []).find(p => String(p.email || '').toLowerCase() === email);
    if (!person) throw new Error('Email penerima tidak terdaftar sebagai akun IPB LEAP.');

    const cache = CacheService.getScriptCache();
    const key = 'sent:' + actor.id;
    const count = Number(cache.get(key) || 0);
    if (count >= MAX_PER_ADMIN_PER_HOUR) throw new Error('Batas pengiriman per jam tercapai. Coba lagi nanti.');
    if (MailApp.getRemainingDailyQuota() < 1) throw new Error('Kuota email harian Google habis. Bagikan tautan secara manual.');

    sendLinkEmail(email, person.display_name, url, kind, false);
    cache.put(key, String(count + 1), 3600);
    return json({ ok: true, email: email });
  } catch (error) {
    return json({ ok: false, error: String((error && error.message) || error) });
  }
}

function sendLinkEmail(email, displayName, url, kind, selfService) {
    const name = displayName || 'Peserta IPB LEAP';
    const subject = kind === 'reset' ? 'Reset kata sandi akun IPB LEAP' : 'Aktivasi akun IPB LEAP';
    const intro = kind === 'reset'
      ? (selfService ? 'Kami menerima permintaan reset kata sandi untuk akunmu.' : 'Pengelola IPB LEAP telah menyiapkan reset kata sandi untuk akunmu.')
      : 'Akun IPB LEAP Management System untukmu sudah disiapkan.';
    const action = kind === 'reset' ? 'Buat kata sandi baru' : 'Aktifkan akun';
    const html = '<div style="font-family:Arial,sans-serif;max-width:520px;margin:auto;color:#171930;line-height:1.6">'
      + '<h2 style="color:#32306F">' + escapeHtml(subject) + '</h2>'
      + '<p>Halo ' + escapeHtml(name) + ',</p><p>' + intro + ' Klik tombol di bawah untuk membuat kata sandi.</p>'
      + '<p style="margin:28px 0"><a href="' + url + '" style="background:#32306F;color:#fff;padding:14px 22px;border-radius:12px;text-decoration:none;font-weight:bold">' + action + '</a></p>'
      + '<p style="font-size:13px;color:#5E647D">Tautan berlaku 14 hari dan hanya dapat dipakai sekali. Jangan teruskan email ini kepada siapa pun. '
      + (kind === 'reset' && selfService
        ? 'Demi keamanan, login dengan kata sandi lama dinonaktifkan sampai kata sandi baru dibuat lewat tautan ini. Jika kamu tidak meminta reset, tetap buat kata sandi baru lewat tautan ini atau hubungi pengurus IPB LEAP.</p>'
        : 'Jika kamu tidak merasa meminta ini, abaikan email ini dan hubungi pengurus IPB LEAP.</p>')
      + '<p style="font-size:12px;color:#8A8FA8">Akun: ' + escapeHtml(email) + '</p></div>';
    const text = 'Halo ' + name + ',\n\n' + intro + '\n' + action + ': ' + url
      + '\n\nTautan berlaku 14 hari dan hanya dapat dipakai sekali. Jangan teruskan kepada siapa pun.';

    MailApp.sendEmail({ to: email, subject: subject, body: text, htmlBody: html, name: SENDER_NAME });
}

/* ---------- Self-service "Lupa kata sandi" ----------
 * Uses a dedicated Super Admin account ("Bot Reset") whose email/password are kept in
 * Script Properties BOT_EMAIL and BOT_PASSWORD. The reset link only goes to the account's
 * own email, so a request can delay but never take over an account.
 */
const GENERIC_REPLY = 'Jika email itu terdaftar, tautan untuk membuat kata sandi baru sudah dikirim. Periksa kotak masuk dan folder Spam.';
const PER_EMAIL_SECONDS = 15 * 60;
const MAX_FORGOT_PER_HOUR = 40;

function forgotPassword(body) {
  const email = String(body.email || '').trim().toLowerCase();
  if (!/^\S+@\S+\.\S+$/.test(email) || email.length > 254) return json({ ok: false, error: 'Tulis email akun yang benar.' });
  const cache = CacheService.getScriptCache();
  const emailKey = 'forgot:' + Utilities.base64EncodeWebSafe(Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, email));
  if (cache.get(emailKey)) return json({ ok: true, message: 'Permintaan untuk email ini baru saja dikirim. Periksa email (juga folder Spam) atau coba lagi 15 menit lagi.' });
  const hourly = Number(cache.get('forgot:hour') || 0);
  if (hourly >= MAX_FORGOT_PER_HOUR) return json({ ok: false, error: 'Terlalu banyak permintaan. Coba lagi dalam satu jam atau hubungi pengurus.' });
  const lock = LockService.getScriptLock();
  if (!lock.tryLock(25000)) return json({ ok: false, error: 'Layanan sedang sibuk. Coba lagi sebentar.' });
  try {
    cache.put(emailKey, '1', PER_EMAIL_SECONDS);
    cache.put('forgot:hour', String(hourly + 1), 3600);
    const result = issueResetFor(email);
    if (result) sendLinkEmail(email, result.name, result.url, result.kind, true);
    return json({ ok: true, message: GENERIC_REPLY });
  } catch (error) {
    console.error(error);
    return json({ ok: false, error: 'Tautan belum dapat dikirim. Coba lagi nanti atau hubungi pengurus.' });
  } finally {
    lock.releaseLock();
  }
}

/** Returns {url, kind, name} or null when the email is not an eligible account. */
function issueResetFor(email) {
  const token = botToken();
  const first = supabase('/rest/v1/rpc/erp_management_workspace', token, { p_cohort: null });
  const person = (first.profiles || []).find(p => String(p.email || '').toLowerCase() === email);
  if (!person || (person.roles || []).includes('system')) return null;
  const found = findEnrolment(token, first, person.id);
  if (!found) return null;
  const { cohort, workspace, enrolment } = found;
  const kind = person.active ? 'reset' : 'activate';
  let deactivated = false;
  try {
    if (person.active) {
      accountCommand(token, workspace, cohort, person, enrolment, false);
      deactivated = true;
    }
    const link = edgeAccount(token, { action: 'reissue', user: person.id, cohort: cohort });
    if (!link || !LINK_PATTERN.test(link.url || '')) throw new Error('Tautan tidak dikenali.');
    rememberPending(person.id, cohort);
    return { url: link.url, kind: kind, name: person.display_name };
  } catch (error) {
    if (deactivated) {
      try {
        const fresh = supabase('/rest/v1/rpc/erp_management_workspace', token, { p_cohort: cohort });
        accountCommand(token, fresh, cohort, person, enrolment, true);
      } catch (revertError) { console.error('Revert gagal untuk ' + person.id + ': ' + revertError); }
    }
    throw error;
  }
}

function findEnrolment(token, first, userId) {
  const pick = ws => (ws.enrolments || []).filter(e => e.user_id === userId).sort((a, b) => Number(b.active) - Number(a.active))[0];
  const selected = first.selectedCohort;
  let hit = pick(first);
  if (hit) return { cohort: hit.cohort_id || selected, workspace: first, enrolment: hit };
  const cohorts = (first.cohorts || []).slice().reverse();
  for (const c of cohorts) {
    if (c.id === selected) continue;
    const ws = supabase('/rest/v1/rpc/erp_management_workspace', token, { p_cohort: c.id });
    hit = pick(ws);
    if (hit) return { cohort: c.id, workspace: ws, enrolment: hit };
  }
  return null;
}

/** Mirrors the payload Kelola Program sends when an account is edited. */
function accountCommand(token, workspace, cohort, person, enrolment, active) {
  const payload = { action: 'account', cohort: cohort, user: person.id, id: person.id, cohort_id: cohort,
    display_name: person.display_name, email: person.email, role: enrolment.role, active: active };
  if (enrolment.role === 'mentee') {
    const member = (workspace.members || []).find(m => m.user_id === person.id && m.active &&
      (workspace.groups || []).some(g => g.id === m.group_id && g.cohort_id === cohort && !g.archived_at));
    payload.field = enrolment.field || ''; payload.pathway = enrolment.pathway || ''; payload.group_id = member ? member.group_id : '';
  }
  if (enrolment.role === 'event') payload.division = enrolment.division || 'Operation & Communication';
  const c = (workspace.cohorts || []).find(x => x.id === cohort) || {};
  const expected = workspace.revision != null ? workspace.revision : (c.revision || 0);
  return supabase('/rest/v1/rpc/erp_management_command', token, { p_payload: payload, p_expected: expected });
}

function edgeAccount(token, body) {
  const response = UrlFetchApp.fetch(SUPABASE_URL + '/functions/v1/erp-account', {
    method: 'post', contentType: 'application/json',
    headers: { apikey: PUBLISHABLE_KEY, Authorization: 'Bearer ' + token },
    payload: JSON.stringify(body), muteHttpExceptions: true
  });
  const data = JSON.parse(response.getContentText() || '{}');
  if (response.getResponseCode() >= 300 || data.error) throw new Error(data.error || ('Layanan akun ' + response.getResponseCode()));
  return data;
}

function botToken() {
  const cache = CacheService.getScriptCache();
  const cached = cache.get('bot:token');
  if (cached) return cached;
  const props = PropertiesService.getScriptProperties();
  const email = props.getProperty('BOT_EMAIL'), password = props.getProperty('BOT_PASSWORD');
  if (!email || !password) throw new Error('BOT_EMAIL / BOT_PASSWORD belum diisi di Script Properties.');
  const response = UrlFetchApp.fetch(SUPABASE_URL + '/auth/v1/token?grant_type=password', {
    method: 'post', contentType: 'application/json', headers: { apikey: PUBLISHABLE_KEY },
    payload: JSON.stringify({ email: email, password: password }), muteHttpExceptions: true
  });
  const data = JSON.parse(response.getContentText() || '{}');
  if (!data.access_token) throw new Error('Login Bot Reset gagal (' + response.getResponseCode() + ').');
  cache.put('bot:token', data.access_token, Math.max(60, Math.min(3000, Number(data.expires_in || 3600) - 300)));
  return data.access_token;
}

/* After the owner sets a new password their profile is active again; make sure the
 * cohort enrolment is active too. Runs from a time-driven trigger (see installTrigger). */
function rememberPending(user, cohort) {
  const props = PropertiesService.getScriptProperties();
  const list = JSON.parse(props.getProperty('PENDING') || '[]').filter(p => p.user !== user);
  list.push({ user: user, cohort: cohort, at: Date.now() });
  props.setProperty('PENDING', JSON.stringify(list.slice(-200)));
}

function reenrolPending() {
  const props = PropertiesService.getScriptProperties();
  const list = JSON.parse(props.getProperty('PENDING') || '[]');
  if (!list.length) return;
  const token = botToken(), keep = [], byCohort = {};
  for (const item of list) {
    if (Date.now() - item.at > 15 * 86400000) continue;
    try {
      const ws = byCohort[item.cohort] || (byCohort[item.cohort] = supabase('/rest/v1/rpc/erp_management_workspace', token, { p_cohort: item.cohort }));
      const person = (ws.profiles || []).find(p => p.id === item.user);
      const enrolment = (ws.enrolments || []).find(e => e.user_id === item.user && (e.cohort_id || item.cohort) === item.cohort);
      if (!person || !enrolment) continue;
      if (!person.active) { keep.push(item); continue; }
      if (!enrolment.active) { accountCommand(token, ws, item.cohort, person, enrolment, true); delete byCohort[item.cohort]; }
    } catch (error) { console.error(error); keep.push(item); }
  }
  props.setProperty('PENDING', JSON.stringify(keep));
}

/** Run once from the editor: checks the bot login and installs the 10-minute re-enrol trigger. */
function installTrigger() {
  botToken();
  ScriptApp.getProjectTriggers().filter(t => t.getHandlerFunction() === 'reenrolPending').forEach(t => ScriptApp.deleteTrigger(t));
  ScriptApp.newTrigger('reenrolPending').timeBased().everyMinutes(10).create();
  Logger.log('Bot Reset berhasil login dan pemicu 10 menit terpasang.');
}

function supabase(path, token, payload) {
  const response = UrlFetchApp.fetch(SUPABASE_URL + path, {
    method: 'post',
    contentType: 'application/json',
    headers: { apikey: PUBLISHABLE_KEY, Authorization: 'Bearer ' + token },
    payload: JSON.stringify(payload),
    muteHttpExceptions: true
  });
  const code = response.getResponseCode();
  if (code === 401 || code === 403) throw new Error('Sesi admin berakhir. Masuk kembali lalu coba lagi.');
  if (code >= 300) throw new Error('Data akun belum dapat diperiksa (' + code + ').');
  return JSON.parse(response.getContentText() || 'null');
}

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
}

function json(value) {
  return ContentService.createTextOutput(JSON.stringify(value)).setMimeType(ContentService.MimeType.JSON);
}

/** Run once from the editor to grant the email + network permissions. */
function authorize() {
  Logger.log('Sisa kuota email hari ini: ' + MailApp.getRemainingDailyQuota());
  UrlFetchApp.fetch(SUPABASE_URL + '/auth/v1/health', { headers: { apikey: PUBLISHABLE_KEY }, muteHttpExceptions: true });
}
