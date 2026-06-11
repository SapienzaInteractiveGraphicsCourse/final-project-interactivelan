import{B as e,H as t,J as n,N as r,O as i,P as a,U as o,V as s,Y as c,_ as l,b as u,c as d,d as f,f as p,g as m,h,k as g,l as _,p as v,t as y,u as b,v as x,w as S}from"./shaders-9iCx1kX7.js";import{i as C,n as w,t as T}from"./tank-DmcQFMmG.js";import{t as E}from"./launcher-DzE8nmGm.js";import{n as D,t as O}from"./clutter-CsqYggX4.js";var k=550,A=25e4,j=.36,M=.1;function N(){let t=document.createElement(`canvas`);t.width=256,t.height=256;let n=t.getContext(`2d`),r=n.createImageData(256,256),i=new Float32Array(256*256*3);for(let e=0;e<i.length;e++)i[e]=Math.random();for(let e=1;e<255;e++)for(let t=1;t<255;t++)for(let n=0;n<3;n++){let r=(e*256+t)*3+n;i[r]=(i[((e-1)*256+t)*3+n]+i[((e+1)*256+t)*3+n]+i[(e*256+(t-1))*3+n]+i[(e*256+(t+1))*3+n]+i[r])/5}for(let e=0;e<256*256;e++)r.data[e*4]=i[e*3]*255,r.data[e*4+1]=i[e*3+1]*255,r.data[e*4+2]=i[e*3+2]*255,r.data[e*4+3]=255;n.putImageData(r,0,0);let a=new l(t);return a.wrapS=e,a.wrapT=e,a}function P(e,n){let i=new v().setFromObject(e),a=new c(512,512),s=(i.max.x-i.min.x)/2,l=(i.max.z-i.min.z)/2,u=new r(-s,s,l,-l,0,1e3);u.position.set((i.min.x+i.max.x)/2,i.max.y+100,(i.min.z+i.max.z)/2),u.lookAt((i.min.x+i.max.x)/2,0,(i.min.z+i.max.z)/2);let d=new o({vertexShader:`
            varying float vHeight;
            uniform float uMinY;
            uniform float uMaxY;
            void main() {
                vHeight    = (position.y - uMinY) / (uMaxY - uMinY);
                gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
            }
        `,fragmentShader:`
            varying float vHeight;
            void main() {
                gl_FragColor = vec4(vHeight, vHeight, vHeight, 1.0);
            }
        `,uniforms:{uMinY:{value:i.min.y},uMaxY:{value:i.max.y}}}),f=e.material;e.material=d;let p=new t;return p.add(e),n.setRenderTarget(a),n.render(p,u),n.setRenderTarget(null),e.material=f,{texture:a.texture,bbox:i}}var F=`
    uniform float uTime;
    uniform sampler2D uNoiseTexture;
    uniform vec3  uPlayerPosition;
    uniform sampler2D uHeightMap;
    uniform vec3  uBoundingBoxMin;
    uniform vec3  uBoundingBoxMax;
    uniform float uPatchSize;
    uniform float uBladeWidth;
    uniform float uWindDirection;
    uniform float uWindSpeed;
    uniform float uWindNoiseScale;
    uniform float uBaldPatchModifier;
    uniform float uFalloffSharpness;
    uniform float uHeightNoiseFrequency;
    uniform float uHeightNoiseAmplitude;
    uniform float uMaxBendAngle;
    uniform float uMaxBladeHeight;
    uniform float uRandomHeightAmount;

    attribute vec3 aYaw;
    attribute vec3 aBladeOrigin;
    attribute float aBladeScale;

    varying vec3 vColor;

    float map(float value, float min1, float max1, float min2, float max2) {
        return min2 + (value - min1) * (max2 - min2) / (max1 - min1);
    }

    float random(vec2 st) {
        return fract(sin(dot(st.xy, vec2(12.9898, 78.233))) * 43758.5453123);
    }

    mat3 rotate3d(vec3 axis, float angle) {
        axis     = normalize(axis);
        float s  = sin(angle);
        float c  = cos(angle);
        float oc = 1.0 - c;
        return mat3(
            oc*axis.x*axis.x + c,          oc*axis.x*axis.y - axis.z*s,  oc*axis.z*axis.x + axis.y*s,
            oc*axis.x*axis.y + axis.z*s,  oc*axis.y*axis.y + c,          oc*axis.y*axis.z - axis.x*s,
            oc*axis.z*axis.x - axis.y*s,  oc*axis.y*axis.z + axis.x*s,  oc*axis.z*axis.z + c
        );
    }

    void main() {
        vec3 transformed = position;
        vec3 origin      = aBladeOrigin;

        // Sliding window: wrap blades around launcher position
        float halfPatchSize = uPatchSize * 0.5;
        origin.x = mod(origin.x - uPlayerPosition.x + halfPatchSize, uPatchSize) - halfPatchSize;
        origin.z = mod(origin.z - uPlayerPosition.z + halfPatchSize, uPatchSize) - halfPatchSize;

        vec3 worldPos   = uPlayerPosition + origin;
        transformed.x   = origin.x;
        transformed.z   = origin.z;

        // Map to height map UVs based on world position
        vec2 uv = vec2(
            map(uPlayerPosition.x + origin.x, uBoundingBoxMin.x, uBoundingBoxMax.x, 0.0, 1.0),
            1.0 - map(uPlayerPosition.z + origin.z, uBoundingBoxMin.z, uBoundingBoxMax.z, 0.0, 1.0)
        );

        // Bilinear height map sampling for smooth terrain conformance
        vec2 texSize  = vec2(textureSize(uHeightMap, 0));
        vec2 uvTexel  = uv * texSize - 0.5;
        vec2 uvFloor  = floor(uvTexel) / texSize;
        vec2 uvCeil   = ceil(uvTexel)  / texSize;
        vec2 uvFrac   = fract(uvTexel);

        vec3 h00 = texture2D(uHeightMap, uvFloor).rgb;
        vec3 h10 = texture2D(uHeightMap, vec2(uvCeil.x,  uvFloor.y)).rgb;
        vec3 h01 = texture2D(uHeightMap, vec2(uvFloor.x, uvCeil.y)).rgb;
        vec3 h11 = texture2D(uHeightMap, uvCeil).rgb;

        vec3  heightMapColor = mix(mix(h00, h10, uvFrac.x), mix(h01, h11, uvFrac.x), uvFrac.y);
        float terrainHeight  = heightMapColor.x;
        float displacement   = map(terrainHeight, 0.0, 1.0, uBoundingBoxMin.y, uBoundingBoxMax.y);
        transformed.y += displacement - uPlayerPosition.y;

        // Height variation using noise
        vec3  heightNoise    = texture2D(uNoiseTexture, uv.yx * vec2(uHeightNoiseFrequency)).rgb;
        float heightModifier = ((heightNoise.r + heightNoise.g + heightNoise.b) * uMaxBladeHeight) * uHeightNoiseAmplitude;
        heightModifier      += random(uv) * (uRandomHeightAmount * 0.1);
        heightModifier      *= aBladeScale;

        // Edge falloff so patch doesn't look like a square
        float edgeDistanceX = abs(origin.x) / halfPatchSize;
        float edgeDistanceZ = abs(origin.z) / halfPatchSize;
        float edgeFactor    = 1.0 - max(edgeDistanceX, edgeDistanceZ);
        edgeFactor          = pow(edgeFactor, uFalloffSharpness);

        // Bald patches for natural variation
        float baldPatchOffset = heightNoise.r * (uBaldPatchModifier * (1.0 - edgeFactor));
        heightModifier       -= baldPatchOffset;

        // Fade grass at terrain bounding box edges
        float edgeFade =
            smoothstep(uBoundingBoxMin.x, uBoundingBoxMin.x + 2.0, worldPos.x) *
            smoothstep(uBoundingBoxMax.x, uBoundingBoxMax.x - 2.0, worldPos.x) *
            smoothstep(uBoundingBoxMin.z, uBoundingBoxMin.z + 2.0, worldPos.z) *
            smoothstep(uBoundingBoxMax.z, uBoundingBoxMax.z - 2.0, worldPos.z);
        heightModifier *= edgeFade;

        // Blade shape: use color attribute to identify bottom-left, bottom-right, top
        float factor = (color.r > 0.05) ? 1.0 : (color.b > 0.05) ? -1.0 : 0.0;
        float width  = smoothstep(0.5, 1.0, heightModifier * 2.0) * uBladeWidth * aBladeScale;
        transformed += aYaw * (width / 2.0) * factor;

        // Grass color: dark at base, lighter at tip
        vec3 baseColor = mix(vec3(0.18, 0.30, 0.05), vec3(0.42, 0.62, 0.12), color.g);
        vec3 colorNoise = texture2D(uNoiseTexture, uv.yx * vec2(uHeightNoiseFrequency) + (uTime * 0.1)).rgb;
        vColor = baseColor * (0.7 + 0.3 * colorNoise.r);

        // Reduce blade height near launcher center so it doesn't obstruct view (we use 0.2 because it should be enough for launcher)
        float distanceFromCenter = length(origin.xz) / halfPatchSize;
        float innerCircleFactor  = clamp(smoothstep(0.0, 0.02, distanceFromCenter), 0.0, 1.0);
        heightModifier          *= mix(0.1, 1.0, innerCircleFactor);

        // Wind effect using scrolling noise texture
        float noiseScale    = uWindNoiseScale * 0.1;
        vec2  noiseUV       = vec2(origin.x * noiseScale, origin.z * noiseScale);
        mat2  windRot       = mat2(cos(uWindDirection), -sin(uWindDirection),
                                   sin(uWindDirection),  cos(uWindDirection));
        vec2  rotatedNoiseUV = windRot * noiseUV + uTime * vec2(uWindSpeed);
        vec3  windNoise      = texture2D(uNoiseTexture, rotatedNoiseUV).rgb;

        vec3  axis   = vec3(windNoise.g, 0.0, windNoise.b);
        float angle  = radians(map(windNoise.g + windNoise.b, 0.0, 2.0, -uMaxBendAngle, uMaxBendAngle)) * color.g;
        mat3  rotMat = rotate3d(axis, angle);

        // Rotate blade tip around its base
        vec3 basePos     = vec3(transformed.x, transformed.y - heightModifier, transformed.z);
        vec3 relativePos = transformed - basePos;
        relativePos      = rotMat * relativePos;
        transformed      = basePos + relativePos;
        transformed.y   += heightModifier * color.g;

        vec4 modelPosition    = modelMatrix * vec4(transformed, 1.0);
        vec4 viewPosition     = viewMatrix * modelPosition;
        vec4 projectedPosition = projectionMatrix * viewPosition;
        gl_Position           = projectedPosition;
    }
`,I=`
    varying vec3 vColor;
    void main() {
        gl_FragColor = vec4(vColor, 1.0);
    }
`;function L(e,t){let r=[],a=[],o=[],s=[],c=[],l=[],u=[],d=t*.5,f=new n;for(let n=0;n<e;n++){let e=i.randFloat(-d,d),p=i.randFloat(-d,d),m=[e/t+.5,p/t+.5],h=Math.random()*Math.PI*2,g=i.randFloat(.7,2);f.set(Math.sin(h),0,-Math.cos(h));let _=[{color:[.1,0,0]},{color:[0,0,.1]},{color:[1,1,1]}],v=n*3;_.forEach(t=>{r.push(e,0,p),a.push(...t.color),o.push(...m),l.push(f.x,f.y,f.z),s.push(e,0,p),c.push(g)}),u.push(v,v+1,v+2)}let p=new m;return p.setAttribute(`position`,new h(new Float32Array(r),3)),p.setAttribute(`color`,new h(new Float32Array(a),3)),p.setAttribute(`uv`,new h(new Float32Array(o),2)),p.setAttribute(`aYaw`,new h(new Float32Array(l),3)),p.setAttribute(`aBladeOrigin`,new h(new Float32Array(s),3)),p.setAttribute(`aBladeScale`,new h(new Float32Array(c),1)),p.setIndex(u),p.computeVertexNormals(),p}function R(e,t,r){let i=N(),{texture:a,bbox:s}=P(t,r),c=L(A,k),l=new o({vertexShader:F,fragmentShader:I,vertexColors:!0,side:2,uniforms:{uTime:{value:0},uNoiseTexture:{value:i},uPlayerPosition:{value:new n},uHeightMap:{value:a},uBoundingBoxMin:{value:s.min},uBoundingBoxMax:{value:s.max},uPatchSize:{value:k},uBladeWidth:{value:j},uWindDirection:{value:Math.PI*.25},uWindSpeed:{value:.3},uWindNoiseScale:{value:.9},uBaldPatchModifier:{value:2.5},uFalloffSharpness:{value:.35},uHeightNoiseFrequency:{value:12},uHeightNoiseAmplitude:{value:3},uMaxBendAngle:{value:22},uMaxBladeHeight:{value:M},uRandomHeightAmount:{value:.25}}}),u=new g(c,l);return u.frustumCulled=!1,e.add(u),{update(e,t,n){l.uniforms.uTime.value=t,l.uniforms.uPlayerPosition.value.copy(n)}}}var z=new t;z.background=new x(9224191);var B=new a(75,window.innerWidth/window.innerHeight,.1,1e3),V=new f({antialias:!0});V.setSize(window.innerWidth,window.innerHeight),V.shadowMap.enabled=!0,V.shadowMap.type=1,V.toneMapping=4,V.toneMappingExposure=1,`outputColorSpace`in V?V.outputColorSpace=s:V.outputEncoding=void 0,document.body.appendChild(V.domElement),window.scene=z,window.camera=B;var H=performance.now(),U=new u(16773608,1.2);U.position.set(20,30,10),U.castShadow=!0,U.shadow.bias=-5e-4,U.shadow.mapSize.set(2048,2048),U.shadow.camera.near=.5,U.shadow.camera.far=2e3,U.shadow.camera.left=-120,U.shadow.camera.right=120,U.shadow.camera.top=120,U.shadow.camera.bottom=-120;var W=new S(14544639,4469538,.6),G=new p(16777215,.15);z.add(U),z.add(W),z.add(G);var K=new w,q=await d(`/final-project-interactivelan/models/launcher.glb`);y(q);var J=await d(`/final-project-interactivelan/models/tank.glb`),Y=await _(),X=new D(500,120,.005,4,new n(200,0,200),[new n(-200,0,-200),new n(0,0,-200),new n(-200,0,0)]),Z=await O(z,X,Y,3,.7);R(z,X.terrain,V),Z.push(X.terrain);var Q=new E(q,Z),$=[];window.addEventListener(`resize`,ee);function ee(){B.aspect=window.innerWidth/window.innerHeight,B.updateProjectionMatrix(),V.setSize(window.innerWidth,window.innerHeight),Q.onResize()}function te(e){let t=X.navMap.findNearestPassable(e.x,e.z),r=new n(t.x,X.getHeightAt(t.x,t.z),t.z),i=new T(b(J));return $.push(i),i.addToScene(z,X,r),Q.registerTank(i),i.setNavigation(X.navMap,X.launcherSpawn),i}async function ne(){X.addToScene(z),X.terrain.updateMatrixWorld(!0),Q.addToScene(z,X.launcherSpawn),Q.faceToward(new n(0,0,0)),Q.setMainCamera();for(let e of X.enemySpawnPositions)console.log(e),te(e)}await ne();function re(){let e=performance.now(),t=(e-H)/1e3;H=e,Q.update(K,t,z,X.terrain);for(let e of $)e.update(t,Q.activeCamera??B);C(t),V.render(z,Q.activeCamera??B)}V.setAnimationLoop(re);