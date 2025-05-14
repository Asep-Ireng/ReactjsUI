// src/App.jsx
import React, { useState, useEffect, useMemo } from 'react';
import Papa from 'papaparse';
import './App.css'; // Ensure your App.css has all the styles we've added
import md5 from 'md5';
import Select from 'react-select'; // For searchable dropdown
import pako from 'pako'; // Import pako

// File paths
const CSV_CHARACTER_FILE_PATH = '/data/wai_characters.csv';
const JSON_CHARACTER_FILE_PATH = '/data/wai_zh_tw.json';
const JSON_ACTION_FILE_PATH = '/data/wai_action.json';
const JSON_SETTINGS_FILE_PATH = '/data/settings.json';
const JSON_PRIMARY_THUMBS_FILE_PATH = '/data/wai_character_thumbs.json';
const JSON_FALLBACK_THUMBS_FILE_PATH = '/data/wai_image.json';
const API_MODEL_LIST_ENDPOINT = 'http://localhost:3001/api/get-models';

const LANG = {
  character1: 'Character list 1', character2: 'Character list 2', character3: 'Character list 3',
  enableActionLabel: 'Enable Action', actionListLabel: 'Action list',
  api_model_file_select: 'Model list', random_seed: 'Random Seed',
  custom_prompt: 'Custom Prompt (Head)', api_neg_prompt: 'Negative Prompt',
  samplingMethodLabel: 'Sampling Method', samplerDescriptionLabel: 'Description',
  schedulerLabel: 'Scheduler', schedulerDescriptionLabel: 'Scheduler Description',
  thumbImageGalleryLabel: "Thumb Image Gallery",
};
const DEFAULT_THUMB_SRC = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='100' height='100' viewBox='0 0 100 100'%3E%3Crect width='100' height='100' fill='%23555'/%3E%3Ctext x='50%25' y='50%25' dominant-baseline='middle' text-anchor='middle' font-family='sans-serif' font-size='12px' fill='%23fff'%3ENo Thumb%3C/text%3E%3C/svg%3E";

// --- Custom styles for react-select ---
const selectStyles = {
  control: (p,s)=>({...p, backgroundColor:'#2c313a', borderColor:s.isFocused?'#61dafb':'#4f5666', boxShadow:s.isFocused?'0 0 0 1px #61dafb':null, '&:hover':{borderColor:s.isFocused?'#61dafb':'#5a6275'}, minHeight:'40px'}),
  menu: (p)=>({...p, backgroundColor:'#2c313a', zIndex:10}),
  option: (p,s)=>({...p, backgroundColor:s.isSelected?'#61dafb':s.isFocused?'#353941':'#2c313a', color:s.isSelected?'#20232a':'#abb2bf', '&:active':{backgroundColor:'#52b6d9'}, padding:'8px 12px', cursor:'pointer'}),
  singleValue: (p)=>({...p, color:'#abb2bf'}),
  input: (p)=>({...p, color:'#abb2bf'}),
  placeholder: (p)=>({...p, color:'#888'}),
  indicatorSeparator: ()=>(null),
  dropdownIndicator: (p)=>({...p, color:'#abb2bf', '&:hover':{color:'#61dafb'}}),
};

// --- Modal Component ---
const ImageModal = ({ src, onClose }) => {
  if (!src) return null;
  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <img src={src} alt="Full size character" />
        <button onClick={onClose} className="modal-close-button">Close</button>
      </div>
    </div>
  );
};

