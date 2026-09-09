# 06. 소스 인덱스 · 기준 커밋 · 검증 출처

> **hg-engine 기준 커밋:** `1febb90b856745f8648c8a4fa059e7499a3cca3f`
>
> **기준 날짜:** 2026-09-03 upstream main / 매뉴얼 작성 2026-09-09
>
> 이 파일은 앞으로 hg-engine upstream을 업데이트할 때 **어떤 파일부터 diff해야 하는지** 알려주는 유지보수용 인덱스입니다.

---

# 1. 기준 저장소

```text
https://github.com/BluRosie/hg-engine
```

고정 기준:

```text
https://github.com/BluRosie/hg-engine/tree/1febb90b856745f8648c8a4fa059e7499a3cca3f
```

이 매뉴얼은 live `main`의 설명이 아니라 위 커밋의 실제 코드 상태를 기준으로 작성되었습니다.

---

# 2. 근거 판정 우선순위

hg-engine의 문서와 코드가 충돌할 때:

```text
1. 현재 Makefile/narcs.mk/overlays.mk가 실제로 빌드하는 입력
2. 현재 include struct/constant
3. 실제 src 및 armips 구현
4. 같은 커밋의 documentation/wiki
5. live GitHub Wiki
6. 예전 Discord/블로그/영상
```

순서로 판단합니다.

---

# 3. 최상위 빌드 파일

## `Makefile`

확인 항목:

- 입력 ROM `rom.nds`
- 결과 `test.nds`
- US HeartGold game code `IPKE`
- toolchain
- Python venv
- generator build
- `all`, `clean`, `clean_code`, `clean_tools`
- ROM extract/rebuild

업데이트 때 **최우선 diff 대상**.

## `narcs.mk`

확인 항목:

- 어떤 C/data 파일이 어느 NARC의 Source of Truth인지
- generator 연결
- ROM target path

최신 데이터 구조 migration에서 가장 중요한 파일 중 하나.

## `overlays.mk`

확인 항목:

- overlay compile/hook 연결
- 새로운 C source 반영 방식

## `dump.mk`

ROM -> source dump 도구가 바뀌었는지 확인.

---

# 4. 핵심 CONFIG

## `include/config.h`

C 기능 설정.

특히 diff:

```text
GEN_LATEST
FAIRY_TYPE_IMPLEMENTED
TYPE_EFFECTIVENESS_GEN
ALLOW_SAVE_CHANGES
HIDDEN_ABILITIES
MEGA_EVOLUTIONS
PRIMAL_REVERSION
ITEM_POCKET_EXPANSION
IMPLEMENT_WILD_DOUBLE_BATTLES
IMPLEMENT_CAPTURE_EXPERIENCE
IMPLEMENT_CRITICAL_CAPTURE
IMPLEMENT_LEVEL_CAP
EXPAND_PC_BOXES
SHINY_ODDS
FRIENDSHIP_EVOLUTION_THRESHOLD
REUSABLE_TMS
BLOCK_LEARNING_UNIMPLEMENTED_MOVES
각종 *_GENERATION
```

## `armips/include/config.s`

ASM/armips 계층 설정.

C config와 동기화가 필요한 항목을 비교.

---

# 5. 종족 상수/구조

## `include/constants/species.h`

- 공식 마지막 species
- `MAX_CANONICAL_MON_NUM`
- fakemon count
- form 범위
- `MAX_SPECIES_INCLUDING_FORMS`
- `MON_WITH_FORM`

Digol-2 신규 species ID 충돌 여부의 핵심.

## `asm/include/species.inc`

C species header와 번호 동기화.

## `include/species_data.h`

`SpeciesDataEntry` 구조가 바뀌면 converter 설계도 바뀝니다.

현재 핵심:

```text
SpeciesData
SpeciesMetrics
SpeciesTextData
```

---

# 6. 최신 종족 데이터

## `data/Species.c`

현재 기본 personal data + text + metrics source.

## `tools/source/speciesdatagen/species_data_gen.c`

`Species.c`를 HGSS binary/text로 직렬화하는 최종 근거.

특히 반드시 diff할 것:

- mon member size
- field offsets
- ability width
- message bank 번호
- metric output

현재 확인된 중요한 사실:

```text
C field order: HP ATK DEF SpA SpD SPE
binary order:  HP ATK DEF SPE SpA SpD
```

## `tools/source/dumptools/dump_scripts/speciesdata.py`

