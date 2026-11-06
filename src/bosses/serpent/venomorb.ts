import * as THREE from 'three';

/**
 * 이무기 독 구슬 탄(난사)의 겉모습. 반지름 1 기준으로 만들어서, 구슬(단색 구) 메시의 자식으로 붙이면 같이 커지고 줄어든다.
 *  - 바깥: 가장자리가 빛나는 보랏빛 막(프레넬)
 *  - 안: 일렁이는 독액 무늬
 *  - 둘레: 기울어진 두 고리가 서로 반대로 돌고, 작은 독방울 셋이 궤도를 돈다
 * 재질 · 도형은 모든 구슬이 같이 쓴다 (층을 오가도 다시 만들지 않는다).
 */

const RIM_VS = /* glsl */ `
  varying vec3 vN;
  varying vec3 vV;
  varying vec3 vP;
  void main() {
    vec4 mv = modelViewMatrix * vec4(position, 1.0);
    vN = normalize(normalMatrix * normal);
    vV = normalize(-mv.xyz);
    vP = position;
    gl_Position = projectionMatrix * mv;
  }
`;

/** 막: 가장자리일수록 밝다 */
const SHELL_FS = /* glsl */ `
  uniform vec3 uColor;
  uniform float uPower;
  uniform float uGain;
  varying vec3 vN;
  varying vec3 vV;
  void main() {
    float f = pow(1.0 - abs(dot(normalize(vN), normalize(vV))), uPower);
    gl_FragColor = vec4(uColor * f * uGain, f);
  }
`;

/** 속: 시간에 따라 흐르는 띠 무늬 (검보라 바탕 위에 보랏빛 독액 줄기) */
const CORE_FS = /* glsl */ `
  uniform vec3 uDark;
  uniform vec3 uHot;
  uniform float uTime;
  varying vec3 vN;
  varying vec3 vV;
  varying vec3 vP;
  void main() {
    float w = sin(vP.y * 7.0 + uTime * 5.0 + sin(vP.x * 5.0 - uTime * 3.0) * 1.6)
            * sin(vP.z * 6.0 - uTime * 4.0 + sin(vP.y * 4.0 + uTime * 2.0) * 1.4);
    float vein = smoothstep(0.55, 0.95, w);
    float facing = abs(dot(normalize(vN), normalize(vV)));
    // 정면(가운데)은 조금 밝게 비치고, 가장자리로 갈수록 어둡게 가라앉는다
    vec3 c = mix(uDark, uHot * 0.3, smoothstep(0.35, 1.0, facing));
    c += uHot * vein * 0.75;
    gl_FragColor = vec4(c, 1.0);
  }
`;

let kit: {
  shellGeo: THREE.SphereGeometry;
  ringGeo: THREE.TorusGeometry;
  dropGeo: THREE.SphereGeometry;
  coreMat: THREE.ShaderMaterial;
  shellMat: THREE.ShaderMaterial;
  ringMat: THREE.MeshBasicMaterial;
  dropMat: THREE.MeshBasicMaterial;
} | null = null;

function getKit() {
  if (kit) return kit;
  const add = { transparent: true, depthWrite: false, blending: THREE.AdditiveBlending };
  kit = {
    shellGeo: new THREE.SphereGeometry(1.45, 20, 14),
    ringGeo: new THREE.TorusGeometry(1.22, 0.07, 6, 40),
    dropGeo: new THREE.SphereGeometry(0.2, 8, 6),
    coreMat: new THREE.ShaderMaterial({
      vertexShader: RIM_VS,
      fragmentShader: CORE_FS,
      uniforms: {
        uDark: { value: new THREE.Color(0x0a0220) },
        uHot: { value: new THREE.Color(0x7a3ee0).multiplyScalar(1.1) },
        uTime: { value: 0 },
      },
    }),
    shellMat: new THREE.ShaderMaterial({
      vertexShader: RIM_VS,
      fragmentShader: SHELL_FS,
      uniforms: {
        uColor: { value: new THREE.Color(0x5a24c8) },
        uPower: { value: 2.2 },
        uGain: { value: 1.6 },
      },
      ...add,
    }),
    ringMat: new THREE.MeshBasicMaterial({ color: new THREE.Color(0x4a16b4).multiplyScalar(1.4), toneMapped: false, ...add, opacity: 0.85 }),
    dropMat: new THREE.MeshBasicMaterial({ color: new THREE.Color(0x6a30d0).multiplyScalar(1.3), toneMapped: false }),
  };
  return kit;
}

/** 구슬 속(단색 대신 쓰는 재질). 구 메시의 material 로 쓴다 */
export function venomCoreMaterial() {
  return getKit().coreMat;
}

/** 구슬 둘레 장식 (반지름 1 기준). 구 메시의 자식으로 붙인다 */
export function makeVenomDeco(): THREE.Group {
  const k = getKit();
  const g = new THREE.Group();
  const shell = new THREE.Mesh(k.shellGeo, k.shellMat);
  shell.renderOrder = 2;
  const r1 = new THREE.Mesh(k.ringGeo, k.ringMat);
  r1.rotation.set(1.1, 0, 0.4);
  const r2 = new THREE.Mesh(k.ringGeo, k.ringMat);
  r2.rotation.set(-0.5, 0, -1.0);
  r2.scale.setScalar(0.9);
  const orbit = new THREE.Group();
  for (let i = 0; i < 3; i++) {
    const d = new THREE.Mesh(k.dropGeo, k.dropMat);
    const a = (i / 3) * Math.PI * 2;
    d.position.set(Math.cos(a) * 1.7, Math.sin(a * 2) * 0.35, Math.sin(a) * 1.7);
    orbit.add(d);
  }
  g.add(shell, r1, r2, orbit);
  g.userData = { r1, r2, orbit, ph: Math.random() * 10 };
  return g;
}

/** 매 프레임: 고리 · 궤도 회전 */
export function animateVenomDeco(g: THREE.Group, dt: number) {
  const u = g.userData as { r1: THREE.Mesh; r2: THREE.Mesh; orbit: THREE.Group; ph: number };
  u.ph += dt;
  u.r1.rotation.z += dt * 3.2;
  u.r2.rotation.z -= dt * 4.1;
  u.orbit.rotation.y += dt * 5.5;
  u.orbit.rotation.x = Math.sin(u.ph * 1.7) * 0.5;
}

/** 프레임마다 한 번: 속 무늬가 흐르게 */
export function tickVenomCore(t: number) {
  if (kit) kit.coreMat.uniforms.uTime.value = t;
}
