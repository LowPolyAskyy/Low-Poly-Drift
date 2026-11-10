// Shared by menu, shop, lobby and game: car list, coins and progress saved in the browser.
const API=p=>(window.SERVER_URL||'').replace(/\/$/,'')+p; // server endpoint (same origin unless SERVER_URL is set)
// ---------- cars (bought with coins) ----------
const RANKS=[
{n:'Fiat 500',v:'Fiat 500',k:'fiat',cat:'compact',ui:'#f2f0e6',c:0xf2f0e6,ac:0xfff2b0,dw:0,top:0.78,acc:0.8,steer:0.85,grip:0.9,price:0,sx:1,sy:1,sz:1},
{n:'VW Golf GTI',v:'VW Golf GTI',k:'golf',cat:'compact',ui:'#c8102e',c:0xc8102e,ac:0xfff2b0,dw:0,top:0.85,acc:0.88,steer:0.9,grip:0.92,price:120,sx:1,sy:1,sz:1},
{n:'Alfa Romeo Giulia',v:'Alfa Romeo Giulia',k:'giulia',cat:'sporty',ui:'#8b0f1a',c:0x8b0f1a,ac:0xfff2b0,dw:0,top:0.92,acc:0.95,steer:0.95,grip:0.95,price:250,sx:1,sy:1,sz:1},
{n:'BMW M3',v:'BMW M3',k:'m3',cat:'sporty',ui:'#2a63c8',c:0x2a63c8,ac:0xfff2b0,dw:0,top:0.98,acc:1.0,steer:0.98,grip:0.98,price:400,sx:1,sy:1,sz:1},
{n:'Mercedes AMG GT',v:'Mercedes AMG GT',k:'amg',cat:'sporty',ui:'#b8bec8',c:0xb8bec8,ac:0xfff2b0,dw:0,top:1.03,acc:1.04,steer:0.98,grip:1.0,price:600,sx:1,sy:1,sz:1},
{n:'Dodge Challenger',v:'Dodge Challenger',k:'challenger',cat:'muscle',ui:'#e8731a',c:0xe8731a,ac:0xfff2b0,dw:0,top:1.08,acc:1.1,steer:0.9,grip:0.92,price:800,sx:1.08,sy:1,sz:1.08},
{n:'Porsche 911',v:'Porsche 911',k:'p911',cat:'sporty',ui:'#f2c400',c:0xf2c400,ac:0xfff2b0,dw:0,top:1.12,acc:1.12,steer:1.05,grip:1.05,price:1100,sx:1,sy:1,sz:1},
{n:'Audi R8',v:'Audi R8',k:'r8',cat:'wedge',ui:'#7c828c',c:0x7c828c,ac:0xffffff,dw:1,top:1.16,acc:1.14,steer:1.05,grip:1.0,price:1500,sx:1,sy:1,sz:1},
{n:'Ferrari F8',v:'Ferrari F8',k:'f8',cat:'wedge',ui:'#d40000',c:0xd40000,ac:0xffe36a,dw:0,top:1.2,acc:1.2,steer:1.08,grip:1.0,price:2000,sx:1,sy:1,sz:1},
{n:'Lamborghini Huracan',v:'Lamborghini Huracan',k:'huracan',cat:'wedge',ui:'#f7d000',c:0xf7d000,ac:0x7dff3a,dw:1,top:1.24,acc:1.24,steer:1.08,grip:1.02,price:2600,sx:1,sy:1,sz:1},
{n:'McLaren 720S',v:'McLaren 720S',k:'mc720',cat:'wedge',ui:'#ff6a00',c:0xff6a00,ac:0xffa040,dw:0,top:1.27,acc:1.28,steer:1.1,grip:1.08,price:3300,sx:1,sy:1,sz:1},
{n:'Bugatti Chiron',v:'Bugatti Chiron',k:'chiron',cat:'hyper',ui:'#1a3b8f',c:0x1a3b8f,ac:0xff8a00,dw:1,top:1.3,acc:1.3,steer:1.1,grip:1.12,price:4200,sx:1,sy:1,sz:1},
{n:'Koenigsegg Jesko',v:'Koenigsegg Jesko',k:'jesko',cat:'hyper',ui:'#e9edf2',c:0xe9edf2,ac:0x38ff7c,dw:0,top:1.33,acc:1.36,steer:1.12,grip:1.15,price:5500,sx:1,sy:1,sz:1},
{n:'Rocket Car',v:'Rocket Car',k:'rocket',ui:'#16171b',c:0x16171b,ac:0xff2020,dw:0,top:1.38,acc:1.4,steer:1.05,grip:1.05,price:7000,sx:1,sy:1,sz:1},
// ---- custom-model cars (appended at the end so saved progress keeps working; the shop sorts by price) ----
{n:'Pocket Mini',v:'Pocket Mini',k:'mini',cat:'city',ui:'#2f8f5b',c:0x2f8f5b,ac:0xfff2b0,dw:0,top:0.79,acc:0.84,steer:0.93,grip:0.9,price:60,sx:1,sy:1,sz:1},
{n:'City Taxi',v:'City Taxi',k:'taxi',cat:'city',ui:'#f2c200',c:0xf2c200,ac:0xfff2b0,dw:0,top:0.81,acc:0.82,steer:0.87,grip:0.9,price:50,sx:1,sy:1,sz:1},
{n:'Hippie Van',v:'Hippie Van',k:'van',cat:'van',ui:'#3fb6a8',c:0x3fb6a8,ac:0xfff2b0,dw:0,top:0.74,acc:0.72,steer:0.72,grip:0.95,price:40,sx:1,sy:1,sz:1},
{n:'Ice Cream Van',v:'Ice Cream Van',k:'icecream',cat:'van',ui:'#ffd6e6',c:0xf6e7c8,ac:0xfff2b0,dw:0,top:0.88,acc:0.93,steer:0.82,grip:0.96,price:150,sx:1,sy:1,sz:1},
{n:'Trail Jeep',v:'Trail Jeep',k:'jeep',cat:'offroad',ui:'#5b7a3a',c:0x5b7a3a,ac:0xfff2b0,dw:0,top:0.88,acc:0.9,steer:0.88,grip:1.02,price:200,sx:1,sy:1,sz:1},
{n:'Raptor Pickup',v:'Raptor Pickup',k:'pickup',cat:'truck',ui:'#d8541a',c:0xd8541a,ac:0xfff2b0,dw:0,top:0.99,acc:1.04,steer:0.9,grip:1.04,price:520,sx:1,sy:1,sz:1},
{n:'Police Interceptor',v:'Police Interceptor',k:'police',cat:'service',ui:'#eef1f6',c:0xeef1f6,ac:0xfff2b0,dw:0,top:1.04,acc:1.06,steer:1.0,grip:1.0,price:650,sx:1,sy:1,sz:1},
{n:'Dune Buggy',v:'Dune Buggy',k:'buggy',cat:'offroad',ui:'#f08a24',c:0xf08a24,ac:0xfff2b0,dw:0,top:0.98,acc:1.1,steer:1.1,grip:1.12,price:950,sx:1,sy:1,sz:1},
{n:'Flame Hot Rod',v:'Flame Hot Rod',k:'hotrod',cat:'classic',ui:'#7a1020',c:0x7a1020,ac:0xfff2b0,dw:0,top:1.14,acc:1.24,steer:0.96,grip:0.98,price:1000,sx:1,sy:1,sz:1},
{n:'Time Machine',v:'Time Machine',k:'retro',cat:'classic',ui:'#b9bec6',c:0xb9bec6,ac:0x6fd6ff,dw:0,top:1.18,acc:1.14,steer:1.05,grip:1.05,price:1700,sx:1,sy:1,sz:1},
{n:'Steel Truck',v:'Steel Truck',k:'cyber',cat:'truck',ui:'#c4c9d0',c:0xc4c9d0,ac:0xffffff,dw:0,top:1.2,acc:1.26,steer:1.0,grip:1.1,price:2300,sx:1,sy:1,sz:1},
{n:'Monster Truck',v:'Monster Truck',k:'monster',cat:'monster',ui:'#3a9d23',c:0x3a9d23,ac:0xfff2b0,dw:0,top:1.1,acc:1.28,steer:0.92,grip:1.34,price:2800,sx:1,sy:1,sz:1},
{n:'Formula Racer',v:'Formula Racer',k:'formula',cat:'formula',ui:'#e10600',c:0xe10600,ac:0xffffff,dw:0,top:1.34,acc:1.38,steer:1.16,grip:1.2,price:5800,sx:1,sy:1,sz:1},
{n:'Neon Hover',v:'Neon Hover',k:'neon',cat:'futuristic',ui:'#2b1b4a',c:0x2b1b4a,ac:0x00f0ff,dw:0,top:1.37,acc:1.44,steer:1.15,grip:1.15,price:6400,sx:1,sy:1,sz:1}];
// coins buy vehicles. Index 0 (the starter car) is free.
const PRICES=RANKS.map(c=>c.price);
// ---------- ranked tiers (Elo) ----------
// Elo is won/lost at the end of every online race with 2+ racers (see eloDelta). Logos live in /emblems/<f>.webp
const TIERS=[
{n:'Bronze',f:'bronze',min:0,c:'#e0803a'},
{n:'Silver',f:'silver',min:300,c:'#b9c6dd'},
{n:'Gold',f:'gold',min:600,c:'#ffd84a'},
{n:'Platinum',f:'platinum',min:900,c:'#8fd0ff'},
{n:'Diamond',f:'diamond',min:1200,c:'#5aa7ff'},
{n:'Emerald',f:'emerald',min:1500,c:'#3ee07a'},
{n:'Master',f:'master',min:1800,c:'#ff4b4b'}];
const ELO_START=150,ELO_K=30,ELO_MAX=9999;
const tierIdx=e=>{let t=0;TIERS.forEach((x,i)=>{if(e>=x.min)t=i});return t};
// 1st = +30, 2nd = +15, 3rd = 0 (you never lose Elo on the podium), 4th and below lose: spread linearly down to -30 for last place
// (8 racers: +30 +15 0 -6 -12 -18 -24 -30). Not finishing never gives Elo (see applyDnf in game.html).
const eloDelta=(pos,total)=>{if(total<2)return 0;pos=Math.min(pos,total);if(pos===1)return ELO_K;if(pos===2)return 15;if(pos===3)return 0;return -Math.round(ELO_K*(pos-3)/Math.max(1,total-3))};
const tierImg=(i,s)=>`<img src="emblems/${TIERS[i].f}.webp" alt="${TIERS[i].n}"${s?` style="width:${s}px;height:${s}px"`:''}>`;
// logo + tier name + Elo + progress bar towards the next tier
function rankBarHTML(elo){const t=tierIdx(elo),T=TIERS[t],N=TIERS[t+1];
 const pct=N?Math.round(100*(elo-T.min)/(N.min-T.min)):100;
 return `${tierImg(t)}<div><b style="color:${T.c}">${T.n}</b> <small>${elo} Elo</small><div class="bar"><i style="width:${pct}%;background:${T.c}"></i></div><small>${N?(N.min-elo)+' Elo to '+N.n:'Top rank'}</small></div>`}
