import * as THREE from 'three';
import { FBXLoader } from 'three/addons/loaders/FBXLoader.js'; 

document.addEventListener('DOMContentLoaded', Start);

// --------------------------------------------------------
// 1. CONFIGURAÇÃO DA CENA E RENDERER
// --------------------------------------------------------
var cena = new THREE.Scene();
cena.background = new THREE.Color(0x87CEEB); 

// --- CÂMARA PERSPETIVA (3D) ---
var camaraPerspetiva = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 1000);
camaraPerspetiva.position.set(0, 8, 20); 

// --- CÂMARA ORTOGRÁFICA (2.5D ISOMÉTRICA) ---
const aspeto = window.innerWidth / window.innerHeight;
const tamanhoDesejado = 12; 
var camaraOrtografica = new THREE.OrthographicCamera(
    -tamanhoDesejado * aspeto, tamanhoDesejado * aspeto, 
    tamanhoDesejado, -tamanhoDesejado, 
    0.1, 1000
);
camaraOrtografica.position.set(15, 15, 15); 

var camaraAtiva = camaraPerspetiva;
var modo3D = true;

var renderer = new THREE.WebGLRenderer({ antialias: true }); 
renderer.setSize(window.innerWidth - 15, window.innerHeight - 80);
document.body.appendChild(renderer.domElement);

// --------------------------------------------------------
// VARIÁVEIS DE ANIMAÇÃO E MOVIMENTO
// --------------------------------------------------------
const relogio = new THREE.Clock(); 
let mario; 
let mixer; 

// Adicionada a variável acaoIdleLongo
let acaoIdle, acaoIdleLongo, acaoAndar, acaoSaltar, acaoAtual;
const teclas = { w: false, a: false, s: false, d: false, space: false };

let velocidadeY = 0;
const gravidade = -25; 
let noChao = true;

// NOVO: Temporizador de inatividade
let tempoInativo = 0; 

// --------------------------------------------------------
// 2. ILUMINAÇÃO
// --------------------------------------------------------
const luzAmbiente = new THREE.AmbientLight(0xffffff, 0.6); 
cena.add(luzAmbiente);

const luzDirecional = new THREE.DirectionalLight(0xffffff, 0.8); 
luzDirecional.position.set(5, 10, 5);
cena.add(luzDirecional);

// --------------------------------------------------------
// 3. OBJETOS DO CENÁRIO (Diorama)
// --------------------------------------------------------
var textureLoader = new THREE.TextureLoader();

var texturaChao = textureLoader.load('./Images/chao_mario.jpg'); 
texturaChao.wrapS = texturaChao.wrapT = THREE.RepeatWrapping;
texturaChao.repeat.set(10, 5); 
texturaChao.magFilter = THREE.NearestFilter;

var chao = new THREE.Mesh(new THREE.BoxGeometry(20, 1, 10), new THREE.MeshStandardMaterial({ map: texturaChao }));
chao.position.y = -0.5; 
cena.add(chao);

var texturaBloco = textureLoader.load('./Images/images.png'); 
texturaBloco.magFilter = THREE.NearestFilter;
var meshCubo = new THREE.Mesh(new THREE.BoxGeometry(1.5, 1.5, 1.5), new THREE.MeshStandardMaterial({ map: texturaBloco }));
meshCubo.position.set(-3, 3, 0); 
cena.add(meshCubo);

var matTubo = new THREE.MeshStandardMaterial({ color: 0x00AA00 }); 
var grupoTubo = new THREE.Group();
var baseTubo = new THREE.Mesh(new THREE.CylinderGeometry(1, 1, 3, 32), matTubo);
baseTubo.position.y = 1.5;
var topoTubo = new THREE.Mesh(new THREE.CylinderGeometry(1.1, 1.1, 0.5, 32), matTubo);
topoTubo.position.y = 3.25;
grupoTubo.add(baseTubo, topoTubo);
grupoTubo.position.set(3, 0, 0); 
cena.add(grupoTubo);

// --------------------------------------------------------
// FUNÇÃO PARA TROCAR ANIMAÇÕES
// --------------------------------------------------------
function mudarAnimacao(novaAcao) {
    if (!novaAcao || acaoAtual === novaAcao) return;

    novaAcao.reset();
    novaAcao.setEffectiveTimeScale(1);
    novaAcao.setEffectiveWeight(1);
    novaAcao.fadeIn(0.2);
    novaAcao.play();

    if (acaoAtual) {
        acaoAtual.fadeOut(0.2);
    }

    acaoAtual = novaAcao;
}

// --------------------------------------------------------
// CONTROLOS DO TECLADO E CÂMARA
// --------------------------------------------------------
document.addEventListener('keydown', (e) => {
    let t = e.key.toLowerCase();
    if (t === 'w') teclas.w = true;
    if (t === 'a') teclas.a = true;
    if (t === 's') teclas.s = true;
    if (t === 'd') teclas.d = true;
    if (e.code === 'Space') teclas.space = true;

    if (t === 'c') {
        modo3D = !modo3D;
        camaraAtiva = modo3D ? camaraPerspetiva : camaraOrtografica;
        console.log("Modo:", modo3D ? "3D" : "2.5D");
    }
});

document.addEventListener('keyup', (e) => {
    let t = e.key.toLowerCase();
    if (t === 'w') teclas.w = false;
    if (t === 'a') teclas.a = false;
    if (t === 's') teclas.s = false;
    if (t === 'd') teclas.d = false;
    if (e.code === 'Space') teclas.space = false;
});

// --------------------------------------------------------
// 4. IMPORTAÇÃO E TEXTURIZAÇÃO DO MARIO
// --------------------------------------------------------
const fbxLoader = new FBXLoader();

