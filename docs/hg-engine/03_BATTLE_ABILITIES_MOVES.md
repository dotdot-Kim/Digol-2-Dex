# 03. 특성 · 기술 · 배틀 시스템 확장

> 기준: `BluRosie/hg-engine` `main` @ `027977cca9c93d5c7346081af837ec33706303f8`

---

# 1. hg-engine 배틀 시스템을 보는 법

hg-engine은 HGSS 원본 overlay/ARM9의 여러 루틴을 C로 재구현하거나 hook하여 현대 세대 배틀 요소를 추가합니다.

신규 특성·기술을 구현할 때 가장 중요한 원칙은:

> **효과가 발생해야 하는 배틀 단계가 어디인지 먼저 찾고, 그 단계에 이미 구현된 유사 효과를 복제한다.**

특성 하나를 거대한 `ability.c` 한 파일에서 전부 처리하는 구조가 아닙니다.

대표 영역:

```text
src/battle/*
src/individual/*
data/battle_scripts/*
data/AbilityFlags.c
include/constants/ability.h
include/constants/moves.h
```

---

# 2. 자주 확인하는 전투 처리 파일

기준 커밋의 `src/individual/`에는 다음과 같은 hook용 구현 파일이 있습니다.

| 목적 | 대표 파일 |
|---|---|
| 기본 데미지/공격·방어 modifier | `CalcBaseDamage.c` |
| 등장 시 특성 | `SwitchInAbilityCheck.c` |
| 피격 대상 특성 | `MoveHitDefenderAbilityCheck.c` |
| 행동 전 판정 | `BattleController_BeforeMove.c`, `ServerBeforeAct.c` |
| 행동/기술 후 처리 | `ServerDoPostMoveEffects.c`, `BattleController_MoveEnd.c` |
| 턴/필드 상태 처리 | `ServerFieldConditionCheck.c` |
| HP 계산/변화 | `ServerHPCalc.c` |
| 폼 변화 | `BattleFormChangeCheck.c` |
| 메시지 buffer | `BattleSystem_BufferMessage.c` |
| 진화 판정 | `GetMonEvolutionInternal.c` |

그리고 공용 battle 로직:

```text
src/battle/ability.c
src/battle/other_battle_calculators.c
src/battle/battle_script_commands.c
```

등을 함께 검색합니다.

---

# 3. 신규 특성 추가: 전체 체크리스트

신규 특성을 만드는 경우 최소 다음을 검토합니다.

## 3.1 ID

```text
include/constants/ability.h
```

현재 기준 커밋은:

```c
#define ABILITY_AURA_GUARD 319
#define NUM_ABILITIES ABILITY_AURA_GUARD + 1  // 320
```

까지 정의되어 있습니다.

### 중요

Digol-2의 기존 `dictionary.json`은 구버전 번호를 포함하므로 최신 hg-engine의 ID 배열과 일치한다고 가정하면 안 됩니다.

향후 migration 단계에서 최신 상수를 기준으로 재생성해야 합니다.

---

# 4. 특성 텍스트

현재 repo의 대표 text banks:

```text
data/text/720.txt  특성 표시명
data/text/721.txt  대문자 표시명
data/text/722.txt  특성 설명
```

새 ID를 추가하면 같은 index 순서를 유지하도록 해당 텍스트를 추가해야 합니다.

예를 들어 index mismatch가 생기면 특성 효과는 A인데 UI 이름은 B가 되는 문제가 발생할 수 있습니다.

---

# 5. `AbilityFlags.c`

```text
data/AbilityFlags.c
```

특성의 공통 성질을 선언하는 테이블입니다.

대표 성질에는 다음과 같은 종류가 있습니다.

- Mold Breaker에 무시되는지
- Neutralizing Gas에 비활성화되는지
- Transform 상태에서 비활성화되는지
- Trace가 복사할 수 없는지
- Receiver/Power of Alchemy가 받을 수 없는지
- Entrainment/Role Play/Simple Beam 등과 상호작용 가능한지
- suppress 불가능 여부

신규 특성을 추가하고 이 테이블을 빼먹으면 특성 본체는 동작하더라도 다른 특성과의 상호작용이 틀릴 수 있습니다.

### 권장

