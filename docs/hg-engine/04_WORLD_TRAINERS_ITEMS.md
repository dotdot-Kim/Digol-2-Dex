# 04. 트레이너 · 야생 · 아이템 · 필드 콘텐츠

> 기준: `BluRosie/hg-engine` `main` @ `1febb90b856745f8648c8a4fa059e7499a3cca3f`

---

# 1. 트레이너 데이터 최신 원본

```text
data/Trainers.c
```

구조 정의:

```text
include/trainer_data.h
```

생성기:

```text
tools/trainerdatagen
```

최신 빌드에서는 과거 Wiki의 `armips/data/trainers/trainers.s`보다 이 C 데이터가 우선 Source of Truth입니다.

---

# 2. 트레이너 최상위 구조

```c
typedef struct TrainerData {
    const char *name;
    TrainerDataEntry data;
    u8 partyMonCount;
    u8 textCount;
    TrainerPokemonData party[TRAINER_SOURCE_MAX_PARTY_SIZE];
    TrainerMessageEntry text[TRAINER_SOURCE_MAX_TEXT_ENTRY_COUNT];
} TrainerData;
```

현재:

```c
#define TRAINER_SOURCE_MAX_PARTY_SIZE 6
#define TRAINER_SOURCE_MAX_TEXT_ENTRY_COUNT 10
```

입니다.

`partyMonCount`와 `textCount`는 generator가 계산합니다.

---

# 3. TrainerDataEntry

```c
typedef struct TrainerDataEntry {
    u8 trainerType;
    u16 trainerClass;
    u8 partySize;
    u16 items[4];
    u32 aiFlags;
    u32 battleType;
} TrainerDataEntry;
```

## `trainerType`

파티 엔트리에서 어떤 추가 필드를 읽을지 결정하는 bitfield.

```text
TRAINER_DATA_TYPE_NOTHING          0x00
TRAINER_DATA_TYPE_MOVES            0x01
TRAINER_DATA_TYPE_ITEMS            0x02
TRAINER_DATA_TYPE_ABILITY          0x04
TRAINER_DATA_TYPE_BALL             0x08
TRAINER_DATA_TYPE_IV_EV_SET        0x10
TRAINER_DATA_TYPE_NATURE_SET       0x20
TRAINER_DATA_TYPE_SHINY_LOCK       0x40
TRAINER_DATA_TYPE_ADDITIONAL_FLAGS 0x80
```

필요한 필드만 serialize하므로 flags와 실제 initializer 내용이 일치해야 합니다.

## `trainerClass`

trainer class 상수.

새 trainer class를 추가한다면 sprite, 성별, 상금 관련 table도 함께 볼 수 있습니다.

## `items[4]`

트레이너가 전투 중 사용하는 아이템.

예: Full Restore.

## `aiFlags`

AI 행동 수준/전략 flag.

## `battleType`

```text
SINGLE_BATTLE            0
DOUBLE_BATTLE            2
NO_PARTNER_DOUBLE_BATTLE 3
```

---

# 4. AI flags

현재 header의 대표값:

```text
F_PRIORITIZE_SUPER_EFFECTIVE
F_EVALUATE_ATTACKS
F_EXPERT_ATTACKS
F_PRIORITIZE_STATUS_MOVES
F_RISKY_ATTACKS
F_PRIORITIZE_DAMAGE
F_MULTI_BATTLE_PARTNER
F_DOUBLE_BATTLE
F_PRIORITIZE_HEALING
F_USE_WEATHER
F_HARRASSMENT
F_ROAMING_MON
F_SAFARI_ZONE
F_CATCHING_DEMO
```

일반적인 강한 NPC의 기본 후보:

```c
F_TRAINER_EXPERT_AI
```

이는 현재:

```text
SUPER_EFFECTIVE | EVALUATE_ATTACKS | EXPERT_ATTACKS
```

조합입니다.

Digol-2의 보스/체육관/최종전 트레이너는 AI flag를 별도 등급으로 표준화해두는 것이 좋습니다.

---

# 5. TrainerPokemonData

최신 구조는 vanilla보다 훨씬 확장되어 있습니다.

