import path from 'node:path';
import { checkPublicContent } from './memory-safety.mjs';

function flagValue(argv, name) {
  const index = argv.indexOf(name);
  if (index === -1) return undefined;
  return argv[index + 1];
}

const argv = process.argv.slice(2);
const root = path.resolve(flagValue(argv, '--root') ?? process.cwd());
const publishRoot = path.resolve(flagValue(argv, '--publish-root') ?? path.join(root, 'src/content/publish'));
const strictMemory = argv.includes('--strict-memory');
const assetOcr = argv.includes('--asset-ocr-required')
  ? 'required'
  : argv.includes('--asset-ocr-off')
    ? 'off'
    : 'auto';

const result = await checkPublicContent({ root, publishRoot, strictMemory, assetOcr });

for (const warning of result.warnings) {
  console.warn(`WARN ${warning}`);
}

if (result.failures.length > 0) {
  for (const failure of result.failures) {
    console.error(`FAIL ${failure}`);
  }
  process.exit(1);
}

console.log(`Checked ${result.checkedFiles} public content file(s).`);
if (result.warnings.length === 0) {
  console.log('No public-content safety or LLM-memory issues found.');
}