가장 유사한 기존 특성의 `AbilityFlags` entry를 먼저 찾고 복제합니다.

---

# 6. 실제 효과 구현 위치를 찾는 방법

예를 들어 `ABILITY_HUGE_POWER`를 repo 검색하면 현재 구현이:

```text
src/individual/CalcBaseDamage.c
```

에서 물리 기술의 attack modifier를 2.0배 하는 방식으로 발견됩니다.

즉 “공격력 배율 특성”을 만들고 싶다면 Huge Power/Pure Power를 참고하는 것이 가장 빠릅니다.

## 검색 기본법

```bash
rg "ABILITY_HUGE_POWER" .
```

또는 GitHub code search.

새로운 기능을 만들기 전에 최소 2~3개의 유사 특성을 비교하십시오.

---

# 7. 특수공격 1.3배 특성 예시의 구현 방향

Digol-2에서 예전에 논의한 “특수공격 1.3배” 같은 특성은 `CalcBaseDamage.c`의 공격 modifier 단계가 적합합니다.

개념:

```c
if (AttackingMon.ability == ABILITY_CUSTOM_SPATK_BOOST
    && movesplit == SPLIT_SPECIAL) {
    attackModifier = QMul_RoundUp(attackModifier, CUSTOM_1_3_FIXED_POINT);
}
```

실제 구현에서는 hg-engine의 fixed-point 상수/매크로를 재사용해야 합니다.

### 왜 실제 Sp. Atk 스탯 값을 직접 바꾸지 않는가

- UI stat와 battle temporary stat의 의미가 달라질 수 있음
- Unaware 등 modifier 처리 순서
- 능력치 stage와의 곱셈 순서
- Transform/ability suppression

때문에 기존 특성과 같은 damage calculation 계층에 넣는 편이 안전합니다.

---

# 8. 특정 타입 기술 위력 강화

예:

- 불꽃 기술 1.5배
- 악 기술 1.3배
- 강철 기술 강화

찾을 참고 특성:

```text
ABILITY_TRANSISTOR
ABILITY_DRAGONS_MAW
ABILITY_STEELWORKER
ABILITY_ROCKY_PAYLOAD
ABILITY_DARK_AURA
ABILITY_FAIRY_AURA
```

구현 포인트는 “공격 스탯 배율”이 아니라 **move damage/type modifier 계층**일 수 있으므로 유사 특성을 반드시 검색합니다.

STAB 자체를 바꾸고 싶다면 Adaptability 계열을 찾습니다.

---

# 9. 등장 시 능력치 상승

예:

- 등장 시 공격 +1
- 등장 시 특공 +1
- 특정 조건일 때 스피드 +1

대표 참고 위치:

```text
src/individual/SwitchInAbilityCheck.c
```

참고할 특성 후보:

```text
Intrepid Sword
Dauntless Shield
Download
Intimidate
Orichalcum Pulse
Hadron Engine
```

등장 메시지까지 필요한 특성은:

- ability activation script
- battle message
- stat change subscript

연결을 함께 봅니다.

---

# 10. 등장 후 N턴 동안 능력치 배율

예전에 논의한:

> 등장 후 2턴 동안 공격·스피드 1.5배 + 시작/종료 메시지

같은 특성은 단순 SwitchIn 처리로 끝나지 않습니다.

필요 요소:

1. switch-in 시 상태/counter 초기화
2. 공격 계산에서 counter가 유효할 때 Attack modifier
3. Speed 계산에서 counter가 유효할 때 Speed modifier
4. 턴 종료 시 counter 감소
5. 종료 시 메시지
6. 교체/기절/폼 변화 시 counter lifecycle

### 참고 효과

`Slow Start`는 반대 방향의 훌륭한 참고 대상입니다.

하지만 구현할 때는 Slow Start가 시간을 어떤 구조에 저장하고, 교체 시 어떻게 재초기화하는지 최신 소스 전체를 검색해야 합니다.

**기존 effect를 이름만 바꿔 뒤집는 것보다 lifecycle을 이해하고 재사용하는 것이 중요합니다.**

---

# 11. 피격 시 발동 특성

대표 파일:

```text
src/individual/MoveHitDefenderAbilityCheck.c
```

예:

- 접촉 시 상태이상
- 공격자 능력치 감소
- 특정 타입을 맞으면 상승
- 피해 후 weather/terrain 생성

참고 대상:

```text
Static
Flame Body
Poison Point
Rough Skin
Iron Barbs
Weak Armor
Stamina
Water Compaction
Electromorphosis
Seed Sower
Toxic Debris
```

### 주의

“기술이 명중했다”와 “실제로 피해를 받았다”와 “접촉했다”는 서로 다른 조건입니다.

유사 특성이 어느 시점에 검사되는지 그대로 따라갑니다.

---

# 12. 상태기 무효화 / 황금몸 계열

**이번 비교 구간에서 황금몸의 실제 처리 코드가 활성화됐습니다.** 이전 `ability.c`에서는 블록이 주석 처리돼 있었으므로, 상수가 존재한다는 이유만으로 이미 구현됐다고 보는 것은 잘못입니다.

현재 `src/battle/ability.c`의 `MoveCheckDamageNegatingAbilities()`에서:

- 공격자와 대상이 다름
- `MoldBreakerAbilityCheck(..., ABILITY_GOOD_AS_GOLD)` 통과
- 상대 진영/필드 대상 비트가 없는 기술
- `SPLIT_STATUS`

을 검사하고 `BATTLE_SUBSCRIPT_DOESNT_AFFECT_ABILITY`를 호출합니다. 자신 대상 변화기와 필드/진영 전체 효과를 무조건 모두 막는 구현이 아닙니다. 아군이 직접 대상으로 삼는 변화기도 해당 경로를 확인해야 합니다.

참고 테스트는 `abilities/good_as_gold/block_targeted_status.c`, `moves/milk_drink/good_as_gold.c`입니다(`data/battle_tests/` 기준).

디골에서 황금몸 변형 특성을 만들 때는 이 현재 구현을 출발점으로 쓰고, 상태기 예외·Mold Breaker·아군 지원을 별도로 검증합니다. `CalcBaseDamage.c`에만 넣는 방식은 적합하지 않습니다.

---

# 13. 타입 무효 특성

예:

- Ground 무효 + 부가 효과
- Fighting 무효 + Beast Boost 유사 효과

참고:

```text
Levitate
Water Absorb
Volt Absorb
Flash Fire
Sap Sipper
Earth Eater
Wind Rider
```

무효화 처리와 “무효화된 기술을 받았을 때 추가 효과”는 같은 함수 또는 연결된 별도 경로일 수 있습니다.

Mold Breaker 무시 여부도 `AbilityFlags.c`에 맞춰야 합니다.

---

# 14. 상대 전체에 영향을 주는 오라/재앙 계열

예:

- 상대 공격 감소
- 상대 특수공격 감소
- 상대 방어 감소
- 상대 특수방어 감소

참고 특성:

```text
Tablets of Ruin
Vessel of Ruin
Sword of Ruin
Beads of Ruin
Dark Aura
Fairy Aura
Aura Break
```

이런 특성은 “소유자의 스탯을 바꾸는 것”이 아니라 **전장에 존재하는 ability를 검색하여 계산 대상에게 multiplier를 적용**합니다.

복수 소유자/아군/적군/Neutralizing Gas/Mold Breaker 적용 관계를 반드시 기존 구현과 맞춥니다.

---

# 15. 특성 PP 효과

예전에 논의한 Pressure 계열의 PP 2배 소비를 유지하면서 추가 효과를 부여하는 경우:

1. `ABILITY_PRESSURE`의 PP consumption path
2. 추가할 damage/stat modifier path

가 서로 다른 파일에 존재할 수 있습니다.

특성 하나가 여러 처리 지점에서 검색되는 것은 정상입니다.

기존 Pressure 자체를 개조한다면 repo-wide search 결과를 전부 확인한 뒤 수정합니다.

---

# 16. 특성 확장 자체의 기술적 기반

현재 hg-engine에는 특성 ID를 8-bit 한계에서 확장하기 위한 ASM 패치가 있습니다.

```text
armips/asm/abilities.s
```

이 패치는 대표적으로:

- personal data ability를 u16으로 읽음
- Pokémon data 내부 ability storage 위치 변경
- BattlePokemon ability를 u16 경로로 이동
- script GiveMon ability argument 처리 확장
- AI/summary/form change 관련 accessor 수정

