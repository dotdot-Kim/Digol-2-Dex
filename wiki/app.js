const sections = {dex:'디지몬 도감', pokemon:'포켓몬 도감', moves:'기술 도감', abilities:'특성 도감', items:'아이템 도감', guides:'공략 정보', notes:'패치노트', patch:'롬 패치'};
const main = document.querySelector('#main');
const menu = document.querySelector('#menu');
const nav = document.querySelector('#nav');
const filtersByPage = Object.fromEntries(['dex','pokemon'].map(page => [page,{query:'', stage:'', type:'', scroll:0}]));
const dictionary = wiki.dictionary;
const canonicalItemId = id => id === 'ITEM_MODE_SELCETOR' ? 'ITEM_MODE_SELECTOR' : id;
// Use the refreshed ROM tables and editor overrides in preference to the base snapshot.
Object.assign(game.learnsets,learnsetRefresh.sets);
Object.assign(game.moves,learnsetRefresh.moves);
Object.assign(game.items,itemRefresh.items);
// Use the verified effects where in-game text still describes an older mechanic.
Object.assign(dictionary.abilities,speciesRefresh.text.abilities);
Object.assign(abilityEntries,speciesRefresh.text.abilityEntries);
for (const [id,name] of Object.entries(speciesRefresh.text.items)) dictionary.items[id] ??= name;
Object.assign(itemDetailText.descriptions,speciesRefresh.text.itemNotes);
Object.assign(wikiIcons,speciesRefresh.icons || {});
for (const [id,description] of Object.entries(speciesRefresh.text.moves)) {
  if (game.moves[id]) game.moves[id].description = description;
  if (learnsetRefresh.moves[id]) learnsetRefresh.moves[id].description = description;
  moveCatalogData.descriptions[id] = description;
}
Object.assign(game,{
  machines:learnsetRefresh.machines,
  tutors:learnsetRefresh.tutors,
  places:wildRefresh.places,
  habitats:wildRefresh.habitats
});
if (learnsetRefresh.moveKeys) game.moveKeys = learnsetRefresh.moveKeys;
Object.assign(encounterChances,wildRefresh.chances);
for (const id of Object.keys(encounterChances)) {
  if (!Object.hasOwn(wildRefresh.chances,id)) delete encounterChances[id];
}
Object.assign(itemAcquisition,acquisitionRefresh);
for (const [id,items] of Object.entries(itemRefresh.held)) {
  game.all[id].personal_data.items = items;
}
for (const [id,{entry,base,personal_data}] of Object.entries(pokemonFormData.extra)) {
  pokemonData[id] = entry;
  game.all[id] = {personal_data,evolutions:[]};
  if (base && game.learnsets[base]) game.learnsets[id] = game.learnsets[base];
}
for (const [id,evolutions] of Object.entries(pokemonFormData.overrides)) {
  game.all[id].evolutions = evolutions;
}
// Apply the refreshed stats, types, abilities, held items, and evolutions.
for (const [id,{entry,base,personal_data}] of Object.entries(speciesRefresh.extra)) {
  pokemonData[id] = entry;
  game.all[id] = {personal_data,evolutions:[]};
  if (!game.learnsets[id] && base && game.learnsets[base]) game.learnsets[id] = game.learnsets[base];
}
for (const [id,{evolutions,...fields}] of Object.entries(speciesRefresh.species)) {
  if (!game.all[id]) continue;
  Object.assign(game.all[id].personal_data,fields);
  if (evolutions) game.all[id].evolutions = evolutions;
}
pokemonData.SPECIES_MEGA_TYPHLOSION = ['other','스컬블레이몬',157];
// Values approved in the release tool's ROM review (wiki/romDiffOverrides.js) win over every
// data file above. Fields are "name" or "name.index" for array values such as base_stats.1.
if (typeof romDiffOverrides !== 'undefined') {
  const setField = (target,field,value) => {
    const [name,index] = field.split('.');
    if (index === undefined) target[name] = value;
    else (target[name] ??= [])[Number(index)] = value;
  };
  // Learnsets and evolutions use MOVE_/SPECIES_ names; learnsets are stored as moveKeys indexes.
  const learnSlots = ['learnset.level','learnset.machine','learnset.tutor','learnset.egg'];
  const moveIndex = new Map(game.moveKeys.map((key,index) => [key,index]));
  for (const [id,fields] of Object.entries(romDiffOverrides.species || {})) {
    const personal = game.all[id]?.personal_data;
    for (const [field,value] of Object.entries(fields)) {
      const slot = learnSlots.indexOf(field);
      if (field === 'evolutions') {
        if (game.all[id]) game.all[id].evolutions = value.map(evo => ({...evo}));
      } else if (slot >= 0) {
        const sets = (game.learnsets[id] || [[],[],[],[]]).map(list => list.slice());
        sets[slot] = slot === 0
          ? value.filter(([,move]) => moveIndex.has(move)).map(([level,move]) => [level,moveIndex.get(move)])
          : value.filter(move => moveIndex.has(move)).map(move => moveIndex.get(move));
        game.learnsets[id] = sets;
      } else if (personal) setField(personal,field,value);
    }
  }
  for (const [id,fields] of Object.entries(romDiffOverrides.moves || {})) {
    if (!game.moves[id]) continue;
    for (const [field,value] of Object.entries(fields)) {
      setField(game.moves[id],field,value);
      if (learnsetRefresh.moves[id] && learnsetRefresh.moves[id] !== game.moves[id]) setField(learnsetRefresh.moves[id],field,value);
      if (field === 'description') moveCatalogData.descriptions[id] = value;
      if (field === 'name') dictionary.moves[id] = value;
    }
  }
  for (const [id,fields] of Object.entries(romDiffOverrides.items || {})) {
    for (const [field,value] of Object.entries(fields)) {
      if (field === 'name') dictionary.items[id] = value;
      else if (field === 'description') itemDetailText.descriptions[id] = value;
      else if (game.items[id]) setField(game.items[id],field,value);
    }
  }
  for (const [id,fields] of Object.entries(romDiffOverrides.abilities || {})) {
    if (fields.name !== undefined) dictionary.abilities[id] = fields.name;
    if (fields.description !== undefined) abilityEntries[id] = fields.description;
  }
}
Object.assign(wiki.species,game.all);
const digimonIds = new Set(game.digimonIds);
const machinesByMove = new Map(game.machines.map(entry => [entry.move,entry]));
const machinesByItem = new Map(game.machines.map(entry => [entry.item,entry]));
const speciesLink = id => href(digimonIds.has(id) ? 'dex' : 'pokemon',id);
const species = Object.entries(wiki.species).filter(([id]) => digimonIds.has(id) && wiki.display[id]?.name_ko);
const hiddenCards = new Set(['SPECIES_MONZAEMON_BUSTED','SPECIES_DIGITAMAMON_ZEN_MODE']);
const stages = [...new Set(species.map(([id]) => wiki.display[id].generation))];
stages.sort((a,b) => Number(a === '아머체') - Number(b === '아머체'));
const stageColors = {
      "유아기 I": "#e48e00", "유년기 I": "#e48e00", "유년기 II": "#971e9b",
      "성장기": "#e34ba4", "성숙기": "#415ab5", "완전체": "#bc4d21",
      "궁극체": "#7baa17", "아머체": "#008bd4", "하이브리드체": "#009140"
    };
