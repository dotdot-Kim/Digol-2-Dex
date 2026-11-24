importScripts(
  'vendor/rom-patcher/modules/BinFile.js',
  'vendor/rom-patcher/modules/HashCalculator.js',
  'vendor/rom-patcher/modules/RomPatcher.format.ips.js',
  'vendor/rom-patcher/modules/RomPatcher.format.ups.js',
  'vendor/rom-patcher/modules/RomPatcher.format.aps_n64.js',
  'vendor/rom-patcher/modules/RomPatcher.format.aps_gba.js',
  'vendor/rom-patcher/modules/RomPatcher.format.bps.js',
  'vendor/rom-patcher/modules/RomPatcher.format.rup.js',
  'vendor/rom-patcher/modules/RomPatcher.format.ppf.js',
  'vendor/rom-patcher/modules/RomPatcher.format.bdf.js',
  'vendor/rom-patcher/modules/RomPatcher.format.pmsr.js',
  'vendor/rom-patcher/modules/RomPatcher.format.vcdiff.js',
  'vendor/rom-patcher/RomPatcher.js'
);

const maxFileSize = 512 * 1024 * 1024;

function crcValue(value) {
  if (value === undefined || value === null) return null;
  if (typeof value === 'number' && Number.isInteger(value) && value >= 0 && value <= 0xffffffff) return value;
  if (typeof value === 'string' && /^(?:0x)?[0-9a-f]{8}$/i.test(value)) return parseInt(value.replace(/^0x/i,''),16);
  throw Error('패치 등록 정보의 CRC32 값이 올바르지 않습니다.');
}

function crcHex(value) {
  return value.toString(16).padStart(8,'0').toUpperCase();
}

function progress(status,extra = {}) {
  self.postMessage({type:'progress',status,...extra});
}

async function readFile(file) {
  if (!file || !file.size || file.size > maxFileSize) throw Error('파일 크기는 1바이트 이상 512MB 이하여야 합니다.');
  return new BinFile(await file.arrayBuffer());
}

// Check window boundaries before the upstream decoder allocates its output.
// Keep the window checksums, including zero, for explicit result validation.
function vcdiffWindows(file,sourceSize) {
  const bytes = file._u8array;
  const invalid = 'xdelta 패치 구조가 올바르지 않습니다.';
  let offset = 4;
  const byte = () => {
    if (offset >= bytes.length) throw Error(invalid);
    return bytes[offset++];
  };
  const number = () => {
    let value = 0;
    for (let i = 0; i < 5; i++) {
      const part = byte();
      value = value * 128 + (part & 127);
      if (value > 0x7fffffff) throw Error(invalid);
      if (!(part & 128)) return value;
    }
    throw Error(invalid);
  };
  if (bytes[3] !== 0) throw Error('지원하지 않는 xdelta 형식 버전입니다.');
  const flags = byte();
  if (flags & ~7) throw Error(invalid);
  if (flags & 1) {
    if (![1,2].includes(byte())) throw Error('지원하지 않는 xdelta 압축 방식입니다. -S none 설정으로 패치를 만들어 주세요.');
  }
  if (flags & 2) throw Error('사용자 정의 코드 테이블이 있는 xdelta 패치는 지원하지 않습니다.');
  if (flags & 4) {
    const headerLength = number();
    offset += headerLength;
  }
  if (offset > bytes.length) throw Error(invalid);
  const windows = [];
  let targetSize = 0;
  while (offset < bytes.length) {
    const indicator = byte();
    if ((indicator & ~7) || (indicator & 3) === 3) throw Error(invalid);
    if (indicator & 3) {
      const length = number();
      const start = number();
      const available = indicator & 1 ? sourceSize : targetSize;
      if (start + length > available) throw Error('원본 ROM 크기가 xdelta 패치와 일치하지 않습니다.');
    }
    const deltaLength = number();
    const windowEnd = offset + deltaLength;
    const length = number();
    const compression = byte();
    if ((compression & ~7) || (compression && !(flags & 1))) throw Error(invalid);
    const dataLength = number();
    const instructionsLength = number();
    const addressesLength = number();
    let checksum = null;
    if (indicator & 4) checksum = ((byte() * 0x1000000) + (byte() << 16) + (byte() << 8) + byte()) >>> 0;
    if (offset + dataLength + instructionsLength + addressesLength !== windowEnd || windowEnd > bytes.length) throw Error(invalid);
    if (targetSize + length > maxFileSize) throw Error('결과 ROM이 지원 크기 512MB를 초과합니다.');
    windows.push({start:targetSize,length,checksum});
    targetSize += length;
    offset = windowEnd;
  }
  if (!windows.length || !targetSize) throw Error(invalid);
  return windows;
}

