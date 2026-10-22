# 05. 테스트 · 디버깅 · 문제 해결 · 유지보수

> 기준: `BluRosie/hg-engine` `main` @ `f4fca05a63dc7c694b72c89f178fb3030ba6f5ad`

---

# 1. 왜 자동 테스트를 써야 하는가

Digol-2는 기존 Pokémon 데이터를 바꾸는 수준을 넘어:

- 신규 종 수백 개
- 커스텀 특성
- 커스텀 진화
- 커스텀 기술
- 기존 특성 개조

가 들어갈 가능성이 높습니다.

이 경우 실게임에서만 확인하면 한 기능을 수정했을 때 이전 기능이 깨지는 회귀(regression)를 찾기 어렵습니다.

최신 hg-engine은 이미 battle test framework를 포함하고 있으므로 이를 적극적으로 사용하는 것이 좋습니다.

---

# 2. 테스트 데이터 위치

```text
data/battle_tests/
```

여러 하위 폴더의 `.c` 테스트 파일을 사용합니다.

예시 분류는 기술/effect별로 존재하며, 실제 기준은 현재 repo tree를 확인합니다.

---

# 3. 테스트 build generator

```text
scripts/build_tests.py
```

이 스크립트는:

1. `data/battle_tests/**/*.c` 검색
2. filter keyword 적용
3. `// SKIP`이 있는 테스트 제외
4. 통합 `BattleTests.c` 생성
5. test manifest 생성
6. 총 테스트 수 generated header 생성

을 수행합니다.

주요 출력:

```text
build/battle_tests/BattleTests.c
build/battle_tests/test_manifest.json
include/constants/generated/test_battle.h
```

`include/constants/generated/*`는 **자동 생성물이므로 직접 수정하지 않습니다.**

---

# 4. 테스트 실행

runner:

```text
scripts/run_tests.sh
```

기본:

```bash
./scripts/run_tests.sh
```

스크립트는 `.venv`를 활성화하고 `scripts/run_tests.py`를 호출하며 로그를:

```text
test_logs.txt
```

에 남깁니다.

옵션:

```bash
./scripts/run_tests.sh -v
```

video mode.

```bash
./scripts/run_tests.sh -c
```

CI mode.

추가 문자열은 test filter로 전달됩니다.

---

# 5. 테스트 필터

`build_tests.py`는 파일 경로나 파일 내용에 keyword가 들어가는 테스트만 고를 수 있습니다.

또한:

```text
test_filter.txt
```

가 있으면 줄별 keyword를 추가합니다.

신규 특성 개발 중 전체 테스트가 너무 오래 걸리면 특성명/관련 기술명으로 좁혀서 개발하고, 완료 직전에 전체 회귀 테스트를 돌리는 방식이 좋습니다.

---

# 6. 신규 특성 테스트의 기본 틀

특성을 구현하면 **성공 케이스만 만들지 않습니다.**

예: 특정 타입 기술 1.5배 특성.

최소:

- 해당 타입: 강화됨
- 다른 타입: 강화되지 않음
- 물리/특수 제한이 있다면 반대 split: 미적용
- Neutralizing Gas: 비활성화
- Mold Breaker 상호작용
- 특성 없는 동일 조건 기준 damage
- doubles에서 대상이 달라져도 정상

을 봅니다.

---

# 7. timer 특성 테스트

등장 후 2턴 강화 같은 기능은 특히 회귀 위험이 큽니다.

테스트:

1. 등장 직후 첫 행동
2. 2턴째
3. 3턴째 만료
4. 교체 후 재등장
5. 교체 없이 Skill Swap
6. Neutralizing Gas 등장/퇴장
7. 기절 후 새로운 mon
8. Baton Pass와 관계가 있다면 해당 상태
9. doubles에서 각각 별도 counter인지

counter를 글로벌 1개로 잘못 두면 doubles에서 바로 문제가 납니다.

---

# 8. 새 기술 테스트

최소 matrix:

| 영역 | 확인 |
|---|---|
| 위력 | 기대 damage 범위 |
| 타입 | 상성/면역 |
| split | 물리/특수/변화 |
| 명중 | hit/miss |
| 우선도 | 행동 순서 |
| target | 싱글/더블 |
| Protect | 막히는지 |
| Substitute | 효과가 통과하는지 |
| contact | 접촉 반응 |
| 부가효과 | 확률/조건 |
| PP | 소비량/Pressure |
| ability | 면역/강화/약화 |
| item | Choice/Life Orb 등 |