function App() {
  // State for text inputs & fetched raw data
  const [promptText, setPromptText] = useState(''); const [negativePromptText, setNegativePromptText] = useState('');
  const [rawCsvData, setRawCsvData] = useState(null); const [rawCharacterJsonData, setRawCharacterJsonData] = useState(null);
  const [rawActionJsonData, setRawActionJsonData] = useState(null); const [rawModelListData, setRawModelListData] = useState(null);
  const [appSettings, setAppSettings] = useState(null); const [rawPrimaryThumbsData, setRawPrimaryThumbsData] = useState(null);
  const [rawFallbackThumbsData, setRawFallbackThumbsData] = useState(null); const [dataLoadingError, setDataLoadingError] = useState(null);

  // State for UI elements
  const [selectedCharacter1, setSelectedCharacter1] = useState(''); const [selectedCharacter2, setSelectedCharacter2] = useState(''); const [selectedCharacter3, setSelectedCharacter3] = useState('');
  const [resolvedCharacter1Tags, setResolvedCharacter1Tags] = useState(''); const [resolvedCharacter2Tags, setResolvedCharacter2Tags] = useState(''); const [resolvedCharacter3Tags, setResolvedCharacter3Tags] = useState('');
  const [character1ThumbSrc, setCharacter1ThumbSrc] = useState(DEFAULT_THUMB_SRC); const [character2ThumbSrc, setCharacter2ThumbSrc] = useState(DEFAULT_THUMB_SRC); const [character3ThumbSrc, setCharacter3ThumbSrc] = useState(DEFAULT_THUMB_SRC);
  const [enableAction, setEnableAction] = useState(false); const [selectedAction, setSelectedAction] = useState('none');
  const [selectedModel, setSelectedModel] = useState(''); const [seed, setSeed] = useState('-1'); const MAX_SEED = 4294967295;
  const [selectedSampler, setSelectedSampler] = useState(''); const [samplerDescription, setSamplerDescription] = useState('');
  const [selectedScheduler, setSelectedScheduler] = useState(''); const [schedulerDescription, setSchedulerDescription] = useState('');
  const [hoveredCharacterPreviewSrc, setHoveredCharacterPreviewSrc] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false); const [modalImageSrc, setModalImageSrc] = useState('');

  // Fetch all data
  useEffect(() => {
    const fetchData = async () => {
      try {
        const responses = await Promise.all([
          fetch(CSV_CHARACTER_FILE_PATH).catch(e => ({ ok: false, statusText: `CSV: ${e.message||'Fetch error'}`})),
          fetch(JSON_CHARACTER_FILE_PATH).catch(e => ({ ok: false, statusText: `CharJSON: ${e.message||'Fetch error'}`})),
          fetch(JSON_ACTION_FILE_PATH).catch(e => ({ ok: false, statusText: `ActionJSON: ${e.message||'Fetch error'}`})),
          fetch(API_MODEL_LIST_ENDPOINT).catch(e => ({ ok: false, statusText: `ModelAPI: ${e.message||'Fetch error'}`})),
          fetch(JSON_SETTINGS_FILE_PATH).catch(e => ({ ok: false, statusText: `SettingsJSON: ${e.message||'Fetch error'}`})),
          fetch(JSON_PRIMARY_THUMBS_FILE_PATH).catch(e => ({ ok: false, statusText: `PrimaryThumbs: ${e.message||'Fetch error'}`})),
          fetch(JSON_FALLBACK_THUMBS_FILE_PATH).catch(e => ({ ok: false, statusText: `FallbackThumbs: ${e.message||'Fetch error'}`}))
        ]);

        const [csvRes, charJsonRes, actionJsonRes, modelListRes, settingsRes, primaryThumbsRes, fallbackThumbsRes] = responses;

        if (!csvRes.ok) throw new Error(csvRes.statusText); setRawCsvData(await csvRes.text());
        if (!charJsonRes.ok) throw new Error(charJsonRes.statusText); setRawCharacterJsonData(await charJsonRes.json());
        if (!actionJsonRes.ok) throw new Error(actionJsonRes.statusText); setRawActionJsonData(await actionJsonRes.json());
        if (!modelListRes.ok) { const e = await modelListRes.json().catch(()=>({error:"API Error"})); throw new Error(e.message||e.error||modelListRes.statusText); } setRawModelListData(await modelListRes.json());
        if (!settingsRes.ok) throw new Error(settingsRes.statusText); setAppSettings(await settingsRes.json());
        if (!primaryThumbsRes.ok) throw new Error(primaryThumbsRes.statusText); setRawPrimaryThumbsData(await primaryThumbsRes.json());
        if (!fallbackThumbsRes.ok) throw new Error(fallbackThumbsRes.statusText); setRawFallbackThumbsData(await fallbackThumbsRes.json());

      } catch (error) { console.error("Error fetching data:", error); setDataLoadingError(error.toString()); }
    };
    fetchData();
  }, []);

  // Memoized options
  const characterDropdownOptions = useMemo(() => { if(!rawCsvData || !rawCharacterJsonData) return [{ label: 'Loading Characters...', value: '' },{ label: 'Random', value: 'random' },{ label: 'None', value: 'none' }]; const m={}; const pC=Papa.parse(rawCsvData,{skipEmptyLines:true}); if(pC.data){pC.data.forEach(r=>{if(r.length>=2){const oN=r[0]?.trim();const eT=r[1]?.trim();if(oN&&eT)m[oN]=eT;}}); } Object.assign(m,rawCharacterJsonData); const eTS=Object.values(m); const uETS=[...new Set(eTS)]; const o=uETS.map(tS=>({label:tS,value:tS})); return [{ label: 'Random', value: 'random' },{ label: 'None', value: 'none' },...o];}, [rawCsvData, rawCharacterJsonData]);
  const actualCharacterOptionsForRandom = useMemo(() => { if (!rawCsvData || !rawCharacterJsonData) return []; const m={}; const pC=Papa.parse(rawCsvData,{skipEmptyLines:true}); if(pC.data){pC.data.forEach(r=>{if(r.length>=2){const oN=r[0]?.trim();const eT=r[1]?.trim();if(oN&&eT)m[oN]=eT;}}); } Object.assign(m,rawCharacterJsonData); const eTS=Object.values(m); return [...new Set(eTS)]; }, [rawCsvData, rawCharacterJsonData]);
  const actionOptions = useMemo(() => { if(!rawActionJsonData) return [{ label: 'Loading Actions...', value: '' },{ label: 'None', value: 'none' }]; const o=Object.entries(rawActionJsonData).map(([l,v])=>({label:l,value:v})); return [{ label: 'None', value: 'none' },...o];}, [rawActionJsonData]);
  const modelDropdownOptions = useMemo(() => { if(!rawModelListData) return [{ label: 'Loading Models...', value: '' }]; return rawModelListData.map(mN=>({label:mN,value:mN}));}, [rawModelListData]);
  const samplerOptions = useMemo(() => { if (!appSettings || !appSettings.api_sampling_list) return [{ label: 'Loading Samplers...', value: '' }]; return appSettings.api_sampling_list.map(s => ({label:s.name,value:s.name,description:s.description}));}, [appSettings]);
  const schedulerOptions = useMemo(() => { if (!appSettings || !appSettings.api_scheduler_list) return [{ label: 'Loading Schedulers...', value: '' }]; return appSettings.api_scheduler_list.map(s => ({label:s.name,value:s.name,description:s.description}));}, [appSettings]);
  const mergedThumbData = useMemo(() => { if (!rawPrimaryThumbsData && !rawFallbackThumbsData) return null; const fT={...(rawPrimaryThumbsData||{})}; if(rawFallbackThumbsData){Object.entries(rawFallbackThumbsData).forEach(([eTK,bD])=>{try{const kSFH=eTK.replace(/\(/g,'\\(').replace(/\)/g,'\\)'); const mK=md5(kSFH); if(!(mK in fT))fT[mK]=bD;}catch(e){console.error(`Error merging fallback thumb for ${eTK}:`, e)}}); } return fT;}, [rawPrimaryThumbsData, rawFallbackThumbsData]);

  // Helper for getting character display data
  const getCharacterDisplayData = (characterValue, actualOptions, mergedThumbs) => {
    let resolvedTags = characterValue; let thumbSrc = DEFAULT_THUMB_SRC;
    if (characterValue === 'random') { if (actualOptions && actualOptions.length > 0) { const randomIndex = Math.floor(Math.random() * actualOptions.length); resolvedTags = actualOptions[randomIndex]; } else { resolvedTags = 'none'; } }
    if (resolvedTags && resolvedTags !== 'none' && resolvedTags !== 'random') {
      const keyForHash = resolvedTags.replace(/\(/g, '\\(').replace(/\)/g, '\\)');
      const md5Key = md5(keyForHash);
      let base64DataFromJSON = mergedThumbs ? mergedThumbs[md5Key] : null;
      if (base64DataFromJSON) {
        try {
          if (base64DataFromJSON.startsWith('data:image/') && base64DataFromJSON.includes(';base64,')) {
            const parts = base64DataFromJSON.split(';base64,'); const mimeType = parts[0]; let base64Payload = parts[1];
            if (base64Payload.startsWith('H4sI')) {
              const gzippedBytes = Uint8Array.from(atob(base64Payload), c => c.charCodeAt(0)); const decompressedBytes = pako.inflate(gzippedBytes);
              let newBase64Payload = ''; decompressedBytes.forEach(byte => { newBase64Payload += String.fromCharCode(byte); }); base64Payload = btoa(newBase64Payload);
              thumbSrc = `${mimeType};base64,${base64Payload}`;
            } else { thumbSrc = base64DataFromJSON; }
          } else { console.warn(`Unexpected base64Data format for ${resolvedTags}`); }
        } catch (e) { console.error(`Error processing base64 for ${resolvedTags}:`, e); thumbSrc = DEFAULT_THUMB_SRC; }
      }
    }
    return { resolvedTags, thumbSrc };
  };

  // useEffects for default selections & thumbnail updates
  useEffect(() => { if (characterDropdownOptions.length > 2 && !characterDropdownOptions[0].label.startsWith('Loading')) { setSelectedCharacter1(characterDropdownOptions.find(o=>o.value==='random')?.value||characterDropdownOptions[0].value); setSelectedCharacter2(characterDropdownOptions.find(o=>o.value==='none')?.value||characterDropdownOptions[1].value); setSelectedCharacter3(characterDropdownOptions.find(o=>o.value==='none')?.value||characterDropdownOptions[1].value); }}, [characterDropdownOptions]);
