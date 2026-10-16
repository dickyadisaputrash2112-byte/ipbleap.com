'use strict';
(()=>{
 const roles=['mentee','asmen','mentor','pengurus','bendahara','superadmin'];
 const query=new URLSearchParams(location.search).get('role');
 if(roles.includes(query))sessionStorage.setItem('ipb-leap-preview-role',query);
 const menus={mentee:[['Beranda','BerandaMentee.dc.html'],['Raport','Raport.dc.html']],asmen:[['Ringkasan kelompok','Monitoring.dc.html'],['Monitoring progres','MonitoringProgres.dc.html'],['Catat sesi','CatatSesi.dc.html'],['Penilaian','Penilaian.dc.html']],mentor:[['Ringkasan kelompok','Monitoring.dc.html'],['Monitoring progres','MonitoringProgres.dc.html'],['Catat sesi','CatatSesi.dc.html']],pengurus:[['Beranda','BerandaPengurus.dc.html'],['Event','KelolaEvent.dc.html'],['Pengumuman','Pengumuman.dc.html'],['Proker & task','Proker.dc.html'],['File manager','FileManager.dc.html'],['Template','Template.dc.html']],bendahara:[['Keuangan','Keuangan.dc.html'],['Proker & task','Proker.dc.html'],['File manager','FileManager.dc.html']],superadmin:[['Sistem & pengguna','SuperAdmin.dc.html']]};
 function init(){
  if(document.body.classList.contains('auth-page'))return;
  const role=sessionStorage.getItem('ipb-leap-preview-role')||'mentee';
  const status=document.createElement('aside');status.className='preview-status';status.setAttribute('aria-label','Status pratinjau');
  status.innerHTML='<span>Pratinjau workspace · Data contoh</span><button type="button" id="preview-menu">Menu</button><a href="index.html">Ganti peran</a>';
  document.body.append(status);
  const nav=document.createElement('div');nav.hidden=true;nav.className='preview-nav';nav.setAttribute('role','dialog');nav.setAttribute('aria-modal','true');nav.setAttribute('aria-label','Navigasi workspace');
  const box=document.createElement('div');const close=document.createElement('button');close.textContent='Tutup menu';close.type='button';close.onclick=()=>nav.hidden=true;box.append(close);
  const entries=[...(menus[role]||menus.mentee),['Kalender','Kalender.dc.html'],['Upcoming event','Event.dc.html'],['Chat','Chat.dc.html'],['Pengaturan','Settings.dc.html']];
  for(const [label,href] of entries){const a=document.createElement('a');a.href=href;a.textContent=label;box.append(a)}
  nav.append(box);document.body.append(nav);
  status.querySelector('button').onclick=()=>{nav.hidden=false;close.focus()};nav.onclick=e=>{if(e.target===nav)nav.hidden=true};document.addEventListener('keydown',e=>{if(e.key==='Escape')nav.hidden=true});
  const toast=document.createElement('div');toast.className='app-toast';toast.setAttribute('role','status');document.body.append(toast);let timer;
  document.addEventListener('click',e=>{const a=e.target.closest('a');if(a&&a.getAttribute('href')==='#'){e.preventDefault();toast.textContent='Bagian ini masih berupa pratinjau.';clearTimeout(timer);timer=setTimeout(()=>toast.textContent='',3500)}});
 }
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);else init();
})();