const pokemonGenerations = {
  1:['관동','#ae394c','#1eaa2d'], 2:['성도','#98690a','#929baa'],
  3:['호연','#a04459','#264d9a'], 4:['신오','#3e659a','#c17d99'],
  5:['하나','#3d3e49','#a4a8b3'], 6:['칼로스','#17689e','#b83347'],
  7:['알로라','#f19c02','#1d8cc5'], 8:['가라르','#127a98','#b02469'],
  hisui:['히스이','#335951','#a28752'], 9:['팔데아','#b74726','#714aa0'],
  mega:['메가진화','#448cd3','#448cd3'], gmax:['거다이맥스','#bf2f7b','#bf2f7b'], other:['기타','#6b7280','#9ca3af']
};
const pokemonGroups = ['1','2','3','4','5','6','7','8','hisui','9','mega','gmax'];
const pokemonBases = new Map();
const pokemonCardByForm = new Map();
const pokemonCardSignatures = new Map();
const pokemonEntries = [];
const pokemonForms = {
  ALOLAN:'알로라의 모습', ALOLAN_LARGE:'알로라의 모습', GALARIAN:'가라르의 모습',
  HISUIAN:'히스이의 모습', PALDEAN:'팔데아의 모습', FEMALE:'암컷', LOW_KEY:'로우한 모습',
  RAPID_STRIKE:'연격의 태세', ORIGIN:'오리진폼', SKY:'스카이폼',
  ATTACK:'어택폼', DEFENSE:'디펜스폼', SPEED:'스피드폼', SANDY:'모래땅도롱', TRASH:'슈레도롱',
  HEAT:'히트로토무', WASH:'워시로토무', FROST:'프로스트로토무', FAN:'스핀로토무', MOW:'커트로토무',
  ZEN_MODE_GALARIAN:'가라르 달마모드', DROOPY:'늘어진 모습', STRETCHY:'뻗은 모습',
  ORIGINAL:'오리지널컬러', PARTNER:'파트너', PARTNER_CAP:'파트너캡', SPIKY_EAR:'삐쭉귀',
};
for (const [id,[group,,number]] of Object.entries(pokemonData)) {
  if (!['mega','gmax','other'].includes(group) && !pokemonBases.has(number)) pokemonBases.set(number,id);
}
const pokemonCardPriority = id => {
  const [group,,number] = pokemonData[id];
  if (pokemonBases.get(number) === id) return 0;
  return ['mega','gmax'].includes(group) ? 2 : 1;
};
const pokemonIds = Object.keys(pokemonData).sort((a,b) => pokemonCardPriority(a) - pokemonCardPriority(b));
for (const id of pokemonIds) {
  const [group,,number] = pokemonData[id];
  const data = game.all[id];
  const {types,base_stats} = data.personal_data;
  const signature = group === 'other' ? id : JSON.stringify([number,[...new Set(types)].sort(),base_stats]);
  const representative = pokemonCardSignatures.get(signature);
  if (representative) {
    pokemonCardByForm.set(id,representative);
    continue;
  }
  pokemonCardSignatures.set(signature,id);
  pokemonEntries.push([id,data]);
}
function pokemonNameParts(id) {
  const [group,name,number] = pokemonData[id];
  const parenthesized = /^(.+?)\s*\(([^()]+)\)$/.exec(name);
  if (parenthesized) return parenthesized.slice(1);
  const base = pokemonBases.get(number);
  const prefix = group === 'mega' ? 'SPECIES_MEGA_' : group === 'gmax' ? 'SPECIES_GIGANTAMAX_' : 'SPECIES_';
  const stem = prefix + base?.slice(8);
  const suffix = id.startsWith(stem + '_') ? id.slice(stem.length + 1) : '';
  const type = wiki.typeDic['TYPE_' + suffix];
  const sweet = suffix.endsWith('_SWEET') ? dictionary.items['ITEM_' + suffix] : '';
  const baseForm = {SPECIES_URSHIFU:'일격의 태세',SPECIES_GIGANTAMAX_URSHIFU:'일격의 태세',SPECIES_TOXTRICITY:'하이한 모습'}[id];
  const form = baseForm || pokemonFormData.extra[id]?.form || pokemonForms[suffix] || sweet || (type && type + '타입')
    || (group === 'gmax' ? '거다이맥스' : '');
  return [name,form];
}
const formLabel = form => form ? '<span class="pokemon-form">' + esc(form) + '</span>' : '';
const pokemonCardOrder = id => id === 'SPECIES_PIKACHU_PARTNER_CAP' ? 1 : 0;
pokemonEntries.sort(([a],[b]) => pokemonData[a][2] - pokemonData[b][2] || pokemonCardOrder(a) - pokemonCardOrder(b));
const pokemonLabel = group => {
  const [region] = pokemonGenerations[group];
  if (['mega','gmax','other'].includes(group)) return region;
  return (group === 'hisui' ? '8' : group) + '세대│' + region;
};
const pokemonOutline = color => 'color-mix(in srgb,' + color + ' 40%,white)';
function pokemonBadge(group) {
  const [region,ink,line] = pokemonGenerations[group];
  return '<span class="gen-badge" style="border-color:' + pokemonOutline(line) + ';color:' + ink + '">' + region + '</span>';
}
// Form changes share the evolution navigation while retaining their own section title.
const formChanges = new Map();
for (const [base,target,text] of speciesRefresh.formChanges || []) {
  if (!formChanges.has(base)) formChanges.set(base,[]);
  formChanges.get(base).push({method:'EVO_TEXT',condition:text,target});
}
for (const [base,target,items] of pokemonFormData.changes) {
  const source = game.all[base];
  source.evolutions = source.evolutions.filter(evo => evo.target !== target);
  if (!formChanges.has(base)) formChanges.set(base,[]);
  formChanges.get(base).push({method:'EVO_STONE',condition:items,target});
}
// Engine evolutions into another form of the same species (e.g. 파트너 피카츄) are shown as form changes.
for (const [id,data] of Object.entries(game.all)) {
  const number = pokemonData[id]?.[2];
  if (number == null || digimonIds.has(id)) continue;
  data.evolutions = data.evolutions.filter(evo => {
    const target = pokemonData[evo.target];
    if (!target || target[2] !== number || target[0] === 'other') return true;
    if (!formChanges.has(id)) formChanges.set(id,[]);
    if (!formChanges.get(id).some(edge => edge.target === evo.target)) formChanges.get(id).push(evo);
    return false;
  });
}
const incoming = new Map();
const incomingForms = new Map();
for (const [id,edges] of formChanges) {
  for (const edge of edges) {
    if (!incomingForms.has(edge.target)) incomingForms.set(edge.target,[]);
    incomingForms.get(edge.target).push({...edge,target:id});
  }
}
for (const [id, data] of Object.entries(game.all)) {
  for (const evo of data.evolutions) {
    if (!incoming.has(evo.target)) incoming.set(evo.target, []);
    incoming.get(evo.target).push({...evo, target:id});
  }
}
const esc = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'})[c]);
function label(group,id) {
  const value = dictionary[group]?.[id];
  const tm = group === 'moves' ? machinesByMove.get(id) : group === 'items' ? machinesByItem.get(id) : undefined;
  if (group === 'moves' && /[가-힣]/.test(game.moves[id]?.name || '')) return game.moves[id].name;
  if (tm?.name_ko) return group === 'items' ? 'TM' + tm.number + ' ' + tm.name_ko : tm.name_ko;
  return typeof value === 'string' ? value : value?.name || game[group]?.[id]?.name || String(id).replace(/^(?:SPECIES|ABILITY|MOVE|ITEM|POCKET|HOLD_EFFECT)_/,'').replaceAll('_',' ');
}
const href = (page,id) => '#' + page + (id ? '/' + encodeURIComponent(id) : '');
const title = (page,id) => pokemonData[id]?.[1] || wiki.display[id]?.name_ko || game.names[id] || label(page,id);
const back = page => '<a class="back" href="' + href(page) + '">‹ ' + sections[page] + ' 목록</a>';
const match = (value,query) => String(value).toLowerCase().replace(/\s/g,'').includes(query.toLowerCase().replace(/\s/g,''));
const types = data => [...new Set(data.personal_data.types.map(type => wiki.typeDic[type] || type))];
const badges = (data, badgeClass = 'badge') => '<div class="badges">' + types(data).map(type => '<span class="' + badgeClass + '" style="background:' + (wiki.typeColorDic[type] || '#b7c5d0') + '">' + esc(type) + '</span>').join('') + '</div>';
const stageLabel = stage => stage.replace(/^(유아기|유년기)\s+(?:I|II|Ⅰ|Ⅱ)$/, '$1');
const stageColor = stage => stageColors[stage] || '#64748b';
function stageBadge(stage) {
  const color = stageColor(stage);
  return '<span class="gen-badge" style="border-color:' + color + ';color:' + color + '">' + esc(stageLabel(stage)) + '</span>';
}
const loadedArtwork = new Map();
const artworkObserver = new IntersectionObserver(entries => {
  for (const {target,isIntersecting} of entries) {
    if (!isIntersecting) continue;
    artworkObserver.unobserve(target);
    const file = target.dataset.artwork;
    const pack = wikiArtwork[file];
    if (!loadedArtwork.has(pack)) {
      loadedArtwork.set(pack,fetch('wiki/' + pack).then(response => {
        if (!response.ok) throw Error('Artwork unavailable');
        return response.json();
      }).catch(error => {
        loadedArtwork.delete(pack);
        throw error;
      }));
    }
    loadedArtwork.get(pack).then(images => {
      if (images[file]) target.src = 'data:image/webp;base64,' + images[file];
    }).catch(() => { target.replaceWith(target.dataset.fallback); });
  }
});
new MutationObserver(records => {
  for (const record of records) {
    for (const node of record.removedNodes) {
      if (node.nodeType !== Node.ELEMENT_NODE) continue;
      if (node.matches('img[data-artwork]')) artworkObserver.unobserve(node);
      node.querySelectorAll('img[data-artwork]').forEach(image => artworkObserver.unobserve(image));
    }
    for (const node of record.addedNodes) {
      if (node.nodeType !== Node.ELEMENT_NODE) continue;
      if (node.matches('img[data-artwork]')) artworkObserver.observe(node);
      node.querySelectorAll('img[data-artwork]').forEach(image => artworkObserver.observe(image));
    }
  }
}).observe(main,{childList:true,subtree:true});
function art(info) {
  const file = info.image?.split('/').at(-1);
  const fallback = esc(info.name_ko.slice(0,2));
  const content = Object.hasOwn(wikiArtwork,file)
    ? '<img data-artwork="' + esc(file) + '" data-fallback="' + fallback + '" alt="" decoding="async">'
    : fallback;
  return '<span class="monster-image" aria-hidden="true">' + content + '</span>';
}
function gameIcon(id) {
  const icon = wikiIcons[id];
  return icon ? '<img class="game-icon" src="data:image/png;base64,' + icon + '" alt="" width="32" height="32" loading="lazy" decoding="async">' : '';
}
let visibleSpecies = [];
function search(labelText, value='') {
  return '<input id="query" type="search" aria-label="' + labelText + '" placeholder="' + labelText + '" value="' + esc(value) + '">';
}
function dex(openId, page) {
  const pokemon = page === 'pokemon';
  const filters = filtersByPage[page];
  const entries = pokemon ? pokemonEntries : species;
  const categories = pokemon ? [...pokemonGroups,'other'] : stages;
  const selectedCard = pokemonCardByForm.get(openId) || openId;
  const groupOf = id => pokemon ? pokemonData[id][0] : wiki.display[id].generation;
  const categoryLabel = pokemon ? pokemonLabel : stageLabel;
  const filterLabel = category => categoryLabel(category).replace('│',' │ ');
  if (openId && !(pokemon ? pokemonData[openId] : digimonIds.has(openId))) return missing(page);
  const options = (values,selected,display = value => value) => values.map(value => '<option value="' + esc(value) + '"' + (value === selected ? ' selected' : '') + '>' + esc(display(value)) + '</option>').join('');
  main.innerHTML = '<form class="dex-search' + (pokemon ? ' pokemon-search' : ' digimon-search') + '" id="dex-search" aria-label="도감 검색"><h1 class="dex-heading">' + sections[page] + ' <span id="count" aria-live="polite"></span></h1>'
    + '<label class="dex-query"><span>검색</span>' + search((pokemon ? '포켓몬' : '디지몬') + ' 이름 또는 키워드 입력', filters.query) + '</label>'
    + '<div class="dex-filter-row"><label><span>' + (pokemon ? '세대' : '단계') + '</span><select id="stage"><option value="">지정 없음</option>' + options(pokemon ? pokemonGroups : categories,filters.stage,filterLabel) + '</select></label>'
    + '<label><span>타입</span><select id="type"><option value="">지정 없음</option>' + options(Object.values(wiki.typeDic),filters.type) + '</select></label>'
    + '<div class="dex-search-actions"><button type="submit">검색</button><button id="reset" type="button">초기화</button></div></div></form>'
    + '<div id="dex-container"' + (pokemon ? ' class="pokemon-dex"' : '') + '></div>';
  const query = document.querySelector('#query');
  const stage = document.querySelector('#stage');
  const type = document.querySelector('#type');
  function update() {
    filters.query = query.value;
    filters.stage = stage.value;
    filters.type = type.value;
    const visible = entries.filter(([id,data]) => {
      const name = pokemon ? pokemonNameParts(id).join(' ') : title(page,id);
      if (pokemon && groupOf(id) === 'other' && (filters.query.trim() || filters.stage || filters.type)) return false;
      return !hiddenCards.has(id) && (match(name,filters.query) || match(id.replace(/^SPECIES_/, ''),filters.query)) && (!filters.stage || groupOf(id) === filters.stage) && (!filters.type || types(data).includes(filters.type));
    });
    document.querySelector('#count').textContent = visible.length + '종';
    const groups = new Map();
    for (const entry of visible) {
      const stageName = groupOf(entry[0]);
      if (!groups.has(stageName)) groups.set(stageName, []);
      groups.get(stageName).push(entry);
    }
    visibleSpecies = categories.flatMap(stageName => (groups.get(stageName) || []).map(([id]) => id));
    document.querySelector('#dex-container').innerHTML = categories.filter(stageName => groups.has(stageName)).map(stageName => {
      const cards = groups.get(stageName).map(([id,data]) => {
        const cardStart = '<a class="card" id="' + esc(id) + '" href="' + href(page,id) + '" aria-expanded="' + (id === selectedCard) + '"' + (id === selectedCard ? ' aria-controls="dex-detail"' : '') + '>';
        if (pokemon) {
          const [name,form] = pokemonNameParts(id);
          const megaVariant = stageName === 'mega' && / [XYZ]$/.test(name);
          return cardStart + gameIcon(id) + '<div class="card-title"><h2' + (megaVariant ? ' class="mega-variant-name"' : '') + '>' + esc(name) + '</h2>' + formLabel(form) + '</div>'
            + badges(data) + pokemonBadge(stageName) + '</a>';
        }
        const info = wiki.display[id];
        const [, name, colonMode, parenthesizedMode, stageSuffix] = info.name_ko.match(/^(.+?)(?::\s*(.+모드)|\s*\(([^()]+\bMODE)\)|\s*(\((?:아머체|성장기|성숙기)\)))$/i) || [null, info.name_ko];
        const omegaForm = /^오메가몬 (즈왈트|alter-s)$/i.exec(info.name_ko)?.[1];
        const mode = colonMode || parenthesizedMode || stageSuffix || omegaForm || '';
        return cardStart + art(info)
          + '<div class="card-title"><h2>' + esc(omegaForm ? '오메가몬' : name) + '</h2>' + (mode ? '<span class="card-mode">' + esc(mode) + '</span>' : '') + '</div>'
          + badges(data) + stageBadge(info.generation) + '</a>';
      }).join('');
      const [,ink,line] = pokemon ? pokemonGenerations[stageName] : ['',stageColor(stageName),stageColor(stageName)];
      const heading = esc(categoryLabel(stageName)).replace('│','<span class="generation-divider">│</span>');
      return '<section class="gen-section"><h2 class="gen-section-title" style="'
        + (pokemon ? '--generation-ink:' : 'color:') + ink + ';border-bottom-color:' + (pokemon ? pokemonOutline(line) : line) + '">' + heading
        + '</h2><div class="gen-cards">' + cards + '</div></section>';
    }).join('') || '<p class="dex-empty">검색 결과가 없습니다.</p>';
    if (openId) detail(openId,page);
  }
  document.querySelector('#dex-search').onsubmit = event => {
    event.preventDefault();
    update();
  };
  document.querySelector('#reset').onclick = () => { query.value = stage.value = type.value = ''; update(); };
  query.oninput = stage.onchange = type.onchange = update;
  update();
}
function condition(evo, source) {
  if (evo.method === 'EVO_TEXT') return esc(evo.condition).replace(/\{(ITEM_\w+)\}/g,(_,item) => itemLink(item));
  if (Array.isArray(evo.condition)) return evo.condition.map(item => condition({...evo,condition:item},source)).join(' / ');
  const value = canonicalItemId(evo.condition);
  const prefix = String(value).split('_',1)[0];
  const page = {MOVE:'moves',ITEM:'items',SPECIES:'dex'}[prefix];
  const megaStones = {ITEM_MEGA_STONE_X:'메가스톤 X',ITEM_MEGA_STONE_Y:'메가스톤 Y',ITEM_MEGA_STONE_Z:'메가스톤 Z'};
  const name = megaStones[value] || (page === 'items' ? itemName(value) : page ? title(page,value) : String(value ?? ''));
  const exists = page === 'dex' ? game.names[value] : game[page]?.[value] || dictionary[page]?.[value];
  const formatted = exists ? '<a href="' + (page === 'dex' ? speciesLink(value) : href(page,value)) + '">' + esc(name) + '</a>' : esc(name);
  const last = name.trim().slice(-1).charCodeAt(0);
  const batchim = last >= 0xac00 && last <= 0xd7a3 && (last - 0xac00) % 28 !== 0;
  const extraRules = {
    EVO_FRIENDSHIP:'친밀도가 높을 때 레벨업', EVO_LEVEL_MALE:'수컷이 레벨 {cond} 이상에서 레벨업',
    EVO_LEVEL_FEMALE:'암컷이 레벨 {cond} 이상에서 레벨업', EVO_LEVEL_DAY:'낮에 레벨 {cond} 이상에서 레벨업',
    EVO_LEVEL_NIGHT:'밤에 레벨 {cond} 이상에서 레벨업', EVO_LEVEL_DUSK:'황혼에 레벨 {cond} 이상에서 레벨업',
    EVO_LEVEL_RAIN:'비가 올 때 레벨 {cond} 이상에서 레벨업', EVO_LEVEL_NATURE_AMPED:'하이한 모습이 되는 성격으로 레벨 {cond} 이상에서 레벨업',
    EVO_LEVEL_NATURE_LOW_KEY:'로우한 모습이 되는 성격으로 레벨 {cond} 이상에서 레벨업'
  };
  const rule = dictionary.evo_methods[evo.method] || extraRules[evo.method];
  if (!rule) return esc(evo.method) + (value == null ? '' : ' · ' + formatted);
  const text = esc(rule).replace(/\{(?:cond|move|item|을를|이가)\}/g, token => {
    if (token === '{을를}') return batchim ? '을' : '를';
    if (token === '{이가}') return batchim ? '이' : '가';
    return formatted;
  });
  if (evo.method !== 'EVO_HAS_MOVE') return text;
  const levels = [...new Set((game.learnsets[source]?.[0] || [])
    .filter(([,index]) => game.moveKeys[index] === value)
    .map(([level]) => level))].sort((a,b) => a-b);
  return levels.length ? text + ' (' + levels.map(level => level === 0 ? '진화 시' : '레벨 ' + level).join(', ') + ')' : text;
}
const shortSpeciesName = name => name.replace(/:\s*[^:]+모드$|\s*\([^()]+\bMODE\)$|^(오메가몬) (?:즈왈트|alter-s)$/i,'$1');
function evolutionList(entries, source) {
  entries = entries.filter(evo => !hiddenCards.has(evo.target));
  if (!entries.length) return '<div class="evo-empty">등록된 진화 경로가 없습니다.</div>';
  const groups = new Map();
  for (const evo of entries) {
    if (!groups.has(evo.target)) groups.set(evo.target,[]);
    groups.get(evo.target).push(evo);
  }
  return [...groups].map(([target, rules]) => {
    const hasIcon = wiki.display[target] || pokemonData[target];
    const data = wiki.species[target];
    const [name,form] = pokemonData[target] ? pokemonNameParts(target) : [shortSpeciesName(title('dex',target))];
    return '<div class="evo-row"><div class="evo-col-img">' + (hasIcon ? gameIcon(target) : '') + '</div>'
      + '<div class="evo-col-name"><a href="' + speciesLink(target) + '">' + '<span>' + esc(name) + '</span></a>' + formLabel(form)
      + (data ? badges(data,'badge-small') : '') + '</div><div class="evo-col-cond"><ul>'
      + rules.map(rule => '<li>' + condition(rule, source ?? target) + '</li>').join('') + '</ul></div></div>';
  }).join('');
}
function detail(id, page = 'dex') {
  const data = wiki.species[id];
  const pokemon = page === 'pokemon';
  const [name,form] = pokemon && pokemonData[id] ? pokemonNameParts(id) : [wiki.display[id]?.name_ko];
  const info = pokemon ? {name_ko:name} : wiki.display[id];
  if (!data || !info) return missing(page);
  const stats = data.personal_data.base_stats;
  const names = ['HP','공격','방어','스피드','특수공격','특수방어'];
  const statRows = (values, showLabels = true) => [0,1,2,4,5,3].map(i => '<div class="stat-row">' + (showLabels ? '<span class="stat-name">' + names[i] + '</span>' : '') + '<strong class="stat-val"' + (showLabels ? '' : ' aria-label="' + names[i] + ' ' + values[i] + '"') + '>' + values[i] + '</strong><div class="stat-bar-bg" aria-hidden="true"><div class="stat-bar-fill' + (values[i] > 100 ? ' stat-high' : '') + '" style="width:' + Math.min(values[i] / 255 * 100,100) + '%"></div></div></div>').join('')
    + '<div class="stat-total">합계 ' + values.reduce((sum,value) => sum+value,0) + '</div>';
  const zenStats = id === 'SPECIES_DIGITAMAMON' ? wiki.species.SPECIES_DIGITAMAMON_ZEN_MODE?.personal_data.base_stats : undefined;
  const currentIndex = visibleSpecies.indexOf(pokemonCardByForm.get(id) || id);
  const arrow = (offset,text,labelText) => {
    const target = currentIndex < 0 ? undefined : visibleSpecies[currentIndex + offset];
    if (!target) return '<span aria-hidden="true"></span>';
    const name = esc(title(page,target));
    const icon = gameIcon(target);
    const caption = '<span class="nav-species-name"><span>' + esc(shortSpeciesName(title('dex',target))) + '</span></span>';
    const chevron = '<span class="nav-chevron" aria-hidden="true">' + text + '</span>';
    return '<a class="nav-arrow nav-arrow-' + (offset < 0 ? 'prev' : 'next') + '" href="' + href(page,target) + '" aria-label="' + labelText + ' ' + name + '">'
      + chevron + '<span class="nav-species">' + icon + caption + '</span>' + '</a>';
  };
  const evoSection = (heading,entries,source) => '<section class="evo-section"><h2 class="evo-header">' + heading + '</h2><div class="evo-table">' + evolutionList(entries,source) + '</div></section>';
  const panel = document.createElement('section');
  panel.id = 'dex-detail';
  panel.className = 'modal-content dex-detail';
  panel.dataset.species = id;
  panel.dataset.page = page;
  panel.setAttribute('aria-labelledby','species-name');
  const abilities = data.personal_data.abilities;
  const abilityLink = ability => '<a href="' + href('abilities',ability) + '">' + esc(label('abilities',ability)) + '</a>';
  const regularAbilities = [...new Set(abilities.slice(0,2))]
    .filter(ability => ability && ability !== 'ABILITY_NONE')
    .map(ability => '<span>' + abilityLink(ability) + '</span>');
  const hiddenAbility = abilities[2];
  if (hiddenAbility && hiddenAbility !== 'ABILITY_NONE') {
    regularAbilities.push('<span class="hidden-ability">' + abilityLink(hiddenAbility) + ' (H)</span>');
  }
  panel.innerHTML = '<button type="button" class="close-btn" aria-label="도감 상세 닫기">×</button>'
    + '<div class="detail-top"><div class="modal-header">'
    + '<button type="button" class="detail-art" aria-label="그림을 눌러 상세 정보 접기">' + (pokemon ? gameIcon(id) : art(info)) + '</button>'
    + '<h2 id="species-name" tabindex="-1"><span>' + esc(info.name_ko) + '</span></h2>'
    + formLabel(form) + badges(data) + (pokemon ? pokemonBadge(pokemonData[id][0]) : stageBadge(info.generation))
    + '<div class="detail-nav">' + arrow(-1,'‹',pokemon ? '이전 포켓몬' : '이전 디지몬') + arrow(1,'›',pokemon ? '다음 포켓몬' : '다음 디지몬') + '</div>' + '</div><div class="detail-numbers">'
    + '<section class="info-section detail-stats">'
    + (zenStats
      ? '<div class="stat-comparison"><div><h3>종족값 기본폼</h3><div class="stat-container">' + statRows(stats) + '</div></div>'
        + '<div><h3>달마모드</h3><div class="stat-container">' + statRows(zenStats,false) + '</div></div></div>'
      : '<h3>종족값</h3><div class="stat-container">' + statRows(stats) + '</div>')
    + '<div class="detail-abilities"><strong>특성</strong> <span>' + (regularAbilities.join(' · ') || '—') + '</span></div></section></div></div>'
    + (!incomingForms.has(id) || incoming.has(id) ? evoSection('진화 전 (Evolves from)',incoming.get(id) || []) : '')
    + (incomingForms.has(id) ? evoSection('폼체인지 전',incomingForms.get(id)) : '')
    + (!formChanges.has(id) || data.evolutions.some(evo => !hiddenCards.has(evo.target)) ? evoSection('진화 후 (Evolves to)',data.evolutions,id) : '')
    + (formChanges.has(id) ? evoSection('폼체인지 후',formChanges.get(id),id) : '')
    + speciesGameDetails(id);
  panel.querySelector('.close-btn').onclick = panel.querySelector('.detail-art').onclick = () => {
    closeDetail(panel);
  };
  positionDetail(panel);
  fitEvolutionNames(panel);
}
function positionDetail(panel) {
  const card = document.getElementById(pokemonCardByForm.get(panel.dataset.species) || panel.dataset.species);
  if (!card) {
    document.querySelector('#dex-container').prepend(panel);
    return;
  }
  const grid = card.parentElement;
  const cards = [...grid.children].filter(element => element.classList.contains('card'));
  const columns = getComputedStyle(grid).gridTemplateColumns.trim().split(/\s+/).length;
  const rowEnd = Math.min(cards.length, (Math.floor(cards.indexOf(card) / columns) + 1) * columns);
  const anchor = cards[rowEnd - 1];
  if (anchor.nextElementSibling !== panel) anchor.after(panel);
}