function checkBpsStructure(file) {
  const bytes = file._u8array;
  const end = file.fileSize - 12;
  const invalid = 'BPS 패치 구조가 올바르지 않습니다.';
  let offset = 4;
  const number = () => {
    let value = 0;
    let shift = 1;
    for (let i = 0; i < 6 && offset < end; i++) {
      const part = bytes[offset++];
      value += (part & 127) * shift;
      if (!Number.isSafeInteger(value)) throw Error(invalid);
      if (part & 128) return value;
      shift *= 128;
      value += shift;
    }
    throw Error(invalid);
  };
  number();
  const targetSize = number();
  if (targetSize > maxFileSize) throw Error('결과 ROM이 지원 크기 512MB를 초과합니다.');
  const metadataLength = number();
  offset += metadataLength;
  let written = 0;
  while (offset < end) {
    const action = number();
    const length = Math.floor(action / 4) + 1;
    written += length;
    if (action % 4 === 1) offset += length;
    else if (action % 4 >= 2) number();
    if (written > targetSize) throw Error(invalid);
  }
  if (offset !== end || written !== targetSize) throw Error(invalid);
}

function applyDelta(source,delta) {
  const bytes = delta._u8array;
  const isXdelta = bytes[0] === 0xd6 && bytes[1] === 0xc3 && bytes[2] === 0xc4;
  const isBps = bytes[0] === 0x42 && bytes[1] === 0x50 && bytes[2] === 0x53 && bytes[3] === 0x31;
  if (!isXdelta && !isBps) throw Error('xdelta(.xdelta, .vcdiff) 또는 BPS 패치 파일을 선택해 주세요.');
  const windows = isXdelta ? vcdiffWindows(delta,source.fileSize) : [];
  if (isBps) checkBpsStructure(delta);
  const patch = RomPatcher.parsePatchFile(delta);
  // The core validates the source. Its default apply call omits target validation,
  // so validate BPS output and VCDIFF window checksums explicitly below.
  const target = RomPatcher.applyPatch(source,patch,{requireValidation:true,outputSuffix:false});
  if (isBps && (source.fileSize !== patch.sourceSize || target.hashCRC32() !== patch.targetChecksum)) {
    throw Error('결과 ROM 체크섬이 일치하지 않습니다.');
  }
  for (const window of windows) {
    if (window.checksum !== null && target.hashAdler32(window.start,window.length) !== window.checksum) {
      throw Error('결과 ROM 체크섬이 일치하지 않습니다. 원본 ROM 또는 패치 파일을 확인해 주세요.');
    }
  }
  return target;
}

async function fetchPatch(file,message) {
  let response;
  try { response = await fetch(file); } catch { throw Error(message); }
  if (!response.ok) throw Error(message);
  return readFile(await response.blob());
}

// Every edge is keyed by the exact ROM checksum, including hidden and replaced releases.
function findUpdateRoute(updates,source,target) {
  if (target === null) return null;
  const outgoing = new Map();
  for (const edge of updates) {
    const input = crcValue(edge.inputCrc32);
    if (!outgoing.has(input)) outgoing.set(input,[]);
    outgoing.get(input).push(edge);
  }
  const seen = new Set([source]);
  const queue = [{crc:source,route:[]}];
  for (const step of queue) {
    for (const edge of outgoing.get(step.crc) || []) {
      const output = crcValue(edge.outputCrc32);
      if (seen.has(output)) continue;
      const route = [...step.route,edge];
      if (output === target) return route;
      seen.add(output);
      queue.push({crc:output,route});
    }
  }
  return null;
}

