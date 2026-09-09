# Digol-2 × hg-engine 개발 매뉴얼

> **목적:** Digol-2 개발 중 `BluRosie/hg-engine`을 설치·빌드하고, 데이터/콘텐츠/배틀 시스템을 수정·확장할 때 지속적으로 참고하는 내부 개발 문서입니다.
>
> **조사 기준 버전:** `BluRosie/hg-engine` `main` @ `1febb90b856745f8648c8a4fa059e7499a3cca3f` (2026-09-03)
>
> **작성 기준일:** 2026-09-09

---

## 0. 이 문서의 기준

hg-engine은 빠르게 변경되는 프로젝트이며, 일부 공식 Wiki 문서는 최신 코드 리팩터링보다 뒤처져 있습니다. 따라서 이 매뉴얼은 다음 우선순위로 사실을 판정합니다.

1. **해당 기준 커밋의 실제 C/ASM 소스**
2. **`Makefile`, `narcs.mk`, `overlays.mk` 등 실제 빌드 의존성**
3. **현재 저장소에 함께 커밋된 `documentation/wiki/*` 문서**
4. live GitHub Wiki
5. Digol-2의 기존 converter/상수/과거 문서

특히 최신 hg-engine은 예전 Wiki에서 설명하던 `armips/data/mondata.s`, `moves.s`, `trainers.s`, `encounters.s` 중심 구조에서 상당 부분이 **C 데이터 원본 + generator** 구조로 이동했습니다. 따라서 오래된 예제를 그대로 따라 하기 전에 반드시 이 매뉴얼의 **현재 Source of Truth** 표를 먼저 확인하십시오.

### 현재 확인된 대표 Source of Truth

| 대상 | 최신판에서 우선 확인할 원본 | 빌드/변환 핵심 |
|---|---|---|
| 종족 기본 데이터·이름·도감 텍스트·metrics | `data/Species.c` | `tools/speciesdatagen`, `narcs.mk` |
| 기술 데이터·이름·설명 | `data/Moves.c` | `tools/movedatagen`, `narcs.mk` |
| 진화 | `data/Evolutions.c` | `narcs.mk` |
| 야생 조우 | `data/Encounters.c` | `narcs.mk` |
| 트레이너/파티/트레이너 텍스트 | `data/Trainers.c` | `tools/trainerdatagen`, `narcs.mk` |
| 레벨업/알/머신/튜터 학습기 | `data/learnsets/learnsets.json` | `scripts/build_learnsets.py` 및 빌드 규칙 |
| 히든 특성 | `data/HiddenAbilityTable.c` | custom table / a028 계열 |
| 기본 경험치 | `data/BaseExperienceTable.c` | custom table |
| 특성 동작 플래그 | `data/AbilityFlags.c` | `GetAbilityFlags()` 계열 |
| 아이템 파라미터 | `data/itemdata/itemdata.c` | `data/itemdata/itemdata.mk` |
| 종족 상수 | `include/constants/species.h` + `asm/include/species.inc` | C/ASM 양쪽 동기화 |
| 특성 상수 | `include/constants/ability.h` | 현재 실제 정의 0~318, 확장 기반은 16-bit |
| 기술 상수 | `include/constants/moves.h` | 기술 원본과 번호 동기화 |
| 배틀 스크립트 | `data/battle_scripts/{moves,effects,subscripts}` | 배틀 스크립트 빌드 |
| 배틀 C 로직 | `src/battle/*`, `src/individual/*` | hooks/overlay로 원작 루틴 대체·확장 |
| 포켓몬 그래픽 | `data/graphics/sprites/*` | `pokegra.mk`, nitrogfx 등 |
| 팔로워/오버월드 | `data/FollowerProperties.c`, `src/field/overworld_table.c` 등 | overworld NARC/매핑 |

> **Digol-2 주의:** 현재 프로젝트의 `data-hge 형식 컨버터.py`, `data.json`의 일부 진화 상수명 등은 구버전 hg-engine을 기준으로 작성되었습니다. **이번 문서 작성 단계에서는 이를 수정하지 않습니다.** 향후 별도 마이그레이션 단계에서 이 매뉴얼을 기준으로 converter의 출력 구조를 최신 C 데이터 체계에 맞춥니다.

---

# 매뉴얼 목차

## [01. 설치 · 빌드 · 업데이트 · CONFIG](./01_SETUP_BUILD_CONFIG.md)

- 지원 환경과 준비물
- Windows WSL / MSYS2 / Linux / macOS / Docker
- fork + upstream 권장 Git 구성
- 반드시 필요한 미국판 HeartGold ROM 조건
- `make`, 병렬 빌드, clean 계열 명령
- 최신 Makefile의 실제 빌드 파이프라인
- C/ASM 이중 CONFIG 구조
- save 호환성, PKHeX, 불안정 옵션
- hg-engine 업데이트 시 안전 절차

## [02. 종족 · 진화 · 학습기 · 도감 · 그래픽](./02_SPECIES_DATA_EVOLUTION_LEARNSETS.md)

