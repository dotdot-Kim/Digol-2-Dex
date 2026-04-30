import json
import os
import tkinter as tk
from tkinter import filedialog, messagebox, scrolledtext

def select_file():
    # 파일 탐색기 열기
    file_path = filedialog.askopenfilename(
        title="data.json 파일을 선택하세요",
        filetypes=[("JSON 파일", "*.json"), ("모든 파일", "*.*")]
    )
    if file_path:
        entry_filepath.delete(0, tk.END)
        entry_filepath.insert(0, file_path)
        log(f"파일 선택됨: {file_path}")

def log(message):
    # 로그 창에 메시지 출력
    text_log.config(state='normal')
    text_log.insert(tk.END, message + "\n")
    text_log.see(tk.END) # 스크롤을 맨 아래로
    text_log.config(state='disabled')

def convert_data():
    json_path = entry_filepath.get()
    
    if not json_path or not os.path.exists(json_path):
        messagebox.showerror("오류", "올바른 JSON 파일을 선택해주세요!")
        return

    log("====================================")
    log("데이터 변환을 시작합니다...")

    try:
        with open(json_path, 'r', encoding='utf-8') as f:
            data = json.load(f)
    except Exception as e:
        log(f"❌ 파일 읽기 실패: {e}")
        return

    # 선택한 JSON 파일이 있는 폴더 안에 'converted_data' 폴더 생성
    base_dir = os.path.dirname(json_path)
    output_dir = os.path.join(base_dir, 'converted_data')
    os.makedirs(output_dir, exist_ok=True)

    path_mon = os.path.join(output_dir, 'mondata.s')
    path_evo = os.path.join(output_dir, 'evodata.s')
    path_ha = os.path.join(output_dir, 'HiddenAbilityTable.c')
    path_exp = os.path.join(output_dir, 'BaseExperienceTable.c')

    try:
        with open(path_mon, 'w', encoding='utf-8') as f_mon, \
             open(path_evo, 'w', encoding='utf-8') as f_evo, \
             open(path_ha, 'w', encoding='utf-8') as f_ha, \
             open(path_exp, 'w', encoding='utf-8') as f_exp:
            
            # 헤더 작성
            f_ha.write("const u16 UNUSED HiddenAbilityTable[] =\n{\n")
            f_ha.write("    [SPECIES_NONE                       ] = ABILITY_NONE,\n")

            f_exp.write("#include \"../include/types.h\"\n")
            f_exp.write("#include \"../include/config.h\"\n")
            f_exp.write("#include \"../include/pokemon.h\"\n")
            f_exp.write("#include \"../include/constants/species.h\"\n\n")
            f_exp.write("const u16 UNUSED BaseExperienceTable[] =\n{\n")
            f_exp.write("    [SPECIES_NONE                       ] = 0,\n")

            # 몬스터 데이터 순회
            for species, info in data.items():
                personal = info.get("personal_data", {})
                evolutions = info.get("evolutions", [])
                mon_name = species.replace("SPECIES_", "").title()

                # 1. mondata.s
                f_mon.write(f'mondata {species}, "{mon_name}"\n')
                stats = personal.get("base_stats", [0]*6)
                f_mon.write(f'    basestats {stats[0]}, {stats[1]}, {stats[2]}, {stats[3]}, {stats[4]}, {stats[5]}\n')
                types = personal.get("types", ["TYPE_NORMAL", "TYPE_NORMAL"])
                f_mon.write(f'    types {types[0]}, {types[1]}\n')
                f_mon.write(f'    catchrate {personal.get("catch_rate", 255)}\n')
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

                # 2. evodata.s
                f_evo.write(f"evodata {species}\n")
                for i in range(9):
                    if i < len(evolutions):
                        evo = evolutions[i]
                        f_evo.write(f'    evolution {evo["method"]}, {evo["condition"]}, {evo["target"]}\n')
                    else:
                        f_evo.write('    evolution EVO_NONE, 0, SPECIES_NONE\n')
                f_evo.write("    terminateevodata\n\n")

                # 3. HiddenAbilityTable.c
                hidden_ability = abilities[2] if len(abilities) > 2 else "ABILITY_NONE"
                f_ha.write(f"    [{species:<35}] = {hidden_ability},\n")

                # 4. BaseExperienceTable.c
                base_exp = personal.get("base_exp", 0)
                f_exp.write(f"    [{species:<35}] = {base_exp},\n")

            f_ha.write("};\n")
            f_exp.write("};\n")

        log(f"✅ 성공! 모든 결과물이 '{output_dir}'에 저장되었습니다.")
        messagebox.showinfo("완료", "변환이 성공적으로 완료되었습니다!")

    except Exception as e:
        log(f"❌ 변환 중 오류 발생: {e}")
        messagebox.showerror("오류", f"오류가 발생했습니다:\n{e}")

# ==========================================
# GUI 윈도우 설정 파트
# ==========================================
root = tk.Tk()
root.title("디골-2 엔진 데이터 변환기")
root.geometry("500x350")
root.configure(padx=20, pady=20)

# 폰트 설정
font_main = ("Malgun Gothic", 10)
font_title = ("Malgun Gothic", 14, "bold")

# 상단 제목
lbl_title = tk.Label(root, text="📂 JSON -> hg-engine 변환기", font=font_title)
lbl_title.pack(pady=(0, 15))

# 파일 선택 영역 (가로로 배치)
frame_top = tk.Frame(root)
frame_top.pack(fill='x', pady=5)

entry_filepath = tk.Entry(frame_top, font=font_main, width=40)
entry_filepath.pack(side='left', fill='x', expand=True, padx=(0, 10))

btn_browse = tk.Button(frame_top, text="파일 찾기", font=font_main, command=select_file)
btn_browse.pack(side='right')

# 실행 버튼
btn_run = tk.Button(root, text="🚀 변환 실행", font=font_title, bg="#1e293b", fg="white", cursor="hand2", command=convert_data)
btn_run.pack(fill='x', pady=15, ipady=5)

# 로그 출력 영역
lbl_log = tk.Label(root, text="진행 상황 (Log):", font=font_main)
lbl_log.pack(anchor='w')

text_log = scrolledtext.ScrolledText(root, font=("Consolas", 9), height=8, state='disabled', bg="#f8fafc")
text_log.pack(fill='both', expand=True)

# 시작 시 기본 텍스트
log("프로그램을 시작했습니다. data.json 파일을 선택해주세요.")

# GUI 실행
root.mainloop()