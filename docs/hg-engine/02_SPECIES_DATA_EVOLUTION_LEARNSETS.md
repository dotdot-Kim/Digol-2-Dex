# 02. 종족 · 진화 · 학습기 · 도감 · 그래픽

> 기준: `BluRosie/hg-engine` `main` @ `1febb90b856745f8648c8a4fa059e7499a3cca3f`
>
> 이 장은 Digol-2의 디지몬 데이터를 최신 hg-engine에 연결할 때 가장 직접적인 기준이 되는 문서입니다. 현재 converter를 고치는 작업은 별도 단계에서 진행합니다.

---

# 1. 최신판에서 종족 데이터는 어디가 원본인가

## [CURRENT] 기본 종족 데이터의 Source of Truth

```text
data/Species.c
```

최신 Makefile/NARC 규칙은 `data/Species.c`와 `include/species_data.h`를 입력으로 `tools/speciesdatagen`을 빌드하고, 생성된 personal data와 메시지 데이터를 HGSS ROM에 삽입합니다.

예전 공식 Wiki의 `armips/data/mondata.s` 설명은 구조 이해에는 도움이 되지만, **현재 기준 커밋에서 새 작업의 우선 원본으로 삼으면 안 됩니다.**

### 최신 데이터 흐름

```text
data/Species.c
  + include/species_data.h
        ↓
tools/speciesdatagen
        ↓
build/mondata/* + build/rawtext/* + 일부 Pokedex metric
        ↓
NARC / msgdata
        ↓
ROM a/0/0/2 및 관련 메시지/도감 데이터
```

`narcs.mk`의 현재 설정에서 mondata target은:

```text
a/0/0/2
```

입니다.

---

# 2. `SpeciesDataEntry` 최신 구조

정의:

```text
include/species_data.h
```

최상위 구조:

```c
typedef struct SpeciesDataEntry {
    SpeciesData speciesData;
    SpeciesMetrics metricsData;
    SpeciesTextData textData;
} SpeciesDataEntry;
```

실제 전역 배열:

```c
extern const SpeciesDataEntry sSpeciesData[MAX_SPECIES_INCLUDING_FORMS + 1];
```

## 2.1 `SpeciesBaseStats`

```c
typedef struct SpeciesBaseStats {
    u8 hp;
    u8 attack;
    u8 defense;
    u8 spAttack;
    u8 spDefense;
    u8 speed;
} SpeciesBaseStats;
```

### 매우 중요: C 구조체 순서와 ROM 직렬화 순서는 다름

C initializer에서는:

```text
HP / ATK / DEF / SpA / SpD / SPE
```

순서입니다.

그러나 `speciesdatagen`이 HGSS personal data로 쓸 때는:

```text
HP / ATK / DEF / SPE / SpA / SpD
```

순서로 배치합니다.

Digol-2의 기존 `data.json`은 원래 HGSS/구 converter에 맞춰:

```text
HP / ATK / DEF / SPE / SpA / SpD
```

순서를 사용하므로, 향후 최신 converter를 만들 때 이 차이를 반드시 명시적으로 매핑해야 합니다.

직접 배열 복사로 처리하면 Speed와 특수 능력치가 뒤섞일 수 있습니다.

---

# 3. `SpeciesData`

현재 필드:

```c
typedef struct SpeciesData {
    SpeciesBaseStats baseStats;
    u8 types[2];
    u8 catchRate;
    u8 baseExpRewardPadding;
    SpeciesEVYields evYields;
    SpeciesWildHeldItems wildHeldItems;
    u8 genderRatio;
    u8 hatchCycles;
    u8 baseFriendship;
    u8 expRate;
    u8 eggGroups[2];
    u16 abilities[2];
    u8 safariFleeRate;
    u8 bodyColor;
    u8 flipSprite;
    u32 tmHmLearnsetPadding[4];
} SpeciesData;
```

## 각 필드

### `baseStats`

종족값.

각 값은 `u8`, 즉 0~255 범위.

### `types[2]`

