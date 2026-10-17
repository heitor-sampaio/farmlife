/* FarmLife — "visual pintado" (opcional): luz em faixas suaves, formas arredondadas,
   nuvens com sombra no chão e um acabamento de pintura (cor quente, vinheta, brilho e grão de papel). */
import * as THREE from 'three';

// ================= Luz em faixas suaves =================
// A cor da superfície recebe o sol num degradê longo e macio, com a sombra puxando para o azul e a luz para o quente,
// como numa pintura.
// O reflexo brilhante continua com a luz de verdade (só mais fraco): senão as bordas viradas para longe do sol
// ganham um contorno branco. Só vale para os materiais marcados com PAINTED; o resto do jogo fica igual.
const ORIG_SPEC = '\treflectedLight.directSpecular += irradiance * BRDF_GGX( directLight.direction, geometryViewDir, geometryNormal, material );\n\treflectedLight.directDiffuse += irradiance * BRDF_Lambert( material.diffuseColor );';
const TOON = `	#ifdef PAINTED
		reflectedLight.directSpecular += irradiance * BRDF_GGX( directLight.direction, geometryViewDir, geometryNormal, material ) * 0.35;
		float nl = dot( geometryNormal, directLight.direction );
		float lit = smoothstep( -0.25, 0.85, nl );
		vec3 tint = mix( vec3( 0.78, 0.84, 1.1 ), vec3( 1.07, 1.0, 0.9 ), lit );
		reflectedLight.directDiffuse += ( 0.22 + 0.78 * lit ) * tint * directLight.color * BRDF_Lambert( material.diffuseColor );
	#else
		reflectedLight.directSpecular += irradiance * BRDF_GGX( directLight.direction, geometryViewDir, geometryNormal, material );
		reflectedLight.directDiffuse += irradiance * BRDF_Lambert( material.diffuseColor );
	#endif`;
{
  const c = THREE.ShaderChunk.lights_physical_pars_fragment;
  if (c.includes(ORIG_SPEC)) THREE.ShaderChunk.lights_physical_pars_fragment = c.replace(ORIG_SPEC, TOON);
}

let on = false;
let scene, renderer, camera;
let sweepT = 0;

/** Liga/desliga o visual pintado num material (formas arredondadas + luz em faixas). */
function applyTo(m) {
  if (!m || !m.isMeshStandardMaterial) return;
  const has = !!m.defines && 'PAINTED' in m.defines;
  if (has === on) return;
  if (m.userData.flat0 === undefined) m.userData.flat0 = m.flatShading;
  if (on) {
    m.defines = { ...(m.defines || {}), PAINTED: '' };
    m.flatShading = false;
  } else {
    delete m.defines.PAINTED;
    m.flatShading = m.userData.flat0;
  }
  m.needsUpdate = true;
}
function sweep() {
  scene.traverse((o) => {
    const mt = o.material;
    if (!mt) return;
    if (Array.isArray(mt)) mt.forEach(applyTo);
    else applyTo(mt);
  });
}

// ================= Nuvens =================
const clouds = [];
const rand = (a, b) => a + Math.random() * (b - a);
const tmpV = new THREE.Vector3();
const C_DAY = new THREE.Color(0xffffff);
const C_RAIN = new THREE.Color(0xaab3bf);

