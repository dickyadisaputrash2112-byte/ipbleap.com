const VERSION = 'mentor-2026-10-25-v1';
const TRACKS = {
  business: {name:'Entrepreneur & Business', focus:'Pertumbuhan usaha, strategi bisnis, dan akses pasar.', statements:[
    ['business_role','Saya merupakan pendiri, pemilik, direktur, atau pemimpin usaha.'],
    ['business_years','Saya memiliki pengalaman sekurang-kurangnya 5 tahun di bidang bisnis, manajemen, atau pengembangan usaha.'],
    ['business_revenue','Usaha yang saya pimpin berjalan dan bertumbuh, dengan pendapatan tahunan minimal Rp1 miliar.'],
    ['business_growth','Saya berpengalaman dalam ekspansi usaha, pengembangan pasar, dan strategi pertumbuhan.']
  ]},
  academic: {name:'Academic & Research', focus:'Keluaran riset, akses akademik, dan jejaring kolaborasi.', statements:[
    ['academic_degree','Saya merupakan akademisi, dosen, atau peneliti senior dengan pendidikan minimal S3 yang relevan.'],
    ['academic_publication','Saya memiliki publikasi bereputasi, sekurang-kurangnya pada jurnal SINTA 2.'],
    ['academic_lead','Saya pernah memimpin riset, laboratorium, pusat studi, atau program akademik.'],
    ['academic_grant','Saya berpengalaman memperoleh atau mengelola hibah penelitian.'],
    ['academic_collaboration','Saya memiliki pengalaman kolaborasi lintas institusi atau internasional.'],
    ['academic_output','Saya memiliki keluaran berupa publikasi, paten, prototipe, produk inovasi, atau kekayaan intelektual.'],
    ['academic_preferred','Saya memiliki publikasi terindeks Scopus atau Web of Science.',true]
  ]},
  professional: {name:'Professional / Corporate / Bureaucracy', focus:'Akselerasi karier, organisasi, tata kelola, dan kepemimpinan.', statements:[
    ['professional_years','Saya memiliki pengalaman kerja sekurang-kurangnya 8 tahun, sesuai rentang pengalaman 8–10 tahun dalam kriteria program.'],
    ['professional_lead','Saya pernah memimpin tim, program, unit kerja, atau kebijakan.'],
    ['professional_strategy','Saya memiliki pengalaman mengelola anggaran, proyek strategis, tata kelola, atau pelayanan publik.'],
    ['professional_achievement','Saya memiliki pencapaian signifikan yang terukur dan rekam jejak integritas yang baik.'],
    ['professional_insight','Saya memahami strategi bisnis, organisasi, atau transformasi industri.'],
    ['professional_equivalence','Jika berasal dari birokrasi, saya memahami acuan JPT Pratama/Madya/Utama; kesetaraan kepemimpinan tertinggi saya tetap harus diverifikasi tim. Jika bukan dari birokrasi, saya memahami bahwa syarat C-Level atau pimpinan tertinggi setara tetap berlaku.']
  ]},
  public: {name:'Politics / Public Leadership', focus:'Kepemimpinan publik, kebijakan, negosiasi, dan pemangku kepentingan.', statements:[
    ['public_role','Saya memiliki jabatan publik, jabatan legislatif, atau jabatan kepala daerah.'],
    ['public_governance','Saya memahami governance, transparansi, akuntabilitas, risiko, dan etika kepemimpinan publik.'],
    ['public_mentoring','Saya mampu membimbing pengambilan keputusan, pengelolaan konflik, negosiasi, dan komunikasi publik.'],
    ['public_policy','Saya terlibat dalam formulasi, implementasi, evaluasi, atau advokasi kebijakan.'],
    ['public_preferred','Saya memiliki pengalaman sekurang-kurangnya 5 tahun sebagai mentor, pelatih kepemimpinan, atau penasihat kebijakan.',true]
  ]},
  social: {name:'Social & Community / NGO / Social Impact', focus:'Dampak sosial berkelanjutan, kolaborasi, dan pemberdayaan.', statements:[
    ['social_role','Saya merupakan pendiri atau pengelola organisasi sosial, NGO, komunitas, atau usaha sosial.'],
    ['social_years','Saya memiliki pengalaman sekurang-kurangnya 5 tahun dalam NGO, CSR, pemberdayaan, atau community development.'],
    ['social_resources','Saya memahami kemitraan, pengelolaan relawan, dan mobilisasi sumber daya.'],
    ['social_program','Saya berpengalaman merancang, menjalankan, dan mengevaluasi program sosial.'],
    ['social_mentoring','Saya memiliki pengalaman sekurang-kurangnya 5 tahun dalam mentoring, fasilitasi, atau pendampingan komunitas.'],
    ['social_ethics','Saya memahami safeguarding, transparansi penggunaan dana, dan etika program sosial.']
  ]}
};
const GENERAL = [
  ['alumni','Saya adalah alumni IPB dan data pendidikan yang saya isi dapat diverifikasi.'],
  ['age','Saya telah berusia di atas 40 tahun pada saat mendaftar (minimal 41 tahun berdasarkan tanggal lahir).'],
  ['level','Saya menjabat pada tingkat C-Level atau sebagai pimpinan tertinggi yang setara, dan bersedia menjalani verifikasi jabatan oleh tim IPB LEAP.'],
  ['integrity','Saya memiliki integritas dan reputasi baik serta tidak terlibat masalah hukum, etik, atau profesional.'],
  ['leadership','Saya memiliki rekam jejak pencapaian, kontribusi nyata, pengalaman kepemimpinan, dan pengambilan keputusan strategis yang relevan dengan track pilihan saya.'],
  ['communication','Saya mampu berkomunikasi secara efektif dan mendampingi pengembangan orang lain.']
];
const COMMITMENTS = [
  ['care','Saya bersedia mendampingi pengembangan generasi muda alumni IPB dan membantu mentee membangun perspektif serta mengambil keputusan secara mandiri.'],
  ['time','Saya bersedia menyepakati waktu pendampingan dengan tim dan mentee, hadir secara konsisten, serta mengomunikasikan perubahan jadwal.'],
  ['access','Saya bersedia berbagi pengalaman, wawasan strategis, jejaring, dan peluang yang relevan secara bertanggung jawab.'],
  ['confidentiality','Saya bersedia menjaga kerahasiaan informasi mentee dan program, menghormati batasan profesional, serta mematuhi kode etik IPB LEAP.'],
  ['evaluation','Saya bersedia berkoordinasi dengan tim program dan mengikuti evaluasi pendampingan untuk mendukung perkembangan mentee.'],
  ['verification','Saya memahami bahwa pendaftaran ini belum merupakan penetapan sebagai mentor. Tim akan menilai rekam jejak, relevansi, kemampuan mentoring, komitmen, serta pengetahuan dan kebijaksanaan saya.']
];
function statementsFor(track) {return [...GENERAL,...(TRACKS[track]?.statements||[]),...COMMITMENTS];}
function ageOn(dob,today) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dob||'') || !/^\d{4}-\d{2}-\d{2}$/.test(today||'')) return null;
  const d=new Date(dob+'T00:00:00Z');
  if(!Number.isFinite(+d)||d.toISOString().slice(0,10)!==dob||dob>today) return null;
  return Number(today.slice(0,4))-Number(dob.slice(0,4))-(today.slice(5)<dob.slice(5)?1:0);
}
function validateData(p,today) {
  const errors=[];
  for(const key of ['name','dob','email','phone','city','ipbProgram','ipbCohort','organization','position','level','track']) if(typeof p[key]!=='string'||!p[key].trim()||p[key].length>200) errors.push('Lengkapi data '+key+'.');
  if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(p.email||'')) errors.push('Periksa alamat email.');
  if(!/^\+?[\d\s()-]{9,22}$/.test(p.phone||'')) errors.push('Periksa nomor WhatsApp.');
  if(!/^\d{4}$/.test(p.ipbCohort||'')||Number(p.ipbCohort)<1900||Number(p.ipbCohort)>Number(today.slice(0,4))) errors.push('Periksa tahun masuk IPB.');
  if((ageOn(p.dob,today)??-1)<41) errors.push('Usia minimal 41 tahun saat mendaftar.');
  if(!['c-level','equivalent'].includes(p.level)) errors.push('Pilih C-Level atau pimpinan tertinggi setara.');
  if(!TRACKS[p.track]) errors.push('Pilih track mentoring.');
  for(const [id,,preferred] of statementsFor(p.track)) {
    if(!['yes','no'].includes(p.answers?.[id])) errors.push('Jawab seluruh pernyataan.');
    else if(!preferred&&p.answers[id]!=='yes') errors.push('Persyaratan wajib dan komitmen harus disetujui untuk melanjutkan.');
  }
  if(p.consent!==true) errors.push('Persetujuan pengolahan data diperlukan.');
  if(p.website) errors.push('Permintaan tidak valid.');
  return [...new Set(errors)];
}
function validateFile(file) {
  if(!file||!file.name||!file.size) return 'Unggah CV terakhir Anda.';
  if(file.size>5*1024*1024) return 'Ukuran CV maksimal 5 MB.';
  if(!/\.(pdf|doc|docx)$/i.test(file.name)) return 'Gunakan CV dalam format PDF, DOC, atau DOCX.';
  return '';
}

