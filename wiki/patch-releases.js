// Reference ROM supplied by the project owner (rom.zip / rom.nds).
const patchBaseRom = {crc32:'C180A0E9',size:134217728};

// Add published xdelta files when they are ready. Dates use YYYY-MM-DD.
// Each files entry accepts a path or {file, outputCrc32, outputName}.
// A release with only one difficulty hides the cards and shows that difficulty's name.
// Optional release inputCrc32/inputSize override patchBaseRom for older versions.
// Example shape (replace the paths and checksums before adding a release):
// {version:'1.0.0', releasedAt:'2026-11-19', files:{
//   casual:{file:'patches/1.0.0/casual.xdelta', outputCrc32:'12345678'},
//   classic:{file:'patches/1.0.0/classic.xdelta', outputCrc32:'23456789'},
//   challenge:{file:'patches/1.0.0/challenge.xdelta', outputCrc32:'34567890'}
// }}
const patchReleases = [
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