---

# 9. `DEBUG_BATTLE_SCENARIOS` 주의

현재 `include/config.h`에서:

```c
#ifdef DEBUG_BATTLE_SCENARIOS
#define GEN_LATEST GEN_CHAMPIONS
#else
#define GEN_LATEST 9
#endif
```

구조입니다.

즉 테스트 ROM에서는 일부 `*_GENERATION` 설정이 일반 build와 다르게 Champions 값(99)을 따라갈 수 있습니다.

테스트 결과가 실게임과 다르면 먼저 이 차이를 확인합니다.

---

# 10. 빌드가 이상할 때 clean 선택

## 데이터만 바꿈

우선:

```bash
make -j8
```

## C/ASM 전투 코드 변경

```bash
make clean_code
make -j8
```

## 상수 범위/구조/대규모 데이터 변경

```bash
make clean
make -j8
```

## generator/tool 변경 또는 tool 오류

```bash
make clean_tools
make clean
make -j8
```

`clean`을 습관적으로 매번 하면 빌드 시간이 늘어나므로 원인을 기준으로 선택합니다.

---

# 11. Make dependency를 맹신하지 말 것

Makefile은 C `.d` dependency를 생성하지만 hg-engine은:

- generated 파일
- armips
- NARC
- Python generator
- 외부 tool

이 함께 얽혀 있습니다.

“소스는 바꿨는데 ROM에서 예전 동작이 나온다”면 incremental build 문제일 수 있습니다.

이 경우 먼저 `clean_code`, 이후 `clean` 순으로 강도를 올립니다.

---

# 12. ROM game code 오류

현재 Makefile은:

```text
DESIRED_GAMECODE := IPKE
```

를 요구합니다.

에러 예:

```text
ROM Code ... does not match valid ROM Code (IPKE)
```

이면:

- SoulSilver
- 다른 언어 HeartGold
- 잘못된 ROM

일 가능성이 큽니다.

**US HeartGold**를 사용합니다.

---

# 13. Git repo가 아니라고 나오는 경우

현재 Makefile은 repo root가 Git repository가 아니면 즉시 중단합니다.

ZIP 다운로드 후 아무 폴더에서 빌드하기보다 공식적으로:

```bash
git clone --recursive ...
```

을 사용합니다.

---

# 14. OneDrive 오류

Makefile은 현재 working path에 `onedrive`가 있으면 명시적으로 중단합니다.

예:

```text
Do not put files into OneDrive.
```

해결:

```text
C:\Users\...\OneDrive\...
```

아닌 경로나 WSL Linux filesystem의 `~/git` 아래에 clone합니다.

---

# 15. WSL 메모리 부족

공식 Troubleshooting에서는 build, 특히 sound archive 생성 과정에서 WSL이 죽으면 병렬 빌드를 끄라고 안내합니다.

```bash
make
```

즉 `-j8`, `-j16` 등을 제거합니다.

---

# 16. 권한 문제

공식 Troubleshooting은 과거 권한 오류에:

```bash
sudo make -jX
```

를 제안합니다.

다만 장기 개발 repo 전체를 root-owned로 만드는 것은 관리가 번거로울 수 있습니다.

먼저 파일 ownership을 확인하는 것이 좋습니다.

```bash
ls -la
```

잘못 root 소유가 되었다면 repo ownership을 정상 사용자로 되돌리는 편이 낫습니다.

---

# 17. submodule / nitrogfx 문제

구버전 repository에서 nitrogfx를 못 찾는 문제의 공식 해결:

```bash
git submodule init
git submodule update
```

현재는 처음부터:

```bash
git clone --recursive
```

하는 것이 기본입니다.

---

# 18. 오래된 tool/mono 문제

공식 Troubleshooting의 2023년 이전 repo 사례:

```bash
sudo apt install mono-devel
make clean_tools --jobs
make build_tools --jobs
```

현재 최신 clone에서는 오래된 workaround가 필요 없는 경우가 대부분입니다.

즉 이 항목은 **기존 오래된 작업 디렉터리를 계속 업데이트해 온 경우** 참고합니다.

---

# 19. CRLF / LF 문제

공식 Troubleshooting에는 일부 `.pal`에서 LF line ending 때문에 NARC build가 실패했던 사례가 있습니다.

해결 예:

```bash
git rm -rf --cached .
git reset --hard HEAD
```

또는 Notepad++ 등으로 요구 line ending 복원.