기존 ROM 데이터를 현재 `Species.c` 형태로 덤프하는 코드. Source initializer 형태 확인에 유용.

---

# 7. 종족 관련 보조 데이터

```text
data/BaseExperienceTable.c
data/HiddenAbilityTable.c
data/BabyMons.c
data/HeightTable.c
data/IconPaletteTable.c
data/SpriteOffsets.c
data/FollowerProperties.c
data/SpeciesToOWFormFemale.c
data/FormToSpeciesMapping.c
data/FormReversionMapping.c
data/PokeFormDataTbl.c
```

새 species/form을 대량 추가할 때 누락 여부를 확인합니다.

---

# 8. 진화

## `data/Evolutions.c`

현재 Source of Truth.

## `tools/source/dumptools/dump_scripts/evodata.py`

현재 C table shape 및 parameter 변환 확인.

현재:

```text
MAX_EVOS_PER_POKE = 9
```

## `src/individual/GetMonEvolutionInternal.c`

실제 진화 condition 판정.

## `src/individual/GetMonEvolutionBattle.c`

battle-related evolution 진입점/보조 구현 확인.

## `documentation/wiki/New-Evolution-Methods-Documentation.md`

진화 method 의미 설명 참고.

현재 문서에서 `EVO_TRADE_SPECIFIC_MON`은 **Unimplemented**로 표시됨.

---

# 9. Learnsets

## `data/learnsets/learnsets.json`

현재 실제 사용자 편집 대상.

## `data/learnsets/base/README.md`

learnsets build 정책 설명.

## `data/learnsets/base/*.json`

세대별 reference.

## `scripts/build_learnsets.py`

통합 learnset 생성.

upstream이 새로운 세대/ZA/Champions 데이터를 추가하면 이 영역이 자주 바뀔 가능성이 있습니다.

---

# 10. 특성

## `include/constants/ability.h`

현재 기준 마지막:

```c
ABILITY_SPICY_SPRAY 318
NUM_ABILITIES = 319
```

upstream 업데이트 때 Digol custom ID와 충돌 여부를 가장 먼저 확인합니다.

## `data/AbilityFlags.c`

특성 공통 상호작용.

## 특성 텍스트

```text
data/text/720.txt
data/text/721.txt
data/text/722.txt
```

## `armips/asm/abilities.s`

ability storage를 8-bit 제한에서 확장하는 구조.

업데이트 시 구조체 offset 패치가 바뀌었는지 매우 중요.

---

# 11. 특성/배틀 주요 구현 파일

```text
src/battle/ability.c
src/battle/other_battle_calculators.c
src/battle/battle_script_commands.c
src/individual/CalcBaseDamage.c
src/individual/SwitchInAbilityCheck.c
src/individual/MoveHitDefenderAbilityCheck.c
src/individual/BattleController_BeforeMove.c
src/individual/BattleController_MoveEnd.c
src/individual/ServerBeforeAct.c
src/individual/ServerDoPostMoveEffects.c
src/individual/ServerFieldConditionCheck.c
src/individual/ServerHPCalc.c
src/individual/BattleFormChangeCheck.c
src/individual/BattleSystem_BufferMessage.c
```

Digol custom abilities가 수정한 파일과 upstream 변경이 겹치는지 diff합니다.

---

# 12. 기술

## `include/constants/moves.h`

Move IDs.

## `include/move_data.h`

현재:

```text
MoveNames
MoveDataFields
MoveBattleFields
MoveContestFields
MoveSourceEntry
```

## `data/Moves.c`

현재 기술 데이터 Source of Truth.

## `tools/source/movedatagen/*`

Moves.c -> NARC/message generator.

## `tools/source/dumptools/dump_scripts/moves.py`

C source 형태/old ROM conversion 확인.

---

# 13. Battle scripts

```text
data/battle_scripts/moves/
data/battle_scripts/effects/
data/battle_scripts/subscripts/
```

## `src/battle/battle_script_commands.c`

새 command 확장.

## [CAUTION]

`documentation/wiki/Move-Scripting-Systems-Documentation.md`는 스스로 최근 리팩터링으로 일부 내용이 낡았음을 경고합니다.

항상 현재 script 파일과 C command table을 우선합니다.

---

# 14. 트레이너

## `include/trainer_data.h`

최신 trainer source structure.

현재 주의점:

- `TRAINER_DATA_TYPE_*`
- Additional flag 목록
- hidden ability slot
- AI flags

과거 Wiki의 일부 extra field가 현재 header에서는 사라졌을 수 있습니다.

