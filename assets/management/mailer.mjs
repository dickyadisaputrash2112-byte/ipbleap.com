// Google Apps Script web app that emails activation/reset links (source: mailer-backend/Code.gs).
// Leave empty to fall back to sharing the link manually.
export const MAILER_ENDPOINT = '';

export async function sendAccessLink({email,url,kind='activate',cohort=null}){
 if(!MAILER_ENDPOINT)return {sent:false,reason:'Pengiriman email otomatis belum disiapkan.'};
 const api=await import('../assessment/api.mjs');
 const {data}=await api.client.auth.getSession();
 const token=data?.session?.access_token;
 if(!token)throw Error('Sesi admin berakhir. Masuk kembali lalu coba lagi.');
 // text/plain keeps this a simple request; Apps Script does not answer CORS preflight.
 const response=await fetch(MAILER_ENDPOINT,{method:'POST',headers:{'Content-Type':'text/plain;charset=utf-8'},body:JSON.stringify({token,email,url,kind,cohort})});
 const result=await response.json().catch(()=>null);
 if(!result?.ok)throw Error(result?.error||'Email belum terkirim.');
 return {sent:true,email:result.email};
}