function fitEvolutionNames(panel) {
  for (const name of panel.querySelectorAll('#species-name > span, .evo-col-name > a > span, .nav-species-name > span')) {
    const width = name.offsetWidth;
    if (width) name.style.transform = 'scaleX(' + Math.min(1, name.parentElement.clientWidth / width) + ')';
  }
}
let instantDetailHash;
function detailMotion(panel, cardRect, closing = false) {
  if (!cardRect || matchMedia('(prefers-reduced-motion: reduce)').matches || !panel.animate) return;
  const rect = panel.getBoundingClientRect();
  if (!rect.width || !rect.height) return;
  const compact = {
    transform: 'translate(' + (cardRect.left - rect.left) + 'px,' + (cardRect.top - rect.top) + 'px) scale('
      + (cardRect.width / rect.width) + ',' + (cardRect.height / rect.height) + ')',
    opacity: .35
  };
  const expanded = {transform:'none', opacity:1};
  return panel.animate(closing ? [expanded,compact] : [compact,expanded], {
    duration:280, easing:'cubic-bezier(.2,.7,.3,1)', fill:closing ? 'forwards' : 'none'
  });
}
function closeDetail(panel) {
  if (panel.dataset.closing) return;
  panel.dataset.closing = 'true';
  const card = document.getElementById(pokemonCardByForm.get(panel.dataset.species) || panel.dataset.species);
  panel.getAnimations?.().forEach(animation => animation.cancel());
  const animation = detailMotion(panel,card?.getBoundingClientRect(),true);
  const finish = () => {
    if (panel.isConnected) location.hash = href(panel.dataset.page);
  };
  if (animation) animation.finished.then(finish,finish);
  else finish();
}
main.addEventListener('click', event => {
  if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
  const arrow = event.target.closest('.detail-nav a');
  if (arrow) {
    instantDetailHash = arrow.hash;
    return;
  }
  const card = event.target.closest('.card[aria-expanded="true"]');
  const panel = document.querySelector('#dex-detail');
  if (!card || !panel) return;
  event.preventDefault();
  closeDetail(panel);
});