## `data/Trainers.c`

현재 Source of Truth.

## `tools/source/trainerdatagen/*`

binary/text generation.

## `tools/source/dumptools/dump_scripts/trainerdata.py`

C source 표현과 legacy format 비교에 유용.

---

# 15. 야생 조우

## `data/Encounters.c`

현재 Source of Truth.

## `tools/source/dumptools/dump_scripts/encounters.py`

C initializer 및 form conversion.

## 관련

```text
data/SafariEncounters.c
data/Headbutt.c
include/constants/encounter_tables.h
include/encounter.h
```

폼은 `MON_WITH_FORM` 규칙을 확인합니다.

---

# 16. 아이템

## `include/constants/item.h`

Item IDs.

## `include/item.h`

`ITEMDATA`, `ITEMPARTYPARAM` 구조.

## `data/itemdata/itemdata.c`

현재 item parameter source.

## `data/itemdata/itemdata.mk`

빌드 연결.

## 관련 C

```text
src/item.c
src/battle/battle_item.c
src/individual/PartyMenu_HandleUseItemOnMon.c
```

## machine

```text
scripts/update_machine_moves.py
```

---

# 17. 필드/오버월드

주요:

```text
src/field/*
src/field/overworld_table.c
src/field_roamer.c
src/music_tables.c
src/trainermoney.c
data/FollowerProperties.c
data/HiddenItems.c
```

---

# 18. 그래픽

```text
data/graphics/
data/graphics/pokegra.mk
data/graphics/itemgra.mk
scripts/reformat_sprite_data.py
tools/nitrogfx
```

신규 species를 많이 추가한 뒤 upstream graphics build 시스템이 바뀌면 반드시 diff합니다.

---

# 19. 테스트

```text
data/battle_tests/
scripts/build_tests.py
scripts/run_tests.py
scripts/run_tests.sh
include/test_battle.h
```

새 upstream merge 후 Digol custom tests가 compile되는지 확인합니다.

---

# 20. 공식 repository 문서

```text
documentation/wiki/
```

이 매뉴얼 작성에 특히 참고한 문서:

```text
Adding-New-Pokémon.md
Editing-Pokémon-Data.md
Hidden-Ability-Documentation.md
New-Evolution-Methods-Documentation.md
Experience-Overhaul-Documentation.md
Trainer-Pokémon-Structure-Documentation.md
Wild-Pokémon-Table-Documentation.md
Item-System-Documentation.md
Move-Scripting-Systems-Documentation.md
Overworld-System-Documentation.md
Troubleshooting.md
```

단 문서보다 실제 코드가 우선입니다.

---

# 21. 현재 확인된 Wiki ↔ 최신 코드 차이 사례

## 종족 데이터

구 문서:

```text
armips/data/mondata.s
```

현재 build:

```text
data/Species.c -> speciesdatagen
```

## 기술

구 armips 중심 설명과 달리 현재:

```text
data/Moves.c -> movedatagen
```

## 트레이너

구:

```text
armips/data/trainers/*
```

현재:

```text
data/Trainers.c -> trainerdatagen
```

## 야생

구:

```text
armips/data/encounters.s
```

현재:

```text
data/Encounters.c
```

## Trainer extra fields

과거 Wiki에 설명된 일부 flag가 현재 `include/trainer_data.h`에는 존재하지 않음.

## Move scripting

Wiki 자체가 최근 refactor로 stale 부분이 있다고 경고.

---

# 22. 아직 완전히 문서화됐다고 볼 수 없는 영역

hg-engine/DS hacking 특성상 다음은 기능별 reverse engineering이 추가로 필요할 수 있습니다.

- 일부 Pokédex binary 의미
- 특정 sprite/metric offset의 정확한 화면별 의미
- 일부 vanilla unknown field
- DSPRE와 hg-engine의 모든 상호운용성
- 오래된 unused NARC
- 특정 animation/sound archive internals

이런 항목은 매뉴얼에서 임의로 의미를 확정하지 않습니다.

---

# 23. upstream 업데이트 diff 체크리스트

새 hg-engine commit으로 옮길 때 먼저:

```bash
git diff OLD..NEW -- Makefile narcs.mk overlays.mk
```

그 다음:

```bash
git diff OLD..NEW -- \
  include/config.h armips/include/config.s \
  include/constants/species.h asm/include/species.inc \
  include/constants/ability.h include/constants/moves.h include/constants/item.h \
  include/species_data.h include/move_data.h include/trainer_data.h include/item.h
```