```c
typedef struct TrainerPokemonData {
    u8 ivs;
    u8 abilitySlot;
    u16 level;
    u16 species;
    u16 item;
    u16 moves[4];
    u16 ability;
    u16 ball;
    TrainerPokemonEVIV setIvs;
    TrainerPokemonEVIV setEvs;
    u8 nature;
    u8 shinyLock;
    u32 additionalFlags;
    u32 status;
    u16 hp;
    u16 attack;
    u16 defense;
    u16 speed;
    u16 spAttack;
    u16 spDefense;
    u8 ppCounts[4];
    u16 nickname[11];
    const char *nicknameStr;
    u16 ballSeal;
} TrainerPokemonData;
```

---

# 6. 기본 IV 필드

```c
.ivs = N
```

vanilla 방식의 0~255 값을 0~31 IV로 scaling하는 필드입니다.

정밀하게 개별 IV를 지정하려면 `TRAINER_DATA_TYPE_IV_EV_SET`과 `setIvs` 사용.

---

# 7. 특성 슬롯

현재 상수:

```text
TRAINER_POKEMON_ABILITY_1      0x00
TRAINER_POKEMON_ABILITY_HIDDEN 0x02
TRAINER_POKEMON_ABILITY_2      0x20
```

히든 특성은 `abilitySlot = 2` 개념입니다.

### ability override

`TRAINER_DATA_TYPE_ABILITY`를 쓰면:

```c
.ability = ABILITY_*,
```

로 종족 기본 특성과 무관하게 강제할 수 있습니다.

공식 문서는 form change와 hidden ability bit가 필요한 경우 단순 custom override보다 hidden slot 사용을 권장합니다.

---

# 8. 종족과 폼

trainer species도 최신 expanded format에서 form 정보를 상위 bit로 encode합니다.

C 원본에서는 일반적으로:

```c
.species = SPECIES_X
```

또는 form-aware expression을 사용합니다.

공용 helper:

```c
MON_WITH_FORM(species, form)
```

base species ID와 별도 internal form species를 혼동하지 않습니다.

---

# 9. 개별 IV / EV

`TRAINER_DATA_TYPE_IV_EV_SET` 사용 시:

```c
.setIvs = { ... }
.setEvs = { ... }
```

각 능력치를 독립적으로 지정합니다.

현재 구조 순서:

```text
HP, Attack, Defense, Speed, SpAttack, SpDefense
```

TrainerPokemonEVIV가 이 순서를 사용합니다.

### 중요

소스 주석상 EV에 게임 합계 제한을 자동 강제한다고 가정하면 안 됩니다. 의도적으로 매우 강한 보스 데이터를 만드는 것도 가능할 수 있습니다.

Digol-2에서는 플레이어와 NPC 사이 밸런스를 위해 trainer EV 템플릿을 별도로 관리하는 것이 좋습니다.

---

# 10. 성격

`TRAINER_DATA_TYPE_NATURE_SET`:

```c
.nature = NATURE_*
```

실제 C source/dumper가 constant expression을 사용하도록 구성되어 있습니다.

---

# 11. Shiny

`TRAINER_DATA_TYPE_SHINY_LOCK` 필드.

공식 구 문서의 용어는 `shinylock`이지만 실제 의미는 설정값에 따라 trainer mon의 shiny 생성 여부를 강제하는 확장 필드입니다.

잡기 cheat 등으로 OT가 바뀔 경우 전투에서 보이던 shiny 결과가 유지된다고 단정할 수 없습니다.

---

# 12. Additional flags

최신 `include/trainer_data.h` 기준:

```text
TRAINER_DATA_EXTRA_TYPE_STATUS    0x01
TRAINER_DATA_EXTRA_TYPE_HP        0x02
TRAINER_DATA_EXTRA_TYPE_ATK       0x04
TRAINER_DATA_EXTRA_TYPE_DEF       0x08
TRAINER_DATA_EXTRA_TYPE_SPEED     0x10
TRAINER_DATA_EXTRA_TYPE_SP_ATK    0x20
TRAINER_DATA_EXTRA_TYPE_SP_DEF    0x40
TRAINER_DATA_EXTRA_TYPE_PP_COUNTS 0x80
TRAINER_DATA_EXTRA_TYPE_NICKNAME  0x100
```

### [중요: Wiki와 최신 header 차이]

과거 Trainer Wiki에는 `TRAINER_DATA_EXTRA_TYPE_TYPES`처럼 타입 강제 필드도 설명되어 있으나, **현재 기준 커밋의 `include/trainer_data.h`에는 해당 flag/field가 없습니다.**