// ---------- durability ----------
// The bigger and more powerful the car, the less damage it takes from crashes (damage taken = hit / dur).
// dur = 1 + size bonus (by category) + power bonus (from top speed + acceleration). Fiat 500 ~1.0, Monster Truck ~2.4.
const SIZE_DUR={compact:0,city:-.05,sporty:.2,formula:.15,van:.3,offroad:.3,classic:.3,service:.3,wedge:.35,muscle:.45,hyper:.5,futuristic:.5,truck:.6,monster:1};
RANKS.forEach(r=>{const pw=(r.top+r.acc)/2;r.dur=+(1+(r.cat in SIZE_DUR?SIZE_DUR[r.cat]:.7)+Math.max(0,pw-.75)).toFixed(2)});
// ---------- wraps (paint jobs) + mystery boxes ----------
// p = pattern id drawn by the shader in carmodel.js (0 = plain colour), c = [main, 2nd, 3rd colour], s = pattern scale, m = [shininess, specular] for metallic paint
const RAR={common:{n:'Common',c:'#b9c6dd'},rare:{n:'Rare',c:'#5aa7ff'},epic:{n:'Epic',c:'#c46bff'},legendary:{n:'Legendary',c:'#ffc83a'}};
const RAR_ORDER=['common','rare','epic','legendary'];
const DUPE={common:20,rare:60,epic:150,legendary:400}; // coins back for a duplicate wrap
const W=(id,n,r,p,c,s,m)=>({id,n,r,p,c:[c[0],c[1]===undefined?c[0]:c[1],c[2]===undefined?(c[1]===undefined?c[0]:c[1]):c[2]],s:s||1,m:m||null});
const WRAPS=[
// --- common: plain colours + 2 simple patterns
W('red','Cherry Red','common',0,[0xd81e2b]),W('sky','Sky Blue','common',0,[0x3aa0ff]),W('lime','Lime Pop','common',0,[0x7bd62e]),
W('sun','Sunshine','common',0,[0xffcf2e]),W('tang','Tangerine','common',0,[0xff8a1f]),W('pink','Bubblegum','common',0,[0xff7eb6]),
W('mid','Midnight','common',0,[0x14172e]),W('pearl','Pearl','common',0,[0xf1efe8]),W('teal','Lagoon','common',0,[0x16a89a]),
W('violet','Grape','common',0,[0x8a4be0]),W('slate','Slate','common',0,[0x59616e]),
W('dots','Polka Pop','common',5,[0xff7eb6,0xffffff]),W('candy','Candy Diagonal','common',3,[0xffffff,0xff3a5c],1.6),
// --- rare
W('race-b','Racing Blue','rare',1,[0x1f4fd8,0xffffff,0xe8e8ee]),W('race-r','Racing Red','rare',1,[0xc8102e,0x15151a,0xffffff]),
W('check','Checkered','rare',2,[0xf4f4f4,0x15151a]),W('zig','Mint Zigzag','rare',6,[0x103a3a,0x5af0c0]),
W('camo-f','Forest Camo','rare',4,[0x3b4a2a,0x1f2915,0x6b7a40]),W('camo-d','Desert Camo','rare',4,[0xd6bb86,0x9b7d4a,0x6e5a34]),
W('tartan','Tartan','rare',13,[0xa31620,0x15110e,0xf2e6a0]),W('hazard','Hazard Stripes','rare',3,[0xffcf00,0x111111],2.2),
// --- epic
W('flame-r','Hellfire','epic',7,[0x15151a,0xff5a10,0xffd84a]),W('flame-b','Blue Flame','epic',7,[0x0f1830,0x2a7bff,0x9ff3ff]),
W('tiger','Tiger','epic',12,[0xf08a1a,0x15110e]),W('zebra','Zebra','epic',12,[0xf4f4f4,0x111111]),
W('carbon','Carbon Fiber','epic',8,[0x17181b,0x2a2d33,0x6b717d],1,[60,0x555a64]),W('waves','Ocean Waves','epic',14,[0x1d5fd1,0x6fd0ff]),
W('argyle','Argyle','epic',15,[0x2b2d6e,0xf0c75a,0xf0c75a]),W('sunset','Sunset','epic',9,[0xff5a3c,0x3a1d7a,0xffb347]),
W('arctic','Arctic Camo','epic',4,[0xf2f6fa,0xb7c6d6,0x7d93aa]),
// --- legendary
W('rainbow','Rainbow Flow','legendary',11,[0xffffff]),W('neon','Neon Grid','legendary',16,[0x0a0714,0x00f0ff,0xff2bd6]),
W('gold','Midas Gold','legendary',0,[0xffc830],1,[110,0xfff0a8]),W('chrome','Liquid Chrome','legendary',0,[0xcfd6e0],1,[120,0xffffff]),
W('nebula','Nebula','legendary',10,[0x0a0a1e,0x6a2bd6,0x2bd6ff])];
// --- new wraps (patterns 17-24 live in carmodel.js)
WRAPS.push(
W('mint','Mint Fresh','common',0,[0x5be0b0]),W('coral','Coral','common',0,[0xff6f61]),W('navy','Navy','common',0,[0x1b2a5c]),
W('pstripe','Pinstripe','common',17,[0x1b1d2a,0xf1efe8]),
W('hex','Honeycomb','rare',18,[0x20242c,0xffc83a]),W('belt','Racing Belt','rare',19,[0xf4f4f4,0xd81e2b,0x15151a]),
W('leop','Leopard','rare',21,[0xe0a548,0x7a4a1e,0x15110e]),
W('aurora','Aurora','epic',20,[0x0b1030,0x35f0b0,0x8a5cff]),W('circ','Circuit Board','epic',22,[0x0a1f14,0x35ff7a,0xffd84a]),
W('rosegold','Rose Gold','epic',0,[0xe8a598],1,[110,0xffe0d8]),
W('holo','Holographic','legendary',23,[0xe8ecff]),W('lava','Magma','legendary',24,[0x1a0a08,0xff4a10,0xffd24a]));
// --- new wraps (patterns 25-33)
WRAPS.push(
W('tnt','TNT Block','epic',25,[0xb81414,0xeeeeee,0x4a0808],1.2),W('flori','Flower Meadow','rare',26,[0xcfe8b4,0xff7aa8,0xffd84a],1),
W('carta','Paper Page','rare',27,[0xf2e3bd,0xb7a27a,0x3b2d1a],1),W('notte','Moonlit Night','epic',28,[0x0a0f2e,0xf6efc8,0x2c4690],1),
W('mattina','Sunny Morning','epic',29,[0x6cc3ff,0xffd23f,0xffb347],1),W('macchie','Color Blots','legendary',30,[0x000000],1),
W('android','Droid Sides','rare',31,[0x0f1f17,0x3ddc84,0xffffff],1),W('apple','Apple Sides','rare',32,[0xf2f2f4,0x2b2b2e,0x2b2b2e],1),
W('gears','Clockwork Gears','epic',33,[0x1b1e25,0xb08d57,0x8a95a5],1));
const WRAP_BY=Object.fromEntries(WRAPS.map(w=>[w.id,w]));
const BOXES=[
{id:'street',n:'Street Box',price:150,ui:'#5aa7ff',odds:{common:.70,rare:.24,epic:.055,legendary:.005}},
{id:'racer',n:'Racer Box',price:450,ui:'#c46bff',odds:{common:.30,rare:.50,epic:.17,legendary:.03}},
{id:'legend',n:'Legend Box',price:1200,ui:'#ffc83a',odds:{common:0,rare:.40,epic:.45,legendary:.15}}];
function rollBox(b){let r=Math.random(),a=0,rar=RAR_ORDER.filter(k=>b.odds[k]>0).pop();
 for(const k of RAR_ORDER){a+=b.odds[k]||0;if(r<a){rar=k;break}}
 const pool=WRAPS.filter(w=>w.r===rar);return pool[Math.floor(Math.random()*pool.length)]}
