// Reference ROM supplied by the project owner (rom.zip / rom.nds).
const patchBaseRom = {crc32:'C180A0E9',size:134217728};

// Add published xdelta files when they are ready. Dates use YYYY-MM-DD.
// Each files entry accepts a path or {file, outputCrc32, outputName}.
// Difficulties missing from a release are shown disabled (추후 추가).
// updates:[{from, file}] lets a ROM patched with an earlier release of the same
// difficulty (its outputCrc32) be updated directly; the uploaded name keeps, version changes.
// Set updates[].inputCrc32 explicitly when the source release isn't listed.
// Optional release inputCrc32/inputSize override patchBaseRom for older versions.
// Example shape (replace the paths and checksums before adding a release):
// {version:'1.0.0', releasedAt:'2026-11-19', files:{
//   casual:{file:'patches/1.0.0/casual.xdelta', outputCrc32:'12345678'},
//   classic:{file:'patches/1.0.0/classic.xdelta', outputCrc32:'23456789'},
//   challenge:{file:'patches/1.0.0/challenge.xdelta', outputCrc32:'34567890'}
// }}
const patchReleases = [
  {
    "version": "0.9.4-fix",
    "releasedAt": "2026-11-23",
    "files": {
      "classic": {
        "file": "patches/0.9.4-fix/digol-gold-0.9.4-fix.xdelta",
        "outputCrc32": "F45ACFB2",
        "updates": [
          {
            "from": "0.9.4",
            "inputCrc32": "92C22566",
            "file": "patches/0.9.4-fix/classic-from-0.9.4.xdelta"
          },
          {
            "from": "0.9.3",
            "file": "patches/0.9.4-fix/classic-from-0.9.3.xdelta",
            "inputCrc32": "880AC2C7"
          }
        ]
      }
    }
  },
  {
    "version": "0.9.3",
    "releasedAt": "2026-11-21",
    "files": {
      "classic": {
        "file": "patches/0.9.3/digol-gold-0.9.3.xdelta",
        "outputCrc32": "880AC2C7",
        "updates": [
          {
            "from": "0.9.2",
            "file": "patches/0.9.3/classic-from-0.9.2.xdelta",
            "inputCrc32": "47DCD8EE"
          },
          {
            "from": "0.9.1",
            "file": "patches/0.9.3/classic-from-0.9.1.xdelta",
            "inputCrc32": "0FB406F8"
          },
          {
            "from": "0.9.0",
            "file": "patches/0.9.3/classic-from-0.9.0.xdelta",
            "inputCrc32": "4978FA97"
          }
        ]
      }
    }
  },
  {
    "version": "0.9.2",
    "releasedAt": "2026-11-21",
    "files": {
      "classic": {
        "file": "patches/0.9.2/digol-gold-0.9.2.xdelta",
        "outputCrc32": "47DCD8EE",
        "updates": [
          {
            "from": "0.9.1",
            "file": "patches/0.9.2/classic-from-0.9.1.xdelta",
            "inputCrc32": "0FB406F8"
          },
          {
            "from": "0.9.0",
            "file": "patches/0.9.2/classic-from-0.9.0.xdelta",
            "inputCrc32": "4978FA97"
          }
        ]
      }
    }
  },
  {
    "version": "0.9.1",
    "releasedAt": "2026-11-20",
    "files": {
      "classic": {
        "file": "patches/0.9.1/digol-gold-0.9.1.xdelta",
        "outputCrc32": "0FB406F8"
      }
    }
  },
  {
    "version": "0.9.0",
    "releasedAt": "2026-11-19",
    "files": {
      "classic": {
        "file": "patches/0.9.0/digol-gold-0.9.0.xdelta",
        "outputCrc32": "4978FA97"
      }
    }
  },
  {
    "version": "0.9.4",
    "releasedAt": "2026-11-22",
    "files": {
      "classic": {
        "file": "patches/0.9.4/digol-gold-0.9.4.xdelta",
        "outputCrc32": "92C22566"
      }
    },
    "hidden": true
  },
  {
    "version": "0.9.5",
    "releasedAt": "2026-11-23",
    "files": {
      "classic": {
        "file": "patches/0.9.5/classic-780BAEDF.xdelta",
        "outputCrc32": "780BAEDF",
        "updates": [
          {
            "from": "0.9.4-fix",
            "inputCrc32": "F45ACFB2",
            "file": "patches/0.9.5/classic-780BAEDF-from-0.9.4-fix-F45ACFB2.xdelta"
          },
          {
            "from": "0.9.0",
            "inputCrc32": "4978FA97",
            "file": "patches/0.9.5/classic-780BAEDF-from-0.9.0-4978FA97.xdelta"
          },
          {
            "from": "0.9.5",
            "inputCrc32": "A1D99C2B",
            "file": "patches/0.9.5/classic-780BAEDF-from-0.9.5-A1D99C2B.xdelta"
          },
          {
            "from": "0.9.3",
            "inputCrc32": "880AC2C7",
            "file": "patches/0.9.5/classic-780BAEDF-from-0.9.3-880AC2C7.xdelta"
          },
          {
            "from": "0.9.4",
            "inputCrc32": "92C22566",
            "file": "patches/0.9.5/classic-780BAEDF-from-0.9.4-92C22566.xdelta"
          }
        ]
      }
    }
  },
  {
    "version": "0.9.5",
    "releasedAt": "2026-11-23",
    "archived": true,
    "hidden": true,
    "files": {
      "classic": {
        "file": "patches/0.9.5/classic-A1D99C2B.xdelta",
        "outputCrc32": "A1D99C2B",
        "updates": [
          {
            "from": "0.9.4-fix",
            "inputCrc32": "F45ACFB2",
            "file": "patches/0.9.5/classic-A1D99C2B-from-0.9.4-fix-F45ACFB2.xdelta"
          },
          {
            "from": "0.9.0",
            "inputCrc32": "4978FA97",
            "file": "patches/0.9.5/classic-A1D99C2B-from-0.9.0-4978FA97.xdelta"
          }
        ]
      }
    }
  },
  {
    "version": "0.9.6",
    "releasedAt": "2026-11-25",
    "files": {
      "classic": {
        "outputCrc32": "6138E3C0",
        "updates": [
          {
            "from": "0.9.5",
            "inputCrc32": "780BAEDF",
            "file": "patches/0.9.6/classic-6138E3C0-from-0.9.5-780BAEDF.xdelta"
          },
          {
            "from": "0.9.6",
            "inputCrc32": "D6ACAC28",
            "file": "patches/0.9.6/classic-6138E3C0-from-0.9.6-D6ACAC28.xdelta"
          }
        ]
      }
    }
  },
  {
    "version": "0.9.6",
    "releasedAt": "2026-11-25",
    "archived": true,
    "hidden": true,
    "files": {
      "classic": {
        "outputCrc32": "D6ACAC28",
        "updates": [
          {
            "from": "0.9.5",
            "inputCrc32": "780BAEDF",
            "file": "patches/0.9.6/classic-D6ACAC28-from-0.9.5-780BAEDF.xdelta"
          }
        ]
      }
    }
  },
  {
    "version": "0.9.7",
    "releasedAt": "2026-11-28",
    "files": {
      "classic": {
        "outputCrc32": "2594134A",
        "updates": [
          {
            "from": "0.9.6",
            "inputCrc32": "6138E3C0",
            "file": "patches/0.9.7/classic-2594134A-from-0.9.6-6138E3C0.xdelta"
          }
        ]
      }
    }
  }
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