따라서 최신 작업은 header와 generator를 우선합니다.

이 사례는 Wiki만 보고 구현하면 안 되는 대표적인 예입니다.

---

# 13. 고정 status / stat

Additional flags로 전투 시작부터:

- status
- HP
- Attack
- Defense
- Speed
- Sp. Atk
- Sp. Def

를 강제로 지정할 수 있습니다.

이는 일반 trainer보다 이벤트성 보스 전투에 유용합니다.

예:

- HP가 비정상적으로 높은 raid 스타일 보스
- 시작부터 독 상태
- 스토리 전투용 scripted 상태

단 일반 게임 밸런스에는 남용하지 않는 것이 좋습니다.

---

# 14. PP와 nickname

`PP_COUNTS` flag로 각 기술의 현재 PP 강제 가능.

`NICKNAME` flag로 custom nickname 가능.

최신 C 구조에는 문자열용:

```c
const char *nicknameStr;
```

도 존재하며 generator가 실제 HGSS nickname byte 구조로 변환합니다.

---

# 15. Trainer text

`TrainerMessageEntry`:

```c
typedef struct TrainerMessageEntry {
    u16 type;
    const char *text;
} TrainerMessageEntry;
```

대표 message type:

```text
TRMSG_INTRO
TRMSG_LOSE
TRMSG_AFTER
TRMSG_DBL_INTRO_1
...
TRMSG_HIT_POKE_FIRST_TIME
TRMSG_CURRENT_POKE_HALF
TRMSG_LAST_POKE
TRMSG_LAST_POKE_HALF
TRMSG_WIN
```

즉 트레이너가 전투 중 특정 상황에 대사를 출력하게 할 수 있습니다.

---

# 16. 야생 조우 최신 원본

```text
data/Encounters.c
```

NARC target:

```text
a/0/3/7
```

구조 정의는 encounter 관련 header를 참고합니다.

현재 C source는 지역별 `EncounterData` initializer입니다.

---

# 17. EncounterData의 주요 구성

대표적으로:

```text
rateWalk
rateSurf
rateRockSmash
rateOldRod
rateGoodRod
rateSuperRod
landSlots
hoennSoundSpecies
sinnohSoundSpecies
surfSlots
rockSmashSlots
oldRodSlots
goodRodSlots
superRodSlots
landSwarm
surfSwarm
nightFish
fishSwarm
```

을 포함합니다.

---

# 18. 풀숲 encounter 슬롯

12 slot.

level 배열과:

```text
speciesMorning[12]
speciesDay[12]
speciesNight[12]
```

이 분리됩니다.

공식 문서에 알려진 vanilla grass 확률:

```text
20, 20, 10, 10, 10, 10, 5, 5, 4, 4, 1, 1 %
```

Digol-2에서 지역별 배치를 설계할 때 이 slot weight를 고려합니다.

---

# 19. Surf / Rod / Rock Smash

이 슬롯들은 species 외에:

```text
minLevel
maxLevel
```

범위를 가집니다.

대표 확률은 원작 구조에 따라 슬롯마다 다릅니다.

예: surf는 5 slots.

---

# 20. 야생 폼

최신 C generator/dumper는 form species를:

```c
MON_WITH_FORM(SPECIES_X, form)
```

으로 표현합니다.

### [CAUTION]

구 공식 Troubleshooting에서는 form Pokémon을 일반 species entry처럼 잘못 넣으면 깨진 Dex/크래시가 발생하는 사례를 명시합니다.

폼은 반드시 form-aware encoding을 사용합니다.

---

# 21. Dynamic Wild Forms

CONFIG:

```c
// #define IMPLEMENT_DYNAMIC_WILD_SPECIES_FORMS
```

기본 비활성.

활성화 시 여러 form을 동적으로 선택하는 시스템을 사용할 수 있습니다.

일반적으로는 encounter table에서 명시적으로 form을 지정하는 것이 예측 가능성이 높습니다.

---

# 22. Safari / Headbutt 등

기본 `Encounters.c` 외에도 최신 data tree에는:

```text
data/SafariEncounters.c
data/Headbutt.c
```

등이 별도로 존재합니다.

따라서 “야생 배치를 바꿨는데 Safari/박치기에는 반영되지 않는다”는 것은 정상입니다. 별도 시스템입니다.