// CSS approximation of a wrap, for the little swatches in the shop
function wrapCSS(w){const h=c=>'#'+c.toString(16).padStart(6,'0'),a=h(w.c[0]),b=h(w.c[1]),c=h(w.c[2]);
 switch(w.p){
 case 0:return a;
 case 1:return `linear-gradient(90deg,${a} 0 30%,${b} 30% 42%,${c} 42% 48%,${b} 48% 60%,${a} 60%)`;
 case 2:return `conic-gradient(${b} 25%,${a} 0 50%,${b} 0 75%,${a} 0) 0 0/16px 16px`;
 case 3:return `repeating-linear-gradient(45deg,${a} 0 8px,${b} 8px 16px)`;
 case 4:return `radial-gradient(circle at 25% 30%,${b} 0 22%,transparent 23%),radial-gradient(circle at 72% 58%,${c} 0 20%,transparent 21%),radial-gradient(circle at 40% 85%,${b} 0 18%,transparent 19%),${a}`;
 case 5:return `radial-gradient(circle,${b} 0 30%,transparent 32%) 0 0/14px 14px,${a}`;
 case 6:return `linear-gradient(135deg,${b} 25%,transparent 25%) -8px 0/16px 16px,linear-gradient(225deg,${b} 25%,transparent 25%) -8px 0/16px 16px,linear-gradient(315deg,${b} 25%,transparent 25%) 0 0/16px 16px,linear-gradient(45deg,${b} 25%,${a} 25%) 0 0/16px 16px`;
 case 7:return `linear-gradient(0deg,${c} 0 18%,${b} 18% 45%,${a} 45%)`;
 case 8:return `repeating-linear-gradient(45deg,${a} 0 3px,${b} 3px 6px)`;
 case 9:return `linear-gradient(0deg,${a},${c},${b})`;
 case 10:return `radial-gradient(circle at 30% 40%,${b},transparent 55%),radial-gradient(circle at 72% 70%,${c},transparent 50%),radial-gradient(circle,#fff 0 1px,transparent 1.5px) 0 0/11px 13px,${a}`;
 case 11:return 'linear-gradient(90deg,#ff3b3b,#ff9f1c,#ffe14a,#4ee06a,#2bd6ff,#4a6bff,#d64bff)';
 case 12:return `repeating-linear-gradient(100deg,${a} 0 9px,${b} 9px 15px)`;
 case 13:return `repeating-linear-gradient(0deg,${b} 0 4px,transparent 4px 14px),repeating-linear-gradient(90deg,${c} 0 4px,transparent 4px 16px),${a}`;
 case 14:return `repeating-radial-gradient(circle at 0 100%,${a} 0 6px,${b} 6px 12px)`;
 case 15:return `linear-gradient(45deg,${b} 25%,transparent 25%,transparent 75%,${b} 75%) 0 0/20px 20px,linear-gradient(45deg,${b} 25%,${a} 25%,${a} 75%,${b} 75%) 10px 10px/20px 20px`;
 case 16:return `linear-gradient(${b} 0 2px,transparent 2px) 0 0/14px 14px,linear-gradient(90deg,${c} 0 2px,transparent 2px) 0 0/14px 14px,${a}`;
 case 17:return `repeating-linear-gradient(0deg,${a} 0 10px,${b} 10px 12px)`;
 case 18:return `radial-gradient(circle,${b} 0 3px,transparent 4px) 0 0/14px 12px,${a}`;
 case 19:return `linear-gradient(0deg,${a} 0 30%,${b} 30% 45%,${a} 45% 52%,${c} 52% 58%,${a} 58%)`;
 case 20:return `linear-gradient(115deg,${a},${b} 40%,${c} 70%,${a})`;
 case 21:return `radial-gradient(circle at 30% 35%,${b} 0 12%,${c} 13% 22%,transparent 23%),radial-gradient(circle at 70% 70%,${b} 0 12%,${c} 13% 22%,transparent 23%),${a}`;
 case 22:return `linear-gradient(${b} 0 2px,transparent 2px) 0 0/16px 16px,linear-gradient(90deg,${b} 0 2px,transparent 2px) 8px 8px/16px 16px,radial-gradient(circle,${c} 0 2px,transparent 3px) 0 0/16px 16px,${a}`;
 case 23:return 'linear-gradient(120deg,#ffd1f0,#c9d8ff,#d1fff1,#fff2c9,#ffd1f0)';
 case 24:return `radial-gradient(circle at 30% 70%,${c},${b} 25%,transparent 55%),radial-gradient(circle at 75% 35%,${b},transparent 45%),${a}`;

 case 25:return `repeating-linear-gradient(0deg,${a} 0 10px,${b} 10px 17px,${a} 17px 25px)`;
 case 26:return `radial-gradient(circle,${c} 0 2px,${b} 3px 5px,transparent 6px) 0 0/18px 18px,${a}`;
 case 27:return `repeating-linear-gradient(0deg,transparent 0 9px,${b} 9px 10px),${a}`;
 case 28:return `radial-gradient(circle at 70% 35%,${b} 0 14%,transparent 15%),radial-gradient(circle,#fff 0 1px,transparent 1.5px) 0 0/12px 14px,${a}`;
 case 29:return `radial-gradient(circle at 75% 30%,${b} 0 18%,transparent 19%),linear-gradient(0deg,#ffe9b8,${a})`;
 case 30:return `radial-gradient(circle at 30% 35%,#ff3bd6,transparent 45%),radial-gradient(circle at 72% 65%,#2bd6ff,transparent 45%),radial-gradient(circle at 60% 20%,#ffe14a,transparent 35%),#000`;
 case 31:return `radial-gradient(circle at 15% 60%,${b} 0 14%,transparent 15%),radial-gradient(circle at 85% 60%,${b} 0 14%,transparent 15%),${a}`;
 case 32:return `radial-gradient(circle at 15% 60%,${b} 0 14%,transparent 15%),radial-gradient(circle at 85% 60%,${b} 0 14%,transparent 15%),${a}`;
 case 33:return `radial-gradient(circle,${a} 0 20%,${b} 21% 42%,transparent 44%) 0 0/16px 16px,${a}`;
 default:return a}}
