'use strict';
(()=>{
 const roles=['mentee','asmen','mentor','pengurus','bendahara','superadmin'];
 const query=new URLSearchParams(location.search).get('role');
 if(roles.includes(query))sessionStorage.setItem('ipb-leap-preview-role',query);
 const menus={mentee:[['Beranda','BerandaMentee.dc.html'],['Personal Outcome Contract','POC.dc.html'],['Worksheet ABC','WorksheetABC.dc.html'],['Raport','Raport.dc.html?person=mentee-01&month=2026-09']],asmen:[['Ringkasan kelompok','Monitoring.dc.html'],['Monitoring progres','MonitoringProgres.dc.html'],['Catat sesi','CatatSesi.dc.html'],['Worksheet ABC kelompok','WorksheetABC.dc.html'],['POC mentee','POC.dc.html'],['Penilaian & bukti','Penilaian.dc.html']],mentor:[['Ringkasan kelompok','Monitoring.dc.html'],['Monitoring progres','MonitoringProgres.dc.html'],['Catat sesi','CatatSesi.dc.html'],['Worksheet ABC kelompok','WorksheetABC.dc.html'],['POC mentee','POC.dc.html'],['Penilaian & bukti','Penilaian.dc.html']],pengurus:[['Beranda','BerandaPengurus.dc.html'],['Penilaian & bukti','Penilaian.dc.html'],['Kelola event','KelolaEvent.dc.html'],['Pengumuman','Pengumuman.dc.html'],['Proker & task','Proker.dc.html'],['File manager','FileManager.dc.html'],['Template','Template.dc.html']],bendahara:[['Keuangan','Keuangan.dc.html'],['Proker & task','Proker.dc.html'],['File manager','FileManager.dc.html']],superadmin:[['Sistem & pengguna','SuperAdmin.dc.html'],['Audit modul pengembangan','Workspace.dc.html?role=superadmin']]};
 const quick={mentee:[['Update progres','BerandaMentee.dc.html?update=1']],asmen:[['Catat sesi mentoring','CatatSesi.dc.html'],['Isi penilaian','Penilaian.dc.html']],mentor:[['Catat sesi mentoring','CatatSesi.dc.html'],['Isi penilaian','Penilaian.dc.html']],pengurus:[['Buat event','KelolaEvent.dc.html'],['Buat pengumuman','Pengumuman.dc.html'],['Buka proker & task','Proker.dc.html']],bendahara:[['Buka pencatatan keuangan','Keuangan.dc.html']],superadmin:[['Buka pengelolaan sistem','SuperAdmin.dc.html']]};
 function init(){
  if(document.body.classList.contains('auth-page'))return;
  const role=sessionStorage.getItem('ipb-leap-preview-role')||'mentee';
  const status=document.createElement('aside');status.className='preview-status';status.setAttribute('aria-label','Status pratinjau');
  status.innerHTML='<span title="Data contoh. Catatan modul pengembangan tersimpan di browser ini dan belum tersinkron ke akun lain.">Pratinjau workspace · Data contoh</span><button type="button" id="preview-menu">Menu</button><a href="index.html">Ganti peran</a>';
  document.body.append(status);
  const toast=document.createElement('div');toast.className='app-toast';toast.setAttribute('role','status');document.body.append(toast);let timer;
  function inform(message){toast.textContent=message;clearTimeout(timer);timer=setTimeout(()=>toast.textContent='',6000)}
  function modal(title){const d=document.createElement('dialog');d.className='workspace-dialog';d.setAttribute('aria-label',title);const head=document.createElement('div');head.className='workspace-dialog-head';const h=document.createElement('h2');h.textContent=title;const close=document.createElement('button');close.type='button';close.textContent='Tutup';close.onclick=()=>d.close();head.append(h,close);const body=document.createElement('div');body.className='workspace-dialog-body';d.append(head,body);d.addEventListener('click',e=>{if(e.target===d)d.close()});document.body.append(d);return{dialog:d,body}}
  function currentRole(){return sessionStorage.getItem('ipb-leap-preview-role')||role;}
  function scopedHref(href){const url=new URL(href,location.href);url.searchParams.set('role',currentRole());if(/(?:POC|WorksheetABC|Raport|Workspace|Penilaian|UpdateProgres)\.dc\.html$/.test(url.pathname)){const q=new URLSearchParams(location.search);for(const k of ['person','group','realm','period','month'])if(q.has(k))url.searchParams.set(k,q.get(k));}return url.pathname+url.search;}
  function links(container,entries){container.replaceChildren();for(const [label,href] of entries){const a=document.createElement('a');a.href=scopedHref(href);a.textContent=label;container.append(a)}}
  const common=[['Kalender','Kalender.dc.html'],['Upcoming event','Event.dc.html'],['Chat','Chat.dc.html'],['Pengaturan','Settings.dc.html']];
  const currentEntries=()=>[...(menus[currentRole()]||menus.mentee),...common];
  const entries=currentEntries();
  const nav=modal('Navigasi workspace');links(nav.body,entries);status.querySelector('button').onclick=()=>{links(nav.body,currentEntries());nav.dialog.showModal()};
  const add=modal('Tambah cepat');links(add.body,quick[role]||quick.mentee);
  const search=modal('Cari di workspace');const field=document.createElement('input');field.type='search';field.placeholder='Cari halaman, progres, event…';field.setAttribute('aria-label','Cari halaman');const results=document.createElement('div');results.className='workspace-search-results';search.body.append(field,results);
  function filter(){const term=field.value.trim().toLocaleLowerCase('id');const matches=currentEntries().filter(([label])=>label.toLocaleLowerCase('id').includes(term));links(results,matches);if(!matches.length){const p=document.createElement('p');p.textContent='Halaman tidak ditemukan. Coba kata lain.';results.append(p)}}field.addEventListener('input',filter);filter();
  function openSearch(){field.value='';filter();search.dialog.showModal();field.focus()}
  document.addEventListener('keydown',e=>{if((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==='k'){e.preventDefault();if(!search.dialog.open)openSearch()}});
  function invalid(e,b,field,message){e.preventDefault();e.stopPropagation();let error=document.getElementById('preview-form-error');if(!error){error=document.createElement('p');error.id='preview-form-error';error.className='preview-form-error';error.setAttribute('role','alert');b.parentNode.insertBefore(error,b)}error.textContent=message;if(field){field.setAttribute('aria-invalid','true');field.focus()}inform(message)}
  document.addEventListener('input',e=>{e.target.removeAttribute('aria-invalid');const error=document.getElementById('preview-form-error');if(error)error.remove()});
  document.addEventListener('click',e=>{
   const b=e.target.closest('button');if(!b)return;
   const label=b.getAttribute('aria-label');
   if(label==='Cari (Ctrl K)'){e.preventDefault();openSearch();return}
   if(label==='Tambah cepat'){e.preventDefault();links(add.body,quick[currentRole()]||quick.mentee);add.dialog.showModal();return}
   if(b.dataset.validate){
    const main=b.closest('[role=dialog],dialog')||b.closest('main');
    for(const f of main.querySelectorAll('[data-required]:not(:disabled)')){const min=Number(f.dataset.minlength||1);if(f.value.trim().length<min){invalid(e,b,f,min>1?f.dataset.required+' minimal '+min+' karakter.':'Isi '+f.dataset.required.toLocaleLowerCase('id')+' terlebih dahulu.');return}}
    if(b.dataset.validate==='transaction'){const amount=main.querySelector('[aria-label="Nominal rupiah"]');if(Number(amount.value.replace(/[^0-9]/g,''))<1){invalid(e,b,amount,'Nominal transaksi harus lebih dari 0.');return}}
    if(b.dataset.validate==='event'){
     const dates=[...main.querySelectorAll('input[type="date"]')];const times=[...main.querySelectorAll('input[type="time"]')];
     if(dates.some(f=>!f.value)){invalid(e,b,dates.find(f=>!f.value),'Lengkapi tanggal event dan pendaftaran.');return}
     if(dates[1].value<dates[0].value){invalid(e,b,dates[1],'Tanggal selesai tidak boleh mendahului tanggal mulai.');return}
     if(dates[0].value===dates[1].value&&times[1].value<=times[0].value){invalid(e,b,times[1],'Waktu selesai harus setelah waktu mulai.');return}
     if(dates[3].value<dates[2].value){invalid(e,b,dates[3],'Penutupan pendaftaran harus setelah pembukaan.');return}
     const quota=main.querySelector('input[type="number"]');if(!quota.value||Number(quota.value)<1){invalid(e,b,quota,'Kuota harus minimal 1 peserta.');return}
    }
    if(b.dataset.validate==='announcement'){
     if(/(?:ke|untuk)\s+0\s+orang/.test(b.textContent)){invalid(e,b,null,'Pilih minimal satu penerima.');return}
     const schedule=main.querySelector('[aria-label="Jadwal kirim"]');if(schedule&&(!schedule.value||new Date(schedule.value).getTime()<=Date.now())){invalid(e,b,schedule,'Jadwal kirim harus setelah waktu sekarang.');return}
    }
   }
   if(b.dataset.previewInactive){e.preventDefault();inform('Fitur “'+(label||b.textContent.trim()||'ini')+'” belum terhubung dalam pratinjau.');}
  },true);
  document.addEventListener('click',e=>{const a=e.target.closest('a');if(a&&a.getAttribute('href')==='#'){e.preventDefault();inform('Bagian ini masih berupa pratinjau.')}});
 }
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);else init();
})();