useEffect(() => {
  if (mergedThumbData && actualCharacterOptionsForRandom) {
    const { resolvedTags, thumbSrc } = getCharacterDisplayData(selectedCharacter1, actualCharacterOptionsForRandom, mergedThumbData);
    setResolvedCharacter1Tags(resolvedTags); // This sets the actual tags used
    setCharacter1ThumbSrc(thumbSrc);
  }
}, [selectedCharacter1, actualCharacterOptionsForRandom, mergedThumbData]); // Only depends on user's selection and data
  useEffect(() => { if (mergedThumbData && actualCharacterOptionsForRandom) { const { resolvedTags, thumbSrc } = getCharacterDisplayData(selectedCharacter2, actualCharacterOptionsForRandom, mergedThumbData); if (selectedCharacter2 === 'random' || resolvedCharacter2Tags !== resolvedTags) {setResolvedCharacter2Tags(resolvedTags);} setCharacter2ThumbSrc(thumbSrc); }}, [selectedCharacter2, actualCharacterOptionsForRandom, mergedThumbData, resolvedCharacter2Tags]);
  useEffect(() => { if (mergedThumbData && actualCharacterOptionsForRandom) { const { resolvedTags, thumbSrc } = getCharacterDisplayData(selectedCharacter3, actualCharacterOptionsForRandom, mergedThumbData); if (selectedCharacter3 === 'random' || resolvedCharacter3Tags !== resolvedTags) {setResolvedCharacter3Tags(resolvedTags);} setCharacter3ThumbSrc(thumbSrc); }}, [selectedCharacter3, actualCharacterOptionsForRandom, mergedThumbData, resolvedCharacter3Tags]);
  useEffect(() => { if (!enableAction) setSelectedAction('none'); else if (actionOptions.length > 1 && !actionOptions[0].label.startsWith('Loading')) { const cAIV = actionOptions.some(opt => opt.value === selectedAction); if (!cAIV || selectedAction === 'none') setSelectedAction(actionOptions.find(opt => opt.value !== 'none')?.value || 'none'); }}, [actionOptions, enableAction, selectedAction]);
  useEffect(() => { if (modelDropdownOptions.length > 0 && !modelDropdownOptions[0].label.startsWith('Loading')) { const dM = modelDropdownOptions.find(opt => opt.value === 'default'); setSelectedModel(dM ? dM.value : modelDropdownOptions[0].value); }}, [modelDropdownOptions]);
  useEffect(() => { if (samplerOptions.length > 0 && !samplerOptions[0].label.startsWith('Loading') && appSettings) { const dSV = appSettings.api_sampling_selected || samplerOptions[0].value; setSelectedSampler(dSV); const sO = samplerOptions.find(opt => opt.value === dSV); setSamplerDescription(sO ? sO.description : ''); }}, [samplerOptions, appSettings]);
  useEffect(() => { if (schedulerOptions.length > 0 && !schedulerOptions[0].label.startsWith('Loading') && appSettings) { const dSchV = appSettings.api_scheduler_selected || schedulerOptions[0].value; setSelectedScheduler(dSchV); const sO = schedulerOptions.find(opt => opt.value === dSchV); setSchedulerDescription(sO ? sO.description : ''); }}, [schedulerOptions, appSettings]);

  // Event Handlers
  const handlePromptChange=(e)=>setPromptText(e.target.value); const handleNegativePromptChange=(e)=>setNegativePromptText(e.target.value);