function missing(page) { main.innerHTML = back(page) + '<h1>항목을 찾을 수 없습니다.</h1>'; }
function placeName(id) {
  const name = game.places[id] || id;
  const route = name.match(/(?:^|_)R(\d{2,3})(?:_|$)/);
  if (route) return Number(route[1]) + '번도로';
  if (!name.startsWith('ENCDATA_')) return name;
  return name.replace(/^ENCDATA_(?:[TRD]\d+_)?/,'').replaceAll('_',' ');
}
const moveSplits = {SPLIT_PHYSICAL:'물리',SPLIT_SPECIAL:'특수',SPLIT_STATUS:'변화'};
const splitClasses = {SPLIT_PHYSICAL:'physical',SPLIT_SPECIAL:'special',SPLIT_STATUS:'status'};
function encounterLabels(methods) {
  const times = ['아침','낮','밤'];
  const groups = new Map();
  for (const [label,chance] of Object.entries(methods)) {
    const match = /^(아침|낮|밤) (.+)$/.exec(label);
    const [,time,method] = match || ['',null,label];
    const key = JSON.stringify([method,chance,Boolean(time)]);
    if (!groups.has(key)) groups.set(key,{method,chance,times:new Set()});
    if (time) groups.get(key).times.add(time);
  }
  return [...groups.values()].map(({method,chance,times:matched}) => {
    const prefix = matched.size > 0 && matched.size < times.length
      ? times.filter(time => matched.has(time)).join('/') + ' ' : '';
    const rate = typeof chance === 'number'
      ? (Number.isInteger(chance) ? chance : '약 ' + Math.round(chance)) + '%'
      : '(' + chance + ')';
    return esc(prefix + method + ' ' + rate);
  });
}
function speciesGameDetails(id) {
  const locations = Object.entries(encounterChances[id] || {}).map(([place,methods]) => {
    const values = encounterLabels(methods);
    return '<div class="row"><strong>' + esc(placeName(place)) + '</strong><p>' + values.join(' · ') + '</p></div>';
  }).join('');
  const sets = game.learnsets[id] || [[],[],[],[]];
  const groups = [
    ['자력기','LV',sets[0].map(([level,index]) => [index,level === 0 ? '진화' : level])],
    ['기술머신','번호',sets[1].map(index => [index,'TM' + (machinesByMove.get(game.moveKeys[index])?.number ?? '—')])],
    ['기술가르침','',sets[2].map(index => [index])]
  ];
  if (!digimonIds.has(id)) groups.push(['알 기술','',sets[3].map(index => [index])]);
  const learnsetTable = (name,firstColumn,moves) => {
    if (!moves.length) return '<p class="learnset-empty">등록된 기술 없음</p>';
    const rows = moves.map(([index,method]) => {
      const move = game.moveKeys[index];
      const entry = game.moves[move];
      const type = wiki.typeDic[entry?.type] || '—';
      const color = moveTypePalette[type] || '#64748b';
      return '<tr>' + (firstColumn ? '<td>' + esc(method) + '</td>' : '')
        + '<td class="learnset-move"><a href="' + href('moves',move) + '">' + esc(label('moves',move)) + '</a></td>'
        + '<td class="learnset-type" style="--move-type:' + color + '">' + esc(type) + '</td>'
        + '<td class="learnset-split ' + (splitClasses[entry?.split] || '') + '">' + (moveSplits[entry?.split] || '—') + '</td></tr>';
    }).join('');
    return '<table class="learnset-table" aria-label="' + name + '"><thead><tr>'
      + (firstColumn ? '<th scope="col">' + firstColumn + '</th>' : '')
      + '<th scope="col" class="learnset-move">기술</th><th scope="col">타입</th><th scope="col">분류</th></tr></thead><tbody>' + rows + '</tbody></table>';
  };
  const personal = game.all[id]?.personal_data;
  const held = wildHeldItems(personal?.items);
  const disclosure = (name,content) => '<details class="detail-disclosure"><summary><span>' + name
    + '</span><span class="disclosure-hint" aria-hidden="true"><span class="disclosure-expand">펼치기</span><span class="disclosure-collapse">접기</span> <span class="disclosure-chevron">▾</span></span></summary>'
    + content + '</details>';
  const habitatContent = (locations || '<p>확인한 야생 출현표에 등록된 장소가 없습니다.</p>')
    + (personal?.catch_rate != null ? '<p class="habitat-catch"><strong>포획률</strong> ' + personal.catch_rate + '</p>' : '');
  const learnsetContent = groups.map(([name,firstColumn,moves]) => '<details><summary>' + name + ' · ' + moves.length + '</summary>'
    + learnsetTable(name,firstColumn,moves) + '</details>').join('');
  return '<section class="info-section detail-links">'
    + (held.length ? '<p><strong>야생 지닌 도구</strong> ' + held.map(([item,chance]) => itemLink(item) + ' ' + chance + '%').join(' · ') + '</p>' : '')
    + disclosure('서식지',habitatContent) + disclosure('배우는 기술',learnsetContent) + '</section>';
}
const abilityHolders = new Map();
for (const [id,{personal_data}] of Object.entries(game.all)) {
  if (hiddenCards.has(id) || !(digimonIds.has(id) || pokemonData[id])) continue;
  for (const ability of new Set(personal_data.abilities)) {
    if (!abilityHolders.has(ability)) abilityHolders.set(ability,[]);
    abilityHolders.get(ability).push(id);
  }
}

function abilityDetails(id) {
  const holders = abilityHolders.get(id) || [];
  const moves = (abilityMoveGroups[id] || []).filter(isListedMove);
  return '<details class="detail-disclosure catalog-related"><summary>이 특성을 가진 개체 · ' + holders.length + '종</summary>'
    + (holders.length ? '<div class="catalog-species-groups">' + catalogSpeciesGroups(holders) + '</div>'
      : '<p>등록된 개체가 없습니다.</p>') + '</details>'
    + (moves.length ? '<details class="detail-disclosure catalog-related"><summary>효과를 받는 기술 · ' + moves.length + '개</summary>'
      + '<div class="learnset-list">' + moves.map(key => '<a href="' + href('moves',key) + '">' + esc(label('moves',key)) + '</a>').join('')
      + '</div></details>' : '');
}

