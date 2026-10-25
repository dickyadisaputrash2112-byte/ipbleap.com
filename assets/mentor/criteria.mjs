export const VERSION = 'mentor-2026-10-25-v2';
export const LEGACY_VERSION = 'mentor-2026-10-25-v1';
export const TRACKS = {
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
export const GENERAL = [
  ['alumni','Saya adalah alumni IPB dan data pendidikan yang saya isi dapat diverifikasi.'],
  ['age','Saya telah berusia di atas 40 tahun pada saat mendaftar (minimal 41 tahun berdasarkan tanggal lahir).'],
  ['level','Saya menjabat pada tingkat C-Level atau sebagai pimpinan tertinggi yang setara, dan bersedia menjalani verifikasi jabatan oleh tim IPB LEAP.'],
  ['integrity','Saya memiliki integritas dan reputasi baik serta tidak terlibat masalah hukum, etik, atau profesional.'],
  ['leadership','Saya memiliki rekam jejak pencapaian, kontribusi nyata, pengalaman kepemimpinan, dan pengambilan keputusan strategis yang relevan dengan track pilihan saya.'],
  ['communication','Saya mampu berkomunikasi secara efektif dan mendampingi pengembangan orang lain.']
];
export const COMMITMENTS = [
  ['care','Saya bersedia mendampingi pengembangan generasi muda alumni IPB dan membantu mentee membangun perspektif serta mengambil keputusan secara mandiri.'],
  ['time','Saya bersedia menyepakati waktu pendampingan dengan tim dan mentee, hadir secara konsisten, serta mengomunikasikan perubahan jadwal.'],
  ['access','Saya bersedia berbagi pengalaman, wawasan strategis, jejaring, dan peluang yang relevan secara bertanggung jawab.'],
  ['confidentiality','Saya bersedia menjaga kerahasiaan informasi mentee dan program, menghormati batasan profesional, serta mematuhi kode etik IPB LEAP.'],
  ['evaluation','Saya bersedia berkoordinasi dengan tim program dan mengikuti evaluasi pendampingan untuk mendukung perkembangan mentee.'],
  ['verification','Saya memahami bahwa pendaftaran ini belum merupakan penetapan sebagai mentor. Tim akan menilai rekam jejak, relevansi, kemampuan mentoring, komitmen, serta pengetahuan dan kebijaksanaan saya.']
];
export function statementsFor(track) {return [...GENERAL,...(TRACKS[track]?.statements||[]),...COMMITMENTS];}
export function ageOn(dob,today) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dob||'') || !/^\d{4}-\d{2}-\d{2}$/.test(today||'')) return null;
  const d=new Date(dob+'T00:00:00Z');
  if(!Number.isFinite(+d)||d.toISOString().slice(0,10)!==dob||dob>today) return null;
  return Number(today.slice(0,4))-Number(dob.slice(0,4))-(today.slice(5)<dob.slice(5)?1:0);
}
export function validateData(p,today) {
  const errors=[];
  for(const key of ['name','dob','email','phone','city','ipbProgram','ipbCohort','organization','position','track']) if(typeof p[key]!=='string'||!p[key].trim()||p[key].length>200) errors.push('Lengkapi data '+key+'.');
  if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(p.email||'')) errors.push('Periksa alamat email.');
  if(!/^\+?[\d\s()-]{9,22}$/.test(p.phone||'')) errors.push('Periksa nomor WhatsApp.');
  if(p.version===LEGACY_VERSION){
    if(!/^\d{4}$/.test(p.ipbCohort||'')||Number(p.ipbCohort)<1900||Number(p.ipbCohort)>Number(today.slice(0,4))) errors.push('Periksa tahun masuk IPB.');
  }else if(!/^[1-9]\d{0,2}$/.test(p.ipbCohort||'')) errors.push('Periksa angkatan IPB. Gunakan nomor angkatan, misalnya 35.');
  if((ageOn(p.dob,today)??-1)<41) errors.push('Usia minimal 41 tahun saat mendaftar.');
  if(p.version===LEGACY_VERSION&&!['c-level','equivalent'].includes(p.level)) errors.push('Pilih C-Level atau pimpinan tertinggi setara.');
  if(!TRACKS[p.track]) errors.push('Pilih track mentoring.');
  for(const [id,,preferred] of statementsFor(p.track)) {
    if(!['yes','no'].includes(p.answers?.[id])) errors.push('Jawab seluruh pernyataan.');
    else if(!preferred&&p.answers[id]!=='yes') errors.push('Persyaratan wajib dan komitmen harus disetujui untuk melanjutkan.');
  }
  if(p.consent!==true) errors.push('Persetujuan pengolahan data diperlukan.');
  if(p.website) errors.push('Permintaan tidak valid.');
  return [...new Set(errors)];
}
export function validateFile(file) {
  if(!file||!file.name||!file.size) return 'Unggah CV terakhir Anda.';
  if(file.size>5*1024*1024) return 'Ukuran CV maksimal 5 MB.';
  if(!/\.(pdf|doc|docx)$/i.test(file.name)) return 'Gunakan CV dalam format PDF, DOC, atau DOCX.';
  return '';
}