```c
.types = { TYPE_FIRE, TYPE_DRAGON },
```

단일 타입은 같은 타입을 2회 지정하는 기존 HGSS 방식이 일반적입니다.

### `catchRate`

포획률.

### `baseExpRewardPadding`

personal data의 원래 1-byte base EXP 위치입니다.

하지만 최신 hg-engine의 실제 경험치 보상은 별도:

```text
data/BaseExperienceTable.c
```

에서 `u16` 테이블로 관리됩니다.

따라서 Digol-2 converter 최신화 시:

- `Species.c`의 padding/legacy byte
- `BaseExperienceTable.c`의 실제 base EXP

를 구분해야 합니다.

### `evYields`

```c
typedef struct SpeciesEVYields {
    u8 hp;
    u8 attack;
    u8 defense;
    u8 spAttack;
    u8 spDefense;
    u8 speed;
} SpeciesEVYields;
```

generator는 각 항목을 HGSS의 2-bit EV yield 영역에 packing합니다.

실질적으로 항목당 0~3 범위로 다루는 것이 안전합니다.

### `wildHeldItems`

```c
typedef struct SpeciesWildHeldItems {
    u16 common;
    u16 rare;
} SpeciesWildHeldItems;
```

예:

```c
.wildHeldItems = {
    .common = ITEM_NONE,
    .rare = ITEM_METAL_COAT,
},
```

### `genderRatio`

원작 personal data 형식의 성비 값.

Digimon처럼 성별을 게임 기획상 사실상 사용하지 않는다면 프로젝트 전체 정책을 정해 일관된 값을 쓰는 것이 좋습니다.

### `hatchCycles`

부화 cycle.

### `baseFriendship`

기본 친밀도.

### `expRate`

성장 곡선:

```text
GROWTH_*
```

상수.

### `eggGroups[2]`

알 그룹.

### `abilities[2]`

일반 특성 2개.

중요하게도 최신 hg-engine은 특성 번호를 255보다 확장하기 위해 personal data에서 ability를 **16-bit로 기록**하도록 패치합니다.

따라서 최신판에서는:

```c
u16 abilities[2];
```

입니다.

### `safariFleeRate`

Safari flee rate.

### `bodyColor`, `flipSprite`

도감 색 분류와 sprite flip.

generator가 HGSS의 한 byte에 packing합니다.

### `tmHmLearnsetPadding[4]`

현재 `SpeciesData`에서는 직접적인 TM/HM learnset가 아니라 legacy 공간을 유지하는 padding입니다.

**현재 학습기는 `data/learnsets/learnsets.json`에서 관리**합니다.

---

# 4. `SpeciesMetrics`

```c
typedef struct SpeciesMetrics {
    u32 heightDecimetres;
    u32 weightHectograms;
    u8 bodyType;
    u16 femaleTrainerScale;
    u16 femalePokemonScale;
    u16 maleTrainerScale;
    u16 malePokemonScale;
    s16 femaleTrainerYOffset;
    s16 femalePokemonYOffset;
    s16 maleTrainerYOffset;
    s16 malePokemonYOffset;
} SpeciesMetrics;
```

이 데이터는 단순 문자열 도감 키/몸무게와 별개입니다.

사용처:

- Pokédex height comparison
- Pokédex body type search
- 트레이너와 포켓몬 크기 비교 렌더링
- Y offset

신규 디지몬을 추가할 때 0으로 두면 빌드 자체는 가능할 수 있어도 도감 비교 화면이 어색해질 수 있습니다.

---

# 5. `SpeciesTextData`

```c
typedef struct SpeciesTextData {
    const char *name;
    const char *pokedexEntry;
    const char *classification;
    const char *height;
    const char *weight;
} SpeciesTextData;
```

예시 형태:

```c
.textData = {
    .name = "Agumon",
    .pokedexEntry = "...",
    .classification = "Reptile Pokémon",
    .height = "2’00”",
    .weight = "44.1 lbs.",
},
```

`speciesdatagen`은 이를 여러 HGSS message bank에 자동 분배합니다.