/* IPB LEAP mentor intake. Only setup() is run by the owner. Public handlers never read back applicants. */
function setup() {
  const props=PropertiesService.getScriptProperties();
  if(props.getProperty('SHEET_ID')) {console.log('Penyimpanan sudah tersedia.');return;}
  const folder=DriveApp.createFolder('IPB LEAP — Pendaftaran Mentor 2026 (Privat)');
  const cv=folder.createFolder('CV Mentor — Privat');
  const book=SpreadsheetApp.create('IPB LEAP 2026 — Pendaftaran Senior Mentor');
  DriveApp.getFileById(book.getId()).moveTo(folder);
  const sheet=book.getSheets()[0];sheet.setName('Pendaftaran');
  const headers=['Nomor pendaftaran','ID permintaan','Waktu WIB','Status verifikasi','Nama lengkap','Tanggal lahir','Usia saat mendaftar','Email','WhatsApp','Kota domisili','Tahun masuk IPB','Program studi / fakultas','Organisasi','Jabatan','Tingkat kepemimpinan','Track','LinkedIn','Nama CV','Tautan CV privat','Persetujuan data','Versi kriteria','Jawaban pernyataan (JSON)','Catatan tim'];
  sheet.getRange(1,1,1,headers.length).setValues([headers]).setFontWeight('bold').setBackground('#f1f3f4');sheet.setFrozenRows(1);sheet.getRange(1,1,1,headers.length).createFilter();sheet.setColumnWidths(1,headers.length,160);sheet.setColumnWidth(22,450);
  props.setProperties({SHEET_ID:book.getId(),CV_FOLDER_ID:cv.getId(),ROOT_FOLDER_ID:folder.getId()});
  console.log('Spreadsheet privat: '+book.getUrl());console.log('Folder privat: '+folder.getUrl());
}
function doGet(e) {
  if(e&&e.parameter.health==='1')return ContentService.createTextOutput('window.mentorHealth('+JSON.stringify({ready:!!PropertiesService.getScriptProperties().getProperty('SHEET_ID')})+');').setMimeType(ContentService.MimeType.JAVASCRIPT);
  return ContentService.createTextOutput('IPB LEAP mentor intake. Tidak ada data pendaftar yang dapat diakses melalui endpoint ini.');
}
function response_(nonce,result) {
  const body=JSON.stringify(Object.assign({type:'ipbleap-mentor-receipt',nonce:nonce},result)).replace(/</g,'\\u003c');
  return HtmlService.createHtmlOutput('<!doctype html><html><body><p>Konfirmasi pendaftaran IPB LEAP.</p><script>window.top.postMessage('+body+',"https://ipbleap.com");</script></body></html>').setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}
