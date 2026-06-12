import{B as e,C as t,D as n,G as r,M as i,O as a,R as o,_ as s,c,d as l,f as u,g as d,h as f,l as p,t as m,u as h,y as g,z as _}from"./shaders-CyLPF8QX.js";import{i as v,n as y,t as b}from"./tank-CDYwFcPZ.js";import{t as x}from"./launcher-ck9iyc4p.js";import{n as S,r as C,t as w}from"./clutter-6n9JuR4u.js";var T=25e4,E=.36,D=.35,O=1.1,k=4,A=`
    uniform float uBladeWidth;

    attribute vec3  aYaw;
    attribute float aBladeHeight;
    attribute float aTint;

    varying vec3 vColor;

    void main() {
        // position already holds the blade base in world space, baked at build time
        vec3 transformed = position;

        // Blade shape: color attribute identifies bottom left, bottom right, top
        float factor = (color.r > 0.05) ? 1.0 : (color.b > 0.05) ? -1.0 : 0.0;
        float width  = uBladeWidth * clamp(aBladeHeight, 0.4, 1.2);
        transformed += aYaw * (width / 2.0) * factor;

        // The tip is just raised vertically
        transformed.y += aBladeHeight * color.g;

        // Grass color: dark at base, lighter at tip, per blade tint baked on the CPU
        vec3 baseColor = mix(vec3(0.18, 0.30, 0.05), vec3(0.42, 0.62, 0.12), color.g);
        vColor = baseColor * aTint;

        gl_Position = projectionMatrix * viewMatrix * modelMatrix * vec4(transformed, 1.0);
    }
`,j=`
    varying vec3 vColor;
    void main() {
        gl_FragColor = vec4(vColor, 1.0);
    }
`;function M(e,t){let i=[],a=[],o=[],s=[],c=[],l=t.size/2,u=new r,p=C(),m=t.launcherSpawn.x,h=t.launcherSpawn.z,g=0;for(;g<e;){let e=n.randFloat(-l,l),r=n.randFloat(-l,l),d=(p(e*.02,r*.02)+1)/2;if(Math.random()>d*1.4||Math.hypot(e-m,r-h)<k)continue;let f=n.lerp(D,O,d)*n.randFloat(.8,1.2),_=t.getHeightAt(e,r)-.05,v=Math.random()*Math.PI*2;u.set(Math.sin(v),0,-Math.cos(v));let y=n.randFloat(.7,1);[{color:[.1,0,0]},{color:[0,0,.1]},{color:[1,1,1]}].forEach(t=>{i.push(e,_,r),a.push(...t.color),o.push(u.x,u.y,u.z),s.push(f),c.push(y)}),g++}let _=new d;return _.setAttribute(`position`,new f(new Float32Array(i),3)),_.setAttribute(`color`,new f(new Float32Array(a),3)),_.setAttribute(`aYaw`,new f(new Float32Array(o),3)),_.setAttribute(`aBladeHeight`,new f(new Float32Array(s),1)),_.setAttribute(`aTint`,new f(new Float32Array(c),1)),_}function N(t,n){let r=M(T,n),i=new e({vertexShader:A,fragmentShader:j,vertexColors:!0,side:2,uniforms:{uBladeWidth:{value:E}}}),o=new a(r,i);return o.frustumCulled=!1,t.add(o),{dispose(){t.remove(o),r.dispose(),i.dispose()}}}var P=new _;P.background=new s(9224191);var F=new i(75,window.innerWidth/window.innerHeight,.1,1e3),I=new l({antialias:!0});I.setSize(window.innerWidth,window.innerHeight),I.shadowMap.enabled=!0,I.shadowMap.type=1,I.toneMapping=4,I.toneMappingExposure=1,`outputColorSpace`in I?I.outputColorSpace=o:I.outputEncoding=void 0,document.body.appendChild(I.domElement),window.scene=P,window.camera=F;var L=performance.now(),R=new g(16773608,1.2);R.position.set(20,30,10),R.castShadow=!0,R.shadow.bias=-5e-4,R.shadow.mapSize.set(2048,2048),R.shadow.camera.near=.5,R.shadow.camera.far=2e3,R.shadow.camera.left=-120,R.shadow.camera.right=120,R.shadow.camera.top=120,R.shadow.camera.bottom=-120;var z=new t(14544639,4469538,.6),B=new u(16777215,.15);P.add(R),P.add(z),P.add(B);var V=new y,H=await c(`/final-project-interactivelan/models/launcher.glb`);m(H);var U=await c(`/final-project-interactivelan/models/tank.glb`),W=await p(),G=new S(500,120,.005,4,new r(200,0,200),[new r(-200,0,-200),new r(0,0,-200),new r(-200,0,0)]),K=await w(P,G,W,3,.7);N(P,G),K.push(G.terrain);var q=new x(H,K),J=[];window.addEventListener(`resize`,Y);function Y(){F.aspect=window.innerWidth/window.innerHeight,F.updateProjectionMatrix(),I.setSize(window.innerWidth,window.innerHeight),q.onResize()}function X(e){let t=G.navMap.findNearestPassable(e.x,e.z),n=new r(t.x,G.getHeightAt(t.x,t.z),t.z),i=new b(h(U));return J.push(i),i.addToScene(P,G,n),q.registerTank(i),i.setNavigation(G.navMap,G.launcherSpawn),i}async function Z(){G.addToScene(P),G.terrain.updateMatrixWorld(!0),q.addToScene(P,G.launcherSpawn),q.setMapCenter(new r(0,0,0)),q.faceToward(new r(0,0,0)),q.setMainCamera();for(let e of G.enemySpawnPositions)console.log(e),X(e)}await Z();function Q(){let e=performance.now(),t=(e-L)/1e3;L=e,q.update(V,t,P,G.terrain);for(let e of J)e.update(t,q.activeCamera??F);v(t),I.render(P,q.activeCamera??F)}I.setAnimationLoop(Q);