// Gera o CHANGELOG.md e o version.json a partir de js/changelog.js.
// Rode antes de publicar:  node tools/gerar-versao.mjs
import { readdirSync, statSync, writeFileSync } from 'node:fs';
import { join, relative, dirname } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const { CHANGELOG, VERSION } = await import(pathToFileURL(join(root, 'js/changelog.js')).href);

// Todos os arquivos do jogo: o aviso de atualização baixa de novo cada um antes de recarregar
function walk(dir) {
  return readdirSync(join(root, dir)).flatMap((name) => {
    const path = join(dir, name);
    return statSync(join(root, path)).isDirectory() ? walk(path) : [path];
  });
}
const files = ['index.html', 'css/style.css', ...walk('js').filter((f) => f.endsWith('.js'))].map((f) => f.split('\\').join('/'));

writeFileSync(join(root, 'version.json'), JSON.stringify({ version: VERSION, date: CHANGELOG[0].date, files }, null, 2) + '\n');

const dateBR = (d) => d.split('-').reverse().join('/');
let md = '# 📜 Changelog do FarmLife\n\nTodas as mudanças do jogo, da mais nova para a mais antiga. Este arquivo é gerado a partir de `js/changelog.js` por `node tools/gerar-versao.mjs`.\n\n';
for (const v of CHANGELOG) {
  md += `## v${v.version} — ${v.title} (${dateBR(v.date)})\n\n${v.items.map((i) => `- ${i}`).join('\n')}\n\n`;
}
writeFileSync(join(root, 'CHANGELOG.md'), md);

console.log(`v${VERSION}: version.json (${files.length} arquivos) e CHANGELOG.md (${CHANGELOG.length} versões) gerados.`);