### Digol-2 주의

`git reset --hard`는 **커밋되지 않은 변경을 삭제**합니다.

실제 Digol-2 작업 repo에서는 먼저:

```bash
git status
git diff
```

를 확인하고 필요하면 commit/stash한 뒤 사용합니다.

---

# 20. `Zone.Identifier`

Windows에서 내려받은 파일을 WSL로 복사하면:

```text
foo.png:Zone.Identifier
```

같은 metadata stream 파일이 나타날 수 있습니다.

공식 신규 Pokémon 가이드는 이 파일이 build를 방해할 수 있다고 경고합니다.

찾기:

```bash
find . -name '*:Zone.Identifier'
```

삭제:

```bash
find . -name '*:Zone.Identifier' -delete
```

---

# 21. 야생 form 때문에 Dex가 깨지거나 crash

공식 Troubleshooting의 대표 사례:

잘못:

```text
pokemon SPECIES_RATTATA_ALOLAN
```

올바른 legacy macro:

```text
monwithform SPECIES_RATTATA, 1
```

현재 C 원본에선 개념적으로:

```c
MON_WITH_FORM(SPECIES_RATTATA, 1)
```

을 사용합니다.

즉 form을 별도 species처럼 일반 encounter slot에 넣지 않습니다.

---

# 22. Trainer build의 `battletype2` 오류

구 trainer source를 최신판으로 들고 왔을 때 발생할 수 있는 migration 문제입니다.

공식 Troubleshooting은 과거 구조의:

- trainerclass 크기
- battletype/battletype2

정정이 있었다고 설명합니다.

최신판에서는 **`data/Trainers.c` + `include/trainer_data.h`**의 구조를 따르고 legacy trainer macro를 그대로 이식하지 않습니다.

---

# 23. Wiki와 코드가 다를 때

우선순위:

```text
1. Makefile/narcs.mk가 무엇을 실제 입력으로 빌드하는가
2. include의 현재 struct/constant
3. 실제 src 구현
4. 현재 repository의 documentation/wiki
5. live Wiki
6. 오래된 인터넷 글/Discord 예제
```

예:

- Wiki: `armips/data/encounters.s`
- 현재 Make: `data/Encounters.c`

이면 새 수정은 `data/Encounters.c`를 우선합니다.

---

# 24. generated 파일 구분

직접 수정하지 않을 대표 영역:

```text
build/
base/
include/constants/generated/
```

또한 generator가 매 build마다 덮는 raw text/NARC 산출물 역시 직접 원본으로 삼지 않습니다.

“수정했는데 build하니 사라졌다”면 생성 파일을 편집했을 가능성이 큽니다.

---

# 25. 원본 찾는 가장 확실한 법

어떤 NARC가 어디서 만들어지는지 모르겠다면:

```bash
rg "TARGET" narcs.mk
rg "data/FILENAME.c" Makefile narcs.mk
```

를 사용합니다.

예:

```text
data/Species.c -> speciesdatagen -> a/0/0/2
data/Moves.c -> movedatagen -> a/0/1/1
data/Evolutions.c -> a/0/3/4
data/Encounters.c -> a/0/3/7
```

---

# 26. 함수 구현 위치 찾기

특성/기술명을 constant로 검색:

```bash
rg "ABILITY_GOOD_AS_GOLD" .
rg "MOVE_FAKE_OUT" .
```

함수명을 검색:

```bash
rg "GetBattlerAbility" src include
```

기능 키워드보다 **constant 검색**이 대체로 정확합니다.

---

# 27. 버그가 데이터인지 코드인지 분리하는 법

### 1단계

기존 정상 Pokémon/특성에 같은 데이터 값을 넣어봅니다.

### 2단계

기존 공식 특성을 신규 종에 배치해봅니다.

### 3단계

신규 특성을 기존 Pokémon에 배치해봅니다.

이렇게 하면:

```text
종족 데이터 문제
특성 구현 문제
종족-특성 연결 문제
```

를 분리할 수 있습니다.

---

# 28. 신규 종 crash 디버깅 순서

1. `include/constants/species.h`의 species ID와 모든 데이터/그래픽 참조 일치
2. `MAX_*`/count 값
3. `Species.c` 엔트리 존재
4. 그래픽 슬롯 존재
5. icon palette
6. SpriteOffsets
7. form mapping 여부
8. learnset entry
9. evolution target 유효
10. Pokédex table index
11. follower mapping