const handleCharacter1Change = (selectedOpt) => {
  const newValue = selectedOpt ? selectedOpt.value : 'none';
  setSelectedCharacter1(newValue); // Sets the user's direct intent
  setHoveredCharacterPreviewSrc(null);
};
  const handleCharacter2Change=(e)=>setSelectedCharacter2(e.target.value); const handleCharacter3Change=(e)=>setSelectedCharacter3(e.target.value);
  const handleEnableActionChange=(e)=>setEnableAction(e.target.checked); const handleActionChange=(e)=>setSelectedAction(e.target.value);
  const handleModelChange=(e)=>setSelectedModel(e.target.value);
  const handleSeedInputChange=(e)=>{const v=e.target.value;if(v===''||v==='-'||!isNaN(v))setSeed(v);}; const handleSeedSliderChange=(e)=>setSeed(e.target.value); const randomizeSeed=()=>setSeed('-1');
  const handleSamplerChange=(e)=>{const nSV=e.target.value;setSelectedSampler(nSV);const sO=samplerOptions.find(o=>o.value===nSV);setSamplerDescription(sO?sO.description:'');};
  const handleSchedulerChange=(e)=>{const nSchV=e.target.value;setSelectedScheduler(nSchV);const sO=schedulerOptions.find(o=>o.value===nSchV);setSchedulerDescription(sO?sO.description:'');};
  const handleThumbnailClick = (src) => { if (src && src !== DEFAULT_THUMB_SRC) { setModalImageSrc(src); setIsModalOpen(true); }};

  const handleSubmit = () => { const fC1=selectedCharacter1==='random'?resolvedCharacter1Tags:selectedCharacter1; const fC2=selectedCharacter2==='random'?resolvedCharacter2Tags:selectedCharacter2; const fC3=selectedCharacter3==='random'?resolvedCharacter3Tags:selectedCharacter3; console.log({promptText,negativePromptText,selectedCharacter1:fC1,selectedCharacter2:fC2,selectedCharacter3:fC3,enableAction,selectedAction,selectedModel,seed,selectedSampler,selectedScheduler}); alert(`C1:${fC1}\nC2:${fC2}\nC3:${fC3}\nAct:${enableAction?selectedAction:'N(D)'}\nMod:${selectedModel}\nSeed:${seed}\nSamp:${selectedSampler}\nSch:${selectedScheduler}`);};

  // --- react-select custom Option component for hover preview ---
  const SelectOptionWithHoverPreview = (props) => {
    const { data } = props;
    const handleMouseEnter = () => {
      if (data.value && data.value !== 'random' && data.value !== 'none' && mergedThumbData && actualCharacterOptionsForRandom) {
        const { thumbSrc } = getCharacterDisplayData(data.value, actualCharacterOptionsForRandom, mergedThumbData);
        setHoveredCharacterPreviewSrc(thumbSrc);
      } else { setHoveredCharacterPreviewSrc(null); }
    };
    const handleMouseLeave = () => { setHoveredCharacterPreviewSrc(null); };
    return ( <div {...props.innerProps} onMouseEnter={handleMouseEnter} onMouseLeave={handleMouseLeave} style={{backgroundColor:props.isSelected?'#61dafb':props.isFocused?'#353941':'#2c313a', color:props.isSelected?'#20232a':'#abb2bf', padding:'8px 12px', cursor:'pointer'}}> {props.label} </div> );
  };
  const selectComponents = { Option: SelectOptionWithHoverPreview };

  // Loading/Error checks
  if(dataLoadingError)return <div className="app-container error-message">Error: {dataLoadingError}</div>;
  if(!rawCsvData||!rawCharacterJsonData||!rawActionJsonData||!rawModelListData||!appSettings||!mergedThumbData)return <div className="app-container loading-message">Loading data...</div>;
  
  const currentSliderValue = seed==='-1'||seed===''||isNaN(parseInt(seed))||parseInt(seed)<0?"0":(parseInt(seed)>MAX_SEED?MAX_SEED.toString():seed);
  
  // --- ADDED THIS LOGIC BACK IN ---
  const displayValueForChar1Select =
    selectedCharacter1 === 'random' && resolvedCharacter1Tags && resolvedCharacter1Tags !== 'random' && resolvedCharacter1Tags !== 'none'
      ? resolvedCharacter1Tags
      : selectedCharacter1;
