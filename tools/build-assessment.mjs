import {readFile,writeFile} from 'node:fs/promises';
import {stripTypeScriptTypes} from 'node:module';
const root=new URL('../',import.meta.url);
for(const name of ['scoring','workflows']){
 const source=await readFile(new URL(`assessment-engine/src/${name}.ts`,root),'utf8');
 await writeFile(new URL(`assets/assessment/${name}.js`,root),stripTypeScriptTypes(source).replaceAll("'./scoring.ts'","'./scoring.js'"));
}
