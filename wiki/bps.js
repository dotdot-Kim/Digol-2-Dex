const table = Uint32Array.from({length:256}, (_, value) => {
  for (let bit = 0; bit < 8; bit++) value = (value >>> 1) ^ ((value & 1) ? 0xedb88320 : 0);
  return value;
});
function crc32(bytes) {
  let crc = 0xffffffff;
  for (const byte of bytes) crc = (crc >>> 8) ^ table[(crc ^ byte) & 255];
  return (crc ^ 0xffffffff) >>> 0;
}
function applyBps(source,patch) {
  const invalid = 'BPS 패치 구조가 올바르지 않습니다.';
  const end = patch.length - 12;
  if (end < 7 || String.fromCharCode(...patch.subarray(0,4)) !== 'BPS1') throw Error(invalid);
  const view = new DataView(patch.buffer,patch.byteOffset,patch.byteLength);
  if (crc32(patch.subarray(0,-4)) !== view.getUint32(end+8,true)) throw Error('패치 파일 체크섬이 일치하지 않습니다.');
  let offset = 4;
  function number() {
    let result = 0;
    let shift = 1;
    for (let i = 0; i < 6 && offset < end; i++) {
      const byte = patch[offset++];
      result += (byte & 127) * shift;
      if (byte & 128) return result;
      shift *= 128;
      result += shift;
    }
    throw Error(invalid);
  }
  function delta() {
    const value = number();
    return Math.floor(value / 2) * (value % 2 ? -1 : 1);
  }
  const sourceSize = number();
  const targetSize = number();
  const metadataSize = number();
  offset += metadataSize;
  if (offset > end) throw Error(invalid);
  if (sourceSize !== source.length || crc32(source) !== view.getUint32(end,true)) throw Error('원본 ROM이 이 패치와 일치하지 않습니다.');
  if (targetSize > 512 * 1024 * 1024) throw Error('결과 ROM이 지원 크기를 초과합니다.');
  const target = new Uint8Array(targetSize);
  let written = 0;
  let sourcePos = 0;
  let targetPos = 0;
  while (offset < end) {
    const command = number();
    const length = Math.floor(command / 4) + 1;
    if (written + length > target.length) throw Error(invalid);
    switch (command % 4) {
      case 0:
        if (written + length > source.length) throw Error(invalid);
        target.set(source.subarray(written,written+length),written);
        break;
      case 1:
        if (offset + length > end) throw Error(invalid);
        target.set(patch.subarray(offset,offset+length),written);
        offset += length;
        break;
      case 2:
        sourcePos += delta();
        if (sourcePos < 0 || sourcePos + length > source.length) throw Error(invalid);
        target.set(source.subarray(sourcePos,sourcePos+length),written);
        sourcePos += length;
        break;
      case 3:
        targetPos += delta();
        if (targetPos < 0 || targetPos >= written) throw Error(invalid);
        for (let i = 0; i < length; i++) target[written+i] = target[targetPos++];
        break;
    }
    written += length;
  }
  if (written !== target.length || crc32(target) !== view.getUint32(end+4,true)) throw Error('결과 ROM 체크섬이 일치하지 않습니다.');
  return target;
}
self.onmessage = async ({data:{rom,delta}}) => {
  try {
    if (rom.size > 512 * 1024 * 1024 || delta.size > 512 * 1024 * 1024) throw Error('파일이 지원 크기를 초과합니다.');
    const source = new Uint8Array(await rom.arrayBuffer());
    const patch = new Uint8Array(await delta.arrayBuffer());
    const target = applyBps(source,patch);
    self.postMessage({buffer:target.buffer},[target.buffer]);
  } catch (error) {
    self.postMessage({error:error.message || '패치 적용에 실패했습니다.'});
  }
};
