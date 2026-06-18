import{P as e,U as t,X as n,Y as r}from"./loader-BcyVLW1i.js";var i=new r;function a(e){let t=i.load(e);return t.flipY=!1,t}function o(t,n=-1,r=-1){let i=`/final-project-interactivelan/textures/${t}`,o=new e({map:a(`${i}/Base.png`),normalMap:a(`${i}/Normal_OpenGL.png`),aoMap:a(`${i}/AO.png`)});return n===-1?o.metalnessMap=a(`${i}/Metallic.png`):o.metalness=n,r===-1?o.roughnessMap=a(`${i}/Roughness.png`):o.roughness=r,o}var s=o(`launcher`),c=o(`tank`),l=o(`terrain`,0,.92);l.map.repeat.set(50,50),l.map.wrapS=t,l.map.wrapT=t,l.normalMap.repeat.set(50,50),l.normalMap.wrapS=t,l.normalMap.wrapT=t,l.aoMap.repeat.set(50,50),l.aoMap.wrapS=t,l.aoMap.wrapT=t,l.normalScale=new n(1.4,1.4),l.vertexColors=!0;var u=class{constructor(){this.waveCounterElement=null,this.stateElement=null,this.crosshairElement=null,this.buildWaveCounter(),this.buildScore(),this.buildStateIndicator(),this.initCrosshair()}async initCrosshair(){try{let e=await(await fetch(`/final-project-interactivelan/ui/crosshair.svg`)).text();this.crosshairElement=document.createElement(`div`),this.crosshairElement.id=`crosshair-ui`,this.crosshairElement.style.cssText=`
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
        `,document.head.appendChild(e)}};function d(e){let t=document.createElement(`div`);t.style.cssText=[`position:fixed`,`bottom:16px`,`left:16px`,`font-family:monospace`,`font-size:12px`,`color:#ccc`,`background:rgba(0,0,0,0.5)`,`padding:7px 14px`,`border-radius:4px`,`pointer-events:none`,`line-height:1.85`,`z-index:9999`,`user-select:none`].join(`;`);let n=new Map;for(let[r,i]of e){let e=document.createElement(`div`);e.innerHTML=f(r,i),t.appendChild(e),n.set(r,e)}return document.body.appendChild(t),{setLabel(e,t){let r=n.get(e);r&&(r.innerHTML=f(e,t))}}}function f(e,t){return`<span style="color:#7bcfff;display:inline-block;min-width:76px">${e}</span>${t}`}export{l as a,c as i,d as n,s as r,u as t};