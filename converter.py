import json
import os

def convert_json_to_hgengine():
    print("데이터를 읽는 중...")
    
    # data.json 읽기 (스크립트와 같은 위치에 있어야 함)
    try:
        with open('data.json', 'r', encoding='utf-8') as f:
            data = json.load(f)
    except FileNotFoundError:
        print("❌ 에러: 'data.json' 파일을 찾을 수 없습니다. 같은 폴더에 있는지 확인해주세요.")
        return

    # 결과물을 저장할 하위 폴더 생성 (없으면 자동으로 만듦)
    output_dir = 'converted_data'
    os.makedirs(output_dir, exist_ok=True)

    # 생성할 파일들의 경로 지정
    path_mon = os.path.join(output_dir, 'mondata.s')
    path_evo = os.path.join(output_dir, 'evodata.s')
    path_ha = os.path.join(output_dir, 'HiddenAbilityTable.c')
    path_exp = os.path.join(output_dir, 'BaseExperienceTable.c')

    # 4개의 파일을 동시에 쓰기 모드로 엽니다
    with open(path_mon, 'w', encoding='utf-8') as f_mon, \
         open(path_evo, 'w', encoding='utf-8') as f_evo, \
         open(path_ha, 'w', encoding='utf-8') as f_ha, \
         open(path_exp, 'w', encoding='utf-8') as f_exp:
        
        # HiddenAbilityTable.c 헤더 (상단 부분)
        f_ha.write("const u16 UNUSED HiddenAbilityTable[] =\n{\n")
        f_ha.write("    [SPECIES_NONE                       ] = ABILITY_NONE,\n")

        # BaseExperienceTable.c 헤더 (상단 부분)
        f_exp.write("#include \"../include/types.h\"\n")
        f_exp.write("#include \"../include/config.h\"\n")
        f_exp.write("#include \"../include/pokemon.h\"\n")
        f_exp.write("#include \"../include/constants/species.h\"\n\n")
        f_exp.write("const u16 UNUSED BaseExperienceTable[] =\n{\n")
        f_exp.write("    [SPECIES_NONE                       ] = 0,\n")

        # JSON 데이터를 순회하며 파일 작성
        for species, info in data.items():
            personal = info.get("personal_data", {})
            evolutions = info.get("evolutions", [])

            # SPECIES_KAMMON -> "Kammon" 으로 변환하여 이름 추출
            mon_name = species.replace("SPECIES_", "").title()

            # ==========================================
            # 1. mondata.s 생성 파트
            # ==========================================
            f_mon.write(f'mondata {species}, "{mon_name}"\n')
            
            stats = personal.get("base_stats", [0]*6)
            f_mon.write(f'    basestats {stats[0]}, {stats[1]}, {stats[2]}, {stats[3]}, {stats[4]}, {stats[5]}\n')
            
            types = personal.get("types", ["TYPE_NORMAL", "TYPE_NORMAL"])
            f_mon.write(f'    types {types[0]}, {types[1]}\n')
            
            f_mon.write(f'    catchrate {personal.get("catch_rate", 255)}\n')
            
            # 💡 hg-engine 규칙에 따라 baseexp는 0으로 고정하고 주석 처리
            f_mon.write(f'    baseexp 0 // defined in BaseExperienceTable.c\n')
            
            evs = personal.get("ev_yield", [0]*6)
            f_mon.write(f'    evyields {evs[0]}, {evs[1]}, {evs[2]}, {evs[3]}, {evs[4]}, {evs[5]}\n')
            
            items = personal.get("items", ["ITEM_NONE", "ITEM_NONE"])
            f_mon.write(f'    items {items[0]}, {items[1]}\n')
            
            f_mon.write(f'    genderratio {personal.get("gender_ratio", 255)}\n')
            f_mon.write(f'    eggcycles {personal.get("hatch_cycles", 1)}\n')
            f_mon.write(f'    basefriendship {personal.get("base_friendship", 70)}\n')
            f_mon.write(f'    growthrate {personal.get("exp_growth", "GROWTH_MEDIUM_FAST")}\n')
            
            eggs = personal.get("egg_groups", ["EGG_GROUP_UNDISCOVERED", "EGG_GROUP_UNDISCOVERED"])
            f_mon.write(f'    egggroups {eggs[0]}, {eggs[1]}\n')
            
            abilities = personal.get("abilities", ["ABILITY_NONE", "ABILITY_NONE", "ABILITY_NONE"])
            f_mon.write(f'    abilities {abilities[0]}, {abilities[1]}\n')
            
            f_mon.write(f'    runchance {personal.get("flee_rate", 0)}\n')
            
            colorflip = personal.get("colorflip", "BODY_COLOR_BLACK, 0")
            f_mon.write(f'    colorflip {colorflip}\n')
            
            dex_entry = personal.get("dex_entry", "Placeholder entry.\\nUpdate via DSPRE or JSON.")
            f_mon.write(f'    mondexentry {species}, "{dex_entry}"\n')
            
            dex_class = personal.get("dex_class", "Unknown Pokémon")
            f_mon.write(f'    mondexclassification {species}, "{dex_class}"\n')
            
            height = personal.get("height", "1’00”")
            f_mon.write(f'    mondexheight {species}, "{height}"\n')
            
            weight = personal.get("weight", "1.0 lbs.")
            f_mon.write(f'    mondexweight {species}, "{weight}"\n\n')

            # ==========================================
            # 2. evodata.s 생성 파트
            # ==========================================
            f_evo.write(f"evodata {species}\n")
            
            for i in range(9):
                if i < len(evolutions):
                    evo = evolutions[i]
                    f_evo.write(f'    evolution {evo["method"]}, {evo["condition"]}, {evo["target"]}\n')
                else:
                    f_evo.write('    evolution EVO_NONE, 0, SPECIES_NONE\n')
            
            f_evo.write("    terminateevodata\n\n")

            # ==========================================
            # 3. HiddenAbilityTable.c 생성 파트
            # ==========================================
            hidden_ability = abilities[2] if len(abilities) > 2 else "ABILITY_NONE"
            f_ha.write(f"    [{species:<35}] = {hidden_ability},\n")

            # ==========================================
            # 4. BaseExperienceTable.c 생성 파트 (새로 추가됨)
            # ==========================================
            base_exp = personal.get("base_exp", 0)
            f_exp.write(f"    [{species:<35}] = {base_exp},\n")

        # C 언어 배열 닫기
        f_ha.write("};\n")
        f_exp.write("};\n")

    print(f"✅ 성공! 모든 결과물이 '{output_dir}' 폴더 안에 생성되었습니다.")

if __name__ == "__main__":
    convert_json_to_hgengine()