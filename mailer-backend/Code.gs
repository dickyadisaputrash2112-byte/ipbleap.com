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
  try {
    const body = JSON.parse((e && e.postData && e.postData.contents) || '{}');
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

    const name = person.display_name || 'Peserta IPB LEAP';
    const subject = kind === 'reset' ? 'Reset kata sandi akun IPB LEAP' : 'Aktivasi akun IPB LEAP';
    const intro = kind === 'reset'
      ? 'Pengelola IPB LEAP telah menyiapkan reset kata sandi untuk akunmu.'
      : 'Akun IPB LEAP Management System untukmu sudah disiapkan.';
    const action = kind === 'reset' ? 'Buat kata sandi baru' : 'Aktifkan akun';
    const html = '<div style="font-family:Arial,sans-serif;max-width:520px;margin:auto;color:#171930;line-height:1.6">'
      + '<h2 style="color:#32306F">' + escapeHtml(subject) + '</h2>'
      + '<p>Halo ' + escapeHtml(name) + ',</p><p>' + intro + ' Klik tombol di bawah untuk membuat kata sandi.</p>'
      + '<p style="margin:28px 0"><a href="' + url + '" style="background:#32306F;color:#fff;padding:14px 22px;border-radius:12px;text-decoration:none;font-weight:bold">' + action + '</a></p>'
      + '<p style="font-size:13px;color:#5E647D">Tautan berlaku 14 hari dan hanya dapat dipakai sekali. Jangan teruskan email ini kepada siapa pun. '
      + 'Jika kamu tidak merasa meminta ini, abaikan email ini dan hubungi pengurus IPB LEAP.</p>'
      + '<p style="font-size:12px;color:#8A8FA8">Akun: ' + escapeHtml(email) + '</p></div>';
    const text = 'Halo ' + name + ',\n\n' + intro + '\n' + action + ': ' + url
      + '\n\nTautan berlaku 14 hari dan hanya dapat dipakai sekali. Jangan teruskan kepada siapa pun.';

    MailApp.sendEmail({ to: email, subject: subject, body: text, htmlBody: html, name: SENDER_NAME });
    cache.put(key, String(count + 1), 3600);
    return json({ ok: true, email: email });
  } catch (error) {
    return json({ ok: false, error: String((error && error.message) || error) });
  }
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
