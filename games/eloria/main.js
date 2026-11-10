// ELORIA - 3D Web RPG Core Logic (1인칭 청명한 대낮 리버우드 풍 & 점프 & 칼 휘두르기 구현 버전)

let scene, camera, renderer;
let player;
let fpSwordGroup; // 1인칭 전용 검 오브젝트
let walkCycle = 0;
let isMoving = false;

// Global references for player's equipment meshes (so we can toggle/modify them dynamically)
let playerHelmetGroup;
let playerTorsoMesh;
let playerLeftBootMesh, playerRightBootMesh;
let playerShieldMesh;

// Character Preview 3D scene variables (New)
let previewScene, previewCamera, previewRenderer;
let previewModelRefs;

// NPC & Dialogue System variables
let isTalking = false;
let currentNPC = null;
let currentDialogIndex = 0;
const npcs = [];
let hoveredNPC = null;

// Door System state
const doors = [];
let hoveredDoor = null;
let isOpeningDoor = false;
let doorOpenMotionTime = 0;
const doorOpenMotionDuration = 400;

// ==========================================
// INVENTORY SYSTEM STATE & VARIABLES
// ==========================================
let isInventoryOpen = false;
const inventoryCapacity = 24;
const inventory = new Array(inventoryCapacity).fill(null);
// Set starting items so the player can test equipment immediately!
inventory[0] = { templateId: "dagger", count: 1 };
inventory[1] = { templateId: "ironHelmet", count: 1 };
inventory[2] = { templateId: "ironArmor", count: 1 };
inventory[3] = { templateId: "ironBoots", count: 1 };
inventory[4] = { templateId: "woodenShield", count: 1 };

let selectedItemIndex = null;
const collectibleItems = [];
let hoveredItem = null;
let hoveredTree = null;
const woodParticles = [];

let playerStats = {
    hp: 75,       // Start with 75/100 so players can test healing immediately!
    maxHp: 100,
    mp: 20,       // Start with 20/50 so players can test mana immediately!
    maxMp: 50,
    baseAttack: 10,
    attackPower: 25, // Start with dagger equipped (10 + 15)
    baseDefense: 0,
    defense: 55,     // Start with full iron gear equipped (10 + 25 + 8 + 12)
    equipped: {
        head: 1,    // inventory slot 1 (ironHelmet)
        chest: 2,   // inventory slot 2 (ironArmor)
        boots: 3,   // inventory slot 3 (ironBoots)
        weapon: 0,  // inventory slot 0 (dagger)
        shield: 4   // inventory slot 4 (woodenShield)
    }
};

const itemTemplates = {
    apple: {
        id: "apple",
        name: "빨간 사과",
        type: "소모품 (치료)",
        description: "싱그럽고 아삭아삭한 붉은 사과입니다. 맛이 아주 달콤하여 기력을 복돋워 줍니다.\n\n[효과] 체력(HP) 20 회복",
        iconClass: "icon-apple",
        healHP: 20,
        healMP: 0,
        isStackable: true
    },
    carrot: {
        id: "carrot",
        name: "싱싱한 당근",
        type: "소모품 (치료)",
        description: "밭에서 금방 수확한 영양 만점 주황 당근입니다. 건강한 섬유질이 채워집니다.\n\n[효과] 체력(HP) 15 회복, 마나(MP) 5 회복",
        iconClass: "icon-carrot",
        healHP: 15,
        healMP: 5,
        isStackable: true
    },
    potionHp: {
        id: "potionHp",
        name: "생명력 포션",
        type: "소모품 (치료)",
        description: "모험가 연금술 가이드에 맞춰 정제된 포션입니다. 깊고 심한 상처도 빠르게 메워 줍니다.\n\n[효과] 체력(HP) 50 즉시 회복",
        iconClass: "icon-potion-hp",
        healHP: 50,
        healMP: 0,
        isStackable: true
    },
    potionMp: {
        id: "potionMp",
        name: "마력 포션",
        type: "소모품 (마력)",
        description: "하늘빛 비스무트 가루가 든 신비한 마력 물약입니다. 신체 기운을 순환시킵니다.\n\n[효과] 마나(MP) 30 즉시 회복",
        iconClass: "icon-potion-mp",
        healHP: 0,
        healMP: 30,
        isStackable: true
    },
    ironOre: {
        id: "ironOre",
        name: "철광석",
        type: "재료 아이템",
        description: "광산이나 대장장이가 즐겨 쓰는 순도 높은 무쇠 철광석입니다. 장비를 단련하거나 다른 무기를 만들 때 아주 유용하게 쓰입니다.",
        iconClass: "icon-iron-ore",
        isStackable: true
    },
    goldenLeaf: {
        id: "goldenLeaf",
        name: "황금 잎새",
        type: "희귀 재료",
        description: "중앙 광장의 수호 신목 단풍나무에서 떨어진, 바래지 않는 가을 바람의 마법을 띤 황금 잎새입니다. 촌장이나 학자들이 비싼 가격에 사들입니다.",
        iconClass: "icon-golden-leaf",
        isStackable: true
    },
    wood: {
        id: "wood",
        name: "참나무 원목",
        type: "재료 아이템",
        description: "소나무 숲이나 고목에서 갓 베어낸 단단한 참나무 원목입니다. 화로의 연료로 쓰이거나 장비를 제작할 때 유용하게 사용됩니다.",
        iconClass: "icon-wood",
        isStackable: true
    },
    dagger: {
        id: "dagger",
        name: "강철 단검",
        type: "장착형 무기",
        description: "알보어가 수제 단조법으로 두드려 단단하고 민첩하게 만들어 낸 한 손 단검입니다.\n\n[효과] 무기 공격력(ATK) +15 증가",
        iconClass: "icon-dagger",
        atkBonus: 15,
        slot: "weapon",
        isStackable: false
    },
    ironHelmet: {
        id: "ironHelmet",
        name: "강철 기사 투구",
        type: "머리 방어구",
        description: "견고하게 단조된 철제 투구입니다. 장착 시 머리를 완벽히 보호해 줍니다.\n\n[효과] 방어력(DEF) +10 증가",
        iconClass: "icon-iron-helmet",
        defBonus: 10,
        slot: "head",
        isStackable: false
    },
    ironArmor: {
        id: "ironArmor",
        name: "강철 기사 갑옷",
        type: "몸통 방어구",
        description: "어지간한 칼날은 모두 튕겨내는 무거운 철제 갑옷입니다.\n\n[효과] 방어력(DEF) +25 증가",
        iconClass: "icon-iron-armor",
        defBonus: 25,
        slot: "chest",
        isStackable: false
    },
    ironBoots: {
        id: "ironBoots",
        name: "강철 군화",
        type: "신발 방어구",
        description: "무겁지만 매우 튼튼한 강철 신발입니다. 발을 안전하게 보호합니다.\n\n[효과] 방어력(DEF) +8 증가",
        iconClass: "icon-iron-boots",
        defBonus: 8,
        slot: "boots",
        isStackable: false
    },
    woodenShield: {
        id: "woodenShield",
        name: "단단한 나무 방패",
        type: "보조 방패",
        description: "강철 테두리를 두른 무겁고 단단한 참나무 방패입니다.\n\n[효과] 방어력(DEF) +12 증가",
        iconClass: "icon-wooden-shield",
        defBonus: 12,
        slot: "shield",
        isStackable: false
    }
};

// 3인칭 전용 변수들
let isThirdPerson = false;
let thirdPersonMesh;
let leftLegGroup, rightLegGroup;
let leftArmGroup, rightArmGroup;
let tpSwordGroup; // 3인칭 오른손 검 그룹 전역 참조
let tpSheathedSwordGroup; // 3인칭 등 뒤 검 그룹 전역 참조

// 3인칭 명품 액션 상태 변수들
let isRolling = false;
let rollTime = 0;
const rollDuration = 550; // 구르기 시간 (ms)
const rollDirection = new THREE.Vector3();

let isDodging = false;
let dodgeTime = 0;
const dodgeDuration = 350; // 회피 시간 (ms)
const dodgeDirection = new THREE.Vector3();

let isStabbing = false; // 추가적인 찌르기 상태 체크 (attackType과 연동)
let isBlocking = false; // 막기 상태 (R키 또는 우클릭 유지)

let isWeaponDrawn = true; // 무기 꺼내기/넣기 상태
let isSheathing = false; // 집어넣기/꺼내기 진행 중 여부
let sheatheTime = 0;
const sheatheDuration = 500; // 무기 스왑 애니메이션 시간 (ms)

// Physics / Movement variables
const keys = { w: false, a: false, s: false, d: false, shift: false, space: false, r: false, rightClick: false };
const playerSpeed = 0.15;
const playerVelocity = new THREE.Vector3();

// Jump & Gravity physics
let playerVelocityY = 0;
const gravity = -0.012; // 프레임당 중력 강도
const jumpStrength = 0.22; // 점프 순간 위쪽 벡터 세기
let playerOnGround = true;

// Camera configuration (1인칭용)
let camYaw = Math.PI; // Horizontal rotation
let camPitch = 0.0; // Vertical rotation
const minCamPitch = -Math.PI / 2.3; // 고개 숙이기 제한
const maxCamPitch = Math.PI / 2.3; // 고개 들기 제한

// Camera bobbing (1인칭 걷기 모션)
let bobX = 0;
let bobY = 0;

// 공격 상태 변수 (Sword slash state)
let isAttacking = false;
let attackTime = 0;
const attackDuration = 350; // 공격 애니메이션 지속 시간 (ms)
let attackType = 'swing'; // 'swing' (휘두르기) 또는 'stab' (찌르기)

// Environment / Collision arrays
const collidableObjects = [];
const smokeParticles = []; // 굴뚝 연기 파티클 리스트
const glowingEmbers = []; // 대장간 불씨 맥박 조절용
const movingClouds = []; // 맑은 하늘 구름 리스트 (낮 전용)

// Pointer Lock state
let isPointerLocked = false;

// DOM Elements
const startScreen = document.getElementById('start-screen');
const startButton = document.getElementById('start-button');
const hud = document.getElementById('hud');

// Initialize on button click
startButton.addEventListener('click', () => {
    document.body.requestPointerLock();
    startScreen.classList.add('hidden');
    hud.classList.remove('hidden');
    init();
});

function init() {
    // 1. Scene Setup
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x7ec0ee); // 맑고 푸른 가을 대낮 하늘색
    scene.fog = new THREE.FogExp2(0xdcedf6, 0.005); // 안개가 말끔히 걷힌 청명한 대지 아침 하이라이트 해즈

    // 2. Camera Setup (1인칭 시점)
    camera = new THREE.PerspectiveCamera(70, window.innerWidth / window.innerHeight, 0.1, 1000);
    scene.add(camera);

    // 3. Renderer Setup
    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    document.getElementById('canvas-container').appendChild(renderer.domElement);

    // 4. Lighting Setup (맑은 낮 대낮의 청명한 태양광)
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.65); // 대낮의 밝은 환경광
    scene.add(ambientLight);

    // 하늘의 푸른빛과 지상의 수풀 반사를 나타내는 내추럴 반구 광원
    const hemiLight = new THREE.HemisphereLight(0x7ec0ee, 0x3d4f21, 0.5);
    scene.add(hemiLight);

    // 방향성 조명 (대낮의 높은 수직 태양광)
    const dirLight = new THREE.DirectionalLight(0xffffff, 1.15); // 밝은 흰색 햇살
    dirLight.position.set(40, 140, -40); // 높은 각도 배치
    dirLight.castShadow = true;
    dirLight.shadow.mapSize.width = 2048;
    dirLight.shadow.mapSize.height = 2048;
    dirLight.shadow.camera.near = 0.5;
    dirLight.shadow.camera.far = 300;
    
    const d = 120;
    dirLight.shadow.camera.left = -d;
    dirLight.shadow.camera.right = d;
    dirLight.shadow.camera.top = d;
    dirLight.shadow.camera.bottom = -d;
    scene.add(dirLight);

    // 5. Create Game World (리버우드 스타일 구현)
    createEnvironment();

    // 5.5 Create Farm and NPCs
    createFarmAndNPCs();

    // 6. Create Player
    createPlayer();

    // 7. Event Listeners
    setupInput();

    // 7.5 Initialize Inventory System
    initInventoryUI();
    spawnCollectibleItems();
    updateHUD();

    // 8. Start Animation Loop
    animate();

    // Resize Handler
    window.addEventListener('resize', onWindowResize);
}

// ==========================================
// ENVIRONMENT GENERATION (Riverwood Style)
// ==========================================
function createEnvironment() {
    // 1. 대지 (대낮에 어울리는 싱그러운 숲속 풀밭색)
    const groundGeo = new THREE.PlaneGeometry(350, 350);
    const groundMat = new THREE.MeshStandardMaterial({ 
        color: 0x4e6533, // 밝고 선명한 숲속 이끼/풀잎 대지색
        roughness: 0.95,
        metalness: 0.05
    });
    const ground = new THREE.Mesh(groundGeo, groundMat);
    ground.rotation.x = -Math.PI / 2;
    ground.receiveShadow = true;
    scene.add(ground);
    collidableObjects.push(ground);

    // 2. 구불구불한 돌바닥 길 (Cobblestone Path)
    const pathGroup = new THREE.Group();
    const stoneColor = 0x5a5750;
    const pathStoneMat = new THREE.MeshStandardMaterial({ color: stoneColor, roughness: 0.9 });
    
    for (let z = 130; z > -130; z -= 3.5) {
        const xOffset = Math.sin(z * 0.04) * 8; 
        
        const stoneGeo = new THREE.BoxGeometry(7 + Math.random() * 2, 0.15, 3.5);
        const stone = new THREE.Mesh(stoneGeo, pathStoneMat);
        stone.position.set(xOffset + (Math.random() - 0.5) * 1.5, 0.05, z);
        stone.rotation.y = (Math.random() - 0.5) * 0.2;
        stone.receiveShadow = true;
        pathGroup.add(stone);
        collidableObjects.push(stone);

        if (Math.random() > 0.4) {
            const sideStoneGeo = new THREE.DodecahedronGeometry(0.3 + Math.random() * 0.4, 0);
            const sideStone = new THREE.Mesh(sideStoneGeo, pathStoneMat);
            sideStone.position.set(xOffset + (Math.random() > 0.5 ? 4.5 : -4.5), 0.1, z + (Math.random() - 0.5) * 2);
            sideStone.receiveShadow = true;
            sideStone.castShadow = true;
            pathGroup.add(sideStone);
            collidableObjects.push(sideStone);
        }
    }
    scene.add(pathGroup);

    // 3. 목조 다리 (Wooden Bridge)
    const bridgeGroup = new THREE.Group();
    bridgeGroup.position.set(Math.sin(30 * 0.04) * 8, 0, 30);

    const bridgeMat = new THREE.MeshStandardMaterial({ color: 0x483420, roughness: 0.9 });
    
    const bridgeSupp1Geo = new THREE.BoxGeometry(8, 2, 1.5);
    const bridgeSupp1 = new THREE.Mesh(bridgeSupp1Geo, pathStoneMat);
    bridgeSupp1.position.set(0, 0.5, -3);
    bridgeSupp1.receiveShadow = true;
    bridgeSupp1.userData.preventClimbing = true; // Prevent player from climbing bridge supports
    bridgeGroup.add(bridgeSupp1);
    collidableObjects.push(bridgeSupp1);

    const bridgeSupp2 = bridgeSupp1.clone();
    bridgeSupp2.position.set(0, 0.5, 3);
    bridgeGroup.add(bridgeSupp2);
    collidableObjects.push(bridgeSupp2);

    for (let bz = -3.5; bz <= 3.5; bz += 0.8) {
        const boardGeo = new THREE.BoxGeometry(7.5, 0.25, 0.7);
        const board = new THREE.Mesh(boardGeo, bridgeMat);
        board.position.set(0, 1.4, bz);
        board.castShadow = true;
        board.receiveShadow = true;
        bridgeGroup.add(board);
        collidableObjects.push(board);
    }

    const postGeo = new THREE.BoxGeometry(0.2, 1.8, 0.2);
    const railGeo = new THREE.BoxGeometry(0.15, 0.2, 7.5);
    for (let side = -1; side <= 1; side += 2) {
        const xPos = side * 3.6;
        for (let bz = -3; bz <= 3; bz += 3) {
            const post = new THREE.Mesh(postGeo, bridgeMat);
            post.position.set(xPos, 2.0, bz);
            post.castShadow = true;
            bridgeGroup.add(post);
        }
        const rail = new THREE.Mesh(railGeo, bridgeMat);
        rail.position.set(xPos, 2.7, 0);
        rail.castShadow = true;
        bridgeGroup.add(rail);
    }
    scene.add(bridgeGroup);

    // 4. 소나무 숲 (Pine Trees & Ferns)
    const pineLeavesMat = new THREE.MeshStandardMaterial({ 
        color: 0x2e452e, // 대낮 햇빛을 머금은 싱그럽고 풍성한 침록색
        roughness: 0.9,
        flatShading: true
    });
    const trunkMat = new THREE.MeshStandardMaterial({ color: 0x3d2b1f, roughness: 0.95 });

    function createPineTree(px, pz, scale = 1.0) {
        const tree = new THREE.Group();
        tree.position.set(px, 0, pz);

        const trunkH = 8 * scale;
        const trunkG = new THREE.CylinderGeometry(0.25 * scale, 0.45 * scale, trunkH, 6);
        const trunk = new THREE.Mesh(trunkG, trunkMat);
        trunk.position.y = trunkH / 2;
        trunk.castShadow = true;
        trunk.receiveShadow = true;
        trunk.userData.isTree = true; // Mark as tree trunk
        trunk.userData.collisionRadius = 0.45 * scale; // Set collision radius
        trunk.userData.trunkHeight = trunkH; // Set trunk height
        tree.add(trunk);
        collidableObjects.push(trunk);

        const leafLayers = 4;
        for (let i = 0; i < leafLayers; i++) {
            const coneH = (4 - i * 0.5) * scale;
            const coneR = (2.2 - i * 0.4) * scale;
            const coneGeo = new THREE.ConeGeometry(coneR, coneH, 5);
            const leaves = new THREE.Mesh(coneGeo, pineLeavesMat);
            leaves.position.y = (trunkH - 1.5 * scale) + (i * 2.3 * scale);
            leaves.castShadow = true;
            tree.add(leaves);
        }

        scene.add(tree);
    }

    for (let i = 0; i < 45; i++) {
        const angle = Math.random() * Math.PI * 2;
        const dist = 24 + Math.random() * 110;
        const px = Math.cos(angle) * dist;
        const pz = Math.sin(angle) * dist;
        
        const scale = 0.85 + Math.random() * 0.55;
        createPineTree(px, pz, scale);
    }

    const fernMat = new THREE.MeshStandardMaterial({ color: 0x3a5f3d, roughness: 0.9, flatShading: true });
    for (let i = 0; i < 80; i++) {
        const fern = new THREE.Group();
        const pathZ = (Math.random() - 0.5) * 240;
        const pathX = Math.sin(pathZ * 0.04) * 8 + (Math.random() > 0.5 ? 6 + Math.random() * 8 : -6 - Math.random() * 8);
        
        fern.position.set(pathX, 0.1, pathZ);

        const leafCount = 5 + Math.floor(Math.random() * 4);
        for (let j = 0; j < leafCount; j++) {
            const leafGeo = new THREE.BoxGeometry(0.12, 0.02, 1.2 + Math.random() * 0.6);
            const leaf = new THREE.Mesh(leafGeo, fernMat);
            leaf.position.y = 0.3;
            leaf.rotation.y = (j * (Math.PI * 2 / leafCount)) + (Math.random() * 0.3);
            leaf.rotation.x = 0.4 + Math.random() * 0.3;
            leaf.castShadow = true;
            fern.add(leaf);
        }
        scene.add(fern);
    }

    // 5. 가옥 4채 건설
    const housePositions = [
        { x: -18, z: 80, rot: 0.2 },
        { x: 18, z: 45, rot: -0.5 },
        { x: -20, z: -15, rot: 0.4 },
        { x: 16, z: -60, rot: -0.3 }
    ];

    housePositions.forEach((pos, idx) => {
        const house = createRiverwoodHouse(idx === 0);
        house.position.set(pos.x, 0, pos.z);
        house.rotation.y = pos.rot;
        scene.add(house);
    });

    // 6. 극적인 빛 갈라짐 (Volumetric God-Rays / Sunbeams) - 백색광 대낮 조정
    const godRayGeo = new THREE.CylinderGeometry(2.5, 12, 180, 8, 1, true);
    const godRayMat = new THREE.MeshBasicMaterial({ 
        color: 0xffffff, // 대낮에 맞춘 화사한 흰색 빛줄기
        transparent: true, 
        opacity: 0.015, // 맑은 분위기답게 매우 은은하게 정비
        depthWrite: false, 
        blending: THREE.AdditiveBlending,
        side: THREE.DoubleSide
    });
    
    const rayPositions = [
        { x: -40, y: 70, z: -60 },
        { x: 20, y: 60, z: -40 },
        { x: -10, y: 65, z: 10 }
    ];

    rayPositions.forEach(p => {
        const ray = new THREE.Mesh(godRayGeo, godRayMat);
        ray.position.set(p.x, p.y, p.z);
        ray.rotation.x = Math.PI / 4.5;
        ray.rotation.z = -Math.PI / 6;
        scene.add(ray);
    });

    // 7. 가을 정서 거대 "금빛 황혼 낙엽수" 배치 (중앙 광장)
    const autumnTree = new THREE.Group();
    autumnTree.position.set(Math.sin(10 * 0.04) * 8 - 14, 0, 10);
    
    const broadTrunk = new THREE.Mesh(new THREE.CylinderGeometry(1.4, 2.0, 10, 8), trunkMat);
    broadTrunk.position.y = 5;
    broadTrunk.castShadow = true;
    broadTrunk.receiveShadow = true;
    broadTrunk.userData.isTree = true; // Mark as tree trunk
    broadTrunk.userData.collisionRadius = 2.0; // Set collision radius
    broadTrunk.userData.trunkHeight = 10.0; // Set trunk height
    autumnTree.add(broadTrunk);
    collidableObjects.push(broadTrunk);

    const mapleMat = new THREE.MeshStandardMaterial({ color: 0xd48817, roughness: 0.8, flatShading: true });
    const clusters = [
        [0, 10, 0, 5.5],
        [3, 11, 2, 4.0],
        [-3, 12, -2, 4.0],
        [1.5, 13, -1.5, 3.5],
        [-1.5, 12.5, 2.5, 3.5]
    ];
    clusters.forEach(c => {
        const leaves = new THREE.Mesh(new THREE.DodecahedronGeometry(c[3], 1), mapleMat);
        leaves.position.set(c[0], c[1], c[2]);
        leaves.castShadow = true;
        autumnTree.add(leaves);
    });
    scene.add(autumnTree);

    // --- 8. 맑은 하늘용 유유히 흘러가는 구름 몇 개 추가 (Moving Volumetric Clouds) ---
    const cloudMat = new THREE.MeshStandardMaterial({
        color: 0xffffff,
        roughness: 0.95,
        flatShading: true // 로우폴리 카툰 형태의 예쁜 각진 구름 표현
    });

    for (let i = 0; i < 7; i++) {
        const cloud = new THREE.Group();
        
        // 3~5개의 둥근 구체를 무작위로 겹쳐 구름 덩어리를 예쁘게 제작
        const sphereCount = 3 + Math.floor(Math.random() * 3);
        for (let j = 0; j < sphereCount; j++) {
            const rad = 4 + Math.random() * 4;
            const geo = new THREE.DodecahedronGeometry(rad, 1);
            const part = new THREE.Mesh(geo, cloudMat);
            
            // 가로 방향으로 길쭉하게 배치하여 구름의 볼륨감 형성
            part.position.set(
                (j - (sphereCount-1)/2) * (rad * 1.1), 
                (Math.random() - 0.5) * (rad * 0.4), 
                (Math.random() - 0.5) * (rad * 0.4)
            );
            part.scale.set(1.4, 0.65, 1.0); // 상하 납작화
            cloud.add(part);
        }

        // 구름 높이 및 하늘 분포 설정
        const cx = (Math.random() - 0.5) * 280;
        const cz = (Math.random() - 0.5) * 280;
        const cy = 60 + Math.random() * 25; // 지상에서 60~85 유닛 상공에 띄움
        
        cloud.position.set(cx, cy, cz);
        scene.add(cloud);

        // 각각 개별적인 바람 속도로 흘러가도록 데이터 바인딩
        cloud.userData = {
            speed: 0.015 + Math.random() * 0.02
        };
        movingClouds.push(cloud);
    }
}

