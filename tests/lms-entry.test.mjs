import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
const code=readFileSync(new URL('../assets/lms-entry.mjs',import.meta.url),'utf8');
function open(path,target){
 const location=new URL(path,'https://ipbleap.com');let destination;location.replace=value=>destination=String(value);
 const link={};const document={body:{dataset:{lmsDestination:target}},querySelector:()=>link};
 vm.runInNewContext(code,{URL,URLSearchParams,document,location});return new URL(destination);
}
test('legacy program preserves source, subject, cohort and period',()=>{
 const u=open('/erp/program/abc/?cohort=cohort-id&mentee=mentee-id&period=3&record=record-id&source=evidence','/app/mentoring.html');
 assert.equal(u.pathname,'/app/mentoring.html');assert.equal(u.search,'?cohort=cohort-id&mentee=mentee-id&period=3&record=record-id&source=evidence');
});
test('login preserves private activation fragment',()=>{
 const u=open('/login/#activate=private-token','/app/index.html');assert.equal(u.hash,'#activate=private-token');assert.equal(u.pathname,'/app/index.html');
});
test('login maps existing report next to the shared app',()=>{
 const u=open('/login/?next='+encodeURIComponent('/erp/program/raport/?cohort=cohort-id&period=6'),'/app/index.html');
 assert.equal(u.searchParams.get('next'),'/app/raport.html?cohort=cohort-id&period=6');
});
test('login retains modern next and rejects external next',()=>{
 assert.equal(open('/login/?next=%2Fapp%2Fkelola-program.html','/app/index.html').searchParams.get('next'),'/app/kelola-program.html');
 assert.equal(open('/login/?next=https%3A%2F%2Fexample.org','/app/index.html').searchParams.has('next'),false);
});