등을 수행합니다.

즉 `ABILITY_* > 255`도 사용 가능한 기반이 이미 들어 있습니다.

Digol-2에서 신규 특성 수십 개를 추가하는 것은 구조적으로 가능합니다.

---

# 17. 신규 특성 구현 최소 절차

예: `ABILITY_DIGITAL_OVERDRIVE`

1. `include/constants/ability.h`
   ```c
   #define ABILITY_DIGITAL_OVERDRIVE (ABILITY_AURA_GUARD + 1)  // 이 기준에서는 320
   #define NUM_ABILITIES ABILITY_DIGITAL_OVERDRIVE + 1
   ```
2. `data/text/720.txt`
3. `data/text/721.txt`
4. `data/text/722.txt`
5. `data/AbilityFlags.c`
6. 실제 효과 위치에 `ABILITY_DIGITAL_OVERDRIVE` 처리
7. 필요 시 battle script/message
8. `Species.c` 또는 HiddenAbilityTable에 배치
9. battle test 추가
10. `make clean_code && make`

### 번호 정책

**319는 이제 `ABILITY_AURA_GUARD`가 사용합니다.** 이전 매뉴얼의 319 예제를 이미 적용했다면 충돌을 해결해야 합니다. 예시 320도 이후 upstream에서 예약이 보장되는 번호는 아니므로 매 업데이트 때 확인하십시오.


Digol-2 전용 특성은 공식 hg-engine 마지막 ability 뒤에 연속 영역으로 관리하는 것이 좋습니다.

단 upstream에서 공식 ability가 추가될 수 있으므로 장기적으로는:

```text
hg-engine upstream range
Digol custom range
```

충돌 정책을 별도로 만들 필요가 있습니다.

향후 migration 때 결정합니다.

---

# 18. 기술 데이터 최신 원본

```text
data/Moves.c
```

구조 정의:

```text
include/move_data.h
```

최상위:

```c
typedef struct MoveSourceEntry {
    MoveNames names;
    MoveDataFields data;
    MoveBattleFields battle;
    MoveContestFields contest;
    const char *description;
} MoveSourceEntry;
```

---

# 19. 기술 이름

```c
typedef struct MoveNames {
    const char *name;
    const char *capsName;
    const char *fullName;
} MoveNames;
```

여러 UI/battle text context에 맞는 이름을 소스에서 관리합니다.

`movedatagen`이 이를 메시지 bank로 생성합니다.

---

# 20. 기술 핵심 수치

```c
typedef struct MoveDataFields {
    u16 effect;
    u8 split;
    u8 power;
    u8 type;
    u8 accuracy;
    u8 pp;
    u8 effectChance;
} MoveDataFields;
```

### `effect`

`MOVE_EFFECT_*`.

기술의 battle script/effect를 결정하는 핵심 ID.

### `split`

```text
SPLIT_PHYSICAL
SPLIT_SPECIAL
SPLIT_STATUS
```

### `power`

0~255 범위의 power field.

더 복잡하거나 255를 초과하는 동적 위력은 effect/코드 계산을 사용할 수 있습니다.

### `type`

`TYPE_*`.

### `accuracy`

명중률.

### `pp`

기본 PP.

### `effectChance`

부가효과 확률.

---

# 21. 기술 battle field

```c
typedef struct MoveBattleFields {
    u16 target;
    s8 priority;
    u8 flags;
} MoveBattleFields;
```

대표 flag:

```text
FLAG_CONTACT
FLAG_PROTECT
FLAG_MAGIC_COAT
FLAG_SNATCH
FLAG_MIRROR_MOVE
FLAG_KEEP_HP_BAR
FLAG_HIDE_SHADOW
```

또한 config에 따라 unimplemented/dexit move flag가 같은 bit를 세대별로 사용합니다.

신규 기술에 접촉 flag를 빼먹으면:

- Rough Skin
- Static
- Rocky Helmet 계열
- Unseen Fist

등과 상호작용이 틀어질 수 있습니다.

---

# 22. 신규 기술 추가 절차