// 헬퍼: 리버우드 스타일 집 디테일 생성
function createRiverwoodHouse(isBlacksmith = false) {
    const houseGroup = new THREE.Group();

    const stoneColor = 0x5a5750;
    const woodColor = 0x412d1b;
    const trimColor = 0x22160d;
    const thatchColor = 0x7c654b;

    const stoneMat = new THREE.MeshStandardMaterial({ color: stoneColor, roughness: 0.9 });
    const woodMat = new THREE.MeshStandardMaterial({ color: woodColor, roughness: 0.9 });
    const trimMat = new THREE.MeshStandardMaterial({ color: trimColor, roughness: 0.95 });
    const thatchMat = new THREE.MeshStandardMaterial({ color: thatchColor, roughness: 0.95, flatShading: true });

    // 1. 기초 석조벽 대신 중공 벽체 및 내부 인테리어와 상호작용 가능한 문 생성 (Hollow walls & interior)
    const wallThickness = 0.5;
    const baseHeight = 3.5;
    const houseWidth = 11;
    const houseDepth = 15;

    // 내부 목재 바닥 (Wooden floor)
    const floorGeo = new THREE.BoxGeometry(houseWidth - wallThickness, 0.1, houseDepth - wallThickness);
    const floorMat = new THREE.MeshStandardMaterial({ color: 0x5c4033, roughness: 0.95 }); // 따뜻한 갈색 목재 바닥
    const floor = new THREE.Mesh(floorGeo, floorMat);
    floor.position.set(0, 0.05, 0);
    floor.receiveShadow = true;
    houseGroup.add(floor);

    // 왼쪽 돌벽
    const leftWall = new THREE.Mesh(new THREE.BoxGeometry(wallThickness, baseHeight, houseDepth), stoneMat);
    leftWall.position.set(-houseWidth / 2 + wallThickness / 2, baseHeight / 2, 0);
    leftWall.castShadow = true;
    leftWall.receiveShadow = true;
    leftWall.userData.preventClimbing = true;
    houseGroup.add(leftWall);
    collidableObjects.push(leftWall);

    // 오른쪽 돌벽
    const rightWall = new THREE.Mesh(new THREE.BoxGeometry(wallThickness, baseHeight, houseDepth), stoneMat);
    rightWall.position.set(houseWidth / 2 - wallThickness / 2, baseHeight / 2, 0);
    rightWall.castShadow = true;
    rightWall.receiveShadow = true;
    rightWall.userData.preventClimbing = true;
    houseGroup.add(rightWall);
    collidableObjects.push(rightWall);

    // 뒷쪽 돌벽
    const backWall = new THREE.Mesh(new THREE.BoxGeometry(houseWidth - wallThickness * 2, baseHeight, wallThickness), stoneMat);
    backWall.position.set(0, baseHeight / 2, -houseDepth / 2 + wallThickness / 2);
    backWall.castShadow = true;
    backWall.receiveShadow = true;
    backWall.userData.preventClimbing = true;
    houseGroup.add(backWall);
    collidableObjects.push(backWall);

    // 앞쪽 돌벽 (좌측 피스)
    const frontWallLeft = new THREE.Mesh(new THREE.BoxGeometry(4.0, baseHeight, wallThickness), stoneMat);
    frontWallLeft.position.set(-3.0, baseHeight / 2, houseDepth / 2 - wallThickness / 2);
    frontWallLeft.castShadow = true;
    frontWallLeft.receiveShadow = true;
    frontWallLeft.userData.preventClimbing = true;
    houseGroup.add(frontWallLeft);
    collidableObjects.push(frontWallLeft);

    // 앞쪽 돌벽 (우측 피스)
    const frontWallRight = new THREE.Mesh(new THREE.BoxGeometry(4.0, baseHeight, wallThickness), stoneMat);
    frontWallRight.position.set(3.0, baseHeight / 2, houseDepth / 2 - wallThickness / 2);
    frontWallRight.castShadow = true;
    frontWallRight.receiveShadow = true;
    frontWallRight.userData.preventClimbing = true;
    houseGroup.add(frontWallRight);
    collidableObjects.push(frontWallRight);

    // 앞쪽 돌벽 (문 윗단 헤더)
    const frontWallHeader = new THREE.Mesh(new THREE.BoxGeometry(2.0, 0.8, wallThickness), stoneMat);
    frontWallHeader.position.set(0, baseHeight - 0.4, houseDepth / 2 - wallThickness / 2);
    frontWallHeader.castShadow = true;
    frontWallHeader.receiveShadow = true;
    frontWallHeader.userData.preventClimbing = true;
    houseGroup.add(frontWallHeader);
    collidableObjects.push(frontWallHeader);

    // --- 상호작용 가능한 회전식 목조 문 (Hinged Door) ---
    const doorHinge = new THREE.Group();
    doorHinge.position.set(-1.0, 0, houseDepth / 2 - wallThickness / 2); // 좌측 회전축(힌지) 배치
    
    const doorPanel = new THREE.Mesh(new THREE.BoxGeometry(2.0, 2.7, 0.12), trimMat);
    doorPanel.position.set(1.0, 1.35, 0); // 회전축으로부터 1유닛 떨어진 곳이 중심이 됨으로써 문이 닫혔을 때 정중앙에 맞춰짐
    doorPanel.castShadow = true;
    doorPanel.receiveShadow = true;
    doorPanel.userData.preventClimbing = true;
    doorHinge.add(doorPanel);
    collidableObjects.push(doorPanel);

    // 황금빛 문손잡이 (Golden door handle)
    const handleGeo = new THREE.BoxGeometry(0.1, 0.15, 0.25);
    const handleMat = new THREE.MeshStandardMaterial({ color: 0xd4af37, metalness: 0.8, roughness: 0.2 });
    const handle = new THREE.Mesh(handleGeo, handleMat);
    handle.position.set(0.7, 0, 0.08); // 문 오른편 끝부분에 손잡이 부착
    handle.castShadow = true;
    doorPanel.add(handle);

    houseGroup.add(doorHinge);

    // 문 메타데이터 등록
    doorPanel.userData = {
        isDoor: true,
        hinge: doorHinge,
        isOpen: false,
        houseName: isBlacksmith ? "알보어의 대장간" : "마을 주택"
    };
    doors.push(doorPanel);

    // --- 집 내부 인테리어 및 조명 배치 (Cozy Furniture & Lighting) ---
    const interiorGroup = new THREE.Group();

    // 1. 침대 (Bed)
    const bedGroup = new THREE.Group();
    bedGroup.position.set(-3.2, 0, -4.5); // 방 안 구석진 곳
    
    const bedFrame = new THREE.Mesh(new THREE.BoxGeometry(2.2, 0.5, 1.4), woodMat);
    bedFrame.position.y = 0.25;
    bedFrame.castShadow = true;
    bedFrame.receiveShadow = true;
    bedGroup.add(bedFrame);
    
    const bedBlanket = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.52, 1.42), new THREE.MeshStandardMaterial({ color: 0x3182ce, roughness: 0.8 })); // 포근한 파란색 이불
    bedBlanket.position.set(0.3, 0.26, 0);
    bedBlanket.castShadow = true;
    bedGroup.add(bedBlanket);
    
    const bedPillow = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.54, 1.0), new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.8 })); // 하얀 베개
    bedPillow.position.set(-0.8, 0.28, 0);
    bedPillow.castShadow = true;
    bedGroup.add(bedPillow);
    
    interiorGroup.add(bedGroup);

    // 2. 식탁과 의자 (Table & Chair)
    const tableGroup = new THREE.Group();
    tableGroup.position.set(2.5, 0, -2.0);
    
    const tableTop = new THREE.Mesh(new THREE.BoxGeometry(1.8, 0.1, 1.8), woodMat);
    tableTop.position.y = 1.0;
    tableTop.castShadow = true;
    tableGroup.add(tableTop);
    
    const legGeo = new THREE.CylinderGeometry(0.06, 0.06, 1.0, 4);
    for (let lx = -0.7; lx <= 0.7; lx += 1.4) {
        for (let lz = -0.7; lz <= 0.7; lz += 1.4) {
            const leg = new THREE.Mesh(legGeo, woodMat);
            leg.position.set(lx, 0.5, lz);
            leg.castShadow = true;
            tableGroup.add(leg);
        }
    }
    
    const chair = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.6, 0.7), trimMat);
    chair.position.set(0, 0.3, 1.3);
    chair.castShadow = true;
    tableGroup.add(chair);
    
    interiorGroup.add(tableGroup);

    // 3. 천장 따뜻한 호화 인테리어 전등 (Cozy Interior Ceiling Lamp)
    const interiorLight = new THREE.PointLight(0xffaa44, 2.2, 11.0);
    interiorLight.position.set(0, 2.8, 0);
    interiorLight.castShadow = true;
    interiorGroup.add(interiorLight);
    
    const lamp = new THREE.Mesh(new THREE.CylinderGeometry(0.25, 0.1, 0.2, 6), trimMat);
    lamp.position.set(0, 3.4, 0);
    lamp.castShadow = true;
    interiorGroup.add(lamp);

    houseGroup.add(interiorGroup);

    // 2. 목조 주택 상판
    const woodGeo = new THREE.BoxGeometry(11.2, 5.0, 15.2);
    const woodMesh = new THREE.Mesh(woodGeo, woodMat);
    woodMesh.position.y = 6.0;
    woodMesh.castShadow = true;
    woodMesh.receiveShadow = true;
    woodMesh.userData.preventClimbing = true; // Prevent player from climbing houses
    houseGroup.add(woodMesh);
    collidableObjects.push(woodMesh);

    // 3. 목조 격자 프레임 장식 (Timber X-Brace)
    const frameW = 0.25;
    const frameD = 0.15;
    
    for (let side = -1; side <= 1; side += 2) {
        const xPos = side * 5.65;
        for (let tz = -7; tz <= 7; tz += 7) {
            const pillar = new THREE.Mesh(new THREE.BoxGeometry(frameW, 4.5, frameD), trimMat);
            pillar.position.set(xPos, 6.0, tz);
            pillar.castShadow = true;
            houseGroup.add(pillar);
        }
        const diag1 = new THREE.Mesh(new THREE.BoxGeometry(frameW, 8.2, frameD), trimMat);
        diag1.position.set(xPos, 6.0, -3.5);
        diag1.rotation.x = Math.PI / 4;
        diag1.castShadow = true;
        houseGroup.add(diag1);

        const diag2 = diag1.clone();
        diag2.rotation.x = -Math.PI / 4;
        diag2.position.set(xPos, 6.0, 3.5);
        houseGroup.add(diag2);
    }

    // 4. 초가 지붕 (Thatched Roof)
    const roofBaseH = 10.5;
    const roofPlateL = new THREE.Mesh(new THREE.BoxGeometry(1.0, 10.5, 17.0), thatchMat);
    roofPlateL.position.set(-4.5, roofBaseH, 0);
    roofPlateL.rotation.z = -Math.PI / 4.2;
    roofPlateL.castShadow = true;
    houseGroup.add(roofPlateL);

    const roofPlateR = new THREE.Mesh(new THREE.BoxGeometry(1.0, 10.5, 17.0), thatchMat);
    roofPlateR.position.set(4.5, roofBaseH, 0);
    roofPlateR.rotation.z = Math.PI / 4.2;
    roofPlateR.castShadow = true;
    houseGroup.add(roofPlateR);

    const crest = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.5, 17.2), trimMat);
    crest.position.set(0, 14.1, 0);
    crest.castShadow = true;
    houseGroup.add(crest);

    // 5. 돌 굴뚝
    const chimney = new THREE.Mesh(new THREE.BoxGeometry(1.6, 7.5, 1.6), stoneMat);
    chimney.position.set(3.5, 11.5, -4);
    chimney.castShadow = true;
    houseGroup.add(chimney);

    // 6. 대장간 (Forge)
    if (isBlacksmith) {
        const forgeGroup = new THREE.Group();
        forgeGroup.position.set(-8.5, 0, 1.0);

        const forgeStone = new THREE.Mesh(new THREE.BoxGeometry(5, 2.5, 4), stoneMat);
        forgeStone.position.y = 1.25;
        forgeStone.receiveShadow = true;
        forgeStone.castShadow = true;
        forgeStone.userData.preventClimbing = true; // Prevent player from climbing forge stone
        forgeGroup.add(forgeStone);
        collidableObjects.push(forgeStone);

        const coalGeo = new THREE.SphereGeometry(1.0, 8, 8);
        const coalMat = new THREE.MeshBasicMaterial({ color: 0xff3700 });
        const embers = new THREE.Mesh(coalGeo, coalMat);
        embers.position.set(0, 2.4, 0);
        forgeGroup.add(embers);

        const fireLight = new THREE.PointLight(0xff5500, 3.5, 14);
        fireLight.position.set(0, 3.0, 0);
        fireLight.castShadow = true;
        forgeGroup.add(fireLight);
        glowingEmbers.push({ mesh: embers, light: fireLight });

        const stumpGeo = new THREE.CylinderGeometry(0.6, 0.7, 1.2, 8);
        const stump = new THREE.Mesh(stumpGeo, woodMat);
        stump.position.set(1.5, 0.6, 4.0);
        stump.castShadow = true;
        stump.userData.preventClimbing = true; // Prevent player from climbing smith stump
        forgeGroup.add(stump);
        collidableObjects.push(stump);

        const anvilGeo1 = new THREE.BoxGeometry(0.5, 0.4, 1.0);
        const anvil = new THREE.Mesh(anvilGeo1, trimMat);
        anvil.position.set(1.5, 1.3, 4.0);
        anvil.castShadow = true;
        anvil.userData.preventClimbing = true; // Prevent player from climbing anvil
        forgeGroup.add(anvil);
        collidableObjects.push(anvil);

        const rackGroup = new THREE.Group();
        rackGroup.position.set(-3.5, 0, 5.0);
        rackGroup.rotation.y = Math.PI / 4;

        const postH = new THREE.Mesh(new THREE.BoxGeometry(0.12, 3.2, 0.12), trimMat);
        postH.position.set(-1.0, 1.6, 0);
        postH.castShadow = true;
        rackGroup.add(postH);

        const postH2 = postH.clone();
        postH2.position.x = 1.0;
        rackGroup.add(postH2);

        const crossBar = new THREE.Mesh(new THREE.BoxGeometry(2.2, 0.12, 0.12), trimMat);
        crossBar.position.set(0, 3.0, 0);
        crossBar.castShadow = true;
        rackGroup.add(crossBar);

        const crossBar2 = crossBar.clone();
        crossBar2.position.y = 0.3;
        rackGroup.add(crossBar2);

        const leatherGeo = new THREE.BoxGeometry(1.6, 2.0, 0.05);
        const leatherMat = new THREE.MeshStandardMaterial({ color: 0x8f5e3b, roughness: 0.95 });
        const leather = new THREE.Mesh(leatherGeo, leatherMat);
        leather.position.set(0, 1.6, 0);
        leather.castShadow = true;
        rackGroup.add(leather);
        
        forgeGroup.add(rackGroup);
        houseGroup.add(forgeGroup);
    }

    houseGroup.userData = {
        chimneyLocalPos: new THREE.Vector3(3.5, 15.3, -4)
    };

    return houseGroup;
}


// ==========================================
// PLAYER CREATION
// ==========================================
// =========================================================================
// 3D CHARACTER MODEL GROUP CREATOR & VISUAL EQUIPMENT HANDLER
// =========================================================================

