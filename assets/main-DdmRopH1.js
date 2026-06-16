import{B as e,F as t,G as n,M as r,V as i,a,c as o,g as s,i as c,l,n as u,o as d,p as f,q as p,r as m,s as h,t as g,v as _,x as v}from"./loader-BK5fhJNE.js";import{i as y,n as b,o as ee,t as x}from"./tank-BqgHMfek.js";import{t as S}from"./launcher-BcAuH5Ej.js";import{n as C,r as w,t as T}from"./grass-DF_wKOdW.js";import{n as E,t as D}from"./tv-DSNI9Y1r.js";var O=class{constructor(e){this.listener=new h,e.add(this.listener),this.loader=new o,this.buffers={}}setCamera(e){!e||this.listener.parent===e||e.add(this.listener)}async load(e,t){let n=await(await fetch(t)).arrayBuffer();new TextDecoder().decode(n.slice(0,120));let r=await this.listener.context.decodeAudioData(n);return this.buffers[e]=r,r}createPositional(e,{loop:n=!1,volume:r=1,refDistance:i=20,rolloffFactor:a=1,distanceModel:o=`inverse`,maxDistance:s=200}={}){let c=this.buffers[e];if(!c)return console.warn(`Audio buffer "${e}" was not loaded`),null;let l=new t(this.listener);return l.setBuffer(c),l.setLoop(n),l.setVolume(r),l.setRefDistance(i),l.setRolloffFactor(a),l.setDistanceModel(o),l.setMaxDistance(s),l}};async function k(e){for(let[t,n]of[[`launcherFire`,`/final-project-interactivelan/sounds/missile_firing.ogg`],[`launcherReload`,`/final-project-interactivelan/sounds/reload.ogg`],[`tubeToss`,`/final-project-interactivelan/sounds/reload.ogg`],[`missileExplosion`,`/final-project-interactivelan/sounds/explosion_a.ogg`],[`tankExplosion`,`/final-project-interactivelan/sounds/explosion_b.ogg`],[`tankEngine`,`/final-project-interactivelan/sounds/tank_moving.ogg`],[`tankTrack`,`/final-project-interactivelan/sounds/tracks.ogg`],[`tankTurretRotate`,`/final-project-interactivelan/sounds/turret_rotate.ogg`]])try{await e.load(t,n),console.log(`Loaded sound: ${t}`,n)}catch(e){throw console.error(`Failed loading sound: ${t}`,n,e),e}}async function A(e,t,n){let r=new E(1),a=new D,o=new i;o.background=new f(657930),await a.load(o,new p(0,0,0),`/final-project-interactivelan/models/tv.glb`);let c=new l().setFromObject(a.model),u=new p,d=new p;c.getCenter(u),c.getSize(d);let m=Math.max(d.x,d.y,d.z);t.position.set(u.x-.2,u.y+.2,u.z+m*1.2),t.lookAt(u);let h=new v(12572927,1710618,.55);o.add(h);let g=new s(16774112,2.3);g.position.set(1,2,3),o.add(g),e.setAnimationLoop(()=>{e.render(o,t)});let _=document.createElement(`div`);_.style.cssText=`
        position: fixed;
        bottom: 20px;
        right: 24px;
        color: rgba(255, 255, 255, 0.5);
        font-family: monospace;
        font-size: 0.85rem;
        z-index: 300;
        pointer-events: none;
    `,_.textContent=`ENTER to skip`,a.onPlaybackStarted=()=>{document.body.appendChild(_),document.addEventListener(`keydown`,y)};let y=e=>{e.code===`Enter`&&(document.removeEventListener(`keydown`,y),_.remove(),a.skip())};await a.playIntro(o,new p),document.removeEventListener(`keydown`,y),_.remove(),e.setAnimationLoop(null),e.setClearColor(0,1),e.clear(),await r.fadeOut(),a.dispose(o),await n(),await r.fadeIn(),r.dispose()}var j=20,M=Object.freeze({PLAYING:`PLAYING`,WIN:`WIN`,LOSE:`LOSE`}),N=[{delay:1,spawnIndices:[0,8]},{delay:1,spawnIndices:[1,7,3]},{delay:1,spawnIndices:[2,4,5,6]}],te=class{constructor(e,t,n,r,i){this.terrain=e,this.launcher=t,this.tanks=n,this.addTank=r,this.hud=i,this.state=M.PLAYING,this.currentWaveIndex=0,this.waveTimer=0,this.allWavesSpawned=!1,this.score=0}spawnWave(e){for(let t of e.spawnIndices)this.addTank(this.terrain.enemySpawnPositions[t])}allCurrentTanksDead(){return this.tanks.length>0&&this.tanks.every(e=>e.state===b.DEAD)}updateWaves(e){this.allWavesSpawned||this.currentWaveIndex>0&&!this.allCurrentTanksDead()||(this.waveTimer+=e,this.waveTimer>=N[this.currentWaveIndex].delay&&(this.waveTimer=0,this.spawnWave(N[this.currentWaveIndex]),this.hud.showAnnouncement(`Wave ${this.currentWaveIndex+1} of ${N.length}`,2e3),this.currentWaveIndex++,this.currentWaveIndex>=N.length&&(this.allWavesSpawned=!0)))}onTankDestroyed(e){this.score++,this.hud.updateScore(this.score),this.terrain.navMap.setBlocked(e.group.position.x,e.group.position.z,2)}checkConditions(){if(this.state===M.PLAYING){for(let e of this.tanks)if(e.state===b.ALIVE&&e.group.position.distanceTo(this.terrain.launcherSpawn)<j){this.state=M.LOSE,this.hud.showEndScreen(`POSITION OVERRUN`,`A tank reached your position.`,this.score,!1);return}this.allWavesSpawned&&this.allCurrentTanksDead()&&(this.state=M.WIN,this.hud.showEndScreen(`AREA SECURED`,`All enemy armor destroyed.`,this.score,!0))}}update(e){this.state===M.PLAYING&&(this.updateWaves(e),this.checkConditions(),this.hud.updateWaveCounter(this.currentWaveIndex,N.length))}},P=class{constructor(){this.waveCounterElement=null,this.stateElement=null,this.crosshairElement=null,this.buildWaveCounter(),this.buildScore(),this.buildStateIndicator(),this.initCrosshair()}async initCrosshair(){try{let e=await(await fetch(`/final-project-interactivelan/ui/crosshair.svg`)).text();this.crosshairElement=document.createElement(`div`),this.crosshairElement.id=`crosshair-ui`,this.crosshairElement.style.cssText=`
                position: fixed;
                top: 0; left: 0;
                width: 100vw; height: 100vh;
                pointer-events: none;
                display: flex;
                justify-content: center;
                align-items: center;
                visibility: hidden;
                z-index: 100;
            `,this.crosshairElement.innerHTML=e,document.body.appendChild(this.crosshairElement)}catch(e){console.error(`Failed to load crosshair:`,e)}}setCrosshairVisible(e){this.crosshairElement&&(this.crosshairElement.style.visibility=e?`visible`:`hidden`)}buildWaveCounter(){this.waveCounterElement=document.createElement(`div`),this.waveCounterElement.style.cssText=`
            position: fixed;
            top: 20px;
            right: 24px;
            color: white;
            font-family: monospace;
            font-size: 1rem;
            text-shadow: 0 0 6px black;
            z-index: 150;
            pointer-events: none;
        `,document.body.appendChild(this.waveCounterElement)}buildScore(){this.scoreElement=document.createElement(`div`),this.scoreElement.style.cssText=`
            position: fixed;
            top: 20px;
            left: 24px;
            color: white;
            font-family: monospace;
            font-size: 1rem;
            text-shadow: 0 0 6px black;
            z-index: 150;
            pointer-events: none;
        `,this.scoreElement.textContent=`KILLS: 0`,document.body.appendChild(this.scoreElement)}buildStateIndicator(){this.stateElement=document.createElement(`div`),this.stateElement.style.cssText=`
            position: fixed;
            bottom: 24px;
            left: 50%;
            transform: translateX(-50%);
            color: white;
            font-family: monospace;
            font-size: 1rem;
            letter-spacing: 0.15em;
            text-shadow: 0 0 6px black;
            z-index: 150;
            pointer-events: none;
        `,document.body.appendChild(this.stateElement)}updateWaveCounter(e,t){if(!this.waveCounterElement)return;let n=Math.min(e,t);this.waveCounterElement.textContent=`WAVE ${n} / ${t}`}updateLauncherState(e){if(!this.stateElement)return;let t={READY:`Ready to fire`,FIRED:`Missile in flight`,POST_FIRE:`Press R to reload`,TOSSING:`Reloading...`,RELOADING:`Reloading...`};this.stateElement.textContent=t[e]??e}updateScore(e){this.scoreElement&&(this.scoreElement.textContent=`KILLS: ${e}`)}showAnnouncement(e,t=3e3){let n=document.createElement(`div`);n.style.cssText=`
            position: fixed;
            top: 10%;
            left: 50%;
            transform: translateX(-50%);
            color: white;
            font-family: monospace;
            font-size: 2rem;
            text-shadow: 0 0 8px black;
            z-index: 150;
            pointer-events: none;
        `,n.textContent=e,document.body.appendChild(n),setTimeout(()=>n.remove(),t)}showEndScreen(e,t,n=0,r=!0){document.pointerLockElement&&document.exitPointerLock(),this.injectEndScreenStyles();let i=r?`#3dff7e`:`#ff3333`,a=r?`rgba(0,8,0,0.9)`:`rgba(20,0,0,0.92)`,o=r?`rgba(80,255,140,0.18)`:`rgba(255,40,40,0.28)`,s=document.createElement(`div`);s.className=`escreen-overlay`,s.style.cssText=`
            background: ${a};
            --accent: ${i};
        `,s.innerHTML=`
            <div class="escreen-flash" style="background:${o};"></div>
            <div class="escreen-content">
                <div class="escreen-rule"></div>
                <h1 class="escreen-title"></h1>
                <p class="escreen-subtitle">${t}</p>
                <div class="escreen-rule"></div>
                <button class="escreen-restart">[ RESTART ]</button>
            </div>
        `,document.body.appendChild(s);let c=s.querySelector(`.escreen-title`);setTimeout(()=>{let t=0,n=setInterval(()=>{c.textContent=e.slice(0,++t),t>=e.length&&(clearInterval(n),c.classList.add(`done`))},55)},700),s.querySelector(`.escreen-restart`).addEventListener(`click`,()=>{window.location.reload()})}injectEndScreenStyles(){if(document.getElementById(`escreen-styles`))return;let e=document.createElement(`style`);e.id=`escreen-styles`,e.textContent=`
            @keyframes esFadeIn    { from { opacity: 0; } to { opacity: 1; } }
            @keyframes esFlash     { from { opacity: 1; } to   { opacity: 0; } }
            @keyframes esSlideUp   { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: none; } }

            .escreen-overlay {
                position: fixed; inset: 0;
                display: flex; align-items: center; justify-content: center;
                z-index: 200;
                font-family: monospace;
                color: white;
                animation: esFadeIn 0.6s ease 0.1s both;
            }

            .escreen-flash {
                position: absolute; inset: 0;
                pointer-events: none;
                animation: esFlash 0.4s ease-out both;
            }

            .escreen-content {
                display: flex; flex-direction: column;
                align-items: center; gap: 1.1rem;
                text-align: center;
                animation: esSlideUp 0.5s ease 0.4s both;
            }

            .escreen-rule {
                width: 300px; height: 1px;
                background: var(--accent); opacity: 0.5;
            }

            .escreen-title {
                font-size: 2.6rem; margin: 0;
                letter-spacing: 0.18em;
                color: var(--accent);
                text-shadow: 0 0 18px var(--accent);
                min-height: 3.2rem;
                border-right: 2px solid var(--accent);
                padding-right: 2px;
            }
            .escreen-title.done { border-right: none; }

            .escreen-subtitle {
                margin: 0; font-size: 0.95rem;
                letter-spacing: 0.06em; opacity: 0.8;
                animation: esSlideUp 0.4s ease 2.1s both;
            }

            .escreen-stats {
                display: flex; flex-direction: column;
                align-items: center; gap: 0.2rem;
                animation: esSlideUp 0.4s ease 2.5s both;
            }
            .escreen-stat-label {
                font-size: 0.75rem; letter-spacing: 0.12em;
                opacity: 0.5;
            }
            .escreen-score {
                font-size: 2.2rem; color: var(--accent);
            }

            .escreen-restart {
                background: transparent;
                color: var(--accent);
                border: 1px solid var(--accent);
                font-family: monospace; font-size: 0.95rem;
                letter-spacing: 0.12em;
                padding: 0.45rem 2.2rem;
                cursor: pointer;
                animation: esSlideUp 0.4s ease 2.9s both;
                transition: background 0.15s, color 0.15s;
            }
            .escreen-restart:hover {
                background: var(--accent);
                color: black;
            }
        `,document.head.appendChild(e)}},F=new i,I=new n().load(`/final-project-interactivelan/textures/sky.jpeg`);I.mapping=303,I.colorSpace=e,F.background=I;var L=new r(75,window.innerWidth/window.innerHeight,.1,1e3),R=new a({antialias:!0});R.setSize(window.innerWidth,window.innerHeight),R.shadowMap.enabled=!0,R.shadowMap.type=1,R.toneMapping=4,R.toneMappingExposure=1,`outputColorSpace`in R?R.outputColorSpace=e:R.outputEncoding=void 0,document.body.appendChild(R.domElement),window.scene=F,window.camera=L;var z=performance.now();F.fog=new _(8029844,140,420);var B=new s(16766627,2.4);B.position.set(55,38,-25),B.castShadow=!0,B.shadow.bias=-5e-4,B.shadow.mapSize.set(2048,2048),B.shadow.camera.near=1,B.shadow.camera.far=260,B.shadow.camera.left=-140,B.shadow.camera.right=140,B.shadow.camera.top=140,B.shadow.camera.bottom=-140;var V=new v(10206463,2761244,.38),H=new d(16777215,.05);F.add(B),F.add(V),F.add(H);var U=new y,W=new O(L);await k(W);var G=await u(`/final-project-interactivelan/models/launcher.glb`),K=await u(`/final-project-interactivelan/models/tank.glb`),q=await m(),J=new w(320,100,.005,8,new p(140,0,140),[new p(-140,0,-90),new p(-135,0,-70),new p(-130,0,-140),new p(0,0,-140),new p(10,0,-140),new p(30,0,-140),new p(-140,0,0),new p(-140,0,10),new p(-140,0,30)]),Y=await C(F,J,q,3,.55);T(F,J,await g(),.5,2.5),Y.push(J.terrain);var X=new P,Z=new S(G,Y,W);Z.setHUD(X);var Q=[],$=new te(J,Z,Q,re,X);window.addEventListener(`resize`,ne);function ne(){L.aspect=window.innerWidth/window.innerHeight,L.updateProjectionMatrix(),R.setSize(window.innerWidth,window.innerHeight),Z.onResize()}function re(e){let t=J.navMap.findNearestPassable(e.x,e.z),n=new p(t.x,J.getHeightAt(t.x,t.z),t.z),r=new x(c(K),W);return Q.push(r),r.addToScene(F,J,n),Z.registerTank(r),r.setNavigation(J.navMap,J.launcherSpawn),r}async function ie(){J.addToScene(F),Z.addToScene(F,J.launcherSpawn),Z.setMapCenter(new p(0,0,0)),Z.faceToward(new p(0,0,0)),Z.setMainCamera(),J.terrain.updateMatrixWorld(!0)}await A(R,L,ie);function ae(){let e=performance.now(),t=(e-z)/1e3;z=e,Z.update(U,t,F,J.terrain);for(let e of Q){let n=e.state===b.DEAD;e.update(t,Z.activeCamera??L),!n&&e.state===b.DEAD&&$.onTankDestroyed(e)}$.update(t),X.updateLauncherState(Z.state),ee(t);let n=Z.activeCamera??L;W.setCamera(n),R.render(F,n)}R.setAnimationLoop(ae);