1. `include/constants/moves.h`에 ID
2. `data/Moves.c`에 `MoveSourceEntry`
3. 필요한 `MOVE_EFFECT_*` 선택
4. 기존 effect로 충분하면 해당 effect 재사용
5. 새로운 effect가 필요하면 battle scripts/command 추가
6. animation 연결
7. learnsets에 배치
8. machine이면 item/machine table 연결
9. battle test 추가
10. build/test

---

# 23. battle scripts

현재:

```text
data/battle_scripts/
  moves/
  effects/
  subscripts/
```

으로 분리됩니다.

개념:

- `moves/`: 개별 기술 script
- `effects/`: move effect 처리
- `subscripts/`: 여러 기술/특성이 공유하는 작은 처리

### [CAUTION]

공식 `Move Scripting Systems Documentation`은 매우 상세하지만, 문서 자체가 최근 pokeplatinum식 리팩터링으로 일부 용어/필드가 낡았다고 경고합니다.

따라서 실제 신규 기술 개발에서는:

1. 비슷한 현재 기술을 `data/Moves.c`에서 찾기
2. effect ID 확인
3. 그 effect가 사용하는 현재 `data/battle_scripts` 파일 확인
4. `src/battle/battle_script_commands.c`와 상수 확인

순서가 안전합니다.

---

# 24. 신규 battle script command

기존 command로 표현하기 어려운 복잡한 기술 효과는:

```text
src/battle/battle_script_commands.c
```

에 C command를 추가할 수 있습니다.

현재 소스에는 vanilla 이후 확장 command들이 별도 번호 영역에 등록되어 있습니다.

추가 시 필요한 것:

- command ID
- 함수 prototype
- dispatch table 등록
- argument parsing
- script assembler 상수/매크로
- battle script에서 호출
- 테스트

command ID 충돌을 피하기 위해 기존 마지막 command를 기준으로 이어붙입니다.

---

# 25. 메시지

특성/기술 구현이 정상이어도 메시지 관리가 누락되면:

- 잘못된 문장 출력
- 빈 문자열
- 다른 메시지 ID 출력

이 생길 수 있습니다.

새 메시지가 필요한 경우 기존 비슷한 특성/기술이 사용하는 battle message constant와 raw text bank를 추적합니다.

가능하면 새로운 문자열을 C에 하드코딩하지 말고 기존 battle message 체계를 따릅니다.

---

# 26. fixed-point 배율

NDS battle engine에서 float를 남발하지 않습니다.

hg-engine은 damage modifier에 fixed-point helper를 사용합니다.

예:

```text
QMul_RoundUp(...)
UQ412__2_0
```

등.

1.3배, 1.5배를 구현할 때 `float 1.3f`를 새로 넣기 전에 기존 상수/매크로를 확인합니다.

동일 배율이 이미 다른 특성/아이템에서 쓰이면 그 표현을 그대로 재사용하는 것이 가장 안전합니다.

---

# 27. 계산 순서가 중요한 이유

같은 “1.5배”라도 적용 위치에 따라 결과가 달라질 수 있습니다.

예:

```text
기초 스탯
→ 능력치 stage
→ 특성 공격 modifier
→ 기술 위력 modifier
→ STAB
→ 타입 상성
→ 기타 damage modifier
→ 난수
```

실제 hg-engine의 순서는 소스에 따라 확인해야 하지만, 핵심은 **어떤 값에 1.5를 곱하느냐가 효과의 의미를 바꾼다**는 것입니다.

그래서 새로운 특성을 구현할 때 설명문만 보고 적당한 곳에 multiplier를 넣지 말고 기존 공식 특성과 같은 계층에 넣습니다.

---

# 28. Ability suppression / Mold Breaker

특성 본체에서 매번:

```c
ability == ABILITY_X
```

만 검사하면 Neutralizing Gas나 Mold Breaker 처리와 불일치할 수 있습니다.

hg-engine에는 `GetBattlerAbility`, `GetAbilityFlags` 등 공용 accessor/flag 처리가 있습니다.

기존 주변 코드가 어떤 accessor를 쓰는지 유지하십시오.

---

# 29. AI 영향

새로운 특성/기술이 플레이어에게만 정상 동작한다고 완료가 아닙니다.

AI가:

- 면역을 인식하는가
- 우선도를 인식하는가
- 위력 변화를 평가하는가
- ability를 알고/모르는 상태가 올바른가