// 헬퍼: 3D 캐릭터 모델 그룹 생성 (인게임 3인칭 메시 및 인벤토리 캐릭터 프리뷰에서 동일하게 사용)
function createPlayerModelGroup(isForPreview) {
    const group = new THREE.Group();

    // 공통 재질 정의
    const skinMat3D = new THREE.MeshStandardMaterial({ color: 0xffd8b3, roughness: 0.8 }); // 피부색
    const hairMat = new THREE.MeshStandardMaterial({ color: 0x5c4033, roughness: 0.9 }); // 갈색 머리/수염
    const gloveMat = new THREE.MeshStandardMaterial({ color: 0x3d271d, roughness: 0.9 }); // 가죽 장갑/장화
    const tunicMat = new THREE.MeshStandardMaterial({ color: 0x2b4c6f, roughness: 0.85 }); // 파란색 튜닉
    const pantsMat = new THREE.MeshStandardMaterial({ color: 0x1d211a, roughness: 0.9 }); // 바지색
    const ironMat3D = new THREE.MeshStandardMaterial({ color: 0x718096, metalness: 0.8, roughness: 0.3 }); // 철
    const goldMat3D = new THREE.MeshStandardMaterial({ color: 0xd4af37, metalness: 0.8, roughness: 0.2 }); // 금

    // 1. 몸통 (Torso)
    const torsoGeo = new THREE.BoxGeometry(0.5, 0.7, 0.28);
    const torso = new THREE.Mesh(torsoGeo, tunicMat);
    torso.position.y = 0.95; // y=0.6 ~ y=1.3 범위
    torso.castShadow = true;
    torso.receiveShadow = true;
    group.add(torso);

    // 가죽 벨트
    const beltGeo = new THREE.BoxGeometry(0.54, 0.08, 0.32);
    const belt = new THREE.Mesh(beltGeo, gloveMat);
    belt.position.set(0, 0.7, 0);
    belt.castShadow = true;
    group.add(belt);

    // 벨트 버클
    const buckleGeo = new THREE.BoxGeometry(0.12, 0.1, 0.34);
    const buckle = new THREE.Mesh(buckleGeo, goldMat3D);
    buckle.position.set(0, 0.7, 0.01);
    buckle.castShadow = true;
    group.add(buckle);

    // 2. 다리 (Legs - 회전 중심점을 위해 그룹화)
    const leftLegGroup = new THREE.Group();
    leftLegGroup.position.set(-0.15, 0.6, 0); // 고관절 위치
    group.add(leftLegGroup);

    const leftLegMesh = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.6, 0.16), pantsMat);
    leftLegMesh.position.y = -0.3; // 고관절 기준으로 아래로 연장
    leftLegMesh.castShadow = true;
    leftLegMesh.receiveShadow = true;
    leftLegGroup.add(leftLegMesh);

    // 왼쪽 신발
    const leftBoot = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.15, 0.24), gloveMat);
    leftBoot.position.set(0, -0.55, 0.04);
    leftBoot.castShadow = true;
    leftLegGroup.add(leftBoot);

    const rightLegGroup = new THREE.Group();
    rightLegGroup.position.set(0.15, 0.6, 0); // 고관절 위치
    group.add(rightLegGroup);

    const rightLegMesh = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.6, 0.16), pantsMat);
    rightLegMesh.position.y = -0.3;
    rightLegMesh.castShadow = true;
    rightLegMesh.receiveShadow = true;
    rightLegGroup.add(rightLegMesh);

    // 오른쪽 신발
    const rightBoot = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.15, 0.24), gloveMat);
    rightBoot.position.set(0, -0.55, 0.04);
    rightBoot.castShadow = true;
    rightLegGroup.add(rightBoot);

    // 3. 머리 및 투구 (Head & Helmet Group)
    const headGroup = new THREE.Group();
    headGroup.position.set(0, 1.3, 0); // 목 위치
    group.add(headGroup);

    const headMesh = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.3, 0.3), skinMat3D);
    headMesh.position.y = 0.15;
    headMesh.castShadow = true;
    headGroup.add(headMesh);

    // 머리카락
    const hairMesh = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.12, 0.32), hairMat);
    hairMesh.position.set(0, 0.26, -0.02);
    hairMesh.castShadow = true;
    headGroup.add(hairMesh);

    // 귀여운 사각형 눈 구현
    const eyeGeo = new THREE.BoxGeometry(0.04, 0.04, 0.01);
    const eyeMat = new THREE.MeshBasicMaterial({ color: 0x111111 });
    const leftEye = new THREE.Mesh(eyeGeo, eyeMat);
    leftEye.position.set(-0.07, 0.16, 0.151);
    const rightEye = new THREE.Mesh(eyeGeo, eyeMat);
    rightEye.position.set(0.07, 0.16, 0.151);
    headGroup.add(leftEye);
    headGroup.add(rightEye);

    // 멋진 기사 투구 그룹 (Helmet Group - 이제 장비 상태에 따라 켜고 끄기 가능)
    const helmetGroup = new THREE.Group();
    headGroup.add(helmetGroup);

    const helmetBase = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.16, 0.32), ironMat3D);
    helmetBase.position.set(0, 0.25, 0);
    helmetBase.castShadow = true;
    helmetGroup.add(helmetBase);

    const helmetTrim = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.04, 0.34), goldMat3D);
    helmetTrim.position.set(0, 0.18, 0);
    helmetTrim.castShadow = true;
    helmetGroup.add(helmetTrim);

    const helmetPlume = new THREE.Mesh(new THREE.ConeGeometry(0.04, 0.15, 4), goldMat3D);
    helmetPlume.position.set(0, 0.38, -0.05);
    helmetPlume.rotation.x = -0.3;
    helmetPlume.castShadow = true;
    helmetGroup.add(helmetPlume);

    // 4. 양 팔 (Arms - 어깨 관절 기준으로 그룹화)
    const leftArmGroup = new THREE.Group();
    leftArmGroup.position.set(-0.33, 1.25, 0); // 어깨 위치
    group.add(leftArmGroup);

    const leftArmMesh = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.6, 0.14), tunicMat);
    leftArmMesh.position.y = -0.28;
    leftArmMesh.castShadow = true;
    leftArmMesh.receiveShadow = true;
    leftArmGroup.add(leftArmMesh);

    // 왼손 가죽 장갑
    const leftHandMesh = new THREE.Mesh(new THREE.SphereGeometry(0.08, 6, 6), gloveMat);
    leftHandMesh.position.set(0, -0.58, 0);
    leftHandMesh.castShadow = true;
    leftArmGroup.add(leftHandMesh);

    // 왼팔 방패 (Shield - 방패 장착 시 활성화!)
    const shieldMesh = new THREE.Group();
    shieldMesh.position.set(-0.08, -0.4, 0.1); // 왼팔뚝 바깥쪽 배치
    shieldMesh.rotation.set(0.3, -0.5, 0.2);
    leftArmGroup.add(shieldMesh);

    // 방패 판 (나무)
    const shieldBaseGeo = new THREE.BoxGeometry(0.35, 0.45, 0.04);
    const shieldWoodMat = new THREE.MeshStandardMaterial({ color: 0x8b5a2b, roughness: 0.9 });
    const shieldBase = new THREE.Mesh(shieldBaseGeo, shieldWoodMat);
    shieldBase.castShadow = true;
    shieldMesh.add(shieldBase);

    // 방패 테두리 (무쇠)
    const shieldTrimGeo = new THREE.BoxGeometry(0.39, 0.49, 0.02);
    const shieldTrim = new THREE.Mesh(shieldTrimGeo, ironMat3D);
    shieldTrim.position.z = -0.01;
    shieldTrim.castShadow = true;
    shieldMesh.add(shieldTrim);

    // 방패 중심 문양 (황금)
    const shieldEmblemGeo = new THREE.BoxGeometry(0.1, 0.1, 0.06);
    const shieldEmblem = new THREE.Mesh(shieldEmblemGeo, goldMat3D);
    shieldEmblem.position.z = 0.01;
    shieldEmblem.castShadow = true;
    shieldMesh.add(shieldEmblem);

    const rightArmGroup = new THREE.Group();
    rightArmGroup.position.set(0.33, 1.25, 0); // 어깨 위치
    group.add(rightArmGroup);

    const rightArmMesh = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.6, 0.14), tunicMat);
    rightArmMesh.position.y = -0.28;
    rightArmMesh.castShadow = true;
    rightArmMesh.receiveShadow = true;
    rightArmGroup.add(rightArmMesh);

    // 오른손 가죽 장갑
    const rightHandMesh = new THREE.Mesh(new THREE.SphereGeometry(0.08, 6, 6), gloveMat);
    rightHandMesh.position.set(0, -0.58, 0);
    rightHandMesh.castShadow = true;
    rightArmGroup.add(rightHandMesh);

    // 5. 오른손 장착 무기 (Sword)
    const swordGroup = new THREE.Group();
    swordGroup.position.set(0.04, -0.58, -0.05); // 오른손 위치에 완벽 결합
    swordGroup.rotation.set(-1.4, 0.2, 0.5); // 칼을 쥐고 앞으로 살짝 겨눈 멋진 각도
    rightArmGroup.add(swordGroup);

    const tpSwordCore = new THREE.Group();
    swordGroup.add(tpSwordCore);

    // 검날 (Blade)
    const tpBladeGeo = new THREE.BoxGeometry(0.05, 0.8, 0.015);
    const tpBlade = new THREE.Mesh(tpBladeGeo, ironMat3D);
    tpBlade.position.y = 0.4;
    tpBlade.castShadow = true;
    tpSwordCore.add(tpBlade);

    // 검 코등이 (Guard)
    const tpGuardGeo = new THREE.BoxGeometry(0.2, 0.03, 0.04);
    const tpGuard = new THREE.Mesh(tpGuardGeo, goldMat3D);
    tpGuard.position.y = 0.0;
    tpGuard.castShadow = true;
    tpSwordCore.add(tpGuard);

    // 검 손잡이 (Grip)
    const tpGripGeo = new THREE.CylinderGeometry(0.02, 0.02, 0.18, 6);
    const tpGrip = new THREE.Mesh(tpGripGeo, gloveMat);
    tpGrip.position.y = -0.1;
    tpGrip.castShadow = true;
    tpSwordCore.add(tpGrip);

    // 검 폼멜 (Pommel)
    const tpPommelGeo = new THREE.SphereGeometry(0.035, 6, 6);
    const tpPommel = new THREE.Mesh(tpPommelGeo, goldMat3D);
    tpPommel.position.y = -0.19;
    tpPommel.castShadow = true;
    tpSwordCore.add(tpPommel);

    // 6. 등 뒤 메고 있는 검 (Sheathed Sword on Back)
    const sheathedSwordGroup = new THREE.Group();
    sheathedSwordGroup.position.set(-0.15, 0.95, -0.16); // 등 뒤 약간 왼쪽 대각선 배치
    sheathedSwordGroup.rotation.set(0.1, 0.2, -2.4); // 비스듬히 메고 있는 멋진 자세
    group.add(sheathedSwordGroup);

    const tpSheathedSwordCore = new THREE.Group();
    sheathedSwordGroup.add(tpSheathedSwordCore);

    const sBlade = new THREE.Mesh(tpBladeGeo, ironMat3D);
    sBlade.position.y = 0.4;
    sBlade.castShadow = true;
    tpSheathedSwordCore.add(sBlade);

    const sGuard = new THREE.Mesh(tpGuardGeo, goldMat3D);
    sGuard.position.y = 0.0;
    sGuard.castShadow = true;
    tpSheathedSwordCore.add(sGuard);

    const sGrip = new THREE.Mesh(tpGripGeo, gloveMat);
    sGrip.position.y = -0.1;
    sGrip.castShadow = true;
    tpSheathedSwordCore.add(sGrip);

    const sPommel = new THREE.Mesh(tpPommelGeo, goldMat3D);
    sPommel.position.y = -0.19;
    sPommel.castShadow = true;
    tpSheathedSwordCore.add(sPommel);

    return {
        group: group,
        torso: torso,
        leftBoot: leftBoot,
        rightBoot: rightBoot,
        helmet: helmetGroup,
        shield: shieldMesh,
        sword: swordGroup,
        sheathedSword: sheathedSwordGroup,
        leftLegGroup: leftLegGroup,
        rightLegGroup: rightLegGroup,
        leftArmGroup: leftArmGroup,
        rightArmGroup: rightArmGroup
    };
}

// 무기 장착 및 외형 실시간 동기화 함수
function updatePlayerEquipmentAppearance() {
    const equipped = playerStats.equipped;

    const tunicMat = new THREE.MeshStandardMaterial({ color: 0x2b4c6f, roughness: 0.85 }); // 기본 파란색 튜닉
    const gloveMat = new THREE.MeshStandardMaterial({ color: 0x3d271d, roughness: 0.9 }); // 가죽 장화
    const ironMat3D = new THREE.MeshStandardMaterial({ color: 0x718096, metalness: 0.8, roughness: 0.3 }); // 강철 갑옷

    // 1. 머리 투구 (Helmet)
    const hasHelmet = equipped.head !== null && equipped.head !== undefined;
    if (playerHelmetGroup) playerHelmetGroup.visible = hasHelmet;
    if (previewModelRefs && previewModelRefs.helmet) previewModelRefs.helmet.visible = hasHelmet;

    // 2. 몸통 갑옷 (Armor)
    const hasArmor = equipped.chest !== null && equipped.chest !== undefined;
    if (playerTorsoMesh) playerTorsoMesh.material = hasArmor ? ironMat3D : tunicMat;
    if (previewModelRefs && previewModelRefs.torso) previewModelRefs.torso.material = hasArmor ? ironMat3D : tunicMat;

    // 3. 신발 장화 (Boots)
    const hasBoots = equipped.boots !== null && equipped.boots !== undefined;
    const bootsMat = hasBoots ? ironMat3D : gloveMat;
    if (playerLeftBootMesh) playerLeftBootMesh.material = bootsMat;
    if (playerRightBootMesh) playerRightBootMesh.material = bootsMat;
    if (previewModelRefs) {
        if (previewModelRefs.leftBoot) previewModelRefs.leftBoot.material = bootsMat;
        if (previewModelRefs.rightBoot) previewModelRefs.rightBoot.material = bootsMat;
    }

    // 4. 왼팔 방패 (Shield)
    const hasShield = equipped.shield !== null && equipped.shield !== undefined;
    if (playerShieldMesh) playerShieldMesh.visible = hasShield;
    if (previewModelRefs && previewModelRefs.shield) previewModelRefs.shield.visible = hasShield;

    // 5. 무기 가시성 (Weapon)
    const hasWeapon = equipped.weapon !== null && equipped.weapon !== undefined;
    if (tpSwordGroup) {
        tpSwordGroup.visible = isThirdPerson && isWeaponDrawn && hasWeapon;
    }
    if (tpSheathedSwordGroup) {
        tpSheathedSwordGroup.visible = isThirdPerson && !isWeaponDrawn && hasWeapon;
    }
    if (fpSwordGroup) {
        fpSwordGroup.visible = !isThirdPerson && isWeaponDrawn && hasWeapon;
    }
    if (previewModelRefs) {
        previewModelRefs.sword.visible = hasWeapon;
        previewModelRefs.sheathedSword.visible = false;
    }
}

function createPlayer() {
    player = new THREE.Group();
    player.position.set(0, 1.5, 110);
    scene.add(player);

    fpSwordGroup = new THREE.Group();
    camera.add(fpSwordGroup);

    const goldMat = new THREE.MeshStandardMaterial({ color: 0xd4af37, metalness: 0.8, roughness: 0.2 });
    const ironMat = new THREE.MeshStandardMaterial({ color: 0x718096, metalness: 0.8, roughness: 0.3 });
    const woodMat = new THREE.MeshStandardMaterial({ color: 0x3d271d, roughness: 0.9 });

    const swordCore = new THREE.Group();
    swordCore.position.set(0.3, -0.28, -0.55);
    swordCore.rotation.set(0.2, -0.5, -0.3);
    fpSwordGroup.add(swordCore);

    const bladeGeo = new THREE.BoxGeometry(0.04, 0.45, 0.012);
    const blade = new THREE.Mesh(bladeGeo, ironMat);
    blade.position.y = 0.225;
    blade.castShadow = true;
    swordCore.add(blade);

    const guardGeo = new THREE.BoxGeometry(0.12, 0.02, 0.03);
    const guard = new THREE.Mesh(guardGeo, goldMat);
    guard.position.y = 0.0;
    guard.castShadow = true;
    swordCore.add(guard);

    const gripGeo = new THREE.CylinderGeometry(0.015, 0.015, 0.1, 6);
    const grip = new THREE.Mesh(gripGeo, woodMat);
    grip.position.y = -0.05;
    grip.castShadow = true;
    swordCore.add(grip);

    const pommelGeo = new THREE.SphereGeometry(0.02, 6, 6);
    const pommel = new THREE.Mesh(pommelGeo, goldMat);
    pommel.position.y = -0.1;
    pommel.castShadow = true;
    swordCore.add(pommel);

    // --- 1인칭 사람 손 및 소매 구현 (First-Person Human Hand & Arm) ---
    const skinMat = new THREE.MeshStandardMaterial({ 
        color: 0xffd8b3, // 동양인/서양인에 잘 맞는 건강한 웜 베이지 스킨톤
        roughness: 0.65, // 살결 특유의 반사광 표현
        metalness: 0.0
    });

    const handPalmGeo = new THREE.BoxGeometry(0.05, 0.04, 0.045);
    const handPalm = new THREE.Mesh(handPalmGeo, skinMat);
    handPalm.position.set(0.02, -0.04, 0.01);
    handPalm.rotation.set(0, -0.15, 0);
    swordCore.add(handPalm);

    const fingersGroup = new THREE.Group();
    swordCore.add(fingersGroup);

    const fingerRadius = 0.01;
    const fingerLength = 0.042;
    const fingerPositionsY = [-0.015, -0.032, -0.05, -0.068];
    
    fingerPositionsY.forEach((fy, fIdx) => {
        const fingerGeo = new THREE.BoxGeometry(fingerLength, fingerRadius * 2, fingerRadius * 2);
        const finger = new THREE.Mesh(fingerGeo, skinMat);
        finger.position.set(-0.015, fy, 0.012);
        finger.rotation.set(0, 0.25, 0.05 * fIdx);
        fingersGroup.add(finger);
    });

    const thumbGeo = new THREE.BoxGeometry(0.022, 0.014, 0.035);
    const thumb = new THREE.Mesh(thumbGeo, skinMat);
    thumb.position.set(0.012, -0.01, 0.022);
    thumb.rotation.set(0.2, -0.5, 0.4);
    swordCore.add(thumb);

    const armGroup = new THREE.Group();
    swordCore.add(armGroup);

    const wristGeo = new THREE.CylinderGeometry(0.022, 0.025, 0.08, 8);
    const wrist = new THREE.Mesh(wristGeo, skinMat);
    wrist.position.set(0.04, -0.10, 0.04);
    wrist.rotation.set(-0.5, 0, 0.3);
    armGroup.add(wrist);

    const forearmGeo = new THREE.CylinderGeometry(0.025, 0.03, 0.1, 8);
    const forearm = new THREE.Mesh(forearmGeo, skinMat);
    forearm.position.set(0.07, -0.17, 0.08);
    forearm.rotation.set(-0.5, 0, 0.3);
    armGroup.add(forearm);

    const rolledSleeveGeo = new THREE.CylinderGeometry(0.038, 0.038, 0.04, 8);
    const sleeveMat = new THREE.MeshStandardMaterial({ color: 0x2b4c6f, roughness: 0.85 });
    const rolledSleeve = new THREE.Mesh(rolledSleeveGeo, sleeveMat);
    rolledSleeve.position.set(0.095, -0.22, 0.11);
    rolledSleeve.rotation.set(-0.5, 0, 0.3);
    armGroup.add(rolledSleeve);

    const sleeveGeo = new THREE.CylinderGeometry(0.035, 0.042, 0.18, 8);
    const sleeve = new THREE.Mesh(sleeveGeo, sleeveMat);
    sleeve.position.set(0.13, -0.29, 0.15);
    sleeve.rotation.set(-0.5, 0, 0.3);
    armGroup.add(sleeve);

    // ==========================================
    // 3인칭 캐릭터 모델 생성 (Using the helper function)
    // ==========================================
    const modelRefs = createPlayerModelGroup(false);
    thirdPersonMesh = modelRefs.group;
    player.add(thirdPersonMesh);

    // 글로벌 및 주요 애니메이션 변수 맵핑
    playerTorsoMesh = modelRefs.torso;
    playerLeftBootMesh = modelRefs.leftBoot;
    playerRightBootMesh = modelRefs.rightBoot;
    playerHelmetGroup = modelRefs.helmet;
    playerShieldMesh = modelRefs.shield;
    tpSwordGroup = modelRefs.sword;
    tpSheathedSwordGroup = modelRefs.sheathedSword;

    leftLegGroup = modelRefs.leftLegGroup;
    rightLegGroup = modelRefs.rightLegGroup;
    leftArmGroup = modelRefs.leftArmGroup;
    rightArmGroup = modelRefs.rightArmGroup;

    // 초기 무장 외형 적용
    updatePlayerEquipmentAppearance();

    // [시작 시점 1인칭 최적화 가시성 설정]
    thirdPersonMesh.visible = isThirdPerson;
    if (tpSwordGroup) tpSwordGroup.visible = isThirdPerson && isWeaponDrawn && playerStats.equipped.weapon !== null;
    if (tpSheathedSwordGroup) tpSheathedSwordGroup.visible = isThirdPerson && !isWeaponDrawn && playerStats.equipped.weapon !== null;
    if (fpSwordGroup) fpSwordGroup.visible = !isThirdPerson && isWeaponDrawn && playerStats.equipped.weapon !== null;
}