현재 generator가 쓰는 대표 bank:

| 데이터 | bank |
|---|---:|
| 이름 | 237, 238, 817 |
| 도감 설명 | 803 |
| 분류 | 816, 823 |
| 키 문자열 | 814, 815 |
| 몸무게 문자열 | 812, 813 |

따라서 최신판에서는 이름/도감 텍스트를 여러 txt에 수동 복제하기보다 `Species.c`에서 관리하는 방향이 맞습니다.

---

# 6. 신규 종족 ID 추가

공식 신규 Pokémon 문서가 현재도 요구하는 핵심은 C와 ASM 양쪽 species 상수를 맞추는 것입니다.

## C

```text
include/constants/species.h
```

예:

```c
#define SPECIES_AGUMON (MAX_CANONICAL_MON_NUM + 1)
#define SPECIES_GABUMON (MAX_CANONICAL_MON_NUM + 2)
...
#define NUM_OF_FAKEMONS N
```

## ASM

```text
asm/include/species.inc
```

동일 번호:

```asm
.equ SPECIES_AGUMON, (MAX_CANONICAL_MON_NUM + 1)
.equ SPECIES_GABUMON, (MAX_CANONICAL_MON_NUM + 2)
...
.equ NUM_OF_FAKEMONS, N
```

### 절대 원칙

C/ASM 번호가 1개라도 어긋나면:

- 데이터 참조
- 그래픽
- trainer
- scripts
- form

등이 서로 다른 종을 가리킬 수 있습니다.

향후 Digol-2 converter/상수 생성기를 만들 때 species 상수 C/ASM 동시 생성 기능을 넣는 것이 좋습니다.

---

# 7. 폼 ID

최신 species header에는 대표적으로:

```c
#define MON_WITH_FORM(species, form) ((species) | ((form) << 11))
```

구조가 있습니다.

즉 낮은 11 bit가 species 영역이고 form은 상위 bit에 encode됩니다.

따라서 form-aware 데이터에서:

```c
MON_WITH_FORM(SPECIES_X, form)
```

을 사용합니다.

야생/트레이너/진화에서도 이 규칙을 사용합니다.

### 주의

`SPECIES_X_FORM` 같은 별도 internal species entry가 존재하는 경우와 runtime `(species, form)` 표현을 혼동하지 마십시오.

폼 추가는:

- species constants
- form mapping
- base species mapping
- sprite
- icon
- personal data
- form change logic

등 여러 계층이 연결됩니다.

---

# 8. `data/Species.c` 신규 엔트리 작성 패턴

개념 예시:

```c
[SPECIES_AGUMON] = {
    .textData = {
        .name = "Agumon",
        .pokedexEntry = "...",
        .classification = "Reptile Pokémon",
        .height = "...",
        .weight = "...",
    },
    .speciesData = {
        .baseStats = {
            .hp = 71,
            .attack = 90,
            .defense = 64,
            .spAttack = 58,
            .spDefense = 58,
            .speed = 69,
        },
        .types = { TYPE_FIRE, TYPE_FIRE },
        .catchRate = 140,
        .baseExpRewardPadding = 0,
        .evYields = { /* ... */ },
        .wildHeldItems = {
            .common = ITEM_NONE,
            .rare = ITEM_NONE,
        },
        .genderRatio = 255,
        .hatchCycles = 1,
        .baseFriendship = 70,
        .expRate = GROWTH_MEDIUM_FAST,
        .eggGroups = { EGG_GROUP_UNDISCOVERED, EGG_GROUP_UNDISCOVERED },
        .abilities = { ABILITY_BLAZE, ABILITY_GLUTTONY },
        .safariFleeRate = 0,
        .bodyColor = BODY_COLOR_YELLOW,
        .flipSprite = 0,
    },
    .metricsData = {
        /* Pokédex metric values */
    },
},
```

이 예시는 구조를 설명하기 위한 것이며, 실제 Digol-2 데이터 변환 시 상수명·문자열 정책은 프로젝트 기준으로 생성합니다.