/** Nuvem fofa desenhada num canvas (várias bolhas com bordas macias e a base um pouco mais escura). */
function cloudTexture() {
  const c = document.createElement('canvas');
  c.width = 256;
  c.height = 128;
  const g = c.getContext('2d');
  const puff = (x, y, r, shade) => {
    const grd = g.createRadialGradient(x, y - r * 0.25, r * 0.1, x, y, r);
    grd.addColorStop(0, `rgba(255,255,255,${0.95 - shade})`);
    grd.addColorStop(0.6, `rgba(${246 - shade * 60},${248 - shade * 50},255,${0.75 - shade})`);
    grd.addColorStop(1, 'rgba(255,255,255,0)');
    g.fillStyle = grd;
    g.beginPath();
    g.arc(x, y, r, 0, Math.PI * 2);
    g.fill();
  };
  for (const [x, y, r] of [[60, 80, 40], [100, 64, 52], [150, 58, 56], [196, 78, 42], [128, 88, 46], [84, 92, 34], [176, 94, 32]]) puff(x, y, r, 0);
  for (const [x, y, r] of [[100, 100, 30], [160, 104, 28]]) puff(x, y, r, 0.25);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function buildClouds() {
  const tex = cloudTexture();
  for (let k = 0; k < 9; k++) {
    const mat = new THREE.SpriteMaterial({ map: tex, transparent: true, opacity: 0, depthWrite: false });
    const s = new THREE.Sprite(mat);
    const w = rand(9, 15);
    s.scale.set(w, w * 0.5, 1);
    s.renderOrder = 30;
    s.visible = false;
    scene.add(s);
    // Sombra macia no chão (a mesma forma, escura e bem transparente)
    const shMat = new THREE.MeshBasicMaterial({ map: tex, color: 0x0f1c2c, transparent: true, opacity: 0, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -4, polygonOffsetUnits: -4 });
    const sh = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), shMat);
    sh.rotation.x = -Math.PI / 2;
    sh.scale.set(w * 0.9, w * 0.45, 1);
    sh.renderOrder = 2;
    sh.visible = false;
    scene.add(sh);
    clouds.push({ s, sh, x: rand(-32, 32), z: rand(-32, 32), y: rand(11, 15), speed: rand(0.35, 0.7), fade: 1 });
  }
}

function updateClouds(dt, o) {
  const vis = on && o.daylight > 0.02;
  // Direção da câmera: para saber onde a nuvem aparece na tela (e ficar transparente sobre o personagem)
  const view = tmpV.copy(camera.position).sub(o.center).normalize();
  for (const c of clouds) {
    c.s.visible = c.sh.visible = vis;
    if (!vis) continue;
    // O vento leva as nuvens devagar; quando saem de perto, voltam do outro lado
    c.x += c.speed * dt * (o.windy ? 3 : 1);
    c.z += c.speed * 0.45 * dt * (o.windy ? 3 : 1);
    if (c.x - o.center.x > 34) { c.x -= 68; c.z = o.center.z + rand(-30, 30); }
    if (c.x - o.center.x < -34) c.x += 68;
    if (c.z - o.center.z > 34) c.z -= 68;
    if (c.z - o.center.z < -34) c.z += 68;
    c.s.position.set(c.x, c.y, c.z);
    // Ponto do chão que fica "atrás" da nuvem na tela
    const gx = c.x - (view.x / view.y) * c.y, gz = c.z - (view.z / view.y) * c.y;
    const near = Math.hypot(gx - o.center.x, gz - o.center.z);
    const want = near < 7 ? 0.25 : 1;
    c.fade += (want - c.fade) * Math.min(1, dt * 2);
    c.s.material.opacity = (o.rain ? 0.75 : 0.5) * o.daylight * c.fade;
    c.s.material.color.copy(o.rain ? C_RAIN : C_DAY);
    // Sombra: projetada a partir da direção do sol
    const sd = o.sunDir;
    c.sh.position.set(c.x - (sd.x / Math.max(0.2, sd.y)) * c.y, 0.06, c.z - (sd.z / Math.max(0.2, sd.y)) * c.y);
    c.sh.material.opacity = (o.rain ? 0.05 : 0.13) * o.daylight;
  }
}

