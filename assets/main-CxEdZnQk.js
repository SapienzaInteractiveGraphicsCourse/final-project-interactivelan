import{B as e,K as t,P as n,W as r,_ as i,a,b as o,c as s,g as c,h as l,i as u,j as d,l as f,n as p,o as m,p as h,r as g,s as _,t as v,y,z as b}from"./loader-CxeXPNmJ.js";import{a as x,n as S,r as C,t as w}from"./tank-fW2IgrNR.js";import{t as ee}from"./launcher-Cljo71wH.js";import{n as te,r as T,t as ne}from"./grass-C0JXvANz.js";import{n as re,t as E}from"./tv-kMiJF5oV.js";var D=class{constructor(e){this.model=e,this.group=new y,this.group.add(e)}addToScene(e,t,n=new c,r=1){this.group.position.copy(t),this.group.rotation.copy(n),this.group.scale.setScalar(r),e.add(this.group)}dispose(e){e.remove(this.group)}};async function O(){return p(`/final-project-interactivelan/models/sandbags.glb`)}var k=class{constructor(e){this.listener=new _,e.add(this.listener),this.loader=new s,this.buffers={}}setCamera(e){!e||this.listener.parent===e||e.add(this.listener)}async load(e,t){let n=await(await fetch(t)).arrayBuffer();new TextDecoder().decode(n.slice(0,120));let r=await this.listener.context.decodeAudioData(n);return this.buffers[e]=r,r}createPositional(e,{loop:t=!1,volume:r=1,refDistance:i=20,rolloffFactor:a=1,distanceModel:o=`inverse`,maxDistance:s=200}={}){let c=this.buffers[e];if(!c)return console.warn(`Audio buffer "${e}" was not loaded`),null;let l=new n(this.listener);return l.setBuffer(c),l.setLoop(t),l.setVolume(r),l.setRefDistance(i),l.setRolloffFactor(a),l.setDistanceModel(o),l.setMaxDistance(s),l}};async function A(e){for(let[t,n]of[[`launcherFire`,`/final-project-interactivelan/sounds/missile_firing.ogg`],[`launcherReload`,`/final-project-interactivelan/sounds/reload.ogg`],[`tubeToss`,`/final-project-interactivelan/sounds/reload.ogg`],[`missileExplosion`,`/final-project-interactivelan/sounds/explosion_a.ogg`],[`tankExplosion`,`/final-project-interactivelan/sounds/explosion_b.ogg`],[`tankEngine`,`/final-project-interactivelan/sounds/tank_moving.ogg`],[`tankTrack`,`/final-project-interactivelan/sounds/tracks.ogg`],[`tankTurretRotate`,`/final-project-interactivelan/sounds/turret_rotate.ogg`]])try{await e.load(t,n),console.log(`Loaded sound: ${t}`,n)}catch(e){throw console.error(`Failed loading sound: ${t}`,n,e),e}}async function ie(n,r,i){let a=new re(1),s=new E,c=new e;c.background=new h(657930),await s.load(c,new t(0,0,0),`/final-project-interactivelan/models/tv.glb`);let u=new f().setFromObject(s.model),d=new t,p=new t;u.getCenter(d),u.getSize(p);let m=Math.max(p.x,p.y,p.z);r.position.set(d.x-.2,d.y+.2,d.z+m*1.2),r.lookAt(d);let g=new o(12572927,1710618,.55);c.add(g);let _=new l(16774112,2.3);_.position.set(1,2,3),c.add(_),n.setAnimationLoop(()=>{n.render(c,r)});let v=document.createElement(`div`);v.style.cssText=`
        position: fixed;
        bottom: 20px;
        right: 24px;
        color: rgba(255, 255, 255, 0.5);
        font-family: monospace;
        font-size: 0.85rem;
        z-index: 300;
        pointer-events: none;
    `,v.textContent=`ENTER to skip`,s.onPlaybackStarted=()=>{document.body.appendChild(v),document.addEventListener(`keydown`,y)};let y=e=>{e.code===`Enter`&&(document.removeEventListener(`keydown`,y),v.remove(),s.skip())};await s.playIntro(c,new t),document.removeEventListener(`keydown`,y),v.remove(),n.setAnimationLoop(null),n.setClearColor(0,1),n.clear(),await a.fadeOut(),s.dispose(c),await i(),await a.fadeIn(),a.dispose()}var ae=20,j=Object.freeze({PLAYING:`PLAYING`,WIN:`WIN`,LOSE:`LOSE`}),M=[{delay:1,spawnIndices:[0,8]},{delay:1,spawnIndices:[1,7,3]},{delay:1,spawnIndices:[2,4,5,6]}],N=class{constructor(e,t,n,r,i){this.terrain=e,this.launcher=t,this.tanks=n,this.addTank=r,this.hud=i,this.state=j.PLAYING,this.currentWaveIndex=0,this.waveTimer=0,this.allWavesSpawned=!1,this.score=0}spawnWave(e){for(let t of e.spawnIndices)this.addTank(this.terrain.enemySpawnPositions[t])}allCurrentTanksDead(){return this.tanks.length>0&&this.tanks.every(e=>e.state===S.DEAD)}updateWaves(e){this.allWavesSpawned||this.currentWaveIndex>0&&!this.allCurrentTanksDead()||(this.waveTimer+=e,this.waveTimer>=M[this.currentWaveIndex].delay&&(this.waveTimer=0,this.spawnWave(M[this.currentWaveIndex]),this.hud.showAnnouncement(`Wave ${this.currentWaveIndex+1} of ${M.length}`,2e3),this.currentWaveIndex++,this.currentWaveIndex>=M.length&&(this.allWavesSpawned=!0)))}onTankDestroyed(e){this.score++,this.hud.updateScore(this.score),this.terrain.navMap.setBlocked(e.group.position.x,e.group.position.z,2)}checkConditions(){if(this.state===j.PLAYING){for(let e of this.tanks)if(e.state===S.ALIVE&&e.group.position.distanceTo(this.terrain.launcherSpawn)<ae){this.state=j.LOSE,this.hud.showEndScreen(`POSITION OVERRUN`,`A tank reached your position.`,this.score);return}this.allWavesSpawned&&this.allCurrentTanksDead()&&(this.state=j.WIN,this.hud.showEndScreen(`AREA SECURED`,`All enemy armor destroyed.`,this.score))}}update(e){this.state===j.PLAYING&&(this.updateWaves(e),this.checkConditions(),this.hud.updateWaveCounter(this.currentWaveIndex,M.length))}},P=class{constructor(){this.waveCounterElement=null,this.stateElement=null,this.buildWaveCounter(),this.buildScore(),this.buildStateIndicator()}buildWaveCounter(){this.waveCounterElement=document.createElement(`div`),this.waveCounterElement.style.cssText=`
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
        `,document.body.appendChild(this.stateElement)}updateWaveCounter(e,t){if(!this.waveCounterElement)return;let n=Math.min(e,t);this.waveCounterElement.textContent=`WAVE ${n} / ${t}`}updateLauncherState(e){if(!this.stateElement)return;let t={READY:`Ready to fire`,FIRED:`Missile in flight`,POST_FIRE:`Press R to reload`,TOSSING:`Reloading...`,RELOADING:`Reloading...`};this.stateElement.textContent=t[e]??e}updateScore(e){this.scoreElement&&(this.scoreElement.textContent=`KILLS: ${e}`)}showAnnouncement(e){let t=document.createElement(`div`);t.style.cssText=`
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
        `,document.body.appendChild(n),document.getElementById(`restart-button`).addEventListener(`click`,()=>{window.location.reload()})}},F=new e,I=new r().load(`/final-project-interactivelan/textures/sky.jpeg`);I.mapping=303,I.colorSpace=b,F.background=I;var L=new d(75,window.innerWidth/window.innerHeight,.1,1e3),R=new a({antialias:!0});R.setSize(window.innerWidth,window.innerHeight),R.shadowMap.enabled=!0,R.shadowMap.type=1,R.toneMapping=4,R.toneMappingExposure=1,`outputColorSpace`in R?R.outputColorSpace=b:R.outputEncoding=void 0,document.body.appendChild(R.domElement),window.scene=F,window.camera=L;var z=performance.now();F.fog=new i(8029844,140,420);var B=new l(16766627,2.4);B.position.set(55,38,-25),B.castShadow=!0,B.shadow.bias=-5e-4,B.shadow.mapSize.set(2048,2048),B.shadow.camera.near=1,B.shadow.camera.far=260,B.shadow.camera.left=-140,B.shadow.camera.right=140,B.shadow.camera.top=140,B.shadow.camera.bottom=-140;var V=new o(10206463,2761244,.38),H=new m(16777215,.05);F.add(B),F.add(V),F.add(H);var U=new C,W=new k(L);await A(W);var G=await p(`/final-project-interactivelan/models/launcher.glb`),K=await p(`/final-project-interactivelan/models/tank.glb`),q=await g(),oe=new D(await O()),J=new T(400,100,.005,8,new t(150,0,150),[new t(-180,0,-90),new t(-180,0,-80),new t(-180,0,-180),new t(0,0,-180),new t(10,0,-180),new t(30,0,-180),new t(-180,0,0),new t(-180,0,10),new t(-180,0,30)]),Y=await te(F,J,q,3,.5);ne(F,J,await v(),.5,2.5),Y.push(J.terrain);var X=new ee(G,Y,W),Z=[],Q=new P,$=new N(J,X,Z,ce,Q);window.addEventListener(`resize`,se);function se(){L.aspect=window.innerWidth/window.innerHeight,L.updateProjectionMatrix(),R.setSize(window.innerWidth,window.innerHeight),X.onResize()}function ce(e){let n=J.navMap.findNearestPassable(e.x,e.z),r=new t(n.x,J.getHeightAt(n.x,n.z),n.z),i=new w(u(K),W);return Z.push(i),i.addToScene(F,J,r),X.registerTank(i),i.setNavigation(J.navMap,J.launcherSpawn),i}async function le(){J.addToScene(F),X.addToScene(F,J.launcherSpawn),oe.addToScene(F,new t(J.launcherSpawn.x-2,J.launcherSpawn.y,J.launcherSpawn.z-2),new c(0,Math.PI*.25,0),.75),X.setMapCenter(new t(0,0,0)),X.faceToward(new t(0,0,0)),X.setMainCamera(),J.terrain.updateMatrixWorld(!0)}await ie(R,L,le);function ue(){let e=performance.now(),t=(e-z)/1e3;z=e,X.update(U,t,F,J.terrain);for(let e of Z){let n=e.state===S.DEAD;e.update(t,X.activeCamera??L),!n&&e.state===S.DEAD&&$.onTankDestroyed(e)}$.update(t),Q.updateLauncherState(X.state),x(t);let n=X.activeCamera??L;W.setCamera(n),R.render(F,n)}R.setAnimationLoop(ue);