---

# 9. 히든 특성

일반 특성 2개는 `Species.c`.

3번째 히든 특성은:

```text
data/HiddenAbilityTable.c
```

예:

```c
[SPECIES_BULBASAUR] = ABILITY_CHLOROPHYLL,
```

`ABILITY_NONE`이면 일반 ability handling으로 fallback합니다.

최신 hg-engine은 Pokémon 저장 구조의 reserved bit를 hidden ability flag로 활용합니다.

### 스크립트 지급

기본 config:

```c
HIDDEN_ABILITIES_FLAG 2600
HIDDEN_ABILITIES_STARTERS_FLAG 2601
```

일반 hidden ability flag는 `GivePokemon`, `WildBattleSp`, `GiveEgg`, `GiveTogepiEgg` 등에 영향을 준 뒤 자동 unset되는 방식입니다.

트레이너에서는 `abilitySlot = 2`가 hidden ability를 의미합니다.

### [CAUTION]

공식 문서 기준 hidden ability는 **breeding으로 전달되지 않는 상태**라고 명시되어 있습니다.

Digol-2에서 breeding을 사실상 사용하지 않는다면 큰 문제가 아닐 수 있지만, 시스템 기능으로 남겨둘 경우 기억해야 합니다.

---

# 10. Base Experience

실제 확장 base EXP:

```text
data/BaseExperienceTable.c
```

형식:

```c
const u16 UNUSED BaseExperienceTable[] = {
    [SPECIES_NONE] = 0,
    [SPECIES_BULBASAUR] = 64,
    ...
};
```

`u16`이므로 255를 초과하는 현대 세대 base EXP 값을 지원합니다.

경험치 계산 방식 자체는:

```text
include/config.h
EXPERIENCE_FORMULA_GEN
```

으로 조정됩니다.

---

# 11. 진화 데이터의 최신 원본

```text
data/Evolutions.c
```

`narcs.mk`가 이를:

```text
a/0/3/4
```

NARC로 생성합니다.

현재 dumper/source 구조상:

```c
#define MAX_EVOS_PER_POKE 9
```

과 동일하게 한 종당 **9개 진화 엔트리**를 사용합니다.

개념 구조:

```c
typedef struct EvolutionTable {
    struct Evolution entries[MAX_EVOS_PER_POKE];
    u16 terminator;
} EvolutionTable;
```

엔트리:

```text
{ method, parameter, target }
```

예:

```c
[SPECIES_GLOOM] = {
    .entries = {
        { EVO_USE_ITEM, ITEM_LEAF_STONE, SPECIES_VILEPLUME },
        { EVO_USE_ITEM, ITEM_SUN_STONE, SPECIES_BELLOSSOM },
        { EVO_NONE, 0, SPECIES_NONE },
        ...
    },
    .terminator = 0,
},
```

---

# 12. 진화 상수

공식 문서의 현재 기본/추가 methods:

```text
0  EVO_NONE
1  EVO_HAPPINESS
2  EVO_HAPPINESS_DAY
3  EVO_HAPPINESS_NIGHT
4  EVO_LEVEL_UP
5  EVO_TRADE
6  EVO_TRADE_ITEM
7  EVO_USE_ITEM
8  EVO_LEVEL_MORE_ATTACK
9  EVO_LEVEL_ATK_DEF_EQUAL
10 EVO_LEVEL_MORE_DEFENSE
11 EVO_LEVEL_PID_LOW
12 EVO_LEVEL_PID_HIGH
13 EVO_LEVEL_GEN_NEW_MON_1
14 EVO_LEVEL_GEN_NEW_MON_2
15 EVO_MAX_BEAUTY
16 EVO_USE_ITEM_MALE
17 EVO_USE_ITEM_FEMALE
18 EVO_USE_ITEM_DAY
19 EVO_USE_ITEM_NIGHT
20 EVO_KNOWS_MOVE
21 EVO_MON_IN_PARTY
22 EVO_LEVEL_MALE
23 EVO_LEVEL_FEMALE
24 EVO_LEVEL_ELECTRIC_FIELD
25 EVO_LEVEL_MOSSY_STONE
26 EVO_LEVEL_ICY_STONE
27 EVO_LEVEL_DAY
28 EVO_LEVEL_NIGHT
29 EVO_LEVEL_DUSK
30 EVO_LEVEL_RAIN
31 EVO_HAS_MOVE_TYPE
32 EVO_LEVEL_DARK_TYPE_MON_IN_PARTY
33 EVO_TRADE_SPECIFIC_MON
34 EVO_LEVEL_NATURE_AMPED
35 EVO_LEVEL_NATURE_LOW_KEY
36 EVO_AMOUNT_OF_CRITICAL_HITS
37 EVO_HURT_IN_BATTLE_AMOUNT
```

