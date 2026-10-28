import {client,configured,verifiedUser,safeNext,errorText,accountCommand} from './api.mjs?v=20261028-erp1';
const message=document.querySelector('#auth-message'),tabs=[...document.querySelectorAll('[role=tab]')];let busy=false,activation=null;
function inform(s,type=''){message.textContent=s;message.className='auth-message '+type;}
function select(i){tabs.forEach((t,n)=>{t.setAttribute('aria-selected',String(i===n));t.tabIndex=i===n?0:-1;document.getElementById(t.getAttribute('aria-controls')).hidden=i!==n;});}
tabs.forEach((t,i)=>{t.addEventListener('click',()=>select(i));t.addEventListener('keydown',e=>{if(['ArrowLeft','ArrowRight','Home','End'].includes(e.key)){e.preventDefault();const n=e.key==='Home'?0:e.key==='End'?1:1-i;select(n);tabs[n].focus();}});});
function enable(){document.querySelectorAll('#login-form input,#login-form button').forEach(e=>e.disabled=busy||!configured);document.querySelectorAll('#activate-form input,#activate-form button').forEach(e=>e.disabled=busy||!activation);}
const destination=safeNext(new URLSearchParams(location.search).get('next'));
const fragment=new URLSearchParams(location.hash.slice(1)),setup=fragment.get('setup'),token=setup||fragment.get('activate');
if(token){history.replaceState(null,'',location.pathname+location.search);select(1);}
async function start(){
 if(!configured){inform('Akses ERP sedang disiapkan. Silakan kembali setelah pengelola membuka akses akun.');return;}
 enable();
 if(token){try{const identity=await accountCommand({action:'inspect',token,setup:!!setup});activation={token,setup:!!setup};document.querySelector('#activation-identity').textContent='Aktifkan akun '+identity.email+'. Tautan hanya berlaku satu kali.';document.querySelector('label[for=full-name]').hidden=!setup;document.querySelector('#full-name').hidden=!setup;document.querySelector('#full-name').required=!!setup;enable();inform('Silakan buat kata sandi untuk akunmu sendiri.');}catch(e){inform(errorText(e),'error');}return;}
 inform('Masuk dengan akun yang sudah diaktifkan.');if(await verifiedUser())location.replace(destination);
}
start().catch(e=>inform(errorText(e),'error'));
document.addEventListener('submit',async e=>{
 e.preventDefault();if(busy||!configured||!e.target.reportValidity())return;const form=e.target,f=new FormData(form),password=String(f.get('password')||'');
 busy=true;enable();inform('Memproses akses akun…');
 try{
  let email=String(f.get('email')||'').trim();
  if(form.id==='activate-form'){
   if(!activation)throw Error('Buka tautan aktivasi dari pengelola.');if(password!==f.get('confirm'))throw Error('Ulangi kata sandi yang sama.');
   const result=await accountCommand({action:activation.setup?'setup':'activate',token:activation.token,password,name:String(f.get('name')||'').trim()});email=result.email;activation=null;form.reset();
  }
  const{error}=await client.auth.signInWithPassword({email,password});if(error)throw error;if(!await verifiedUser())throw Error('Sesi belum dapat diverifikasi. Silakan masuk kembali.');form.reset();location.replace(destination);
 }catch(error){inform(errorText(error),'error');}finally{busy=false;enable();}
});