const prog={coins:0,owned:[0],car:0,elo:ELO_START,wraps:[],weq:{}};
try{prog.coins=Math.max(0,+localStorage.dn_coins||0);
 if(localStorage.dn_elo!==undefined&&localStorage.dn_elo!==null)prog.elo=Math.max(0,Math.min(ELO_MAX,(+localStorage.dn_elo)|0));
 const o=JSON.parse(localStorage.dn_owned2||'[0]');if(Array.isArray(o))prog.owned=[...new Set([0,...o.map(v=>v|0).filter(v=>v>=0&&v<RANKS.length)])];
 const c=+localStorage.dn_car2|0;prog.car=prog.owned.includes(c)?c:0}catch(e){}
try{const w=JSON.parse(localStorage.dn_wraps||'[]');if(Array.isArray(w))prog.wraps=[...new Set(w.filter(x=>WRAP_BY[x]))];
 const e=JSON.parse(localStorage.dn_wrapeq||'{}');if(e&&typeof e==='object')for(const k in e)if(RANKS[k|0]&&prog.wraps.includes(e[k]))prog.weq[k|0]=e[k]}catch(e){}
const saveProg=()=>{try{localStorage.dn_coins=prog.coins;localStorage.dn_owned2=JSON.stringify(prog.owned);localStorage.dn_car2=prog.car;localStorage.dn_elo=prog.elo;localStorage.dn_wraps=JSON.stringify(prog.wraps);localStorage.dn_wrapeq=JSON.stringify(prog.weq)}catch(e){}};

// ---------- settings (saved in the browser, edited in settings.html) ----------
const SET_DEF={quality:'high',shake:1,fps:0,units:'kmh',voiceOn:1,voiceVol:1,ptt:0};
const SET=Object.assign({},SET_DEF);
try{const o=JSON.parse(localStorage.dn_set||'{}');if(o&&typeof o==='object')for(const k in SET_DEF)if(k in o&&typeof o[k]===typeof SET_DEF[k])SET[k]=o[k]}catch(e){}
if(!['low','med','high'].includes(SET.quality))SET.quality='high';
SET.voiceVol=Math.max(0,Math.min(1,+SET.voiceVol||0));
const saveSet=()=>{try{localStorage.dn_set=JSON.stringify(SET)}catch(e){}};
const hex=c=>c.toString(16).padStart(6,'0');
const coinImg='<img src="emblems/coin.webp" alt="coins" onerror="this.style.display=\'none\'">';
// navigate keeping the phone-test flag (?m=1)
const go=u=>{location.href=u+(/[?&]m=1/.test(location.search)?(u.includes('?')?'&':'?')+'m=1':'')};