const abilityFilters = {query:'',changed:false};
function abilityCatalog(openId) {
  if (openId && !Object.hasOwn(abilityEntries,openId)) return missing('abilities');
  if (openId) Object.assign(abilityFilters,{query:'',changed:false});
  main.innerHTML = '<form class="dex-search" id="dex-search" aria-label="특성 검색"><div class="catalog-search-title">'
    + '<h1 class="dex-heading">특성 도감 <span id="count" aria-live="polite"></span></h1>'
    + '<label class="catalog-changed-toggle"><input id="ability-changed" type="checkbox">변경·추가된 특성만 보기</label></div>'
    + '<label class="dex-query"><span>검색</span>' + search('특성 이름 또는 키워드 입력',abilityFilters.query) + '</label>'
    + '<div class="dex-search-actions"><button type="submit">검색</button><button id="reset" type="button">초기화</button></div></form>'
    + '<div id="ability-results"></div>';
  const query = main.querySelector('#query');
  const changed = main.querySelector('#ability-changed');
  changed.checked = abilityFilters.changed;
  const results = main.querySelector('#ability-results');
  function update() {
    Object.assign(abilityFilters,{query:query.value,changed:changed.checked});
    const entries = Object.entries(abilityEntries).filter(([id]) => (!changed.checked || changedAbilities.has(id))
      && (match(label('abilities',id),query.value) || match(id,query.value)));
    main.querySelector('#count').textContent = entries.length + '개';
    results.innerHTML = entries.length ? '<table class="ability-table" aria-label="특성 도감"><thead><tr>'
      + '<th scope="col">이름</th><th scope="col">설명</th></tr></thead><tbody>'
      + entries.map(([id,description]) => '<tr class="catalog-line"><th scope="row"><button type="button" class="catalog-open" data-entry="' + esc(id)
        + '" aria-expanded="false" aria-controls="ability-detail-' + esc(id) + '">' + esc(label('abilities',id)) + '</button></th>'
        + '<td class="ability-description">' + esc(description || '—') + '</td></tr>'
        + '<tr class="catalog-detail-row" id="ability-detail-' + esc(id) + '" hidden><td colspan="2"></td></tr>').join('')
      + '</tbody></table>' : '<p>검색 결과가 없습니다.</p>';
  }
  results.onclick = event => {
    const button = event.target.closest('.catalog-line')?.querySelector('button');
    if (button) toggleCatalogEntry(results,button,abilityDetails);
  };
  main.querySelector('#dex-search').onsubmit = event => { event.preventDefault(); update(); };
  main.querySelector('#reset').onclick = () => {
    query.value = '';
    changed.checked = false;
    update();
    query.focus();
  };
  query.oninput = changed.onchange = update;
  update();
  if (openId) {
    const button = [...results.querySelectorAll('.catalog-open')].find(element => element.dataset.entry === openId);
    if (button) {
      toggleCatalogEntry(results,button,abilityDetails);
      requestAnimationFrame(() => button.scrollIntoView({block:'center'}));
    }
  }
}
function wildHeldItems(slots = []) {
  const [common,rare] = slots;
  if (common && common !== 'ITEM_NONE' && common === rare) return [[common,100]];
  return [[common,50],[rare,5]].filter(([item]) => item && item !== 'ITEM_NONE');
}
const selectedItems = new Set(itemAcquisition.selected);
const excludedItems = new Set(itemAcquisition.excluded);
const removedItems = new Set(itemAcquisition.removed);
const helperItems = new Set(itemAcquisition.helperItems);
const wildItemSources = new Map();
for (const [speciesId,data] of Object.entries(game.all)) {
  if (hiddenCards.has(speciesId) || !Object.keys(encounterChances[speciesId] || {}).length) continue;
  if (!digimonIds.has(speciesId) && !pokemonData[speciesId]) continue;
  for (const [item,chance] of wildHeldItems(data.personal_data.items)) {
    if (removedItems.has(item)) continue;
    if (!wildItemSources.has(item)) wildItemSources.set(item,[]);
    wildItemSources.get(item).push([speciesId,chance]);
  }
}
const itemNames = {ITEM_EXP_SHARE:'학습장치', ITEM_DIGOL_DNA_SPLICERS:'유전자쐐기', ITEM_DIGOL_ZYGARDE_CUBE:'지가르데큐브'};
const itemName = id => itemAcquisition.machineNames[id] || itemRefresh.names[id] || itemNames[id] || label('items',id);
const itemLink = rawId => {
  const id = canonicalItemId(rawId);
  const name = esc(itemName(id));
  return game.items[id] && !removedItems.has(id) && (selectedItems.has(id) || hasItemRoute(id))
    ? '<a href="' + href('items',id) + '">' + name + '</a>' : name;
};
const itemRoutes = id => itemAcquisition.obtained[id] || [];
const plannedItemRoutes = id => itemAcquisition.planned[id] || [];
const hasVerifiedItemRoute = id => itemRoutes(id).length > 0 || wildItemSources.has(id) || helperItems.has(id);
const hasItemRoute = id => hasVerifiedItemRoute(id) || plannedItemRoutes(id).length > 0;
const itemScope = '<p class="game-source">0.9.5 테스트 빌드와 소스에서 확인한 획득처 및 배포표를 표시합니다. 야생 지닌 도구는 특성 보정 전 확률입니다.</p>';
function itemRouteText(route) {
  const [method,place,condition,price,extra] = route;
  let text = method + ' · ' + place;
  if (method === '상점' && typeof condition === 'number') {
    if (condition) text += ' · 배지 ' + condition + '개부터';
    if (price != null) text += ' · ' + price.toLocaleString('ko-KR') + '원';
    if (extra) text += ' · ' + extra;
  } else if (typeof condition === 'string' && condition) {
    text += ' · ' + condition;
  } else if (typeof condition === 'number') {
    text += ' · ' + condition + '개';
    if (price != null && extra != null) text += ' · 좌표 ' + price + ', ' + extra;
  }
  return esc(text);
}
function itemRouteList(routes) {
  const labels = [...new Set(routes.map(itemRouteText))];
  return '<ul class="item-routes">' + labels.map(label => '<li>' + label + '</li>').join('') + '</ul>';
}
const itemCategories = {
  POCKET_ITEMS:'도구', POCKET_KEY_ITEMS:'중요한물건', POCKET_MEDICINE:'회복약',
  POCKET_BERRIES:'나무열매', POCKET_BALLS:'볼', POCKET_BATTLE_ITEMS:'배틀도구',
  POCKET_TMHMS:'기술머신', POCKET_MAIL:'메일'
};
const itemUsageLabels = {
  evolution:'진화/폼체인지', battle:'배틀', recovery:'회복',
  training:'육성', capture:'포획', move:'기술 습득', field:'필드', event:'이벤트', treasure:'보물', other:'기타'
};
const I = names => new Set(names.split(' ').map(name => 'ITEM_' + name));
// 필드: used from the bag (or registered) for an effect in the field.
const fieldItems = I('REPEL SUPER_REPEL MAX_REPEL ESCAPE_ROPE BLACK_FLUTE WHITE_FLUTE OLD_ROD GOOD_ROD SUPER_ROD BIKE '
  + 'DOWSING_MACHINE BERRY_POTS DAMP_MULCH GOOEY_MULCH GROWTH_MULCH STABLE_MULCH APRICORN_BOX COIN_CASE SEAL_CASE '
  + 'FASHION_CASE PAL_PAD VS_RECORDER UNOWN_REPORT GB_SOUNDS DIGOL_PORTABLE_BOX');
// 이벤트: only used as a trigger in a story or map event.
const eventItems = I('SS_TICKET SECRET_MEDICINE BLUE_CARD CLEAR_BELL CARD_KEY_JOHTO BASEMENT_KEY SQUIRT_BOTTLE RED_SCALE '
  + 'LOST_ITEM PASS MACHINE_PART MYSTERY_EGG TIDAL_BELL SILVER_FEATHER RAINBOW_FEATHER');
// 보물: valuables to sell or restore.
const treasureItems = I('TINY_MUSHROOM BIG_MUSHROOM PEARL BIG_PEARL STARDUST STAR_PIECE NUGGET HEART_SCALE HONEY RARE_BONE '
  + 'RED_SHARD BLUE_SHARD YELLOW_SHARD GREEN_SHARD');
const extraFormItems = I('REVEAL_GLASS PRISON_BOTTLE ROTOM_CATALOG MODE_SELECTOR DIGOL_DNA_SPLICERS DIGOL_ZYGARDE_CUBE '
  + 'CHIPPED_POT MASTERPIECE_TEACUP ICEROOT_CARROT SHADEROOT_CARROT TEAL_MASK PARTNER_CAP SUN_FLUTE MOON_FLUTE LIGHT_STONE DARK_STONE');
const extraTrainingItems = I('DIGOL_EV_ADJUSTER POMEG_BERRY KELPSY_BERRY QUALOT_BERRY HONDEW_BERRY GREPA_BERRY TAMATO_BERRY');
const evolutionItems = new Set(['ITEM_FORCE_EVOLUTION_DEVICE']);
const formItems = new Set(pokemonFormData.changes.flatMap(([, ,items]) => items));
for (const {evolutions} of Object.values(game.all)) {
  for (const {method,condition} of evolutions) {
    if (method.startsWith('EVO_STONE')) {
      for (const item of [condition].flat()) evolutionItems.add(canonicalItemId(item));
    }
  }
}
const trainingItems = new Set([
  'ITEM_HP_UP','ITEM_PROTEIN','ITEM_IRON','ITEM_CARBOS','ITEM_CALCIUM','ITEM_ZINC',
  'ITEM_RARE_CANDY','ITEM_PP_UP','ITEM_PP_MAX','ITEM_ABILITY_CAPSULE','ITEM_ABILITY_PATCH',
  'ITEM_SUSPICIOUS_CANDY','ITEM_EXP_SHARE'
]);
function itemCategory(id) {
  const pocket = game.items[id].pocket;
  if (Object.hasOwn(itemCategories,pocket)) return pocket;
  return 'other';
}
function itemUsages(id,category) {
  const {effect} = game.items[id];
  const uses = [];
  const training = trainingItems.has(id) || extraTrainingItems.has(id) || id.endsWith('_MINT') || /_FEATHER$/.test(id) && id !== 'ITEM_PRETTY_FEATHER' && !eventItems.has(id);
  if (evolutionItems.has(id) || formItems.has(id) || extraFormItems.has(id) || id.endsWith('_NECTAR')) uses.push('evolution');
  if (category === 'POCKET_BATTLE_ITEMS' || id.startsWith('ITEM_DIGOL_ULTIMATE_EVIOLITE_')
    || (effect?.startsWith('HOLD_EFFECT_') && !training)) uses.push('battle');
  if ((category === 'POCKET_MEDICINE' && !training && !evolutionItems.has(id))
    || (category === 'POCKET_BERRIES' && effect?.includes('RESTORE'))
    || id === 'ITEM_DIGOL_RECOVERY_KIT') uses.push('recovery');
  if (training) uses.push('training');
  if (category === 'POCKET_BALLS' || id.endsWith('_APRICORN')) uses.push('capture');
  if (category === 'POCKET_TMHMS') uses.push('move');
  if (fieldItems.has(id)) uses.push('field');
  if (eventItems.has(id)) uses.push('event');
  if (treasureItems.has(id) || /_FOSSIL$|^ITEM_FOSSILIZED_|^ITEM_OLD_AMBER$/.test(id)) uses.push('treasure');
  return uses.length ? uses : ['other'];
}
const itemFilters = {query:'',category:'',usage:''};
// Use the first item in a family as its position, then order the members by ID.
const itemFamilyRules = [
  [/^(?:ITEM_.*_PLATE)$/, 'ITEM_FLAME_PLATE'],
  [/^ITEM_DIGICORE_/, 'ITEM_DIGICORE_MG'],
  [/^ITEM_.*_FOSSIL$|^ITEM_FOSSILIZED_|^ITEM_OLD_AMBER$/, 'ITEM_ROOT_FOSSIL'],
  [/^ITEM_.*_FEATHER$/, 'ITEM_HEALTH_FEATHER'],
  [/^ITEM_.*_MINT$/, 'ITEM_LONELY_MINT'],
  [/^ITEM_.*_DRIVE$/, 'ITEM_BURN_DRIVE'],
  [/^ITEM_.*_NECTAR$/, 'ITEM_RED_NECTAR'],
  [/^ITEM_.*_MASK$/, 'ITEM_TEAL_MASK'],
  [/^ITEM_MEGA_STONE_[XYZ]$/, 'ITEM_MEGA_STONE_X']
];
const itemId = id => itemDetailText.ids[id] ?? Infinity;
const itemFamilyOrder = id => {
  const family = itemFamilyRules.find(([pattern]) => pattern.test(id));
  return itemId(family?.[1] ?? id);
};
const machineOrder = new Map(learnsetRefresh.machines.map(m => [m.item,(m.kind === 'HM' ? 1000 : 0) + m.number]));
function compareItemOrder(a,b) {
  if (machineOrder.has(a) && machineOrder.has(b)) return machineOrder.get(a) - machineOrder.get(b);
  return itemFamilyOrder(a) - itemFamilyOrder(b) || itemId(a) - itemId(b) || a.localeCompare(b);
}
const catalogItems = [...selectedItems].filter(id => game.items[id]).sort(compareItemOrder).map(id => {
  const category = itemCategory(id);
  return {id,name:itemName(id),category,uses:itemUsages(id,category)};
});
function itemDetails(id) {
  const entry = game.items[id];
  const facts = [['기본 가격',entry.price],['포켓',itemCategories[itemCategory(id)] || '미확인']];
  const description = itemDetailText.descriptions[id];
  const known = itemRoutes(id);
  const planned = plannedItemRoutes(id);
  const wild = wildItemSources.get(id) || [];
  return '<div class="panel catalog-facts">' + facts.map(([key,value]) => '<div><strong>' + key + '</strong><br>' + esc(value ?? '—') + '</div>').join('') + '</div>'
    + (description ? '<p class="item-description">' + esc(description) + '</p>' : '')
    + (planned.length ? '<h2>확정 배포표의 획득처</h2>' + itemRouteList(planned) : '')
    + (hasVerifiedItemRoute(id) ? '<h2>테스트 ROM·소스에서 확인한 획득처</h2>' : '')
    + (known.length ? itemRouteList(known) : '')
    + (helperItems.has(id) ? '<p>개발자 전화의 도구 지원으로도 받을 수 있습니다.</p>' : '')
    + (wild.length ? '<h3>야생 지닌 도구</h3><div class="learnset-list">' + wild.map(([key,chance]) =>
      '<a href="' + speciesLink(key) + '">' + esc(title('dex',key)) + ' ' + chance + '%</a>').join('') + '</div>' : '')
    + (!hasItemRoute(id) ? '<h2>획득처</h2><p>확인한 자료에서 획득처를 찾지 못했습니다.</p>' : '');
}

