// Reference ROM supplied by the project owner (rom.zip / rom.nds).
const patchBaseRom = {crc32:'C180A0E9',size:134217728};

// Add published xdelta files when they are ready. Dates use YYYY-MM-DD.
// Each files entry accepts a path or {file, outputCrc32, outputName}.
// Difficulties missing from a release are shown disabled (추후 추가).
// updates:[{from, file}] lets a ROM patched with an earlier release of the same
// difficulty (its outputCrc32) be updated directly; the uploaded name keeps, version changes.
// Optional release inputCrc32/inputSize override patchBaseRom for older versions.
// Example shape (replace the paths and checksums before adding a release):
// {version:'1.0.0', releasedAt:'2026-11-19', files:{
//   casual:{file:'patches/1.0.0/casual.xdelta', outputCrc32:'12345678'},
//   classic:{file:'patches/1.0.0/classic.xdelta', outputCrc32:'23456789'},
//   challenge:{file:'patches/1.0.0/challenge.xdelta', outputCrc32:'34567890'}
// }}
const patchReleases = [
  // 0.9.4 withdrawn 2026-11-23 (battle freezes / contacts reported); files kept in patches/0.9.4.
  // {version:'0.9.4', releasedAt:'2026-11-22', files:{classic:{file:'patches/0.9.4/digol-gold-0.9.4.xdelta', outputCrc32:'92C22566'}}},
  {version:'0.9.3', releasedAt:'2026-11-21', files:{
    classic:{file:'patches/0.9.3/digol-gold-0.9.3.xdelta', outputCrc32:'880AC2C7', updates:[
      {from:'0.9.2', file:'patches/0.9.3/classic-from-0.9.2.xdelta'},
      {from:'0.9.1', file:'patches/0.9.3/classic-from-0.9.1.xdelta'},
      {from:'0.9.0', file:'patches/0.9.3/classic-from-0.9.0.xdelta'}
    ]}
  }},
  {version:'0.9.2', releasedAt:'2026-11-21', files:{
    classic:{file:'patches/0.9.2/digol-gold-0.9.2.xdelta', outputCrc32:'47DCD8EE', updates:[
      {from:'0.9.1', file:'patches/0.9.2/classic-from-0.9.1.xdelta'},
      {from:'0.9.0', file:'patches/0.9.2/classic-from-0.9.0.xdelta'}
    ]}
  }},
  {version:'0.9.1', releasedAt:'2026-11-20', files:{
    classic:{file:'patches/0.9.1/digol-gold-0.9.1.xdelta', outputCrc32:'0FB406F8'}
  }},
  {version:'0.9.0', releasedAt:'2026-11-19', files:{
    classic:{file:'patches/0.9.0/digol-gold-0.9.0.xdelta', outputCrc32:'4978FA97'}
  }}
];

// Register one normalization patch from a known alternate ROM to patchBaseRom.
// {file:'patches/normalize.xdelta', inputCrc32:'ALTERNATE_CRC',
//  outputCrc32:patchBaseRom.crc32, outputSize:patchBaseRom.size}
const patchNormalization = {
  file:'patches/normalize-xenophobia.xdelta',
  inputCrc32:'FFD28F00',
  outputCrc32:patchBaseRom.crc32,
  outputSize:patchBaseRom.size
};
