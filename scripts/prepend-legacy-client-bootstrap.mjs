// Next/Turbopack émet des chunks qui référencent globalThis dès leur premier
// octet. Sur Chromium 53/56, un script inline de layout arrive trop tard car
// les chunks Next sont async. Chaque chunk client reçoit donc ce garde ES5 au
// post-build : l'ordre de téléchargement ne peut plus créer de course.

import { readdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const chunksDir = path.resolve(".next/static/chunks");
const marker = "/* laraplay-legacy-bootstrap */";
const bootstrap = `${marker}(function(g){if(typeof g.globalThis==="undefined"){try{Object.defineProperty(g,"globalThis",{value:g,writable:true,configurable:true})}catch(error){g.globalThis=g}}if(!Object.entries){Object.defineProperty(Object,"entries",{configurable:true,writable:true,value:function(object){var keys=Object.keys(object);var result=[];for(var index=0;index<keys.length;index++){var key=keys[index];result.push([key,object[key]])}return result}})}})(typeof self!=="undefined"?self:this);`;

async function javascriptFiles(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const target = path.join(directory, entry.name);
    if (entry.isDirectory()) files.push(...await javascriptFiles(target));
    else if (entry.isFile() && entry.name.endsWith(".js")) files.push(target);
  }
  return files;
}

const files = await javascriptFiles(chunksDir);
let changed = 0;
for (const file of files) {
  const source = await readFile(file, "utf8");
  if (source.startsWith(marker)) continue;
  await writeFile(file, bootstrap + source, "utf8");
  changed++;
}

console.log(`[legacy-tv] bootstrap ajouté à ${changed}/${files.length} chunks client`);
