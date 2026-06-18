import{C as e,G as t,I as n,W as r,Y as i,Z as a,a as o,b as s,c,h as l,i as u,l as d,n as f,o as p,r as m,s as h,t as g,u as _,v,y,z as ee}from"./loader-BcyVLW1i.js";import{t as te}from"./menu_bg-2GwDszCx.js";import{i as ne,n as b,t as x}from"./tank-CMnEWvpQ.js";import{t as S}from"./launcher-CehRo2Gf.js";import{t as re}from"./hud-D9KE2jWy.js";import{i as ie,n as C,r as ae,t as oe}from"./grass-DxdSlhNe.js";import{n as w,t as T}from"./tv-FPzp_bYN.js";var se=class{constructor(e){this.listener=new c,e.add(this.listener),this.loader=new d,this.buffers={}}setCamera(e){!e||this.listener.parent===e||e.add(this.listener)}async load(e,t){let n=await(await fetch(t)).arrayBuffer();new TextDecoder().decode(n.slice(0,120));let r=await this.listener.context.decodeAudioData(n);return this.buffers[e]=r,r}createPositional(e,{loop:t=!1,volume:n=1,refDistance:r=20,rolloffFactor:i=1,distanceModel:a=`inverse`,maxDistance:o=200}={}){let s=this.buffers[e];if(!s)return console.warn(`Audio buffer "${e}" was not loaded`),null;let c=new ee(this.listener);return c.setBuffer(s),c.setLoop(t),c.setVolume(n),c.setRefDistance(r),c.setRolloffFactor(i),c.setDistanceModel(a),c.setMaxDistance(o),c}};async function E(e){for(let[t,n]of[[`launcherFire`,`/final-project-interactivelan/sounds/missile_firing.ogg`],[`launcherReload`,`/final-project-interactivelan/sounds/reload.ogg`],[`tubeToss`,`/final-project-interactivelan/sounds/reload.ogg`],[`tubeDrop`,`/final-project-interactivelan/sounds/drop.ogg`],[`reloadClick`,`/final-project-interactivelan/sounds/click.ogg`],[`missileExplosion`,`/final-project-interactivelan/sounds/explosion_a.ogg`],[`tankExplosion`,`/final-project-interactivelan/sounds/explosion_b.ogg`],[`tankEngine`,`/final-project-interactivelan/sounds/tank_moving.ogg`],[`tankTrack`,`/final-project-interactivelan/sounds/tracks.ogg`],[`tankTurretRotate`,`/final-project-interactivelan/sounds/turret_rotate.ogg`]])try{await e.load(t,n),console.log(`Loaded sound: ${t}`,n)}catch(e){throw console.error(`Failed loading sound: ${t}`,n,e),e}}async function D(n,r,i){let o=new w(1),s=new T,c=new t;c.background=new l(657930),await s.load(c,new a(0,0,0),`/final-project-interactivelan/models/tv.glb`);let u=new _().setFromObject(s.model),d=new a,f=new a;u.getCenter(d),u.getSize(f);let p=Math.max(f.x,f.y,f.z);r.position.set(d.x,d.y+.2,d.z+p*1.3),r.lookAt(d);let m=new e(12572927,1710618,.55);c.add(m);let h=new v(16774112,.09);h.position.set(1,3,10),c.add(h),n.setAnimationLoop(()=>{n.render(c,r)});let g=document.createElement(`div`);g.style.cssText=`
        position: fixed;
        bottom: 20px;
        right: 24px;
        color: rgba(255, 255, 255, 0.5);
        font-family: monospace;
        font-size: 0.85rem;
        z-index: 300;
        pointer-events: none;
    `,g.textContent=`ENTER to skip`,s.onPlaybackStarted=()=>{document.body.appendChild(g),document.addEventListener(`keydown`,y)};let y=e=>{e.code===`Enter`&&(document.removeEventListener(`keydown`,y),g.remove(),s.skip())};await s.playIntro(c,new a),document.removeEventListener(`keydown`,y),g.remove(),n.setAnimationLoop(null),n.setClearColor(0,1),n.clear(),await o.fadeOut(),s.dispose(c),await i(),await o.fadeIn(),o.dispose()}var O=20,k=Object.freeze({PLAYING:`PLAYING`,WIN:`WIN`,LOSE:`LOSE`}),A=[{delay:1,spawnIndices:[0,8]},{delay:1,spawnIndices:[1,7,3]},{delay:1,spawnIndices:[2,4,5,6]}],ce=class{constructor(e,t,n,r,i){this.terrain=e,this.launcher=t,this.tanks=n,this.addTank=r,this.hud=i,this.state=k.PLAYING,this.currentWaveIndex=0,this.waveTimer=0,this.allWavesSpawned=!1,this.score=0}spawnWave(e){for(let t of e.spawnIndices)this.addTank(this.terrain.enemySpawnPositions[t])}allCurrentTanksDead(){return this.tanks.length>0&&this.tanks.every(e=>e.state===b.DEAD)}updateWaves(e){this.allWavesSpawned||this.currentWaveIndex>0&&!this.allCurrentTanksDead()||(this.waveTimer+=e,this.waveTimer>=A[this.currentWaveIndex].delay&&(this.waveTimer=0,this.spawnWave(A[this.currentWaveIndex]),this.hud.showAnnouncement(`Wave ${this.currentWaveIndex+1} of ${A.length}`,2e3),this.currentWaveIndex++,this.currentWaveIndex>=A.length&&(this.allWavesSpawned=!0)))}onTankDestroyed(e){this.score++,this.hud.updateScore(this.score),this.terrain.navMap.setBlocked(e.group.position.x,e.group.position.z,2)}checkConditions(){if(this.state===k.PLAYING){for(let e of this.tanks)if(e.state===b.ALIVE&&e.group.position.distanceTo(this.terrain.launcherSpawn)<O){this.state=k.LOSE,this.hud.showEndScreen(`POSITION OVERRUN`,`Enemy armor breached the defensive perimeter.`,this.score,!1);return}this.allWavesSpawned&&this.allCurrentTanksDead()&&(this.state=k.WIN,this.hud.showEndScreen(`POSITION HELD`,`All ${A.length} waves repelled. No enemy armor remains.`,this.score,!0))}}get isOver(){return this.state!==k.PLAYING}update(e){this.state===k.PLAYING&&(this.updateWaves(e),this.checkConditions(),this.hud.updateWaveCounter(this.currentWaveIndex,A.length))}},j=new t,M=new i().load(`/final-project-interactivelan/textures/sky.jpeg`);M.mapping=303,M.colorSpace=r,j.background=M,j.backgroundRotation=new y(-.15,0,0);var N=new n(75,window.innerWidth/window.innerHeight,.1,1e3),P=new p({antialias:!0});P.setSize(window.innerWidth,window.innerHeight),P.shadowMap.enabled=!0,P.shadowMap.type=1,P.toneMapping=4,P.toneMappingExposure=1,`outputColorSpace`in P?P.outputColorSpace=r:P.outputEncoding=void 0,document.body.appendChild(P.domElement),window.scene=j,window.camera=N;var F=performance.now();j.fog=new s(8029844,140,420);var I=new v(16766627,2.4);I.position.set(55,38,-25),I.castShadow=!0,I.shadow.bias=-5e-4,I.shadow.mapSize.set(2048,2048),I.shadow.camera.near=1,I.shadow.camera.far=260,I.shadow.camera.left=-140,I.shadow.camera.right=140,I.shadow.camera.top=140,I.shadow.camera.bottom=-140;var L=new e(10206463,2761244,.38),R=new h(16777215,.05);j.add(I),j.add(L),j.add(R);var z=new se(N),[B,V,H,U,W]=await Promise.all([E(z).then(()=>f(`/final-project-interactivelan/models/launcher.glb`)),f(`/final-project-interactivelan/models/tank.glb`),u(),g(),m()]);function le(){return new Promise(e=>{let t=document.createElement(`style`);t.textContent=`
            #menu-overlay {
                position: fixed; inset: 0; z-index: 9999;
                color: #c8c4bb;
                font-family: "Courier New", monospace;
                display: grid;
                grid-template-rows: auto 1fr auto;
                overflow: hidden;
            }
            #menu-overlay::before {
                content: '';
                position: fixed; inset: 0;
                background: repeating-linear-gradient(
                    to bottom,
                    transparent 0px, transparent 3px,
                    rgba(0,0,0,0.06) 3px, rgba(0,0,0,0.06) 4px
                );
                pointer-events: none; z-index: 1;
            }
            #menu-header, #menu-footer {
                display: flex; justify-content: space-between; align-items: center;
                padding: 13px 48px;
                font-size: 11px; color: #4a4844; letter-spacing: 0.1em;
                background: rgba(10,10,10,0.9);
                backdrop-filter: blur(0px);
            }
            #menu-header { border-bottom: 1px solid #1d1d1b; }
            #menu-footer  { border-top:    1px solid #1d1d1b; }
            #menu-layout  { display: grid; grid-template-columns: 1fr 1fr; }
            #menu-left {
                display: flex; flex-direction: column; justify-content: flex-end;
                padding: 48px; border-right: 1px solid #1d1d1b;
                position: relative; overflow: hidden;
            }
            #menu-bg {
                position: absolute; inset: 0;
                width: 100%; height: 100%; display: block; z-index: -1;
            }
            #menu-left h1 {
                font-size: clamp(52px, 8vw, 100px);
                line-height: 0.9; letter-spacing: 0.04em; margin-bottom: 28px;
            }
            .menu-cursor {
                display: inline-block; width: 0.5em; height: 0.8em;
                background: #c8c4bb; vertical-align: middle; margin-left: 6px;
                animation: menu-blink 1.1s step-end infinite;
            }
            @keyframes menu-blink {
                0%, 49%  { opacity: 1; }
                50%, 100% { opacity: 0; }
            }
            #menu-left .meta {
                font-size: 11px; color: #4a4844;
                letter-spacing: 0.1em; text-transform: uppercase; line-height: 2.2;
            }
            #menu-right {
                display: flex; flex-direction: column; justify-content: center;
                padding: 48px; gap: 6px;
                background: #0a0a0a;
                background-image: radial-gradient(rgba(255,255,255,0.028) 1px, transparent 1px);
                background-size: 28px 28px;
            }
            .menu-section-label {
                font-size: 10px; letter-spacing: 0.15em;
                text-transform: uppercase; color: #4a4844;
                margin-bottom: 8px; margin-top: 16px;
            }
            .menu-section-label:first-child { margin-top: 0; }
            .menu-row {
                display: flex; justify-content: space-between; align-items: center;
                border: 1px solid #1d1d1b; padding: 12px 16px;
                font-size: 13px; letter-spacing: 0.07em; text-transform: uppercase;
                gap: 12px;
            }
            .menu-row input[type=range] {
                -webkit-appearance: none; appearance: none;
                flex: 1; max-width: 140px; height: 2px;
                background: #2a2a28; cursor: pointer; outline: none; border: none; padding: 0;
            }
            .menu-row input[type=range]::-webkit-slider-thumb {
                -webkit-appearance: none;
                width: 10px; height: 10px; background: #c8c4bb;
                border-radius: 0; cursor: pointer; transition: background 90ms;
            }
            .menu-row input[type=range]::-moz-range-thumb {
                width: 10px; height: 10px; background: #c8c4bb;
                border-radius: 0; border: none; cursor: pointer; transition: background 90ms;
            }
            .menu-row input[type=range]::-moz-range-track {
                height: 2px; background: #2a2a28; border: none;
            }
            .menu-row:hover input[type=range]::-webkit-slider-thumb { background: #7a9450; }
            .menu-row:hover input[type=range]::-moz-range-thumb     { background: #7a9450; }
            .menu-row .val { color: #4a4844; min-width: 40px; text-align: right; font-size: 11px; }
            .menu-toggle {
                display: flex; justify-content: space-between; align-items: center;
                border: 1px solid #1d1d1b; padding: 12px 16px; cursor: pointer;
                font-size: 13px; letter-spacing: 0.07em; text-transform: uppercase;
                user-select: none; transition: border-color 90ms, color 90ms;
            }
            .menu-toggle:hover { border-color: #7a9450; color: #7a9450; }
            .menu-toggle .indicator { color: #4a4844; font-size: 11px; transition: color 90ms; }
            .menu-toggle.on .indicator { color: #7a9450; }
            .menu-toggle:hover .indicator { color: #7a9450; opacity: 0.7; }
            #menu-start {
                margin-top: 8px; padding: 14px 16px;
                border: 1px solid #4a4844; background: none;
                color: #c8c4bb; font-family: "Courier New", monospace;
                font-size: 13px; letter-spacing: 0.07em; text-transform: uppercase;
                cursor: pointer; width: 100%;
                display: flex; justify-content: space-between; align-items: center;
                transition: border-color 90ms, color 90ms;
            }
            #menu-start:hover { border-color: #7a9450; color: #7a9450; }
            #menu-back {
                background: none; border: none; color: #4a4844;
                font-family: "Courier New", monospace; font-size: 11px;
                letter-spacing: 0.1em; cursor: pointer; padding: 0;
                transition: color 90ms;
            }
            #menu-back:hover { color: #c8c4bb; }
        `,document.head.appendChild(t);let n=document.createElement(`div`);n.id=`menu-overlay`;let r=document.createElement(`div`);r.id=`menu-header`,r.innerHTML=`<span>static defense</span><span>mission setup</span>`;let i=document.createElement(`div`);i.id=`menu-layout`;let a=document.createElement(`div`);a.id=`menu-left`;let o=document.createElement(`canvas`);o.id=`menu-bg`,a.append(o);let s=document.createElement(`div`);s.id=`menu-right`;let c={terrainSize:320,terrainFrequency:.005,terrainAmplitude:8,playIntro:!0};function l(e,t,n,r,i,a,o){let s=document.createElement(`div`);s.className=`menu-row`;let c=document.createElement(`span`);c.textContent=e;let l=document.createElement(`input`);l.type=`range`,l.min=t,l.max=n,l.step=r,l.value=i;let u=document.createElement(`span`);return u.className=`val`,u.textContent=a(i),l.addEventListener(`input`,()=>{let e=parseFloat(l.value);u.textContent=a(e),o(e)}),s.append(c,l,u),s}let u=document.createElement(`div`);u.className=`menu-section-label`,u.textContent=`map parameters`,s.appendChild(u),s.appendChild(l(`Size`,200,600,50,320,e=>e,e=>{c.terrainSize=e})),s.appendChild(l(`Frequency`,1,20,1,5,e=>(e/1e3).toFixed(3),e=>{c.terrainFrequency=e/1e3})),s.appendChild(l(`Amplitude`,2,30,1,8,e=>e,e=>{c.terrainAmplitude=e}));let d=document.createElement(`div`);d.className=`menu-section-label`,d.textContent=`options`,s.appendChild(d);let f=document.createElement(`div`);f.className=`menu-toggle on`,f.innerHTML=`<span>Play intro</span><span class="indicator">ON</span>`,f.addEventListener(`click`,()=>{c.playIntro=!c.playIntro,f.classList.toggle(`on`,c.playIntro),f.querySelector(`.indicator`).textContent=c.playIntro?`ON`:`OFF`}),s.appendChild(f);let p=document.createElement(`button`);p.id=`menu-start`,p.innerHTML=`<span>Start Mission</span><span>→</span>`,s.appendChild(p),i.append(a,s);let m=document.createElement(`div`);m.id=`menu-footer`;let h=document.createElement(`button`);h.id=`menu-back`,h.textContent=`← back`,m.append(h,document.createTextNode(`interactive graphics — 2026`)),n.append(r,i,m),document.body.appendChild(n);let g=te(o,B);p.addEventListener(`click`,()=>{g(),t.remove(),n.remove(),e(c)}),h.addEventListener(`click`,()=>{g(),window.location.href=window.location.pathname})})}var{terrainSize:G,terrainFrequency:ue,terrainAmplitude:de,playIntro:fe}=await le();j.fog.near=G*.4375,j.fog.far=G*1.3125;var K=G/2,q=new ie(G,Math.round(G/3.2),ue,de,new a(K*.625,0,K*.625),[new a(-K*.875,0,-K*.5625),new a(-K*.844,0,-K*.4375),new a(-K*.8125,0,-K*.875),new a(0,0,-K*.875),new a(K*.0625,0,-K*.875),new a(K*.1875,0,-K*.875),new a(-K*.875,0,0),new a(-K*.875,0,K*.0625),new a(-K*.875,0,K*.1875)]),J=await ae(j,q,H,3,.55);oe(j,q,U,3,10);var pe=C(j,q,W,200,.15);C(j,q,W,300,.05,{blockNav:!1,collision:!1,safeRadius:0,ignoreProtected:!0}),J.push(...pe),J.push(q.terrain);var Y=new re,X=new S(B,J,z);X.setHUD(Y);var Z=[],Q=new ce(q,X,Z,he,Y);window.addEventListener(`resize`,me);function me(){N.aspect=window.innerWidth/window.innerHeight,N.updateProjectionMatrix(),P.setSize(window.innerWidth,window.innerHeight),X.onResize()}function he(e){let t=q.navMap.findNearestPassable(e.x,e.z),n=new a(t.x,q.getHeightAt(t.x,t.z),t.z),r=new x(o(V),z);return Z.push(r),r.addToScene(j,q,n),X.registerTank(r),r.setNavigation(q.navMap,q.launcherSpawn),r}async function $(){q.addToScene(j),X.addToScene(j,q.launcherSpawn),X.setMapCenter(new a(0,0,0)),X.faceToward(new a(0,0,0)),X.setMainCamera(),q.terrain.updateMatrixWorld(!0)}fe?await D(P,N,$):await $();function ge(){let e=performance.now(),t=(e-F)/1e3;F=e,X.update(t,j,q.terrain);for(let e of Z){let n=e.state===b.DEAD;e.update(t,X.activeCamera??N),!n&&e.state===b.DEAD&&Q.onTankDestroyed(e)}Q.update(t),Y.updateLauncherState(X.state),ne(t);let n=X.activeCamera??N;z.setCamera(n),P.render(j,n),Q.isOver&&P.setAnimationLoop(null)}P.setAnimationLoop(ge);