// ==========================================
// CONTROLS & SYSTEM INPUTS (조작 수정)
// ==========================================
function setupInput() {
    window.addEventListener('keydown', e => {
        if (isInventoryOpen) {
            if (e.key.toLowerCase() === 'e' || e.key.toLowerCase() === 'i' || e.key === 'Escape') {
                toggleInventory();
                e.preventDefault();
            }
            return; // Block other actions when inventory is open
        }
        if (isTalking) {
            if (e.key === ' ' || e.key === 'Enter') {
                advanceDialogue();
                e.preventDefault();
            }
            return; // Block movement keys while talking
        }
        switch (e.key.toLowerCase()) {
            case 'w': keys.w = true; break;
            case 's': keys.s = true; break;
            case 'a': keys.a = true; break;
            case 'd': keys.d = true; break;
            case 'shift': keys.shift = true; break;
            case ' ': keys.space = true; e.preventDefault(); break;
            case 'p': togglePerspective(); break;
            case 'e': toggleInventory(); break; // Open/close inventory with E
            case 'x': toggleWeaponDraw(); break;
            case 'i': toggleInventory(); break; // Keep I as secondary bind
            case 'k': takeTestDamage(); break;
        }
    });

    window.addEventListener('keyup', e => {
        switch (e.key.toLowerCase()) {
            case 'w': keys.w = false; break;
            case 's': keys.s = false; break;
            case 'a': keys.a = false; break;
            case 'd': keys.d = false; break;
            case 'shift': keys.shift = false; break;
            case ' ': keys.space = false; break;
        }
    });

    document.addEventListener('pointerlockchange', () => {
        isPointerLocked = (document.pointerLockElement === document.body);
    });

    window.addEventListener('mousemove', e => {
        if (!isPointerLocked) return;

        const sensitivity = 0.0022;
        camYaw -= e.movementX * sensitivity;
        camPitch -= e.movementY * sensitivity;

        camPitch = Math.max(minCamPitch, Math.min(maxCamPitch, camPitch));
    });

    document.getElementById('canvas-container').addEventListener('click', () => {
        if (!isPointerLocked && startScreen.classList.contains('hidden')) {
            document.body.requestPointerLock();
        }
    });

    // 마우스 클릭 이벤트 등록 (우클릭 및 좌클릭 처리)
    window.addEventListener('mousedown', e => {
        if (!isPointerLocked) return;

        if (e.button === 0) { // 좌클릭
            if (isTalking) {
                advanceDialogue();
            } else if (!isAttacking && !isRolling && !isDodging && !isSheathing) {
                if (!isWeaponDrawn) {
                    toggleWeaponDraw(); // 무기가 안 꺼내져 있다면 꺼내기 우선
                } else {
                    isAttacking = true;
                    attackTime = 0;
                    attackType = 'swing'; // Always use swing attack, disable stab skill

                    if (hoveredTree) {
                        chopTree(hoveredTree);
                    }
                }
            }
        } else if (e.button === 2) { // 우클릭
            if (isTalking) {
                advanceDialogue();
            } else if (hoveredNPC) {
                tryInteract();
            } else if (hoveredDoor) {
                toggleDoor(hoveredDoor);
            }
        }
    });

    window.addEventListener('mouseup', e => {
        if (e.button === 2) { // 우클릭 해제
            keys.rightClick = false;
        }
    });

    // 브라우저 기본 우클릭 컨텍스트 메뉴 차단
    window.addEventListener('contextmenu', e => {
        e.preventDefault();
    });
}

function chopTree(tree) {
    if (tree.userData.cooldownEnd && Date.now() < tree.userData.cooldownEnd) return;

    // Initialize hitsRemaining if undefined
    if (tree.userData.hitsRemaining === undefined) {
        tree.userData.hitsRemaining = 3;
    }

    // Play hit effects
    // 1. Shaking tree group
    if (tree.parent) {
        if (!tree.parent.userData.originalScaleY) {
            tree.parent.userData.originalScaleY = tree.parent.scale.y;
        }
        tree.parent.userData.shake = 1.0;
    }

    // 2. Spawn wood particles
    const treePos = new THREE.Vector3();
    tree.getWorldPosition(treePos);
    
    for (let i = 0; i < 12; i++) {
        const pGeo = new THREE.BoxGeometry(0.06 + Math.random() * 0.08, 0.06 + Math.random() * 0.08, 0.06 + Math.random() * 0.08);
        const pMat = new THREE.MeshStandardMaterial({ color: 0x8b5a2b, roughness: 0.95 });
        const p = new THREE.Mesh(pGeo, pMat);
        p.position.copy(treePos);
        p.position.y += 1.0 + Math.random() * 1.5; // Hit height around player height
        p.userData = {
            vx: (Math.random() - 0.5) * 0.15,
            vy: 0.1 + Math.random() * 0.15,
            vz: (Math.random() - 0.5) * 0.15,
            life: 1.0
        };
        scene.add(p);
        woodParticles.push(p);
    }

    // 3. Decrement hits
    tree.userData.hitsRemaining--;

    // 4. Drop wood item
    const offsetX = (Math.random() - 0.5) * 1.5;
    const offsetZ = (Math.random() - 0.5) * 1.5;
    spawnCollectibleItem('wood', treePos.x + offsetX, treePos.z + offsetZ);

    if (tree.userData.hitsRemaining <= 0) {
        // Felled!
        tree.userData.cooldownEnd = Date.now() + 15000; // 15 seconds cooldown
        
        // Spawn additional wood logs (e.g. 1-2 more)
        const moreWood = 1 + Math.floor(Math.random() * 2);
        for (let j = 0; j < moreWood; j++) {
            const extraX = (Math.random() - 0.5) * 1.5;
            const extraZ = (Math.random() - 0.5) * 1.5;
            spawnCollectibleItem('wood', treePos.x + extraX, treePos.z + extraZ);
        }
        
        showPromptNotification(`<span style="color:#48bb78; font-weight:bold;">나무가 쓰러졌습니다! 참나무 원목을 획득하세요.</span>`);
    } else {
        showPromptNotification(`<span style="color:#f3e5ab; font-weight:bold;">나무를 벴습니다! (남은 타격: ${tree.userData.hitsRemaining})</span>`);
    }
}

// --- 3인칭 특화 액션 제어 헬퍼 함수군 ---

function triggerDodgeOrRoll() {
    if (isTalking || isRolling || isDodging || isSheathing) return;
    
    if (isMoving) {
        // 구르기 (이동 중인 경우)
        isRolling = true;
        rollTime = 0;
        
        // 구르는 방향 결정
        const forwardVec = new THREE.Vector3(Math.sin(camYaw), 0, Math.cos(camYaw)).normalize();
        const rightVec = new THREE.Vector3(-Math.cos(camYaw), 0, Math.sin(camYaw)).normalize();
        
        rollDirection.set(0, 0, 0);
        if (keys.w) rollDirection.add(forwardVec);
        if (keys.s) rollDirection.add(forwardVec.clone().negate());
        if (keys.d) rollDirection.add(rightVec);
        if (keys.a) rollDirection.add(rightVec.clone().negate());
        
        if (rollDirection.lengthSq() > 0) {
            rollDirection.normalize();
        } else {
            rollDirection.copy(forwardVec);
        }
    } else {
        // 백스텝 회피 (정지 상태인 경우)
        isDodging = true;
        dodgeTime = 0;
        
        // 회피 방향: 뒤쪽
        const forwardVec = new THREE.Vector3(Math.sin(camYaw), 0, Math.cos(camYaw)).normalize();
        dodgeDirection.copy(forwardVec).negate().normalize();
    }
}

function triggerStab() {
    if (isTalking || isAttacking || isRolling || isDodging || isSheathing) return;
    
    if (!isWeaponDrawn) {
        toggleWeaponDraw(); // 무기가 들어가 있으면 먼저 꺼내기
        return;
    }
    
    isAttacking = true;
    attackType = 'stab';
    attackTime = 0;
}

function toggleWeaponDraw() {
    if (isTalking || isRolling || isDodging || isSheathing) return;
    
    isWeaponDrawn = !isWeaponDrawn;
    isSheathing = true;
    sheatheTime = 0;
}


// ==========================================
// RAYCAST COLLISION / HEIGHT RESOLUTION
// ==========================================
const raycaster = new THREE.Raycaster();
const downDirection = new THREE.Vector3(0, -1, 0);

function getTerrainHeight(pos) {
    const rayOrigin = new THREE.Vector3(pos.x, pos.y + 15, pos.z);
    raycaster.set(rayOrigin, downDirection);
    
    const intersects = raycaster.intersectObjects(collidableObjects, true);
    
    for (let i = 0; i < intersects.length; i++) {
        let obj = intersects[i].object;
        let preventClimbing = false;
        while (obj) {
            if (obj.userData && (obj.userData.preventClimbing || obj.userData.isTree)) {
                preventClimbing = true;
                break;
            }
            obj = obj.parent;
        }
        if (preventClimbing) continue; // Ignore obstacles to prevent climbing
        return intersects[i].point.y;
    }
    return 0;
}

// ==========================================
// HORIZONTAL COLLISION DETECTION & RESOLUTION
// ==========================================
function checkCollision(pos) {
    const playerRadius = 0.5;
    const playerHeight = 1.8;
    
    // 1. Check solid objects in collidableObjects
    for (let i = 0; i < collidableObjects.length; i++) {
        const obj = collidableObjects[i];
        if (!obj) continue;
        
        // Skip collision checking for open doors
        if (obj.userData && obj.userData.isDoor && obj.userData.isOpen) {
            continue;
        }
        
        // Check if it's marked as solid
        const isSolid = obj.userData && (obj.userData.preventClimbing || obj.userData.isTree);
        if (!isSolid) continue;
        
        // Ensure the object's world matrix is up to date
        obj.updateMatrixWorld();
        
        if (obj.userData.isTree) {
            // Cylindrical tree trunk collision
            const trunkWorldPos = new THREE.Vector3();
            obj.getWorldPosition(trunkWorldPos);
            
            // Compute horizontal distance in XZ plane
            const dx = pos.x - trunkWorldPos.x;
            const dz = pos.z - trunkWorldPos.z;
            const dist = Math.sqrt(dx * dx + dz * dz);
            
            const radius = obj.userData.collisionRadius || 0.45;
            if (dist < radius + playerRadius) {
                const trunkHeight = obj.userData.trunkHeight || 8;
                const minY = trunkWorldPos.y - trunkHeight / 2;
                const maxY = trunkWorldPos.y + trunkHeight / 2;
                
                const playerFeetY = pos.y;
                const playerHeadY = pos.y + playerHeight;
                
                if (playerHeadY >= minY && playerFeetY <= maxY) {
                    return true;
                }
            }
        } else {
            // Box-like or other solid obstacle
            if (!obj.geometry.boundingBox) {
                obj.geometry.computeBoundingBox();
            }
            const box = obj.geometry.boundingBox;
            
            // Transform check position to local space of the mesh
            const localPoint = pos.clone();
            obj.worldToLocal(localPoint);
            
            const minX = box.min.x - playerRadius;
            const maxX = box.max.x + playerRadius;
            const minZ = box.min.z - playerRadius;
            const maxZ = box.max.z + playerRadius;
            
            const minY = box.min.y;
            const maxY = box.max.y;
            
            const playerFeetY = pos.y;
            const playerHeadY = pos.y + playerHeight;
            
            const overlapX = localPoint.x >= minX && localPoint.x <= maxX;
            const overlapZ = localPoint.z >= minZ && localPoint.z <= maxZ;
            const overlapY = playerHeadY >= minY && playerFeetY <= maxY;
            
            if (overlapX && overlapY && overlapZ) {
                return true;
            }
        }
    }
    
    // 2. Check NPC collisions
    for (let i = 0; i < npcs.length; i++) {
        const npc = npcs[i];
        if (!npc) continue;
        
        const npcWorldPos = new THREE.Vector3();
        npc.getWorldPosition(npcWorldPos);
        
        const dx = pos.x - npcWorldPos.x;
        const dz = pos.z - npcWorldPos.z;
        const dist = Math.sqrt(dx * dx + dz * dz);
        
        const npcRadius = 0.5;
        if (dist < npcRadius + playerRadius) {
            const minY = npcWorldPos.y;
            const maxY = npcWorldPos.y + 1.8;
            
            const playerFeetY = pos.y;
            const playerHeadY = pos.y + playerHeight;
            
            if (playerHeadY >= minY && playerFeetY <= maxY) {
                return true;
            }
        }
    }
    
    // 3. Check Farm Fence boundary collisions
    const farmX = -32;
    const farmZ = -10;
    const fenceHalfW = 6.0;
    const fenceHalfD = 4.0;
    const thickness = 0.2;
    
    const rails = [
        { minX: farmX - fenceHalfW, maxX: farmX + fenceHalfW, minZ: farmZ - fenceHalfD - thickness, maxZ: farmZ - fenceHalfD + thickness },
        { minX: farmX - fenceHalfW, maxX: farmX + fenceHalfW, minZ: farmZ + fenceHalfD - thickness, maxZ: farmZ + fenceHalfD + thickness },
        { minX: farmX - fenceHalfW - thickness, maxX: farmX - fenceHalfW + thickness, minZ: farmZ - fenceHalfD, maxZ: farmZ + fenceHalfD },
        { minX: farmX + fenceHalfW - thickness, maxX: farmX + fenceHalfW + thickness, minZ: farmZ - fenceHalfD, maxZ: farmZ + fenceHalfD }
    ];
    
    for (let r = 0; r < rails.length; r++) {
        const rail = rails[r];
        const overlapX = pos.x >= rail.minX - playerRadius && pos.x <= rail.maxX + playerRadius;
        const overlapZ = pos.z >= rail.minZ - playerRadius && pos.z <= rail.maxZ + playerRadius;
        const overlapY = (pos.y + playerHeight) >= 0 && pos.y <= 0.8;
        
        if (overlapX && overlapY && overlapZ) {
            return true;
        }
    }
    
    return false;
}

function movePlayerWithCollision(velocity) {
    const currentPos = player.position.clone();
    
    // Try moving X first
    const testPosX = currentPos.clone();
    testPosX.x += velocity.x;
    if (testPosX.length() < 165 && !checkCollision(testPosX)) {
        player.position.x = testPosX.x;
    }
    
    // Try moving Z next
    const testPosZ = player.position.clone();
    testPosZ.z += velocity.z;
    if (testPosZ.length() < 165 && !checkCollision(testPosZ)) {
        player.position.z = testPosZ.z;
    }
}


// ==========================================
// MAIN GAME LOOP & UPDATES
// ==========================================
function animate(time) {
    requestAnimationFrame(animate);

    // 첫 프레임에서 time이 undefined로 넘어오는 현상을 방어하기 위한 안전성 필터링 (블랙스크린의 핵심 근본 원인 해결)
    const safeTime = (typeof time === 'number' && !isNaN(time)) ? time : performance.now();

    updateMovement();
    updateCamera();
    updateAnimations(safeTime);
    updateWorldDynamics();
    checkNPCHover();

    renderer.render(scene, camera);
}

function updateMovement() {
    if (isTalking || isInventoryOpen) {
        isMoving = false;
        playerVelocity.set(0, 0, 0);

        // Apply gravity to keep player on ground even if talking/managing inventory
        const targetHeight = getTerrainHeight(player.position);
        playerVelocityY += gravity;
        player.position.y += playerVelocityY;

        if (player.position.y < targetHeight) {
            player.position.y = targetHeight;
            playerVelocityY = 0;
            playerOnGround = true;
        } else if (Math.abs(player.position.y - targetHeight) < 0.02) {
            player.position.y = targetHeight;
            playerOnGround = true;
        } else {
            playerOnGround = false;
        }
        return;
    }

    // 1. 구르기 물리 업데이트 (구르는 도중엔 조작키 입력 무시하고 고속 이동)
    if (isRolling) {
        rollTime += 16.67;
        const progress = rollTime / rollDuration;
        
        if (progress >= 1.0) {
            isRolling = false;
            playerVelocity.set(0, 0, 0);
        } else {
            // 사인파를 이용하여 부드러운 구르기 속도 가속/감속 보간
            const currentSpeed = playerSpeed * 2.3 * Math.sin(progress * Math.PI);
            playerVelocity.copy(rollDirection).multiplyScalar(currentSpeed);
            
            movePlayerWithCollision(playerVelocity);
            
            // 땅 지형 높이 추적
            const targetHeight = getTerrainHeight(player.position);
            player.position.y = targetHeight;
            playerVelocityY = 0;
            playerOnGround = true;
            return; // 다른 이동 처리 스킵
        }
    }

    // 2. 회피(백스텝) 물리 업데이트 (정점 감속 슬라이드)
    if (isDodging) {
        dodgeTime += 16.67;
        const progress = dodgeTime / dodgeDuration;
        
        if (progress >= 1.0) {
            isDodging = false;
            playerVelocity.set(0, 0, 0);
        } else {
            // 후반부로 갈수록 감속하는 공식 적용
            const currentSpeed = playerSpeed * 2.0 * (1.0 - progress);
            playerVelocity.copy(dodgeDirection).multiplyScalar(currentSpeed);
            
            movePlayerWithCollision(playerVelocity);
            
            const targetHeight = getTerrainHeight(player.position);
            player.position.y = targetHeight;
            playerVelocityY = 0;
            playerOnGround = true;
            return; // 다른 이동 처리 스킵
        }
    }

    isMoving = keys.w || keys.s || keys.a || keys.d;

    const moveDirection = new THREE.Vector3();

    // 1인칭 조작 반대 버그 수정 및 최적화
    const forwardVec = new THREE.Vector3(
        Math.sin(camYaw),
        0,
        Math.cos(camYaw)
    ).normalize();

    const rightVec = new THREE.Vector3(
        -Math.cos(camYaw),
        0,
        Math.sin(camYaw)
    ).normalize();

    if (keys.w) moveDirection.add(forwardVec);
    if (keys.s) moveDirection.add(forwardVec.clone().negate());
    if (keys.d) moveDirection.add(rightVec);
    if (keys.a) moveDirection.add(rightVec.clone().negate());

    if (moveDirection.lengthSq() > 0) {
        moveDirection.normalize();
        
        // 막기 상태일 때는 속도 50% 페널티, 달리기 시 160% 보너스 적용
        let currentSpeed = keys.shift ? playerSpeed * 1.6 : playerSpeed;
        if (isBlocking) {
            currentSpeed = playerSpeed * 0.5; // 방패 방어 속도 디버프
        }
        
        playerVelocity.copy(moveDirection).multiplyScalar(currentSpeed);
        
        movePlayerWithCollision(playerVelocity);
    } else {
        playerVelocity.set(0, 0, 0);
    }

    // --- 수직 물리학 (중력 및 점프) ---
    const targetHeight = getTerrainHeight(player.position);

    playerVelocityY += gravity;
    player.position.y += playerVelocityY;

    if (player.position.y < targetHeight) {
        const fallVelocity = playerVelocityY;
        player.position.y = targetHeight;
        playerVelocityY = 0;
        playerOnGround = true;

        // Apply falling damage if fall was hard (e.g. falling from roofs)
        // Adjusted to eliminate excessive damage: raised the velocity threshold and significantly reduced the damage multiplier.
        if (fallVelocity < -0.45) {
            const damage = Math.round(Math.abs(fallVelocity) * 20); // Multiplier reduced from 180 to 20
            playerStats.hp = Math.max(1, playerStats.hp - damage); // Leave at least 1 HP
            updateHUD();
            showPromptNotification(`<span style="color:#f56565">추락 피해로 체력이 ${damage} 감소했습니다!</span>`);
        }
    } else if (Math.abs(player.position.y - targetHeight) < 0.02) {
        player.position.y = targetHeight;
        playerOnGround = true;
    } else {
        playerOnGround = false;
    }

    // 무기 스왑 중이나 가드 중에는 점프 불가
    if (keys.space && playerOnGround && !isSheathing) {
        playerVelocityY = jumpStrength;
        playerOnGround = false;
    }
}