를 확인해야 합니다.

특히 트레이너 ability override와 expanded ability는 AI ability storage까지 u16으로 확장된 코드가 존재합니다.

---

# 30. battle test 구조

테스트 파일:

```text
data/battle_tests/**/*.c
```

build script:

```text
scripts/build_tests.py
```

runner:

```text
scripts/run_tests.sh
```

`build_tests.py`는 battle_tests 아래 C 파일을 모아서:

```text
build/battle_tests/BattleTests.c
build/battle_tests/test_manifest.json
include/constants/generated/test_battle.h
```

등을 생성합니다.

---

# 31. 신규 특성 테스트 예시 전략

특수공격 1.3배 특성을 만든다면 최소:

- 같은 공격자/기술에서 특성 없음 vs 있음 damage 비교
- 물리 기술에는 영향 없음
- Neutralizing Gas 중 비활성화
- Mold Breaker와 관계가 필요한 경우 검증
- critical 여부
- stat stage +2/-2에서도 올바른 비율

을 테스트합니다.

등장 후 2턴 강화라면:

- 첫 등장 turn
- 2번째 turn
- 만료 turn
- 교체 후 재등장
- 기절 후
- Skill Swap/Neutralizing Gas

까지 봅니다.

---

# 32. 기술 테스트 전략

신규 기술 최소:

- 기본 데미지
- 명중/실패
- 타입
- STAB
- 면역
- Protect
- Substitute
- contact 반응
- secondary effect
- doubles target
- priority
- PP

을 확인합니다.

---

# 33. Digol-2 특성 개발 권장 절차

1. 특성 기획을 한 문장으로 정의
2. 가장 유사한 공식 특성 2~3개 선정
3. repo-wide search
4. 발동 lifecycle 목록 작성
5. AbilityFlags 선택
6. ID/텍스트 추가
7. 최소 코드 변경으로 구현
8. battle tests 작성
9. build
10. 실기/에뮬레이터 확인
11. 밸런스 조정은 구현 안정화 이후

이렇게 하면 “효과 구현”과 “밸런스 수치 조정”을 분리할 수 있습니다.

---

# 34. 구현 난이도 대략 분류

## 낮음

- 특정 split 공격 1.2~1.5배
- 특정 타입 damage 증가
- 단일 타입 면역
- 등장 시 +1 stage
- contact 시 확률 상태이상

기존 특성 복제가 쉬움.

## 중간

- 두 특성 효과 결합
- 등장 후 N턴 timer
- 조건부 weather/terrain
- HP 조건에 따른 변동
- 공격 후 stat 변화

상태 저장/lifecycle 필요.

## 높음

- 완전 새로운 form system
- 새로운 target selection
- 새로운 battle action
- 복잡한 multi-turn mechanics
- UI 선택을 요구하는 gimmick
- save에 영구 상태를 저장하는 mechanics

C + ASM + script + save/UI 변경 가능성이 큼.

---

# 35. 기존 특성 수정 시 주의

Digol-2처럼 원작 Pressure 등을 강화할 경우:

- 해당 `ABILITY_*`의 모든 사용처 검색
- AbilityFlags 확인
- 기존 테스트 확인
- 다른 종에게도 모두 변경이 적용된다는 점 확인

즉 한 디지몬 전용으로 강화하려는 것이라면 기존 Pressure를 바꾸기보다 새 특성을 만드는 편이 부작용이 적습니다.

---

# 36. 기술·특성 구현 완료 정의

다음이 모두 만족되어야 완료로 봅니다.

- [ ] 상수 정의
- [ ] 이름/설명
- [ ] 데이터에 배치 가능
- [ ] 본 효과
- [ ] suppress/copy/ignore 관계
- [ ] doubles
- [ ] form change
- [ ] AI
- [ ] 메시지
- [ ] 자동 테스트
- [ ] clean build
- [ ] 실게임 검증

이 체크리스트를 Digol-2 신규 커스텀 효과의 공통 완료 조건으로 사용할 것을 권장합니다.

---

# 37. 2026-10-01 확장 번호와 배틀 API

