#!/usr/bin/env node
// Converte contêineres MPEG-TS já compatíveis (H.264/AAC) para MP4 sem
// recomprimir a imagem ou o áudio. Os .ts originais nunca são removidos.
//
// Uso:
//   node scripts/remux-ts-videos.js "E:\\MedCof 2026"
//   node scripts/remux-ts-videos.js "E:\\MedCof 2026" --blocks=26-30 --dry-run

'use strict';

const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const args = process.argv.slice(2);
const ROOT = path.resolve(args.find(arg => !arg.startsWith('--')) || 'E:\\MedCof 2026');
const dryRun = args.includes('--dry-run');
const blocksArg = args.find(arg => arg.startsWith('--blocks='));
const ffmpeg = process.env.ENAMED_FFMPEG || 'ffmpeg';
const ffprobe = process.env.ENAMED_FFPROBE || 'ffprobe';

function parseBlocks(value) {
  if (!value) return null;
  const blocks = new Set();
  for (const token of value.split(',')) {
    const range = token.trim().match(/^(\d+)(?:-(\d+))?$/);
    if (!range) throw new Error(`Faixa de blocos inválida: ${token}`);
    const start = Number(range[1]);
    const end = Number(range[2] || range[1]);
    for (let block = Math.min(start, end); block <= Math.max(start, end); block += 1) blocks.add(block);
  }
  return blocks;
}

function commandWorks(command) {
  return spawnSync(command, ['-version'], { stdio: 'ignore', windowsHide: true }).status === 0;
}

function collectTsFiles(directory, selectedBlocks) {
  const files = [];
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    if (!entry.isDirectory()) continue;
    const match = entry.name.match(/^Bloco\s+(\d+)/i);
    if (!match) continue;
    const block = Number(match[1]);
    if (selectedBlocks && !selectedBlocks.has(block)) continue;
    const blockRoot = path.join(directory, entry.name);
    const pending = [blockRoot];
    while (pending.length) {
      const current = pending.pop();
      for (const child of fs.readdirSync(current, { withFileTypes: true })) {
        const absolute = path.join(current, child.name);
        if (child.isDirectory()) pending.push(absolute);
        else if (child.isFile() && path.extname(child.name).toLowerCase() === '.ts') files.push(absolute);
      }
    }
  }
  return files.sort((a, b) => a.localeCompare(b, 'pt-BR'));
}

function inspectMedia(file) {
  const result = spawnSync(ffprobe, [
    '-v', 'error',
    '-show_entries', 'stream=codec_type,codec_name:format=format_name,duration',
    '-of', 'json',
    file
  ], { encoding: 'utf8', windowsHide: true, maxBuffer: 4 * 1024 * 1024 });
  if (result.status !== 0) throw new Error(result.stderr.trim() || `ffprobe falhou para ${file}`);
  const data = JSON.parse(result.stdout);
  const streams = data.streams || [];
  return {
    format: String(data.format?.format_name || ''),
    duration: Number(data.format?.duration || 0),
    video: streams.find(stream => stream.codec_type === 'video')?.codec_name || '',
    audio: streams.find(stream => stream.codec_type === 'audio')?.codec_name || ''
  };
}

function isValidMp4(file) {
  if (!fs.existsSync(file) || fs.statSync(file).size <= 0) return false;
  try {
    const media = inspectMedia(file);
    return media.format.includes('mp4') && media.duration > 0 && Boolean(media.video);
  } catch (_) {
    return false;
  }
}

if (!fs.existsSync(ROOT)) throw new Error(`Biblioteca não encontrada: ${ROOT}`);
const selectedBlocks = parseBlocks(blocksArg?.slice('--blocks='.length));
const files = collectTsFiles(ROOT, selectedBlocks);
if (!commandWorks(ffprobe)) throw new Error(`ffprobe não encontrado: ${ffprobe}`);
if (!dryRun && !commandWorks(ffmpeg)) throw new Error(`ffmpeg não encontrado: ${ffmpeg}`);

let converted = 0;
let skipped = 0;
let incompatible = 0;
let failed = 0;

console.log(`MPEG-TS encontrados: ${files.length}${dryRun ? ' (simulação)' : ''}`);
for (const [index, input] of files.entries()) {
  const relative = path.relative(ROOT, input);
  const output = input.slice(0, -path.extname(input).length) + '.mp4';
  const temp = output + '.remuxing';
  if (isValidMp4(output)) {
    skipped += 1;
    console.log(`[${index + 1}/${files.length}] já convertido: ${relative}`);
    continue;
  }
  if (fs.existsSync(output)) {
    failed += 1;
    console.error(`[${index + 1}/${files.length}] MP4 existente e inválido; preservado: ${relative}`);
    continue;
  }
  let media;
  try {
    media = inspectMedia(input);
  } catch (error) {
    failed += 1;
    console.error(`[${index + 1}/${files.length}] inválido: ${relative} (${error.message})`);
    continue;
  }
  if (media.video !== 'h264' || (media.audio && media.audio !== 'aac')) {
    incompatible += 1;
    console.error(`[${index + 1}/${files.length}] requer transcodificação (${media.video}/${media.audio || 'sem áudio'}): ${relative}`);
    continue;
  }
  if (dryRun) {
    console.log(`[${index + 1}/${files.length}] converteria: ${relative}`);
    continue;
  }
  try { if (fs.existsSync(temp)) fs.unlinkSync(temp); } catch (_) {}
  console.log(`[${index + 1}/${files.length}] convertendo sem recompressão: ${relative}`);
  const result = spawnSync(ffmpeg, [
    '-hide_banner', '-loglevel', 'warning', '-y',
    '-fflags', '+genpts', '-i', input,
    '-map', '0:v:0', '-map', '0:a:0?',
    '-c', 'copy', '-avoid_negative_ts', 'make_zero',
    '-movflags', '+faststart', '-f', 'mp4', temp
  ], { encoding: 'utf8', windowsHide: true, maxBuffer: 16 * 1024 * 1024 });
  if (result.status !== 0 || !isValidMp4(temp)) {
    failed += 1;
    try { if (fs.existsSync(temp)) fs.unlinkSync(temp); } catch (_) {}
    console.error(result.stderr.trim() || `Falha ao validar ${relative}`);
    continue;
  }
  fs.renameSync(temp, output);
  const sourceStat = fs.statSync(input);
  fs.utimesSync(output, sourceStat.atime, sourceStat.mtime);
  converted += 1;
}

console.log(JSON.stringify({ root: ROOT, found: files.length, converted, skipped, incompatible, failed, dryRun }));
if (failed || incompatible) process.exitCode = 1;
