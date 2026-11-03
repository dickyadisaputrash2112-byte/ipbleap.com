const routes = {"/erp/": "/app/index.html", "/erp/beranda/": "/app/beranda-mentee.html", "/erp/program/progres/": "/app/progres.html", "/erp/program/abc/": "/app/mentoring.html", "/erp/program/review/": "/app/hasil-kpi.html", "/erp/program/poc/": "/app/poc.html", "/erp/program/penilaian/": "/app/penilaian.html", "/erp/program/raport/": "/app/raport.html", "/erp/kelompok/": "/app/kelompok.html", "/erp/kelompok/progres/": "/app/monitoring-progres.html", "/erp/kelompok/abc/": "/app/mentoring.html", "/erp/kelompok/review/": "/app/kelompok-penilaian.html", "/erp/kelompok/poc/": "/app/poc.html", "/erp/kelompok/raport/": "/app/raport.html"};
const target=new URL(document.body.dataset.lmsDestination,location.origin);
const params=new URLSearchParams(location.search);
if(location.pathname.replace(/\/$/,'')==='/login'){
 const next=params.get('next');
 if(next){try{const url=new URL(next,location.origin);if(url.origin===location.origin){const key=url.pathname.replace(/\/$/,'')+'/';const mapped=routes[key];if(mapped&&mapped!=='/app/index.html')params.set('next',mapped+url.search);else if(!url.pathname.startsWith('/app/'))params.delete('next');}else params.delete('next');}catch{params.delete('next');}}
}
target.search=params.toString();target.hash=location.hash;
document.querySelector('a').href=target.href;location.replace(target.href);