| 영역 | 현재 upstream 마지막 | 신규 커스텀 시작 예시 |
|---|---:|---|
| 특성 | Aura Guard 319 (`NUM_ABILITIES` 320) | `ABILITY_AURA_GUARD + 1` |
| 기술 효과 | Steel Beam 408 | `MAX_BASE_MOVE_EFFECT_NUM + 1` = 409 |
| 서브스크립트 | Prevent Intimidate 522 | `MAX_BASE_SUBSCRIPT_NUM + 1` = 523 |
| 확장 배틀 명령 | 298 = `0x12A` | `BASE_ENGINE_BTL_SCR_CMDS_MAX + 1` = 299 |

배틀 명령은 C dispatch와 `asm/include/battle_commands.inc`를 함께 맞춥니다. 이전 C의 최대값 0x11D는 당시 실제 마지막 명령 0x125보다 작았으며 이번에 0x12A로 바로잡혔습니다. 옛 숫자에 단순 +1하지 마십시오.

새 명령 294~298은 `TryHealingWish`, `ActivateHealingWish`, `IsFieldCondition2On`, `SetFieldCondition2`, `GoToIfMoveConditionFlagSet`입니다. 마지막 명령은 현재 Steel Beam/Mind Blown 플래그만 처리하고 분기 시 플래그를 지웁니다. 이름만 보고 임의 조건을 읽는 범용 함수라고 가정하면 안 됩니다.

## 새 효과/수정에서 재사용할 위치

- **Aura Guard:** `src/battle/battle_calc_damage.c`에서 실제 접촉 판정 후 최종 피해 ×0.5. `AbilityFlags.c`상 Mold Breaker와 Neutralizing Gas 대상. 단순 물리 피해 반감이 아닙니다.
- **Magic Room:** effect 407, `BattleStruct.field_condition2`/`magicRoomCounter`, 아이템 조회와 턴 종료 해제까지 연결. `GetBattleMonItem()`가 활성 중 0을 반환합니다. 실제 소지 도구가 영구 삭제되는 뜻은 아닙니다.
- **Steel Beam/Mind Blown:** effect 408과 subscript 521을 공유하고 최대 HP 절반(홀수는 올림)을 지불. Magic Guard, 명중 실패/Protect, 다중 대상에서 1회 처리 등은 BeforeMove → PostMove → MoveEnd의 플래그 lifecycle을 따라갑니다.
- **Healing Wish/Lunar Dance:** `HealingWishQueue` 및 두 배틀 명령으로 회복 대기를 관리. 건강한 교체 대상에서 보류되고 HP/상태/PP 조건에 따라 소비되도록 바뀌었습니다.
- **위협:** `IntimidateCheckHelper()` 제거. 대상 특성별 차단과 Guard Dog/Rattled 반응은 `subscript_0186_INTIMIDATE.s` 및 새 522번 subscript를 함께 봅니다.

## 이전 커스텀 코드 이식 시 반드시 점검

- `ServerDoTypeCalcMod()` 삭제. 행동 전 타입 면역은 `BattleController_CheckTypeImmunity()`와 `GetTypeEffectiveness()`를 확인합니다.
- `MoveConditionsFlags.glaiveRush` → `wideOpen`.
- `CheckMegaData`, `GrabMegaTargetForm`, `CanItemBeRemovedFromSpecies`에 현재 폼 인자 추가.
- `CanTrickHeldItemManual`에 공격자/방어자 폼 인자 2개 추가.
- `BattleStruct`에 Healing Wish queue 및 추가 필드 상태가 붙었으므로 구조체 크기/offset에 의존하는 커스텀 ASM은 재검토.
- 연속기 PP, Substitute hit flag, Ice Scales 중복 적용, Fairy Aura 타입 판정, Analytic 행동 순서 판정이 수정됨. 과거 함수를 통째로 복사해 덮으면 이 수정이 사라질 수 있습니다.

아이즈 오브 고르곤의 **1턴 행동불가**는 HP 지불 반동인 Steel Beam과 다른 효과입니다. 최신 효과/명령 번호를 쓰되 기존 `MOVE_EFFECT_RECHARGE_AFTER` 및 동결 효과 경로를 결합하는 별도 구현·검증이 필요합니다. 이번 업데이트가 해당 전용기를 자동으로 구현해 주지는 않습니다.
