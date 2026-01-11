import React, { useState } from 'react';
import { Search, Plus, Play, Pause, ExternalLink, Sparkles, Users, Mic, Library, Home, ChevronRight, X, Check, ArrowRight, Headphones, Loader2 } from 'lucide-react';

const initialDatabase = [
  { id: 1, name: "Lex Fridman", image: "https://upload.wikimedia.org/wikipedia/commons/thumb/4/42/Lex_Fridman_teaching_2018.png/220px-Lex_Fridman_teaching_2018.png", category: "Tech", bio: "AI researcher and podcaster at MIT" },
  { id: 2, name: "Brené Brown", image: "https://upload.wikimedia.org/wikipedia/commons/thumb/a/a4/Bren%C3%A9_Brown_2022.jpg/220px-Bren%C3%A9_Brown_2022.jpg", category: "Psychology", bio: "Research professor studying vulnerability and courage" },
  { id: 3, name: "Tim Ferriss", image: "https://upload.wikimedia.org/wikipedia/commons/thumb/2/2e/Tim_Ferriss_2019_%28cropped%29.jpg/220px-Tim_Ferriss_2019_%28cropped%29.jpg", category: "Business", bio: "Author of The 4-Hour Workweek and podcaster" },
];

const podcasts = [
  { name: "The Joe Rogan Experience", image: "https://i.scdn.co/image/ab6765630000ba8a4e03c1a17d0e74ff57393edc" },
  { name: "Huberman Lab", image: "https://i.scdn.co/image/ab6765630000ba8a4e03c1a17d0e74ff57393edc" },
  { name: "The Tim Ferriss Show", image: "https://i.scdn.co/image/ab6765630000ba8a87dce56c498e234724a35ed5" },
];

const generateEpisodes = (people, weeks = 4) => {
  const titles = ['Deep Dive', 'Life Lessons', 'Career Insights', 'Masterclass', 'The Future'];
  return people.flatMap((person, pi) => 
    Array.from({ length: Math.floor(Math.random() * 2) + 1 }, (_, i) => {
      const daysAgo = Math.floor(Math.random() * weeks * 7);
      const date = new Date(); date.setDate(date.getDate() - daysAgo);
      const pod = podcasts[Math.floor(Math.random() * podcasts.length)];
      return { id: `${person.id}-${i}`, guestId: person.id, guestName: person.name, guestImage: person.image,
        title: `${titles[Math.floor(Math.random() * titles.length)]} with ${person.name}`,
        podcast: pod.name, podcastImage: pod.image, duration: `${Math.floor(Math.random()*2)+1}:${String(Math.floor(Math.random()*60)).padStart(2,'0')}:00`, date, daysAgo };
    })
  ).sort((a,b) => a.daysAgo - b.daysAgo);
};

const formatDate = d => { const days = Math.floor((new Date()-d)/(1000*60*60*24)); return days===0?'Today':days===1?'Yesterday':days<7?`${days} days ago`:`${Math.floor(days/7)} weeks ago`; };