function updateCamera() {
    const eyeHeight = 1.7;

    const lookTarget = new THREE.Vector3(
        player.position.x + Math.sin(camYaw) * Math.cos(camPitch),
        player.position.y + eyeHeight + Math.sin(camPitch),
        player.position.z + Math.cos(camYaw) * Math.cos(camPitch)
    );

    let currentBobX = 0;
    let currentBobY = 0;

    if (isMoving && playerOnGround) {
        const animSpeed = keys.shift ? 14 : 9;
        walkCycle += animSpeed * 0.03;

        // 3인칭 상태에서는 카메라 바빙(흔들림) 비활성화
        if (!isThirdPerson) {
            currentBobX = Math.sin(walkCycle) * 0.04;
            currentBobY = Math.cos(walkCycle * 2) * 0.06;
        }
    } else {
        walkCycle = 0;
    }

    bobX += (currentBobX - bobX) * 0.15;
    bobY += (currentBobY - bobY) * 0.15;

    // 플레이어의 방향을 마우스 시선 좌우 회전(camYaw)과 동기화
    player.rotation.y = camYaw;

    if (isThirdPerson) {
        // 3인칭 카메라 오빗(Orbit) 제어
        const distance = 4.5; // 캐릭터와 카메라 간의 거리
        const heightOffset = 0.5; // 시점 확보를 위한 추가 높이 오프셋
        
        // 마우스 요(Yaw) 및 피치(Pitch) 기반으로 캐릭터 뒤쪽에 카메라 배치
        const camX = player.position.x - Math.sin(camYaw) * Math.cos(camPitch) * distance;
        let camY = player.position.y + eyeHeight - Math.sin(camPitch) * distance + heightOffset;
        const camZ = player.position.z - Math.cos(camYaw) * Math.cos(camPitch) * distance;
        
        // 카메라가 지형 밑으로 뚫고 내려가지 않도록 최저 높이 보정
        const terrainHeight = getTerrainHeight({ x: camX, y: camY, z: camZ });
        if (camY < terrainHeight + 0.3) {
            camY = terrainHeight + 0.3;
        }
        
        // [카메라 충돌 감지 및 벽 뚫기 방지]
        // 캐릭터 머리에서 이상적인 카메라 목적지까지 레이캐스팅 수행
        const headPos = new THREE.Vector3(player.position.x, player.position.y + eyeHeight, player.position.z);
        const idealCamPos = new THREE.Vector3(camX, camY, camZ);
        const camDir = new THREE.Vector3().subVectors(idealCamPos, headPos);
        const camDist = camDir.length();
        camDir.normalize();
        
        const camRaycaster = new THREE.Raycaster(headPos, camDir, 0.1, camDist);
        // 지면(collidableObjects[0])은 필터링하여 바닥 근처 오빗 시 미세 카메라 떨림 예방
        const camCollidables = collidableObjects.filter(obj => obj !== collidableObjects[0]);
        const intersects = camRaycaster.intersectObjects(camCollidables, true);
        
        if (intersects.length > 0) {
            // 장애물에 부딪혔을 경우, 충돌 지점 바로 앞까지만 카메라 끌어당기기
            const intersect = intersects[0];
            const collisionDist = intersect.distance - 0.2;
            const newCamPos = headPos.clone().add(camDir.multiplyScalar(collisionDist));
            camera.position.copy(newCamPos);
        } else {
            camera.position.set(camX, camY, camZ);
        }
        
        // 카메라가 캐릭터의 머리를 주시하게 함
        const target = new THREE.Vector3(
            player.position.x,
            player.position.y + eyeHeight,
            player.position.z
        );
        camera.lookAt(target);
    } else {
        // 기존 1인칭 카메라 배치
        const rightVec = new THREE.Vector3(
            -Math.cos(camYaw),
            0,
            Math.sin(camYaw)
        ).normalize();

        camera.position.set(
            player.position.x + (rightVec.x * bobX),
            player.position.y + eyeHeight + bobY,
            player.position.z + (rightVec.z * bobX)
        );

        camera.lookAt(lookTarget);
    }
}

function updateAnimations(time) {
    const t = time * 0.001;

    // --- [문 열기 (isOpeningDoor) 모션 애니메이션] ---
    if (isOpeningDoor) {
        doorOpenMotionTime += 16.67;
        const progress = doorOpenMotionTime / doorOpenMotionDuration;
        
        if (progress >= 1.0) {
            isOpeningDoor = false;
            fpSwordGroup.position.set(0, 0, 0);
            fpSwordGroup.rotation.set(0, 0, 0);
            if (rightArmGroup) rightArmGroup.rotation.set(0, 0, 0);
        } else {
            // Push hand/sword forward and then pull back (Sine wave)
            const push = Math.sin(progress * Math.PI);
            
            // First person push forward
            fpSwordGroup.position.set(-push * 0.1, push * 0.05, -push * 0.4); // Push forward along Z
            fpSwordGroup.rotation.set(push * 0.2, -push * 0.3, push * 0.1);
            
            // Third person arm push forward
            if (rightArmGroup && isThirdPerson) {
                rightArmGroup.rotation.x = -push * 1.2; // Stretch arm forward
                rightArmGroup.rotation.y = -push * 0.4;
            }
        }
        
        // Also allow leg movement if moving
        if (thirdPersonMesh && thirdPersonMesh.visible) {
            if (isMoving && playerOnGround) {
                leftLegGroup.rotation.x = Math.sin(walkCycle) * 0.5;
                rightLegGroup.rotation.x = -Math.sin(walkCycle) * 0.5;
                leftArmGroup.rotation.x = -Math.sin(walkCycle) * 0.3;
            } else {
                leftLegGroup.rotation.x *= 0.8;
                rightLegGroup.rotation.x *= 0.8;
                leftArmGroup.rotation.x *= 0.8;
            }
        }
        return; // Pause other upper body animations during door opening
    }

    // --- [무기 꺼내기/넣기 (isSheathing) 애니메이션 - 최우선] ---
    if (isSheathing) {
        sheatheTime += 16.67;
        const progress = sheatheTime / sheatheDuration;
        
        if (progress >= 1.0) {
            isSheathing = false;
            // 최종 가시성 상태 정밀 매칭
            if (tpSwordGroup) tpSwordGroup.visible = isWeaponDrawn && isThirdPerson;
            if (tpSheathedSwordGroup) tpSheathedSwordGroup.visible = !isWeaponDrawn && isThirdPerson;
            if (fpSwordGroup) fpSwordGroup.visible = isWeaponDrawn && !isThirdPerson;
            if (rightArmGroup) rightArmGroup.rotation.set(0, 0, 0);
        } else {
            // 오른손이 등 뒤 왼쪽(검집 배치 구역)으로 뻗어 검자루를 잡는 시퀀스
            if (rightArmGroup) {
                if (progress < 0.5) {
                    // 1단계: 등 뒤로 손 뻗기
                    const p = progress / 0.5;
                    rightArmGroup.rotation.x = -1.6 * p;
                    rightArmGroup.rotation.y = -0.6 * p;
                    rightArmGroup.rotation.z = -0.4 * p;
                } else {
                    // 딱 0.5가 되는 타이밍에 3D 모델(손에 든 검 ↔ 등 뒤 검) 실시간 스위칭
                    if (progress - 16.67/sheatheDuration < 0.5) {
                        if (tpSwordGroup) tpSwordGroup.visible = isWeaponDrawn && isThirdPerson;
                        if (tpSheathedSwordGroup) tpSheathedSwordGroup.visible = !isWeaponDrawn && isThirdPerson;
                        if (fpSwordGroup) fpSwordGroup.visible = isWeaponDrawn && !isThirdPerson;
                    }
                    // 2단계: 팔을 다시 정면 대기 위치로 가져오기
                    const p = (progress - 0.5) / 0.5;
                    rightArmGroup.rotation.x = -1.6 * (1.0 - p);
                    rightArmGroup.rotation.y = -0.6 * (1.0 - p);
                    rightArmGroup.rotation.z = -0.4 * (1.0 - p);
                }
            }
        }
        
        // 칼 꺼내기 중에도 움직이고 있다면 발걸음 애니메이션은 허용
        if (thirdPersonMesh && thirdPersonMesh.visible) {
            if (isMoving && playerOnGround) {
                leftLegGroup.rotation.x = Math.sin(walkCycle) * 0.5;
                rightLegGroup.rotation.x = -Math.sin(walkCycle) * 0.5;
                leftArmGroup.rotation.x = -Math.sin(walkCycle) * 0.3;
            } else {
                leftLegGroup.rotation.x *= 0.8;
                rightLegGroup.rotation.x *= 0.8;
                leftArmGroup.rotation.x *= 0.8;
            }
        }
        return; // 스왑 도중에는 상체 다른 액션 전면 중단
    }

    // --- [구르기 (isRolling) 애니메이션 - 최상위 전신 운동] ---
    if (isRolling) {
        const progress = rollTime / rollDuration;
        
        if (!isThirdPerson) {
            // 1인칭 구르기: 부드러운 다이빙 카메라 상하 오르내림 구현
            camera.position.y += -Math.sin(progress * Math.PI) * 0.45;
        } else if (thirdPersonMesh && thirdPersonMesh.visible) {
            // 전신 캐릭터 메시를 피치(X축) 방향으로 360도 전방 앞돌기 회전 유도
            thirdPersonMesh.rotation.x = progress * Math.PI * 2;
            
            // 몸을 바닥에 가깝게 낮춤으로써 다이내믹한 덤블링 볼륨 형성
            thirdPersonMesh.position.y = -Math.sin(progress * Math.PI) * 0.45;
            
            // 팔다리를 동그랗게 몸 안쪽으로 웅크려 원형 체공 포즈 구축
            leftLegGroup.rotation.x = -1.2;
            rightLegGroup.rotation.x = -1.2;
            leftArmGroup.rotation.x = -1.2;
            rightArmGroup.rotation.x = -1.2;
            leftArmGroup.rotation.z = -0.3;
            rightArmGroup.rotation.z = 0.3;
        }
        
        if (progress >= 1.0) {
            if (thirdPersonMesh) {
                thirdPersonMesh.rotation.x = 0;
                thirdPersonMesh.position.y = 0;
            }
        }
        return;
    }

    // --- [회피 (isDodging) 애니메이션 - 백스텝 슬라이딩] ---
    if (isDodging) {
        const progress = dodgeTime / dodgeDuration;
        
        if (!isThirdPerson) {
            // 1인칭 회피: 카메라가 뒤쪽으로 튕기는 반동 연출
            camera.position.z += Math.sin(progress * Math.PI) * 0.08;
        } else if (thirdPersonMesh && thirdPersonMesh.visible) {
            // 몸 전체를 뒤쪽으로 역동적으로 기울임
            thirdPersonMesh.rotation.x = -0.22 * Math.sin(progress * Math.PI);
            
            // 팔을 어깨 높이로 들어 균형 유지 및 가드 세우기
            leftArmGroup.rotation.x = 0.5;
            rightArmGroup.rotation.x = 0.5;
            leftArmGroup.rotation.z = -0.4;
            rightArmGroup.rotation.z = 0.4;
            
            // 왼쪽/오른쪽 다리가 교차하며 버티는 디펜시브 스탠스
            leftLegGroup.rotation.x = -0.4 * Math.sin(progress * Math.PI);
            rightLegGroup.rotation.x = 0.4 * Math.sin(progress * Math.PI);
        }
        
        if (progress >= 1.0) {
            if (thirdPersonMesh) {
                thirdPersonMesh.rotation.x = 0;
                thirdPersonMesh.position.y = 0;
                leftArmGroup.rotation.set(0, 0, 0);
                rightArmGroup.rotation.set(0, 0, 0);
            }
        }
        return;
    }

    // --- [공격 (isAttacking) 애니메이션 - 휘두르기 및 찌르기 분기] ---
    if (isAttacking) {
        attackTime += 16.67;
        const progress = attackTime / attackDuration;

        if (progress >= 1.0) {
            isAttacking = false;
            // 완전히 끝났을 때 원상 복원
            fpSwordGroup.position.set(0, 0, 0);
            fpSwordGroup.rotation.set(0, 0, 0);
            if (rightArmGroup) rightArmGroup.rotation.set(0, 0, 0);
            if (tpSwordGroup) tpSwordGroup.rotation.set(-1.4, 0.2, 0.5);
        } else {
            if (attackType === 'swing') {
                // [기존의 찰진 횡베기(Swing) 연출]
                if (progress < 0.20) {
                    const p = progress / 0.20;
                    fpSwordGroup.position.set(p * 0.12, p * 0.06, -p * 0.06);
                    fpSwordGroup.rotation.set(-p * 0.2, -p * 0.3, p * 0.15);
                    if (rightArmGroup) {
                        rightArmGroup.rotation.x = -p * 1.0;
                        rightArmGroup.rotation.y = p * 0.5;
                    }
                } else if (progress < 0.65) {
                    const p = (progress - 0.20) / 0.45;
                    fpSwordGroup.position.x = 0.12 - p * 0.58; 
                    fpSwordGroup.position.y = 0.06 - p * 0.28; 
                    fpSwordGroup.position.z = -0.06 + p * 0.08;
                    fpSwordGroup.rotation.set(-0.2 + p * 1.4, -0.3 + p * 1.6, 0.15 - p * 1.8);
                    if (rightArmGroup) {
                        rightArmGroup.rotation.x = -1.0 + p * 2.2;
                        rightArmGroup.rotation.y = 0.5 - p * 1.2;
                        rightArmGroup.rotation.z = -p * 0.8;
                    }
                } else {
                    const p = (progress - 0.65) / 0.35;
                    fpSwordGroup.position.x = -0.46 + p * 0.46;
                    fpSwordGroup.position.y = -0.22 + p * 0.22;
                    fpSwordGroup.position.z = 0.02 - p * 0.02;
                    fpSwordGroup.rotation.set(1.2 - p * 1.2, 1.3 - p * 1.3, -1.65 + p * 1.65);
                    if (rightArmGroup) {
                        rightArmGroup.rotation.x = 1.2 * (1 - p);
                        rightArmGroup.rotation.y = -0.7 * (1 - p);
                        rightArmGroup.rotation.z = -0.8 * (1 - p);
                    }
                }
            } else if (attackType === 'stab') {
                // [신규 명품 정밀 찌르기(Thrust) 연출]
                if (progress < 0.25) {
                    // 1단계: 선딜레이 (검을 가슴 밀착 뒤로 확 잡아끄는 충전 자세)
                    const p = progress / 0.25;
                    fpSwordGroup.position.set(p * 0.08, -p * 0.12, -p * 0.1);
                    fpSwordGroup.rotation.set(p * 0.1, -p * 0.7, -p * 0.25);
                    if (rightArmGroup) {
                        rightArmGroup.rotation.x = 0.1;
                        rightArmGroup.rotation.y = -p * 0.65;
                        rightArmGroup.rotation.z = p * 0.25;
                    }
                } else if (progress < 0.65) {
                    // 2단계: 쾌속 돌파 찌르기 (중심을 향해 검날을 최대로 사출)
                    const p = (progress - 0.25) / 0.40;
                    fpSwordGroup.position.set(0.08 - p * 0.04, -0.12 + p * 0.15, -0.1 - p * 0.58);
                    fpSwordGroup.rotation.set(0.1 - p * 0.05, -0.7 + p * 0.85, -0.25 + p * 0.2);
                    if (rightArmGroup) {
                        rightArmGroup.rotation.x = 0.1 - p * 1.65; // 팔을 총구 모양으로 직진 신장
                        rightArmGroup.rotation.y = -0.65 + p * 0.9;
                        rightArmGroup.rotation.z = 0.25 - p * 0.12;
                    }
                    if (tpSwordGroup) {
                        tpSwordGroup.rotation.set(-1.4 - p * 0.25, 0.2, 0.5 - p * 0.15);
                    }
                } else {
                    // 3단계: 찌르기 후 원위치 회수
                    const p = (progress - 0.65) / 0.35;
                    fpSwordGroup.position.set(0.04 * (1 - p), 0.03 * (1 - p), -0.68 + p * 0.68);
                    fpSwordGroup.rotation.set(0.05 * (1 - p), 0.15 * (1 - p), -0.05 * (1 - p));
                    if (rightArmGroup) {
                        rightArmGroup.rotation.x = -1.55 * (1 - p);
                        rightArmGroup.rotation.y = 0.25 * (1 - p);
                        rightArmGroup.rotation.z = 0.13 * (1 - p);
                    }
                    if (tpSwordGroup) {
                        tpSwordGroup.rotation.set(-1.65 + p * 0.25, 0.2, 0.35 + p * 0.15);
                    }
                }
            }
            
            // 3인칭 하체는 공격 애니메이팅 중에도 지면 걷기 모션을 보간 재생
            if (thirdPersonMesh && thirdPersonMesh.visible) {
                thirdPersonMesh.rotation.y = 0; // Twisted torso reset
                if (isMoving && playerOnGround) {
                    leftLegGroup.rotation.x = Math.sin(walkCycle) * 0.5;
                    rightLegGroup.rotation.x = -Math.sin(walkCycle) * 0.5;
                    leftArmGroup.rotation.x = -Math.sin(walkCycle) * 0.3;
                } else {
                    leftLegGroup.rotation.x *= 0.8;
                    rightLegGroup.rotation.x *= 0.8;
                    leftArmGroup.rotation.x *= 0.8;
                }
            }
            return;
        }
    }

    // --- [막기/방어 (isBlocking) 애니메이션 - 견고한 무장 스탠스] ---
    if (isBlocking) {
        // 1인칭 가드: 검을 눈높이에 완벽한 수평 보호 장벽으로 배치
        fpSwordGroup.position.set(-0.16, 0.09, -0.16);
        fpSwordGroup.rotation.set(0.12, 0.95, 0.65);
        
        // 3인칭 검 가드 모션
        if (thirdPersonMesh && thirdPersonMesh.visible) {
            // 상체를 대각선 사선으로 돌려 적에게 노출되는 면적 방어 극대화
            thirdPersonMesh.rotation.y = 0.35; 
            
            // 왼쪽 방어 보조 팔 배치
            leftArmGroup.rotation.set(-0.4, 0.1, -0.2); 
            
            // 오른쪽 전투 팔: 칼자루를 가슴 앞으로 가로질러 들어 올리는 명품 수호 가드폼
            rightArmGroup.rotation.set(-1.05, -0.65, 0.38);
            if (tpSwordGroup) {
                tpSwordGroup.rotation.set(-0.55, 1.05, -0.85);
            }
            
            // 가드 도중 걷기 재생 시, 엄숙하고 느린 속도로 피치 절반 감속 보간
            if (isMoving && playerOnGround) {
                leftLegGroup.rotation.x = Math.sin(walkCycle * 0.7) * 0.3;
                rightLegGroup.rotation.x = -Math.sin(walkCycle * 0.7) * 0.3;
            } else {
                leftLegGroup.rotation.x *= 0.8;
                rightLegGroup.rotation.x *= 0.8;
            }
        }
        return; // 가드 동작 유지 중에는 대기/숨쉬기 애니메이션 중첩 회피
    }

    // --- [기존 대기 및 걷기/달리기 통합 애니메이션 리셋 및 업데이트] ---
    if (thirdPersonMesh) {
        thirdPersonMesh.rotation.y = 0; // 가드/공격 자세 등 뒤틀린 각도 원복
    }

    if (isMoving && playerOnGround) {
        const bobMultiplier = keys.shift ? 1.4 : 1.0;
        
        fpSwordGroup.position.y = Math.sin(walkCycle * 2) * 0.015 * bobMultiplier;
        fpSwordGroup.position.x = Math.cos(walkCycle) * 0.01 * bobMultiplier;
        
        fpSwordGroup.rotation.z = Math.sin(walkCycle) * 0.03;
        fpSwordGroup.rotation.y = Math.cos(walkCycle) * 0.01;
        
        // 3인칭 캐릭터 모델 발걸음 및 질주 가동
        if (thirdPersonMesh && thirdPersonMesh.visible) {
            const speedFactor = keys.shift ? 1.4 : 1.0;
            // 달리기 시에는 바람의 저항을 이겨내듯이 상체를 앞으로 기울여 질주감 향상
            thirdPersonMesh.rotation.x = keys.shift ? 0.16 : 0;
            
            leftLegGroup.rotation.x = Math.sin(walkCycle) * 0.52 * speedFactor;
            rightLegGroup.rotation.x = -Math.sin(walkCycle) * 0.52 * speedFactor;
            leftArmGroup.rotation.x = -Math.sin(walkCycle) * 0.42 * speedFactor;
            rightArmGroup.rotation.x = Math.sin(walkCycle) * 0.42 * speedFactor;
            
            // 달리기 도중 어깨 넓이 및 고관절 뒤틀림 정화
            leftArmGroup.rotation.z = -0.1 * speedFactor;
            rightArmGroup.rotation.z = 0.1 * speedFactor;
            leftLegGroup.rotation.y = 0;
            rightLegGroup.rotation.y = 0;
            leftArmGroup.rotation.y = 0;
            rightArmGroup.rotation.y = 0;
        }
    } else if (!playerOnGround) {
        fpSwordGroup.position.y = -0.05;
        fpSwordGroup.position.x = 0.01;
        fpSwordGroup.rotation.z = -0.05;
        
        // 3인칭 공중 체공 포즈 (무릎을 구부려 스카이림의 리얼 체공 느낌 구현)
        if (thirdPersonMesh && thirdPersonMesh.visible) {
            thirdPersonMesh.rotation.x = 0;
            leftLegGroup.rotation.x = -0.28;
            rightLegGroup.rotation.x = -0.28;
            leftArmGroup.rotation.x = -0.36;
            rightArmGroup.rotation.x = -0.36;
            leftArmGroup.rotation.z = -0.26;
            rightArmGroup.rotation.z = 0.26;
        }
    } else {
        fpSwordGroup.position.y = Math.sin(t * 1.5) * 0.003;
        fpSwordGroup.position.x = Math.cos(t * 0.75) * 0.0015;
        
        fpSwordGroup.rotation.z *= 0.9;
        fpSwordGroup.rotation.y *= 0.9;
        
        // 3인칭 평화 대기 호흡 (Idle Breathing) 연산
        if (thirdPersonMesh && thirdPersonMesh.visible) {
            thirdPersonMesh.rotation.x = 0;
            leftLegGroup.rotation.x *= 0.8;
            rightLegGroup.rotation.x *= 0.8;
            
            // 부드러운 가슴 들썩임 호흡
            leftArmGroup.rotation.x = Math.sin(t * 1.5) * 0.03;
            rightArmGroup.rotation.x = Math.sin(t * 1.5) * 0.03;
            leftArmGroup.rotation.z = Math.sin(t * 0.75) * 0.01 - 0.06;
            rightArmGroup.rotation.z = -Math.sin(t * 0.75) * 0.01 + 0.06;
            
            leftLegGroup.rotation.y *= 0.8;
            rightLegGroup.rotation.y *= 0.8;
            leftArmGroup.rotation.y *= 0.8;
            rightArmGroup.rotation.y *= 0.8;
        }
    }
}