// ================= Acabamento de pintura (pós-processamento) =================
let rt = null, postScene, postCam, postMat;
const POST_FRAG = `
uniform sampler2D tDiffuse;
uniform vec2 res;
uniform float night;
varying vec2 vUv;
float hash(vec2 p) { return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453); }
float vnoise(vec2 p) {
  vec2 i = floor(p), f = fract(p);
  f = f * f * (3.0 - 2.0 * f);
  return mix(mix(hash(i), hash(i + vec2(1.0, 0.0)), f.x), mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), f.x), f.y);
}
void main() {
  vec3 c = texture2D(tDiffuse, vUv).rgb;
  // Brilho suave em volta das luzes e das partes mais claras
  vec3 glow = vec3(0.0);
  for (int i = 0; i < 8; i++) {
    float a = float(i) * 0.7853982;
    vec2 o = vec2(cos(a), sin(a)) * 3.0 / res;
    glow += max(texture2D(tDiffuse, vUv + o).rgb - 0.9, 0.0);
  }
  c += glow * (0.04 + 0.2 * night);
  // Cor de pintura: um pouco mais saturada, luz quente e sombras levemente azuladas e mais claras
  float l = dot(c, vec3(0.2126, 0.7152, 0.0722));
  c = mix(vec3(l), c, 1.05);
  c *= vec3(1.04, 1.0, 0.94);
  c = c * 0.93 + vec3(0.016, 0.02, 0.034) * (1.0 - l);
  // Manchas de tinta: a mesma cor nunca fica totalmente lisa
  vec2 px = vUv * res;
  float wash = vnoise(px / 140.0) * 0.6 + vnoise(px / 45.0) * 0.4;
  c *= 0.93 + wash * 0.14;
  c *= mix(vec3(0.97, 0.99, 1.04), vec3(1.03, 1.0, 0.96), vnoise(px / 220.0 + 7.3));
  // Vinheta macia
  vec2 d = vUv - 0.5;
  c *= mix(0.84, 1.0, smoothstep(0.82, 0.28, length(d * vec2(1.0, 0.9))));
  // Grão de papel (fixo, não pisca)
  float n = hash(floor(vUv * res / 2.0)) * 0.6 + hash(floor(vUv * res / 9.0)) * 0.4;
  c *= 1.0 + (n - 0.5) * 0.05;
  gl_FragColor = vec4(max(c, 0.0), 1.0);
  #include <colorspace_fragment>
}`;

function buildPost() {
  postMat = new THREE.ShaderMaterial({
    uniforms: { tDiffuse: { value: null }, res: { value: new THREE.Vector2(1, 1) }, night: { value: 0 } },
    vertexShader: 'varying vec2 vUv; void main() { vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }',
    fragmentShader: POST_FRAG,
    depthTest: false,
    depthWrite: false,
  });
  postScene = new THREE.Scene();
  const quad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), postMat);
  quad.frustumCulled = false;
  postScene.add(quad);
  postCam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
}

const tmpSize = new THREE.Vector2();
function ensureTarget() {
  renderer.getDrawingBufferSize(tmpSize);
  if (!rt) rt = new THREE.WebGLRenderTarget(tmpSize.x, tmpSize.y, { samples: 4, type: THREE.HalfFloatType });
  else if (rt.width !== tmpSize.x || rt.height !== tmpSize.y) rt.setSize(tmpSize.x, tmpSize.y);
  postMat.uniforms.res.value.copy(tmpSize);
}

// ================= Ligação com o mundo =================
export function initPainted(o) {
  ({ scene, renderer, camera } = o);
  buildClouds();
  buildPost();
}

export const isPainted = () => on;

export function setPainted(v) {
  on = !!v;
  sweep();
  if (!on && rt) { rt.dispose(); rt = null; }
}

/** A cada quadro: nuvens e (de vez em quando) materiais novos que entraram na cena. */
export function paintedFrame(dt, o) {
  if (on) {
    sweepT -= dt;
    if (sweepT <= 0) { sweepT = 0.4; sweep(); }
  }
  updateClouds(dt, o);
  if (postMat) postMat.uniforms.night.value = 1 - o.daylight;
}

/** Desenha a cena; no visual pintado passa pelo acabamento de pintura. */
export function renderScene() {
  if (!on) { renderer.render(scene, camera); return; }
  ensureTarget();
  renderer.setRenderTarget(rt);
  renderer.render(scene, camera);
  renderer.setRenderTarget(null);
  postMat.uniforms.tDiffuse.value = rt.texture;
  renderer.render(postScene, postCam);
}
