import {downloadGrowPdf,growPdfBytes,growPdfName} from '../grow/pdf.mjs?v=20261115-grow-all';
import {zipFiles} from '../grow/zip.mjs?v=20261115-grow-all';
import {sendAccessLink} from './mailer.mjs?v=20261118-mailer';
import {validateRoster,provisionRoster,activationCSV} from './import.mjs';
import {openRepository} from './repository.mjs?v=20261107-grow-draft';
import {periods,phaseName,phaseDates} from '../grow/phases.mjs';
import {attendanceState,menteeAttendance} from '../attendance/api.mjs';
import {MANAGER,ACTOR_KEY,ROLES,TRACKS,participantProgress} from './store.mjs?v=20261107-group-roster';

const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const stamp=s=>s?new Intl.DateTimeFormat('id-ID',{timeZone:'Asia/Jakarta',dateStyle:'medium',timeStyle:'short'}).format(new Date(s))+' WIB':'Belum ada aktivitas';
const tag=(s,kind='')=>`<span class="mg-tag ${kind}">${esc(s)}</span>`;
const initials=s=>s.split(/\s+/).slice(0,2).map(x=>x[0]).join('').toUpperCase();
const btn=(s,action,style='secondary',disabled=false)=>`<button type="button" class="mg-button ${style}" data-action="${action}" ${disabled?'disabled':''}>${s}</button>`;
const options=(items,value,placeholder='Pilih…')=>`<option value="">${placeholder}</option>`+items.map(x=>{const [v,l]=Array.isArray(x)?x:[x,x];return `<option value="${esc(v)}" ${v===value?'selected':''}>${esc(l)}</option>`;}).join('');
const select=(name,label,items,value='',extra='')=>`<label class="mg-field">${label}<select name="${name}" ${extra}>${options(items,value)}</select></label>`;
const input=(name,label,value='',type='text',extra='')=>`<label class="mg-field">${label}<input name="${name}" type="${type}" value="${esc(value)}" ${extra}></label>`;
const empty=(title,description,action='')=>`<div class="mg-empty"><div class="mg-empty-mark" aria-hidden="true">↗</div><h3>${title}</h3><p>${description}</p>${action}</div>`;

