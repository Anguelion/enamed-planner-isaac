const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const output = path.join(root, '.cloudflare-dist');
const questionMediaOrigin = 'https://anguelion.github.io/enamed-planner-isaac/';

const rootFiles = [
  'index.html',
  'manifest.webmanifest',
  'official_schedule.json',
  'service-worker.js',
];

const runtimeDirectories = [
  'assets',
  'data',
  'health-news',
  'imported_simulados',
  'materials_library',
];

function copy(source, destination) {
  fs.cpSync(source, destination, { recursive: true });
}

function countFiles(directory) {
  return fs.readdirSync(directory, { withFileTypes: true }).reduce((total, entry) => {
    const target = path.join(directory, entry.name);
    return total + (entry.isDirectory() ? countFiles(target) : 1);
  }, 0);
}

fs.rmSync(output, { recursive: true, force: true });
fs.mkdirSync(output, { recursive: true });

for (const file of rootFiles) {
  copy(path.join(root, file), path.join(output, file));
}

for (const directory of runtimeDirectories) {
  copy(path.join(root, directory), path.join(output, directory));
}

const questionOutput = path.join(output, 'question_bank');
fs.mkdirSync(questionOutput, { recursive: true });

for (const entry of fs.readdirSync(path.join(root, 'question_bank'), { withFileTypes: true })) {
  if (!entry.isFile() || path.extname(entry.name) !== '.js') continue;

  const source = path.join(root, 'question_bank', entry.name);
  const destination = path.join(questionOutput, entry.name);
  const content = fs.readFileSync(source, 'utf8').replaceAll(
    'question_bank/media/',
    `${questionMediaOrigin}question_bank/media/`,
  );
  fs.writeFileSync(destination, content);
}

const videoCatalog = path.join(root, 'video_library', 'catalog.json');
if (fs.existsSync(videoCatalog)) {
  const videoOutput = path.join(output, 'video_library');
  fs.mkdirSync(videoOutput, { recursive: true });
  copy(videoCatalog, path.join(videoOutput, 'catalog.json'));
}

const fileCount = countFiles(output);
if (fileCount > 19_000) {
  throw new Error(`Cloudflare output has ${fileCount} files; expected at most 19,000.`);
}

console.log(`Cloudflare output ready: ${fileCount} files.`);