let smokeTimer = 0;
function updateWorldDynamics() {
    const t = Date.now() * 0.001;

    // 1. 대장간 화로 불씨 펄스 연출
    glowingEmbers.forEach(e => {
        const pulse = 1.0 + Math.sin(t * 4) * 0.25;
        e.light.intensity = 3.5 * pulse;
        e.mesh.scale.set(pulse, pulse, pulse);
    });

    // 2. 가구 굴뚝들의 몽환적인 모락모락 연기 소환
    smokeTimer++;
    if (smokeTimer % 15 === 0) {
        scene.children.forEach(child => {
            if (child.userData && child.userData.chimneyLocalPos) {
                const localPos = child.userData.chimneyLocalPos.clone();
                const worldPos = localPos.applyMatrix4(child.matrixWorld);
                
                const smokeGeo = new THREE.SphereGeometry(0.3 + Math.random() * 0.2, 5, 5);
                const smokeMat = new THREE.MeshBasicMaterial({
                    color: 0xcccccc,
                    transparent: true,
                    opacity: 0.22,
                    depthWrite: false
                });
                const smoke = new THREE.Mesh(smokeGeo, smokeMat);
                smoke.position.copy(worldPos);
                
                smoke.userData = {
                    vx: (Math.random() - 0.5) * 0.03,
                    vy: 0.04 + Math.random() * 0.03,
                    vz: (Math.random() - 0.5) * 0.03 - 0.02,
                    life: 0,
                    maxLife: 90 + Math.random() * 60
                };
                
                scene.add(smoke);
                smokeParticles.push(smoke);
            }
        });
    }

    // 3. 연기 파티클 움직임 연산 및 수명 관리
    for (let i = smokeParticles.length - 1; i >= 0; i--) {
        const p = smokeParticles[i];
        p.position.x += p.userData.vx;
        p.position.y += p.userData.vy;
        p.position.z += p.userData.vz;
        p.userData.life++;
        
        p.scale.multiplyScalar(1.01);
        p.material.opacity = 0.22 * (1.0 - p.userData.life / p.userData.maxLife);
        
        if (p.userData.life >= p.userData.maxLife) {
            scene.remove(p);
            p.geometry.dispose();
            p.material.dispose();
            smokeParticles.splice(i, 1);
        }
    }

    // 4. 구름 유유자적 이동 업데이트 (낮 가동)
    movingClouds.forEach(c => {
        c.position.x += c.userData.speed;
        // 구름이 맵 경계선(180)을 넘어가면 다시 반대편(-180)에서 무작위 리젠하여 유한 순환 구축
        if (c.position.x > 180) {
            c.position.x = -180;
            c.position.z = (Math.random() - 0.5) * 280;
        }
    });

    // 5. 3D Collectible Items floating/rotating and automatic pickup (like Minecraft)
    for (let i = collectibleItems.length - 1; i >= 0; i--) {
        const item = collectibleItems[i];
        if (!item || !item.mesh) continue;

        // Spin slowly
        item.mesh.rotation.y += 0.025;
        // Floating motion
        const bob = Math.sin(Date.now() * 0.003 + item.mesh.position.x * 2) * 0.08;
        if (!item.initialY) {
            item.initialY = item.mesh.position.y;
        }
        item.mesh.position.y = item.initialY + bob;

        // Minecraft-style auto-pickup when player gets close (within 2.2 units)
        const distance = player.position.distanceTo(item.mesh.position);
        if (distance < 2.2) {
            if (item.canPickupAfter && Date.now() < item.canPickupAfter) {
                continue;
            }
            pickUpItem(item);
        }
    }

    // 6. Shaking trees (Wobble effect)
    scene.children.forEach(child => {
        if (child && child.userData && child.userData.shake > 0) {
            child.userData.shake -= 0.05;
            if (child.userData.shake < 0) child.userData.shake = 0;
            const sVal = child.userData.shake;
            child.rotation.z = Math.sin(Date.now() * 0.08) * 0.05 * sVal;
            child.rotation.x = Math.cos(Date.now() * 0.08) * 0.05 * sVal;
        }
    });

    // 7. Wood chip particles update
    for (let i = woodParticles.length - 1; i >= 0; i--) {
        const p = woodParticles[i];
        if (!p) continue;
        p.position.x += p.userData.vx;
        p.position.y += p.userData.vy;
        p.position.z += p.userData.vz;
        p.userData.vy -= 0.008; // gravity
        p.userData.life -= 0.035; // fade out
        p.scale.set(p.userData.life, p.userData.life, p.userData.life);
        if (p.userData.life <= 0) {
            scene.remove(p);
            p.geometry.dispose();
            p.material.dispose();
            woodParticles.splice(i, 1);
        }
    }

    // 8. Regrowing trees and smooth scale-up
    scene.children.forEach(child => {
        if (!child) return;
        let trunk = null;
        child.traverse(c => {
            if (c && c.userData && c.userData.isTree) {
                trunk = c;
            }
        });

        if (trunk) {
            const cooldownEnd = trunk.userData.cooldownEnd;
            const originalY = child.userData.originalScaleY || 1.0;
            
            if (cooldownEnd) {
                if (Date.now() >= cooldownEnd) {
                    // Cooldown ended! Start regrowing scaling up
                    delete trunk.userData.cooldownEnd;
                    trunk.userData.hitsRemaining = 3;
                    trunk.userData.isRegrowingNow = true;
                    showPromptNotification(`<span style="color:#48bb78; font-weight:bold;">나무가 다시 자라나기 시작합니다!</span>`);
                } else {
                    // Keep at stump size
                    child.scale.y = 0.1;
                }
            } else if (trunk.userData.isRegrowingNow) {
                // Smoothly scale Y up to original
                child.scale.y += (originalY - child.scale.y) * 0.05;
                if (Math.abs(child.scale.y - originalY) < 0.01) {
                    child.scale.y = originalY;
                    delete trunk.userData.isRegrowingNow;
                }
            }
        }
    });
}

function onWindowResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
}

// 3인칭 및 1인칭 시점 토글 함수
function togglePerspective() {
    isThirdPerson = !isThirdPerson;
    
    // 3인칭 캐릭터 모델 가시성 설정
    if (thirdPersonMesh) {
        thirdPersonMesh.visible = isThirdPerson;
    }
    
    // 검 가시성 최종 실시간 동기화
    if (tpSwordGroup) {
        tpSwordGroup.visible = isThirdPerson && isWeaponDrawn;
    }
    if (tpSheathedSwordGroup) {
        tpSheathedSwordGroup.visible = isThirdPerson && !isWeaponDrawn;
    }
    if (fpSwordGroup) {
        fpSwordGroup.visible = !isThirdPerson && isWeaponDrawn;
    }
    
    // 크로스헤어 UI 토글 (3인칭일 때는 숨겨서 몰입감과 영화 같은 뷰 제공)
    const crosshair = document.querySelector('.crosshair');
    if (crosshair) {
        crosshair.style.display = isThirdPerson ? 'none' : 'block';
    }
}


// ==========================================
// NPC & DIALOGUE SYSTEM IMPLEMENTATION
// ==========================================

function createNPC(name, clothesColor, skinColor, position, dialogues, rotationY = 0, npcType = 'villager') {
    const npcGroup = new THREE.Group();
    npcGroup.position.copy(position);
    npcGroup.rotation.y = rotationY;
    
    // 1. Torso/Body (Tunic / Outerwear)
    const bodyGeo = new THREE.CylinderGeometry(0.3, 0.4, 1.2, 8);
    const bodyMat = new THREE.MeshStandardMaterial({ color: clothesColor, roughness: 0.8 });
    const body = new THREE.Mesh(bodyGeo, bodyMat);
    body.position.y = 0.6;
    body.castShadow = true;
    body.receiveShadow = true;
    npcGroup.add(body);
    
    // 2. Head
    const headGeo = new THREE.SphereGeometry(0.22, 8, 8);
    const headMat = new THREE.MeshStandardMaterial({ color: skinColor, roughness: 0.65 });
    const head = new THREE.Mesh(headGeo, headMat);
    head.position.y = 1.35;
    head.castShadow = true;
    npcGroup.add(head);
    
    // 3. Hands / Arms
    const armGeo = new THREE.CylinderGeometry(0.08, 0.08, 0.7, 6);
    const armMat = new THREE.MeshStandardMaterial({ color: clothesColor, roughness: 0.8 });
    
    // Left Arm
    const leftArm = new THREE.Mesh(armGeo, armMat);
    leftArm.position.set(-0.45, 0.8, 0);
    leftArm.rotation.z = 0.12;
    leftArm.castShadow = true;
    npcGroup.add(leftArm);
    
    // Right Arm
    const rightArm = new THREE.Mesh(armGeo, armMat);
    rightArm.position.set(0.45, 0.8, 0);
    rightArm.rotation.z = -0.12;
    rightArm.castShadow = true;
    npcGroup.add(rightArm);

    // Specialized accessories for immersion
    if (npcType === 'farmer') {
        // Straw Hat (Cone Straw Hat)
        const hatGeo = new THREE.ConeGeometry(0.4, 0.18, 8);
        const hatMat = new THREE.MeshStandardMaterial({ color: 0xd2b48c, roughness: 0.9 }); // Straw brown
        const hat = new THREE.Mesh(hatGeo, hatMat);
        hat.position.y = 1.52;
        hat.rotation.x = 0.05;
        hat.castShadow = true;
        npcGroup.add(hat);
    } else if (npcType === 'blacksmith') {
        // Apron
        const apronGeo = new THREE.BoxGeometry(0.38, 0.8, 0.1);
        const apronMat = new THREE.MeshStandardMaterial({ color: 0x5c4033, roughness: 0.95 }); // Leather
        const apron = new THREE.Mesh(apronGeo, apronMat);
        apron.position.set(0, 0.55, 0.36);
        apron.castShadow = true;
        npcGroup.add(apron);
        
        // Dark Hair/Bandana
        const hairGeo = new THREE.BoxGeometry(0.24, 0.12, 0.24);
        const hairMat = new THREE.MeshStandardMaterial({ color: 0x111111, roughness: 0.8 });
        const hair = new THREE.Mesh(hairGeo, hairMat);
        hair.position.set(0, 1.5, -0.02);
        hair.castShadow = true;
        npcGroup.add(hair);
    } else {
        // Standard villager hairstyle
        const hairGeo = new THREE.BoxGeometry(0.24, 0.15, 0.24);
        const hairMat = new THREE.MeshStandardMaterial({ color: 0x5c3a21, roughness: 0.85 }); // Dark brown
        const hair = new THREE.Mesh(hairGeo, hairMat);
        hair.position.set(0, 1.48, -0.02);
        hair.castShadow = true;
        npcGroup.add(hair);
    }
    
    scene.add(npcGroup);
    
    // Register metadata and push to npcs list
    npcGroup.userData = {
        isNPC: true,
        name: name,
        dialogues: dialogues,
        npcType: npcType
    };
    
    npcs.push(npcGroup);
    return npcGroup;
}

function createFarm(px, pz) {
    const farmGroup = new THREE.Group();
    farmGroup.position.set(px, 0.01, pz);
    
    // Soil Patch (흙 바닥)
    const soilGeo = new THREE.BoxGeometry(12, 0.15, 8);
    const soilMat = new THREE.MeshStandardMaterial({ color: 0x5c4033, roughness: 0.95 });
    const soil = new THREE.Mesh(soilGeo, soilMat);
    soil.position.y = 0.075;
    soil.receiveShadow = true;
    soil.castShadow = true;
    farmGroup.add(soil);
    collidableObjects.push(soil);
    
    // Crops (작물들)
    const cropColors = [0x2e8b57, 0xadff2f, 0x8fbc8f]; 
    const cropMat1 = new THREE.MeshStandardMaterial({ color: cropColors[0], roughness: 0.9, flatShading: true });
    const cropMat2 = new THREE.MeshStandardMaterial({ color: cropColors[1], roughness: 0.9, flatShading: true });
    const cropMat3 = new THREE.MeshStandardMaterial({ color: cropColors[2], roughness: 0.9, flatShading: true });
    const cropMats = [cropMat1, cropMat2, cropMat3];
    
    // 3 rows of crops
    for (let row = -1; row <= 1; row++) {
        const rowZ = row * 2.2;
        for (let col = -3; col <= 3; col++) {
            const colX = col * 1.5;
            
            const cropHeight = 0.18 + Math.random() * 0.12;
            const cropGeo = new THREE.DodecahedronGeometry(cropHeight, 0);
            const mat = cropMats[Math.abs(row + col) % 3];
            const crop = new THREE.Mesh(cropGeo, mat);
            
            crop.position.set(colX, 0.15 + cropHeight/2, rowZ);
            crop.castShadow = true;
            crop.receiveShadow = true;
            farmGroup.add(crop);
        }
    }
    
    // Wooden fence posts & rails
    const fenceMat = new THREE.MeshStandardMaterial({ color: 0x3d2b1f, roughness: 0.9 });
    const fenceHeight = 0.8;
    const postGeo = new THREE.BoxGeometry(0.15, fenceHeight, 0.15);
    
    const corners = [
        {x: -6, z: -4}, {x: 6, z: -4}, {x: -6, z: 4}, {x: 6, z: 4},
        {x: 0, z: -4}, {x: 0, z: 4}, {x: -6, z: 0}, {x: 6, z: 0}
    ];
    
    corners.forEach(c => {
        const post = new THREE.Mesh(postGeo, fenceMat);
        post.position.set(c.x, fenceHeight/2, c.z);
        post.castShadow = true;
        farmGroup.add(post);
    });
    
    const railGeoX = new THREE.BoxGeometry(12, 0.08, 0.08);
    const railGeoZ = new THREE.BoxGeometry(0.08, 0.08, 8);
    
    for (let side = -1; side <= 1; side += 2) {
        const railX = new THREE.Mesh(railGeoX, fenceMat);
        railX.position.set(0, fenceHeight * 0.7, side * 4);
        railX.castShadow = true;
        farmGroup.add(railX);
        
        const railZ = new THREE.Mesh(railGeoZ, fenceMat);
        railZ.position.set(side * 6, fenceHeight * 0.7, 0);
        railZ.castShadow = true;
        farmGroup.add(railZ);
    }
    
    scene.add(farmGroup);
}

function createFarmAndNPCs() {
    // 1. Create Farm next to 3rd house (house index 2: x: -20, z: -15, rot: 0.4)
    createFarm(-32, -10);

    // 2. Spawn NPC - Farmer Fredrick next to the farm
    createNPC(
        "농부 프레드릭", 
        0x8b5a2b, // Brown clothes
        0xffd8b3, // Beige skin
        new THREE.Vector3(-28, 0, -10), 
        [
            "휴, 오늘도 해가 아주 쨍쨍하군요! 좋은 하루입니다, 모험가님.",
            "저는 이 밭을 가꾸고 있는 농부 프레드릭이라고 합니다. 이 싱싱한 채소들을 기르고 있지요.",
            "강가에서 불어오는 맑은 바람 덕분에 올해도 풍년이 될 것 같습니다.",
            "열심히 땀 흘려 가꾼 채소들은 참 맛있답니다. 배가 고프시면 하나 가져가셔도 좋습니다!"
        ],
        Math.PI / 2, 
        "farmer"
    );

    // 3. Spawn NPC - Blacksmith Alvor (Next to blacksmith anvil)
    createNPC(
        "대장장이 알보어",
        0xb22222, // Dark red tunic
        0xffd8b3, // Beige skin
        new THREE.Vector3(-25, 0, 86),
        [
            "오, 자네로군! 리버우드에 온 걸 환영하네. 나는 이 마을의 대장장이 알보어라고 하네.",
            "내 대장간 화로가 아주 뜨겁지? 항상 최고의 무기와 방어구를 단련하고 있다네.",
            "최근 근처 숲에서 흉폭한 늑대들과 괴생명체들이 나타난다는 소문이 돌고 있으니, 조심하게나.",
            "혹시 쓸만한 칼이 필요하다면 언제든 내 대장간을 찾아오게!"
        ],
        -Math.PI / 4, 
        "blacksmith"
    );

    // 4. Spawn NPC - Elder Gerdur (Next to central Autumn tree)
    createNPC(
        "촌장 거더", 
        0x2e8b57, // Forest green clothes
        0xffe4e1, // Misty rose skin
        new THREE.Vector3(-9, 0, 13), 
        [
            "어서 오세요, 젊은 여행자여. 나는 이 평화로운 마을 리버우드의 이장을 맡고 있는 거더입니다.",
            "이 중앙의 황금빛 단풍나무는 우리 마을의 상징이자 수호신 같은 존재지요.",
            "요즘 강 건너편의 바람소리가 심상치 않고, 숲속 깊은 곳에서 정체불명의 빛이 감돈다는 보고가 들려옵니다.",
            "마을을 둘러보시며 곤란에 처한 이들이 없는지 살펴봐 주시겠습니까? 부디 안전에 유의하십시오."
        ],
        Math.PI / 1.5, 
        "villager"
    );

    // 5. Spawn NPC - Villager Elina (Inside Village House 3 at 16, 0, -60)
    createNPC(
        "주민 엘리나", 
        0xda70d6, // Orchid dress
        0xffd8b3, // Beige skin
        new THREE.Vector3(16.6, 0, -61.9), 
        [
            "어머, 문을 열고 제 집으로 들어오셨군요! 반가워요, 여행자님.",
            "리버우드는 참 조용하고 평화로운 곳이랍니다.",
            "혹시 집이 마음에 드시나요? 침대에서 편히 쉬어가셔도 좋아요."
        ],
        Math.PI - 0.3, 
        "villager"
    );
}