---

# 23. 아이템 데이터 최신 원본

```text
data/itemdata/itemdata.c
```

빌드 규칙:

```text
data/itemdata/itemdata.mk
```

구조 정의:

```text
include/item.h
```

현재 itemdata source는 수 MB 규모의 C 데이터입니다.

---

# 24. ITEMDATA 주요 필드

```c
typedef struct ItemData {
    u16 price;
    u8 holdEffect;
    u8 holdEffectParam;
    u8 pluckEffect;
    u8 flingEffect;
    u8 flingPower;
    u8 naturalGiftPower;
    ...
    u8 fieldUseFunc;
    u8 battleUseFunc;
    u8 partyUse;
    ...
    ITEMPARTYPARAM partyUseParam;
    u8 price_high : 4;
    ...
} ITEMDATA;
```

---

# 25. 가격 확장

최신 header에는:

```c
#define ITEM_PRICE(p) \
    .price = ((p) & 0xFFFF), \
    .price_high = (((p) >> 16) & 0xF)
```

형태의 compile-time macro가 있습니다.

즉 원작 16-bit보다 높은 가격을 일부 확장할 수 있는 구조입니다.

새 아이템을 만들 때 단순 `.price = 100000`처럼 overflow시키지 말고 `ITEM_PRICE()` 사용 여부를 기존 data에서 확인합니다.

---

# 26. held item 효과

```text
holdEffect
holdEffectParam
```

은 전투 중 지닌 도구의 핵심 효과.

새로운 held effect를 만드는 경우:

- item constant
- item data
- hold effect constant
- battle item calculator/handler
- UI description

을 연결해야 합니다.

단순 수치조정 도구라면 기존 Choice Band/Life Orb/type boost 등 유사 effect를 찾는 것이 안전합니다.

---

# 27. Fling / Natural Gift / Pluck

ITEMDATA에 별도:

```text
pluckEffect
flingEffect
flingPower
naturalGiftPower
naturalGiftType
```

가 있으므로 신규 Berry/held item을 추가할 때 이 상호작용도 정의해야 합니다.

---

# 28. field / battle / party use

```text
fieldUseFunc
battleUseFunc
partyUse
partyUseParam
```

으로 아이템 사용 경로가 분리됩니다.

`ITEMPARTYPARAM`에는 대표적으로:

- 상태이상 회복
- revive
- level up
- evolve
- stat stages
- PP Up/Max/Restore
- HP restore
- EV 증가
- friendship 변화

bit/parameter가 존재합니다.

즉 일반적인 회복약·진화돌·비타민은 기존 구조만으로 상당 부분 정의 가능합니다.

완전히 새로운 UI/field behavior를 요구하는 key item은 C 함수 추가가 필요할 수 있습니다.

---

# 29. 아이템 constant

```text
include/constants/item.h
```

에서 번호를 관리합니다.

Digol-2의:

```text
ITEM_MODE_SELECTOR
ITEM_RESET_DISK
ITEM_BRILLIANT_STONE
ITEM_OMEGA_BLADE
ITEM_DIGICORE
```

등 커스텀 아이템은 최신 upstream item ID와 충돌하지 않도록 향후 재배치 정책을 정해야 합니다.

현재 단계에서는 기존 데이터를 변경하지 않습니다.

---

# 30. Machine/TM/HM/TR

최신 repo에는:

```text
scripts/update_machine_moves.py
```

가 있으며 기본 입력으로:

```text
data/Moves.c
src/item.c의 sMachineMoves[]
include/constants/item.h
```

를 사용합니다.

TM 99 초과 표시와 관련 config:

```c
#define UPDATE_MACHINE_MOVE_LABELS
```

도 있습니다.

---

# 31. Mart

CONFIG:

```c
#define MART_EXPANSION
```

상점 inventory 확장 지원.

새 Digol-2 전용 아이템을 판매하려면 itemdata만 추가하고 끝나는 것이 아니라 mart inventory에도 배치해야 합니다.

---

# 32. Hidden Items

```text
data/HiddenItems.c
src/field/hidden_items.c
```

필드의 숨겨진 아이템 위치/종류는 별도 데이터입니다.

---

# 33. Starter / Gift / scripted Pokémon

hg-engine의 필드 script 시스템은 Pokémon 지급/특수 야생전 등을 통해 종을 생성합니다.

