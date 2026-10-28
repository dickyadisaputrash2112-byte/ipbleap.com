const dest=document.body.dataset.destination||'beranda',old=new URLSearchParams(location.search),p=new URLSearchParams();
for(const key of ['cohort','mentee','record']){const value=old.get(key);if(/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i.test(value||''))p.set(key,value);}
if(['3','6','9','12'].includes(old.get('period')))p.set('period',old.get('period'));
let route=dest;if(old.get('role')&&['asmen','mentor'].includes(old.get('role'))&&route.startsWith('program/'))route=route.replace('program/','kelompok/');
const target='/erp/'+route+'/'+(p.size?'?'+p:'');document.getElementById('continue').href=target;location.replace(target);