### [CAUTION] `EVO_TRADE_SPECIFIC_MON`

공식 문서는 이 항목을 **Unimplemented**라고 명시합니다.

상수가 존재한다고 기능이 구현됐다고 가정하면 안 됩니다.

### Digol-2 구 상수와 차이

기존 프로젝트에는 예:

```text
EVO_LEVEL
EVO_HAS_MOVE
EVO_STONE
EVO_OTHER_PARTY_MON
```

같은 이름이 있습니다.

최신 공식 이름과 대표 대응 개념은:

```text
EVO_LEVEL        -> EVO_LEVEL_UP
EVO_HAS_MOVE     -> EVO_KNOWS_MOVE
EVO_STONE        -> EVO_USE_ITEM
EVO_OTHER_PARTY_MON -> EVO_MON_IN_PARTY
```

이지만 **지금 당장 data.json을 일괄 변경하지 않습니다.** 향후 converter migration에서 공식 상수와 실제 코드의 alias 여부까지 확인한 뒤 처리합니다.

---

# 13. 진화 판정 로직

실제 runtime 판정의 핵심:

```text
src/individual/GetMonEvolutionInternal.c
```

새로운 진화 방식을 구현할 경우 최소 다음 계층을 봅니다.

1. evolution method constant
2. `data/Evolutions.c`의 parameter 의미
3. `GetMonEvolutionInternal.c`의 조건 판정
4. item 사용 진화라면 party item-use path
5. battle 누적 조건이라면 BattleStruct/mon data에 상태를 기록하는 위치
6. 필요하면 UI/텍스트

즉 상수만 추가해서는 신규 진화 방식이 동작하지 않습니다.

---

# 14. 학습기의 최신 원본

```text
data/learnsets/learnsets.json
```

파일 크기가 큰 통합 NatDex 학습기 데이터입니다.

공식 README는 **실제 사용자 수정 대상은 `learnsets.json`**이라고 명시합니다.

`data/learnsets/base/`에는 세대별 참고 자료가 있습니다.

예:

```text
01_rgb.json
...
10_hgss.json
...
21_sv.json
22_za.json
99_go.json
custom.json
```

---

# 15. `build_learnsets.py`

```text
scripts/build_learnsets.py
```

여러 세대의 learnset을 합쳐 `learnsets.json` 생성 가능.

주요 옵션:

```text
--cutoff
--inherit-level
--inherit-egg
--inherit-machine
--inherit-tutor
--ignore-files
```

### 순수 HGSS

```bash
python3 scripts/build_learnsets.py \
  --generate data/learnsets/learnsets.json \
  --cutoff hgss
```

### repo default NatDex 개념

공식 예시는 최신 mainline 세대 기준 level/egg set과 세대 누적 machine/tutor를 합치는 방식입니다.

### Digol-2 권장

디지몬은 Pokémon 공식 learnset의 단순 연장이 아니므로 장기적으로:

- `data.json` 또는 별도 Digol master JSON에서 learnset 관리
- converter가 `learnsets.json`의 Digimon entry를 생성

하는 구조가 좋습니다.

단, 현재 단계에서는 설계만 기록하고 실제 변환은 보류합니다.

---