히든 특성 공식 문서에서 확인되는 대표 명령:

```text
GivePokemon
WildBattleSp
GiveEgg
GiveTogepiEgg
```

현대 pokeheartgold 명명 체계에서는 대응 script macro 이름이 달라질 수 있으므로 실제 script header/현재 map script를 참고합니다.

신규 스타터를 변경할 때는:

- 지급 species
- starter graphics/UI
- rival choice logic
- Pokédex registration
- hidden ability starter flag

등을 함께 추적합니다.

---

# 34. 히든 특성 script flag

일반:

```text
HIDDEN_ABILITIES_FLAG = 2600
```

다음 생성에 hidden ability를 적용한 뒤 자동 clear되는 방식.

스타터:

```text
HIDDEN_ABILITIES_STARTERS_FLAG = 2601
```

스타터용 flag는 일반 story flag처럼 유지될 수 있습니다.

---

# 35. 경험치 시스템

base reward:

```text
data/BaseExperienceTable.c
```

formula:

```text
EXPERIENCE_FORMULA_GEN
```

공식 구현은:

- Gen 5/7/8 계열 scaled EXP
- 그 외 flat HGSS 계열

을 선택할 수 있도록 되어 있습니다.

scaled 방식에서는 상대와 내 레벨 차이가 경험치에 영향을 줍니다.

Digol-2처럼 진화 단계별 BST 차이가 큰 게임에서는 level curve와 base EXP를 별도로 밸런싱해야 합니다.

---

# 36. Level cap

선택 기능:

```text
IMPLEMENT_LEVEL_CAP
LEVEL_CAP_VARIABLE
UNCAP_CANDIES_FROM_LEVEL_CAP
ALLOW_LEVEL_CAP_EVOLVE
```

스토리 진행 variable로 cap을 조절할 수 있습니다.

Digol-2에서 진화 레벨을 성장기/성숙기/완전체/궁극체 구간에 맞춰 설계한다면 level cap 기능을 난이도 모드에 활용할 수 있습니다.

---

# 37. Overworld follower

관련 대표:

```text
data/FollowerProperties.c
src/field/overworld_table.c
data/SpeciesToOWFormFemale.c
```

`FollowerProperties`는 종별 follower size/behavior 속성을 가집니다.

새 디지몬을 필드 동행시키려면:

- overworld sprite
- gfx ID
- species mapping
- size/door enter property
- form/gender mapping

을 확인합니다.

---

# 38. Roamer

CONFIG:

```c
#define EXPAND_ROAMERS
```

관련:

```text
src/field_roamer.c
```

로밍 전설 시스템을 Digimon 이벤트에 활용할 수 있습니다.

---

# 39. Music

CONFIG:

```c
#define EXPAND_MUSIC_TABLES
```

관련:

```text
src/music_tables.c
```

trainer class/특정 전투별 BGM 확장을 할 때 확인합니다.

---

# 40. Trainer class 확장

CONFIG:

```text
EXPAND_TRAINER_PRIZE_MONEY
EXPAND_TRAINER_GENDER_TABLE
```

관련:

```text
src/trainermoney.c
src/pokemon.c
```

새 class를 추가하면 단순 constant + sprite뿐 아니라:

- 성별
- 상금 multiplier
- BGM/table

도 확인합니다.

---

# 41. Digol-2용 트레이너 데이터 권장 템플릿

일반 NPC:

- vanilla-style IV
- item 없음 또는 소수
- learnset 기술
- 기본 ability slot

강한 NPC:

- 개별 IV/EV
- 성격
- held item
- 4기술
- 명시 ability slot
- Expert AI

보스:

- 필요 시 additional stat/status
- custom ability
- custom battle message
- 별도 battle test

이렇게 등급을 정하면 트레이너별 데이터 작성량을 통제할 수 있습니다.

---

# 42. 월드 데이터 수정 후 검증

## 트레이너

- 파티 수
- species/form
- level
- ability
- moves
- item
- IV/EV/nature
- AI
- single/double
- 대사

## 야생

- morning/day/night
- 레벨
- slot 확률
- form
- Surf/Rod/Rock Smash
- Safari/Headbutt 별도

## 아이템

- 이름/설명
- bag pocket
- 가격
- held effect
- field use
- battle use
- party use
- Fling/Natural Gift
- shop placement
- icon

까지 확인합니다.
