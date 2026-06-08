import{D as e,E as t,H as n,I as r,L as i,M as a,R as o,V as s,_ as c,b as l,d as u,f as d,g as f,j as p,l as m,m as h,p as g,t as _,u as v,v as y,y as b}from"./shaders-D6eFsLvW.js";import{i as x,n as S,t as C}from"./tank-BJxloQg6.js";import{t as w}from"./launcher-I_l4c0_j.js";import{n as T,t as E}from"./world-DDcCbxyV.js";var D=500,O=1e6,k=.12,A=.3;function j(){let e=document.createElement(`canvas`);e.width=256,e.height=256;let t=e.getContext(`2d`),n=t.createImageData(256,256),i=new Float32Array(256*256*3);for(let e=0;e<i.length;e++)i[e]=Math.random();for(let e=1;e<255;e++)for(let t=1;t<255;t++)for(let n=0;n<3;n++){let r=(e*256+t)*3+n;i[r]=(i[((e-1)*256+t)*3+n]+i[((e+1)*256+t)*3+n]+i[(e*256+(t-1))*3+n]+i[(e*256+(t+1))*3+n]+i[r])/5}for(let e=0;e<256*256;e++)n.data[e*4]=i[e*3]*255,n.data[e*4+1]=i[e*3+1]*255,n.data[e*4+2]=i[e*3+2]*255,n.data[e*4+3]=255;t.putImageData(n,0,0);let a=new y(e);return a.wrapS=r,a.wrapT=r,a}function M(e,t){let r=new h().setFromObject(e),a=new n(512,512),s=(r.max.x-r.min.x)/2,c=(r.max.z-r.min.z)/2,l=new p(-s,s,c,-c,0,1e3);l.position.set((r.min.x+r.max.x)/2,r.max.y+100,(r.min.z+r.max.z)/2),l.lookAt((r.min.x+r.max.x)/2,0,(r.min.z+r.max.z)/2);let u=new o({vertexShader:`
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
        `,uniforms:{uMinY:{value:r.min.y},uMaxY:{value:r.max.y}}}),d=e.material;e.material=u;let f=new i;return f.add(e),t.setRenderTarget(a),t.render(f,l),t.setRenderTarget(null),e.material=d,{texture:a.texture,bbox:r}}var N=`
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
        float width  = smoothstep(0.5, 1.0, heightModifier * 2.0) * uBladeWidth;
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
`,P=`
    varying vec3 vColor;
    void main() {
        gl_FragColor = vec4(vColor, 1.0);
    }
`;function F(e,n){let r=[],i=[],a=[],o=[],l=[],u=[],d=n*.5,p=new s;for(let s=0;s<e;s++){let e=t.randFloat(-d,d),c=t.randFloat(-d,d),f=[e/n+.5,c/n+.5],m=Math.random()*Math.PI*2;p.set(Math.sin(m),0,-Math.cos(m));let h=[{color:[.1,0,0]},{color:[0,0,.1]},{color:[1,1,1]}],g=s*3;h.forEach(t=>{r.push(e,0,c),i.push(...t.color),a.push(...f),l.push(p.x,p.y,p.z),o.push(e,0,c)}),u.push(g,g+1,g+2)}let m=new c;return m.setAttribute(`position`,new f(new Float32Array(r),3)),m.setAttribute(`color`,new f(new Float32Array(i),3)),m.setAttribute(`uv`,new f(new Float32Array(a),2)),m.setAttribute(`aYaw`,new f(new Float32Array(l),3)),m.setAttribute(`aBladeOrigin`,new f(new Float32Array(o),3)),m.setIndex(u),m.computeVertexNormals(),m}function I(t,n,r){let i=j(),{texture:a,bbox:c}=M(n,r),l=F(O,D),u=new o({vertexShader:N,fragmentShader:P,vertexColors:!0,side:2,uniforms:{uTime:{value:0},uNoiseTexture:{value:i},uPlayerPosition:{value:new s},uHeightMap:{value:a},uBoundingBoxMin:{value:c.min},uBoundingBoxMax:{value:c.max},uPatchSize:{value:D},uBladeWidth:{value:k},uWindDirection:{value:Math.PI*.25},uWindSpeed:{value:.3},uWindNoiseScale:{value:.9},uBaldPatchModifier:{value:2.5},uFalloffSharpness:{value:.35},uHeightNoiseFrequency:{value:12},uHeightNoiseAmplitude:{value:3},uMaxBendAngle:{value:22},uMaxBladeHeight:{value:A},uRandomHeightAmount:{value:.25}}}),d=new e(l,u);return d.frustumCulled=!1,t.add(d),{update(e,t,n){u.uniforms.uTime.value=t,u.uniforms.uPlayerPosition.value.copy(n)}}}var L=new i,R=new a(75,window.innerWidth/window.innerHeight,.1,1e3),z=new d,B=performance.now();z.setSize(window.innerWidth,window.innerHeight),z.shadowMap.enabled=!0,z.shadowMap.type=1,document.body.appendChild(z.domElement);var V=new u(R,z.domElement);V.enableDamping=!0,V.dampingFactor=.08;var H=new l(16777215,1);H.position.set(10,5,5),H.shadow.camera.near=.5,H.shadow.camera.far=2e3,H.shadow.camera.left=-600,H.shadow.camera.right=600,H.shadow.camera.top=600,H.shadow.camera.bottom=-600,H.castShadow=!0,H.shadow.bias=-.005;var U=new g(16777215,.3);L.add(H),L.add(U),L.background=new b(`skyblue`),window.scene=L,window.camera=R;var W=new S;window.addEventListener(`resize`,()=>{R.aspect=window.innerWidth/window.innerHeight,R.updateProjectionMatrix(),z.setSize(window.innerWidth,window.innerHeight),K&&K.onResize()});var G=await m(`/final-project-interactivelan/models/launcher.glb`);_(G);var K=new w(G),q=await m(`/final-project-interactivelan/models/tank.glb`),J=[],Y=250,X=E(Y,120,.005,15),Z=X.terrain,Q=X.navMap;T(L,Z,Y,await v(),3,.6,Q),I(L,Z,z);function $(e){let t=new C(q);J.push(t),t.addToScene(L,e),K.registerTank(t)}async function ee(){L.add(Z),K.addToScene(L,new s(120,0,120)),K.setMainCamera(R);let e=new s;K.group.getWorldPosition(e);let t=new s;new h().setFromObject(G).getSize(t);let n=Math.max(t.x,t.y,t.z);R.position.set(e.x,e.y+n,e.z+n*2),R.lookAt(e),V.target.copy(e),$(new s(100,0,5))}ee();function te(){let e=performance.now(),t=(e-B)/1e3;B=e,K&&K.update(W,t,L,Z),V.update();for(let e of J)e&&e.update(t,K?.activeCamera??R);x(t),z.render(L,K?.activeCamera??R)}z.setAnimationLoop(te);