그 다음 데이터:

```bash
git diff OLD..NEW -- \
  data/Species.c data/Evolutions.c data/Moves.c data/Trainers.c data/Encounters.c \
  data/AbilityFlags.c data/HiddenAbilityTable.c data/BaseExperienceTable.c
```

그리고 Digol custom code와 겹치는 battle files.

---

# 24. 이 매뉴얼의 기준 버전 갱신 절차

1. 새 upstream commit SHA 확인
2. 위 핵심 파일 diff
3. Source of Truth가 바뀐 항목 확인
4. 기능/상수 추가 확인
5. config default 확인
6. Wiki 변경 확인
7. manual 각 장 수정
8. 이 파일 상단 기준 SHA/날짜 수정
9. Digol-2 converter compatibility status 별도 갱신

---

# 25. 향후 Digol-2 migration에서 사용할 핵심 표

| Digol 현재 데이터 | 최신 hg-engine 목표 |
|---|---|
| `data.json.personal_data` | `data/Species.c` initializer |
| `abilities[0:2]` | `SpeciesData.abilities[2]` |
| `abilities[2]` | `data/HiddenAbilityTable.c` |
| `base_exp` | `data/BaseExperienceTable.c` |
| `evolutions` | `data/Evolutions.c` |
| 향후 learnsets | `data/learnsets/learnsets.json` |
| species constants | C + ASM constants 동시 생성 |
| ability dictionary IDs | 최신 `include/constants/ability.h`에서 재생성 |
| move dictionary IDs | 최신 `include/constants/moves.h`에서 재생성 |
| item dictionary IDs | 최신 `include/constants/item.h`에서 재생성 |

이 표는 **방향만 기록한 것**이며 현재 파일은 아직 변경하지 않습니다.

---

# 26. 매뉴얼 자체의 유지 원칙

- hg-engine의 특정 SHA를 항상 기록
- 추측을 확정 사실처럼 적지 않음
- Wiki와 코드 차이는 명시
- legacy 경로는 삭제하지 말고 `[LEGACY]`로 남겨 migration 참고자료로 사용
- Digol-2 전용 정책과 hg-engine 기술 사실을 구분
- converter가 최신화되면 새 장 또는 별도 `MIGRATION.md` 추가

---

# 27. 빠른 소스 찾기 명령

```bash
# 특정 특성
rg "ABILITY_NAME" .

# 특정 기술
rg "MOVE_NAME" .

# 특정 종
rg "SPECIES_NAME" .

# 특정 아이템
rg "ITEM_NAME" .

# NARC가 어디서 생성되는지
rg "a/0/3/4|EVOS_TARGET|Evolutions.c" Makefile narcs.mk

# generator 입력
rg "Species.c|Moves.c|Trainers.c" Makefile narcs.mk tools

# 자동 생성 파일 경고
find include/constants/generated build base -maxdepth 2 -type f | head
```

---

# 28. 고정 upstream 링크

```text
README
https://github.com/BluRosie/hg-engine/blob/1febb90b856745f8648c8a4fa059e7499a3cca3f/README.md

Makefile
https://github.com/BluRosie/hg-engine/blob/1febb90b856745f8648c8a4fa059e7499a3cca3f/Makefile

narcs.mk
https://github.com/BluRosie/hg-engine/blob/1febb90b856745f8648c8a4fa059e7499a3cca3f/narcs.mk

config.h
https://github.com/BluRosie/hg-engine/blob/1febb90b856745f8648c8a4fa059e7499a3cca3f/include/config.h

Species struct
https://github.com/BluRosie/hg-engine/blob/1febb90b856745f8648c8a4fa059e7499a3cca3f/include/species_data.h

Move struct
https://github.com/BluRosie/hg-engine/blob/1febb90b856745f8648c8a4fa059e7499a3cca3f/include/move_data.h

Trainer struct
https://github.com/BluRosie/hg-engine/blob/1febb90b856745f8648c8a4fa059e7499a3cca3f/include/trainer_data.h

Item struct
https://github.com/BluRosie/hg-engine/blob/1febb90b856745f8648c8a4fa059e7499a3cca3f/include/item.h

Ability constants
https://github.com/BluRosie/hg-engine/blob/1febb90b856745f8648c8a4fa059e7499a3cca3f/include/constants/ability.h

Repository documentation
https://github.com/BluRosie/hg-engine/tree/1febb90b856745f8648c8a4fa059e7499a3cca3f/documentation/wiki
```
