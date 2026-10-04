# 01. 설치 · 빌드 · 업데이트 · CONFIG

> 기준: `BluRosie/hg-engine` `main` @ `027977cca9c93d5c7346081af837ec33706303f8`

---

# 1. hg-engine의 전제

hg-engine은 **영문(US) Pokémon HeartGold**를 대상으로 하는 엔진 오버홀입니다. 기준 Makefile은 ROM 헤더의 game code가 `IPKE`인지 검사하며, 다른 언어/버전 ROM이면 빌드를 중단합니다.

필수 전제:

- US HeartGold ROM
- 파일명: `rom.nds`
- hg-engine repo 루트에 위치
- Git 저장소 내부에서 빌드
- OneDrive 경로 사용 금지(현재 Makefile이 명시적으로 중단)

빌드 결과는 기본적으로:

```text
rom.nds   -> 입력
base/     -> 엔진이 사용하는 평탄화된 추출 파일
base_dsrom/ -> ds-rom의 config.yaml/원본 구조
build/    -> 중간 산출물
test.nds  -> 최종 결과
```

입니다.

---

# 2. 설치 방식

공식 README에서 지원하는 설치 방식:

- Linux apt
- Linux apk
- Linux dnf/yum
- Linux pacman
- macOS
- Windows + WSL
- Windows + MSYS2
- Docker

Digol-2의 Windows 개발 환경에서는 **WSL을 기본 권장**합니다. 이유는 공식 README가 가장 상세히 지원하고, Python/GCC/Make 도구 체인이 Linux 환경에서 비교적 일관되기 때문입니다.

---

# 3. Windows + WSL 권장 설치

## 3.1 WSL 활성화

관리자 권한 명령 프롬프트에서:

```bat
dism.exe /online /enable-feature /featurename:Microsoft-Windows-Subsystem-Linux /all
```

재부팅 후 Microsoft Store에서 Ubuntu 설치.

최근 Windows에서는 `wsl --install`을 사용할 수도 있지만, hg-engine README의 기준 절차는 위 방식입니다. 프로젝트에서 설치 자동화를 만들기 전에는 README 기준과 실제 현재 WSL 상태를 함께 확인하십시오.

## 3.2 Ubuntu 업데이트

```bash
sudo apt update
sudo apt upgrade
```

## 3.3 의존성 설치

```bash
sudo apt-get install \
  build-essential \
  git \
  libpng-dev \
  gdebi-core \
  python3 \
  python3-pip \
  python3-venv \
  gcc-arm-none-eabi \
  pkg-config
```

2026-10-01 기준 기본 ROM 도구는 `ds-rom`이며 Rust/Cargo가 추가로 필요합니다. 공식 README의 rustup 설치 방법:

```bash
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
. "$HOME/.cargo/env"
cargo --version
```

`curl`이 없다면 패키지 관리자로 먼저 설치합니다. MSYS2 공식 설치 목록에는 `mingw-w64-x86_64-rust`가 추가됐습니다. `cmake/automake/autoconf`는 기본 ds-rom 경로의 README 목록에서 빠졌지만, 아래의 ndstool 덤프 우회 경로에서는 autotools가 다시 필요할 수 있습니다.

현재 Makefile은 Python venv 사용 가능 여부를 검사하고, 가능하면 `.venv`를 생성합니다. ds-rom bridge는 `PyYAML`을 사용합니다. 기존 `.venv`가 남아 있으면 새 패키지 설치 규칙이 재실행되지 않을 수 있으므로 `make clean_tools` 후 재빌드하거나, 해당 환경에서 `python -m pip install PyYAML`을 실행합니다.

---

# 4. 저장소 구성

## 4.1 fork 권장

공식 README도 fork 방식을 권장합니다.

```bash
mkdir -p ~/git
cd ~/git
git clone --recursive https://github.com/YOUR-USERNAME/hg-engine.git
cd hg-engine
git remote add upstream https://github.com/BluRosie/hg-engine.git
```

`--recursive`가 중요합니다. hg-engine에는 submodule/tool source 의존성이 있습니다.

확인:

```bash
git remote -v
```

예상:

```text
origin   https://github.com/YOUR-USERNAME/hg-engine.git
upstream https://github.com/BluRosie/hg-engine.git
```

## 4.2 일반 clone

```bash
git clone --recursive https://github.com/BluRosie/hg-engine.git
```

가능하지만 개인 수정이 많아지는 Digol-2에는 비추천입니다.

---

# 5. 최초 빌드

repo root:

```text
hg-engine/
  rom.nds
  Makefile
  ...
```

실행:

```bash
make
```

CPU 코어 수 확인:

```bash
nproc
```

예: 8코어라면:

```bash
make -j8
```

