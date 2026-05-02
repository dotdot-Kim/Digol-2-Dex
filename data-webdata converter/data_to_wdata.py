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
    """1번 코드를 2번 코드(게임 데이터 형식)로 변환합니다."""
    input_text = text_input.get("1.0", tk.END).strip()
    selected_gen = combo_gen.get()
    
    gen_map = {
        "성장기": "2_Child",
        "성숙기": "3_Adult",
        "완전체": "4_Perfect",
        "궁극체": "5_Ultimate"
    }
    
    folder_name = gen_map.get(selected_gen, "Unknown")
    ko_name_db = load_db()
    
    species_keys = re.findall(r'"(SPECIES_[A-Za-z0-9_]+)"\s*:', input_text)
    
    unique_keys = []
    for k in species_keys:
        if k not in unique_keys:
            unique_keys.append(k)
            
    output_dict = {}
    for key in unique_keys:
        base_name = key.replace("SPECIES_", "")
        lower_name = base_name.lower()
        
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

    result_json = json.dumps(output_dict, indent=2, ensure_ascii=False)
    formatted_result = result_json.strip()[1:-1].strip()
    
    text_output.delete("1.0", tk.END)
    text_output.insert(tk.END, formatted_result + ",\n")

def extract_to_db_format():
    """1번 코드를 읽어 DB 파일에 추가하기 좋은 형태로 추출합니다."""
    input_text = text_input.get("1.0", tk.END).strip()
    
    # SPECIES_ 키값 추출
    species_keys = re.findall(r'"(SPECIES_[A-Za-z0-9_]+)"\s*:', input_text)
    
    unique_keys = []
    for k in species_keys:
        if k not in unique_keys:
            unique_keys.append(k)
            
    db_dict = {}
    for key in unique_keys:
        # SPECIES_ 제거 후 딕셔너리 키로 사용, 값은 "한글이름"으로 고정
        base_name = key.replace("SPECIES_", "")
        db_dict[base_name] = "한글이름"
        
    if not db_dict:
        text_output.delete("1.0", tk.END)
        text_output.insert(tk.END, "오류: 입력된 텍스트에서 'SPECIES_...' 형태를 찾을 수 없습니다.")
        return

    # JSON 형태로 예쁘게 출력
    result_json = json.dumps(db_dict, indent=2, ensure_ascii=False)
    
    text_output.delete("1.0", tk.END)
    text_output.insert(tk.END, result_json + "\n")

# GUI 창 생성
root = tk.Tk()
root.title("디지몬 코드 변환기 & DB 추출기")
root.geometry("600x650") # 버튼이 늘어나서 창 세로 길이를 조금 늘렸습니다.

# 1. 원본 코드 입력창
label_input = tk.Label(root, text="1번 코드 입력 (복사 후 붙여넣기):", font=("Arial", 10, "bold"))
label_input.pack(pady=(10, 0), anchor="w", padx=10)

text_input = tk.Text(root, height=12)
text_input.pack(fill="x", padx=10, pady=5)

# 2. 옵션 및 버튼 프레임
frame_options = tk.Frame(root)
frame_options.pack(fill="x", padx=10, pady=5)

# 2-1. 세대 선택 (왼쪽)
label_gen = tk.Label(frame_options, text="세대 선택:", font=("Arial", 10, "bold"))
label_gen.pack(side="left")

combo_gen = ttk.Combobox(frame_options, values=["성장기", "성숙기", "완전체", "궁극체"], state="readonly", width=10)
combo_gen.set("성장기")
combo_gen.pack(side="left", padx=10)

# 2-2. 버튼들 (오른쪽)
btn_convert = tk.Button(frame_options, text="2번 코드로 변환", command=convert_code, bg="#4CAF50", fg="white", font=("Arial", 10, "bold"))
btn_convert.pack(side="right", padx=(5, 0))

btn_extract_db = tk.Button(frame_options, text="DB 형식으로 추출", command=extract_to_db_format, bg="#2196F3", fg="white", font=("Arial", 10, "bold"))
btn_extract_db.pack(side="right")

# 3. 결과 출력창
label_output = tk.Label(root, text="결과창 (복사해서 사용하세요):", font=("Arial", 10, "bold"))
label_output.pack(pady=(10, 0), anchor="w", padx=10)

text_output = tk.Text(root, height=15)
text_output.pack(fill="both", expand=True, padx=10, pady=5)

# 프로그램 실행
root.mainloop()