- 신규 종족/폼 등록 전체 흐름
- `SpeciesDataEntry` 최신 구조
- 종족값·타입·포획률·EV·특성·metrics·도감 텍스트
- `BaseExperienceTable.c` / `HiddenAbilityTable.c`
- `Evolutions.c` 9슬롯 구조와 진화 방식
- `learnsets.json` 최신 학습기 체계
- BabyMons / 도감 sort·area / icon palette / follower 관련 데이터
- 전투 스프라이트·아이콘 4bpp/팔레트 규칙
- 폼 / 메가 / 원시회귀

## [03. 특성 · 기술 · 배틀 시스템 확장](./03_BATTLE_ABILITIES_MOVES.md)

- hg-engine 전투 소스 구조
- 신규 특성 추가 체크리스트
- 특성 이름/설명/플래그/실제 로직 연결
- 데미지 배율, 등장 효과, 피격 효과, 턴 종료 효과 등 구현 위치
- 기존 특성을 복제해 커스텀 특성 구현하는 방법
- `MoveSourceEntry` 최신 기술 데이터 구조
- 신규 기술 추가
- battle move/effect/subscript
- 배틀 스크립트 문서의 구버전 주의점
- 신규 배틀 명령 확장
- 회귀 테스트 작성

## [04. 트레이너 · 야생 · 아이템 · 필드 콘텐츠](./04_WORLD_TRAINERS_ITEMS.md)

- `Trainers.c` 최신 구조
- IV/EV/성격/특성/볼/상태/고정 스탯/닉네임 등 확장 필드
- AI flags와 더블배틀
- `Encounters.c` 및 form 인코딩
- 아이템 데이터/필드 사용/배틀 사용
- 팔로워/오버월드
- 스타터/선물 포켓몬/스크립트 명령
- 경험치 시스템과 히든 특성 지급
- 음악/로머/상점 등 관련 확장 지점

## [05. 테스트 · 디버깅 · 문제 해결 · 유지보수](./05_TESTING_TROUBLESHOOTING_MAINTENANCE.md)

- 자동 배틀 테스트 구조
- 신규 특성/기술을 위한 테스트 작성 전략
- `clean`, `clean_code`, `clean_tools` 선택 기준
- WSL/권한/서브모듈/줄바꿈/메모리 문제
- upstream 업데이트 후 점검 순서
- Wiki와 코드가 충돌할 때 판정법
- Digol-2 converter 최신화 시 체크리스트

## [06. 소스 인덱스 · 기준 커밋 · 검증 출처](./06_SOURCE_INDEX.md)

- 이 매뉴얼이 근거로 삼은 최신 파일
- 공식 문서와 실제 구현의 관계
- 레거시 문서/미해명 항목
- 다음 업데이트 때 diff해야 할 핵심 파일 목록

---

# 1. 30초 빠른 참조

### hg-engine 빌드가 처음이다

1. `01_SETUP_BUILD_CONFIG.md`에서 자기 OS 설치 절차 확인
2. hg-engine을 **recursive clone**
3. repo root에 **미국판 HeartGold**를 `rom.nds`로 둠
4. `make` 또는 `make -j8`
5. 성공 시 `test.nds`

### 디지몬 한 종의 종족값/타입/일반 특성을 바꾸고 싶다

최신판 기준 우선 `data/Species.c`를 확인합니다. 구조 정의는 `include/species_data.h`, ROM 직렬화는 `tools/source/speciesdatagen/species_data_gen.c`, NARC 연결은 `narcs.mk`가 최종 근거입니다.

### 진화 루트를 바꾸고 싶다

`data/Evolutions.c`를 확인합니다. 한 종당 최대 **9개 엔트리**가 현재 구조에 잡혀 있습니다. 실제 판정 로직은 `src/individual/GetMonEvolutionInternal.c`를 함께 봅니다.

### 히든 특성을 바꾸고 싶다

`data/HiddenAbilityTable.c`.

### 특성 자체의 효과를 바꾸고 싶다

먼저 특성명을 repo 전체 검색합니다. 주로 다음 위치 중 하나입니다.

- `src/individual/CalcBaseDamage.c`
- `src/individual/SwitchInAbilityCheck.c`
- `src/individual/MoveHitDefenderAbilityCheck.c`
- `src/individual/BattleController_BeforeMove.c`
- `src/individual/ServerBeforeAct.c`
- `src/individual/ServerDoPostMoveEffects.c`
- `src/individual/ServerFieldConditionCheck.c`
- `src/battle/ability.c`
- `src/battle/other_battle_calculators.c`

그리고 `data/AbilityFlags.c`도 반드시 검색합니다.

### 신규 특성을 만들고 싶다

최소 다음을 확인합니다.

1. `include/constants/ability.h` — ID
2. `data/text/720.txt` — 표시명
3. `data/text/721.txt` — 대문자명
4. `data/text/722.txt` — 설명
5. `data/AbilityFlags.c` — Mold Breaker/Neutralizing Gas/Trace 등 공통 성질
6. 효과가 발생할 실제 C 루틴
7. `data/battle_tests/` — 테스트