export default function PodTrackr() {
  const [db, setDb] = useState(initialDatabase);
  const [state, setState] = useState('name');
  const [username, setUsername] = useState('');
  const [inputs, setInputs] = useState(['','','']);
  const [followed, setFollowed] = useState([]);
  const [episodes, setEpisodes] = useState([]);
  const [queue, setQueue] = useState([]);
  const [qIdx, setQIdx] = useState(0);
  const [swipeDir, setSwipeDir] = useState(null);
  const [animating, setAnimating] = useState(false);
  const [dragStart, setDragStart] = useState(null);
  const [dragX, setDragX] = useState(0);
  const [dragging, setDragging] = useState(false);
  const [tab, setTab] = useState('discover');
  const [filter, setFilter] = useState('all');
  const [weeks, setWeeks] = useState(4);
  const [loading, setLoading] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [curEp, setCurEp] = useState(null);
  const [showPlayer, setShowPlayer] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiProgress, setAiProgress] = useState(0);
  const [aiStatus, setAiStatus] = useState('');
  const [showAdd, setShowAdd] = useState(false);
  const [showAI, setShowAI] = useState(false);
  const [searchQ, setSearchQ] = useState('');
  const [searchRes, setSearchRes] = useState([]);
  const [searching, setSearching] = useState(false);

  const getImage = async (name) => {
    try {
      const r = await fetch(`https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(name.replace(/ /g,'_'))}`);
      if (r.ok) { const d = await r.json(); if (d.thumbnail?.source) return d.thumbnail.source; }
    } catch(e) {}
    return `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&size=200&background=6366f1&color=fff&bold=true`;
  };

  const callAI = async (prompt) => {
    try {
      const r = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ model: "claude-sonnet-4-20250514", max_tokens: 1000, messages: [{ role: "user", content: prompt }] })
      });
      const d = await r.json();
      const txt = d.content?.find(c => c.type === 'text')?.text || '';
      return JSON.parse(txt.replace(/```json\n?/g,'').replace(/```\n?/g,'').trim());
    } catch(e) { console.error(e); return null; }
  };

  const processAI = async () => {
    setAiLoading(true); setAiProgress(0); setAiStatus('Analyzing your interests...');
    const names = inputs.filter(n => n.trim());
    try {
      setAiProgress(15); setAiStatus('AI is finding similar people...');
      const result = await callAI(`User wants to follow: ${names.join(', ')}. Return ONLY JSON: {"corrected":["Name1","Name2","Name3"],"suggestions":[{"name":"Name","category":"Cat","bio":"Bio"}]} with 10 suggestions of podcast guests they'd like. Categories: Tech, Science, Business, Psychology, Entertainment, Health, Authors.`);
      if (!result) throw new Error('AI failed');
      
      setAiProgress(40); setAiStatus('Loading profiles...');
      let newDb = [...db], nextId = Math.max(...db.map(p=>p.id))+1, matched = [];
      
      for (const name of result.corrected || names) {
        setAiStatus(`Finding ${name}...`);
        let p = newDb.find(x => x.name.toLowerCase() === name.toLowerCase());
        if (!p) { const img = await getImage(name); p = {id:nextId++,name,image:img,category:'Guest',bio:'Podcast guest'}; newDb.push(p); }
        matched.push(p);
      }
      
      setAiProgress(60); setAiStatus('Preparing suggestions...');
      const suggested = [];
      for (let i = 0; i < (result.suggestions||[]).length; i++) {
        const s = result.suggestions[i];
        setAiStatus(`Loading ${s.name}...`); setAiProgress(60 + (i/result.suggestions.length)*35);
        let p = newDb.find(x => x.name.toLowerCase() === s.name.toLowerCase());
        if (!p) { const img = await getImage(s.name); p = {id:nextId++,name:s.name,image:img,category:s.category,bio:s.bio}; newDb.push(p); }
        else { p.bio = s.bio; p.category = s.category; }
        if (!matched.find(m => m.id === p.id)) suggested.push(p);
      }
      
      setDb(newDb); setFollowed(matched); setQueue(suggested); setQIdx(0);
      setAiProgress(100); setAiStatus('Done!');
      setTimeout(() => { setAiLoading(false); setState('swipe'); }, 500);
    } catch(e) {
      setAiStatus('Using fallback...'); setTimeout(() => { setQueue(db); setQIdx(0); setAiLoading(false); setState('swipe'); }, 1000);
    }
  };

  const searchPerson = async () => {
    if (!searchQ.trim()) return;
    setSearching(true); setSearchRes([]);
    const local = db.filter(p => p.name.toLowerCase().includes(searchQ.toLowerCase()) && !followed.find(f=>f.id===p.id));
    if (local.length) { setSearchRes(local); setSearching(false); return; }
    
    const result = await callAI(`Search for "${searchQ}" as a podcast guest. Return ONLY JSON: {"found":true,"name":"Full Name","category":"Cat","bio":"Bio"} or {"found":false,"suggestions":[{"name":"Name","category":"Cat","bio":"Bio"}]}`);
    if (result?.found) {
      let p = db.find(x => x.name.toLowerCase() === result.name.toLowerCase());
      if (!p) { const img = await getImage(result.name); p = {id:Math.max(...db.map(x=>x.id))+1,name:result.name,image:img,category:result.category,bio:result.bio}; setDb(prev=>[...prev,p]); }
      if (!followed.find(f=>f.id===p.id)) setSearchRes([p]);
    } else if (result?.suggestions) {
      const newP = [];
      for (const s of result.suggestions.slice(0,3)) {
        let p = db.find(x => x.name.toLowerCase() === s.name.toLowerCase());
        if (!p) { const img = await getImage(s.name); p = {id:Math.max(...db.map(x=>x.id),...newP.map(x=>x.id))+1,name:s.name,image:img,category:s.category,bio:s.bio}; newP.push(p); }
        if (!followed.find(f=>f.id===p.id)) setSearchRes(prev=>[...prev,p]);
      }
      if (newP.length) setDb(prev=>[...prev,...newP]);
    }
    setSearching(false);
  };

  const moreAI = async () => {
    setShowAI(true); setSearching(true); setSearchRes([]);
    const result = await callAI(`User follows: ${followed.map(p=>p.name).join(', ')}. Suggest 5 more podcast guests. Return ONLY JSON: {"suggestions":[{"name":"Name","category":"Cat","bio":"Bio"}]}`);
    if (result?.suggestions) {
      const newS = [];
      for (const s of result.suggestions) {
        let p = db.find(x => x.name.toLowerCase() === s.name.toLowerCase());
        if (!p) { const img = await getImage(s.name); p = {id:Math.max(...db.map(x=>x.id))+1,name:s.name,image:img,category:s.category,bio:s.bio}; setDb(prev=>[...prev,p]); }
        if (!followed.find(f=>f.id===p.id)) newS.push(p);
      }
      setSearchRes(newS);
    }
    setSearching(false);
  };

  const swipe = (dir) => {
    if (animating || qIdx >= queue.length) return;
    setSwipeDir(dir); setAnimating(true); setDragX(0); setDragging(false);
    setTimeout(() => {
      if (dir === 'right') setFollowed(prev => [...prev, queue[qIdx]]);
      setQIdx(prev => prev + 1); setSwipeDir(null); setAnimating(false);
    }, 300);
  };

  const onDragStart = e => { if (animating) return; setDragStart(e.type==='touchstart'?e.touches[0].clientX:e.clientX); setDragging(true); };
  const onDragMove = e => { if (!dragging||!dragStart||animating) return; setDragX((e.type==='touchmove'?e.touches[0].clientX:e.clientX)-dragStart); };
  const onDragEnd = () => { if (!dragging||animating) return; setDragging(false); if (Math.abs(dragX)>100) swipe(dragX>0?'right':'left'); else setDragX(0); setDragStart(null); };

  const finish = () => { setEpisodes(generateEpisodes(followed, weeks)); setState('main'); };
  const loadMore = () => { setLoading(true); setTimeout(() => { setWeeks(w=>w+4); setEpisodes(generateEpisodes(followed, weeks+4)); setLoading(false); }, 1500); };
  const addPerson = p => { if (!followed.find(f=>f.id===p.id)) { const nf = [...followed,p]; setFollowed(nf); setEpisodes(generateEpisodes(nf,weeks)); } setShowAdd(false); setSearchQ(''); setSearchRes([]); };
  const unfollow = id => { const nf = followed.filter(p=>p.id!==id); setFollowed(nf); setEpisodes(generateEpisodes(nf,weeks)); };

  const filtered = filter==='all' ? episodes : episodes.filter(e=>e.guestId===parseInt(filter));
  const card = queue[qIdx];
  const canSkip = followed.length >= 3;
  const canFinish = followed.length >= 10 || (qIdx >= queue.length && followed.length > 0);

  return (
    <div className="min-h-screen bg-sky-50 text-slate-800" style={{fontFamily:"system-ui"}}>
      <style>{`.text-gradient{background:linear-gradient(135deg,#f97316,#ec4899);-webkit-background-clip:text;-webkit-text-fill-color:transparent}.bg-grad{background:linear-gradient(135deg,#f97316,#ec4899 50%,#8b5cf6)}.swipe-card{transition:transform .3s,opacity .3s}.swipe-left{transform:translateX(-150%) rotate(-30deg)!important;opacity:0}.swipe-right{transform:translateX(150%) rotate(30deg)!important;opacity:0}.no-scroll::-webkit-scrollbar{display:none}`}</style>
      
      <div className="fixed inset-0 pointer-events-none"><div className="absolute top-0 left-1/4 w-96 h-96 bg-blue-200/40 rounded-full blur-3xl"/><div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-cyan-200/40 rounded-full blur-3xl"/></div>

      {state==='name' && (
        <div className="relative z-10 min-h-screen flex items-center justify-center p-6">
          <div className="w-full max-w-md">
            <div className="text-center mb-8">
              <div className="w-20 h-20 rounded-2xl bg-grad flex items-center justify-center mx-auto mb-6 shadow-lg"><Headphones className="w-10 h-10 text-white"/></div>
              <h1 className="text-3xl font-bold mb-2">Welcome to <span className="text-gradient">PodTrackr</span></h1>
              <p className="text-slate-500">Track podcast appearances of people you care about</p>
            </div>
            <div className="bg-white rounded-2xl p-6 shadow-xl">
              <label className="block text-sm font-medium text-slate-700 mb-2">What should we call you?</label>
              <input value={username} onChange={e=>setUsername(e.target.value)} placeholder="Enter your name" className="w-full bg-slate-50 border border-slate-200 rounded-xl py-3 px-4 text-lg focus:outline-none focus:border-orange-500"/>
              <button onClick={()=>username.trim()&&setState('input')} disabled={!username.trim()} className="w-full mt-4 py-3 rounded-xl bg-grad text-white font-medium disabled:opacity-50 flex items-center justify-center gap-2">Continue <ArrowRight className="w-4 h-4"/></button>
            </div>
          </div>
        </div>
      )}

      {state==='input'&&!aiLoading && (
        <div className="relative z-10 min-h-screen flex items-center justify-center p-6">
          <div className="w-full max-w-md">
            <div className="text-center mb-8"><h1 className="text-2xl font-bold mb-2">Hey {username}! 👋</h1><p className="text-slate-500">Enter at least 3 people you want to follow</p></div>
            <div className="bg-white rounded-2xl p-6 shadow-xl">
              <div className="space-y-3">
                {inputs.map((p,i)=>(
                  <div key={i}><label className="block text-sm font-medium text-slate-500 mb-1">Person {i+1}</label>
                  <input value={p} onChange={e=>{const n=[...inputs];n[i]=e.target.value;setInputs(n);}} placeholder={['e.g. Lex Fridman','e.g. Brené Brown','e.g. Tim Ferriss'][i]} className="w-full bg-slate-50 border border-slate-200 rounded-xl py-3 px-4 focus:outline-none focus:border-orange-500"/></div>
                ))}
              </div>
              <button onClick={processAI} disabled={inputs.filter(p=>p.trim()).length<3} className="w-full mt-6 py-3 rounded-xl bg-grad text-white font-medium disabled:opacity-50 flex items-center justify-center gap-2"><Sparkles className="w-4 h-4"/>Find Similar People with AI</button>
            </div>
          </div>
        </div>
      )}

      {aiLoading && (
        <div className="relative z-10 min-h-screen flex items-center justify-center p-6">
          <div className="w-full max-w-md text-center">
            <div className="w-24 h-24 rounded-full bg-grad flex items-center justify-center mx-auto mb-8 shadow-lg animate-pulse"><Sparkles className="w-12 h-12 text-white"/></div>
            <h2 className="text-2xl font-bold mb-4">AI is working...</h2>
            <p className="text-slate-500 mb-8">{aiStatus}</p>
            <div className="bg-white rounded-2xl p-6 shadow-xl"><div className="h-3 bg-slate-100 rounded-full overflow-hidden mb-2"><div className="h-full bg-grad transition-all duration-300" style={{width:`${aiProgress}%`}}/></div><p className="text-sm text-slate-400">{aiProgress}% complete</p></div>
          </div>
        </div>
      )}

      {state==='swipe' && (
        <div className="relative z-10 min-h-screen flex flex-col">
          <div className="p-4 flex items-center justify-between">
            <div className="text-sm text-slate-500">Following: <span className="font-bold text-slate-800">{followed.length}</span></div>
            {canSkip && <button onClick={finish} className="text-sm text-orange-500 font-medium">Skip →</button>}
          </div>
          <div className="px-4 mb-4"><div className="h-2 bg-slate-200 rounded-full overflow-hidden"><div className="h-full bg-grad transition-all" style={{width:`${Math.min((followed.length/10)*100,100)}%`}}/></div></div>
          <div className="flex-1 flex items-center justify-center p-6">
            {qIdx < queue.length && !canFinish ? (
              <div className="relative w-full max-w-sm">
                {queue[qIdx+1] && <div className="absolute inset-0 bg-white rounded-3xl shadow-lg scale-95 translate-y-4 opacity-50"/>}
                <div className={`swipe-card bg-white rounded-3xl shadow-xl overflow-hidden select-none ${swipeDir==='left'?'swipe-left':swipeDir==='right'?'swipe-right':''}`}
                  style={{transform:!swipeDir&&dragX?`translateX(${dragX}px) rotate(${dragX*0.05}deg)`:undefined,cursor:dragging?'grabbing':'grab'}}
                  onMouseDown={onDragStart} onMouseMove={onDragMove} onMouseUp={onDragEnd} onMouseLeave={onDragEnd}
                  onTouchStart={onDragStart} onTouchMove={onDragMove} onTouchEnd={onDragEnd}>
                  {dragX>50 && <div className="absolute top-8 left-8 z-10 px-4 py-2 border-4 border-green-500 text-green-500 font-bold text-2xl rounded-lg -rotate-12">FOLLOW</div>}
                  {dragX<-50 && <div className="absolute top-8 right-8 z-10 px-4 py-2 border-4 border-red-500 text-red-500 font-bold text-2xl rounded-lg rotate-12">NOPE</div>}
                  <div className="relative">
                    <img src={card.image} alt={card.name} className="w-full aspect-square object-cover bg-slate-200" style={{pointerEvents:'none'}}
                      onError={e=>{e.target.src=`https://ui-avatars.com/api/?name=${encodeURIComponent(card.name)}&size=400&background=6366f1&color=fff&bold=true`;}}/>
                    <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent"/>
                    <div className="absolute bottom-0 left-0 right-0 p-6 text-white">
                      <h2 className="text-2xl font-bold">{card.name}</h2>
                      <p className="text-white/80 text-sm mt-1">{card.bio}</p>
                      <span className="inline-block mt-2 px-3 py-1 bg-white/20 rounded-full text-xs">{card.category}</span>
                    </div>
                  </div>
                  <div className="p-6 flex justify-center gap-8">
                    <button type="button" onMouseDown={e=>e.stopPropagation()} onClick={e=>{e.stopPropagation();swipe('left');}} className="w-16 h-16 rounded-full bg-slate-100 flex items-center justify-center hover:bg-red-100 active:scale-95 transition-all shadow-md"><X className="w-8 h-8 text-slate-400 hover:text-red-500"/></button>
                    <button type="button" onMouseDown={e=>e.stopPropagation()} onClick={e=>{e.stopPropagation();swipe('right');}} className="w-16 h-16 rounded-full bg-grad flex items-center justify-center hover:scale-110 active:scale-95 transition-all shadow-lg"><Check className="w-8 h-8 text-white"/></button>
                  </div>
                </div>
                <p className="text-center text-slate-500 text-sm mt-4">Swipe or tap to choose</p>
              </div>
            ) : (
              <div className="text-center">
                <div className="w-24 h-24 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-6"><Check className="w-12 h-12 text-green-500"/></div>
                <h2 className="text-2xl font-bold mb-2">You're all set!</h2>
                <p className="text-slate-500 mb-6">Following {followed.length} people</p>
                <button onClick={finish} className="px-8 py-3 rounded-xl bg-grad text-white font-medium">Start Discovering</button>
              </div>
            )}
          </div>
          {followed.length>0 && qIdx<queue.length && !canFinish && (
            <div className="p-4 border-t border-slate-200 bg-white/50">
              <p className="text-xs text-slate-500 mb-2">Following:</p>
              <div className="flex gap-2 overflow-x-auto no-scroll">
                {followed.slice(-6).map(p=><img key={p.id} src={p.image} alt={p.name} className="w-10 h-10 rounded-full object-cover border-2 border-white shadow-sm bg-slate-200" onError={e=>{e.target.src=`https://ui-avatars.com/api/?name=${encodeURIComponent(p.name)}&size=80&background=6366f1&color=fff`;}}/>)}
                {followed.length>6 && <div className="w-10 h-10 rounded-full bg-slate-200 flex items-center justify-center text-xs font-medium">+{followed.length-6}</div>}
              </div>
            </div>
          )}
        </div>
      )}

      {state==='main' && (
        <div className="relative z-10 pb-32">
          <header className="sticky top-0 z-50 backdrop-blur-xl bg-white/80 border-b border-slate-200 shadow-sm">
            <div className="max-w-2xl mx-auto px-4 py-3 flex items-center justify-between">
              <div className="flex items-center gap-2"><div className="w-8 h-8 rounded-lg bg-grad flex items-center justify-center"><Headphones className="w-4 h-4 text-white"/></div><h1 className="text-lg font-bold">Pod<span className="text-gradient">Trackr</span></h1></div>
              <div className="flex items-center gap-2">
                <button onClick={()=>{setShowAdd(true);setSearchRes([]);setSearchQ('');}} className="p-2 rounded-lg hover:bg-slate-100"><Plus className="w-5 h-5 text-slate-600"/></button>
                <button onClick={moreAI} className="flex items-center gap-1 px-3 py-1.5 bg-grad rounded-full text-xs font-medium text-white"><Sparkles className="w-3 h-3"/>AI</button>
              </div>
            </div>
          </header>
          <nav className="sticky top-[57px] z-40 backdrop-blur-xl bg-white/60 border-b border-slate-200">
            <div className="max-w-2xl mx-auto px-4 flex">
              {[{id:'discover',label:'Discover',icon:Home},{id:'following',label:'Following',icon:Users},{id:'saved',label:'Saved',icon:Library}].map(t=>(
                <button key={t.id} onClick={()=>setTab(t.id)} className={`flex items-center gap-1.5 px-4 py-3 text-sm font-medium border-b-2 ${tab===t.id?'border-orange-500 text-slate-900':'border-transparent text-slate-500'}`}><t.icon className="w-4 h-4"/>{t.label}</button>
              ))}
            </div>
          </nav>
          <main className="max-w-2xl mx-auto">
            {tab==='discover' && (
              <div>
                <div className="sticky top-[105px] z-30 bg-sky-50 py-3 px-4">
                  <div className="flex gap-2 overflow-x-auto no-scroll pb-1">
                    <button onClick={()=>setFilter('all')} className={`flex-shrink-0 px-4 py-2 rounded-xl text-sm font-medium ${filter==='all'?'bg-grad text-white shadow-md':'bg-white text-slate-600 border border-slate-200'}`}>Everyone</button>
                    {followed.map(p=>(
                      <button key={p.id} onClick={()=>setFilter(String(p.id))} className={`flex-shrink-0 flex items-center gap-2 px-3 py-1.5 rounded-xl text-sm font-medium ${filter===String(p.id)?'bg-grad text-white shadow-md':'bg-white text-slate-600 border border-slate-200'}`}>
                        <img src={p.image} alt={p.name} className="w-6 h-6 rounded-full object-cover bg-slate-200" onError={e=>{e.target.src=`https://ui-avatars.com/api/?name=${encodeURIComponent(p.name)}&size=48&background=6366f1&color=fff`;}}/>
                        <span className="max-w-[80px] truncate">{p.name.split(' ')[0]}</span>
                      </button>
                    ))}
                  </div>
                </div>
                <div className="px-4 py-2"><p className="text-xs text-slate-400">Showing last {weeks} weeks</p></div>
                <div className="px-4 space-y-2">
                  {filtered.length===0 ? <div className="text-center py-12"><Mic className="w-12 h-12 mx-auto text-slate-300 mb-3"/><p className="text-slate-500">No episodes found</p></div> : 
                  filtered.map(ep=>(
                    <div key={ep.id} className="bg-white rounded-xl p-3 border border-slate-200 shadow-sm">
                      <div className="flex gap-3">
                        <img src={ep.podcastImage} alt={ep.podcast} className="w-16 h-16 rounded-lg object-cover flex-shrink-0 bg-slate-200"/>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <img src={ep.guestImage} alt={ep.guestName} className="w-5 h-5 rounded-full object-cover bg-slate-200" onError={e=>{e.target.src=`https://ui-avatars.com/api/?name=${encodeURIComponent(ep.guestName)}&size=40&background=6366f1&color=fff`;}}/>
                            <span className="text-xs text-orange-500 font-medium">{ep.guestName}</span>
                          </div>
                          <h3 className="font-medium text-slate-900 text-sm line-clamp-2 leading-tight mb-1">{ep.title}</h3>
                          <p className="text-xs text-slate-500 truncate">{ep.podcast}</p>
                          <div className="flex items-center gap-2 mt-1 text-xs text-slate-400"><span>{formatDate(ep.date)}</span><span>•</span><span>{ep.duration}</span></div>
                        </div>
                        <div className="flex flex-col gap-2 flex-shrink-0">
                          <button onClick={()=>{setCurEp(ep);setShowPlayer(true);setPlaying(true);}} className="w-10 h-10 rounded-full bg-grad flex items-center justify-center text-white"><Play className="w-4 h-4 ml-0.5"/></button>
                          <button className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center text-slate-500"><ExternalLink className="w-4 h-4"/></button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
                {filtered.length>0 && (
                  <div className="px-4 py-6">
                    <p className="text-sm text-slate-500 text-center mb-4">Searched: Last {weeks} weeks</p>
                    <button onClick={loadMore} disabled={loading} className="w-full py-3 rounded-xl bg-white border border-slate-200 text-sm font-medium text-slate-600 flex items-center justify-center gap-2 disabled:opacity-50">{loading?<><Loader2 className="w-4 h-4 animate-spin"/>Searching...</>:<>Search older episodes<ChevronRight className="w-4 h-4"/></>}</button>
                  </div>
                )}
              </div>
            )}
            {tab==='following' && (
              <div className="p-4">
                <div className="flex items-center justify-between mb-4"><h2 className="font-bold text-slate-900">Following ({followed.length})</h2><button onClick={()=>{setShowAdd(true);setSearchRes([]);setSearchQ('');}} className="text-sm text-orange-500 font-medium">+ Add</button></div>
                {followed.length===0 ? <div className="text-center py-12"><Users className="w-12 h-12 mx-auto text-slate-300 mb-3"/><p className="text-slate-500">Not following anyone</p></div> :
                <div className="grid grid-cols-2 gap-3">{followed.map(p=>(
                  <div key={p.id} className="bg-white rounded-xl p-4 border border-slate-200 shadow-sm text-center">
                    <img src={p.image} alt={p.name} className="w-16 h-16 rounded-full object-cover mx-auto mb-2 bg-slate-200" onError={e=>{e.target.src=`https://ui-avatars.com/api/?name=${encodeURIComponent(p.name)}&size=128&background=6366f1&color=fff`;}}/>
                    <h3 className="font-medium text-slate-900 text-sm">{p.name}</h3>
                    <p className="text-xs text-slate-500 mb-3">{p.category}</p>
                    <button onClick={()=>unfollow(p.id)} className="text-xs text-red-500">Unfollow</button>
                  </div>
                ))}</div>}
              </div>
            )}
            {tab==='saved' && <div className="p-4"><h2 className="font-bold text-slate-900 mb-4">Saved Episodes (0)</h2><div className="text-center py-12"><Library className="w-12 h-12 mx-auto text-slate-300 mb-3"/><p className="text-slate-500">No saved episodes</p></div></div>}
          </main>
        </div>
      )}

      {showPlayer && curEp && state==='main' && (
        <div className="fixed bottom-0 left-0 right-0 z-50 backdrop-blur-xl bg-white/95 border-t border-slate-200 px-4 py-3 shadow-lg">
          <div className="max-w-2xl mx-auto flex items-center gap-4">
            <img src={curEp.podcastImage} alt={curEp.podcast} className="w-12 h-12 rounded-lg object-cover bg-slate-200"/>
            <div className="flex-1 min-w-0"><h4 className="font-medium text-slate-900 text-sm truncate">{curEp.title}</h4><p className="text-xs text-slate-500 truncate">{curEp.guestName}</p></div>
            <button onClick={()=>setPlaying(!playing)} className="w-10 h-10 rounded-full bg-grad flex items-center justify-center text-white">{playing?<Pause className="w-4 h-4"/>:<Play className="w-4 h-4 ml-0.5"/>}</button>
            <button onClick={()=>setShowPlayer(false)} className="p-2 text-slate-400"><X className="w-5 h-5"/></button>
          </div>
        </div>
      )}

      {showAdd && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/30 backdrop-blur-sm">
          <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl max-h-[80vh] overflow-hidden">
            <div className="p-4 border-b border-slate-200 flex items-center justify-between"><h3 className="font-bold text-lg">Add Person</h3><button onClick={()=>setShowAdd(false)} className="p-2 hover:bg-slate-100 rounded-lg"><X className="w-5 h-5 text-slate-500"/></button></div>
            <div className="p-4">
              <div className="flex gap-2 mb-4">
                <div className="relative flex-1"><Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400"/><input value={searchQ} onChange={e=>setSearchQ(e.target.value)} onKeyDown={e=>e.key==='Enter'&&searchPerson()} placeholder="Search anyone..." className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2.5 pl-10 pr-4 text-sm focus:outline-none focus:border-orange-500"/></div>
                <button onClick={searchPerson} disabled={searching||!searchQ.trim()} className="px-4 py-2 bg-grad text-white rounded-xl text-sm font-medium disabled:opacity-50">{searching?<Loader2 className="w-4 h-4 animate-spin"/>:'Search'}</button>
              </div>
              {searching && <div className="text-center py-8"><Loader2 className="w-8 h-8 animate-spin text-orange-500 mx-auto mb-2"/><p className="text-sm text-slate-500">AI is searching...</p></div>}
              {!searching && searchRes.length>0 && <div className="space-y-2 max-h-[50vh] overflow-y-auto">{searchRes.map(p=>(
                <div key={p.id} className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl">
                  <img src={p.image} alt={p.name} className="w-12 h-12 rounded-full object-cover bg-slate-200" onError={e=>{e.target.src=`https://ui-avatars.com/api/?name=${encodeURIComponent(p.name)}&size=96&background=6366f1&color=fff`;}}/>
                  <div className="flex-1 min-w-0"><h4 className="font-medium text-slate-900">{p.name}</h4><p className="text-xs text-slate-500 truncate">{p.bio}</p></div>
                  <button onClick={()=>addPerson(p)} className="px-3 py-1.5 bg-grad text-white text-sm rounded-lg flex-shrink-0">Follow</button>
                </div>
              ))}</div>}
            </div>
          </div>
        </div>
      )}

      {showAI && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/30 backdrop-blur-sm">
          <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl max-h-[80vh] overflow-hidden">
            <div className="p-4 border-b border-slate-200 flex items-center justify-between">
              <div className="flex items-center gap-2"><div className="w-8 h-8 rounded-lg bg-grad flex items-center justify-center"><Sparkles className="w-4 h-4 text-white"/></div><h3 className="font-bold text-lg">AI Suggestions</h3></div>
              <button onClick={()=>setShowAI(false)} className="p-2 hover:bg-slate-100 rounded-lg"><X className="w-5 h-5 text-slate-500"/></button>
            </div>
            <div className="p-4">
              {searching ? <div className="text-center py-8"><Loader2 className="w-8 h-8 animate-spin text-orange-500 mx-auto mb-2"/><p className="text-sm text-slate-500">AI is finding people...</p></div> :
              searchRes.length>0 ? <><p className="text-sm text-slate-500 mb-4">Based on who you follow:</p><div className="space-y-2 max-h-[50vh] overflow-y-auto">{searchRes.map(p=>(
                <div key={p.id} className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl">
                  <img src={p.image} alt={p.name} className="w-12 h-12 rounded-full object-cover bg-slate-200" onError={e=>{e.target.src=`https://ui-avatars.com/api/?name=${encodeURIComponent(p.name)}&size=96&background=6366f1&color=fff`;}}/>
                  <div className="flex-1 min-w-0"><h4 className="font-medium text-slate-900">{p.name}</h4><p className="text-xs text-slate-500 truncate">{p.bio}</p></div>
                  <button onClick={()=>{addPerson(p);setShowAI(false);}} className="px-3 py-1.5 bg-grad text-white text-sm rounded-lg flex-shrink-0">Follow</button>
                </div>
              ))}</div></> : <p className="text-center text-slate-500 py-8">Loading...</p>}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