export async function mount(){
 const root=document.querySelector('#management');
 let repository;try{repository=await openRepository({cohort:new URLSearchParams(location.search).get('cohort')});}catch(e){root.innerHTML=empty('Pengelolaan belum dapat dibuka',esc(e.message));return;}
 const {store,actor,local}=repository;const text=(a,b)=>local?a:b;let state,cohortId,tab='accounts',search='',roleFilter='',trackFilter='',groupFilter='',dialogRevision=0,returnFocus=null;
 const q=new URLSearchParams(location.search);let attendanceSequence=0;let selected=q.get('mentee');cohortId=q.get('cohort');
 // Returning to management leaves the explicit local participant rehearsal.
 if(q.get('pengelola')==='1')sessionStorage.removeItem(ACTOR_KEY);

 if(actor.id!==MANAGER.id&&!actor.roles.includes('system')&&!(actor.roles.includes('program')&&store.read().staff.some(x=>x.user_id===actor.id&&x.can_manage))){root.innerHTML=empty('Pengelolaan akun tidak tersedia',text('Peran lokal ini tidak mengelola akun. Gunakan tautan Kembali ke pengelola lokal pada pita di atas.','Akun ini belum mendapat kewenangan mengelola cohort.'));return;}
 function message(s,error=false){const el=root.querySelector('#mg-message');el.textContent=s;el.classList.toggle('error',error);}
 function load(){state=store.read();if(!state.cohorts.some(c=>c.id===cohortId))cohortId=state.cohorts.at(-1)?.id||'';}
 const managesBatch=()=>actor.roles.includes('program')&&state.staff.some(x=>x.user_id===actor.id&&x.cohort_id===cohortId&&x.can_manage);
 const canScan=()=>local&&actor.id===MANAGER.id||managesBatch();
 const currentCohort=()=>state.cohorts.find(c=>c.id===cohortId);
 const cohortGroups=()=>state.groups.filter(g=>g.cohort_id===cohortId&&!g.archived_at);
 const groupOf=id=>cohortGroups().find(g=>state.members.some(m=>m.user_id===id&&m.group_id===g.id&&m.active));
 const people=()=>state.enrolments.filter(e=>e.cohort_id===cohortId).map(e=>({...e,profile:state.profiles.find(p=>p.id===e.user_id)})).filter(e=>e.profile);
 const profile=id=>state.profiles.find(p=>p.id===id);
 function filtered(){return people().filter(e=>(!roleFilter||e.role===roleFilter)&&(!trackFilter||e.field===trackFilter)&&(!groupFilter||groupOf(e.user_id)?.id===groupFilter)&&(!search||`${e.profile.display_name} ${e.profile.email}`.toLowerCase().includes(search.toLowerCase())));}
 function stats(){const p=people(),mentees=p.filter(e=>e.role==='mentee'),active=mentees.filter(e=>e.active&&e.profile.active),review=active.filter(e=>participantProgress(state,e.user_id,cohortId).needsReview),published=active.filter(e=>participantProgress(state,e.user_id,cohortId).publication);return `<div class="mg-stats">${[[p.length,'Akun dalam cohort','Semua peran yang didaftarkan'],[active.length,'Mentee aktif',mentees.length+' mentee terdaftar'],[review.length,'Perlu pemeriksaan','Ada pengajuan yang menunggu pendamping'],[published.length,'Memiliki raport','Hanya raport yang sudah diterbitkan']].map(([n,l,h])=>`<article class="mg-stat"><span>${l}</span><strong>${n}</strong><small>${h}</small></article>`).join('')}</div>`;}
 function filters(){return `<div class="mg-filter">${input('search','Cari akun',search,'search','placeholder="Nama atau email"')}${select('roleFilter','Peran',Object.entries(ROLES),roleFilter)}${select('trackFilter','Track',TRACKS.map(t=>t.field),trackFilter)}${select('groupFilter','Kelompok',cohortGroups().map(g=>[g.id,g.name]),groupFilter)}</div>`;}
 function accountRows(){return filtered().map(e=>{const p=e.profile,g=groupOf(p.id);return `<tr><td><div class="mg-person"><span class="mg-avatar">${esc(initials(p.display_name))}</span><div><strong>${esc(p.display_name)}</strong><small>${esc(p.email)}</small></div></div></td><td data-label="Peran">${tag(ROLES[e.role],'blue')}</td><td data-label="Track / pathway"><div>${esc(e.field||'—')}<p class="mg-sub">${esc(e.pathway||'')}</p></div></td><td data-label="Kelompok">${esc(g?.name||'Belum ditempatkan')}</td><td data-label="Status">${tag(p.active&&e.active?text('Aktif lokal','Aktif'):!p.active?text('Nonaktif','Menunggu aktivasi'):'Nonaktif di cohort',p.active&&e.active?'success':'')}</td><td><div class="mg-actions">${e.role==='mentee'?btn('Lihat progres','detail:'+p.id,'small'):''}${btn('Edit','edit:'+p.id,'secondary small')}${!local&&!p.active?btn('Aktivasi','activate:'+p.id,'secondary small'):''}${canResetPassword(p)?btn('Reset password','resetpw:'+p.id,'secondary small'):''}${!local&&actor.roles.includes('system')&&p.active&&!e.active?btn('Aktifkan di cohort','reenrol:'+p.id,'secondary small'):''}</div></td></tr>`;}).join('');}
 function accounts(){return `<section class="mg-card"><div class="mg-heading"><div><h2>Akun & peserta</h2><p class="mg-sub">Atur identitas, peran, dan penempatan peserta dalam program.</p></div>${btn('+ Tambah akun','account','',!cohortId)}</div>${filters()}<div id="mg-results">${accountResults()}</div></section>`;}
 function accountResults(){return filtered().length?`<div class="mg-table-wrap"><table class="mg-table"><thead><tr>${['Nama & email','Peran','Track / pathway','Kelompok','Status','Tindakan'].map(t=>`<th scope="col">${t}</th>`).join('')}</tr></thead><tbody>${accountRows()}</tbody></table></div><p class="mg-status-note">${filtered().length} akun ditampilkan · ${text('Akun lokal belum menjadi akun login LMS.','Akun menggunakan login IPB LEAP yang sama.')}</p>`:empty(people().length?'Tidak ada akun yang cocok':'Belum ada akun',people().length?'Coba ubah pencarian atau filter.':'Tambahkan Mentor, Asisten Mentor, mentee, atau pengurus. Setiap akun baru dimulai tanpa nilai dan aktivitas.',cohortId?btn('+ Tambah akun','account',''):btn('+ Buat cohort','cohort',''));}
 function monitoring(){const mentees=filtered().filter(e=>e.role==='mentee');return `${growOverviewPanel()}<section class="mg-card"><div class="mg-heading"><div><h2>Progres masing-masing mentee</h2><p class="mg-sub">${text('Status bersumber dari catatan lokal yang tersimpan, tanpa persentase atau nilai perkiraan.','Status berasal dari catatan program dan raport yang sudah diterbitkan.')}</p></div>${tag('Metadata progres','blue')}</div>${filters()}<div id="mg-results">${monitoringResults(mentees)}</div></section>`;}
 function monitoringResults(rows=filtered().filter(e=>e.role==='mentee')){return rows.length?`<div class="mg-table-wrap"><table class="mg-table"><thead><tr>${['Mentee','Mentoring','Kontrak','Hasil KPI','Kehadiran','Raport','Tindakan'].map(t=>`<th scope="col">${t}</th>`).join('')}</tr></thead><tbody>${rows.map(e=>{const p=participantProgress(state,e.user_id,cohortId);return `<tr><td><div class="mg-person"><span class="mg-avatar">${esc(initials(e.profile.display_name))}</span><div><strong>${esc(e.profile.display_name)}</strong><small>${esc(groupOf(e.user_id)?.name||'Belum ada kelompok')}</small></div></div></td><td data-label="Mentoring">${p.mentoring} catatan</td><td data-label="Kontrak">${tag(p.contract,p.contract==='Disepakati'?'success':'')}</td><td data-label="Hasil KPI">${tag(p.actual,p.actual==='Diajukan'?'pending':'')}</td><td data-label="Kehadiran"><span data-mg-attendance-user="${e.user_id}">Memuat…</span></td><td data-label="Raport">${p.publication?tag('M'+p.publication.period+' · '+p.publication.score.total,'success'):tag('Belum diterbitkan')}</td><td>${btn('Lihat progres','detail:'+e.user_id,'small')}</td></tr>`;}).join('')}</tbody></table></div>`:empty('Belum ada mentee untuk dipantau','Daftarkan mentee pada cohort ini, atau ubah filter. Progres akan muncul setelah peserta menyimpan catatan program.');}
 function groups(){const list=cohortGroups();return `<section class="mg-card"><div class="mg-heading"><div><h2>Kelompok & pendamping</h2><p class="mg-sub">Satu Mentor, satu Asmen, dan lima mentee dalam track yang sama mengikuti struktur program yang ada.</p></div>${btn('+ Tambah kelompok','group','',!cohortId)}</div>${list.length?`<div class="mg-grid" style="margin-top:22px">${list.map(g=>{const members=state.members.filter(m=>m.group_id===g.id&&m.active);return `<article class="mg-list-item"><div class="mg-heading"><h3>${esc(g.name)}</h3><div class="mg-actions">${btn('Edit kelompok','editgroup:'+g.id,'secondary small')}${btn('Hapus kelompok','archivegroup:'+g.id,'secondary small')}</div>${tag(g.active?'Lengkap':'Penempatan / aktivasi belum lengkap',g.active?'success':'pending')}</div><p class="mg-sub">${esc(g.field)}</p><dl class="mg-details" style="margin:20px 0"><div><dt>Mentor</dt><dd>${esc(profile(g.mentor_id)?.display_name||'Belum ditetapkan')}</dd></div><div><dt>Asmen</dt><dd>${esc(profile(g.asmen_id)?.display_name||'Belum ditetapkan')}</dd></div><div><dt>Mentee</dt><dd>${members.length} / 5</dd></div></dl>${members.map(m=>`<div class="mg-heading" style="margin-top:10px"><span style="font-size:12px">${esc(profile(m.user_id)?.display_name)}</span>${btn('Progres','detail:'+m.user_id,'secondary small')}</div>`).join('')||'<p class="mg-sub">Tempatkan mentee melalui Edit akun.</p>'}</article>`;}).join('')}</div>`:empty('Kelompok belum disusun','Tambahkan akun Mentor dan Asmen terlebih dahulu, kemudian buat kelompok dan tempatkan mentee sesuai track.',btn('+ Tambah kelompok','group','',!cohortId))}</section>`;}
 function draftPanel(){
  if(local||!managesBatch())return '';
  return `<section class="mg-card">
    <h2>Draf GROW Canvas</h2>
    <p class="mg-sub">Akses baca untuk Pengurus batch ini.</p>
    <details id="mg-grow-draft" style="margin-top:14px">
      <summary>Baca draf GROW</summary>
      <div data-grow-draft-content aria-live="polite"></div>
    </details>
  </section>`;
 }
 function bindDraftPanel(){
  const panel=root.querySelector('#mg-grow-draft');
  if(!panel)return;
  const content=panel.querySelector('[data-grow-draft-content]');
  const cohort=currentCohort(),mentee=selected;
  let request=0;
  panel.addEventListener('toggle',async()=>{
   const current=++request;
   content.textContent='';
   if(!panel.open)return;
   content.textContent='Memuat draf GROW…';
   try{
    const draft=await store.growDraft(cohort.id,mentee);
    if(current!==request||!panel.isConnected)return;
    if(!draft){content.textContent='Belum ada draf GROW yang tersimpan.';return;}
    const data=draft.data;
    let labels=new Map(),catalog=[];
    if(data.kpis?.length){
     catalog=await fetch(new URL('../grow/catalog.json',import.meta.url)).then(r=>r.ok?r.json():[]).catch(()=>[]);
     labels=new Map(catalog.flatMap(track=>track.kpis.map(kpi=>[kpi.id,kpi.label])));
    }
    if(current!==request||!panel.isConnected)return;
    const facts=items=>`<dl class="mg-details">${items.map(([label,value])=>`<div><dt>${esc(label)}</dt><dd style="white-space:pre-wrap;overflow-wrap:anywhere">${esc(value||'Belum diisi')}</dd></div>`).join('')}</dl>`;
    content.innerHTML=`<p class="mg-sub">Terakhir disimpan ${stamp(draft.savedAt)}</p>`+facts([
     ['Goal · Tujuan',data.goal],['Alasan',data.why],['Reality · Kondisi dan hambatan',data.reality],
     ['Dukungan Mentor',data.mentorNeed],['Options · Pilihan strategi',data.options],['Way Forward · Langkah awal',data.wayForward]
    ])+`<h3>KPI dan milestone</h3>`+(data.kpis||[]).map(kpi=>`<section class="mg-list-item">
     <h4>${esc(labels.get(kpi.id)||kpi.id)}</h4>
     ${facts([['Baseline',kpi.baseline],['Cara ukur dan bukti',kpi.measurement],
      ...periods.map(period=>[phaseName(period)+' · '+phaseDates(period,cohort.starts_on),kpi.milestones?.[period]])])}
    </section>`).join('');
    if(!data.kpis?.length)content.insertAdjacentHTML('beforeend','<p class="mg-sub">Belum ada KPI yang ditambahkan.</p>');
    const download=document.createElement('button');
    download.type='button';download.className='mg-button secondary';download.textContent='Unduh PDF';
    download.onclick=async()=>{
     download.disabled=true;
     try{
      const enrolment=people().find(e=>e.user_id===mentee);
      const track=catalog.find(t=>t.track===enrolment?.field);
      await downloadGrowPdf({
       canvas:{...draft,status:'Draft'},name:profile(mentee).display_name,
       batch:cohort.name,startsOn:cohort.starts_on,group:groupOf(mentee)?.name,
       track:enrolment?.field,northStar:track?.northStar,kpiLabels:Object.fromEntries(labels)
      });
      if(panel.isConnected)message('PDF draf GROW siap diunduh.');
     }catch(error){if(panel.isConnected)message(error.message||'PDF belum dapat dibuat. Coba lagi.',true);}
     finally{if(download.isConnected)download.disabled=false;}
    };
    content.append(download);

   }catch(e){
    if(current===request&&panel.isConnected)content.textContent=e.message||'Draf belum dapat dimuat.';
   }
  });
 }
 const growFilled=data=>Boolean(data)&&(['goal','why','reality','mentorNeed','options','wayForward'].some(k=>String(data[k]||'').trim())||(data.kpis||[]).some(k=>String(k.baseline||'').trim()||String(k.measurement||'').trim()||Object.values(k.milestones||{}).some(v=>String(v||'').trim())));
 let growCache=null;
 async function loadGrowDrafts(cohort,mentees,onProgress=()=>{},fresh=false){
  if(!fresh&&growCache?.cohort===cohort.id)return growCache;
  const filled=[],empty=[],failed=[];let done=0;const queue=[...mentees];
  const worker=async()=>{for(let e=queue.shift();e;e=queue.shift()){
   try{const draft=await store.growDraft(cohort.id,e.user_id);(growFilled(draft?.data)?filled:empty).push({e,draft});}
   catch{failed.push(e);}
   onProgress(++done,mentees.length);
  }};
  await Promise.all(Array.from({length:Math.min(4,mentees.length)},worker));
  const byName=(a,b)=>(a.e||a).profile.display_name.localeCompare((b.e||b).profile.display_name,'id');
  filled.sort(byName);empty.sort(byName);failed.sort(byName);
  return growCache={cohort:cohort.id,filled,empty,failed,at:new Date().toISOString()};
 }
 function growOverviewPanel(){
  if(local||!managesBatch())return '';
  return `<section class="mg-card" id="mg-grow-overview"><div class="mg-heading"><div><h2>Pengisian GROW Canvas</h2><p class="mg-sub">Siapa saja yang sudah dan belum mengisi GROW Canvas di cohort ini.</p></div><div class="mg-actions">${btn('Perbarui','growrefresh','secondary small')}${btn('Unduh daftar nama','growlist','secondary small')}${btn('Unduh semua GROW Canvas','growall','secondary small')}</div></div><div data-grow-overview aria-live="polite"><p class="mg-sub">Memuat data GROW Canvas…</p></div></section>`;
 }
 async function refreshGrowOverview(fresh=false){
  const box=root.querySelector('[data-grow-overview]');if(!box)return;
  const cohort=currentCohort();
  const mentees=people().filter(e=>e.role==='mentee'&&e.active);
  if(!cohort||!mentees.length){box.innerHTML='<p class="mg-sub">Belum ada mentee aktif di cohort ini.</p>';return;}
  if(fresh||growCache?.cohort!==cohort.id)box.innerHTML='<p class="mg-sub">Memuat data GROW Canvas…</p>';
  try{
   const r=await loadGrowDrafts(cohort,mentees,(done,total)=>{if(box.isConnected)box.innerHTML=`<p class="mg-sub">Memuat data GROW Canvas ${done}/${total}…</p>`;},fresh);
   if(!box.isConnected)return;
   const total=r.filled.length+r.empty.length+r.failed.length,pct=total?Math.round(r.filled.length*100/total):0;
   const person=({e,draft},kind)=>`<li class="mg-list-item" style="padding:12px 14px"><div class="mg-person" style="min-width:0"><span class="mg-avatar">${esc(initials(e.profile.display_name))}</span><div><strong>${esc(e.profile.display_name)}</strong><small>${esc(groupOf(e.user_id)?.name||'Belum ada kelompok')}${kind==='filled'?' · '+esc(draft.status||'Draft')+' · '+esc(stamp(draft.savedAt)):''}</small></div></div></li>`;
   const list=(title,items,kind,tone)=>`<section><div class="mg-heading"><h3 style="margin:0">${title}</h3>${tag(items.length+' orang',tone)}</div>${items.length?`<ul class="mg-list" style="list-style:none;padding:0;margin-top:12px">${items.map(x=>person(x,kind)).join('')}</ul>`:`<p class="mg-sub">Tidak ada.</p>`}</section>`;
   box.innerHTML=`<div class="mg-stats" style="margin:20px 0">${[[r.filled.length,'Sudah mengisi',pct+'% dari '+total+' mentee aktif'],[r.empty.length,'Belum mengisi','Belum ada isian tersimpan'],[total,'Mentee aktif','Di cohort ini'],[pct+'%','Tingkat pengisian','Diperbarui '+stamp(r.at)]].map(([n,l,h])=>`<article class="mg-stat"><span>${l}</span><strong>${n}</strong><small>${h}</small></article>`).join('')}</div><div style="height:8px;border-radius:99px;background:#EFF2F9;overflow:hidden;margin-bottom:22px" role="img" aria-label="${pct}% sudah mengisi"><div style="height:100%;width:${pct}%;background:#32306F"></div></div><div class="mg-grid">${list('Sudah mengisi',r.filled,'filled','success')}${list('Belum mengisi',r.empty,'empty','pending')}</div>${r.failed.length?`<p class="mg-message error" style="margin-top:16px">Data ${r.failed.length} mentee belum dapat dimuat: ${esc(r.failed.map(e=>e.profile.display_name).join(', '))}. Klik Perbarui untuk mencoba lagi.</p>`:''}`;
  }catch(error){if(box.isConnected)box.innerHTML=`<p class="mg-message error">${esc(error.message||'Data GROW Canvas belum dapat dimuat.')}</p>`;}
 }
 async function downloadGrowList(button){
  if(button.disabled)return;
  const cohort=currentCohort();if(!cohort)return;
  const mentees=people().filter(e=>e.role==='mentee'&&e.active);
  if(!mentees.length){message('Belum ada mentee aktif di cohort ini.',true);return;}
  const label=button.textContent;button.disabled=true;
  try{
   const r=await loadGrowDrafts(cohort,mentees,(done,total)=>{button.textContent='Memuat '+done+'/'+total+'…';});
   const cell=v=>'"'+String(v??'').replace(/"/g,'""')+'"';
   const row=(e,fill,draft)=>[fill,e.profile.display_name,e.profile.email,groupOf(e.user_id)?.name||'',e.field||'',e.pathway||'',draft?draft.status||'Draft':'',draft?.savedAt?stamp(draft.savedAt):''];
   const rows=[['Status pengisian','Nama','Email','Kelompok','Track','Pathway','Status GROW','Terakhir disimpan'],
    ...r.filled.map(({e,draft})=>row(e,'Sudah mengisi',draft)),
    ...r.empty.map(({e})=>row(e,'Belum mengisi',null)),
    ...r.failed.map(e=>row(e,'Gagal dimuat',null))];
   const slug=String(cohort.name||'cohort').replace(/[^\p{L}\p{N}]+/gu,'-').replace(/^-|-$/g,'')||'cohort';
   const url=URL.createObjectURL(new Blob(['﻿'+rows.map(x=>x.map(cell).join(',')).join('\r\n')],{type:'text/csv;charset=utf-8'})),a=document.createElement('a');
   a.href=url;a.download='Daftar-Pengisian-GROW-'+slug+'-'+new Date().toISOString().slice(0,10)+'.csv';document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),60000);
   message('Daftar diunduh: '+r.filled.length+' sudah mengisi, '+r.empty.length+' belum mengisi'+(r.failed.length?', '+r.failed.length+' gagal dimuat':'')+'.',Boolean(r.failed.length));
  }catch(error){message(error.message||'Daftar belum dapat diunduh. Coba lagi.',true);}
  finally{if(button.isConnected){button.disabled=false;button.textContent=label;}refreshGrowOverview();}
 }
 async function downloadAllGrow(button){
  if(button.disabled)return;
  const cohort=currentCohort();if(!cohort)return;
  const mentees=people().filter(e=>e.role==='mentee'&&e.active);
  if(!mentees.length){message('Belum ada mentee di cohort ini.',true);return;}
  const label=button.textContent;button.disabled=true;
  try{
   const catalog=await fetch(new URL('../grow/catalog.json',import.meta.url)).then(r=>r.ok?r.json():[]).catch(()=>[]);
   const labels=new Map(catalog.flatMap(track=>track.kpis.map(kpi=>[kpi.id,kpi.label])));
   const result=await loadGrowDrafts(cohort,mentees,(done,total)=>{button.textContent='Memuat '+done+'/'+total+'…';},true);
   const filled=result.filled,failed=result.failed.map(e=>e.profile.display_name);
   if(!filled.length){message(failed.length?'GROW Canvas belum dapat dimuat untuk '+failed.length+' mentee. Coba lagi.':'Belum ada mentee yang mengisi GROW Canvas.',Boolean(failed.length));return;}
   filled.sort((a,b)=>a.e.profile.display_name.localeCompare(b.e.profile.display_name,'id'));
   const files=[],used=new Set();
   const csvCell=v=>'"'+String(v??'').replace(/"/g,'""')+'"';
   const rows=[['Nama','Email','Kelompok','Track','Pathway','Status','Terakhir disimpan','Goal','Alasan','Reality','Dukungan Mentor','Options','Way Forward','KPI dan milestone']];
   for(const [index,{e,draft}] of filled.entries()){
    button.textContent='Membuat PDF '+(index+1)+'/'+filled.length+'…';
    const data=draft.data,track=catalog.find(t=>t.track===e.field),status=draft.status||'Draft',name=e.profile.display_name;
    let file=growPdfName(name);for(let n=2;used.has(file);n++)file=growPdfName(name+' '+n);used.add(file);
    files.push({name:'PDF/'+file,data:await growPdfBytes({canvas:{...draft,status},name,batch:cohort.name,startsOn:cohort.starts_on,group:groupOf(e.user_id)?.name,track:e.field,northStar:track?.northStar,kpiLabels:Object.fromEntries(labels)})});
    const kpis=(data.kpis||[]).map(k=>[labels.get(k.id)||k.id,'Baseline: '+(k.baseline||'-'),'Cara ukur: '+(k.measurement||'-'),...periods.map(p=>phaseName(p)+': '+(k.milestones?.[p]||'-'))].join(' | ')).join('\n');
    rows.push([name,e.profile.email,groupOf(e.user_id)?.name||'',e.field||'',e.pathway||'',status,stamp(draft.savedAt),data.goal,data.why,data.reality,data.mentorNeed,data.options,data.wayForward,kpis]);
   }
   files.push({name:'Rekap-GROW-Canvas.csv',data:'﻿'+rows.map(r=>r.map(csvCell).join(',')).join('\r\n')});
   const slug=String(cohort.name||'cohort').replace(/[^\p{L}\p{N}]+/gu,'-').replace(/^-|-$/g,'')||'cohort';
   const url=URL.createObjectURL(zipFiles(files)),a=document.createElement('a');
   a.href=url;a.download='GROW-Canvas-'+slug+'-'+new Date().toISOString().slice(0,10)+'.zip';document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),60000);
   message(filled.length+' dari '+mentees.length+' mentee sudah mengisi GROW Canvas dan diunduh.'+(failed.length?' '+failed.length+' mentee belum dapat dimuat: '+failed.join(', ')+'.':''),Boolean(failed.length));
  }catch(error){message(error.message||'Unduhan GROW Canvas belum berhasil. Coba lagi.',true);}
  finally{if(button.isConnected){button.disabled=false;button.textContent=label;}refreshGrowOverview();}
 }
 const canResetPassword=p=>!local&&actor.roles.includes('system')&&p.active&&p.id!==actor.id&&!(p.roles||[]).includes('system');
 function accountPayload(id,active){
  const p=profile(id),e=state.enrolments.find(x=>x.user_id===id&&x.cohort_id===cohortId);
  if(!p||!e)throw Error('Akun ini belum terdaftar di cohort yang dipilih.');
  const data={id,display_name:p.display_name,email:p.email,role:e.role,cohort_id:cohortId,active};
  if(e.role==='mentee'){data.field=e.field||'';data.pathway=e.pathway||'';data.group_id=groupOf(id)?.id||'';}
  if(e.role==='event')data.division=e.division||'Operation & Communication';
  return data;
 }
 async function resetPassword(id,button){
  const p=profile(id);if(!p||button.disabled)return;
  if(!confirm('Reset password '+p.display_name+'?\n\nAkun dinonaktifkan sementara sampai pemiliknya membuat password baru lewat tautan reset. Data, kelompok, dan riwayatnya tetap utuh.'))return;
  button.disabled=true;let deactivated=false;
  try{
   await store.account(accountPayload(id,false),state.revision);deactivated=true;
   const activation=await store.reissue(id,cohortId);
   await store.reload(cohortId);render();
   showActivation(activation.url,p,'reset');
  }catch(error){
   if(deactivated){try{await store.reload(cohortId);await store.account(accountPayload(id,true),store.read().revision);}catch{}}
   try{await store.reload(cohortId);}catch{}
   render();message((error.message||'Reset password belum berhasil.')+(deactivated?' Akun sudah dicoba diaktifkan kembali; periksa statusnya.':''),true);
  }finally{if(button.isConnected)button.disabled=false;}
 }
 async function reenrol(id,button){
  if(button.disabled)return;button.disabled=true;
  try{await store.account(accountPayload(id,true),state.revision);await store.reload(cohortId);render();message(profile(id).display_name+' aktif kembali di cohort.');}
  catch(error){message(error.message||'Belum berhasil mengaktifkan di cohort.',true);}
  finally{if(button.isConnected)button.disabled=false;}
 }
 function detail(){const e=people().find(e=>e.user_id===selected&&e.role==='mentee');if(!e){selected=null;return accounts();}const p=e.profile,g=groupOf(p.id),progress=participantProgress(state,p.id,cohortId),kindNames={mentoring:'Mentoring',poc:'Personal Outcome Contract',actual:'Hasil KPI',abc:'Worksheet ABC',checkin:'Check-in sebelumnya',review:'Penilaian',portfolio:'Portofolio akhir'};return `${btn('← Kembali ke daftar','back','secondary small')}<section class="mg-card"><div class="mg-heading"><div class="mg-person"><span class="mg-avatar">${esc(initials(p.display_name))}</span><div><h2>${esc(p.display_name)}</h2><p class="mg-sub">${esc(p.email)}</p></div></div>${tag(p.active?text('Aktif lokal','Aktif'):text('Nonaktif','Menunggu aktivasi'),p.active?'success':'')}</div><dl class="mg-details" style="margin:24px 0 0">${[['Track',e.field||'Belum ditetapkan'],['Pathway',e.pathway||'Belum ditetapkan'],['Kelompok',g?.name||'Belum ditempatkan'],['Mentor',profile(g?.mentor_id)?.display_name||'Belum ditetapkan'],['Asisten Mentor',profile(g?.asmen_id)?.display_name||'Belum ditetapkan'],['Aktivitas terakhir',stamp(progress.updated)]].map(([k,v])=>`<div><dt>${k}</dt><dd>${esc(v)}</dd></div>`).join('')}</dl></section><div class="mg-grid">${[['Mentoring',progress.mentoring+' catatan',progress.submittedMentoring+' diajukan / diperiksa'],['Personal Outcome Contract',progress.contract,'Milestone M3 · M6 · M9 · M12'],['Hasil KPI',progress.actual,'Aktual dan bukti sesuai periode'],['Raport',progress.publication?'M'+progress.publication.period+' · '+progress.publication.score.total:'Belum diterbitkan','Hanya hasil publikasi penilai']].map(([t,v,h])=>`<section class="mg-card"><h2>${t}</h2><p style="font-size:22px;font-weight:800;color:#32306F;margin:18px 0 8px">${esc(v)}</p><p class="mg-sub">${esc(h)}</p></section>`).join('')}</div>${draftPanel()}<section class="mg-card"><h2>Riwayat progres</h2><p class="mg-sub">Bagian ini menampilkan ringkasan status dan waktu.</p>${progress.records.length?`<div class="mg-list">${[...progress.records].sort((a,b)=>String(b.updated_at).localeCompare(String(a.updated_at))).map(r=>`<article class="mg-list-item"><div class="mg-heading"><h3>${esc(kindNames[r.kind]||r.kind)} · M${r.month_no}</h3>${tag(r.latest_status,r.latest_status==='Diajukan'?'pending':'')}</div><p class="mg-sub">Versi ${r.versions.length} · ${stamp(r.updated_at)}</p><p class="mg-sub">${r.checks.length} pemeriksaan · ${r.publications.length} publikasi</p></article>`).join('')}</div>`:empty('Belum ada aktivitas','Akun baru belum memiliki mentoring, kontrak, aktual, atau nilai. Status akan diperbarui setelah peserta menyimpan catatannya.')}</section><section class="mg-card" id="mg-attendance"><h2>Kehadiran mentee</h2><p class="mg-sub">Memuat dari database kehadiran…</p></section>${local?`<section class="mg-notice"><strong>Coba alur peserta di versi lokal</strong><p>Masuk ke simulasi mentee ini, simpan draft Mentoring atau kontrak, lalu kembali ke pengelola untuk melihat perubahan progres. Ini pilihan tampilan lokal, bukan hak menyamar sebagai pengguna pada LMS produksi.</p>${btn('Buka Mentoring mentee · lokal','rehearse:'+p.id,'small',!p.active)}</section>`:''}`;}
 function history(){return `<section class="mg-card"><h2>Riwayat pengelolaan</h2><p class="mg-sub">${text('Perubahan akun, cohort dan kelompok pada browser ini. Identitas operator lokal tidak mewakili akun produksi.','Perubahan akun, cohort dan kelompok dicatat bersama identitas operator dan waktu server.')}</p>${state.audit.length?`<div class="mg-list">${[...state.audit].reverse().map(a=>`<div class="mg-list-item"><h3>${esc(a.summary)}</h3><p class="mg-sub">${stamp(a.created_at)}</p></div>`).join('')}</div>`:empty('Belum ada perubahan','Riwayat akan terisi setelah kamu membuat cohort, akun atau kelompok.')}</section>`;}
 function render(){load();root.innerHTML=`<section class="mg-hero"><div><span class="mg-eyebrow">Ruang pengurus & pengelola</span><h1>Setiap mentee,<br>satu perjalanan utuh.</h1><p>Kelola akun dan penempatan peserta. Pantau mentoring, arah program, hasil KPI, dan raport dalam satu tempat.</p></div><div class="mg-actions">${btn('+ Tambah akun','account','light',!cohortId)}${!local?btn('Daftarkan peserta massal','import','ghost',!cohortId):''}${local||actor.roles.includes('system')?btn('+ Cohort','cohort','ghost'):''}${btn('Muat ulang','reload','ghost')}${canScan()?'<a class="mg-button ghost" href="absensi-pengurus.html">Scan absen ↗</a>':''}</div></section><div id="mg-message" class="mg-message" role="status" aria-live="polite"></div><div class="mg-heading"><label class="mg-field" style="min-width:220px">Cohort<select id="mg-cohort">${options(state.cohorts.map(c=>[c.id,c.name]),cohortId,'Belum ada cohort')}</select></label><p class="mg-status-note">${currentCohort()?esc(currentCohort().starts_on)+' — '+esc(currentCohort().ends_on):'Mulai dengan membuat cohort program.'}<br>${text('Disimpan di browser ini','Terhubung ke Supabase')} · Waktu Asia/Jakarta</p></div>${stats()}${!selected?`<div class="mg-tabs" aria-label="Bagian pengelolaan">${[['accounts','Akun'],['monitoring','Progres mentee'],['groups','Kelompok'],['history','Riwayat']].map(([v,l])=>`<button type="button" data-tab="${v}" aria-pressed="${tab===v}">${l}</button>`).join('')}${canScan()?'<a class="mg-button secondary small" href="absensi-pengurus.html">Absensi ↗</a>':''}</div>`:''}${selected?detail():({accounts,monitoring,groups,history}[tab])()}<p class="mg-status-note">${text('Akun lokal tidak mengirim email atau tautan aktivasi. Progres hanya berasal dari data yang kamu masukkan pada versi lokal ini.','Akun baru diaktifkan melalui tautan pribadi yang dibagikan pengelola. Email tidak dikirim otomatis. Ringkasan progres tidak membuka jawaban pribadi peserta.')}</p><dialog class="mg-dialog" id="mg-dialog" aria-labelledby="mg-dialog-title"></dialog>`;
  refreshAttendance();
  bindDraftPanel();
  refreshGrowOverview();
  root.querySelector('#mg-cohort').onchange=async e=>{const next=e.target.value;try{if(!local)await store.reload(next);cohortId=next;groupFilter='';selected=null;updateURL();render();}catch(error){message(error.message,true);e.target.value=cohortId;}};
  for(const [name,set]of[['search',v=>search=v],['roleFilter',v=>roleFilter=v],['trackFilter',v=>trackFilter=v],['groupFilter',v=>groupFilter=v]]){const f=root.querySelector(`[name="${name}"]`);if(f)f.addEventListener(name==='search'?'input':'change',()=>{set(f.value);root.querySelector('#mg-results').innerHTML=tab==='monitoring'?monitoringResults():accountResults();refreshAttendance();});}
 }
 async function refreshAttendance(){const seq=++attendanceSequence;if(!canScan()){for(const el of root.querySelectorAll('[data-mg-attendance-user]'))el.textContent='Pengurus bertugas';const box=root.querySelector('#mg-attendance');if(box)box.innerHTML='<h2>Kehadiran mentee</h2><p class="mg-sub">Rekap dan kartu presensi diakses oleh pengurus yang ditugaskan mencatat kehadiran.</p>';return;}try{const a=await attendanceState(state,cohortId);if(seq!==attendanceSequence)return;for(const el of root.querySelectorAll('[data-mg-attendance-user]')){const list=menteeAttendance(a,el.dataset.mgAttendanceUser);el.textContent=list.length?list.filter(e=>e.attendance?.status==='Hadir').length+' / '+list.length+' Hadir':'Belum ada kegiatan';}const box=root.querySelector('#mg-attendance');if(box){const list=menteeAttendance(a,selected);box.innerHTML='<h2>Kehadiran mentee</h2><p class="mg-sub">'+text('SQLite lokal','Supabase')+' · hasil scan dan koreksi pengurus.</p>'+list.map(e=>'<div class="mg-heading" style="margin-top:14px"><span style="font-size:13px">'+esc(e.name)+'</span>'+tag(e.attendance?.status||'Belum tercatat',e.attendance?.status==='Hadir'?'success':'')+'</div>').join('')+(list.length?'':'<p class="mg-sub">Belum ada kegiatan untuk mentee ini.</p>')+'<div class="mg-actions" style="margin-top:18px">'+btn('Buka QR & riwayat mentee','attendance:'+selected,'secondary small')+'<a class="mg-button secondary small" href="absensi-pengurus.html">Scan absensi</a></div>';}}catch(e){if(seq!==attendanceSequence)return;for(const el of root.querySelectorAll('[data-mg-attendance-user]'))el.textContent='Database belum terhubung';const box=root.querySelector('#mg-attendance');if(box)box.innerHTML='<h2>Kehadiran mentee</h2><p class="mg-sub">'+esc(e.message)+'</p>';}}
 function updateURL(){const u=new URL(location.href);u.search='';if(cohortId)u.searchParams.set('cohort',cohortId);if(selected)u.searchParams.set('mentee',selected);historyAPI(u);}
 function historyAPI(u){window.history.replaceState(null,'',u.pathname+u.search);}
 function modal(title,body,kind){returnFocus=document.activeElement;dialogRevision=state.revision;const dialog=root.querySelector('#mg-dialog');dialog.innerHTML=`<div class="mg-dialog-head"><h2 id="mg-dialog-title">${title}</h2><button type="button" class="mg-close" data-close aria-label="Tutup formulir">✕</button></div><form data-kind="${kind}">${body}<p class="mg-error" role="alert"></p><div class="mg-dialog-foot">${btn('Batal','close','secondary')}<button type="submit" class="mg-button">${kind==='group_archive'?'Hapus kelompok':'Simpan '+(kind==='account'?text('akun lokal','akun'):kind==='group'?'kelompok':'cohort')}</button></div></form>`;dialog.addEventListener('close',()=>returnFocus?.focus(),{once:true});dialog.showModal();dialog.querySelector('[data-close]').onclick=()=>dialog.close();dialog.querySelector('form').onsubmit=submit;
 }
 function accountModal(id){const p=profile(id),e=state.enrolments.find(e=>e.user_id===id&&e.cohort_id===cohortId),g=groupOf(id);modal(p?'Edit akun':'Tambah akun',`<input type="hidden" name="id" value="${esc(id||'')}"><div class="mg-notice">${text('Identitas ini disimpan lokal. Belum membuat login LMS, mengatur kata sandi, atau mengirim email.','Akun baru memakai login IPB LEAP yang sama. Bagikan tautan aktivasi pribadi setelah menyimpan; pemilik menentukan kata sandinya sendiri. Email tidak dikirim otomatis.')}</div>${input('display_name','Nama lengkap',p?.display_name,'text','required autocomplete="name" maxlength="100"' +(!local&&p?' readonly':''))}${input('email','Email',p?.email,'email','required autocomplete="email" maxlength="200"' +(!local&&p?' readonly':''))}<div class="mg-form-grid">${select('role','Peran',Object.entries(ROLES).filter(([r])=>local?true:actor.roles.includes('system')?r!=='system':['mentee','mentor','asmen'].includes(r)),e?.role||'mentee',`required ${p?'disabled':''}`)}${select('cohort_id','Cohort',state.cohorts.map(c=>[c.id,c.name]),cohortId,`required ${!local?'disabled':''}`)}</div><div id="mg-mentee-fields"></div>${local||p?`<label class="mg-check"><input type="checkbox" name="active" ${(e?.active??p?.active)!==false?'checked':''}>${text('Aktif pada versi lokal','Terdaftar aktif di cohort (aktivasi login tetap oleh pemilik)')}</label>`:''}`, 'account');const form=root.querySelector('#mg-dialog form');
  function fields(keep={}){const role=form.elements.role.value,c=form.elements.cohort_id.value;form.querySelector('#mg-mentee-fields').innerHTML=role==='mentee'?`<div class="mg-form-grid">${select('field','Track',TRACKS.map(t=>t.field),keep.field??e?.field,'required')}${select('pathway','Pathway (opsional)',[],keep.pathway??e?.pathway)}</div><div style="margin-top:16px" id="mg-account-group"></div>`:'';if(role==='event')form.querySelector('#mg-mentee-fields').innerHTML=input('division','Divisi',keep.division||'Operation & Communication','text','required maxlength=120');if(role!=='mentee')return;
   function trackFields(pathway){const t=TRACKS.find(t=>t.field===form.elements.field.value);form.elements.pathway.innerHTML=options(t?.pathways||[],pathway);form.querySelector('#mg-account-group').innerHTML=select('group_id','Kelompok (opsional)',state.groups.filter(g=>!g.archived_at&&g.cohort_id===c&&g.field===t?.field).map(g=>[g.id,g.name]),keep.group_id??g?.id)+`<p class="mg-sub">Kelompok mengikuti cohort dan track. Bisa ditempatkan kemudian.</p>`;}
   trackFields(keep.pathway??e?.pathway);form.elements.field.onchange=()=>trackFields('');
  }
  fields();form.elements.role.onchange=()=>fields();form.elements.cohort_id.onchange=()=>fields({field:form.elements.field?.value,pathway:form.elements.pathway?.value,group_id:''});
 }
 function cohortModal(){modal('Buat cohort',`${input('name','Nama cohort','','text','required placeholder="Nama cohort program" maxlength="100"')}<div class="mg-form-grid">${input('starts_on','Tanggal mulai','','date','required')}${local?input('ends_on','Tanggal selesai','','date','required'):''}</div><p class="mg-sub">${text('Tanggal dipakai untuk konteks bulan program. Tidak membuat jadwal mentoring otomatis.','Pilih tanggal pertama bulan M1. Cohort berlangsung 12 bulan; jadwal mentoring tidak dibuat otomatis.')}</p>`,'cohort');}
 function groupModal(id){const g=cohortGroups().find(g=>g.id===id);
  const available=role=>people().filter(e=>e.role===role&&e.active&&(e.profile.active||e.profile.pending_activation));
  const label=e=>e.profile.display_name+(e.profile.active?'':' · belum aktivasi');
  const optionsFor=role=>available(role).map(e=>[e.user_id,label(e)]);modal(g?'Edit kelompok':'Tambah kelompok',`<input type="hidden" name="id" value="${esc(id||'')}">${input('name','Nama kelompok',g?.name,'text','required maxlength="100"')}${select('cohort_id','Cohort',state.cohorts.map(c=>[c.id,c.name]),cohortId,'required disabled')}${select('field','Track',TRACKS.map(t=>t.field),g?.field,'required')}<div class="mg-form-grid">${select('mentor_id','Mentor (opsional)',optionsFor('mentor'),g?.mentor_id)}${select('asmen_id','Asisten Mentor (opsional)',optionsFor('asmen'),g?.asmen_id)}</div>${g?'<p class="mg-sub">Kelola penempatan mentee melalui Edit akun.</p>':`<fieldset class="mg-group-roster"><legend>Pilih mentee</legend><p class="mg-sub">Pilih hingga lima mentee pada track yang sama. Peserta yang menunggu aktivasi dapat dipilih.</p><div id="mg-group-candidates"></div></fieldset>`}<p class="mg-sub">Kelompok ditandai lengkap setelah pendamping dan lima mentee ditempatkan serta aktif.</p>`,'group');
  if(g)return;
  const form=root.querySelector('#mg-dialog form'),list=form.querySelector('#mg-group-candidates');
  const renderCandidates=()=>{
   const field=form.elements.field.value;
   const candidates=available('mentee').filter(e=>e.field===field&&!groupOf(e.user_id))
    .sort((a,b)=>a.profile.display_name.localeCompare(b.profile.display_name,'id'));
   list.innerHTML=candidates.map(e=>`<label class="mg-check"><input type="checkbox" name="mentee_ids" value="${esc(e.user_id)}">${esc(label(e))}</label>`).join('')
    || `<p class="mg-sub">${field?'Belum ada mentee yang tersedia pada track ini.':'Pilih track untuk melihat daftar mentee.'}</p>`;
  };
  list.onchange=()=>{
   const checks=[...list.querySelectorAll('input')],full=checks.filter(i=>i.checked).length>=5;
   for(const check of checks)check.disabled=full&&!check.checked;
  };
  form.elements.field.onchange=renderCandidates;
  renderCandidates();
 }
 function archiveGroupModal(id){
  const g=cohortGroups().find(group=>group.id===id);
  if(!g)return;
  modal('Hapus kelompok',`<input type="hidden" name="id" value="${esc(id)}"><p>Arsipkan <strong>${esc(g.name)}</strong> dan lepaskan penugasan mentee serta pendamping? Akun, catatan, dan riwayat tetap tersimpan.</p>`,'group_archive');
 }
 async function submit(event){event.preventDefault();const form=event.currentTarget;if(!form.reportValidity())return;const fields=new FormData(form),data=Object.fromEntries(fields);for(const field of form.querySelectorAll('select:disabled'))data[field.name]=field.value;data.active=form.elements.active?.checked;const kind=form.dataset.kind;
  if(kind==='group'&&!data.id)data.mentee_ids=fields.getAll('mentee_ids');
  const submitButton=form.querySelector('button[type=submit]');submitButton.disabled=true;
  try{let activation;if(kind==='account')activation=await store.account(data,dialogRevision);else if(kind==='cohort'){const c=await store.cohort(data,dialogRevision);cohortId=c.id;}else if(kind==='group_archive'){await store.archiveGroup(data.id,cohortId,dialogRevision);if(groupFilter===data.id)groupFilter='';}else await store.group(data,dialogRevision);if(!local)await store.reload(cohortId);root.querySelector('#mg-dialog').close();render();message(kind==='group_archive'?'Kelompok diarsipkan. Penugasan peserta dan pendamping sudah dilepas.':text(kind==='account'?'Akun tersimpan lokal. Belum ada akun login atau email aktivasi yang dibuat.':kind==='group'?'Kelompok tersimpan lokal.':'Cohort tersimpan lokal.',kind==='account'?'Akun tersimpan. Bagikan tautan aktivasi secara pribadi.':'Perubahan tersimpan di Supabase.'));if(activation?.url)showActivation(activation.url,{email:data.email,display_name:data.display_name});}
  catch(e){form.querySelector('.mg-error').textContent=e.message;if(/Data berubah/.test(e.message)){const error=form.querySelector('.mg-error');if(!error.querySelector('button')){const b=document.createElement('button');b.type='button';b.className='mg-button secondary small';b.textContent='Muat versi terbaru, pertahankan isian';b.onclick=async()=>{try{if(!local)await store.reload(cohortId);}catch(e){error.textContent=e.message;return;}load();dialogRevision=state.revision;error.textContent='Versi terbaru sudah dimuat. Periksa kembali isian lalu simpan.';};error.append(document.createElement('br'),b);}}}finally{submitButton.disabled=false;}
 }
 function importModal(){
  const d=root.querySelector('#mg-dialog');let rows=[],results=[],running=false;
  d.innerHTML='<div class="mg-dialog-head"><h2 id="mg-dialog-title">Daftarkan peserta massal</h2></div><div style="padding:24px"><p class="mg-sub">Cohort: '+esc(currentCohort().name)+'. Daftar JSON memuat display_name, email, role (mentee/asmen), dan field (track). Pathway dan kelompok kosong. Peserta login dengan password awal yang sama, lalu wajib membuat password pribadi sebelum membuka aplikasi. Email tidak dikirim otomatis.</p><label class="mg-field">File daftar peserta<input type="file" accept=".json,application/json" id="mg-roster"></label><div class="mg-form-grid" style="margin-top:16px"><label class="mg-field">Password awal untuk semua peserta<input type="password" id="mg-initial-password" autocomplete="new-password" minlength="12" maxlength="128" required></label><label class="mg-field">Ulangi password awal<input type="password" id="mg-initial-confirm" autocomplete="new-password" minlength="12" maxlength="128" required></label></div><p class="mg-sub">Minimal 12 karakter. Bagikan hanya kepada peserta. Password yang sama memungkinkan peserta mencoba akun lain sampai password pribadi dibuat.</p><div id="mg-import-preview" style="margin-top:18px"></div><p class="mg-error" role="alert"></p><p id="mg-import-status" role="status" aria-live="polite"></p><div class="mg-actions"><button type="button" class="mg-button" id="mg-import-start" disabled>Daftarkan peserta</button><button type="button" class="mg-button secondary" id="mg-import-download" hidden>Unduh daftar akun</button><button type="button" class="mg-button secondary" id="mg-import-close">Tutup</button></div></div>';
  const pass=d.querySelector('#mg-initial-password'),confirm=d.querySelector('#mg-initial-confirm');
  const file=d.querySelector('#mg-roster'),start=d.querySelector('#mg-import-start'),download=d.querySelector('#mg-import-download'),close=d.querySelector('#mg-import-close'),error=d.querySelector('.mg-error'),status=d.querySelector('#mg-import-status');
  const prevent=e=>{e.preventDefault();e.returnValue='';};
  d.oncancel=e=>{if(running||results.some(r=>r.status==='Wajib ganti password'))e.preventDefault();};
  close.onclick=()=>{if(running)return;if(results.some(r=>r.status==='Wajib ganti password')&&!download.dataset.saved){error.textContent='Unduh daftar akun sebelum menutup.';return;}window.removeEventListener('beforeunload',prevent);d.oncancel=null;d.close();render();};
  file.onchange=async()=>{rows=[];error.textContent='';start.disabled=true;d.querySelector('#mg-import-preview').innerHTML='';try{if(!file.files[0])return;if(file.files[0].size>500000)throw Error('File terlalu besar. Maksimal 500 KB.');await store.reload(cohortId);rows=validateRoster(JSON.parse(await file.files[0].text()),store.read().profiles);const fresh=rows.filter(r=>!r.existing);d.querySelector('#mg-import-preview').innerHTML='<p><strong>'+fresh.length+' akun baru</strong> · '+fresh.filter(r=>r.role==='mentee').length+' mentee · '+fresh.filter(r=>r.role==='asmen').length+' Asmen · '+rows.filter(r=>r.existing).length+' sudah terdaftar.</p><p class="mg-sub">Periksa nama, email, peran, dan track sebelum mendaftarkan.</p><div class="mg-table-wrap" style="max-height:260px;overflow:auto"><table class="mg-table"><thead><tr><th>Nama</th><th>Email</th><th>Peran</th><th>Track</th></tr></thead><tbody>'+rows.map(r=>'<tr><td>'+esc(r.display_name)+'</td><td>'+esc(r.email)+'</td><td>'+esc(ROLES[r.role])+'</td><td>'+esc(r.field)+'</td></tr>').join('')+'</tbody></table></div>';start.disabled=!fresh.length;}catch(e){error.textContent=e.message;}};
  download.onclick=()=>{const url=URL.createObjectURL(new Blob([activationCSV(results)],{type:'text/csv;charset=utf-8'})),a=document.createElement('a');a.href=url;a.download='IPB-LEAP-daftar-akun-'+new Date().toISOString().slice(0,10)+'.csv';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);download.dataset.saved='true';};
  start.onclick=async()=>{if(running||!rows.length)return;if(!pass.reportValidity()||!confirm.reportValidity())return;if(pass.value!==confirm.value){error.textContent='Ulangi password awal yang sama.';return;}running=true;pass.disabled=true;confirm.disabled=true;start.disabled=true;file.disabled=true;close.disabled=true;error.textContent='';window.addEventListener('beforeunload',prevent);try{results=await provisionRoster(rows,{store,cohort:cohortId,initialPassword:pass.value,onProgress:list=>{results=[...list];download.hidden=false;delete download.dataset.saved;status.textContent='Diproses '+list.length+' / '+rows.length+' · '+list.filter(r=>r.status==='Wajib ganti password').length+' akun dibuat.';}});status.textContent='Selesai: '+results.filter(r=>r.status==='Wajib ganti password').length+' akun dibuat · '+results.filter(r=>r.status==='Sudah terdaftar').length+' sudah terdaftar · '+results.filter(r=>r.status.startsWith('Perlu diperiksa')).length+' perlu diperiksa. Peserta masuk melalui halaman login, lalu wajib mengganti password awal.';}catch(e){error.textContent=e.message;}finally{pass.value='';confirm.value='';running=false;close.disabled=false;}};
  d.showModal();
 }
 function showActivation(url,person=null,kind='activate'){
  const d=root.querySelector('#mg-dialog'),reset=kind==='reset';
  d.innerHTML='<div class="mg-dialog-head"><h2>'+(reset?'Tautan reset password':'Tautan aktivasi pribadi')+'</h2></div><div style="padding:24px;display:grid;gap:14px"><p class="mg-sub" data-mail-status>'+(person?'Mengirim tautan ke <strong>'+esc(person.email)+'</strong>…':'Bagikan hanya kepada pemilik akun.')+'</p><p class="mg-sub">Berlaku 14 hari dan hanya bisa dipakai sekali.'+(reset?' Pemilik akun membuka tautan, membuat password baru, lalu bisa langsung masuk.':'')+'</p>'+input('activation',reset?'Tautan reset':'Tautan aktivasi',url,'url','readonly')+'<div class="mg-actions"><button type="button" class="mg-button secondary" data-copy-link>Salin tautan</button>'+btn('Tutup','close')+'</div>'+(reset?'<p class="mg-status-note">Setelah password baru dibuat, cek tab Akun. Bila statusnya "Nonaktif di cohort", klik <strong>Aktifkan di cohort</strong>.</p>':'')+'</div>';
  d.querySelector('[data-copy-link]').onclick=async ev=>{const field=d.querySelector('[name=activation]');try{await navigator.clipboard.writeText(field.value);ev.currentTarget.textContent='Tautan disalin';}catch{field.select();}};
  d.showModal();
  if(!person?.email)return;
  const status=d.querySelector('[data-mail-status]');
  sendAccessLink({email:person.email,url,kind,cohort:cohortId}).then(r=>{
   if(!status.isConnected)return;
   status.innerHTML=r.sent?'✓ Tautan sudah dikirim otomatis ke email <strong>'+esc(person.email)+'</strong>. Minta pemilik akun memeriksa kotak masuk atau folder Spam.':'Email otomatis belum aktif. Salin tautan di bawah dan kirim secara pribadi kepada <strong>'+esc(person.display_name||person.email)+'</strong>.';
   if(r.sent)message('Tautan '+(reset?'reset password':'aktivasi')+' terkirim ke '+person.email+'.');
  }).catch(error=>{if(status.isConnected)status.innerHTML='<span style="color:#943B26">Email belum terkirim: '+esc(error.message)+'</span> Salin tautan di bawah dan kirim secara pribadi.';});
 }
 root.addEventListener('click',async event=>{const button=event.target.closest('[data-action],[data-tab]');if(!button)return;if(button.dataset.tab){tab=button.dataset.tab;roleFilter='';selected=null;updateURL();render();return;}const [action,id]=button.dataset.action.split(':');if(action==='import')importModal();if(action==='account')accountModal();if(action==='edit')accountModal(id);if(action==='cohort')cohortModal();if(action==='group')groupModal();if(action==='editgroup')groupModal(id);if(action==='archivegroup')archiveGroupModal(id);if(action==='close')root.querySelector('#mg-dialog').close();if(action==='detail'){selected=id;updateURL();render();root.focus();}if(action==='growall')downloadAllGrow(button);if(action==='resetpw')resetPassword(id,button);if(action==='reenrol')reenrol(id,button);if(action==='growrefresh')refreshGrowOverview(true);if(action==='growlist')downloadGrowList(button);if(action==='back'){selected=null;updateURL();render();}if(action==='reload'){growCache=null;try{if(!local)await store.reload(cohortId);render();}catch(e){message(e.message,true);}}if(action==='activate'&&!local){button.disabled=true;try{const a=await store.reissue(id,cohortId);showActivation(a.url,profile(id));}catch(e){message(e.message,true);}finally{button.disabled=false;}}if(action==='attendance'){if(local){sessionStorage.setItem(ACTOR_KEY,id);sessionStorage.setItem('ipbleap.ui.role','mentee');}const u=new URL('kehadiran.html',location.href);u.searchParams.set('cohort',cohortId);u.searchParams.set('mentee',id);location.href=u.pathname+u.search;}if(action==='rehearse'&&local){sessionStorage.setItem(ACTOR_KEY,id);sessionStorage.setItem('ipbleap.ui.role','mentee');const u=new URL('mentoring.html',location.href);u.searchParams.set('cohort',cohortId);u.searchParams.set('mentee',id);location.href=u.pathname+u.search;}});
 window.addEventListener('storage',e=>{if(e.key==='ipbleap.local.management.v1'){if(root.querySelector('#mg-dialog')?.open)message('Ada perubahan dari tab lain. Isian formulir tetap tersedia; muat versi terbaru sebelum menyimpan.',true);else render();}});
 try{render();}catch(e){root.innerHTML=empty('Data lokal belum dapat dibuka',esc(e.message));}
}