self.onmessage = async ({data:{rom,delta,deltaUrl,updates,inputCrc32,inputSize,outputCrc32,normalization}}) => {
  try {
    progress('원본 ROM을 확인하는 중…');
    let source = await readFile(rom);
    const originalCrc = source.hashCRC32();
    progress('원본 ROM을 확인했습니다.',{sourceCrc32:crcHex(originalCrc)});
    const expectedOutput = crcValue(outputCrc32);
    if (expectedOutput !== null && originalCrc === expectedOutput) throw Error('이미 이 버전으로 패치된 ROM입니다.');
    const route = findUpdateRoute(updates || [],originalCrc,expectedOutput);
    if (route) {
      let normalized = false;
      for (const [index, edge] of route.entries()) {
        progress((edge.normalize ? '원본 ROM 정규화 중…' : edge.from + ' → ' + edge.to + ' 패치를 적용하는 중…')
          + ' (' + (index + 1) + '/' + route.length + ')');
        const updateDelta = await fetchPatch(edge.file,'패치 파일을 불러오지 못했습니다.');
        source = applyDelta(source,updateDelta);
        if (source.hashCRC32() !== crcValue(edge.outputCrc32)
          || (edge.outputSize != null && source.fileSize !== edge.outputSize)) {
          throw Error(edge.normalize ? '정규화 결과가 기준 원본 ROM과 일치하지 않습니다.'
            : edge.to + ' 버전의 결과 ROM CRC32가 등록된 값과 일치하지 않습니다.');
        }
        if (edge.normalize) normalized = true;
      }
      const first = route.find(edge => !edge.normalize);
      self.postMessage({type:'complete',buffer:source._u8array.buffer,sourceCrc32:crcHex(originalCrc),
        outputCrc32:crcHex(expectedOutput),normalized,
        updatedFrom:first && first.from !== '원본' ? first.from : undefined},[source._u8array.buffer]);
      return;
    }
    if (updates && updates.length && !delta) {
      throw Error('이 ROM에서 선택한 버전으로 가는 패치가 없습니다. 원본 ROM 또는 배포된 디지골드 ROM인지 확인해 주세요. (CRC32 '
        + crcHex(originalCrc) + ')');
    }
    const expectedInput = crcValue(inputCrc32);
    let normalized = false;
    if (expectedInput !== null && originalCrc !== expectedInput) {
      if (!normalization || crcValue(normalization.inputCrc32) !== originalCrc
        || crcValue(normalization.outputCrc32) !== expectedInput) {
        throw Error('지원하지 않는 원본 ROM입니다. CRC32 ' + crcHex(originalCrc) + ' · 필요한 CRC32 ' + crcHex(expectedInput));
      }
      progress('원본 ROM 정규화 중…');
      let response;
      try { response = await fetch(normalization.file); } catch { throw Error('정규화 패치 파일을 불러오지 못했습니다.'); }
      if (!response.ok) throw Error('정규화 패치 파일을 불러오지 못했습니다.');
      source = applyDelta(source,await readFile(await response.blob()));
      if (source.hashCRC32() !== expectedInput || (normalization.outputSize != null && source.fileSize !== normalization.outputSize)) {
        throw Error('정규화 결과가 기준 원본 ROM과 일치하지 않습니다.');
      }
      normalized = true;
      progress('정규화를 완료했습니다. 게임 패치를 적용하는 중…');
    }
    if (inputSize != null && source.fileSize !== inputSize) throw Error('원본 ROM 크기가 기준 원본과 일치하지 않습니다.');
    if (!delta) {
      progress('패치 파일을 불러오는 중…');
      delta = await fetchPatch(deltaUrl,'패치 파일을 불러오지 못했습니다.');
    } else delta = await readFile(delta);
    progress('게임 패치를 적용하고 결과를 확인하는 중…');
    const target = applyDelta(source,delta);
    const resultCrc = target.hashCRC32();
    if (expectedOutput !== null && resultCrc !== expectedOutput) throw Error('결과 ROM CRC32가 등록된 값과 일치하지 않습니다.');
    self.postMessage({type:'complete',buffer:target._u8array.buffer,sourceCrc32:crcHex(originalCrc),outputCrc32:crcHex(resultCrc),normalized},[target._u8array.buffer]);
  } catch (error) {
    const messages = {
      'Invalid input ROM checksum':'원본 ROM이 이 패치와 일치하지 않습니다.',
      'Patch checksum mismatch':'패치 파일 체크섬이 일치하지 않습니다.'
    };
    self.postMessage({type:'error',error:messages[error.message] || error.message || '패치 적용에 실패했습니다.'});
  }
};