let char1DisplayValueToFind = selectedCharacter1;
if (selectedCharacter1 === 'random' && resolvedCharacter1Tags && resolvedCharacter1Tags !== 'random' && resolvedCharacter1Tags !== 'none') {
  char1DisplayValueToFind = resolvedCharacter1Tags;
}
const char1SelectValueObject = characterDropdownOptions.find(
  (option) => option.value === char1DisplayValueToFind
) || characterDropdownOptions.find(o => o.value === selectedCharacter1) || null;

  // --- END OF ADDED LOGIC ---


  return (
    <div className="app-container">
      <h1>My ComfyUI Frontend</h1>
      {hoveredCharacterPreviewSrc && ( <div className="hover-preview-container"><img src={hoveredCharacterPreviewSrc} alt="Hover preview" className="hover-preview-image" /></div> )}
      {/* Row 1: Characters & Action */}
      <div className="input-row">
        <div className="input-group">
          <label htmlFor="character-list-1">{LANG.character1}:</label>
          <Select id="character-list-1" options={characterDropdownOptions.filter(o=>!o.label.startsWith('Loading'))} value={char1SelectValueObject} onChange={handleCharacter1Change} styles={selectStyles} placeholder="Search/select..." isClearable isLoading={characterDropdownOptions[0]?.label.startsWith('Loading')} components={selectComponents} />
        </div>
        {/* Using native select for C2 & C3 for now */}
        <div className="input-group"><label htmlFor="c2">{LANG.character2}:</label><select id="c2" value={selectedCharacter2} onChange={handleCharacter2Change} disabled={characterDropdownOptions[0]?.label.startsWith('Loading')}>{characterDropdownOptions.map(o=><option key={"c2"+o.value+o.label} value={o.value}>{o.label}</option>)}</select></div>
        <div className="input-group"><label htmlFor="c3">{LANG.character3}:</label><select id="c3" value={selectedCharacter3} onChange={handleCharacter3Change} disabled={characterDropdownOptions[0]?.label.startsWith('Loading')}>{characterDropdownOptions.map(o=><option key={"c3"+o.value+o.label} value={o.value}>{o.label}</option>)}</select></div>
        <div className="input-group action-group"><div className="checkbox-group"><input type="checkbox" id="ea" checked={enableAction} onChange={handleEnableActionChange}/><label htmlFor="ea">{LANG.enableActionLabel}</label></div>{enableAction && (<><label htmlFor="al" className="action-dropdown-label">{LANG.actionListLabel}:</label><select id="al" value={selectedAction} onChange={handleActionChange} disabled={actionOptions[0]?.label.startsWith('Loading')}>{actionOptions.map(o=><option key={"act"+o.value+o.label} value={o.value}>{o.label}</option>)}</select></>)}</div>
      </div>
      {/* Row 2: Model & Seed */}
      <div className="input-row">
        <div className="input-group"><label htmlFor="ml">{LANG.api_model_file_select}:</label><select id="ml" value={selectedModel} onChange={handleModelChange} disabled={modelDropdownOptions[0]?.label.startsWith('Loading')}>{modelDropdownOptions.map(o=><option key={"mod"+o.value+o.label} value={o.value}>{o.label}</option>)}</select></div>
        <div className="input-group seed-group"><label htmlFor="rs">{LANG.random_seed}:</label><div className="seed-input-container"><input type="text" id="rs" value={seed} onChange={handleSeedInputChange} className="seed-input-field" placeholder="-1"/><button onClick={randomizeSeed} className="random-seed-button" title="Rnd">&#x21BB;</button></div><input type="range" min="0" max={MAX_SEED.toString()} value={currentSliderValue} onChange={handleSeedSliderChange} className="seed-slider" /><div className="seed-range-labels"><span>0</span><span>{seed==='-1'||seed===''?'(R)':(isNaN(parseInt(seed))?'(I)':seed)}</span><span>{MAX_SEED}</span></div></div>
      </div>
      {/* Row 3: Sampler & Description */}
      <div className="input-row">
        <div className="input-group"><label htmlFor="sl">{LANG.samplingMethodLabel}:</label><select id="sl" value={selectedSampler} onChange={handleSamplerChange} disabled={samplerOptions[0]?.label.startsWith('L')}>{samplerOptions.map(o=><option key={"samp"+o.value+o.label} value={o.value}>{o.label}</option>)}</select></div>
        <div className="input-group description-group"><label htmlFor="sd">{LANG.samplerDescriptionLabel}:</label><textarea id="sd" value={samplerDescription} readOnly rows={3} /></div>
      </div>
      {/* Row 4: Scheduler & Description */}
      <div className="input-row">
        <div className="input-group"><label htmlFor="schl">{LANG.schedulerLabel}:</label><select id="schl" value={selectedScheduler} onChange={handleSchedulerChange} disabled={schedulerOptions[0]?.label.startsWith('L')}>{schedulerOptions.map(o=><option key={"sch"+o.value+o.label} value={o.value}>{o.label}</option>)}</select></div>
        <div className="input-group description-group"><label htmlFor="schd">{LANG.schedulerDescriptionLabel}:</label><textarea id="schd" value={schedulerDescription} readOnly rows={3} /></div>
      </div>
      {/* Thumb Image Gallery */}
      <div className="input-row">
        <div className="input-group thumb-gallery-group">
          <label>{LANG.thumbImageGalleryLabel}:</label>
          <div className="thumbnail-container">
            <img src={character1ThumbSrc} alt={resolvedCharacter1Tags||'C1'} className="character-thumbnail" onClick={()=>handleThumbnailClick(character1ThumbSrc)}/>
            <img src={character2ThumbSrc} alt={resolvedCharacter2Tags||'C2'} className="character-thumbnail" onClick={()=>handleThumbnailClick(character2ThumbSrc)}/>
            <img src={character3ThumbSrc} alt={resolvedCharacter3Tags||'C3'} className="character-thumbnail" onClick={()=>handleThumbnailClick(character3ThumbSrc)}/>
          </div>
        </div>
      </div>
      {/* Prompts & Button */}
      <div className="prompt-section"><label htmlFor="cp">{LANG.custom_prompt}:</label><textarea id="cp" value={promptText} onChange={handlePromptChange} rows={5} /></div>
      <div className="prompt-section"><label htmlFor="np">{LANG.api_neg_prompt}:</label><textarea id="np" value={negativePromptText} onChange={handleNegativePromptChange} rows={5} /></div>
      <button onClick={handleSubmit} className="submit-button">Test Log Data</button>

      {isModalOpen && <ImageModal src={modalImageSrc} onClose={() => setIsModalOpen(false)} />}
    </div>
  );
}
export default App;
