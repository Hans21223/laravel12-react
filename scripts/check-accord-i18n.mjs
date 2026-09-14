import fs from 'node:fs';
import vm from 'node:vm';

const path = 'resources/js/Pages/Approvals/';
const source = fs.readFileSync(`${path}i18n.jsx`, 'utf8');
const dictionaries = vm.runInNewContext(
    `${source.slice(source.indexOf('const en ='), source.indexOf('export const dictionaries'))}; ({en, th, ja});`,
    {},
    { timeout: 1000 },
);
const keys = Object.keys(dictionaries.en);
const failures = [];
for (const [locale, dictionary] of Object.entries(dictionaries)) {
    for (const key of keys)
        if (typeof dictionary[key] !== 'string' || !dictionary[key].trim())
            failures.push(`${locale}: missing ${key}`);
    for (const key of Object.keys(dictionary))
        if (!keys.includes(key)) failures.push(`${locale}: unexpected ${key}`);
}
for (const file of fs
    .readdirSync(path)
    .filter((file) => file.endsWith('.jsx'))) {
    const text = fs.readFileSync(`${path}${file}`, 'utf8');
    for (const match of text.matchAll(/\bt\('([^']+)'\)/g))
        if (!keys.includes(match[1]))
            failures.push(`${file}: unknown translation ${match[1]}`);
}
if (failures.length) {
    console.error(failures.join('\n'));
    process.exit(1);
}
console.log(
    `Accord locale coverage: ${keys.length} keys in English, Thai, and Japanese; all static translation references valid.`,
);