가장 먼저 “마지막으로 정상 동작하는 species ID”와 비교합니다.

---

# 29. 데이터 검증기를 converter와 분리할 것

Digol-2 기존 converter는 단순 변환기 역할로 시작했습니다.

향후 최신화 시에도 권장 구조는:

```text
master data
   ↓
validator
   ↓
converter/generator
   ↓
hg-engine source
```

입니다.

검증 예:

- 없는 species constant
- 없는 move/item/ability
- BST 규칙 위반
- 진화 target 없음
- 진화 9개 초과
- 같은 ID 중복
- stat 0~255 초과
- EV yield 허용 범위
- 일반/히든 특성 누락
- learnset move 없음

converter가 변환과 검증을 모두 맡으면 오류 메시지와 유지보수가 복잡해질 수 있습니다.

---

# 30. upstream 업데이트 유지보수

hg-engine 업데이트 전:

1. Digol-2 변경 commit 완료
2. 현재 upstream commit 기록
3. ROM build/test 성공 상태 확인
4. 가능하면 battle tests 통과

업데이트:

```bash
git fetch upstream
git merge upstream/main
```

업데이트 후 먼저 diff할 파일은 `06_SOURCE_INDEX.md` 참고.

---

# 31. hg-engine 업데이트 후 최소 smoke test

- ROM boot
- save load/new game
- wild battle
- trainer battle
- species data
- evolution
- level-up move
- TM
- hidden ability
- custom ability 1~2개
- custom move 1~2개
- follower
- Pokédex

전체 콘텐츠를 플레이하기 전에 엔진 핵심이 살아있는지 먼저 확인합니다.

---

# 32. `ALLOW_SAVE_CHANGES` 변경은 버전업으로 취급

활성/비활성을 개발 도중 자주 바꾸지 않습니다.

이 옵션은 save layout과 PKHeX 호환성에 영향을 줄 수 있습니다.

바꿔야 한다면:

- 기존 save 폐기 가능성
- 이전 build save migration
- 배포 버전

을 별도 관리합니다.

---

# 33. config generation 변경도 회귀 대상

예:

```text
TYPE_EFFECTIVENESS_GEN
EXPERIENCE_FORMULA_GEN
PROTEAN_GENERATION
BATTLE_BOND_GENERATION
SNOW_WARNING_GENERATION
UNSEEN_FIST_GENERATION
```

을 바꾸면 특정 특성 하나가 아니라 게임 전체 규칙이 바뀝니다.

따라서 config 변경 commit에는 어떤 세대 규칙을 채택했는지 명시합니다.

---

# 34. 문제 보고 시 남겨야 할 정보

버그 기록 템플릿:

```text
hg-engine commit:
Digol-2 commit:
OS/빌드환경:
사용 명령:
clean 여부:
ROM 종류:
재현 절차:
기대 결과:
실제 결과:
관련 species/move/ability:
로그:
```

이 정보를 남기면 나중에 upstream bug인지 Digol-2 bug인지 판별하기 쉽습니다.

---

# 35. 공식 도움 채널

공식 Troubleshooting에서 자체 문서로 해결되지 않는 문제는 Kingdom of DS Hacking Discord의 hg feature expansion 관련 채널을 안내합니다.

외부에 질문하기 전에:

- 최신 hg-engine인지
- clean build인지
- vanilla latest에서도 재현되는지
- Digol-2 변경을 뺀 상태에서도 재현되는지

를 확인하는 것이 좋습니다.

---

# 36. Digol-2 완료 조건

향후 converter migration/엔진 통합 작업에서 한 단계가 완료되었다고 판단하려면 최소:

- [ ] 최신 hg-engine clean build 성공
- [ ] 신규 데이터 compile 성공
- [ ] 자동 test 관련 항목 통과
- [ ] 실게임 smoke test
- [ ] upstream source와 Digol custom 변경 분리
- [ ] 문서의 기준 commit 갱신

을 만족하도록 합니다.

---

# 37. 2026-10-01 업데이트 후 우선 점검

이번 구간에 배틀 테스트 C 파일 62개가 추가되고 8개가 수정됐습니다. runner/generator 스크립트 자체는 그대로지만 `src/test_battle.c`의 초기 PP가 고정 40에서 `GetMoveMaxPP(move, 0)`로 바뀌고 `MOVE_NONE`은 PP 0으로 설정됩니다. 기존 커스텀 테스트가 40 PP를 전제로 했다면 기대값을 수정해야 합니다.