# 16. 신규 종족 추가 시 함께 확인할 데이터

종족값만 넣고 끝나는 것이 아닙니다.

## 필수/준필수 체크리스트

- [ ] `include/constants/species.h`
- [ ] `asm/include/species.inc`
- [ ] `data/Species.c`
- [ ] `data/BaseExperienceTable.c`
- [ ] `data/HiddenAbilityTable.c`
- [ ] `data/Evolutions.c`
- [ ] `data/learnsets/learnsets.json`
- [ ] battle sprites
- [ ] icon
- [ ] icon palette
- [ ] sprite offsets
- [ ] Pokédex sort/area
- [ ] BabyMons 또는 진화 family 관련 데이터
- [ ] follower/overworld 관련 데이터
- [ ] form mapping이 필요한지
- [ ] cry
- [ ] wild/trainer/gift 배치

---

# 17. Pokédex 관련 주요 최신 파일

```text
data/PokedexSort.c
data/PokedexArea.c
data/RegionalDex.c
data/HeightTable.c
data/SpriteOffsets.c
```

또한 `Species.c`의 metrics가 Pokédex 일부 binary를 생성합니다.

신규 종이 도감에 보이지 않는다면 `Species.c`만 확인하지 말고 sort/area/regional 구조도 확인합니다.

---

# 18. BabyMons

```text
data/BabyMons.c
```

진화 family의 기본 species를 매핑합니다.

예:

```c
[SPECIES_IVYSAUR] = SPECIES_BULBASAUR,
[SPECIES_VENUSAUR] = SPECIES_BULBASAUR,
```

Digol-2의 다중 진화 구조에서는 “family의 baby/base species” 개념이 Pokémon보다 복잡할 수 있습니다.

이 테이블을 단순 자동 생성하기 전에 hg-engine이 해당 값을 어떤 시스템(알/가족 판정 등)에서 사용하는지 Digol-2 정책을 정해야 합니다.

---

# 19. 그래픽 폴더

신규 종 공식 workflow는 `data/graphics/sprites/...` 구조를 사용합니다.

대표:

```text
data/graphics/sprites/<species>/
  male/
    front.png
    front.png.key
    back.png
    back.png.key
  female/
    front.png
    front.png.key
    back.png
    back.png.key
  icon.png
```

실제 최신 폴더명/번호 방식은 `data/graphics/pokegra.mk`와 `scripts/reformat_sprite_data.py`가 최종 기준입니다.

신규 species constants를 추가한 뒤 공식 문서는:

```bash
python3 scripts/reformat_sprite_data.py
```

실행을 안내합니다.

---

# 20. battle sprite 규칙

공식 신규 Pokémon 가이드가 강조하는 핵심:

- indexed PNG
- 4bpp
- 최대 16색 palette
- transparent color가 palette 첫 슬롯과 맞아야 함
- front/back는 2 frame 구조
- shiny는 palette substitution 구조
- `.key` 파일 형식 유지

단순 24-bit/32-bit PNG를 저장했다고 hg-engine graphics tool이 알아서 변환해주는 것이 아닙니다.

---

# 21. 아이콘

현재 HGSS 아이콘은 제한된 palette 세트를 사용합니다.

최신 데이터에도:

```text
data/IconPaletteTable.c
```

가 존재합니다.

신규 디지몬 아이콘은:

1. 요구 크기/프레임 맞춤
2. 16색 indexed
3. hg-engine이 사용하는 icon palette 중 적합한 것 선택
4. `IconPaletteTable.c` 연결

순서로 검증합니다.

---

# 22. Sprite offsets

```text
data/SpriteOffsets.c
```

전투 화면 위치, 그림자 등 렌더링과 관련된 대규모 데이터가 있습니다.

새 sprite가:

- 너무 위/아래에 떠 있음
- 그림자와 위치가 안 맞음
- 전후면 정렬이 이상함

이라면 단순 PNG 문제가 아니라 offset table을 봐야 합니다.

---

# 23. follower / overworld

주요 최신 파일:

```text
data/FollowerProperties.c
src/field/overworld_table.c
data/SpeciesToOWFormFemale.c
```

공식 Wiki에도 별도 Overworld System 문서가 있습니다.

Digol-2가 모든 디지몬을 follower로 보여주려면 battle sprite만 추가해서는 부족합니다.

별도의 overworld gfx ID와 species mapping이 필요합니다.

---

# 24. 폼 시스템

관련 대표 파일:

```text
data/FormToSpeciesMapping.c
data/FormReversionMapping.c
data/PokeFormDataTbl.c
src/individual/BattleFormChangeCheck.c
```

폼을 구현할 때 확인할 것:

- base species
- form ID
- internal form personal data species
- form -> species mapping
- revert mapping
- 전투 중 form change 조건
- 능력 변경
- 그래픽
- learnset inheritance
- wild/trainer encoding

폼은 “새 종을 하나 더 등록”하는 것과 동일하지 않습니다.

---

# 25. Mega / Primal

CONFIG:

```c
#define MEGA_EVOLUTIONS
#define PRIMAL_REVERSION
```

폼 시스템과 battle form change logic이 연동됩니다.

Digimon의 Mode Change나 Burst Mode를 구현할 때 이 구조를 참고할 수 있지만, Digol-2의 “진화”와 “전투 중 form change”를 동일 시스템으로 취급할지는 별도 기획 판단입니다.

---

# 26. Cry

CONFIG에는:

```text
CRY_PSEUDOBANK_START
```

가 있고, hg-engine은 추가 cry를 SDAT의 pseudobank 방식으로 다룹니다.

신규 디지몬 cry를 대량 추가할 경우:

- species->cry mapping
- SDAT bank
- RAM 사용량
- cry pseudo bank ID 충돌

을 같이 확인해야 합니다.

종족 추가 1차 단계에서는 placeholder cry로 작업하고 데이터 구조가 안정된 후 대량 음성 추가를 하는 편이 안전합니다.

---

# 27. Digol-2 데이터 작성 규칙과 연결

현재 Digol-2의 밸런스 규칙은 별도로 유지합니다.

예:

```text
성장기   약 400
성숙기   약 480
아머체   약 520
완전체   약 550
궁극체   약 620
초궁극체 약 680
```

±20을 일반 범위로 두며, 특수 케이스는 설명을 남깁니다.

이 규칙은 **hg-engine 기술적 데이터 형식과 별개인 게임 디자인 규칙**입니다.

향후 최신 converter는:

```text
Digol-2 master data
   ↓ schema validation
Species.c
Evolutions.c
BaseExperienceTable.c
HiddenAbilityTable.c
learnsets.json
상수 파일들
```

을 생성하는 쪽으로 설계하는 것이 적합합니다.

---

# 28. 종족 데이터 수정 후 검증

최소:

```bash
make -j8
```

그리고 게임에서:

- 이름 정상
- 종족값 정상
- 타입 정상
- 일반 특성 슬롯 1/2 정상
- 히든 특성 정상
- 진화 정상
- 레벨업 기술 정상
- TM/Tutor 정상
- 도감 정상
- 전투 sprite 정상
- icon 정상
- follower 정상

을 단계적으로 확인합니다.

종족 ID 범위를 크게 확장했거나 species constants를 변경했다면:

```bash
make clean
make -j8
```

을 권장합니다.

---

# 29. 신규 디지몬 1종 추가의 권장 순서

1. species C/ASM 상수 추가
2. `Species.c` 데이터 추가
3. `BaseExperienceTable.c`
4. `HiddenAbilityTable.c`
5. `Evolutions.c`
6. `learnsets.json`
7. sprite/icon 최소 placeholder 추가
8. Pokédex/follower 관련 필수 mapping
9. clean build
10. wild 또는 test trainer에 임시 배치
11. 전투/진화 검증
12. 정식 graphics/cry/overworld 완성

이 순서로 하면 “데이터 문제”와 “그래픽 문제”를 분리해 디버깅하기 쉽습니다.