function checkNPCHover() {
    const promptEl = document.getElementById('interaction-prompt');
    if (!isPointerLocked || isTalking || isInventoryOpen) {
        if (promptEl) promptEl.classList.add('hidden');
        hoveredNPC = null;
        hoveredItem = null;
        hoveredDoor = null;
        return;
    }
    
    raycaster.setFromCamera(new THREE.Vector2(0, 0), camera);
    
    // 1. NPC Collision Check
    const targetMeshes = [];
    npcs.forEach(npc => {
        npc.traverse(child => {
            if (child.isMesh) {
                targetMeshes.push(child);
            }
        });
    });
    
    const intersectsNPC = raycaster.intersectObjects(targetMeshes);
    
    if (intersectsNPC.length > 0) {
        const hitMesh = intersectsNPC[0].object;
        let foundNPC = null;
        
        let parent = hitMesh.parent;
        while (parent) {
            if (parent.userData && parent.userData.isNPC) {
                foundNPC = parent;
                break;
            }
            parent = parent.parent;
        }
        
        if (foundNPC) {
            const distance = player.position.distanceTo(foundNPC.position);
            if (distance < 9.0) { // 9 units range
                hoveredNPC = foundNPC;
                hoveredItem = null;
                if (promptEl) {
                    promptEl.innerHTML = '<span class="prompt-key">우클릭</span> 대화하기';
                    promptEl.classList.remove('hidden');
                }
                return;
            }
        }
    }
    
    hoveredNPC = null;

    // 2. Collectible Item Collision Check
    const itemMeshes = [];
    collectibleItems.forEach(item => {
        item.mesh.traverse(child => {
            if (child.isMesh) {
                // Attach a back-reference to item
                child.userData.parentItem = item;
                itemMeshes.push(child);
            }
        });
    });

    const intersectsItem = raycaster.intersectObjects(itemMeshes);

    if (intersectsItem.length > 0) {
        const hitMesh = intersectsItem[0].object;
        let item = hitMesh.userData.parentItem;
        if (item) {
            if (item.canPickupAfter && Date.now() < item.canPickupAfter) {
                hoveredItem = null;
            } else {
                const distance = player.position.distanceTo(item.mesh.position);
                if (distance < 6.0) { // 6 units pickup range
                    hoveredItem = item;
                    if (promptEl) {
                        promptEl.innerHTML = `<span class="prompt-key">E</span> 줍기: <span style="color:#f3e5ab">${item.name}</span>`;
                        promptEl.classList.remove('hidden');
                    }
                    return;
                }
            }
        }
    }

    hoveredItem = null;

    // 2.5 Door Collision Check (Interactive house doors)
    const doorMeshes = [];
    doors.forEach(door => {
        doorMeshes.push(door);
    });

    const intersectsDoor = raycaster.intersectObjects(doorMeshes);

    if (intersectsDoor.length > 0) {
        const hitMesh = intersectsDoor[0].object;
        let doorObj = hitMesh;
        while (doorObj && !doorObj.userData.isDoor) {
            doorObj = doorObj.parent;
        }
        if (doorObj) {
            doorObj.updateMatrixWorld(true);
            const doorWorldPos = new THREE.Vector3();
            doorObj.getWorldPosition(doorWorldPos);
            const distance = player.position.distanceTo(doorWorldPos);
            if (distance < 10.0) { // Increased interaction range to 10 units
                hoveredDoor = doorObj;
                hoveredNPC = null;
                hoveredItem = null;
                hoveredTree = null;
                if (promptEl) {
                    const actionText = doorObj.userData.isOpen ? "닫기" : "열기";
                    promptEl.innerHTML = `<span class="prompt-key">우클릭</span> 문 ${actionText} (<span style="color:#f3e5ab">${doorObj.userData.houseName}</span>)`;
                    promptEl.classList.remove('hidden');
                }
                return;
            }
        }
    }

    hoveredDoor = null;

    // 3. Tree Collision Check for Harvesting
    const treeMeshes = [];
    collidableObjects.forEach(obj => {
        if (obj && obj.userData && obj.userData.isTree) {
            treeMeshes.push(obj);
        }
    });

    const intersectsTree = raycaster.intersectObjects(treeMeshes);
    if (intersectsTree.length > 0) {
        const hitMesh = intersectsTree[0].object;
        const treeWorldPos = new THREE.Vector3();
        hitMesh.getWorldPosition(treeWorldPos);
        const distance = player.position.distanceTo(treeWorldPos);
        if (distance < 7.0) { // 7.0 units chop range
            const cooldownEnd = hitMesh.userData.cooldownEnd;
            const isRegrowing = cooldownEnd && Date.now() < cooldownEnd;
            
            if (isRegrowing) {
                const secondsLeft = Math.ceil((cooldownEnd - Date.now()) / 1000);
                if (promptEl) {
                    promptEl.innerHTML = `<span style="color:#a0aec0">자라나는 중... (${secondsLeft}초 남음)</span>`;
                    promptEl.classList.remove('hidden');
                }
                hoveredTree = null;
                return;
            } else {
                hoveredTree = hitMesh;
                if (promptEl) {
                    const hits = hitMesh.userData.hitsRemaining !== undefined ? hitMesh.userData.hitsRemaining : 3;
                    promptEl.innerHTML = `<span class="prompt-key">좌클릭</span> 벌목하기 (${hits}번 더 타격)`;
                    promptEl.classList.remove('hidden');
                }
                return;
            }
        }
    }

    hoveredTree = null;
    
    // Hide prompt only if there is no active notification timeout running
    if (!window.promptTimeout && promptEl) {
        promptEl.classList.add('hidden');
    }
}

function tryInteract() {
    if (hoveredNPC) {
        startDialogue(hoveredNPC);
    }
}

function toggleDoor(door) {
    door.userData.isOpen = !door.userData.isOpen;
    
    // Trigger player's hand/weapon push motion! (문을 여는 액션 모션 가동)
    isOpeningDoor = true;
    doorOpenMotionTime = 0;
    
    const actionText = door.userData.isOpen ? "열었습니다" : "닫았습니다";
    showPromptNotification(`<span style="color:#48bb78; font-weight:bold;">문을 ${actionText}! (${door.userData.houseName})</span>`);
}

function startDialogue(npc) {
    isTalking = true;
    currentNPC = npc;
    currentDialogIndex = 0;
    
    const promptEl = document.getElementById('interaction-prompt');
    if (promptEl) promptEl.classList.add('hidden');
    
    const boxEl = document.getElementById('dialogue-box');
    const nameEl = document.getElementById('dialogue-npc-name');
    const textEl = document.getElementById('dialogue-text');
    
    if (boxEl) boxEl.classList.remove('hidden');
    if (nameEl) nameEl.innerText = npc.userData.name;
    if (textEl) textEl.innerText = npc.userData.dialogues[currentDialogIndex];
}

function advanceDialogue() {
    if (!isTalking || !currentNPC) return;
    
    currentDialogIndex++;
    const textEl = document.getElementById('dialogue-text');
    
    if (currentDialogIndex < currentNPC.userData.dialogues.length) {
        if (textEl) textEl.innerText = currentNPC.userData.dialogues[currentDialogIndex];
    } else {
        closeDialogue();
    }
}

function closeDialogue() {
    isTalking = false;
    currentNPC = null;
    currentDialogIndex = 0;
    
    const boxEl = document.getElementById('dialogue-box');
    if (boxEl) boxEl.classList.add('hidden');
}


// =========================================================================
// INVENTORY SYSTEM IMPLEMENTATION
// =========================================================================

// =========================================================================
// CHARACTER 3D PREVIEW RENDERER (INVENTORY NEW VIEWPORT)
// =========================================================================

function initCharacterPreview() {
    const canvas = document.getElementById('char-preview-canvas');
    if (!canvas) return;

    // Create Scene
    previewScene = new THREE.Scene();

    // Create Camera
    const rect = canvas.getBoundingClientRect();
    const aspect = rect.width / (rect.height || 1);
    previewCamera = new THREE.PerspectiveCamera(40, aspect, 0.1, 10);
    previewCamera.position.set(0, 1.0, 2.4); // Focus around chest level
    previewCamera.lookAt(new THREE.Vector3(0, 0.9, 0));

    // Create Renderer
    previewRenderer = new THREE.WebGLRenderer({ canvas: canvas, antialias: true, alpha: true });
    previewRenderer.setPixelRatio(window.devicePixelRatio);
    previewRenderer.setSize(rect.width, rect.height);
    previewRenderer.shadowMap.enabled = true;

    // Create Lights (풍성하고 고운 3차원 광원 처리)
    const ambient = new THREE.AmbientLight(0xffffff, 0.7);
    previewScene.add(ambient);

    const dirLight = new THREE.DirectionalLight(0xffffff, 0.9);
    dirLight.position.set(2, 4, 3);
    dirLight.castShadow = true;
    previewScene.add(dirLight);

    const pointLight = new THREE.PointLight(0xd4af37, 0.6, 5);
    pointLight.position.set(-1.5, 1.5, 1);
    previewScene.add(pointLight);

    // Create Model (Clone standard player structure)
    previewModelRefs = createPlayerModelGroup(true);
    previewScene.add(previewModelRefs.group);

    // In preview, always show sword in hand, hide back sheathed sword
    previewModelRefs.sword.visible = true;
    previewModelRefs.sheathedSword.visible = false;

    // Synchronize initial equipment look
    updatePlayerEquipmentAppearance();

    // Start drawing
    animatePreview();
}

function resizeCharacterPreview() {
    const canvas = document.getElementById('char-preview-canvas');
    if (!canvas || !previewRenderer || !previewCamera) return;

    // Set a tiny timeout to allow flexbox layout sizing to stabilize
    setTimeout(() => {
        const rect = canvas.parentNode.getBoundingClientRect();
        previewCamera.aspect = rect.width / (rect.height || 1);
        previewCamera.updateProjectionMatrix();
        previewRenderer.setSize(rect.width, rect.height);
    }, 60);
}

let previewAnimFrameId = null;
function animatePreview() {
    if (!previewRenderer || !previewScene || !previewCamera) return;

    previewAnimFrameId = requestAnimationFrame(animatePreview);

    // Slowly rotate the model so the player can see their full skin!
    if (previewModelRefs && previewModelRefs.group) {
        previewModelRefs.group.rotation.y += 0.012;
    }

    previewRenderer.render(previewScene, previewCamera);
}


// =========================================================================
// INVENTORY SYSTEM IMPLEMENTATION
// =========================================================================

function initInventoryUI() {
    const grid = document.getElementById('inventory-grid');
    if (!grid) return;
    grid.innerHTML = '';
    
    for (let i = 0; i < inventoryCapacity; i++) {
        const slot = document.createElement('div');
        slot.className = 'inventory-slot';
        slot.dataset.index = i;
        slot.addEventListener('click', () => selectInventorySlot(i));
        grid.appendChild(slot);
    }

    // Attach event listeners for equipment slots click (unequip items)
    document.querySelectorAll('.equip-slot').forEach(slot => {
        const slotName = slot.dataset.slot;
        if (slotName) {
            slot.addEventListener('click', () => clickEquipSlot(slotName));
        }
    });

    // Attach event listeners for inventory buttons
    const closeBtn = document.getElementById('inventory-close-btn');
    if (closeBtn) closeBtn.addEventListener('click', toggleInventory);

    const hudBtn = document.getElementById('hud-inventory-btn');
    if (hudBtn) hudBtn.addEventListener('click', toggleInventory);

    const useBtn = document.getElementById('use-item-btn');
    if (useBtn) useBtn.addEventListener('click', useSelectedItem);

    const discardBtn = document.getElementById('discard-item-btn');
    if (discardBtn) discardBtn.addEventListener('click', discardSelectedItem);

    const respawnBtn = document.getElementById('respawn-items-btn');
    if (respawnBtn) respawnBtn.addEventListener('click', respawnAllCollectibleItems);
}

function toggleInventory() {
    isInventoryOpen = !isInventoryOpen;
    const invScreen = document.getElementById('inventory-screen');
    const hudBtn = document.getElementById('hud-inventory-btn');
    
    if (isInventoryOpen) {
        if (invScreen) invScreen.classList.remove('hidden');
        if (hudBtn) hudBtn.innerText = '인벤토리 닫기 [E]';
        document.exitPointerLock();
        selectedItemIndex = null;

        // Initialize / Resume character 3D preview
        if (!previewRenderer) {
            initCharacterPreview();
        } else if (previewAnimFrameId === null) {
            animatePreview();
        }
        resizeCharacterPreview();
        renderInventory();
    } else {
        if (invScreen) invScreen.classList.add('hidden');
        if (hudBtn) hudBtn.innerText = '인벤토리 열기 [E]';

        // Pause preview loop to save GPU resource
        if (previewAnimFrameId !== null) {
            cancelAnimationFrame(previewAnimFrameId);
            previewAnimFrameId = null;
        }

        // Return pointer lock back to game body if not start screen
        if (startScreen.classList.contains('hidden')) {
            document.body.requestPointerLock();
        }
    }
}

function clickEquipSlot(slotName) {
    const equippedIndex = playerStats.equipped[slotName];
    if (equippedIndex !== null && equippedIndex !== undefined) {
        const item = inventory[equippedIndex];
        if (item) {
            const template = itemTemplates[item.templateId];
            playerStats.equipped[slotName] = null;
            showPromptNotification(`[${template.name}]을(를) 장착 해제했습니다.`);
            
            recalculateStats();
            updatePlayerEquipmentAppearance();
            renderInventory();
        }
    }
}

function recalculateStats() {
    let extraAttack = 0;
    let extraDefense = 0;

    // Check all equipped slots
    for (const slot in playerStats.equipped) {
        const idx = playerStats.equipped[slot];
        if (idx !== null) {
            const item = inventory[idx];
            if (item) {
                const template = itemTemplates[item.templateId];
                if (template) {
                    if (template.atkBonus) extraAttack += template.atkBonus;
                    if (template.defBonus) extraDefense += template.defBonus;
                }
            } else {
                playerStats.equipped[slot] = null; // Auto-cleanup broken references
            }
        }
    }

    playerStats.attackPower = playerStats.baseAttack + extraAttack;
    playerStats.defense = playerStats.baseDefense + extraDefense;
}

function pickUpItem(item) {
    const template = itemTemplates[item.templateId];
    if (!template) return;

    let added = false;

    // 1. Stackable items: Search for existing slot
    if (template.isStackable) {
        for (let i = 0; i < inventoryCapacity; i++) {
            if (inventory[i] && inventory[i].templateId === item.templateId) {
                inventory[i].count++;
                added = true;
                break;
            }
        }
    }

    // 2. Non-stackable or not yet added stackable item: Find first empty slot
    if (!added) {
        for (let i = 0; i < inventoryCapacity; i++) {
            if (inventory[i] === null) {
                inventory[i] = {
                    templateId: item.templateId,
                    count: 1
                };
                added = true;
                break;
            }
        }
    }

    if (added) {
        // Remove 3D Mesh from scene
        scene.remove(item.mesh);

        // Remove from world collectibles list
        const index = collectibleItems.indexOf(item);
        if (index > -1) {
            collectibleItems.splice(index, 1);
        }

        if (hoveredItem === item) {
            hoveredItem = null;
        }

        showPromptNotification(`[<span style="color:#f3e5ab; font-weight:bold;">${template.name}</span>]을(를) 획득했습니다!`);
        renderInventory();
    } else {
        showPromptNotification(`<span style="color:#f56565; font-weight:bold;">인벤토리가 가득 차서 주울 수 없습니다!</span>`);
    }
}

function renderInventory() {
    const slots = document.querySelectorAll('.inventory-slot');
    
    for (let i = 0; i < inventoryCapacity; i++) {
        const slot = slots[i];
        if (!slot) continue;

        slot.innerHTML = '';
        slot.className = 'inventory-slot';

        if (i === selectedItemIndex) {
            slot.classList.add('selected');
        }

        const item = inventory[i];
        if (item) {
            const template = itemTemplates[item.templateId];
            if (template) {
                // Create Icon wrapper
                const iconWrapper = document.createElement('div');
                iconWrapper.className = 'item-icon-wrapper';

                const icon = document.createElement('div');
                icon.className = `item-icon ${template.iconClass}`;
                iconWrapper.appendChild(icon);
                slot.appendChild(iconWrapper);

                // Create Stacking Badge if > 1
                if (item.count > 1) {
                    const badge = document.createElement('span');
                    badge.className = 'item-count-badge';
                    badge.textContent = `x${item.count}`;
                    slot.appendChild(badge);
                }

                // Equip Indicator Badge
                let isEquipped = false;
                for (const slotName in playerStats.equipped) {
                    if (playerStats.equipped[slotName] === i) {
                        isEquipped = true;
                        break;
                    }
                }

                if (isEquipped) {
                    slot.classList.add('equipped');
                    const eqBadge = document.createElement('span');
                    eqBadge.style.cssText = 'position:absolute; top:5px; left:5px; background:#d4af37; color:#0f141e; font-size:0.6rem; font-weight:bold; padding:1px 3px; border-radius:2px; pointer-events:none;';
                    eqBadge.textContent = 'E';
                    slot.appendChild(eqBadge);
                }
            }
        }
    }

    // Update Middle Side Equipment Slots UI
    const defaultEquipSlots = {
        head: { icon: "🪖", label: "머리 (Helmet)" },
        chest: { icon: "👕", label: "갑옷 (Chest)" },
        boots: { icon: "🥾", label: "장화 (Boots)" },
        weapon: { icon: "⚔️", label: "무기 (Weapon)" },
        shield: { icon: "🛡️", label: "방패 (Shield)" }
    };

    for (const slotName in defaultEquipSlots) {
        const slotEl = document.getElementById(`equip-${slotName}`);
        if (!slotEl) continue;

        const equippedIndex = playerStats.equipped[slotName];
        const iconEl = slotEl.querySelector('.equip-slot-icon');
        const labelEl = slotEl.querySelector('.equip-slot-label');

        if (equippedIndex !== null && equippedIndex !== undefined && inventory[equippedIndex]) {
            const item = inventory[equippedIndex];
            const template = itemTemplates[item.templateId];

            slotEl.classList.add('active-equip');
            slotEl.title = `${template.name}\n\n${template.description}`;
            if (iconEl) {
                iconEl.className = `equip-slot-icon ${template.iconClass}`;
                iconEl.innerHTML = ''; // Clear default emoji
            }
            if (labelEl) {
                labelEl.textContent = template.name;
            }
        } else {
            slotEl.classList.remove('active-equip');
            slotEl.title = "장착 공간 비어 있음";
            if (iconEl) {
                iconEl.className = 'equip-slot-icon';
                iconEl.innerHTML = defaultEquipSlots[slotName].icon;
            }
            if (labelEl) {
                labelEl.textContent = defaultEquipSlots[slotName].label;
            }
        }
    }

    // Update Stats Panel (with DEFENSE)
    const statAtk = document.getElementById('stat-atk');
    const statDef = document.getElementById('stat-def');
    const statHp = document.getElementById('stat-hp');
    const statMp = document.getElementById('stat-mp');
    const statSlots = document.getElementById('stat-slots');

    if (statAtk) statAtk.textContent = playerStats.attackPower;
    if (statDef) statDef.textContent = playerStats.defense;
    if (statHp) statHp.textContent = `${Math.round(playerStats.hp)} / ${playerStats.maxHp}`;
    if (statMp) statMp.textContent = `${Math.round(playerStats.mp)} / ${playerStats.maxMp}`;
    
    const usedSlots = inventory.filter(x => x !== null).length;
    if (statSlots) statSlots.textContent = `${usedSlots} / 24`;

    // Update Detail Panel
    const emptyPanel = document.getElementById('detail-empty');
    const contentPanel = document.getElementById('detail-content');

    if (selectedItemIndex !== null && inventory[selectedItemIndex]) {
        if (emptyPanel) emptyPanel.classList.add('hidden');
        if (contentPanel) contentPanel.classList.remove('hidden');

        const item = inventory[selectedItemIndex];
        const template = itemTemplates[item.templateId];

        const detailIcon = document.getElementById('detail-icon');
        const detailName = document.getElementById('detail-name');
        const detailType = document.getElementById('detail-type');
        const detailDesc = document.getElementById('detail-description');
        const useBtn = document.getElementById('use-item-btn');

        if (detailIcon) {
            detailIcon.innerHTML = `<div class="item-icon ${template.iconClass}"></div>`;
        }
        if (detailName) detailName.textContent = template.name;
        if (detailType) detailType.textContent = template.type;
        if (detailDesc) detailDesc.textContent = template.description;

        if (useBtn) {
            useBtn.classList.remove('hidden');
            if (template.slot) {
                // If it is an equippable item
                const isEquipped = playerStats.equipped[template.slot] === selectedItemIndex;
                useBtn.textContent = isEquipped ? "장착 해제 (Unequip)" : "장비 장착 (Equip)";
                useBtn.style.display = 'block';
            } else if (template.id === 'ironOre' || template.id === 'goldenLeaf') {
                // Materials are unusable
                useBtn.style.display = 'none';
            } else {
                useBtn.textContent = "사용하기 (Consume)";
                useBtn.style.display = 'block';
            }
        }
    } else {
        if (emptyPanel) emptyPanel.classList.remove('hidden');
        if (contentPanel) contentPanel.classList.add('hidden');
    }
}

