import{test}from'node:test';import assert from'node:assert/strict';import fs from'node:fs';
test('every operational SQL UPDATE scopes its target rows explicitly',()=>{
 let checked=0;
 for(const file of ['accounts.sql','access.sql','management.sql','records.sql']){
  const source=fs.readFileSync(new URL('../backend/erp/'+file,import.meta.url),'utf8');
  for(const statement of source.matchAll(/\bupdate\s+(?:public|erp_private)\.[a-z_]+(?:\s+[a-z_]+)?\s+set\s+([^;]+);/gi)){
   assert.match(statement[1],/\bwhere\b/i,file+': unsafe update '+statement[0]);checked++;
  }
 }
 assert(checked>=10,'check all operational UPDATE statements');
});
test('initial activation scopes both reserve and completion to the selected settings row',()=>{
 const sql=fs.readFileSync(new URL('../backend/erp/accounts.sql',import.meta.url),'utf8');
 const settingsUpdates=[...sql.matchAll(/update erp_private\.settings set ([^;]+);/g)];assert.equal(settingsUpdates.length,2);
 for(const m of settingsUpdates)assert.match(m[1],/where singleton = s\.singleton$/);
});
