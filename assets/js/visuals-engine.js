/**
 * @file visuals-engine.js
 * @brief High-Fidelity Generative WebGL Engine for "The Void is Crimson"
 * @version 2.0.0
 * @date 2026-03-18
 *
 * Implements:
 * 1. The Event Horizon (Ray-marched refraction)
 * 2. Neural Fluid Weave (FBM flow field)
 * 3. Abyssal Volumetrics (Rayleigh-like scattering)
 * 4. Temporal Lens (Chromatic blur/DoF simulation)
 * 5. Reality Displacement (Domain warping)
 * 6. Raytraced Top Accretion Disc (Schwarzschild leapfrog, main page only)
 *
 * Architecture:
 *   Main page  → 3-pass composite: void→RT1, disc→RT2, composite→screen
 *   Act pages  → single-pass: void shader direct to screen
 */

(function initGenerativeWebGL() {
    'use strict';

    // ── State & Three.js Core ──────────────────────────────────────
    var scene, camera, renderer, clock, uniforms;
    var isWebGLAvailable = true;
    var animationId = null;
    var targetTension = 0.0;
    var currentTension = 0.0;

    // 3-pass compositing state (main page only)
    var rtVoid = null, rtDisc = null;
    var voidScene = null, discScene = null, compScene = null;
    var discUniforms = null, compUniforms = null;
    var isMainPage = false;

    // ── Tuned disc/composite values (from perfect_black_hole.html) ─
    var DISC = {
        comp_opacity:       1.14,
        comp_y_offset:      0.01,
        comp_x_offset:      0.0,
        comp_scale:         1.02,
        comp_disc_bright:   1.55,
        comp_void_bright:   0.90,
        comp_mask_radius:   1.14,
        comp_mask_soft:     0.35,
        cam_distance:       13.5,
        cam_inclination:    83.0,
        cam_fov:            65.0,
        disk_inner:         2.9,
        disk_outer:         6.5,
        disk_brightness:    2.3,
        disk_temp_inner:    0.7,
        disk_temp_falloff:  1.2,
        disk_noise_scale:   7.0,
        disk_noise_str:     0.6,
        disk_rot_speed:     1.7,
        doppler_str:        0.75,
        doppler_boost:      2.0,
        stars_brightness:   0.0,
        stars_density:      20.0,
        bloom_str:          2.15,
        vignette_str:       0.45,
        overall_bright:     0.65,
        grain:              0.006,
        max_steps:          400,
        step_size:          0.03
    };

    // ── Shared vertex shader ───────────────────────────────────────
    var VERT = [
        'varying vec2 vUv;',
        'void main() {',
        '    vUv = uv;',
        '    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);',
        '}'
    ].join('\n');

    // ── VOID_FRAG: The Master Cosmic Horror Shader ─────────────────
    // Byte-for-byte identical to the original inline shader.
    var VOID_FRAG = [
        'uniform float u_time;',
        'uniform vec2 u_resolution;',
        'uniform float u_tension;',
        'uniform float u_scroll;',
        'uniform vec2 u_mouse;',
        'uniform vec3 u_themeColor;',
        'uniform float u_isMainPage;',
        '',
        'varying vec2 vUv;',
        '',
        '// --- NOISE & MATH UTILS ---',
        'mat2 rot(float a) {',
        '    float c = cos(a), s = sin(a);',
        '    return mat2(c, -s, s, c);',
        '}',
        '',
        'float hash(vec2 p) {',
        '    return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453);',
        '}',
        '',
        'float noise(vec2 p) {',
        '    vec2 i = floor(p);',
        '    vec2 f = fract(p);',
        '    vec2 u = f * f * (3.0 - 2.0 * f);',
        '    return mix(mix(hash(i + vec2(0.0, 0.0)), hash(i + vec2(1.0, 0.0)), u.x),',
        '               mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), u.x), u.y);',
        '}',
        '',
        '// Fractional Brownian Motion',
        'float fbm(vec2 p) {',
        '    float v = 0.0;',
        '    float a = 0.5;',
        '    vec2 shift = vec2(100.0);',
        '    for (int i = 0; i < 5; ++i) {',
        '        v += a * noise(p);',
        '        p = rot(0.5) * p * 2.0 + shift;',
        '        a *= 0.5;',
        '    }',
        '    return v;',
        '}',
        '',
        '// --- THE SHADER ---',
        'void main() {',
        '    vec2 st = gl_FragCoord.xy / u_resolution.xy;',
        '    vec2 uv = st * 2.0 - 1.0;',
        '    uv.x *= u_resolution.x / u_resolution.y;',
        '',
        '    float dist = length(uv);',
        '',
        '    // 1. THE VORTEX / CHASM (Main Page Special)',
        '    if (u_isMainPage > 0.5) {',
        '        float swirl = 5.2 * exp(-dist * 1.2);',
        '        uv *= rot(u_time * 0.23 + swirl);',
        '    }',
        '',
        '    // 2. THE EVENT HORIZON (Peripheral Refraction)',
        '    float bend = smoothstep(0.4, 2.35, dist) * (0.28 + u_tension * 0.81);',
        '    vec2 refractedUv = uv + normalize(uv) * bend * fbm(uv * 1.5 + u_time * 0.1);',
        '',
        '    // 3. NEBULA & STARFIELD LAYER',
        '    float n = fbm(refractedUv * 0.8 + u_time * 0.05);',
        '',
        '    vec3 starCol = vec3(0.0);',
        '',
        '    // Population A: Bright foreground stars (sparse, large)',
        '    vec2 starGridA = floor(refractedUv * 40.0);',
        '    float starSeedA = hash(starGridA);',
        '    float starBrightA = pow(starSeedA, 40.0);',
        '    vec2 starCellA = fract(refractedUv * 40.0) - 0.5;',
        '    vec2 starOffA = vec2(hash(starGridA + 0.1), hash(starGridA + 0.2)) - 0.5;',
        '    float starDistA = length(starCellA - starOffA * 0.6);',
        '    float starA = smoothstep(0.06, 0.01, starDistA) * starBrightA;',
        '    float tempA = hash(starGridA + 7.0);',
        '    vec3 starTintA = mix(vec3(0.7, 0.8, 1.0), vec3(1.0, 0.85, 0.6), tempA);',
        '    starA *= 0.7 + 0.3 * sin(u_time * (2.0 + starSeedA * 4.0) + starSeedA * 6.28);',
        '    starCol += starTintA * starA * 3.0;',
        '',
        '    // Population B: Medium field stars',
        '    vec2 starGridB = floor(refractedUv * 90.0);',
        '    float starSeedB = hash(starGridB);',
        '    float starBrightB = pow(starSeedB, 35.0);',
        '    vec2 starCellB = fract(refractedUv * 90.0) - 0.5;',
        '    vec2 starOffB = vec2(hash(starGridB + 3.1), hash(starGridB + 3.2)) - 0.5;',
        '    float starDistB = length(starCellB - starOffB * 0.5);',
        '    float starB = smoothstep(0.04, 0.005, starDistB) * starBrightB;',
        '    float tempB = hash(starGridB + 5.0);',
        '    vec3 starTintB = mix(vec3(0.8, 0.85, 1.0), vec3(1.0, 0.9, 0.75), tempB);',
        '    starCol += starTintB * starB * 2.0;',
        '',
        '    // Population C: Dense dim background stars (tiny, numerous)',
        '    vec2 starGridC = floor(refractedUv * 200.0);',
        '    float starSeedC = hash(starGridC);',
        '    float starBrightC = pow(starSeedC, 30.0) * 0.2;',
        '    starCol += vec3(0.9, 0.9, 1.0) * starBrightC;',
        '',
        '    // Cluster stars in nebula-dense regions',
        '    float starDensity = fbm(refractedUv * 2.0);',
        '    starCol *= 0.5 + starDensity * 0.9;',
        '',
        '    float stars = (starCol.r + starCol.g + starCol.b) / 3.0;',
        '',
        '    // 4. REALITY DISPLACEMENT (Domain Warping)',
        '    vec2 q = vec2(0.0);',
        '    q.x = fbm(refractedUv + 0.1 * u_time);',
        '    q.y = fbm(refractedUv + vec2(1.0));',
        '',
        '    vec2 r = vec2(0.0);',
        '    r.x = fbm(refractedUv + 1.0 * q + vec2(1.7, 9.2) + 0.32 * u_time);',
        '    r.y = fbm(refractedUv + 1.0 * q + vec2(8.3, 2.8) + 0.126 * u_time);',
        '',
        '    float fluidNoise = fbm(refractedUv + r * (4.4 + u_tension * 2.5) - vec2(0.0, u_scroll * 2.5));',
        '',
        '    // 5. ABYSSAL VOLUMETRICS',
        '    float safeZone = 1.0 - smoothstep(0.1, 1.3, dist);',
        '    if (u_isMainPage > 0.5) safeZone *= 0.7;',
        '',
        '    float density = (1.0 - safeZone) * (0.6 + u_tension * 0.4);',
        '',
        '    vec3 baseColor = u_themeColor * 0.4;',
        '    float vortexFalloff = smoothstep(3.2, 0.31, dist);',
        '    vec3 col = mix(baseColor * 0.05, u_themeColor * 1.2, fluidNoise * vortexFalloff);',
        '',
        '    // Nebula color',
        '    col += u_themeColor * n * 0.4 * vortexFalloff;',
        '    // Deep space dust clouds',
        '    float dust1 = fbm(refractedUv * 1.2 + vec2(u_time * 0.02, 0.0));',
        '    float dust2 = fbm(refractedUv * 1.8 - vec2(0.0, u_time * 0.015));',
        '    col += vec3(0.15, 0.02, 0.04) * dust1 * 0.52;',
        '    col += vec3(0.02, 0.03, 0.08) * dust2 * 0.33;',
        '    // Stars punch through',
        '    float starVisibility = 1.3 + 1.0 * (1.0 - vortexFalloff);',
        '    col += starCol * starVisibility;',
        '',
        '    // Rotating Accretion Disk',
        '    float angle = atan(uv.y, uv.x);',
        '',
        '    // Primary ray structure',
        '    float rays = noise(vec2(angle * 6.0 + u_time * 0.79, dist * 0.4)) * 0.5 + 0.5;',
        '    float clumps = noise(vec2(angle * 12.0 + u_time * 0.04, dist * 3.0)) * 0.6 + 0.4;',
        '    col += u_themeColor * rays * density * 0.73 * vortexFalloff * clumps;',
        '',
        '    // Filamentary gas streams',
        '    float ridged1 = 1.0 - abs(noise(vec2(angle * 17.0 + u_time * 0.15, dist * 1.5 - u_time * 0.08)) * 2.0 - 1.0);',
        '    ridged1 = pow(ridged1, 3.0);',
        '    float filamentMask = smoothstep(0.3, 0.6, dist) * smoothstep(1.4, 0.7, dist);',
        '    float filamentClump = noise(vec2(angle * 7.0 - u_time * 0.03, dist * 2.0));',
        '    filamentClump = smoothstep(0.25, 0.6, filamentClump);',
        '    col += vec3(1.0, 0.3, 0.1) * ridged1 * filamentMask * 0.34 * filamentClump;',
        '',
        '    // Secondary spiral arm',
        '    float arm2 = noise(vec2(angle * 10.5 - u_time * 0.32, dist * 0.8 + u_time * 0.05));',
        '    arm2 = smoothstep(0.4, 0.7, arm2);',
        '    col += u_themeColor * arm2 * density * 0.39 * vortexFalloff;',
        '',
        '    // Hot inner accretion glow',
        '    float innerHeat = smoothstep(0.8, 0.67, dist) * smoothstep(0.47, 0.67, dist);',
        '    float heatNoise = noise(vec2(angle * 5.0 + u_time * 0.3, dist * 2.0));',
        '    vec3 hotColor = mix(vec3(0.6, 0.1, 0.0), vec3(1.0, 0.6, 0.2), heatNoise);',
        '    col += hotColor * innerHeat * density * 0.65;',
        '',
        '    // Fine turbulent detail',
        '    float turbulence = noise(uv * rot(u_time * 0.08) * 8.0 + r * 2.0);',
        '    turbulence *= noise(uv * rot(-u_time * 0.06) * 14.0);',
        '    float turbMask = smoothstep(0.2, 0.7, dist) * smoothstep(1.5, 0.7, dist);',
        '    col += u_themeColor * turbulence * turbMask * 0.51;',
        '',
        '    // 6. THE CHASM CORE (Visualizing the Hole)',
        '    if (u_isMainPage > 0.5) {',
        '        float coreSwirl = 8.0 * exp(-dist * 5.7);',
        '        vec2 coreUv = uv * rot(-u_time * 2.0 - coreSwirl);',
        '',
        '        float layer1 = fbm(coreUv * 2.0 + u_time * 0.1);',
        '        float layer2 = fbm(coreUv * 4.0 - u_time * 0.15);',
        '        float layer3 = fbm(coreUv * 8.0 + u_time * 0.2);',
        '',
        '        float mask1 = smoothstep(0.37 + layer1 * 0.15, 0.37, dist);',
        '        float mask2 = smoothstep(0.52 + layer2 * 0.1, 0.34, dist);',
        '        float mask3 = smoothstep(0.42 + layer3 * 0.05, 0.24, dist);',
        '',
        '        col = mix(col, col * 0.03, mask1);',
        '        col = mix(col, col * 0.3, mask2);',
        '        col = mix(col, vec3(0.0), mask3);',
        '',
        '        // The Watcher',
        '        float innerGlow = exp(-dist * dist * 38.0);',
        '        float pulse = 0.6 + 0.4 * sin(u_time * 1.6);',
        '        col += vec3(0.53, 0.2, 0.24) * innerGlow * pulse * 1.01;',
        '',
        '        // Counter-rotating luminous threads',
        '        vec2 lightUv = uv * rot(u_time * 4.4 + coreSwirl);',
        '        float lightLayer = fbm(lightUv * 4.1 - u_time * 0.12);',
        '        float lightMask = smoothstep(0.7, 0.16, dist) * smoothstep(0.05, 0.16, dist);',
        '        col += u_themeColor * lightLayer * lightMask * 0.35;',
        '',
        '        // Glowing inner rim',
        '        float rim = smoothstep(0.42, 0.32, dist) * smoothstep(0.25, 0.32, dist);',
        '        col += u_themeColor * rim * 0.83 * (0.8 + layer1 * 0.4);',
        '',
        '        // Photon ring',
        '        float photonRing = smoothstep(0.33, 0.36, dist) * smoothstep(0.39, 0.35, dist);',
        '        float ringNoise = noise(vec2(angle * 10.0 + u_time * 0.25, dist * 8.0));',
        '        photonRing *= 0.7 + ringNoise * 0.3;',
        '        vec3 ringColor = mix(vec3(1.0, 0.5, 0.1), vec3(1.0, 0.9, 0.7), photonRing);',
        '        col += ringColor * photonRing * 1.37;',
        '',
        '        // Leaking / Bleeding elements',
        '        float leak = pow(fbm(uv * rot(u_time * 0.1) * 3.0), 3.0) * density;',
        '        if (dist < 0.6) {',
        '            col -= vec3(leak * 0.65);',
        '        }',
        '',
        '        // Tendrils',
        '        float tendrilAngle = atan(uv.y, uv.x);',
        '        float angleNorm = tendrilAngle / 6.2832 + 0.5;',
        '        float tendrilNoise = fbm(vec2(angleNorm * 8.0 + u_time * 0.245, dist * 2.0 - u_time * 0.15));',
        '        float tendrilShape = pow(tendrilNoise, 3.0);',
        '        float tendrilReach = noise(vec2(angleNorm * 6.0 - u_time * 0.05, 0.5));',
        '        float tendrilOuter = 1.25 + tendrilReach * 0.5;',
        '        float tendrilMask = smoothstep(0.45, 0.55, dist) * smoothstep(tendrilOuter, 0.55, dist);',
        '        col += u_themeColor * tendrilShape * tendrilMask * 0.9;',
        '    }',
        '',
        '    // NEURAL FLUID WEAVE',
        '    float weave = noise(refractedUv * 12.0 + r * 6.0) * density;',
        '    col -= vec3(weave * 0.49);',
        '',
        '    // TEMPORAL LENS — chromatic aberration',
        '    float chromaticOffset = dist * dist * (0.105 + u_tension * 0.06);',
        '    float rColor = fbm(refractedUv + vec2(chromaticOffset, 0.0) + r);',
        '    float gColor = fbm(refractedUv + r);',
        '    float bColor = fbm(refractedUv - vec2(chromaticOffset, 0.0) + r);',
        '    col.r += rColor * 0.2 * density;',
        '    col.g *= 0.97 + gColor * 0.03;',
        '    col.b += bColor * 0.2 * density;',
        '',
        '    // Final vignette & balance',
        '    col *= smoothstep(4.6, 0.1, dist * (0.6 + u_tension * 0.4));',
        '    col += hash(uv * 120.0 + u_time) * 0.07;',
        '    col *= 1.2; // Overall brightness',
        '',
        '    gl_FragColor = vec4(col, 1.0);',
        '}'
    ].join('\n');

    // ── DISC_FRAG: Raytraced top accretion disc (Schwarzschild) ────
    // Leapfrog integration, top-only crossing filter, Doppler beaming,
    // ACES tonemapping. Stars disabled via u_stars_brightness = 0.
    var DISC_FRAG = [
        'precision highp float;',
        'uniform float u_time;',
        'uniform vec2 u_resolution;',
        'uniform float u_cam_distance, u_cam_inclination, u_cam_fov;',
        'uniform float u_disk_inner, u_disk_outer, u_disk_brightness;',
        'uniform float u_disk_temp_inner, u_disk_temp_falloff;',
        'uniform float u_disk_noise_scale, u_disk_noise_str, u_disk_rot_speed;',
        'uniform float u_doppler_str, u_doppler_boost;',
        'uniform float u_stars_brightness, u_stars_density;',
        'uniform float u_bloom_str, u_vignette_str, u_overall_bright, u_grain_intensity;',
        'uniform float u_max_steps, u_step_size;',
        'varying vec2 vUv;',
        '',
        'float hash(vec2 p){return fract(sin(dot(p,vec2(12.9898,78.233)))*43758.5453);}',
        'float hash3(vec3 p){return fract(sin(dot(p,vec3(12.9898,78.233,45.164)))*43758.5453);}',
        'float noise(vec2 p){vec2 i=floor(p);vec2 f=fract(p);vec2 u=f*f*(3.0-2.0*f);',
        '  return mix(mix(hash(i),hash(i+vec2(1,0)),u.x),mix(hash(i+vec2(0,1)),hash(i+vec2(1,1)),u.x),u.y);}',
        'float fbm(vec2 p){float v=0.0,a=0.5;mat2 r=mat2(0.8,-0.6,0.6,0.8);',
        '  for(int i=0;i<4;i++){v+=a*noise(p);p=r*p*2.0+vec2(100.0);a*=0.5;}return v;}',
        '',
        'vec3 discColor(float t){',
        '  vec3 darkPurple=vec3(0.15,0.02,0.12);vec3 deepRed=vec3(0.45,0.02,0.04);',
        '  vec3 brightRed=vec3(0.85,0.08,0.03);vec3 hotOrange=vec3(1.0,0.45,0.05);',
        '  vec3 gold=vec3(1.0,0.78,0.3);',
        '  if(t<0.2)return mix(darkPurple,deepRed,t*5.0);',
        '  if(t<0.45)return mix(deepRed,brightRed,(t-0.2)*4.0);',
        '  if(t<0.7)return mix(brightRed,hotOrange,(t-0.45)*4.0);',
        '  return mix(hotOrange,gold,(t-0.7)*3.333);',
        '}',
        '',
        'vec3 starfield(vec3 dir){',
        '  vec3 col=vec3(0.0);',
        '  vec3 grid=floor(dir*u_stars_density);float s=hash3(grid);',
        '  float bright=pow(s,45.0);float twinkle=0.7+0.3*sin(u_time*(2.0+s*4.0)+s*6.28);',
        '  vec3 tint=mix(vec3(0.7,0.8,1.0),vec3(1.0,0.85,0.6),hash3(grid+7.0));',
        '  col+=tint*bright*twinkle*u_stars_brightness;',
        '  vec3 grid2=floor(dir*u_stars_density*2.5);float s2=hash3(grid2);',
        '  col+=vec3(0.9,0.9,1.0)*pow(s2,40.0)*u_stars_brightness*0.3;',
        '  return col;',
        '}',
        '',
        'vec3 ACESFilm(vec3 x){return clamp((x*(2.51*x+0.03))/(x*(2.43*x+0.59)+0.14),0.0,1.0);}',
        '',
        'void main(){',
        '  vec2 uv=(gl_FragCoord.xy/u_resolution.xy)*2.0-1.0;',
        '  uv.x*=u_resolution.x/u_resolution.y;',
        '',
        '  float incl=radians(u_cam_inclination);float fov=radians(u_cam_fov);',
        '  float camR=u_cam_distance;float halfTan=tan(fov*0.5);',
        '  vec3 camPos=vec3(0.0,camR*cos(incl),-camR*sin(incl));',
        '  vec3 camFwd=normalize(-camPos);',
        '  vec3 wUp=vec3(0.0,1.0,0.0);',
        '  if(abs(dot(camFwd,wUp))>0.999)wUp=vec3(0.0,0.0,1.0);',
        '  vec3 camRight=normalize(cross(camFwd,wUp));vec3 camUp=cross(camRight,camFwd);',
        '  vec3 ray=normalize(camFwd+uv.x*halfTan*camRight+uv.y*halfTan*camUp);',
        '',
        '  vec3 nHat=normalize(camPos);vec3 cp=cross(nHat,ray);float cpLen=length(cp);',
        '  vec3 pNormal;vec3 tHat;float rayN,rayT;',
        '  if(cpLen<1e-5){pNormal=normalize(cross(nHat,camRight));tHat=cross(pNormal,nHat);rayN=dot(ray,nHat);rayT=0.0;}',
        '  else{pNormal=cp/cpLen;tHat=cross(pNormal,nHat);rayN=dot(ray,nHat);rayT=dot(ray,tHat);}',
        '',
        '  float u0=1.0/camR;float du=0.0;',
        '  if(abs(rayT)>1e-7){du=-(rayN/rayT)*u0;}',
        '',
        '  float uCur=u0;float phi=0.0;float dphi=u_step_size;int nMax=int(u_max_steps);',
        '  vec3 diskCol=vec3(0.0);float diskAlpha=0.0;bool absorbed=false;bool escaped=false;',
        '  vec3 pos=camPos;vec3 oldPos=camPos;',
        '',
        '  for(int i=0;i<800;i++){',
        '    if(i>=nMax)break;',
        '    oldPos=pos;',
        '    float ddu1=-uCur+1.5*uCur*uCur;du+=0.5*ddu1*dphi;uCur+=du*dphi;phi+=dphi;',
        '    float ddu2=-uCur+1.5*uCur*uCur;du+=0.5*ddu2*dphi;',
        '    if(uCur>1.0){absorbed=true;break;}',
        '    if(uCur>0.0&&du<0.0&&uCur<u0*0.8){escaped=true;}',
        '    if(uCur<=0.0){escaped=true;uCur=max(uCur,1e-6);break;}',
        '    float rCur=1.0/uCur;pos=(cos(phi)*nHat+sin(phi)*tHat)*rCur;',
        '',
        '    if(i>0&&oldPos.y>0.0&&pos.y<0.0){',
        '      float tCross=oldPos.y/(oldPos.y-pos.y);vec3 cPos=mix(oldPos,pos,tCross);float cR=length(cPos);',
        '      if(cR>u_disk_inner&&cR<u_disk_outer){',
        '        float diskAngle=atan(cPos.z,cPos.x);',
        '        float rNorm=(cR-u_disk_inner)/(u_disk_outer-u_disk_inner);rNorm=clamp(rNorm,0.0,1.0);',
        '        float temp=u_disk_temp_inner*pow(1.0-rNorm,u_disk_temp_falloff);temp=clamp(temp,0.0,1.0);',
        '        float nAng=diskAngle+u_time*u_disk_rot_speed/max(cR*0.5,0.5);',
        '        float diskN=fbm(vec2(nAng*u_disk_noise_scale,cR*2.5));',
        '        float structure=1.0-u_disk_noise_str+u_disk_noise_str*diskN;',
        '        float innerFade=smoothstep(u_disk_inner,u_disk_inner+0.4,cR);',
        '        float outerFade=smoothstep(u_disk_outer,u_disk_outer-1.5,cR);',
        '        float edgeFade=innerFade*outerFade;',
        '        float radialBright=pow(u_disk_inner/cR,1.5);',
        '        float vOrb=0.0;',
        '        if(cR>1.05){vOrb=1.0/sqrt(2.0*(cR-1.0));vOrb=min(vOrb,0.85);}',
        '        vec3 orbDir=normalize(vec3(-cPos.z,0.0,cPos.x));',
        '        vec3 viewDir=normalize(cPos-camPos);',
        '        float dShift=1.0+vOrb*dot(orbDir,viewDir)*u_doppler_str;dShift=clamp(dShift,0.2,3.5);',
        '        float dFactor=pow(dShift,u_doppler_boost);',
        '        vec3 dCol=discColor(temp)*structure*edgeFade*radialBright;',
        '        dCol*=u_disk_brightness*dFactor;',
        '        float alpha=edgeFade*structure*0.85;',
        '        diskCol+=dCol*(1.0-diskAlpha);',
        '        diskAlpha=min(diskAlpha+alpha*(1.0-diskAlpha),1.0);',
        '      }',
        '    }',
        '    if(escaped)break;',
        '  }',
        '',
        '  vec3 col=vec3(0.0);',
        '  if(absorbed){col=diskCol;}',
        '  else{vec3 skyDir=normalize(pos);vec3 stars=starfield(skyDir);col=stars*(1.0-diskAlpha)+diskCol;}',
        '',
        '  float lum=dot(col,vec3(0.299,0.587,0.114));col*=1.0+u_bloom_str*max(0.0,lum-0.3);',
        '  float screenDist=length(uv);col*=max(1.0-u_vignette_str*screenDist*screenDist,0.0);',
        '  col+=(hash(gl_FragCoord.xy+u_time)-0.5)*u_grain_intensity;',
        '  col*=u_overall_bright;',
        '  col=ACESFilm(col);col=pow(max(col,0.0),vec3(1.0/2.2));',
        '',
        '  float outLum=dot(col,vec3(0.299,0.587,0.114));',
        '  gl_FragColor=vec4(col,outLum);',
        '}'
    ].join('\n');

    // ── Composite fragment shader (baked tuned values) ─────────────
    function buildCompFrag() {
        var D = DISC;
        var maskInner = (D.comp_mask_radius - D.comp_mask_soft).toFixed(4);
        var maskOuter = (D.comp_mask_radius + D.comp_mask_soft).toFixed(4);
        return [
            'precision highp float;',
            'uniform sampler2D u_texVoid;',
            'uniform sampler2D u_texDisc;',
            'uniform vec2 u_resolution;',
            'varying vec2 vUv;',
            '',
            'void main() {',
            '  vec2 st = vUv;',
            '',
            '  // Void layer',
            '  vec3 voidCol = texture2D(u_texVoid, st).rgb * ' + D.comp_void_bright.toFixed(4) + ';',
            '',
            '  // Disc layer with offset + scale',
            '  vec2 discSt = (st - 0.5) / ' + D.comp_scale.toFixed(4) + ' + 0.5 - vec2(' + D.comp_x_offset.toFixed(4) + ', ' + D.comp_y_offset.toFixed(4) + ');',
            '  vec4 discSample = texture2D(u_texDisc, discSt);',
            '  vec3 discCol = discSample.rgb * ' + D.comp_disc_bright.toFixed(4) + ';',
            '',
            '  // Circular mask (aspect-corrected)',
            '  vec2 uv = (st - 0.5) * 2.0;',
            '  uv.x *= u_resolution.x / u_resolution.y;',
            '  float maskDist = length(uv);',
            '  float mask = 1.0 - smoothstep(' + maskInner + ', ' + maskOuter + ', maskDist);',
            '',
            '  // OOB check',
            '  float inBounds = step(0.0, discSt.x) * step(discSt.x, 1.0) * step(0.0, discSt.y) * step(discSt.y, 1.0);',
            '  discCol *= inBounds;',
            '',
            '  // Additive blend',
            '  vec3 col = voidCol + discCol * ' + D.comp_opacity.toFixed(4) + ' * mask;',
            '',
            '  gl_FragColor = vec4(col, 1.0);',
            '}'
        ].join('\n');
    }

    // ── WebGL Support Check ────────────────────────────────────────
    function checkWebGLSupport() {
        try {
            var testCanvas = document.createElement('canvas');
            var gl = testCanvas.getContext('webgl') || testCanvas.getContext('experimental-webgl');
            return !!gl;
        } catch (e) {
            return false;
        }
    }

    function showFallback() {
        console.warn('WebGL not available, using fallback background');
        var canvas = document.getElementById('bg-canvas') || document.getElementById('three-background');
        if (canvas) canvas.style.display = 'none';
        document.body.style.backgroundImage = 'radial-gradient(ellipse at center, #1a0a0a 0%, #0a0a0a 100%)';
    }

    // ── Initialize ─────────────────────────────────────────────────
    function init() {
        if (typeof THREE === 'undefined') {
            console.error('Three.js not loaded');
            showFallback();
            return;
        }

        if (!checkWebGLSupport()) {
            isWebGLAvailable = false;
            showFallback();
            return;
        }

        try {
            // Find existing canvas or create one
            var canvas = document.getElementById('bg-canvas') || document.getElementById('three-background');
            if (!canvas) {
                canvas = document.createElement('canvas');
                canvas.id = 'bg-canvas';
                canvas.setAttribute('aria-hidden', 'true');
                document.body.insertBefore(canvas, document.body.firstChild);
            }

            canvas.style.position = 'fixed';
            canvas.style.top = '0';
            canvas.style.left = '0';
            canvas.style.width = '100vw';
            canvas.style.height = '100vh';
            canvas.style.zIndex = '-1';
            canvas.style.pointerEvents = 'none';
            canvas.style.opacity = '1';
            canvas.classList.add('active');

            document.body.style.background = 'none';
            document.body.style.backgroundColor = '#050505';

            // Detect page type
            var path = window.location.pathname;
            isMainPage = path.endsWith('/') ||
                         path.endsWith('index.html') ||
                         path.endsWith('index-refactored.html') ||
                         document.querySelector('.acts-navigation') !== null ||
                         (document.querySelector('.title') !== null && !document.querySelector('article'));

            camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
            renderer = new THREE.WebGLRenderer({ canvas: canvas, alpha: !isMainPage, antialias: false });
            renderer.setSize(window.innerWidth, window.innerHeight);

            // Same pixelRatio for all pages. The composite shader uses vUv (0→1),
            // so the RT/screen pixel ratio mismatch does NOT cause banding.
            // Keeping the native ratio preserves the gl_FragCoord / u_resolution
            // coordinate behavior that positions circular features correctly on
            // ultrawide displays.
            renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));

            clock = new THREE.Clock();

            if (isMainPage) {
                initComposite();
            } else {
                initSinglePass();
            }

            setupEventListeners();
            animate();

        } catch (error) {
            console.error('Three.js initialization failed:', error);
            isWebGLAvailable = false;
            showFallback();
        }
    }

    // ── 3-Pass Composite Pipeline (main page) ─────────────────────
    function initComposite() {
        var W = window.innerWidth, H = window.innerHeight;
        // RT must match the drawing buffer (CSS size × pixelRatio) so that
        // gl_FragCoord ranges match between RT rendering and direct rendering.
        var pr = renderer.getPixelRatio();
        var rtW = Math.floor(W * pr), rtH = Math.floor(H * pr);
        var rtOpts = { minFilter: THREE.LinearFilter, magFilter: THREE.LinearFilter, format: THREE.RGBAFormat };
        rtVoid = new THREE.WebGLRenderTarget(rtW, rtH, rtOpts);
        rtDisc = new THREE.WebGLRenderTarget(rtW, rtH, rtOpts);

        // ── Pass 1: Void scene ──
        voidScene = new THREE.Scene();
        uniforms = {
            u_time:       { value: 0.0 },
            u_resolution: { value: new THREE.Vector2(W, H) },
            u_tension:    { value: 0.0 },
            u_scroll:     { value: 0.0 },
            u_mouse:      { value: new THREE.Vector2(0.5, 0.5) },
            u_themeColor: { value: new THREE.Color(0x8b0000) },
            u_isMainPage: { value: 1.0 }
        };

        var voidMat = new THREE.ShaderMaterial({
            uniforms: uniforms,
            vertexShader: VERT,
            fragmentShader: VOID_FRAG,
            depthWrite: false,
            depthTest: false
        });
        voidScene.add(new THREE.Mesh(new THREE.PlaneGeometry(2, 2), voidMat));

        // ── Pass 2: Disc scene ──
        discScene = new THREE.Scene();
        discUniforms = {
            u_time:             { value: 0.0 },
            u_resolution:       { value: new THREE.Vector2(W, H) },
            u_cam_distance:     { value: DISC.cam_distance },
            u_cam_inclination:  { value: DISC.cam_inclination },
            u_cam_fov:          { value: DISC.cam_fov },
            u_disk_inner:       { value: DISC.disk_inner },
            u_disk_outer:       { value: DISC.disk_outer },
            u_disk_brightness:  { value: DISC.disk_brightness },
            u_disk_temp_inner:  { value: DISC.disk_temp_inner },
            u_disk_temp_falloff:{ value: DISC.disk_temp_falloff },
            u_disk_noise_scale: { value: DISC.disk_noise_scale },
            u_disk_noise_str:   { value: DISC.disk_noise_str },
            u_disk_rot_speed:   { value: DISC.disk_rot_speed },
            u_doppler_str:      { value: DISC.doppler_str },
            u_doppler_boost:    { value: DISC.doppler_boost },
            u_stars_brightness: { value: DISC.stars_brightness },
            u_stars_density:    { value: DISC.stars_density },
            u_bloom_str:        { value: DISC.bloom_str },
            u_vignette_str:     { value: DISC.vignette_str },
            u_overall_bright:   { value: DISC.overall_bright },
            u_grain_intensity:  { value: DISC.grain },
            u_max_steps:        { value: DISC.max_steps },
            u_step_size:        { value: DISC.step_size }
        };

        var discMat = new THREE.ShaderMaterial({
            uniforms: discUniforms,
            vertexShader: VERT,
            fragmentShader: DISC_FRAG,
            depthWrite: false,
            depthTest: false
        });
        discScene.add(new THREE.Mesh(new THREE.PlaneGeometry(2, 2), discMat));

        // ── Pass 3: Composite scene ──
        compScene = new THREE.Scene();
        compUniforms = {
            u_texVoid:    { value: rtVoid.texture },
            u_texDisc:    { value: rtDisc.texture },
            u_resolution: { value: new THREE.Vector2(W, H) }
        };

        var compMat = new THREE.ShaderMaterial({
            uniforms: compUniforms,
            vertexShader: VERT,
            fragmentShader: buildCompFrag(),
            depthWrite: false,
            depthTest: false
        });
        compScene.add(new THREE.Mesh(new THREE.PlaneGeometry(2, 2), compMat));
    }

    // ── Single-Pass Pipeline (Act I/II/III pages) ──────────────────
    function initSinglePass() {
        var path = window.location.pathname;

        scene = new THREE.Scene();
        uniforms = {
            u_time:       { value: 0.0 },
            u_resolution: { value: new THREE.Vector2(window.innerWidth, window.innerHeight) },
            u_tension:    { value: 0.0 },
            u_scroll:     { value: 0.0 },
            u_mouse:      { value: new THREE.Vector2(0.5, 0.5) },
            u_themeColor: { value: new THREE.Color(0x8b0000) },
            u_isMainPage: { value: 0.0 }
        };

        if (path.includes('ACTII')) uniforms.u_themeColor.value.setHex(0x440044);
        if (path.includes('ACTIII')) uniforms.u_themeColor.value.setHex(0x002244);

        var material = new THREE.ShaderMaterial({
            uniforms: uniforms,
            vertexShader: VERT,
            fragmentShader: VOID_FRAG,
            transparent: true,
            depthWrite: false,
            depthTest: false
        });

        scene.add(new THREE.Mesh(new THREE.PlaneGeometry(2, 2), material));
    }

    // ── Animation Loop ─────────────────────────────────────────────
    function animate() {
        if (!isWebGLAvailable) return;

        animationId = requestAnimationFrame(animate);

        var delta = clock.getDelta();
        var time = clock.getElapsedTime();

        // Smoothly interpolate tension
        currentTension += (targetTension - currentTension) * 2.0 * delta;

        // Update void uniforms (shared across both paths)
        if (uniforms) {
            uniforms.u_time.value = time * 0.5;
            uniforms.u_tension.value = currentTension;

            var maxScroll = Math.max(1, document.documentElement.scrollHeight - window.innerHeight);
            var scrollNorm = window.scrollY / maxScroll;
            uniforms.u_scroll.value = scrollNorm;
        }

        if (isMainPage && rtVoid && rtDisc) {
            // 3-pass composite
            discUniforms.u_time.value = time * 0.3;

            renderer.setRenderTarget(rtVoid);
            renderer.render(voidScene, camera);

            renderer.setRenderTarget(rtDisc);
            renderer.render(discScene, camera);

            renderer.setRenderTarget(null);
            renderer.render(compScene, camera);
        } else {
            // Single-pass direct
            renderer.render(scene, camera);
        }
    }

    // ── Event Listeners ────────────────────────────────────────────
    function setupEventListeners() {
        window.addEventListener('resize', function() {
            if (!isWebGLAvailable || !renderer) return;
            var w = window.innerWidth, h = window.innerHeight;
            renderer.setSize(w, h);

            if (uniforms) {
                uniforms.u_resolution.value.set(w, h);
            }

            if (isMainPage && rtVoid && rtDisc) {
                var pr = renderer.getPixelRatio();
                var rtW = Math.floor(w * pr), rtH = Math.floor(h * pr);
                rtVoid.setSize(rtW, rtH);
                rtDisc.setSize(rtW, rtH);
                discUniforms.u_resolution.value.set(w, h);
                compUniforms.u_resolution.value.set(w, h);
            }
        });

        // Mouse tracking for subtle parallax in the fluid
        document.addEventListener('mousemove', function(e) {
            if (!uniforms) return;
            uniforms.u_mouse.value.set(
                e.clientX / window.innerWidth,
                1.0 - e.clientY / window.innerHeight
            );
        }, { passive: true });

        // Tension tracking (ties into HorrorEngine if available)
        window.addEventListener('scroll', function() {
            var maxScroll = Math.max(1, document.documentElement.scrollHeight - window.innerHeight);
            var scrollNorm = window.scrollY / maxScroll;

            var newTension = scrollNorm * 0.6;

            if (document.body.classList.contains('horror-flicker') ||
                document.querySelector('.horror-glitch-overlay')) {
                newTension += 0.4;
            }

            targetTension = Math.min(1.0, newTension);
        }, { passive: true });

        // Expose a method for the horror engine to trigger reality bending
        window.spikeVisualTension = function(amount) {
            if (amount === undefined) amount = 0.5;
            targetTension = Math.min(1.0, targetTension + amount);
            setTimeout(function() {
                targetTension = Math.max(0.0, targetTension - amount);
            }, 2000);
        };

        // Cleanup on page unload
        window.addEventListener('beforeunload', function() {
            if (animationId) cancelAnimationFrame(animationId);

            // Dispose render targets
            if (rtVoid) rtVoid.dispose();
            if (rtDisc) rtDisc.dispose();

            // Dispose all scenes
            var scenes = [scene, voidScene, discScene, compScene];
            scenes.forEach(function(s) {
                if (!s) return;
                s.traverse(function(object) {
                    if (object.geometry) object.geometry.dispose();
                    if (object.material) {
                        if (Array.isArray(object.material)) {
                            object.material.forEach(function(m) { m.dispose(); });
                        } else {
                            object.material.dispose();
                        }
                    }
                });
            });

            if (renderer) renderer.dispose();
        });
    }

    // ── Boot ───────────────────────────────────────────────────────
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