| 영향 | 먼저 볼 기존 테스트 (`data/battle_tests/` 아래) |
|---|---|
| 황금몸/아군 지원 | `abilities/good_as_gold/block_targeted_status.c`, `moves/milk_drink/good_as_gold.c` |
| 접촉 피해 반감 | `abilities/aura_guard/contact_moves.c`, `abilities/aura_guard/mold_breaker.c` |
| 도구 비활성/Choice lock | `moves/magic_room/` |
| HP 지불 반동 | `moves/steel_beam/` |
| 회복 대기/PP | `moves/healing_wish/`, `moves/lunar_dance/trigger_on_pp.c` |
| 다중타격 | `moves/double_kick/one_pp.c`, `moves/bullet_seed/substitute.c` |
| 메가/추격/시작 폼 | `species/mega/`, `species/floette/mega.c`, `species/slowbro/mega.c`, `moves/pursuit/doubles_pursuit_queue_mega_after_pursuit.c` |
| 위협 반응 | `abilities/intimidate/` |
| 일격기/옹골참 | `moves/sheer_cold/failures.c`, `abilities/sturdy/focus_sash.c` |

테스트 파일이 추가됐다는 사실과 직접 실행해서 통과를 확인했다는 것은 다릅니다. 이번 문서 갱신은 소스/테스트 내용을 검토했고 upstream 최신 커밋의 `build` CI 성공을 확인했지만, 별도 US 원본 ROM으로 로컬 빌드·에뮬레이터 검증은 수행하지 않았습니다.

## 빌드 환경의 새 오류

- `cargo: command not found`: Rust/Cargo 설치 및 PATH 확인.
- `No module named yaml`: 기존 venv에 PyYAML 설치 또는 `make clean_tools` 후 재생성.
- `base_dsrom/config.yaml` 누락 등 도구 전환 문제: `make clean` 후 선택 도구로 일관되게 빌드.
- dump 실행에서 `tools/ndstool` 없음: 최신 upstream은 분기 오류를 수정했습니다. 현재 디골에는 이전 분기가 남아 있으므로 [01장](./01_SETUP_BUILD_CONFIG.md)의 버전별 절차를 확인합니다.
- Docker에서 새 기본 빌드 실패: 현재 Dockerfile의 Cargo 미설치 확인.
- 이벤트 JSON 편집이 반영되지 않음: `BUILD_DUMPED_EVENTDATA`와 `event_*.inc` 존재 확인.
- 필드 `.s` 편집이 반영되지 않음: 엔진 관리 스크립트인지/일반 덤프인지와 `BUILD_DUMPED_SCR_SEQ` 확인.

## 정적 확인만으로 단정하면 안 되는 것

상수·테스트·설명문이 있어도 모든 기능이 구현됐다고 결론내리지 않습니다. 예를 들어 이전 황금몸은 실제 블록이 주석 처리돼 있었고, 현 메가 지가르데 테이블은 주석 처리입니다. Obstruct 테스트의 파일명 `lower_attack.c`와 선두 주석은 오래된 표현이지만 실제 기대 메시지는 Defense 감소입니다. 검증할 때 실제 조건과 기대값을 읽습니다.



# 현재 디골 안정화 상태 (2026-10-22 확인)

사용자가 프리징·BGM 해결을 확인했습니다. `c75d6f7`의 `digol/docs/CHANGELOG.md`에는 10월 20일 원인 수정과 DeSmuME 검증이 기록되어 있습니다. 미해결 문제로 계속 취급하지 않습니다.

현재 빌드의 `digol/scripts/check_build.py veneers`는 Thumb→ARM veneer 발생을 검사하고, `layout`은 오버레이 129/130/131 메모리 범위를 검사합니다. 전투 코드·필드 코드는 각각 `digol/src/battle/`, `digol/src/field/`에 배치합니다. 상주 영역에 큰 표나 화면 전용 코드를 추가하기 전에 현재 빌드의 남은 용량을 확인합니다. 10월 20일 기록의 129 잔여 2,281 B는 그 빌드의 수치이며 이후 빌드 보장값이 아닙니다.

이번 가이드 작업에서는 해당 게임을 새로 빌드하거나 플레이하지 않았습니다. 저장소의 검증 기록과 사용자의 해결 확인을 근거로 상태를 정리했습니다. upstream 업데이트 시에는 이 안정화 변경과 `digol/` 빌드 훅이 유지되는지 비교합니다.