function itemCatalog(openId) {
  if (removedItems.has(openId)) return missing('items');
  if (openId && !selectedItems.has(openId)) {
    if (!game.items[openId] || !hasItemRoute(openId)) return missing('items');
    const status = excludedItems.has(openId) ? '배포 제외 품목' : '배포 목록에 없는 품목';
    main.innerHTML = back('items') + '<h1>' + esc(itemName(openId)) + '</h1><p>' + status + '</p>' + itemDetails(openId);
    return;
  }
  if (openId && !game.items[openId]) return missing('items');
  if (openId) Object.assign(itemFilters,{query:'',category:'',usage:''});
  main.innerHTML = '<form class="dex-search" id="dex-search" aria-label="아이템 검색">'
    + '<h1 class="dex-heading">아이템 도감 <span id="count" aria-live="polite"></span></h1>'
    + '<label class="dex-query"><span>검색</span>' + search('아이템 이름 또는 키워드 입력',itemFilters.query) + '</label>'
    + '<div class="dex-filter-row"><label><span>포켓</span><select id="item-category">' + catalogSearchOptions(Object.fromEntries(
      Object.entries(itemCategories).map(([key,name]) => [key,name + ' 포켓']))) + '</select></label>'
    + '<label><span>용도</span><select id="item-usage">' + catalogSearchOptions(itemUsageLabels) + '</select></label>'
    + '<div class="dex-search-actions"><button type="submit">검색</button><button id="reset" type="button">초기화</button></div></div></form>'
    + itemScope + '<div id="item-results"></div>';
  const query = main.querySelector('#query');
  const category = main.querySelector('#item-category');
  const usage = main.querySelector('#item-usage');
  const results = main.querySelector('#item-results');
  category.value = itemFilters.category;
  usage.value = itemFilters.usage;
  function update() {
    Object.assign(itemFilters,{query:query.value,category:category.value,usage:usage.value});
    const items = catalogItems.filter(item => (!category.value || item.category === category.value)
      && (!usage.value || item.uses.includes(usage.value))
      && (match(item.name,query.value) || match(item.id,query.value)));
    main.querySelector('#count').textContent = items.length + '개';
    results.innerHTML = Object.entries({...itemCategories,other:'미확인'}).map(([key,pocketName]) => {
      const group = items.filter(item => item.category === key);
      if (!group.length) return '';
      return '<section class="item-group" data-pocket="' + key + '"><h2 class="gen-section-title">' + esc(pocketName)
        + '</h2><table class="item-table" aria-label="' + esc(pocketName) + '"><thead><tr>'
        + ['아이템','포켓','용도'].map(heading => '<th scope="col">' + heading + '</th>').join('') + '</tr></thead><tbody>'
        + group.map(({id,name,uses}) => '<tr class="catalog-line"><th scope="row"><button type="button" class="catalog-open" data-entry="' + esc(id)
          + '" aria-expanded="false" aria-controls="item-detail-' + esc(id) + '">' + esc(name) + '</button></th>'
          + '<td class="item-pocket-cell">' + esc(pocketName) + '</td><td>' + esc(uses.map(use => itemUsageLabels[use]).join(' · ')) + '</td></tr>'
          + '<tr class="catalog-detail-row" id="item-detail-' + esc(id) + '" hidden><td colspan="3"></td></tr>').join('')
        + '</tbody></table></section>';
    }).join('') || '<p>검색 결과가 없습니다.</p>';
  }
  results.onclick = event => {
    const button = event.target.closest('.catalog-line')?.querySelector('button');
    if (button) toggleCatalogEntry(results,button,itemDetails);
  };
  main.querySelector('#dex-search').onsubmit = event => { event.preventDefault(); update(); };
  main.querySelector('#reset').onclick = () => {
    query.value = category.value = usage.value = '';
    update();
    query.focus();
  };
  query.oninput = category.onchange = usage.onchange = update;
  update();
  if (openId) {
    const button = [...results.querySelectorAll('.catalog-open')].find(element => element.dataset.entry === openId);
    if (button) {
      toggleCatalogEntry(results,button,itemDetails);
      requestAnimationFrame(() => button.scrollIntoView({block:'center'}));
    }
  }
}
const moveFilters = {query:'',split:'',type:'',changed:false};
const moveTypes = Object.keys(wiki.typeDic);
const catalogSearchOptions = labels => '<option value="">지정 없음</option>' + Object.entries(labels)
  .map(([key,name]) => '<option value="' + esc(key) + '">' + esc(name) + '</option>').join('');
const unavailableMoves = new Set(moveCatalogData.unavailable);
const battleOnlyMoves = new Set(moveCatalogData.battleOnly);
const zTutorMoves = new Set(moveCatalogData.zTutorMoves);
const moveTypePalette = {
  노말:'#949495',불꽃:'#e56c3e',물:'#5185c5',풀:'#66a945',전기:'#fbb917',얼음:'#6dc8eb',
  격투:'#e09c30',독:'#735198',땅:'#9c7743',비행:'#a2c3e7',에스퍼:'#dd6b7b',벌레:'#9fa244',
  바위:'#bfb889',고스트:'#684870',드래곤:'#535ca8',악:'#4c4948',강철:'#69a9c7',페어리:'#dab4d4'
};
const moveLearners = new Map();
for (const [id,sets] of Object.entries(game.learnsets)) {
  if (hiddenCards.has(id) || !(digimonIds.has(id) || pokemonData[id])) continue;
  const [level,machines,tutors,egg] = sets;
  const indices = new Set([...level.map(([,index]) => index), ...machines, ...tutors, ...(egg || [])]);
  for (const index of indices) {
    const key = game.moveKeys[index];
    if (!key) continue;
    if (!moveLearners.has(key)) moveLearners.set(key,[]);
    moveLearners.get(key).push(id);
  }
}

function isListedMove(id) {
  if (!game.moves[id] || unavailableMoves.has(id) || battleOnlyMoves.has(id)) return false;
  return !id.startsWith('MOVE_LEGACY_') || moveLearners.has(id) || machinesByMove.has(id)
    || Boolean(game.tutors?.[id]?.length);
}

function catalogSpeciesGroups(learners) {
  const digimon = [];
  const pokemon = new Map();
  for (const id of learners) {
    if (digimonIds.has(id)) {
      digimon.push(id);
      continue;
    }
    const [group] = pokemonData[id];
    if (!pokemon.has(group)) pokemon.set(group,[]);
    pokemon.get(group).push(id);
  }
  const links = (ids,nameOf) => '<div class="learnset-list">' + ids.map(id =>
    '<a href="' + speciesLink(id) + '">' + esc(nameOf(id)) + '</a>').join('') + '</div>';
  return (digimon.length ? '<section><h4>디지몬</h4>' + links(digimon,id => title('dex',id)) + '</section>' : '')
    + (pokemon.size ? '<section aria-label="포켓몬">' + [...pokemonGroups,'other'].filter(group => pokemon.has(group))
      .map(group => '<h5>' + esc(pokemonLabel(group)) + '</h5>' + links(pokemon.get(group),id => pokemonNameParts(id).filter(Boolean).join(' ')))
      .join('') + '</section>' : '');
}

function moveDetails(id) {
  const learners = moveLearners.get(id) || [];
  const description = (learnsetRefresh.moves[id]?.description || moveCatalogData.descriptions[id] || '기술 설명이 없습니다.').replace(/\s+/g,' ');
  const tutorLocations = game.tutors?.[id] || [];
  const hasZTutor = zTutorMoves.has(id);
  const machine = machinesByMove.get(id);
  return '<p class="move-description">' + esc(description) + '</p>'
    + '<details class="detail-disclosure catalog-related"><summary>배울 수 있는 개체' + (hasZTutor && !learners.length ? '' : ' · ' + learners.length + '종') + '</summary>'
    + (learners.length ? '<div class="catalog-species-groups">' + catalogSpeciesGroups(learners) + '</div>'
      : hasZTutor ? '<p>할머니가 선택한 개체의 타입과 친밀도를 확인합니다.</p>' : '<p>등록된 개체가 없습니다.</p>') + '</details>'
    + (machine ? '<p>기술머신 ' + esc(machine.kind || 'TM') + machine.number + '</p>' : '')
    + (hasZTutor ? '<p><strong>기술가르침</strong> · 검은먹시티 기술가르침의 집 · 용성군을 가르치던 할머니에게서 배웁니다. 친밀도와 타입 조건이 있습니다.</p>' : '')
    + (tutorLocations.length ? '<p>기술가르침 · ' + tutorLocations.map(([name,price]) => esc(name) + ' · '
      + (price ? price + ' 포인트' : '무료')).join(' / ') + '</p>' : '');
}

function toggleCatalogEntry(results,button,renderDetails) {
  const wasOpen = button.getAttribute('aria-expanded') === 'true';
  const current = results.querySelector('[aria-expanded="true"]');
  if (current) {
    current.setAttribute('aria-expanded','false');
    const detail = document.getElementById(current.getAttribute('aria-controls'));
    detail.hidden = true;
    detail.querySelector('td').replaceChildren();
  }
  if (wasOpen) return;
  const detail = document.getElementById(button.getAttribute('aria-controls'));
  detail.querySelector('td').innerHTML = renderDetails(button.dataset.entry);
  detail.hidden = false;
  button.setAttribute('aria-expanded','true');
}