성공 결과:

```text
test.nds
```

주의: `make`가 성공해도 새로운 종이 자동으로 야생/트레이너에 배치되는 것은 아닙니다. 엔진/데이터에 존재 가능하게 만든 것일 뿐입니다.

---

# 6. 현재 Makefile의 실제 빌드 흐름

최신 Makefile의 `all`은 대략 다음 순서로 움직입니다.

1. C/ASM 코드 컴파일
2. hg-engine 내부 도구 build
3. `rom.nds` 추출 -> `base/`
4. 각 데이터 source를 generator로 NARC/텍스트/그래픽으로 생성
5. `scripts/make.py` 실행
6. `make move_narc`
7. `armips/global.s` 적용
8. a028 등의 custom NARC 재생성
9. 기본 `ds-rom` + `scripts/dsrom_bridge.py`로 `test.nds` 재조립

핵심 도구:

| 도구 | 역할 |
|---|---|
| `tools/speciesdatagen` | `data/Species.c` -> personal data + 텍스트 + 일부 Pokédex metrics |
| `tools/movedatagen` | `data/Moves.c` -> move data + 관련 텍스트 |
| `tools/trainerdatagen` | `data/Trainers.c` -> trainer data / party / text |
| `tools/pokedexdatagen` | Pokédex sort/area 데이터 생성 |
| `tools/narcpy.py` | NARC 생성/추출 |
| `tools/msgenc` | 메시지 인코딩 |
| `tools/nitrogfx` | 그래픽 변환 |
| `tools/armips` | 바이너리 패치/ASM 적용 |
| `tools/dsrom` | 기본 ROM 추출/재조립; Rust/Cargo로 빌드 |
| `scripts/dsrom_bridge.py` | ds-rom 구조 ↔ 기존 `base/` 구조 연결; PyYAML 사용 |
| `tools/jsonproc` | 이벤트 JSON을 ASM으로 변환 |
| `tools/ndstool` | 선택 가능한 기존 경로; `ROM_TOOL=tools/ndstool` |

`Makefile`의 기본값은 `ROM_TOOL ?= $(DSROM)`이고 `DSROM := tools/dsrom`입니다. ds-rom 도구 자체는 `3bfef542191764df2afa39254bbf18f68c621d22`로 고정해 빌드합니다. 도구를 바꿀 때는 추출물이 섞이지 않도록 `make clean` 후 빌드합니다.

---

# 7. clean 명령

## `make clean`

```bash
make clean
```

삭제:

- `build/`
- `base/`, `base_dsrom/`
- generated 디렉터리 등

가장 강한 일반 초기화입니다.

## `make clean_code`

```bash
make clean_code
```

C/ASM 코드 object, linked output, overlay output 등을 삭제합니다.

사용 권장 상황:

- C 함수 수정 후 이상하게 이전 코드가 남는 것 같을 때
- linker/hook/overlay 변경
- header 변경이 dependency에 제대로 반영되지 않는 의심이 있을 때

## `make clean_tools`

```bash
make clean_tools
```

도구 binary와 `.venv` 삭제.

사용 상황:

- tool build가 깨짐
- Python env가 꼬임
- 오래된 tool binary가 남아 있음

---

# 8. Docker

**[CAUTION: 2026-10-01 소스 점검]** `Dockerfile`은 이번 비교 기간에 변경되지 않았고 Rust/Cargo 설치가 없습니다. 따라서 아래 기존 Docker 절차만으로 새 기본 ds-rom 빌드가 준비된다고 보장할 수 없습니다. 이미지에 Rust/Cargo 및 필요한 Python 의존성을 설치하거나, 기존 ndstool 빌드 경로를 명시해야 합니다. 이 문서 갱신에서는 Docker 실행을 검증하지 않았습니다.

기존 명령:

```bash
docker build . -t hg-engine
```

빌드:

```bash
./docker-makerom.cmd
```

Docker도 모든 변경에서 자동 clean을 보장하지 않으므로 필요 시:

```bash
make clean
make clean_code
```

을 수행합니다.

---

# 9. upstream 업데이트

fork 기준:

```bash
git fetch upstream
git merge upstream/main
```

또는 개발 정책에 따라 rebase를 사용할 수 있으나, hg-engine README 기본은 merge입니다.

업데이트 전 권장:

```bash
git status
git log --oneline -5
```

업데이트 후:

```bash
git diff OLD_COMMIT..upstream/main -- \
  Makefile narcs.mk overlays.mk include/config.h armips/include/config.s \
  include/constants/species.h include/constants/ability.h \
  include/species_data.h include/move_data.h include/trainer_data.h
```

Digol-2 converter와 직접 연결될 데이터 구조가 바뀌었는지 먼저 봅니다.

