/**
 * High-Fidelity Generative WebGL Engine for "The Void at Crimson Sunset"
 * 
 * Implements:
 * 1. The Event Horizon (Ray-marched refraction)
 * 2. Neural Fluid Weave (FBM flow field)
 * 3. Abyssal Volumetrics (Rayleigh-like scattering)
 * 4. Temporal Lens (Chromatic blur/DoF simulation)
 * 5. Reality Displacement (Domain warping)
 */

(function initGenerativeWebGL() {
    'use strict';

    // State & ThreeJS Core
    let scene, camera, renderer, clock, uniforms;
    let isWebGLAvailable = true;
    let animationId = null;
    let targetTension = 0.0;
    let currentTension = 0.0;

    // Check for WebGL support
    function checkWebGLSupport() {
        try {
            const testCanvas = document.createElement('canvas');
            const gl = testCanvas.getContext('webgl') || testCanvas.getContext('experimental-webgl');
            return !!gl;
        } catch (e) {
            return false;
        }
    }

    // Fallback for no WebGL
    function showFallback() {
        console.warn('WebGL not available, using fallback background');
        const canvas = document.getElementById('bg-canvas') || document.getElementById('three-background');
        if (canvas) canvas.style.display = 'none';
        document.body.style.backgroundImage = 'radial-gradient(ellipse at center, #1a0a0a 0%, #0a0a0a 100%)';
    }

    // Initialize Three.js
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
            let canvas = document.getElementById('bg-canvas') || document.getElementById('three-background');
            if (!canvas) {
                canvas = document.createElement('canvas');
                canvas.id = 'bg-canvas';
                canvas.setAttribute('aria-hidden', 'true');
                document.body.insertBefore(canvas, document.body.firstChild);
            }

            // Make sure it's styled correctly
            canvas.style.position = 'fixed';
            canvas.style.top = '0';
            canvas.style.left = '0';
            canvas.style.width = '100vw';
            canvas.style.height = '100vh';
            canvas.style.zIndex = '-1'; // Place behind content
            canvas.style.pointerEvents = 'none';
            canvas.style.opacity = '1'; // Force visibility
            canvas.classList.add('active');

            // Remove body background to let canvas show through
            document.body.style.background = 'none';
            document.body.style.backgroundColor = '#050505';

            scene = new THREE.Scene();
            camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
            
            renderer = new THREE.WebGLRenderer({ canvas: canvas, alpha: true, antialias: false });
            renderer.setSize(window.innerWidth, window.innerHeight);
            // Limit pixel ratio to 1.5 to maintain performance while keeping high-fidelity look
            renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));

            clock = new THREE.Clock();

            createGenerativeShader();
            setupEventListeners();
            animate();

        } catch (error) {
            console.error('Three.js initialization failed:', error);
            isWebGLAvailable = false;
            showFallback();
        }
    }

    function createGenerativeShader() {
        // Determine theme based on page - Robust detection for GitHub Pages
        const path = window.location.pathname;
        const isMainPage = path.endsWith('/') || 
                           path.endsWith('index.html') || 
                           path.endsWith('index-refactored.html') ||
                           document.querySelector('.acts-navigation') !== null ||
                           document.querySelector('.title') !== null && !document.querySelector('article');

        // Uniforms for the fragment shader
        uniforms = {
            u_time: { value: 0.0 },
            u_resolution: { value: new THREE.Vector2(window.innerWidth, window.innerHeight) },
            u_tension: { value: 0.0 },     // Drives the "Horror" intensity
            u_scroll: { value: 0.0 },      // Drives the vertical flow
            u_mouse: { value: new THREE.Vector2(0.5, 0.5) },
            u_themeColor: { value: new THREE.Color(0x8b0000) }, // Base dark red
            u_isMainPage: { value: isMainPage ? 1.0 : 0.0 }
        };

        if (path.includes('ACTII')) uniforms.u_themeColor.value.setHex(0x440044); // Purple/Red transition
        if (path.includes('ACTIII')) uniforms.u_themeColor.value.setHex(0x002244); // Deep void blue

        const vertexShader = `
            varying vec2 vUv;
            void main() {
                vUv = uv;
                gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
            }
        `;

        // The Master Cosmic Horror Shader
        const fragmentShader = `
            uniform float u_time;
            uniform vec2 u_resolution;
            uniform float u_tension;
            uniform float u_scroll;
            uniform vec2 u_mouse;
            uniform vec3 u_themeColor;
            uniform float u_isMainPage;

            varying vec2 vUv;

            // --- NOISE & MATH UTILS ---
            mat2 rot(float a) {
                float c = cos(a), s = sin(a);
                return mat2(c, -s, s, c);
            }

            float hash(vec2 p) {
                return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453);
            }

            float noise(vec2 p) {
                vec2 i = floor(p);
                vec2 f = fract(p);
                vec2 u = f * f * (3.0 - 2.0 * f);
                return mix(mix(hash(i + vec2(0.0, 0.0)), hash(i + vec2(1.0, 0.0)), u.x),
                           mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), u.x), u.y);
            }

            // Fractional Brownian Motion
            float fbm(vec2 p) {
                float v = 0.0;
                float a = 0.5;
                vec2 shift = vec2(100.0);
                for (int i = 0; i < 5; ++i) {
                    v += a * noise(p);
                    p = rot(0.5) * p * 2.0 + shift;
                    a *= 0.5;
                }
                return v;
            }

            // --- THE SHADER ---
            void main() {
                vec2 st = gl_FragCoord.xy / u_resolution.xy;
                vec2 uv = st * 2.0 - 1.0;
                uv.x *= u_resolution.x / u_resolution.y;

                float dist = length(uv);

                // 1. THE VORTEX / CHASM (Main Page Special)
                if (u_isMainPage > 0.5) {
                    // Reverted to normal slow speed
                    float swirl = 4.5 * exp(-dist * 1.2);
                    uv *= rot(u_time * 0.25 + swirl);
                }

                // 2. THE EVENT HORIZON (Peripheral Refraction)
                float bend = smoothstep(0.2, 1.5, dist) * (0.15 + u_tension * 0.45);
                vec2 refractedUv = uv + normalize(uv) * bend * fbm(uv * 1.5 + u_time * 0.1);

                // 3. NEBULA & STARFIELD LAYER — photorealistic deep space
                float n = fbm(refractedUv * 0.8 + u_time * 0.05);

                // Multi-population starfield with varied sizes and color temperatures
                vec3 starCol = vec3(0.0);

                // Population A: Bright foreground stars (sparse, large)
                vec2 starGridA = floor(refractedUv * 40.0);
                float starSeedA = hash(starGridA);
                float starBrightA = pow(starSeedA, 80.0);
                vec2 starCellA = fract(refractedUv * 40.0) - 0.5;
                // Jitter star position within cell
                vec2 starOffA = vec2(hash(starGridA + 0.1), hash(starGridA + 0.2)) - 0.5;
                float starDistA = length(starCellA - starOffA * 0.6);
                float starA = smoothstep(0.06, 0.01, starDistA) * starBrightA;
                // Color temperature from seed: hot blue-white to warm amber
                float tempA = hash(starGridA + 7.0);
                vec3 starTintA = mix(vec3(0.7, 0.8, 1.0), vec3(1.0, 0.85, 0.6), tempA);
                // Subtle twinkle
                starA *= 0.7 + 0.3 * sin(u_time * (2.0 + starSeedA * 4.0) + starSeedA * 6.28);
                starCol += starTintA * starA * 1.2;

                // Population B: Medium field stars
                vec2 starGridB = floor(refractedUv * 90.0);
                float starSeedB = hash(starGridB);
                float starBrightB = pow(starSeedB, 60.0);
                vec2 starCellB = fract(refractedUv * 90.0) - 0.5;
                vec2 starOffB = vec2(hash(starGridB + 3.1), hash(starGridB + 3.2)) - 0.5;
                float starDistB = length(starCellB - starOffB * 0.5);
                float starB = smoothstep(0.04, 0.005, starDistB) * starBrightB;
                float tempB = hash(starGridB + 5.0);
                vec3 starTintB = mix(vec3(0.8, 0.85, 1.0), vec3(1.0, 0.9, 0.75), tempB);
                starCol += starTintB * starB * 0.7;

                // Population C: Dense dim background stars (tiny, numerous)
                vec2 starGridC = floor(refractedUv * 200.0);
                float starSeedC = hash(starGridC);
                float starBrightC = pow(starSeedC, 45.0) * 0.4;
                starCol += vec3(0.9, 0.9, 1.0) * starBrightC;

                // Cluster stars in nebula-dense regions — not everywhere
                float starDensity = fbm(refractedUv * 2.0);
                starCol *= 0.3 + starDensity * 0.9;

                float stars = (starCol.r + starCol.g + starCol.b) / 3.0; // scalar fallback for legacy use

                // 4. REALITY DISPLACEMENT (Domain Warping)
                vec2 q = vec2(0.0);
                q.x = fbm(refractedUv + 0.1 * u_time);
                q.y = fbm(refractedUv + vec2(1.0));

                vec2 r = vec2(0.0);
                r.x = fbm(refractedUv + 1.0 * q + vec2(1.7, 9.2) + 0.15 * u_time);
                r.y = fbm(refractedUv + 1.0 * q + vec2(8.3, 2.8) + 0.126 * u_time);

                float fluidNoise = fbm(refractedUv + r * (2.0 + u_tension * 2.5) - vec2(0.0, u_scroll * 2.5));

                // 5. ABYSSAL VOLUMETRICS
                float safeZone = 1.0 - smoothstep(0.1, 1.3, dist);
                if (u_isMainPage > 0.5) safeZone *= 0.7; // Darker center on main page
                
                float density = (1.0 - safeZone) * (0.6 + u_tension * 0.4);
                
                // Theme mixing — restrained base so stars and structure show through
                vec3 baseColor = u_themeColor * 0.4;
                float vortexFalloff = smoothstep(1.8, 0.3, dist); // concentrate color near center
                vec3 col = mix(baseColor * 0.05, u_themeColor * 1.2, fluidNoise * vortexFalloff);
                
                // Add Nebula color — scaled by vortex proximity
                col += u_themeColor * n * 0.2 * vortexFalloff;
                // Deep space dust clouds — subtle color variation in the background
                float dust1 = fbm(refractedUv * 1.2 + vec2(u_time * 0.02, 0.0));
                float dust2 = fbm(refractedUv * 1.8 - vec2(0.0, u_time * 0.015));
                col += vec3(0.15, 0.02, 0.04) * dust1 * 0.25; // warm dust lane
                col += vec3(0.02, 0.03, 0.08) * dust2 * 0.2;  // cool distant nebulosity
                // Stars punch through — brighter where vortex is dimmer
                float starVisibility = 0.6 + 0.6 * (1.0 - vortexFalloff);
                col += starCol * starVisibility;

                // Rotating Accretion Disk — multi-layer photorealistic structure
                float angle = atan(uv.y, uv.x);

                // Primary ray structure — broad sweeping arms, concentrated near center
                float rays = noise(vec2(angle * 4.0 + u_time * 0.2, dist * 0.4)) * 0.5 + 0.5;
                col += u_themeColor * rays * density * 0.4 * vortexFalloff;

                // Filamentary gas streams — ridged noise creates thin bright veins
                float ridged1 = 1.0 - abs(noise(vec2(angle * 8.0 + u_time * 0.15, dist * 1.5 - u_time * 0.08)) * 2.0 - 1.0);
                ridged1 = pow(ridged1, 3.0); // sharpen into filaments
                float filamentMask = smoothstep(0.3, 0.6, dist) * smoothstep(1.4, 0.7, dist);
                col += vec3(1.0, 0.3, 0.1) * ridged1 * filamentMask * 0.15;

                // Secondary spiral arm — counter-wound for depth
                float arm2 = noise(vec2(angle * 6.0 - u_time * 0.12, dist * 0.8 + u_time * 0.05));
                arm2 = smoothstep(0.4, 0.7, arm2);
                col += u_themeColor * arm2 * density * 0.15 * vortexFalloff;

                // Hot inner accretion glow — orange/white gradient near the disc center
                float innerHeat = smoothstep(0.8, 0.35, dist) * smoothstep(0.15, 0.35, dist);
                float heatNoise = noise(vec2(angle * 5.0 + u_time * 0.3, dist * 2.0));
                vec3 hotColor = mix(vec3(0.6, 0.1, 0.0), vec3(1.0, 0.6, 0.2), heatNoise);
                col += hotColor * innerHeat * density * 0.2;

                // Fine turbulent detail — high-frequency noise at the gas scale
                float turbulence = noise(uv * rot(u_time * 0.08) * 8.0 + r * 2.0);
                turbulence *= noise(uv * rot(-u_time * 0.06) * 14.0);
                float turbMask = smoothstep(0.2, 0.7, dist) * smoothstep(1.5, 0.7, dist);
                col += u_themeColor * turbulence * turbMask * 0.2;

                // 6. THE CHASM CORE (Visualizing the Hole)
                if (u_isMainPage > 0.5) {
                    // Maintained aggressive rotation for the inner core only
                    float coreSwirl = 3.5 * exp(-dist * 2.5);
                    vec2 coreUv = uv * rot(-u_time * 2.0 - coreSwirl);
                    
                    // Multiple dark organic layers
                    float layer1 = fbm(coreUv * 2.0 + u_time * 0.1);
                    float layer2 = fbm(coreUv * 4.0 - u_time * 0.15);
                    float layer3 = fbm(coreUv * 8.0 + u_time * 0.2);
                    
                    // Organic edges for each layer
                    float mask1 = smoothstep(0.45 + layer1 * 0.15, 0.35, dist);
                    float mask2 = smoothstep(0.35 + layer2 * 0.1, 0.25, dist);
                    float mask3 = smoothstep(0.25 + layer3 * 0.05, 0.1, dist);
                    
                    // Blend layers into the core
                    col = mix(col, col * 0.4, mask1);
                    col = mix(col, col * 0.2, mask2);
                    col = mix(col, vec3(0.0), mask3); // Absolute void center

                    // Counter-rotating luminous threads — light from the impossible
                    vec2 lightUv = uv * rot(u_time * 1.5 + coreSwirl);
                    float lightLayer = fbm(lightUv * 3.0 - u_time * 0.12);
                    float lightMask = smoothstep(0.45, 0.15, dist) * smoothstep(0.05, 0.15, dist);
                    col += u_themeColor * lightLayer * lightMask * 0.35;

                    // Glowing inner rim (Smoother transition)
                    float rim = smoothstep(0.5, 0.4, dist) * smoothstep(0.3, 0.4, dist);
                    col += u_themeColor * rim * 1.0 * (0.8 + layer1 * 0.4);
                    
                    // Leaking / Bleeding elements
                    float leak = pow(fbm(uv * rot(u_time * 0.1) * 3.0), 3.0) * density;
                    if (dist < 0.6) {
                        col -= vec3(leak * 0.3);
                    }

                    // Tendrils — the void reaching beyond its boundary
                    float tendrilAngle = atan(uv.y, uv.x);
                    float angleNorm = tendrilAngle / 6.2832 + 0.5;
                    float tendrilNoise = fbm(vec2(angleNorm * 4.0 + u_time * 0.08, dist * 2.0 - u_time * 0.15));
                    float tendrilShape = pow(tendrilNoise, 3.0);
                    float tendrilReach = noise(vec2(angleNorm * 6.0 - u_time * 0.05, 0.5));
                    float tendrilOuter = 0.7 + tendrilReach * 0.5;
                    float tendrilMask = smoothstep(0.45, 0.55, dist) * smoothstep(tendrilOuter, 0.55, dist);
                    col += u_themeColor * tendrilShape * tendrilMask * 0.45;
                }

                // NEURAL FLUID WEAVE
                float weave = noise(refractedUv * 12.0 + r * 6.0) * density;
                col -= vec3(weave * 0.5);

                // TEMPORAL LENS
                float chromaticOffset = dist * (0.015 + u_tension * 0.04);
                float rColor = fbm(refractedUv + vec2(chromaticOffset, 0.0) + r);
                float bColor = fbm(refractedUv - vec2(chromaticOffset, 0.0) + r);
                col.r += rColor * 0.15 * density;
                col.b += bColor * 0.15 * density;

                // Final vignette & balance
                col *= smoothstep(3.0, 0.1, dist * (0.6 + u_tension * 0.4));
                col += hash(uv * 120.0 + u_time) * 0.05; // Grain

                gl_FragColor = vec4(col, 1.0);
            }
        `;


        const geometry = new THREE.PlaneGeometry(2, 2);
        const material = new THREE.ShaderMaterial({
            uniforms: uniforms,
            vertexShader: vertexShader,
            fragmentShader: fragmentShader,
            transparent: true,
            depthWrite: false,
            depthTest: false
        });

        const mesh = new THREE.Mesh(geometry, material);
        scene.add(mesh);
    }

    function animate() {
        if (!isWebGLAvailable) return;

        animationId = requestAnimationFrame(animate);
        
        const delta = clock.getDelta();
        const time = clock.getElapsedTime();

        // Smoothly interpolate tension
        currentTension += (targetTension - currentTension) * 2.0 * delta;

        // Update Uniforms
        if (uniforms) {
            uniforms.u_time.value = time * 0.5;
            uniforms.u_tension.value = currentTension;
            
            // Normalize scroll to 0-1
            const maxScroll = Math.max(1, document.documentElement.scrollHeight - window.innerHeight);
            const scrollNorm = window.scrollY / maxScroll;
            uniforms.u_scroll.value = scrollNorm;
        }

        renderer.render(scene, camera);
    }

    function setupEventListeners() {
        window.addEventListener('resize', () => {
            if (!isWebGLAvailable || !renderer) return;
            renderer.setSize(window.innerWidth, window.innerHeight);
            if (uniforms) {
                uniforms.u_resolution.value.set(window.innerWidth, window.innerHeight);
            }
        });

        // Mouse tracking for subtle parallax in the fluid
        document.addEventListener('mousemove', (e) => {
            if (!uniforms) return;
            uniforms.u_mouse.value.set(
                e.clientX / window.innerWidth,
                1.0 - e.clientY / window.innerHeight
            );
        }, { passive: true });

        // Tension tracking (ties into HorrorEngine if available)
        window.addEventListener('scroll', () => {
            const maxScroll = Math.max(1, document.documentElement.scrollHeight - window.innerHeight);
            const scrollNorm = window.scrollY / maxScroll;
            
            // Base tension grows with scroll depth
            let newTension = scrollNorm * 0.6;

            // If a horror trigger is active, it spikes
            if (document.body.classList.contains('horror-flicker') || 
                document.querySelector('.horror-glitch-overlay')) {
                newTension += 0.4;
            }

            targetTension = Math.min(1.0, newTension);
        }, { passive: true });

        // Expose a method for the horror engine to trigger reality bending
        window.spikeVisualTension = function(amount = 0.5) {
            targetTension = Math.min(1.0, targetTension + amount);
            setTimeout(() => {
                targetTension = Math.max(0.0, targetTension - amount);
            }, 2000);
        };

        // Cleanup on page unload
        window.addEventListener('beforeunload', () => {
            if (animationId) cancelAnimationFrame(animationId);
            if (scene) {
                scene.traverse((object) => {
                    if (object.geometry) object.geometry.dispose();
                    if (object.material) {
                        if (Array.isArray(object.material)) {
                            object.material.forEach(m => m.dispose());
                        } else {
                            object.material.dispose();
                        }
                    }
                });
            }
            if (renderer) renderer.dispose();
        });
    }

    // Initialize when DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