function moveCatalog(openId) {
  if (openId && !isListedMove(openId)) return missing('moves');
  if (openId) Object.assign(moveFilters,{query:'',split:'',type:'',changed:false});
  main.innerHTML = '<form class="dex-search move-search" id="dex-search" aria-label="기술 검색"><div class="catalog-search-title">'
    + '<h1 class="dex-heading">기술 도감 <span id="count" aria-live="polite"></span></h1>'
    + '<label class="catalog-changed-toggle"><input id="move-changed" type="checkbox">변경·추가된 기술만 보기</label></div>'
    + '<label class="dex-query"><span>검색</span>' + search('기술 이름 또는 키워드 입력',moveFilters.query) + '</label>'
    + '<div class="dex-filter-row"><label><span>분류</span><select id="move-split">' + catalogSearchOptions(moveSplits) + '</select></label>'
    + '<label><span>타입</span><select id="move-type">' + catalogSearchOptions(wiki.typeDic) + '</select></label>'
    + '<div class="dex-search-actions"><button type="submit">검색</button><button id="reset" type="button">초기화</button></div></div></form>'
    + '<div id="move-results"></div>';
  const query = main.querySelector('#query');
  const split = main.querySelector('#move-split');
  const type = main.querySelector('#move-type');
  const changed = main.querySelector('#move-changed');
  const results = main.querySelector('#move-results');
  split.value = moveFilters.split;
  type.value = moveFilters.type;
  changed.checked = moveFilters.changed;
  function update() {
    Object.assign(moveFilters,{query:query.value,split:split.value,type:type.value,changed:changed.checked});
    const groups = new Map();
    let count = 0;
    for (const [id,entry] of Object.entries(game.moves)) {
      if (!isListedMove(id)) continue;
      if (split.value && entry.split !== split.value || type.value && entry.type !== type.value) continue;
      if (changed.checked && !moveCatalogData.changes[id]) continue;
      if (!match(label('moves',id),query.value) && !match(id,query.value)) continue;
      if (!groups.has(entry.type)) groups.set(entry.type,[]);
      groups.get(entry.type).push([id,entry]);
      count++;
    }
    main.querySelector('#count').textContent = count + '개';
    const order = [...moveTypes,...[...groups.keys()].filter(key => !moveTypes.includes(key))];
    results.innerHTML = order.filter(key => groups.has(key)).map(key => {
      const name = wiki.typeDic[key] || key;
      const color = moveTypePalette[name] || '#64748b';
      return '<section class="gen-section move-group"><h2 class="gen-section-title" style="--move-type:' + color + '">'
        + esc(name) + '</h2><table class="move-table" aria-label="' + esc(name) + ' 기술"><thead><tr>'
        + ['기술','타입','분류','위력','명중','PP'].map(heading => '<th scope="col">' + heading + '</th>').join('') + '</tr></thead><tbody>'
        + groups.get(key).map(([id,entry]) => '<tr class="catalog-line"><th scope="row"><button type="button" class="catalog-open" data-entry="' + esc(id)
          + '" aria-expanded="false" aria-controls="move-detail-' + esc(id) + '">' + esc(label('moves',id)) + '</button></th>'
          + '<td class="move-type-cell" style="--move-type:' + color + '">' + esc(name) + '</td>'
          + '<td class="learnset-split ' + (splitClasses[entry.split] || '') + '">' + (moveSplits[entry.split] || '—') + '</td>'
          + '<td>' + (entry.power && entry.split !== 'SPLIT_STATUS' ? entry.power : '—') + '</td><td>'
          + (entry.accuracy ? entry.accuracy + '%' : '—') + '</td><td>' + (entry.pp || '—') + '</td></tr>'
          + '<tr class="catalog-detail-row" id="move-detail-' + esc(id) + '" hidden><td colspan="6"></td></tr>').join('')
        + '</tbody></table></section>';
    }).join('') || '<p>검색 결과가 없습니다.</p>';
  }
  results.onclick = event => {
    const button = event.target.closest('.catalog-line')?.querySelector('button');
    if (button) toggleCatalogEntry(results,button,moveDetails);
  };
  main.querySelector('#dex-search').onsubmit = event => { event.preventDefault(); update(); };
  main.querySelector('#reset').onclick = () => {
    query.value = split.value = type.value = '';
    changed.checked = false;
    update();
    query.focus();
  };
  query.oninput = split.onchange = type.onchange = changed.onchange = update;
  update();
  if (openId) {
    const button = [...results.querySelectorAll('.catalog-open')].find(element => element.dataset.entry === openId);
    if (button) {
      toggleCatalogEntry(results,button,moveDetails);
      requestAnimationFrame(() => button.scrollIntoView({block:'center'}));
    }
  }
}
const guides = {
  starter:['스타팅 알','오박사 인트로에서 세 질문에 답한 뒤 방에서 디지바이스를 얻으면, 답변에 따라 정해진 알을 확인할 수 있습니다.'],
  tutor:['포켓슬론 기술가르침','포켓슬론 로비에서 기술가르침을 받을 수 있습니다. 약한 기술은 기본 이용, 중간·변화 기술은 배지 5개, 강한 공격 기술은 배지 8개부터 이용하는 구성입니다.'],
  badges:['배지별 해금','배지에 따라 백화점 기술머신과 기술가르침이 열립니다. 개별 기술별 번호와 판매 목록은 게임 버전이 확정되면 연결합니다.']
};
function guidePage(id) {
  if (!id) {
    main.innerHTML = '<div class="dex-search page-banner"><h1 class="dex-heading">공략 정보</h1></div><p>프로젝트 설정 기준 초안</p>' + Object.entries(guides).map(([key,[name]]) => '<a class="row" href="' + href('guides',key) + '">' + name + '</a>').join('');
    return;
  }
  if (!guides[id]) return missing('guides');
  main.innerHTML = back('guides') + '<h1>' + guides[id][0] + '</h1><p class="panel">' + guides[id][1] + '</p>';
}
function notes() {
  main.innerHTML = '<div class="dex-search page-banner"><h1 class="dex-heading">패치노트</h1></div><p>등록된 패치노트가 없습니다.</p><a class="row" href="#patch">롬 패치 열기</a>';
}
const patchDifficulties = {
  casual:['캐주얼','부담을 줄이고 스토리와 육성을 즐기기 좋은 난이도입니다.'],
  classic:['클래식','모험과 배틀의 균형을 맞춘 기본 난이도입니다.'],
  challenge:['챌린지','팀 구성과 배틀 전략이 더 중요한 난이도입니다.']
};
const availablePatchReleases = patchReleases.filter(release => !release.hidden && !release.archived)
  .sort((a,b) => b.version.localeCompare(a.version,undefined,{numeric:true})
    || b.releasedAt.localeCompare(a.releasedAt));
const latestPatch = availablePatchReleases[0];
if (latestPatch) document.querySelector('.brand-subtitle').textContent = 'DIGOL-02 WIKI · ' + latestPatch.version;