fbxLoader.load('./Models/mario_model.fbx', (objeto) => {
    objeto.scale.set(0.007, 0.007, 0.007); 
    objeto.position.set(0, 0, 0); 
    mario = objeto;

    const texCorpo = textureLoader.load('./Models/textures/Mario64Body_alb.png');
    const texCap   = textureLoader.load('./Models/textures/Mario64Cap_alb.png');
    const texOlhos = textureLoader.load('./Models/textures/Mario64Eye_alb.0.png');
    const texRosto = textureLoader.load('./Models/textures/Mario64Face_alb.png');
    const texMaos  = textureLoader.load('./Models/textures/Mario64Hand_alb.png');

    [texCorpo, texCap, texOlhos, texRosto, texMaos].forEach(t => {
        t.magFilter = THREE.NearestFilter;
        t.colorSpace = THREE.SRGBColorSpace;
        t.flipY = false; 
    });

    objeto.traverse(function (filho) {
        if (filho.isMesh) {
            let nome = filho.name.toLowerCase();
            if (nome.includes("hand")) {
                filho.material = new THREE.MeshStandardMaterial({ map: texMaos, color: 0xffffff });
            } 
            else if (nome.includes("body") || nome.includes("overalls")) {
                filho.material = new THREE.MeshStandardMaterial({ map: texCorpo, color: 0xffffff });
            } 
            else if (nome.includes("face") || nome.includes("head")) {
                filho.material = new THREE.MeshStandardMaterial({ map: texRosto, color: 0xffffff });
            } 
            else if (nome.includes("eye")) {
                filho.material = new THREE.MeshStandardMaterial({ 
                    map: texOlhos, color: 0xffffff, transparent: true, alphaTest: 0.5 
                });
            } 
            else if (nome.includes("cap") || nome.includes("hair")) {
                filho.material = new THREE.MeshStandardMaterial({ map: texCap, color: 0xffffff });
            }
        }
    });

    cena.add(mario);
    mixer = new THREE.AnimationMixer(mario);
    
    // ANIMAÇÕES
    fbxLoader.load('./Models/mario_idle.fbx', (anim) => {
        acaoIdle = mixer.clipAction(anim.animations[0]);
        acaoIdle.play();
        acaoAtual = acaoIdle;
    });

    // NOVO: Carregar a animação de tédio
    fbxLoader.load('./Models/mario_idle_long.fbx', (anim) => {
        acaoIdleLongo = mixer.clipAction(anim.animations[0]);
    });

    fbxLoader.load('./Models/mario_walk.fbx', (anim) => {
        acaoAndar = mixer.clipAction(anim.animations[0]);
    });

    fbxLoader.load('./Models/mario_jump.fbx', (anim) => {
        acaoSaltar = mixer.clipAction(anim.animations[0]);
        acaoSaltar.setLoop(THREE.LoopOnce);
        acaoSaltar.clampWhenFinished = true;
    });

}, undefined, (e) => console.error(e));

// --------------------------------------------------------
// 5. CICLO DE ANIMAÇÃO
// --------------------------------------------------------
function loop() {
    let delta = relogio.getDelta();
    if (mixer) mixer.update(delta);

    if (mario) {
        const vel = 8 * delta; 
        let dx = 0, dz = 0;

        if (teclas.w) dz -= 1;
        if (teclas.s) dz += 1;
        if (teclas.a) dx -= 1;
        if (teclas.d) dx += 1;

        let movendo = (dx !== 0 || dz !== 0);

        if (movendo) {
            let comprimento = Math.sqrt(dx * dx + dz * dz);
            dx /= comprimento; dz /= comprimento;

            mario.position.x += dx * vel;
            mario.position.z += dz * vel;
            
            let angulo = Math.atan2(dx, dz);
            let rotacaoAlvo = new THREE.Quaternion().setFromEuler(new THREE.Euler(0, angulo, 0));
            mario.quaternion.rotateTowards(rotacaoAlvo, 10 * delta); 
        }

        if (teclas.space && noChao) {
            velocidadeY = 12;
            noChao = false;
        }

        if (!noChao) {
            velocidadeY += gravidade * delta; 
            mario.position.y += velocidadeY * delta; 
            if (mario.position.y <= 0) {
                mario.position.y = 0;
                velocidadeY = 0;
                noChao = true;
            }
        }

        // --- SEGUIMENTO DA CÂMARA ---
        camaraPerspetiva.position.x = mario.position.x;
        camaraPerspetiva.position.y = mario.position.y + 8;
        camaraPerspetiva.position.z = mario.position.z + 20;
        camaraPerspetiva.lookAt(mario.position);

        camaraOrtografica.position.x = mario.position.x + 15;
        camaraOrtografica.position.y = mario.position.y + 15;
        camaraOrtografica.position.z = mario.position.z + 15;
        camaraOrtografica.lookAt(mario.position);

        // --- TEMPORIZADOR DE INATIVIDADE ---
        // Se se mexer ou saltar, reinicia o cronómetro
        if (movendo || !noChao) {
            tempoInativo = 0;
        } else {
            // Conta os segundos que passa parado
            tempoInativo += delta;
        }

        // --- GESTÃO DE ESTADOS DE ANIMAÇÃO ---
        if (!noChao) {
            mudarAnimacao(acaoSaltar);
        } else if (movendo) {
            mudarAnimacao(acaoAndar);
        } else if (tempoInativo > 10) { 
            // Dispara após 10 segundos!
            mudarAnimacao(acaoIdleLongo);
        } else {
            mudarAnimacao(acaoIdle);
        }
    }

    meshCubo.rotateY(0.01); 
    renderer.render(cena, camaraAtiva);
    requestAnimationFrame(loop);
}

function Start() {
    requestAnimationFrame(loop);
}