function doPost(e) {
  let nonce='';
  try{
    if(!e||!e.parameter||typeof e.parameter.payload!=='string'||e.parameter.payload.length>7200000)throw new Error('Permintaan tidak valid atau berkas terlalu besar.');
    const p=JSON.parse(e.parameter.payload);nonce=String(p.nonce||'');
    if(!/^[a-f0-9-]{36}$/.test(nonce)||!/^[-a-f0-9]{36}$/.test(p.requestId||''))throw new Error('Nomor permintaan tidak valid.');
    const today=Utilities.formatDate(new Date(),'Asia/Jakarta','yyyy-MM-dd');
    const errors=validateData(p,today);if(p.version!==VERSION)errors.push('Versi formulir berubah. Muat ulang halaman.');
    const fileError=validateFile(p.cv);if(fileError)errors.push(fileError);
    if(errors.length)throw new Error(errors.join(' '));
    if(typeof p.cv.data!=='string'||!/^[A-Za-z0-9+/]+={0,2}$/.test(p.cv.data))throw new Error('Berkas CV tidak valid.');
    const bytes=Utilities.base64Decode(p.cv.data);
    if(bytes.length!==p.cv.size||bytes.length>5242880)throw new Error('Ukuran CV tidak sesuai.');
    const ext=p.cv.name.split('.').pop().toLowerCase();
    const magic=bytes.slice(0,5).map(function(b){return b&255;});
    if(ext==='pdf'&&String.fromCharCode.apply(null,magic)!=='%PDF-')throw new Error('Isi CV bukan PDF yang valid.');
    if(ext==='docx'&&(magic[0]!==80||magic[1]!==75))throw new Error('Isi CV bukan DOCX yang valid.');
    if(ext==='doc'&&(magic[0]!==208||magic[1]!==207||magic[2]!==17||magic[3]!==224))throw new Error('Isi CV bukan DOC yang valid.');
    const lock=LockService.getScriptLock();if(!lock.tryLock(30000))throw new Error('Pendaftaran sedang sibuk. Silakan coba kembali.');
    try{
      const props=PropertiesService.getScriptProperties();if(!props.getProperty('SHEET_ID'))throw new Error('Pendaftaran belum dibuka.');
      const sheet=SpreadsheetApp.openById(props.getProperty('SHEET_ID')).getSheetByName('Pendaftaran');
      if(sheet.getLastRow()>1){const found=sheet.getRange(2,2,sheet.getLastRow()-1,1).createTextFinder(p.requestId).matchEntireCell(true).findNext();if(found)return response_(nonce,{ok:true,id:sheet.getRange(found.getRow(),1).getDisplayValue()});}
      const rateKey='rate_'+Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256,today+'|'+p.email.trim().toLowerCase()).map(function(b){return (b&255).toString(16).padStart(2,'0');}).join('');
      const cache=CacheService.getScriptCache();const count=Number(cache.get(rateKey)||0);if(count>=3)throw new Error('Batas pengiriman untuk email ini telah tercapai. Hubungi tim program bila perlu memperbarui data.');
      const id='LEAP-M-'+today.replace(/-/g,'')+'-'+Utilities.getUuid().replace(/-/g,'').slice(0,8).toUpperCase();
      const mime={pdf:'application/pdf',doc:'application/msword',docx:'application/vnd.openxmlformats-officedocument.wordprocessingml.document'}[ext];
      const cv=DriveApp.getFolderById(props.getProperty('CV_FOLDER_ID')).createFile(Utilities.newBlob(bytes,mime,id+'.'+ext));
      const clean=function(s){s=String(s||'').trim();return /^[=+@\-\t\r]|^0\d/.test(s)?"'"+s:s;};
      const answers={};statementsFor(p.track).forEach(function(item){answers[item[0]]={pernyataan:item[1],jawaban:p.answers[item[0]]==='yes'?'Setuju':'Tidak setuju',diutamakan:!!item[2]};});
      const row=[id,p.requestId,Utilities.formatDate(new Date(),'Asia/Jakarta','yyyy-MM-dd HH:mm:ss'),'Menunggu verifikasi tim',p.name,p.dob,ageOn(p.dob,today),p.email,p.phone,p.city,p.ipbCohort,p.ipbProgram,p.organization,p.position,p.level==='c-level'?'C-Level':'Pimpinan tertinggi setara — wajib verifikasi',TRACKS[p.track].name,p.linkedin||'',p.cv.name,cv.getUrl(),'Setuju',VERSION,JSON.stringify(answers),''];
      try{sheet.appendRow(row.map(clean));SpreadsheetApp.flush();}catch(err){cv.setTrashed(true);throw err;}
      cache.put(rateKey,String(count+1),21600);
      return response_(nonce,{ok:true,id:id});
    }finally{lock.releaseLock();}
  }catch(error){return response_(nonce,{ok:false,error:error.message&&/^(Permintaan|Nomor|Periksa|Lengkapi|Usia|Pilih|Jawab|Persyaratan|Persetujuan|Unggah|Ukuran|Gunakan|Versi|Berkas|Isi|Pendaftaran|Batas)/.test(error.message)?error.message:'Pendaftaran belum dapat disimpan. Silakan coba lagi; bila berulang, hubungi tim IPB LEAP.'});}
}