const patchWorkerUrl = 'wiki/rom-patcher-worker.js?v=patch-bundle-1';
function patch() {
  const outputName = 'DigiGold-02.nds';
  const canSaveLocally = typeof window.showOpenFilePicker === 'function'
    && typeof window.showSaveFilePicker === 'function';
  const romTypes = [{description:'Nintendo DS ROM',accept:{'application/octet-stream':['.nds']}}];
  const versions = availablePatchReleases.map(release => '<option value="' + esc(release.version) + '">'
    + esc(release.version) + (Object.keys(release.files).length === 1 && patchDifficulties[Object.keys(release.files)[0]]
      ? ' · ' + patchDifficulties[Object.keys(release.files)[0]][0] : '') + (release === latestPatch ? ' (최신)' : '') + '</option>').join('');
  main.innerHTML = '<div class="dex-search page-banner"><h1 class="dex-heading">롬 패치</h1></div>'
    + '<form class="patch-form" id="patch-form"><fieldset class="patch-difficulties"><legend>난이도 선택</legend>'
    + Object.entries(patchDifficulties).map(([key,[name,description]]) =>
      '<label class="patch-difficulty patch-difficulty-' + key + '"><input type="radio" name="difficulty" value="' + key
      + '"' + (key === 'classic' ? ' checked' : '') + '><span class="patch-card"><strong>' + name
      + '</strong><span>' + description + '</span></span></label>').join('')
    + '</fieldset><div class="panel patch-controls">'
    + '<label for="patch-version">버전 선택</label><select id="patch-version"' + (latestPatch ? '' : ' disabled') + '>'
    + (versions || '<option value="">등록된 배포 버전 없음</option>') + '</select>'
    + '<label for="rom">원본 ROM 또는 이전 버전 디지골드 ROM</label><input type="file" id="rom" accept=".nds">'
    + (canSaveLocally ? '<button type="button" id="patch-open-local">같은 위치에 저장하려면 여기서 이전 ROM 열기</button>'
      + '<p id="patch-local-source"></p>' : '')
    + '<p class="patch-rom-info" id="patch-rom-info"></p>'
    + '<div class="patch-actions"><button type="submit" id="patch-apply" class="action">패치 적용</button>'
    + '<a id="patch-download" href="#" role="button">패치 파일만 다운로드</a></div>'
    + '<p class="patch-availability" id="patch-availability" aria-live="polite"></p>'
    + (latestPatch ? '' : '<details class="patch-manual" open><summary>보유한 패치 파일 사용</summary>'
      + '<label for="patch-file">xdelta / BPS 패치</label><input type="file" id="patch-file" accept=".xdelta,.vcdiff,.bps"></details>')
    + '<p id="patch-status" role="status"></p><a id="output" hidden download="' + outputName + '">패치된 ROM 다운로드</a>'
    + (canSaveLocally ? '<button type="button" id="patch-save-local" hidden></button><p id="patch-save-status" role="status"></p>' : '')
    + '<p class="patch-local-note">ROM은 기기 안에서 처리됩니다.</p>'
    + '<small class="patch-credit">Powered by <a href="https://github.com/marcrobledo/RomPatcher.js" target="_blank" rel="noopener noreferrer">RomPatcher.js</a></small></div></form>';

  const form = main.querySelector('#patch-form');
  const version = form.querySelector('#patch-version');
  const romInput = form.querySelector('#rom');
  const manualInput = form.querySelector('#patch-file');
  const apply = form.querySelector('#patch-apply');
  const download = form.querySelector('#patch-download');
  const availability = form.querySelector('#patch-availability');
  const status = form.querySelector('#patch-status');
  const romInfo = form.querySelector('#patch-rom-info');
  const output = form.querySelector('#output');
  const openLocal = form.querySelector('#patch-open-local');
  const localSource = form.querySelector('#patch-local-source');
  const saveLocal = form.querySelector('#patch-save-local');
  const saveStatus = form.querySelector('#patch-save-status');
  let selectedRelease = latestPatch;
  let worker;
  let request;
  let url;
  let localRom;
  let localHandle;
  let patchedRom;
  let usingPicker = false;

  // Difficulties without a file in the selected release stay visible but disabled.
  const hasDifficulty = key => !selectedRelease || Boolean(selectedRelease.files?.[key]);
  const selectedPatch = () => {
    const entry = selectedRelease?.files?.[form.elements.difficulty.value];
    return typeof entry === 'string' ? {file:entry} : entry;
  };
  function resetResult() {
    if (url) URL.revokeObjectURL(url);
    url = undefined;
    patchedRom = undefined;
    if (saveLocal) {
      saveLocal.hidden = true;
      saveStatus.textContent = '';
      saveStatus.className = '';
    }
    output.hidden = true;
    output.removeAttribute('href');
    status.className = '';
    status.textContent = '';
    romInfo.textContent = '';
  }
  function refresh() {
    if (!hasDifficulty(form.elements.difficulty.value)) {
      const first = Object.keys(patchDifficulties).find(hasDifficulty);
      if (first) form.elements.difficulty.value = first;
    }
    const file = selectedPatch()?.file;
    const ready = Boolean(selectedPatch()?.outputCrc32 || file);
    const busy = Boolean(request || worker || usingPicker);
    if (openLocal) {
      openLocal.disabled = busy;
      saveLocal.disabled = busy;
      localSource.textContent = localRom?.name || '';
    }
    form.querySelectorAll('input').forEach(input => { input.disabled = busy; });
    form.querySelectorAll('input[name="difficulty"]').forEach(input => {
      const ready = hasDifficulty(input.value);
      if (!ready) input.disabled = true;
      input.closest('label').classList.toggle('patch-difficulty-later',!ready);
      input.closest('label').querySelector('.patch-card span').textContent = ready
        ? patchDifficulties[input.value][1] : '추후 추가 예정입니다.';
    });
    version.disabled = busy || !latestPatch;
    apply.disabled = busy || !(localRom || romInput.files.length) || !(ready || manualInput?.files.length);
    // Patch-only download follows the same route as patching (uploaded ROM, or the original ROM).
    download.hidden = !ready;
    if (busy || !ready) download.setAttribute('aria-disabled','true');
    else download.removeAttribute('aria-disabled');
    availability.textContent = !latestPatch ? '아직 배포용 패치 파일이 등록되지 않았습니다.'
      : ready ? '' : '이 버전에는 선택한 난이도의 패치 파일이 없습니다.';
  }
  form.onchange = event => {
    if (event.target === romInput) {
      localRom = undefined;
      localHandle = undefined;
    }
    if (event.target === version) {
      const next = availablePatchReleases.find(release => release.version === version.value);
      if (!next || (next !== latestPatch && !window.confirm('이전 버전에는 최신 수정 사항이 포함되지 않을 수 있습니다. 이 버전을 선택하시겠습니까?'))) {
        version.value = selectedRelease.version;
        return;
      }
      selectedRelease = next;
    }
    resetResult();
    refresh();
  };
  if (openLocal) {
    openLocal.onclick = async () => {
      usingPicker = true;
      refresh();
      try {
        const [handle] = await window.showOpenFilePicker({types:romTypes,excludeAcceptAllOption:true});
        const file = await handle.getFile();
        localRom = file;
        localHandle = handle;
        romInput.value = '';
        resetResult();
      } catch (error) {
        if (error.name !== 'AbortError') {
          status.className = 'error';
          status.textContent = '파일을 열 수 없습니다. 일반 파일 선택으로 다시 시도해 주세요.';
        }
      } finally {
        usingPicker = false;
        refresh();
      }
    };
    saveLocal.onclick = async () => {
      if (usingPicker || !patchedRom || saveLocal.hidden) return;
      usingPicker = true;
      refresh();
      let stream;
      try {
        let handle = localHandle;
        if (localRom.name === outputName) {
          if (await handle.requestPermission({mode:'readwrite'}) !== 'granted') {
            throw Error('기존 ROM에 쓸 권한이 필요합니다.');
          }
          const current = await handle.getFile();
          if (current.size !== localRom.size || current.lastModified !== localRom.lastModified) {
            throw Error('선택한 ROM이 변경되었습니다. 다시 열어 패치해 주세요.');
          }
        } else {
          handle = await window.showSaveFilePicker({suggestedName:outputName,startIn:handle,types:romTypes});
        }
        stream = await handle.createWritable();
        await stream.write(patchedRom);
        await stream.close();
        saveStatus.className = '';
        saveStatus.textContent = handle.name + ' 저장을 완료했습니다.';
      } catch (error) {
        if (stream) await stream.abort().catch(() => {});
        if (error.name !== 'AbortError') {
          saveStatus.className = 'error';
          saveStatus.textContent = error.name === 'Error' ? error.message
            : '파일에 저장하지 못했습니다. 패치된 ROM 다운로드를 이용해 주세요.';
        }
      } finally {
        usingPicker = false;
        refresh();
      }
    };
  }
  // Every patch of the selected difficulty, keyed by exact ROM checksums: original -> anchor
  // patches (release file), update patches between versions, and the normalisation patch.
  // The worker picks the route with the fewest downloads, so versions without an original
  // patch are reached from the original ROM through the latest anchor.
  function updateEntries() {
    const difficulty = form.elements.difficulty.value;
    const entries = [];
    if (patchNormalization) entries.push({from:'정규화',to:'기준 원본',inputCrc32:patchNormalization.inputCrc32,
      outputCrc32:patchNormalization.outputCrc32,outputSize:patchNormalization.outputSize,
      file:new URL(patchNormalization.file,document.baseURI).href,normalize:true});
    for (const release of patchReleases) {
      const raw = release.files?.[difficulty];
      const target = typeof raw === 'string' ? {file:raw} : raw;
      if (!target?.outputCrc32) continue;
      if (target.file) entries.push({from:'원본',to:release.version,
        inputCrc32:release.inputCrc32 || patchBaseRom.crc32,outputCrc32:target.outputCrc32,
        file:new URL(target.file,document.baseURI).href});
      for (const entry of target.updates || []) {
        const from = patchReleases.find(candidate => !candidate.archived && candidate.version === entry.from);
        const inputCrc32 = entry.inputCrc32 || from?.files?.[difficulty]?.outputCrc32;
        if (inputCrc32) entries.push({from:entry.from,to:release.version,inputCrc32,outputCrc32:target.outputCrc32,
          file:new URL(entry.file,document.baseURI).href});
      }
    }
    return entries;
  }
  function finish(data) {
    worker?.terminate();
    worker = undefined;
    request = undefined;
    refresh();
    status.className = data.error ? 'error' : '';
    status.textContent = data.error || (data.updatedFrom
      ? data.updatedFrom + ' → ' + selectedRelease.version + ' 업데이트를 완료했습니다.'
      : data.normalized ? '정규화와 패치 적용을 완료했습니다.' : '패치 적용을 완료했습니다.');
    if (data.error) return;
    romInfo.textContent = '원본 CRC32 ' + data.sourceCrc32 + ' · 결과 CRC32 ' + data.outputCrc32;
    patchedRom = new Blob([data.buffer],{type:'application/octet-stream'});
    url = URL.createObjectURL(patchedRom);
    output.href = url;
    output.hidden = false;
    if (saveLocal && localHandle && data.updatedFrom) {
      saveLocal.textContent = localRom.name === outputName ? '기존 DigiGold-02.nds 덮어쓰기' : '같은 폴더에 DigiGold-02.nds 저장';
      saveLocal.hidden = false;
    }
  }
  download.onclick = event => {
    event.preventDefault();
    if (request || worker || download.getAttribute('aria-disabled') === 'true') return;
    const selected = selectedPatch();
    const difficulty = form.elements.difficulty.value;
    const rom = localRom || romInput.files[0];
    resetResult();
    const done = message => {
      worker?.terminate();
      worker = undefined;
      refresh();
      if (message) {
        status.className = 'error';
        status.textContent = message;
      }
    };
    if (!selected?.outputCrc32) {
      // Releases registered without a checksum: hand out the single file as is.
      const link = document.createElement('a');
      link.href = selected.file;
      link.download = 'DigiGold-02_' + difficulty + '_original-to-' + selectedRelease.version + '.xdelta';
      link.click();
      return;
    }
    status.textContent = rom ? 'ROM 버전을 확인하는 중…' : '원본 ROM 기준으로 패치 파일을 준비하는 중…';
    try {
      worker = new Worker(patchWorkerUrl);
      refresh();
      worker.onmessage = ({data}) => {
        if (data.type === 'progress') {
          status.textContent = data.status;
          return;
        }
        if (data.type !== 'bundle') return done(data.error || '패치 파일을 준비하지 못했습니다.');
        const link = document.createElement('a');
        const blobUrl = URL.createObjectURL(data.blob);
        link.href = blobUrl;
        link.download = data.name;
        document.body.append(link);
        link.click();
        link.remove();
        setTimeout(() => URL.revokeObjectURL(blobUrl),60000);
        done();
        romInfo.textContent = (rom ? '올린 ROM CRC32 ' : '원본 ROM CRC32 ') + data.sourceCrc32;
        status.textContent = data.summary.join(', ') + ' 패치 파일을 받았습니다. (' + data.name + ')'
          + (rom ? '' : ' 이전 버전 ROM을 올리면 그 버전부터 필요한 업데이트 패치만 받을 수 있습니다.');
      };
      worker.onerror = () => done('패치 파일을 준비하는 중 오류가 발생했습니다.');
      worker.postMessage({mode:'bundle',rom,sourceCrc32:selectedRelease.inputCrc32 || patchBaseRom.crc32,
        updates:updateEntries(),outputCrc32:selected.outputCrc32,difficulty,
        difficultyName:patchDifficulties[difficulty]?.[0],version:selectedRelease.version});
    } catch {
      done('패치 파일 준비를 시작할 수 없습니다.');
    }
  };
  form.onsubmit = async event => {
    event.preventDefault();
    if (request || worker || apply.disabled) return;
    const rom = localRom || romInput.files[0];
    const selected = selectedPatch();
    const file = selected?.file;
    const ready = Boolean(selected?.outputCrc32 || file);
    let delta = manualInput?.files[0];
    const pending = new AbortController();
    request = pending;
    resetResult();
    refresh();
    if (ready) delta = undefined;
    if (pending.signal.aborted) return;
    status.textContent = '파일 검증 및 패치 적용 중…';
    try {
      worker = new Worker(patchWorkerUrl);
      request = undefined;
      worker.onmessage = ({data}) => {
        if (data.type === 'progress') {
          status.textContent = data.status;
          if (data.sourceCrc32) romInfo.textContent = '원본 CRC32 ' + data.sourceCrc32;
        } else finish(data);
      };
      worker.onerror = () => finish({error:'패치 처리 중 오류가 발생했습니다. 파일을 확인한 뒤 다시 시도해 주세요.'});
      worker.onmessageerror = () => finish({error:'패치 결과를 읽지 못했습니다. 다시 시도해 주세요.'});
      const normalization = patchNormalization && {
        ...patchNormalization,
        file:new URL(patchNormalization.file,document.baseURI).href
      };
      worker.postMessage({rom,delta,normalization,
        deltaUrl:file ? new URL(file,document.baseURI).href : undefined,
        updates:ready ? updateEntries() : [],
        inputCrc32:selected?.inputCrc32 ?? selectedRelease?.inputCrc32 ?? patchBaseRom.crc32,
        inputSize:selected?.inputSize ?? selectedRelease?.inputSize ?? patchBaseRom.size,
        outputCrc32:selected?.outputCrc32});
    } catch {
      finish({error:'패치 작업을 시작할 수 없습니다.'});
    }
  };
  refresh();
  return () => {
    request?.abort();
    worker?.terminate();
    if (url) URL.revokeObjectURL(url);
  };
}
let currentPage;
let cleanup;
let openSpecies;
function render() {
  const [requested,rawId] = location.hash.slice(1).split('/');
  const page = Object.hasOwn(sections,requested) ? requested : 'dex';
  let id;
  try { id = rawId ? decodeURIComponent(rawId) : undefined; } catch { id = rawId; }
  if (page === 'items') id = canonicalItemId(id);
  const dexPage = Object.hasOwn(filtersByPage,page);
  const previousSpecies = openSpecies;
  const cardRect = dexPage && id && instantDetailHash !== location.hash ? document.getElementById(id)?.getBoundingClientRect() : undefined;
  instantDetailHash = undefined;
  openSpecies = dexPage ? id : undefined;
  cleanup?.();
  cleanup = undefined;
  currentPage = page;
  nav.innerHTML = Object.entries(sections).map(([key,name]) => (key === 'patch' ? '<hr>' : '') + '<a href="' + href(key) + '"' + (page === key ? ' aria-current="page"' : '') + '>' + name + '</a>').join('');
  if (dexPage) dex(id,page);
  if (page === 'moves') moveCatalog(id);
  if (page === 'items') itemCatalog(id);
  if (page === 'abilities') abilityCatalog(id);
  if (page === 'guides') guidePage(id);
  if (page === 'notes') notes();
  if (page === 'patch') cleanup = patch();
  const pageTitle = page === 'items' && id ? itemName(id)
    : id && ['dex','pokemon','moves','abilities'].includes(page) ? title(page,id) : sections[page];
  document.title = pageTitle + ' · 디골 2 위키';
  if (openSpecies && document.querySelector('#dex-detail')) {
    const heading = document.querySelector('#species-name');
    heading.focus({preventScroll:true});
    const panel = document.querySelector('#dex-detail');
    panel.scrollIntoView({block:'start'});
    detailMotion(panel,cardRect);
  } else if (dexPage && previousSpecies && document.getElementById(previousSpecies)) {
    const card = document.getElementById(previousSpecies);
    card.focus({preventScroll:true});
    card.scrollIntoView({block:'start'});
  } else {
    window.scrollTo(0,dexPage ? filtersByPage[page].scroll : 0);
  }
}
history.scrollRestoration = 'manual';
window.addEventListener('scroll',() => { if (!openSpecies && filtersByPage[currentPage]) filtersByPage[currentPage].scroll = window.scrollY; },{passive:true});
window.addEventListener('hashchange',render);
window.addEventListener('resize', () => {
  const panel = document.querySelector('#dex-detail');
  if (panel) {
    positionDetail(panel);
    fitEvolutionNames(panel);
  }
});
document.querySelector('#menu-button').onclick = () => menu.showModal();
document.querySelector('#menu-close').onclick = () => menu.close();
nav.onclick = event => { if (event.target.closest('a')) menu.close(); };
menu.onclick = event => {
  if (event.target !== menu) return;
  const box = menu.getBoundingClientRect();
  if (event.clientX < box.left || event.clientX > box.right || event.clientY < box.top || event.clientY > box.bottom) menu.close();
};
render();