---

# 10. CONFIG의 두 계층

hg-engine 설정은 크게:

- `include/config.h` — C 코드
- `armips/include/config.s` — armips/ASM 패치

두 파일로 나뉩니다.

같은 기능이 양쪽에 존재할 수 있으므로 한쪽만 바꾸면 비일관 상태가 될 수 있습니다.

---

# 11. 중요한 C CONFIG

## `GEN_LATEST`

일반 build에서는 현재 `9`.

테스트 build의 `DEBUG_BATTLE_SCENARIOS`에서는 `GEN_CHAMPIONS`(99)로 바뀌는 구조가 있습니다.

따라서 테스트가 일반 ROM과 다르게 보이면 generation config를 확인하십시오.

## `FAIRY_TYPE_IMPLEMENTED`

```c
#define FAIRY_TYPE_IMPLEMENTED 1
```

Fairy type 활성.

## `ALLOW_SAVE_CHANGES`

활성 시:

- 확장 Dex/save field
- 추가 기능 저장 공간
- 일부 폼 시스템

등에 필요하지만 **PKHeX 호환성을 깰 수 있습니다.**

Digol-2에서는 장기적으로 새로운 종을 대량 추가하므로 save 확장 정책을 프로젝트 초기에 고정하는 편이 좋습니다.

## `HIDDEN_ABILITIES`

활성 시 히든 특성 시스템 사용.

```c
#define HIDDEN_ABILITIES
#define HIDDEN_ABILITIES_FLAG 2600
#define HIDDEN_ABILITIES_STARTERS_FLAG 2601
```

## `MEGA_EVOLUTIONS`

Mega 시스템.

## `PRIMAL_REVERSION`

Groudon/Kyogre 원시회귀 시스템.

## `ITEM_POCKET_EXPANSION`

아이템 추가 시 bag pocket 확장.

## `IMPLEMENT_WILD_DOUBLE_BATTLES`

현재 소스 주석 자체가 **unstable and broken**이라고 경고합니다.

Digol-2에서는 기본 비활성 권장.

## `IMPLEMENT_CAPTURE_EXPERIENCE`

포획 경험치.

## `IMPLEMENT_CRITICAL_CAPTURE`

critical capture.

## `IMPLEMENT_LEVEL_CAP`

스크립트 변수 기반 hard cap.

관련:

- `LEVEL_CAP_VARIABLE`
- `UNCAP_CANDIES_FROM_LEVEL_CAP`
- `ALLOW_LEVEL_CAP_EVOLVE`

## gimmick flags

```c
FLAG_MEGA_EVOLUTION_ENABLED
FLAG_Z_MOVE_ENABLED
FLAG_DYNAMAX_ENABLED
FLAG_TERASTALIZATION_ENABLED
```

시스템 flag로 gimmick 사용 가능 여부 제어.

## `IMPLEMENT_SEASONS`

Deerling/Sawsbuck 등의 season form.

## `IMPLEMENT_DYNAMIC_WILD_SPECIES_FORMS`

야생 폼 동적 선택.

## `EXPAND_PC_BOXES`

18 -> 30 boxes.

## `SHINY_ODDS`

기본:

```c
#define SHINY_ODDS 8
```

실제 확률 = 8 / 65536.

## `FRIENDSHIP_EVOLUTION_THRESHOLD`

현재 기본 160.

## `RESTORE_ITEMS_AT_BATTLE_END`

현대 세대식 일부 소모 held item 복구.

## `PROTEAN_GENERATION`

Protean 동작 세대 결정.

## `BATTLE_BOND_GENERATION`

Battle Bond 동작 세대.

## `SNOW_WARNING_GENERATION`

9+ Snow, 이하 Hail.

## `REUSABLE_TMS`

TM 무한.

## `MART_EXPANSION`

상점 inventory 확장.

## `UPDATE_MACHINE_MOVE_LABELS`

TM/HM/TR 표시 현대화. TM 99 초과와도 연결됨.

## `BLOCK_LEARNING_UNIMPLEMENTED_MOVES`

미구현 기술 학습 차단.

## Champions 계열

```c
CHAMPIONS_POWER_CHANGES
CHAMPIONS_TYPE_CHANGES
CHAMPIONS_ACC_CHANGES
CHAMPIONS_PP_CHANGES
CHAMPIONS_EFFECT_CHANCE_CHANGES
```

Champions식 수치 변경 적용 여부.

Digol-2의 밸런스 기준을 만들 때 반드시 어떤 generation behavior를 채택하는지 명시해야 합니다.

---

# 12. 중요한 ASM CONFIG

대표:

```asm
DISALLOW_DEXIT_GEN
FAIRY_TYPE_IMPLEMENTED
SNOW_WARNING_GENERATION
ALLOW_SAVE_CHANGES
CRY_PSEUDOBANK_START
BATTLE_MODE_FORCE_SET
ALWAYS_HAVE_NATIONAL_DEX
ALWAYS_UNCAPPED_FRAME_RATE
BATTLES_UNCAPPED_FRAME_RATE
FAST_TEXT_PRINTING
NO_PARTNER_DOUBLE_BATTLES
```

특히:

```asm
.definelabel ALLOW_SAVE_CHANGES, 0
```

은 단순 `equ`가 아니므로 config synchronization 시 주의합니다.

---

# 13. ROM / 파일 경로 관련 주의

## OneDrive 금지

Makefile이 현재 path에 `onedrive` 문자열이 있으면 오류를 냅니다.

## WSL 메모리 부족

병렬 build가 WSL을 죽이면:

```bash
make
```

처럼 `-j`를 제거합니다.

## `Zone.Identifier`

Windows에서 WSL Linux filesystem으로 파일을 복사하다 생길 수 있습니다. 그래픽 폴더 등에 붙으면 build에 문제를 일으킬 수 있으므로 삭제.

```bash
find . -name '*:Zone.Identifier' -delete
```

현재 Makefile도 build 시 일부 metadata 파일을 제거합니다.

---

# 14. 신규 개발 작업의 기본 build 루틴

### 데이터만 수정

```bash
make -j8
```

우선 시도.

### C 전투 로직 수정

```bash
make clean_code
make -j8
```

안정적.

### 종족 수/상수/데이터 layout 같은 큰 변경

```bash
make clean
make -j8
```

권장.

### 도구 자체 또는 generator 변경

```bash
make clean_tools
make clean
make -j8
```

---

# 15. Digol-2 권장 Git 전략

권장 branch 예:

```text
main                안정 버전
upstream-sync/*     hg-engine 최신판 반영 작업
feature/digimon-*   데이터/기능 추가
feature/ability-*   신규 특성
feature/move-*      신규 기술
```

upstream merge와 Digol-2 변경을 한 커밋에 섞지 않는 것이 중요합니다.

예:

```text
chore: merge hg-engine upstream 027977c
feat: migrate Digol species data to Species.c
feat: add Digimon ability constants
```

이렇게 분리해야 나중에 hg-engine 변화와 Digol-2 변화의 원인을 추적하기 쉽습니다.

---

# 16. 필드 소스 빌드 토글과 덤프 명령

새 토글은 `include/config.h`에 있으며 둘 다 기본 주석 처리입니다.

```c
// #define BUILD_DUMPED_EVENTDATA
// #define BUILD_DUMPED_SCR_SEQ
```

- `BUILD_DUMPED_EVENTDATA`: `data/eventdata/zone_event/*.json`을 빌드하여 `a/0/3/2`의 해당 멤버를 교체.
- `BUILD_DUMPED_SCR_SEQ`: 덤프한 일반 필드 `.s`를 빌드하여 `a/0/1/2`의 해당 멤버를 교체.
- 엔진 관리 common/trainer 스크립트는 토글과 무관하게 빌드.
- `data/text/custom/*.txt`에는 별도 토글이 없으며 존재하면 텍스트 빌드 입력에 포함.

Makefile은 정확히 값 없는 `#define NAME` 행을 찾습니다. `#define NAME 1`로 바꾸면 이 Make 검사에서는 활성으로 인식되지 않습니다.

새 명령은 `make dump_scripts DUMP_ROM=...`입니다. 다만 현재 `dump.mk`는 `ROM_TOOL`을 문자열 `dsrom`과 비교하는 반면 기본 Makefile 값은 `tools/dsrom`이므로, **기본값의 dump 경로가 legacy ndstool 쪽으로 들어가는 불일치**가 있습니다. 정상 빌드 경로와는 별개의 소스상 문제입니다.

기존 ndstool을 명시적으로 준비하는 우회 예시(WSL/apt):

```bash
sudo apt-get install automake autoconf
make tools/ndstool
make dump_scripts DUMP_ROM=/path/to/rom.nds ROM_TOOL=tools/ndstool
```

덤프는 `data/` 파일을 쓰는 명령입니다. 별도 작업 브랜치에서 실행한 뒤 diff를 확인합니다. `.s`, 이벤트 JSON, 텍스트의 편집 범위와 엔진 관리 파일 예외는 [04장](./04_WORLD_TRAINERS_ITEMS.md), 비교 근거는 [07장](./07_UPDATE_2026-10-01.md)을 참고합니다. 위 우회 예시는 정적 소스 분석에 따른 것으로 이번 작업에서 ROM으로 실행하지 않았습니다.