### 기술 수치만 바꾸고 싶다

`data/Moves.c` → `include/move_data.h` 구조 참고.

### 기술 효과 자체를 새로 만들고 싶다

`data/Moves.c` + `data/battle_scripts/` + 필요 시 `src/battle/battle_script_commands.c` 및 전투 C 코드를 확인합니다.

### 야생 출현을 바꾸고 싶다

`data/Encounters.c`.

### 트레이너 파티를 바꾸고 싶다

`data/Trainers.c` + `include/trainer_data.h`.

### 아이템을 바꾸고 싶다

`data/itemdata/itemdata.c` + `include/item.h` + 필요 시 `src/item.c`, `src/battle/battle_item.c`.

---

# 2. hg-engine을 볼 때 가장 중요한 개념

hg-engine은 단순한 NDS 데이터 편집기가 아닙니다. 크게 네 계층이 섞여 있습니다.

### A. 원작 ROM 데이터 교체

종족 데이터, 기술 데이터, 트레이너, 조우표 등은 C/데이터 파일에서 다시 NARC/메시지 파일로 생성되어 ROM에 삽입됩니다.

### B. C 코드 확장

원작 ARM9/overlay의 함수를 C 코드로 다시 구현하거나 확장합니다. 현대 세대 특성/기술/날씨/폼 처리의 대부분이 여기 있습니다.

### C. ARM/Armips 패치와 hook

원작 바이너리의 특정 주소에서 hg-engine C 루틴으로 진입하도록 hook하거나 구조체/필드 크기 제한을 수정합니다. 특성을 u8에서 사실상 u16 경로로 확장하는 코드도 이 계층에 있습니다.

### D. 빌드 도구/generator

C 원본을 HGSS가 기대하는 NARC·메시지·그래픽 형식으로 변환하고 ROM을 재조립합니다.

따라서 어떤 기능을 수정할 때 **상수 하나만 추가했다고 끝나는 경우가 드뭅니다.** `상수 → 데이터 → 코드 → 텍스트/그래픽 → 빌드 → 테스트` 체인을 확인하는 습관이 중요합니다.

---

# 3. Digol-2에서 권장하는 운용 원칙

1. **Digol-2의 JSON은 장기적으로 Source of Truth로 유지할 수 있습니다.** 다만 converter 출력 대상은 최신 hg-engine의 C 데이터 구조로 재설계해야 합니다.
2. hg-engine 자체를 수정할 때는 가능하면 **기존 비슷한 효과를 검색하여 같은 처리 단계에 구현**합니다.
3. 새 특성/기술은 구현 직후 `data/battle_tests`에 테스트를 추가합니다.
4. upstream hg-engine 업데이트 전에는 기준 커밋을 기록하고, 업데이트 후 이 문서의 `06_SOURCE_INDEX.md`에 나열된 핵심 파일을 diff합니다.
5. 자동 생성 파일과 사람이 편집해야 하는 원본을 구분합니다. `build/`, `base/`, `include/constants/generated/*` 같은 생성 산출물을 직접 수정하지 않습니다.
6. 폼 데이터는 종족 ID와 form ID가 별개로 얽혀 있으므로, 단순히 별도 species 상수로만 처리하지 않습니다.
7. save 확장 설정을 바꾸는 작업은 기존 세이브/PKHeX 호환성에 영향을 줄 수 있으므로 별도 버전업 작업으로 취급합니다.

---

# 4. 이 문서에서 쓰는 표시

- **[CURRENT]**: 기준 커밋의 실제 빌드/소스에서 확인됨
- **[WIKI]**: 저장소에 포함된 공식 Wiki 문서에서 확인됨
- **[LEGACY]**: 과거 armips 중심 경로. 최신판에서는 직접 원본이 아닐 수 있음
- **[CAUTION]**: 구현은 있으나 불안정/제약/호환성 영향이 확인됨
- **[UNKNOWN]**: 공식 문서도 미해명 또는 연구 중이라고 밝힘

---

# 5. 핵심 upstream 링크

- hg-engine: https://github.com/BluRosie/hg-engine
- 이 문서의 고정 기준: https://github.com/BluRosie/hg-engine/tree/1febb90b856745f8648c8a4fa059e7499a3cca3f
- 기준 README: https://github.com/BluRosie/hg-engine/blob/1febb90b856745f8648c8a4fa059e7499a3cca3f/README.md
- 기준 Makefile: https://github.com/BluRosie/hg-engine/blob/1febb90b856745f8648c8a4fa059e7499a3cca3f/Makefile
- 기준 CONFIG: https://github.com/BluRosie/hg-engine/blob/1febb90b856745f8648c8a4fa059e7499a3cca3f/include/config.h
- 저장소 포함 Wiki: https://github.com/BluRosie/hg-engine/tree/1febb90b856745f8648c8a4fa059e7499a3cca3f/documentation/wiki

전체 출처는 `06_SOURCE_INDEX.md`를 참고하십시오.
