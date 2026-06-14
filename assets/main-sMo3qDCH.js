import{G as e,L as t,M as n,R as r,U as i,a,c as o,f as s,g as c,i as l,k as u,m as d,n as f,o as p,r as m,s as h,t as g,y as _}from"./loader-CZESaUyZ.js";import{a as v,n as y,r as b,t as x}from"./tank-DOT1LWDD.js";import{t as S}from"./launcher-DN_AKDA6.js";import{n as C,r as w,t as T}from"./grass-Vfki-hsx.js";import{n as E,t as D}from"./tv-DlU0Xt1U.js";var O=class{constructor(e){this.listener=new p,e.add(this.listener),this.loader=new h,this.buffers={}}setCamera(e){!e||this.listener.parent===e||e.add(this.listener)}async load(e,t){let n=await(await fetch(t)).arrayBuffer();new TextDecoder().decode(n.slice(0,120));let r=await this.listener.context.decodeAudioData(n);return this.buffers[e]=r,r}createPositional(e,{loop:t=!1,volume:r=1,refDistance:i=20,rolloffFactor:a=1,distanceModel:o=`inverse`,maxDistance:s=200}={}){let c=this.buffers[e];if(!c)return console.warn(`Audio buffer "${e}" was not loaded`),null;let l=new n(this.listener);return l.setBuffer(c),l.setLoop(t),l.setVolume(r),l.setRefDistance(i),l.setRolloffFactor(a),l.setDistanceModel(o),l.setMaxDistance(s),l}};async function k(e){for(let[t,n]of[[`launcherFire`,`/final-project-interactivelan/sounds/missile_firing.ogg`],[`launcherReload`,`/final-project-interactivelan/sounds/reload.ogg`],[`tubeToss`,`/final-project-interactivelan/sounds/reload.ogg`],[`missileExplosion`,`/final-project-interactivelan/sounds/explosion_a.ogg`],[`tankExplosion`,`/final-project-interactivelan/sounds/explosion_b.ogg`],[`tankEngine`,`/final-project-interactivelan/sounds/tank_moving.ogg`],[`tankTrack`,`/final-project-interactivelan/sounds/tracks.ogg`],[`tankTurretRotate`,`/final-project-interactivelan/sounds/turret_rotate.ogg`]])try{await e.load(t,n),console.log(`Loaded sound: ${t}`,n)}catch(e){throw console.error(`Failed loading sound: ${t}`,n,e),e}}async function A(t,n,i){let a=new E(1),c=new D,l=new r;l.background=new s(657930),await c.load(l,new e(0,0,0),`/final-project-interactivelan/models/tv.glb`);let u=new o().setFromObject(c.model),f=new e,p=new e;u.getCenter(f),u.getSize(p);let m=Math.max(p.x,p.y,p.z);n.position.set(f.x-.2,f.y+.2,f.z+m*1.2),n.lookAt(f);let h=new _(12572927,1710618,.55);l.add(h);let g=new d(16774112,2.3);g.position.set(1,2,3),l.add(g),t.setAnimationLoop(()=>{t.render(l,n)});let v=document.createElement(`div`);v.style.cssText=`
        position: fixed;
        bottom: 20px;
        right: 24px;
        color: rgba(255, 255, 255, 0.5);
        font-family: monospace;
        font-size: 0.85rem;
        z-index: 300;
        pointer-events: none;
    `,v.textContent=`ENTER to skip`,c.onPlaybackStarted=()=>{document.body.appendChild(v),document.addEventListener(`keydown`,y)};let y=e=>{e.code===`Enter`&&(document.removeEventListener(`keydown`,y),v.remove(),c.skip())};await c.playIntro(l,new e),document.removeEventListener(`keydown`,y),v.remove(),t.setAnimationLoop(null),t.setClearColor(0,1),t.clear(),await a.fadeOut(),c.dispose(l),await i(),await a.fadeIn(),a.dispose()}var j=20,M=Object.freeze({PLAYING:`PLAYING`,WIN:`WIN`,LOSE:`LOSE`}),N=[{delay:1,spawnIndices:[1]},{delay:1,spawnIndices:[0,2]},{delay:1,spawnIndices:[0,1,2]}],P=class{constructor(e,t,n,r,i){this.terrain=e,this.launcher=t,this.tanks=n,this.addTank=r,this.hud=i,this.state=M.PLAYING,this.currentWaveIndex=0,this.waveTimer=0,this.allWavesSpawned=!1,this.score=0}spawnWave(e){for(let t of e.spawnIndices)this.addTank(this.terrain.enemySpawnPositions[t])}allCurrentTanksDead(){return this.tanks.length>0&&this.tanks.every(e=>e.state===y.DEAD)}updateWaves(e){this.allWavesSpawned||this.currentWaveIndex>0&&!this.allCurrentTanksDead()||(this.waveTimer+=e,this.waveTimer>=N[this.currentWaveIndex].delay&&(this.waveTimer=0,this.spawnWave(N[this.currentWaveIndex]),this.hud.showAnnouncement(`Wave ${this.currentWaveIndex+1} of ${N.length}`,2e3),this.currentWaveIndex++,this.currentWaveIndex>=N.length&&(this.allWavesSpawned=!0)))}onTankDestroyed(){this.score++,this.hud.updateScore(this.score)}checkConditions(){if(this.state===M.PLAYING){for(let e of this.tanks)if(e.state===y.ALIVE&&e.group.position.distanceTo(this.terrain.launcherSpawn)<j){this.state=M.LOSE,this.hud.showEndScreen(`POSITION OVERRUN`,`A tank reached your position.`,this.score);return}this.allWavesSpawned&&this.allCurrentTanksDead()&&(this.state=M.WIN,this.hud.showEndScreen(`AREA SECURED`,`All enemy armor destroyed.`,this.score))}}update(e){this.state===M.PLAYING&&(this.updateWaves(e),this.checkConditions(),this.hud.updateWaveCounter(this.currentWaveIndex,N.length))}},F=class{constructor(){this.waveCounterElement=null,this.stateElement=null,this.buildWaveCounter(),this.buildStateIndicator()}buildWaveCounter(){this.waveCounterElement=document.createElement(`div`),this.waveCounterElement.style.cssText=`
            position: fixed;
            top: 20px;
            right: 24px;
            color: white;
            font-family: monospace;
            font-size: 1rem;
            text-shadow: 0 0 6px black;
            z-index: 150;
            pointer-events: none;
        `,document.body.appendChild(this.waveCounterElement)}buildStateIndicator(){this.stateElement=document.createElement(`div`),this.stateElement.style.cssText=`
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
        `,document.body.appendChild(this.stateElement)}updateWaveCounter(e,t){if(!this.waveCounterElement)return;let n=Math.min(e,t);this.waveCounterElement.textContent=`WAVE ${n} / ${t}`}updateLauncherState(e){if(!this.stateElement)return;let t={READY:`Ready to fire`,FIRED:`Missile in flight`,POST_FIRE:`Press R to reload`,TOSSING:`Reloading...`,RELOADING:`Reloading...`};this.stateElement.textContent=t[e]??e}showAnnouncement(e){let t=document.createElement(`div`);t.style.cssText=`
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
        `,t.textContent=e,document.body.appendChild(t),setTimeout(()=>t.remove(),3e3)}showEndScreen(e,t){document.pointerLockElement&&document.exitPointerLock();let n=document.createElement(`div`);n.style.cssText=`
            position: fixed;
            top: 0; left: 0;
            width: 100vw; height: 100vh;
            display: flex;
            flex-direction: column;
            justify-content: center;
            align-items: center;
            background: rgba(0, 0, 0, 0.65);
            color: white;
            font-family: monospace;
            z-index: 200;
        `,n.innerHTML=`
            <h1 style="font-size: 3rem; margin: 0 0 0.5rem 0;">${e}</h1>
            <p style="font-size: 1.1rem; margin: 0 0 2rem 0;">${t}</p>
            <button id="restart-button" style="
                font-size: 1.1rem;
                font-family: monospace;
                padding: 0.5rem 2.5rem;
                cursor: pointer;
                background: transparent;
                color: white;
                border: 1px solid white;
                letter-spacing: 0.1em;
            ">RESTART</button>
        `,document.body.appendChild(n),document.getElementById(`restart-button`).addEventListener(`click`,()=>{window.location.reload()})}},I=new r,L=new i().load(`/final-project-interactivelan/textures/sky.jpeg`);L.mapping=303,L.colorSpace=t,I.background=L;var R=new u(75,window.innerWidth/window.innerHeight,.1,1e3),z=new l({antialias:!0});z.setSize(window.innerWidth,window.innerHeight),z.shadowMap.enabled=!0,z.shadowMap.type=1,z.toneMapping=4,z.toneMappingExposure=1,`outputColorSpace`in z?z.outputColorSpace=t:z.outputEncoding=void 0,document.body.appendChild(z.domElement),window.scene=I,window.camera=R;var B=performance.now();I.fog=new c(8029844,140,420);var V=new d(16766627,2.4);V.position.set(55,38,-25),V.castShadow=!0,V.shadow.bias=-5e-4,V.shadow.mapSize.set(2048,2048),V.shadow.camera.near=1,V.shadow.camera.far=260,V.shadow.camera.left=-140,V.shadow.camera.right=140,V.shadow.camera.top=140,V.shadow.camera.bottom=-140;var H=new _(10206463,2761244,.38),U=new a(16777215,.05);I.add(V),I.add(H),I.add(U);var W=new b,G=new O(R);await k(G);var K=await g(`/final-project-interactivelan/models/launcher.glb`),q=await g(`/final-project-interactivelan/models/tank.glb`),J=await f(),Y=new w(500,120,.005,4,new e(200,0,200),[new e(-200,0,-200),new e(0,0,-200),new e(-200,0,0)]),X=await C(I,Y,J,3,.7);T(I,Y,Y.launcherSpawn),X.push(Y.terrain);var Z=new S(K,X,G),Q=[],$=new F,ee=new P(Y,Z,Q,ne,$);window.addEventListener(`resize`,te);function te(){R.aspect=window.innerWidth/window.innerHeight,R.updateProjectionMatrix(),z.setSize(window.innerWidth,window.innerHeight),Z.onResize()}function ne(t){let n=Y.navMap.findNearestPassable(t.x,t.z),r=new e(n.x,Y.getHeightAt(n.x,n.z),n.z),i=new x(m(q),G);return Q.push(i),i.addToScene(I,Y,r),Z.registerTank(i),i.setNavigation(Y.navMap,Y.launcherSpawn),i}async function re(){Y.addToScene(I),Y.terrain.updateMatrixWorld(!0),Z.addToScene(I,Y.launcherSpawn),Z.setMapCenter(new e(0,0,0)),Z.faceToward(new e(0,0,0)),Z.setMainCamera()}await A(z,R,re);function ie(){let e=performance.now(),t=(e-B)/1e3;B=e,Z.update(W,t,I,Y.terrain);for(let e of Q)e.update(t,Z.activeCamera??R);ee.update(t),$.updateLauncherState(Z.state),v(t);let n=Z.activeCamera??R;G.setCamera(n),z.render(I,n)}z.setAnimationLoop(ie);