function selectInventorySlot(index) {
    selectedItemIndex = index;
    renderInventory();
}

function useSelectedItem() {
    if (selectedItemIndex === null) return;
    const item = inventory[selectedItemIndex];
    if (!item) return;

    const template = itemTemplates[item.templateId];
    if (!template) return;

    if (template.slot) {
        // Equipment equipping / unequipping logic
        const slot = template.slot;
        
        if (playerStats.equipped[slot] === selectedItemIndex) {
            // Unequip
            playerStats.equipped[slot] = null;
            showPromptNotification(`[${template.name}]을(를) 장착 해제했습니다.`);
        } else {
            // Equip (Only one item per equipment slot)
            playerStats.equipped[slot] = selectedItemIndex;
            
            const bonusText = template.atkBonus ? `공격력이 ${template.atkBonus}` : `방어력이 ${template.defBonus}`;
            showPromptNotification(`[${template.name}]을(를) 장착했습니다. ${bonusText} 증가합니다!`);
        }
        
        recalculateStats();
        updatePlayerEquipmentAppearance();
    } else {
        // Consumables consumption logic
        let effectTriggered = false;

        if (template.healHP && template.healHP > 0) {
            if (playerStats.hp < playerStats.maxHp) {
                playerStats.hp = Math.min(playerStats.maxHp, playerStats.hp + template.healHP);
                effectTriggered = true;
            } else {
                showPromptNotification("이미 체력이 가득 차 있습니다!");
                return;
            }
        }

        if (template.healMP && template.healMP > 0) {
            if (playerStats.mp < playerStats.maxMp) {
                playerStats.mp = Math.min(playerStats.maxMp, playerStats.mp + template.healMP);
                effectTriggered = true;
            } else if (!template.healHP) { // Only checking MP
                showPromptNotification("이미 마나가 가득 차 있습니다!");
                return;
            }
        }

        if (effectTriggered) {
            item.count--;
            if (item.count <= 0) {
                inventory[selectedItemIndex] = null;
                selectedItemIndex = null;
            }
            showPromptNotification(`[${template.name}]을(를) 사용하여 생기가 회복되었습니다.`);
            updateHUD();
        }
    }

    renderInventory();
}

function discardSelectedItem() {
    if (selectedItemIndex === null) return;
    const item = inventory[selectedItemIndex];
    if (!item) return;

    const template = itemTemplates[item.templateId];
    if (!template) return;

    // Determine drop position in front of player
    // player.rotation.y is camYaw
    const dropDist = 3.5;
    const dx = player.position.x + Math.sin(camYaw) * dropDist;
    const dz = player.position.z + Math.cos(camYaw) * dropDist;

    // Spawn 3D item in world with a 1.5-second pickup cooldown
    spawnCollectibleItem(item.templateId, dx, dz, 1500);

    // If equipped, unequip it first
    for (const slotName in playerStats.equipped) {
        if (playerStats.equipped[slotName] === selectedItemIndex) {
            playerStats.equipped[slotName] = null;
        }
    }
    
    recalculateStats();
    updatePlayerEquipmentAppearance();

    // Decrement from inventory
    item.count--;
    if (item.count <= 0) {
        inventory[selectedItemIndex] = null;
        selectedItemIndex = null;
    }

    showPromptNotification(`[${template.name}]을(를) 바닥에 버렸습니다.`);
    renderInventory();
}

function takeTestDamage() {
    const damage = 15;
    playerStats.hp = Math.max(1, playerStats.hp - damage);
    
    // Also deduct a small amount of MP to let them test Mana potions!
    playerStats.mp = Math.max(5, playerStats.mp - 8);

    updateHUD();
    showPromptNotification(`<span style="color:#f56565; font-weight:bold;">테스트 피해: HP -15, MP -8 감소했습니다!</span>`);
    
    if (isInventoryOpen) {
        renderInventory();
    }
}

function updateHUD() {
    const hpBar = document.querySelector('.bar.hp');
    const mpBar = document.querySelector('.bar.mp');
    const hpText = hpBar ? hpBar.nextElementSibling : null;
    const mpText = mpBar ? mpBar.nextElementSibling : null;

    if (hpBar) {
        const hpPercent = (playerStats.hp / playerStats.maxHp) * 100;
        hpBar.style.width = `${hpPercent}%`;
    }
    if (hpText) {
        hpText.textContent = `HP: ${Math.round(playerStats.hp)} / ${playerStats.maxHp}`;
    }

    if (mpBar) {
        const mpPercent = (playerStats.mp / playerStats.maxMp) * 100;
        mpBar.style.width = `${mpPercent}%`;
    }
    if (mpText) {
        mpText.textContent = `MP: ${Math.round(playerStats.mp)} / ${playerStats.maxMp}`;
    }
}

function createItemMesh(type) {
    const group = new THREE.Group();
    
    if (type === 'apple') {
        // Red apple sphere
        const appleGeo = new THREE.SphereGeometry(0.25, 8, 8);
        const appleMat = new THREE.MeshStandardMaterial({ color: 0xff3333, roughness: 0.6 });
        const apple = new THREE.Mesh(appleGeo, appleMat);
        apple.castShadow = true;
        apple.position.y = 0.25;
        group.add(apple);

        // Brown stem
        const stemGeo = new THREE.CylinderGeometry(0.02, 0.02, 0.15, 4);
        const stemMat = new THREE.MeshStandardMaterial({ color: 0x5c4033, roughness: 0.9 });
        const stem = new THREE.Mesh(stemGeo, stemMat);
        stem.position.set(0.05, 0.45, 0);
        stem.rotation.z = -0.2;
        stem.castShadow = true;
        group.add(stem);
    } 
    else if (type === 'carrot') {
        // Orange carrot cone
        const carrotGeo = new THREE.CylinderGeometry(0.08, 0.01, 0.5, 6);
        const carrotMat = new THREE.MeshStandardMaterial({ color: 0xff8c00, roughness: 0.7 });
        const carrot = new THREE.Mesh(carrotGeo, carrotMat);
        carrot.rotation.x = Math.PI / 2; // Lie horizontal
        carrot.position.y = 0.08;
        carrot.castShadow = true;
        group.add(carrot);

        // Green leaf cylinder
        const leafGeo = new THREE.BoxGeometry(0.03, 0.03, 0.2);
        const leafMat = new THREE.MeshStandardMaterial({ color: 0x48bb78, roughness: 0.9 });
        const leaf = new THREE.Mesh(leafGeo, leafMat);
        leaf.position.set(0, 0.08, -0.3);
        leaf.rotation.x = -0.2;
        leaf.castShadow = true;
        group.add(leaf);
    }
    else if (type === 'potionHp') {
        // Red liquid inside clear glass base
        const bodyGeo = new THREE.CylinderGeometry(0.14, 0.14, 0.4, 6);
        const liquidMat = new THREE.MeshStandardMaterial({ color: 0xcc0000, roughness: 0.4, metalness: 0.1 });
        const body = new THREE.Mesh(bodyGeo, liquidMat);
        body.position.y = 0.2;
        body.castShadow = true;
        group.add(body);

        // Neck
        const neckGeo = new THREE.CylinderGeometry(0.06, 0.06, 0.12, 6);
        const neckMat = new THREE.MeshStandardMaterial({ color: 0xcbd5e0, roughness: 0.2 });
        const neck = new THREE.Mesh(neckGeo, neckMat);
        neck.position.y = 0.46;
        neck.castShadow = true;
        group.add(neck);

        // Cork
        const corkGeo = new THREE.CylinderGeometry(0.05, 0.04, 0.08, 4);
        const corkMat = new THREE.MeshStandardMaterial({ color: 0x8b5a2b, roughness: 0.9 });
        const cork = new THREE.Mesh(corkGeo, corkMat);
        cork.position.y = 0.54;
        group.add(cork);
    }
    else if (type === 'potionMp') {
        // Blue liquid inside clear glass base
        const bodyGeo = new THREE.CylinderGeometry(0.14, 0.14, 0.4, 6);
        const liquidMat = new THREE.MeshStandardMaterial({ color: 0x0055ff, roughness: 0.4, metalness: 0.1 });
        const body = new THREE.Mesh(bodyGeo, liquidMat);
        body.position.y = 0.2;
        body.castShadow = true;
        group.add(body);

        // Neck
        const neckGeo = new THREE.CylinderGeometry(0.06, 0.06, 0.12, 6);
        const neckMat = new THREE.MeshStandardMaterial({ color: 0xcbd5e0, roughness: 0.2 });
        const neck = new THREE.Mesh(neckGeo, neckMat);
        neck.position.y = 0.46;
        neck.castShadow = true;
        group.add(neck);

        // Cork
        const corkGeo = new THREE.CylinderGeometry(0.05, 0.04, 0.08, 4);
        const corkMat = new THREE.MeshStandardMaterial({ color: 0x8b5a2b, roughness: 0.9 });
        const cork = new THREE.Mesh(corkGeo, corkMat);
        cork.position.y = 0.54;
        group.add(cork);
    }
    else if (type === 'ironOre') {
        // Rock-like polyhedron
        const oreGeo = new THREE.DodecahedronGeometry(0.24, 0);
        const oreMat = new THREE.MeshStandardMaterial({ color: 0x5a5a5a, roughness: 0.95, metalness: 0.7 });
        const ore = new THREE.Mesh(oreGeo, oreMat);
        ore.position.y = 0.2;
        ore.scale.set(1.2, 0.8, 1);
        ore.castShadow = true;
        group.add(ore);

        // Little shiny spots
        const spotGeo = new THREE.BoxGeometry(0.06, 0.06, 0.06);
        const spotMat = new THREE.MeshStandardMaterial({ color: 0xcbd5e0, roughness: 0.1, metalness: 0.9 });
        const spot = new THREE.Mesh(spotGeo, spotMat);
        spot.position.set(0.1, 0.25, 0.1);
        group.add(spot);
    }
    else if (type === 'goldenLeaf') {
        // Thin glowing golden star/leaf
        const leafGeo = new THREE.OctahedronGeometry(0.22, 0);
        const leafMat = new THREE.MeshStandardMaterial({ color: 0xffd700, roughness: 0.2, metalness: 0.8, emissive: 0xff9900, emissiveIntensity: 0.2 });
        const leaf = new THREE.Mesh(leafGeo, leafMat);
        leaf.position.y = 0.25;
        leaf.scale.set(1.5, 0.2, 1);
        leaf.castShadow = true;
        group.add(leaf);
    }
    else if (type === 'wood') {
        // Brown wood log cylinder
        const logGeo = new THREE.CylinderGeometry(0.12, 0.12, 0.45, 6);
        const logMat = new THREE.MeshStandardMaterial({ color: 0x8b5a2b, roughness: 0.85 });
        const log = new THREE.Mesh(logGeo, logMat);
        log.rotation.x = Math.PI / 2; // Lie horizontal
        log.position.y = 0.12;
        log.castShadow = true;
        group.add(log);

        // Inner rings (yellowish wood color) on the ends
        const ringGeo = new THREE.CylinderGeometry(0.10, 0.10, 0.02, 6);
        const ringMat = new THREE.MeshStandardMaterial({ color: 0xecc94b, roughness: 0.9 });
        
        const ring1 = new THREE.Mesh(ringGeo, ringMat);
        ring1.position.set(0, 0.23, 0);
        log.add(ring1);

        const ring2 = new THREE.Mesh(ringGeo, ringMat);
        ring2.position.set(0, -0.23, 0);
        log.add(ring2);
    }
    else if (type === 'dagger') {
        // Small metallic dagger standing or floating
        const daggerGroup = new THREE.Group();
        daggerGroup.position.y = 0.2;

        const bladeGeo = new THREE.BoxGeometry(0.04, 0.45, 0.015);
        const bladeMat = new THREE.MeshStandardMaterial({ color: 0x99aab8, roughness: 0.2, metalness: 0.8 });
        const blade = new THREE.Mesh(bladeGeo, bladeMat);
        blade.position.y = 0.225;
        blade.castShadow = true;
        daggerGroup.add(blade);

        const guardGeo = new THREE.BoxGeometry(0.14, 0.02, 0.03);
        const guardMat = new THREE.MeshStandardMaterial({ color: 0xd4af37, metalness: 0.8, roughness: 0.2 });
        const guard = new THREE.Mesh(guardGeo, guardMat);
        guard.position.y = 0;
        guard.castShadow = true;
        daggerGroup.add(guard);

        const gripGeo = new THREE.CylinderGeometry(0.016, 0.016, 0.12, 6);
        const gripMat = new THREE.MeshStandardMaterial({ color: 0x3d271d, roughness: 0.95 });
        const grip = new THREE.Mesh(gripGeo, gripMat);
        grip.position.y = -0.06;
        grip.castShadow = true;
        daggerGroup.add(grip);

        group.add(daggerGroup);
    }
    else if (type === 'ironHelmet') {
        const helmetGroup = new THREE.Group();
        helmetGroup.position.y = 0.2;
        
        const ironMat = new THREE.MeshStandardMaterial({ color: 0x718096, metalness: 0.8, roughness: 0.3 });
        const goldMat = new THREE.MeshStandardMaterial({ color: 0xd4af37, metalness: 0.8, roughness: 0.2 });
        
        const base = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.2, 0.3), ironMat);
        base.castShadow = true;
        helmetGroup.add(base);
        
        const plume = new THREE.Mesh(new THREE.ConeGeometry(0.04, 0.15, 4), goldMat);
        plume.position.set(0, 0.15, -0.05);
        plume.rotation.x = -0.3;
        plume.castShadow = true;
        helmetGroup.add(plume);
        
        group.add(helmetGroup);
    }
    else if (type === 'ironArmor') {
        const armorGroup = new THREE.Group();
        armorGroup.position.y = 0.2;
        
        const ironMat = new THREE.MeshStandardMaterial({ color: 0x718096, metalness: 0.8, roughness: 0.3 });
        const goldMat = new THREE.MeshStandardMaterial({ color: 0xd4af37, metalness: 0.8, roughness: 0.2 });
        
        const plate = new THREE.Mesh(new THREE.BoxGeometry(0.35, 0.45, 0.2), ironMat);
        plate.castShadow = true;
        armorGroup.add(plate);
        
        const trim = new THREE.Mesh(new THREE.BoxGeometry(0.37, 0.05, 0.22), goldMat);
        trim.position.y = -0.15;
        trim.castShadow = true;
        armorGroup.add(trim);
        
        group.add(armorGroup);
    }
    else if (type === 'ironBoots') {
        const bootsGroup = new THREE.Group();
        bootsGroup.position.y = 0.1;
        
        const ironMat = new THREE.MeshStandardMaterial({ color: 0x718096, metalness: 0.8, roughness: 0.3 });
        
        const leftB = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.12, 0.18), ironMat);
        leftB.position.x = -0.1;
        leftB.castShadow = true;
        bootsGroup.add(leftB);
        
        const rightB = leftB.clone();
        rightB.position.x = 0.1;
        bootsGroup.add(rightB);
        
        group.add(bootsGroup);
    }
    else if (type === 'woodenShield') {
        const shieldGroup = new THREE.Group();
        shieldGroup.position.y = 0.25;
        
        const ironMat = new THREE.MeshStandardMaterial({ color: 0x718096, metalness: 0.8, roughness: 0.3 });
        const woodMat = new THREE.MeshStandardMaterial({ color: 0x8b5a2b, roughness: 0.9 });
        const goldMat = new THREE.MeshStandardMaterial({ color: 0xd4af37, metalness: 0.8, roughness: 0.2 });
        
        const base = new THREE.Mesh(new THREE.BoxGeometry(0.35, 0.45, 0.04), woodMat);
        base.castShadow = true;
        shieldGroup.add(base);
        
        const trim = new THREE.Mesh(new THREE.BoxGeometry(0.39, 0.49, 0.02), ironMat);
        trim.position.z = -0.01;
        trim.castShadow = true;
        shieldGroup.add(trim);
        
        const emblem = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.1, 0.06), goldMat);
        emblem.position.z = 0.01;
        emblem.castShadow = true;
        shieldGroup.add(emblem);
        
        group.add(shieldGroup);
    }

    return group;
}

function spawnCollectibleItem(type, x, z, pickupDelayMs = 0) {
    const template = itemTemplates[type];
    if (!template) return;

    const group = createItemMesh(type);
    
    // Position it on the ground height
    const dummyPos = new THREE.Vector3(x, 15, z);
    const groundY = getTerrainHeight(dummyPos);
    group.position.set(x, groundY + 0.1, z);

    scene.add(group);

    // Register to our list
    collectibleItems.push({
        id: 'item_' + Date.now() + '_' + Math.random().toString(36).substr(2, 5),
        templateId: type,
        name: template.name,
        mesh: group,
        canPickupAfter: pickupDelayMs > 0 ? Date.now() + pickupDelayMs : 0
    });
}

function spawnCollectibleItems() {
    // Clear any existing
    respawnAllCollectibleItems(); // This removes from scene and clears list

    // Farm crops area (Carrots, Apples)
    spawnCollectibleItem('carrot', -33, -8);
    spawnCollectibleItem('carrot', -31, -11);
    spawnCollectibleItem('carrot', -29, -6);
    spawnCollectibleItem('apple', -34, -13);
    spawnCollectibleItem('apple', -28, -9);

    // Blacksmith area (Iron Ores, Steel Dagger)
    spawnCollectibleItem('ironOre', -21, 80);
    spawnCollectibleItem('ironOre', -23, 84);
    spawnCollectibleItem('dagger', -26, 85.5);

    // Autumn Tree (Golden Leaves, HP Potion)
    spawnCollectibleItem('goldenLeaf', -12, 7);
    spawnCollectibleItem('goldenLeaf', -16, 12);
    spawnCollectibleItem('potionHp', -15, 8);

    // Other house surroundings
    spawnCollectibleItem('potionMp', 18, 48);
    spawnCollectibleItem('potionHp', -17, -12);
}

function respawnAllCollectibleItems() {
    collectibleItems.forEach(item => {
        scene.remove(item.mesh);
        // Dispose geometries/materials to avoid memory leaks
        item.mesh.traverse(child => {
            if (child.isMesh) {
                if (child.geometry) child.geometry.dispose();
                if (child.material) {
                    if (Array.isArray(child.material)) {
                        child.material.forEach(m => m.dispose());
                    } else {
                        child.material.dispose();
                    }
                }
            }
        });
    });
    collectibleItems.length = 0;
    hoveredItem = null;
    
    // If we call this manually as a respawn, we want to regenerate
    if (arguments.length > 0 && arguments[0] && arguments[0].preventDefault) {
        // It was triggered by click event on respawn button!
        spawnCollectibleItems();
        // Render inventory to update slot counts if any
        renderInventory();
        // Lock screen alert
        showPromptNotification("필드의 모든 아이템이 재소환되었습니다!");
    }
}

function showPromptNotification(text) {
    const promptEl = document.getElementById('interaction-prompt');
    if (!promptEl) return;
    
    promptEl.innerHTML = text;
    promptEl.classList.remove('hidden');
    
    // Clear after 2.5 seconds
    if (window.promptTimeout) clearTimeout(window.promptTimeout);
    window.promptTimeout = setTimeout(() => {
        if (!isTalking && !hoveredNPC && !hoveredItem) {
            promptEl.classList.add('hidden');
        }
        window.promptTimeout = null;
    }, 2500);
}
