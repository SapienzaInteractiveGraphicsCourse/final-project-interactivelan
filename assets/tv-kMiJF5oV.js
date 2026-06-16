import{D as e,K as t,n,q as r,z as i}from"./loader-CxeXPNmJ.js";var a=class{constructor(e=3){this.duration=e*1e3,this.overlay=document.createElement(`div`),this.overlay.style.cssText=`
            position: fixed;
            top: 0; left: 0;
            width: 100vw; height: 100vh;
            background: black;
            opacity: 0;
            pointer-events: none;
            z-index: 500;
            transition: opacity ${e}s ease;
        `,document.body.appendChild(this.overlay)}fadeOut(){return new Promise(e=>{this.overlay.style.pointerEvents=`all`,this.overlay.style.opacity=`1`,setTimeout(e,this.duration)})}fadeIn(){return new Promise(e=>{this.overlay.style.opacity=`0`,setTimeout(()=>{this.overlay.style.pointerEvents=`none`,e()},this.duration)})}dispose(){this.overlay.remove()}},o=class{constructor(){this.model=null,this.videoElement=null,this.videoTexture=null,this.screenMesh=null,this.onEnded=null,this.onPlaybackStarted=null,this.started=!1}async load(a,o=new t,s=`/final-project-interactivelan/models/tv.glb`){this.model=await n(s),this.model.position.copy(o),a.add(this.model),this.videoElement=document.createElement(`video`),this.videoElement.src=`/final-project-interactivelan/video/intro.mp4`,this.videoElement.loop=!1,this.videoElement.muted=!1,this.videoElement.playsInline=!0,this.videoTexture=new r(this.videoElement),this.videoTexture.colorSpace=i,this.videoTexture.repeat.set(-1,1),this.videoTexture.offset.set(1,0),this.model.traverse(t=>{t.isMesh&&[t.material].forEach((n,r)=>{n.name===`Screen`&&(t.material=new e({map:this.videoTexture}),this.screenMesh=t)})}),this.videoElement.addEventListener(`ended`,()=>{this.onEnded&&this.onEnded()})}async play(){if(this.videoElement)try{await this.videoElement.play(),this.started=!0,this.onPlaybackStarted&&this.onPlaybackStarted()}catch(e){console.warn(e)}}stop(){this.videoElement&&(this.videoElement.pause(),this.videoElement.currentTime=0)}showStartPrompt(){let e=document.createElement(`div`);return e.id=`tv-start-prompt`,e.style.cssText=`
            position: fixed;
            bottom: 10%;
            left: 50%;
            transform: translateX(-50%);
            color: white;
            font-family: monospace;
            font-size: 1rem;
            text-shadow: 0 0 6px black;
            z-index: 300;
            pointer-events: none;
        `,e.textContent=`PRESS ANY KEY`,document.body.appendChild(e),e._blinkInterval=setInterval(()=>{e.style.visibility=e.style.visibility===`hidden`?`visible`:`hidden`},600),e}hideStartPrompt(){let e=document.getElementById(`tv-start-prompt`);e&&(clearInterval(e._blinkInterval),e.remove())}playIntro(e,t){return new Promise(async n=>{await this.load(e,t),this.onEnded=()=>{this.hideStartPrompt(),n()},this.showStartPrompt();let r=async()=>{document.removeEventListener(`keydown`,r),document.removeEventListener(`click`,r),this.hideStartPrompt(),await this.play()};document.addEventListener(`keydown`,r),document.addEventListener(`click`,r)})}skip(){!this.videoElement||!this.started||(this.videoElement.pause(),this.onEnded&&this.onEnded())}dispose(e){this.stop(),this.model&&e.remove(this.model),this.videoTexture&&this.videoTexture.dispose(),this.videoElement=null,this.videoTexture=null,this.model=null,this.screenMesh=null}};export{a as n,o as t};