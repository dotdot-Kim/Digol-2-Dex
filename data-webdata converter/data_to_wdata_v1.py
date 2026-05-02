import tkinter as tk
from tkinter import ttk
import re
import json
import os

# DB 파일명 설정 (같은 폴더에 있어야 합니다)
DB_FILENAME = "digimon_ko_db.json"

def load_db():
    """DB 파일을 읽어와서 딕셔너리로 반환합니다."""
    if os.path.exists(DB_FILENAME):
        try:
            with open(DB_FILENAME, 'r', encoding='utf-8') as f:
                return json.load(f)
        except Exception as e:
            print(f"DB 로드 에러: {e}")
            return {}
    return {}

def convert_code():
    input_text = text_input.get("1.0", tk.END).strip()
    selected_gen = combo_gen.get()
    
    # 세대에 따른 폴더명 매핑
    gen_map = {
        "성장기": "2_Child",
        "성숙기": "3_Adult",
        "완전체": "4_Perfect",
        "궁극체": "5_Ultimate"
    }
    
    folder_name = gen_map.get(selected_gen, "Unknown")
    
    # 변환 버튼을 누를 때마다 최신 DB를 읽어옵니다.
    ko_name_db = load_db()
    
    # 정규식을 사용하여 입력된 텍스트에서 "SPECIES_..." 형태의 키값만 추출
    species_keys = re.findall(r'"(SPECIES_[A-Za-z0-9_]+)"\s*:', input_text)
    
    # 중복 키 제거 (순서 유지)
    unique_keys = []
    for k in species_keys:
        if k not in unique_keys:
            unique_keys.append(k)
            
    output_dict = {}
    for key in unique_keys:
        # SPECIES_ 제거 및 소문자 변환
        base_name = key.replace("SPECIES_", "")
        lower_name = base_name.lower()
        
        # DB에서 한글 이름 찾기 (없으면 "없음" 출력)
        name_ko = ko_name_db.get(base_name, "없음")
        
        output_dict[key] = {
            "name_ko": name_ko,
            "image": f"images/{folder_name}/{lower_name}.jpg",
            "generation": selected_gen
        }
        
    if not output_dict:
        text_output.delete("1.0", tk.END)
        text_output.insert(tk.END, "오류: 입력된 텍스트에서 'SPECIES_...' 형태를 찾을 수 없습니다.")
        return

    # JSON 형태로 변환 (한글 깨짐 방지)
    result_json = json.dumps(output_dict, indent=2, ensure_ascii=False)
    
    # 겉을 감싸는 최상단 중괄호 {} 제거
    formatted_result = result_json.strip()[1:-1].strip()
    
    # 결과 출력창에 반영
    text_output.delete("1.0", tk.END)
    text_output.insert(tk.END, formatted_result + ",\n")

# GUI 창 생성
root = tk.Tk()
root.title("디지몬 코드 변환기 (DB 연동형)")
root.geometry("600x600")

# 1. 원본 코드 입력창
label_input = tk.Label(root, text="1번 코드 입력 (복사 후 붙여넣기):", font=("Arial", 10, "bold"))
label_input.pack(pady=(10, 0), anchor="w", padx=10)

text_input = tk.Text(root, height=12)
text_input.pack(fill="x", padx=10, pady=5)

# 2. 세대 선택 메뉴
frame_options = tk.Frame(root)
frame_options.pack(fill="x", padx=10, pady=5)

label_gen = tk.Label(frame_options, text="세대 선택:", font=("Arial", 10, "bold"))
label_gen.pack(side="left")

combo_gen = ttk.Combobox(frame_options, values=["성장기", "성숙기", "완전체", "궁극체"], state="readonly")
combo_gen.set("성장기")
combo_gen.pack(side="left", padx=10)

# 3. 변환 버튼
btn_convert = tk.Button(frame_options, text="2번 코드로 변환하기", command=convert_code, bg="#4CAF50", fg="white", font=("Arial", 10, "bold"))
btn_convert.pack(side="right")

# 4. 결과 출력창
label_output = tk.Label(root, text="변환된 코드 (복사해서 사용하세요):", font=("Arial", 10, "bold"))
label_output.pack(pady=(10, 0), anchor="w", padx=10)

text_output = tk.Text(root, height=15)
text_output.pack(fill="both", expand=True, padx=10, pady=5)

# 프로그램 실행
root.mainloop()