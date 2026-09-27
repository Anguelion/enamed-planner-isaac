[CmdletBinding()]
param(
  [string]$Root = 'E:\MedCof 2026',
  [int]$FromBlock = 26,
  [int]$ToBlock = 30,
  [switch]$Apply,
  [switch]$DeleteTs
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

$repo = [IO.Path]::GetFullPath((Join-Path $PSScriptRoot '..'))
$rootPath = [IO.Path]::GetFullPath($Root).TrimEnd('\')
$catalogPath = Join-Path $repo 'video_library\catalog.json'
$schedulePath = Join-Path $repo 'official_schedule.json'
$catalog = Get-Content -Raw -LiteralPath $catalogPath | ConvertFrom-Json
$officialSchedule = @(Get-Content -Raw -LiteralPath $schedulePath | ConvertFrom-Json | Select-Object -ExpandProperty items)
$blocks = @($FromBlock..$ToBlock)
$allowedRoots = @($blocks | ForEach-Object {
  [IO.Path]::GetFullPath((Join-Path $rootPath ('Bloco {0:d2}' -f $_))).TrimEnd('\') + '\'
})

function Test-WithinAllowedBlocks([string]$Path) {
  $full = [IO.Path]::GetFullPath($Path)
  return [bool]($allowedRoots | Where-Object {
    $full.StartsWith($_, [StringComparison]::OrdinalIgnoreCase)
  })
}

function Normalize-Label([string]$Value) {
  $normalized = $Value.Normalize([Text.NormalizationForm]::FormD)
  $builder = [Text.StringBuilder]::new()
  foreach($character in $normalized.ToCharArray()) {
    if([Globalization.CharUnicodeInfo]::GetUnicodeCategory($character) -ne [Globalization.UnicodeCategory]::NonSpacingMark) {
      [void]$builder.Append($character)
    }
  }
  return ($builder.ToString().ToLowerInvariant() -replace '^\d+\s*-\s*', '' -replace '[^a-z0-9]+', ' ').Trim()
}

function Convert-ToSafePathSegment([string]$Value) {
  return (($Value -replace '[<>:"/\\|?*]+', ' - ') -replace '\s+', ' ').Trim(' ', '.')
}

function Resolve-LessonTarget([object]$Lesson) {
  $block = [int]$Lesson.block
  $order = if($Lesson.PSObject.Properties['scheduleOrder']) {
    [int]$Lesson.scheduleOrder
  } else {
    [int]$Lesson.folderOrder
  }
  if(-not $order) { throw "Aula sem ordem oficial: B$block $($Lesson.title)" }
  $official = @($officialSchedule | Where-Object {
    [int]$_.block -eq $block -and [int]$_.order -eq $order
  })
  if($official.Count -ne 1) { throw "Cronograma oficial ambíguo ou ausente: B$block O$order" }
  $officialArea = [string]$official[0].area
  $officialTitle = [string]$official[0].topic
  $blockDir = [IO.Path]::GetFullPath((Join-Path $rootPath ('Bloco {0:d2}' -f $block)))
  $blockPrefix = $blockDir.TrimEnd('\') + '\'
  $areaDirs = @(Get-ChildItem -LiteralPath $blockDir -Directory)
  $wantedArea = Normalize-Label $officialArea
  $area = @($areaDirs | Where-Object { (Normalize-Label $_.Name) -eq $wantedArea }) | Select-Object -First 1
  if($area) {
    $areaPath = $area.FullName
  } else {
    $usedPrefixes = @($areaDirs | ForEach-Object {
      if($_.Name -match '^(\d+)\s*-') { [int]$Matches[1] }
    })
    $prefix = 1
    while($usedPrefixes -contains $prefix) { $prefix += 1 }
    $areaPath = Join-Path $blockDir ('{0:d2} - {1}' -f $prefix, $officialArea)
  }
  $target = $null
  if(Test-Path -LiteralPath $areaPath -PathType Container) {
    $wantedTitle = Normalize-Label $officialTitle
    $existingLessons = @(Get-ChildItem -LiteralPath $areaPath -Directory | Where-Object {
      $_.Name -match ('^{0:d2}\s*-\s*' -f $order) -and (Normalize-Label $_.Name) -eq $wantedTitle
    })
    if($existingLessons.Count -gt 1) { throw "Mais de uma pasta canônica para B$block O$order" }
    if($existingLessons.Count -eq 1) {
      $target = [IO.Path]::GetFullPath($existingLessons[0].FullName)
    }
  }
  $safeTitle = Convert-ToSafePathSegment $officialTitle
  if(-not $target) {
    $target = [IO.Path]::GetFullPath((Join-Path $areaPath ('{0:d2} - {1}' -f $order, $safeTitle)))
  }
  if(-not ($target.TrimEnd('\') + '\').StartsWith($blockPrefix, [StringComparison]::OrdinalIgnoreCase)) {
    throw "Destino fora do bloco permitido: $target"
  }
  return [pscustomobject]@{
    Block = $block
    Order = $order
    Area = $officialArea
    Title = $officialTitle
    Path = $target
  }
}

$lessons = @($catalog.lessons | Where-Object {
  [int]$_.block -ge $FromBlock -and [int]$_.block -le $ToBlock
})
$moves = @()
foreach($lesson in $lessons) {
  $officialTarget = Resolve-LessonTarget $lesson
  $targetDir = $officialTarget.Path
  foreach($video in @($lesson.videos)) {
    $source = [IO.Path]::GetFullPath((Join-Path $rootPath ([string]$video.relativePath -replace '/', '\')))
    $target = [IO.Path]::GetFullPath((Join-Path $targetDir ([IO.Path]::GetFileName($source))))
    if(-not (Test-Path -LiteralPath $source -PathType Leaf)) { throw "Fonte ausente: $source" }
    if(-not (Test-WithinAllowedBlocks $source)) { throw "Fonte fora do escopo: $source" }
    if($source -ne $target -and (Test-Path -LiteralPath $target)) { throw "Colisão no destino: $target" }
    $moves += [pscustomobject]@{
      Block = [int]$lesson.block
      Order = $officialTarget.Order
      Lesson = $officialTarget.Title
      Source = $source
      Target = $target
      TargetDir = $targetDir
      Bytes = (Get-Item -LiteralPath $source).Length
    }
  }
}

$expectedVideos = @($lessons | ForEach-Object { $_.videos }).Count
if($moves.Count -ne $expectedVideos) { throw "Plano incompleto: $($moves.Count)/$expectedVideos vídeos" }
$duplicateTargets = @($moves | Group-Object Target | Where-Object { $_.Count -gt 1 })
if($duplicateTargets.Count) { throw "Há $($duplicateTargets.Count) destinos duplicados" }

$tsFiles = @($blocks | ForEach-Object {
  Get-ChildItem -LiteralPath (Join-Path $rootPath ('Bloco {0:d2}' -f $_)) -Recurse -File -Filter '*.ts'
})
$ffprobe = (Get-Command ffprobe.exe -ErrorAction Stop).Source
$moveBySource = @{}
foreach($move in $moves) { $moveBySource[$move.Source.ToLowerInvariant()] = $move }
$maxDurationDelta = 0.0

foreach($ts in $tsFiles) {
  if(-not (Test-WithinAllowedBlocks $ts.FullName)) { throw "TS fora do escopo: $($ts.FullName)" }
  $mp4Source = [IO.Path]::ChangeExtension($ts.FullName, '.mp4')
  $key = $mp4Source.ToLowerInvariant()
  if(-not $moveBySource.ContainsKey($key)) { throw "MP4 correspondente não está no plano: $($ts.FullName)" }
  $tsDuration = [double](& $ffprobe -v error -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 $ts.FullName)
  if($LASTEXITCODE -ne 0) { throw "ffprobe falhou no TS: $($ts.FullName)" }
  $mp4Duration = [double](& $ffprobe -v error -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 $mp4Source)
  if($LASTEXITCODE -ne 0) { throw "ffprobe falhou no MP4: $mp4Source" }
  $delta = [math]::Abs($tsDuration - $mp4Duration)
  $maxDurationDelta = [math]::Max($maxDurationDelta, $delta)
  if($delta -gt 1) { throw "Duração divergente ($delta s): $($ts.FullName)" }
}

$movesNeeded = @($moves | Where-Object { $_.Source -ne $_.Target }).Count
$moveBytes = if($moves.Count) { [long](($moves | Measure-Object -Property Bytes -Sum).Sum) } else { 0L }
$tsBytes = if($tsFiles.Count) { [long](($tsFiles | Measure-Object -Property Length -Sum).Sum) } else { 0L }
$summary = [ordered]@{
  Mode = if($Apply) { 'apply' } else { 'check' }
  Lessons = $lessons.Count
  Videos = $moves.Count
  MovesNeeded = $movesNeeded
  MoveGiB = [math]::Round($moveBytes / 1GB, 2)
  TsFiles = $tsFiles.Count
  TsGiB = [math]::Round($tsBytes / 1GB, 2)
  DeleteTs = [bool]$DeleteTs
  MaxDurationDeltaSeconds = [math]::Round($maxDurationDelta, 3)
  CreatedDirectories = 0
  Moved = 0
  DeletedTs = 0
  RemainingTs = $tsFiles.Count
}

if(-not $Apply) {
  [pscustomobject]$summary | ConvertTo-Json -Compress
  $moves | Where-Object { $_.Source -ne $_.Target } |
    Sort-Object Block, Order, Source | Select-Object Block, Order, Lesson, Source, Target
  exit 0
}

foreach($directory in @($moves.TargetDir | Select-Object -Unique)) {
  if(-not (Test-Path -LiteralPath $directory)) {
    New-Item -ItemType Directory -Path $directory -Force | Out-Null
    $summary.CreatedDirectories += 1
  }
}

foreach($move in $moves) {
  if($move.Source -eq $move.Target) { continue }
  Move-Item -LiteralPath $move.Source -Destination $move.Target
  if(-not (Test-Path -LiteralPath $move.Target -PathType Leaf)) { throw "Movimentação não confirmada: $($move.Target)" }
  if((Get-Item -LiteralPath $move.Target).Length -ne $move.Bytes) { throw "Tamanho mudou após mover: $($move.Target)" }
  $summary.Moved += 1
}

if($DeleteTs) {
  foreach($ts in $tsFiles) {
    $mp4Source = [IO.Path]::ChangeExtension($ts.FullName, '.mp4')
    $move = $moveBySource[$mp4Source.ToLowerInvariant()]
    if(-not (Test-Path -LiteralPath $move.Target -PathType Leaf)) { throw "MP4 organizado ausente; TS preservado: $($ts.FullName)" }
    $probe = & $ffprobe -v error -select_streams v:0 -show_entries stream=codec_name -of default=noprint_wrappers=1:nokey=1 $move.Target
    if($LASTEXITCODE -ne 0 -or -not $probe) { throw "MP4 organizado inválido; TS preservado: $($ts.FullName)" }
    Remove-Item -LiteralPath $ts.FullName -Force
    if(Test-Path -LiteralPath $ts.FullName) { throw "Falha ao remover TS: $($ts.FullName)" }
    $summary.DeletedTs += 1
  }
}

$remainingTs = @($blocks | ForEach-Object {
  Get-ChildItem -LiteralPath (Join-Path $rootPath ('Bloco {0:d2}' -f $_)) -Recurse -File -Filter '*.ts'
})
$missingTargets = @($moves | Where-Object { -not (Test-Path -LiteralPath $_.Target -PathType Leaf) })
if($missingTargets.Count) { throw "$($missingTargets.Count) MP4s não foram encontrados nos destinos" }
$summary.RemainingTs = $remainingTs.Count
[pscustomobject]$summary | ConvertTo-Json -Compress
