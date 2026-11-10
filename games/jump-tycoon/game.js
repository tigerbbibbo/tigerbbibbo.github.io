/* ==========================================================================
   🎮 2D JUMP MAP TYCOON - GAME LOGIC & PHYSICS
   ========================================================================== */

// --- 1. Sound Synthesizer (Web Audio API) ---
// Generates retro 8-bit sound effects procedurally!
const AudioFX = {
    ctx: null,
    init() {
        if (!this.ctx) {
            this.ctx = new (window.AudioContext || window.webkitAudioContext)();
        }
    },
    playJump() {
        this.init();
        if (!this.ctx) return;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(150, this.ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(400, this.ctx.currentTime + 0.15);
        
        const vol = (GameState.soundVolume !== undefined ? GameState.soundVolume : 70) / 100;
        gain.gain.setValueAtTime(0.15 * vol, this.ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01 * vol, this.ctx.currentTime + 0.15);
        osc.start();
        osc.stop(this.ctx.currentTime + 0.15);
    },
    playCoin() {
        this.init();
        if (!this.ctx) return;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.type = 'sine';
        osc.frequency.setValueAtTime(523.25, this.ctx.currentTime); // C5
        osc.frequency.setValueAtTime(880, this.ctx.currentTime + 0.08); // A5
        
        const vol = (GameState.soundVolume !== undefined ? GameState.soundVolume : 70) / 100;
        gain.gain.setValueAtTime(0.1 * vol, this.ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01 * vol, this.ctx.currentTime + 0.3);
        osc.start();
        osc.stop(this.ctx.currentTime + 0.3);
    },
    playHurt() {
        this.init();
        if (!this.ctx) return;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(180, this.ctx.currentTime);
        osc.frequency.linearRampToValueAtTime(60, this.ctx.currentTime + 0.2);
        
        const vol = (GameState.soundVolume !== undefined ? GameState.soundVolume : 70) / 100;
        gain.gain.setValueAtTime(0.15 * vol, this.ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01 * vol, this.ctx.currentTime + 0.25);
        osc.start();
        osc.stop(this.ctx.currentTime + 0.25);
    },
    playClear() {
        this.init();
        if (!this.ctx) return;
        const notes = [261.63, 329.63, 392.00, 523.25, 659.25, 783.99, 1046.50]; // Arpeggio C Major
        const vol = (GameState.soundVolume !== undefined ? GameState.soundVolume : 70) / 100;
        notes.forEach((freq, i) => {
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();
            osc.connect(gain);
            gain.connect(this.ctx.destination);
            osc.type = 'sine';
            osc.frequency.setValueAtTime(freq, this.ctx.currentTime + i * 0.08);
            gain.gain.setValueAtTime(0.1 * vol, this.ctx.currentTime + i * 0.08);
            gain.gain.exponentialRampToValueAtTime(0.01 * vol, this.ctx.currentTime + i * 0.08 + 0.2);
            osc.start(this.ctx.currentTime + i * 0.08);
            osc.stop(this.ctx.currentTime + i * 0.08 + 0.25);
        });
    },
    playFever() {
        this.init();
        if (!this.ctx) return;
        const osc1 = this.ctx.createOscillator();
        const osc2 = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc1.connect(gain);
        osc2.connect(gain);
        gain.connect(this.ctx.destination);
        osc1.type = 'sawtooth';
        osc2.type = 'square';
        osc1.frequency.setValueAtTime(300, this.ctx.currentTime);
        osc1.frequency.exponentialRampToValueAtTime(800, this.ctx.currentTime + 0.4);
        osc2.frequency.setValueAtTime(305, this.ctx.currentTime);
        osc2.frequency.exponentialRampToValueAtTime(810, this.ctx.currentTime + 0.4);
        
        const vol = (GameState.soundVolume !== undefined ? GameState.soundVolume : 70) / 100;
        gain.gain.setValueAtTime(0.08 * vol, this.ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01 * vol, this.ctx.currentTime + 0.5);
        osc1.start();
        osc2.start();
        osc1.stop(this.ctx.currentTime + 0.5);
        osc2.stop(this.ctx.currentTime + 0.5);
    }
};

// --- 2. Global Game State ---
const GameState = {
    gold: 500, // Starting gold for testing
    stage: 1,
    feverGauge: 0,
    isFeverActive: false,
    feverTimeLeft: 0,
    selectedStockTicker: 'SPIKE',
    soundVolume: 70,
    isPaused: false,

    // Global Account Properties
    credits: 0,
    highStageRecord: 1,
    currentSaveSlot: 1,
    isMultiplayerMode: false,
    selectedMultiplayerAi: null, // Specs of selected AI in Multiplayer mode

    // RPG Equips
    equipment: {
        shoes_double_jump: { name: "더블점프 깃털 신발", cost: 1200, level: 0, maxLevel: 1, desc: "공중에서 점프를 한 번 더 할 수 있습니다." },
        shoes_swift: { name: "바람막이 신속 슈즈", cost: 800, level: 0, maxLevel: 5, desc: "이동속도가 레벨당 15% 빨라집니다." },
        magnet_goggles: { name: "황금 코인 자석 고글", cost: 1000, level: 0, maxLevel: 5, desc: "주변 코인 흡수 반경이 늘어납니다." },
        wall_climb_gloves: { name: "벽걸이 접착 장갑", cost: 1500, level: 0, maxLevel: 1, desc: "벽에 달라붙어 흘러내리거나 벽을 박차고 점프할 수 있습니다." },
        rocket_jetpack: { name: "나노 탄소 로켓 제트팩", cost: 3500, level: 0, maxLevel: 1, desc: "Space 키를 꾹 누르고 있으면 연료 불꽃과 함께 비행할 수 있습니다." }
    },
    enchantments: {
        shoes_double_jump: { option: null, value: 0 },
        shoes_swift: { option: null, value: 0 },
        magnet_goggles: { option: null, value: 0 },
        wall_climb_gloves: { option: null, value: 0 },
        rocket_jetpack: { option: null, value: 0 }
    },
    selectedEquipId: null,

    // Potions (Temporary Buffs)
    potions: {
        potion_jump: { name: "스프링 점프 강장제", cost: 150, duration: 20000, desc: "20초 동안 점프 높이가 25% 상승합니다.", activeUntil: 0 },
        potion_fever: { name: "불타는 피버 드링크", cost: 300, duration: 15000, desc: "15초 동안 피버 게이지 획득량이 2배 증가합니다.", activeUntil: 0 }
    },

    // Tycoon Albas
    albas: [
        { id: 'alba_elementary', name: '초딩 대리 점퍼', icon: '👦', cost: 150, baseIncome: 12, interval: 5000, currentTimer: 0, level: 0, desc: '점프에 서툰 동네 꼬마 알바.' },
        { id: 'alba_college', name: '대학생 알바 점퍼', icon: '🧑‍🎓', cost: 800, baseIncome: 85, interval: 4000, currentTimer: 0, level: 0, desc: '용돈이 급한 스피드런 전공 대학생.' },
        { id: 'alba_progamer', name: '프로게이머 팀장', icon: '🎮', cost: 3500, baseIncome: 450, interval: 3000, currentTimer: 0, level: 0, desc: 'APM 400 소유자, 완벽한 하이컨트롤.' },
        { id: 'alba_ai', name: '양자연산 점핑봇 AI', icon: '🤖', cost: 15000, baseIncome: 2800, interval: 1500, currentTimer: 0, level: 0, desc: '점프맵 수학적 완주가 가능한 초지능 로봇.' }
    ],

    // Stock Market (JSE)
    stocks: {
        SPIKE: { ticker: 'SPIKE', name: '가시산업', currentPrice: 120, history: [120, 115, 118, 122, 120], owned: 0 },
        BOUNCE: { ticker: 'BOUNCE', name: '붕붕패드테크', currentPrice: 85, history: [80, 82, 85, 83, 85], owned: 0 },
        ALBA: { ticker: 'ALBA', name: '알바몬제국', currentPrice: 320, history: [310, 315, 320, 318, 320], owned: 0 }
    },
    newsEvents: [
        { ticker: 'SPIKE', text: "가시산업, 신형 정밀 밀착 트랩 출시 소식에 투자자들 매수 열풍!", multiplier: 1.6 },
        { ticker: 'SPIKE', text: "스테이지 안전 연대, 가시 설치 안전규정 위반 혐의 가시산업 압수수색!", multiplier: 0.5 },
        { ticker: 'BOUNCE', text: "붕붕패드테크, 우주항공급 탄성 고무 스프링 개발 완료 발표!", multiplier: 1.8 },
        { ticker: 'BOUNCE', text: "스프링 패드 오작동으로 인한 낙사 사고 발생... 붕붕패드 긴급 품질 검사.", multiplier: 0.6 },
        { ticker: 'ALBA', text: "알바몬제국, 글로벌 인력 아웃소싱 1위 등극... 분기 실적 역대 최고치 경신!", multiplier: 1.5 },
        { ticker: 'ALBA', text: "구직자 만족도 최악 기업 블랙리스트에 알바몬제국 등재... 불매 운동 확산.", multiplier: 0.7 }
    ],

    // Auction System
    auction: {
        itemName: "전설 알바 [고인물 킹-커]",
        itemDesc: "주기 2초 | 정산액 +85,000G | 절대 낙사 안 함 (초당 42,500 G 추가 효과)",
        itemEffect: () => {
            // Passive effect: Boosts ALL albas income by 50%
            GameState.showToast("💎 [전설 알바 킹-커] 효과 발동! 모든 알바 수익 +50%!", "success");
        },
        hasPlayerWon: false,
        highestBidder: "NPC_가난한철수",
        highestBid: 2500,
        timeLeft: 45, // seconds
        logs: ["경매가 개시되었습니다! 최고입찰가 2500G."],
        hasBid: false,
        ended: false,
        baseBids: [
            { name: "NPC_점프마스터", min: 3000, max: 20000 },
            { name: "NPC_주식대박남", min: 5000, max: 35000 },
            { name: "NPC_수수께끼상인", min: 10000, max: 70000 }
        ]
    }
};

// Toast notification helper
GameState.showToast = function(message, type = "info") {
    const container = document.getElementById('toast-container');
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.innerText = message;
    container.appendChild(toast);
    setTimeout(() => {
        toast.remove();
    }, 3000);
};

// --- 3. 2D Platformer Engine Variables ---
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

let particles = [];
let coins = [];
let blocks = [];
let activeAiTeammates = []; // AI companions
let goal = { x: 0, y: 0, width: 30, height: 40 };
let cameraX = 0; // Screen scrolling

// Player Physics State
const player = {
    x: 50,
    y: 350,
    vx: 0,
    vy: 0,
    width: 24,
    height: 24,
    speed: 3.5,
    jumpForce: 7.2,
    gravity: 0.35,
    isGrounded: false,
    jumpCount: 0,
    maxJumps: 1,
    squashX: 1, // Visual juice
    squashY: 1
};

// Keyboard inputs
const keys = {};
window.addEventListener('keydown', (e) => {
    keys[e.code] = true;
    if (e.code === 'Space') {
        e.preventDefault(); // Stop window scroll
        tryJump();
    }
    if (e.code === 'KeyR') {
        resetLevel();
    }
});
window.addEventListener('keyup', (e) => {
    keys[e.code] = false;
});

// --- 4. Level Generator ---
function loadStage(stageNum) {
    blocks = [];
    coins = [];
    particles = [];
    player.x = 50;
    player.y = 300;
    player.vx = 0;
    player.vy = 0;
    cameraX = 0;

    // Spawn active AI teammates
    activeAiTeammates = [];
    if (GameState.team) {
        GameState.team.forEach(member => {
            if (member.active) {
                activeAiTeammates.push({
                    x: 50 + Math.random() * 40,
                    y: 300,
                    vx: 0,
                    vy: 0,
                    width: 24,
                    height: 24,
                    speed: member.speed,
                    color: member.color,
                    name: member.name,
                    icon: member.icon,
                    isGrounded: false,
                    jumpCount: 0
                });
            }
        });
    }

    // Fixed ground at start
    blocks.push({ x: 0, y: 400, width: 250, height: 100, isSpike: false });

    // Procedural layout generator based on stage seed
    let currentX = 250;
    let currentY = 400;
    const count = 5 + stageNum * 2; // Number of platforms

    for (let i = 0; i < count; i++) {
        const gap = 80 + Math.random() * 60 + Math.min(stageNum * 8, 80);
        const width = 80 + Math.random() * 80 - Math.min(stageNum * 4, 40);
        const height = 40;
        
        // Vertical step
        const stepY = (Math.random() - 0.4) * 80;
        currentY = Math.max(150, Math.min(420, currentY + stepY));
        currentX += gap;

        // Platform properties (Green bounce block, Red death block, or normal block)
        let isGreenBounce = false;
        let isRedDeath = false;
        if (stageNum >= 2 && i > 0 && i < count - 1) {
            const rand = Math.random();
            if (rand < 0.15) {
                isGreenBounce = true;
            } else if (rand < 0.28 && stageNum >= 3) {
                isRedDeath = true;
            }
        }

        // Platform
        blocks.push({ 
            x: currentX, 
            y: currentY, 
            width: width, 
            height: height, 
            isSpike: false,
            isGreenBounceBlock: isGreenBounce,
            isRedDeathBlock: isRedDeath
        });

        // Maybe add spike on top of platform (starting from Stage 2) (Only if not green bounce or red death!)
        if (!isGreenBounce && !isRedDeath && stageNum >= 2 && Math.random() < 0.35 && width > 90) {
            if (stageNum >= 3 && Math.random() < 0.5) {
                // Moving spike on top of platform
                blocks.push({
                    x: currentX + 10,
                    y: currentY - 15,
                    width: 30,
                    height: 15,
                    isSpike: true,
                    isMoving: true,
                    vx: 1.2 + Math.random() * 1.0 + (stageNum * 0.1),
                    vy: 0,
                    minX: currentX + 5,
                    maxX: currentX + width - 35
                });
            } else {
                blocks.push({
                    x: currentX + width/2 - 15,
                    y: currentY - 15,
                    width: 30,
                    height: 15,
                    isSpike: true
                });
            }
        }

        // Add floating bobbing vertical spike hazard in the gap (Stage 4+)
        if (stageNum >= 4 && Math.random() < 0.4) {
            const floatX = currentX - gap / 2;
            const floatY = currentY - 50 - Math.random() * 60;
            blocks.push({
                x: floatX,
                y: floatY,
                width: 24,
                height: 24,
                isSpike: true,
                isMoving: true,
                vx: 0,
                vy: 1.0 + Math.random() * 1.2 + (stageNum * 0.1),
                minY: floatY - 50,
                maxY: floatY + 50
            });
        }

        // Add coins on top of platform
        if (!isRedDeath && Math.random() < 0.7) {
            coins.push({
                x: currentX + width/2,
                y: currentY - 30 - Math.random() * 40,
                radius: 8,
                collected: false
            });
        }
    }

    // End Goal platform
    currentX += 120;
    blocks.push({ x: currentX, y: currentY, width: 150, height: 100, isSpike: false });
    
    goal.x = currentX + 60;
    goal.y = currentY - 45;
}

function resetLevel() {
    loadStage(GameState.stage);
    GameState.showToast("스테이지 재시작!", "danger");
}

// Player jump trigger
function tryJump() {
    // Wall Jump check
    if (player.isWallSliding) {
        AudioFX.playJump();
        player.vy = -getJumpForce();
        
        // Push away from the wall
        const pushForce = getPlayerSpeed() * 1.5;
        if (player.wallSide === 'left') {
            player.vx = pushForce;
        } else {
            player.vx = -pushForce;
        }
        
        player.x += player.vx * 1.5;
        player.isWallSliding = false;
        player.jumpCount = 1; // Counts as first jump, so can still double jump after wall jump
        player.wallJumpTimer = 12; // control lockout frames
        
        createJumpParticles();
        player.squashX = 0.7;
        player.squashY = 1.3;
        return;
    }

    // Get double jump status
    player.maxJumps = GameState.equipment.shoes_double_jump.level > 0 ? 2 : 1;
    
    if (player.isGrounded) {
        AudioFX.playJump();
        player.vy = -getJumpForce();
        player.isGrounded = false;
        player.jumpCount = 1;
        createJumpParticles();
        // Squash squeeze visual
        player.squashX = 0.7;
        player.squashY = 1.3;
    } else if (player.jumpCount < player.maxJumps) {
        AudioFX.playJump();
        player.vy = -getJumpForce() * 0.95; // Slightly weaker second jump
        player.jumpCount++;
        createJumpParticles();
        // Squash squeeze visual
        player.squashX = 0.7;
        player.squashY = 1.3;
    }
}

// Multipliers based on items & potions
function getPlayerSpeed() {
    let speed = player.speed;
    // Swift shoes level
    speed *= (1 + GameState.equipment.shoes_swift.level * 0.15);
    // Fever speed
    if (GameState.isFeverActive) speed *= 1.35;
    return speed;
}

function getJumpForce() {
    let force = player.jumpForce;
    // Jump potion check
    if (Date.now() < GameState.potions.potion_jump.activeUntil) {
        force *= 1.25;
    }
    return force;
}

function getMagnetRange() {
    let range = 40; // base range
    range += GameState.equipment.magnet_goggles.level * 25;
    return range;
}

// --- 5. Collision & Physics Core ---
function updatePhysics() {
    // Return early if paused
    if (GameState.isPaused) return;

    // 1. Decrease wall jump horizontal movement override timer
    if (player.wallJumpTimer > 0) {
        player.wallJumpTimer--;
    }

    // 2. Update moving blocks (obstacles) positions
    blocks.forEach(block => {
        if (block.isMoving) {
            // Horizontal moving
            if (block.vx !== 0) {
                block.x += block.vx;
                if (block.x < block.minX) {
                    block.x = block.minX;
                    block.vx = -block.vx;
                } else if (block.x > block.maxX) {
                    block.x = block.maxX;
                    block.vx = -block.vx;
                }
            }
            // Vertical moving
            if (block.vy !== 0) {
                block.y += block.vy;
                if (block.y < block.minY) {
                    block.y = block.minY;
                    block.vy = -block.vy;
                } else if (block.y > block.maxY) {
                    block.y = block.maxY;
                    block.vy = -block.vy;
                }
            }
        }
    });

    // 3. Rocket Jetpack Flight Control
    let isRocketFlying = false;
    if (keys['Space'] && !player.isGrounded && GameState.equipment.rocket_jetpack && GameState.equipment.rocket_jetpack.level > 0) {
        player.vy = Math.max(-3.5, player.vy - 0.52); // gentle rocket lift
        isRocketFlying = true;
        
        // Spawn exhaust fire/smoke particles
        if (Math.random() < 0.6) {
            particles.push({
                x: player.x + player.width/2 + (Math.random() - 0.5) * 8,
                y: player.y + player.height,
                vx: (Math.random() - 0.5) * 2,
                vy: 2 + Math.random() * 3,
                radius: 1.5 + Math.random() * 2,
                color: Math.random() < 0.5 ? '#EF4444' : '#F59E0B',
                life: 12
            });
        }
    }

    const activeSpeed = getPlayerSpeed();

    // 4. Horizontal Movement with wall jump lockout override check
    if (player.wallJumpTimer > 0) {
        // Slightly decay the horizontal wall push velocity
        player.vx = player.vx * 0.95;
    } else {
        if (keys['KeyA'] || keys['ArrowLeft']) {
            player.vx = -activeSpeed;
        } else if (keys['KeyD'] || keys['ArrowRight']) {
            player.vx = activeSpeed;
        } else {
            player.vx = 0;
        }
    }

    // Apply gravity
    player.vy += player.gravity;

    // Update positions
    player.x += player.vx;
    player.y += player.vy;

    player.isGrounded = false;

    // Platform collisions
    blocks.forEach(block => {
        // AABB check
        if (player.x + player.width > block.x &&
            player.x < block.x + block.width &&
            player.y + player.height > block.y &&
            player.y < block.y + block.height) {

            if (block.isSpike || block.isRedDeathBlock) {
                // Die by spike or red block!
                triggerDeath();
            } else {
                // Platform landing (only collision from top)
                const prevY = player.y - player.vy;
                if (prevY + player.height <= block.y + 6) {
                    if (block.isGreenBounceBlock) {
                        // Auto high jump on green bounce block!
                        AudioFX.playJump();
                        player.vy = -getJumpForce() * 1.5; // 50% stronger automatic jump!
                        player.isGrounded = false;
                        player.jumpCount = 0;
                        player.squashX = 0.5;
                        player.squashY = 1.5;
                        
                        // Green spark particles
                        for (let j = 0; j < 12; j++) {
                            particles.push({
                                    x: player.x + player.width/2,
                                    y: block.y,
                                    vx: (Math.random() - 0.5) * 6,
                                    vy: -Math.random() * 4 - 2,
                                    radius: 2 + Math.random() * 2,
                                    color: '#34D399',
                                    life: 25
                            });
                        }
                        createFloatingText('BOOST! ⚡', player.x + player.width/2, player.y - 10, '#34D399');
                    } else {
                        player.y = block.y - player.height;
                        player.vy = 0;
                        player.isGrounded = true;
                        player.jumpCount = 0;
                        
                        // Restore visual squashing
                        if (player.squashY > 1.01 || player.squashY < 0.99) {
                            player.squashX = 1.2;
                            player.squashY = 0.8;
                        }
                    }
                }
            }
        }
    });

    // 5. Wall Sliding Detection
    player.isWallSliding = false;
    player.wallSide = null;

    if (GameState.equipment.wall_climb_gloves && GameState.equipment.wall_climb_gloves.level > 0 && !player.isGrounded) {
        blocks.forEach(block => {
            if (block.isSpike || block.isRedDeathBlock || block.isGreenBounceBlock) return; // Cannot wall-slide on these
            
            // Vertical overlap check with a small margin
            const overlapY = (player.y + player.height > block.y + 4) && (player.y < block.y + block.height - 4);
            if (!overlapY) return;

            // Proximity/overlap check for side touching
            const touchingLeft = Math.abs((player.x + player.width) - block.x) < 4;
            const touchingRight = Math.abs(player.x - (block.x + block.width)) < 4;

            if (touchingLeft && (keys['KeyD'] || keys['ArrowRight'])) {
                player.isWallSliding = true;
                player.wallSide = 'right'; // Wall is on player's right
            } else if (touchingRight && (keys['KeyA'] || keys['ArrowLeft'])) {
                player.isWallSliding = true;
                player.wallSide = 'left';  // Wall is on player's left
            }
        });
    }

    if (player.isWallSliding) {
        // Caps downward slide velocity
        if (player.vy > 1.2) {
            player.vy = 1.2;
        }

        // Spawn slide particles (friction dust)
        if (Math.random() < 0.25) {
            const particleX = player.wallSide === 'right' ? (player.x + player.width) : player.x;
            const particleY = player.y + Math.random() * player.height;
            particles.push({
                x: particleX,
                y: particleY,
                vx: (player.wallSide === 'right' ? -1 : 1) * (0.5 + Math.random()),
                vy: -0.5 - Math.random(),
                radius: 1.5 + Math.random() * 2,
                color: '#94A3B8', // Slate grey debris
                life: 15
            });
        }
    }

    // 6. Update active AI teammates physics and collision
    activeAiTeammates.forEach(ai => {
        // Apply gravity
        ai.vy += player.gravity;

        // Move right constantly
        ai.vx = ai.speed;

        // Apply velocities
        ai.x += ai.vx;
        ai.y += ai.vy;

        ai.isGrounded = false;

        // Platform collisions for AI
        blocks.forEach(block => {
            if (block.isSpike || block.isRedDeathBlock) {
                // Hazard overlap
                if (ai.x + ai.width > block.x &&
                    ai.x < block.x + block.width &&
                    ai.y + ai.height > block.y &&
                    ai.y < block.y + block.height) {
                    
                    // Respawn AI
                    ai.x = 50;
                    ai.y = 300;
                    ai.vx = 0;
                    ai.vy = 0;
                    createDeathParticles(ai.x, ai.y);
                    createFloatingText("😭 AI FAIL", 50, 300, "#EF4444");
                }
                return;
            }

            // Standard or Green bounce blocks
            if (ai.x + ai.width > block.x &&
                ai.x < block.x + block.width &&
                ai.y + ai.height > block.y &&
                ai.y < block.y + block.height) {
                
                const prevY = ai.y - ai.vy;
                if (prevY + ai.height <= block.y + 6) {
                    if (block.isGreenBounceBlock) {
                        ai.vy = -getJumpForce() * 1.4; // auto high bounce for AI
                        ai.isGrounded = false;
                        createFloatingText("AI BOOST! ⚡", ai.x + ai.width/2, ai.y - 10, '#34D399');
                    } else {
                        ai.y = block.y - ai.height;
                        ai.vy = 0;
                        ai.isGrounded = true;
                    }
                }
            }
        });

        // AI decision logic: Look ahead for gaps or walls
        let shouldAiJump = false;
        blocks.forEach(block => {
            if (block.isSpike || block.isRedDeathBlock) return;
            const inFront = block.x > ai.x && block.x < ai.x + 90;
            const verticallyOverlap = ai.y + ai.height > block.y - 40 && ai.y < block.y + block.height;
            if (inFront && verticallyOverlap) {
                shouldAiJump = true;
            }
        });

        // Autojump
        if (ai.isGrounded && (shouldAiJump || Math.random() < 0.015)) {
            ai.vy = -6.5 - Math.random() * 1.5;
            ai.isGrounded = false;
            for (let k = 0; k < 4; k++) {
                particles.push({
                    x: ai.x + ai.width/2,
                    y: ai.y + ai.height,
                    vx: (Math.random() - 0.5) * 2,
                    vy: Math.random() * -1.5,
                    radius: 1.5 + Math.random() * 1.5,
                    color: ai.color,
                    life: 15
                });
            }
        }

        // Pit check
        if (ai.y > 600) {
            ai.x = 50;
            ai.y = 300;
            ai.vx = 0;
            ai.vy = 0;
            createFloatingText("😭 AI FAIL", 50, 300, "#EF4444");
        }

        // Goal clear check
        if (ai.x + ai.width > goal.x &&
            ai.x < goal.x + goal.width &&
            ai.y + ai.height > goal.y &&
            ai.y < goal.y + goal.height) {
            
            // Collect bounty reward!
            let bonusGold = 100 * GameState.stage;
            GameState.gold += bonusGold;
            
            createFloatingText(`AI CLEAR! +${bonusGold}G ✨`, ai.x + ai.width/2, ai.y - 20, '#F59E0B');
            createGoldParticles(ai.x + ai.width/2, ai.y + ai.height/2);
            
            // Respawn instantly to run again
            ai.x = 50;
            ai.y = 300;
            ai.vx = 0;
            ai.vy = 0;
        }
    });

    // Squash recovery physics
    player.squashX += (1 - player.squashX) * 0.15;
    player.squashY += (1 - player.squashY) * 0.15;

    // Check bottom death pit
    if (player.y > 600) {
        triggerDeath();
    }

    // Camera follow (Lerped)
    const targetCamX = player.x - 200;
    cameraX += (targetCamX - cameraX) * 0.1;
    cameraX = Math.max(0, cameraX);

    // Coin collection & Magnet logic
    coins.forEach(coin => {
        if (coin.collected) return;

        // Magnet potion or goggles pull
        const dx = coin.x - (player.x + player.width/2);
        const dy = coin.y - (player.y + player.height/2);
        const dist = Math.sqrt(dx*dx + dy*dy);
        const magnetRange = getMagnetRange();

        if (dist < magnetRange) {
            // Pull coin to player
            coin.x -= (dx / dist) * 6;
            coin.y -= (dy / dist) * 6;
        }

        // Catch check
        if (player.x + player.width > coin.x - coin.radius &&
            player.x < coin.x + coin.radius &&
            player.y + player.height > coin.y - coin.radius &&
            player.y < coin.y + coin.radius) {
            
            coin.collected = true;
            AudioFX.playCoin();
            
            // Gold gain with modifiers
            let baseGold = 10 * GameState.stage;
            let finalGold = Math.floor(baseGold * getGoldMultiplier());
            GameState.gold += finalGold;
            
            // Fever gain
            let feverVal = 5;
            if (Date.now() < GameState.potions.potion_fever.activeUntil) feverVal *= 2;
            addFeverGauge(feverVal);

            // Pop gold particles
            createGoldParticles(coin.x, coin.y);
            createFloatingText(`+${finalGold}G`, coin.x, coin.y - 15, "#FBBF24");
        }
    });

    // Goal clear check
    if (player.x + player.width > goal.x &&
        player.x < goal.x + goal.width &&
        player.y + player.height > goal.y &&
        player.y < goal.y + goal.height) {
        
        triggerStageClear();
    }

    // Update Particles
    particles.forEach((p, i) => {
        p.x += p.vx;
        p.y += p.vy;
        p.life -= 1;
        p.vy += p.grav || 0;
        if (p.life <= 0) particles.splice(i, 1);
    });
}

function getGoldMultiplier() {
    let mult = 1.0;
    // Check enchants
    Object.values(GameState.enchantments).forEach(ench => {
        if (ench.option === 'gold_gain') {
            mult += (ench.value / 100);
        }
    });
    // Check fever
    if (GameState.isFeverActive) mult *= 2.0;
    return mult;
}

function addFeverGauge(val) {
    if (GameState.isFeverActive) return;
    GameState.feverGauge = Math.min(100, GameState.feverGauge + val);
    if (GameState.feverGauge >= 100) {
        triggerFeverTime();
    }
}

function triggerFeverTime() {
    GameState.isFeverActive = true;
    GameState.feverTimeLeft = 15; // 15 seconds
    AudioFX.playFever();
    GameState.showToast("🔥 피버 타임 발동! 골드 획득 2배 & 알바 속도 10배!", "gold");
    document.getElementById('fever-overlay').classList.remove('hidden');
}

function endFeverTime() {
    GameState.isFeverActive = false;
    GameState.feverGauge = 0;
    GameState.feverTimeLeft = 0;
    document.getElementById('fever-overlay').classList.add('hidden');
    GameState.showToast("피버 타임이 종료되었습니다.", "info");
}

function triggerDeath() {
    AudioFX.playHurt();
    createDeathParticles(player.x + player.width/2, player.y + player.height/2);
    player.x = 50;
    player.y = 300;
    player.vx = 0;
    player.vy = 0;
    GameState.gold = Math.max(0, GameState.gold - Math.floor(GameState.stage * 10)); // small gold penalty
    GameState.showToast("아야! 가시에 찔리거나 낙사했습니다.", "danger");
}

function triggerStageClear() {
    AudioFX.playClear();
    
    // Clear Gold reward
    const clearBonus = 200 * GameState.stage;
    GameState.gold += clearBonus;
    GameState.showToast(`✨ STAGE ${GameState.stage} 클리어! 보상: +${clearBonus}G`, "success");
    createStageClearEffect();

    GameState.stage++;
    loadStage(GameState.stage);
}

// --- 6. Visual VFX Generation ---
function createJumpParticles() {
    for (let i = 0; i < 8; i++) {
        particles.push({
            x: player.x + player.width / 2,
            y: player.y + player.height,
            vx: (Math.random() - 0.5) * 3,
            vy: Math.random() * -2,
            radius: 2 + Math.random() * 3,
            color: '#A5B4FC',
            life: 20
        });
    }
}

function createGoldParticles(x, y) {
    for (let i = 0; i < 6; i++) {
        particles.push({
            x: x,
            y: y,
            vx: (Math.random() - 0.5) * 4,
            vy: (Math.random() - 0.5) * 4,
            radius: 2 + Math.random() * 3,
            color: '#FBBF24',
            life: 25,
            grav: 0.1
        });
    }
}

function createDeathParticles(x, y) {
    for (let i = 0; i < 20; i++) {
        particles.push({
            x: x,
            y: y,
            vx: (Math.random() - 0.5) * 8,
            vy: (Math.random() - 0.5) * 8,
            radius: 3 + Math.random() * 4,
            color: '#EF4444',
            life: 40,
            grav: 0.15
        });
    }
}

function createStageClearEffect() {
    for (let i = 0; i < 40; i++) {
        particles.push({
            x: goal.x + goal.width/2 + (Math.random() - 0.5) * 50,
            y: goal.y + goal.height/2 + (Math.random() - 0.5) * 50,
            vx: (Math.random() - 0.5) * 10,
            vy: (Math.random() - 0.5) * 10 - 3,
            radius: 3 + Math.random() * 5,
            color: `hsl(${Math.random() * 360}, 100%, 70%)`,
            life: 60,
            grav: 0.1
        });
    }
}

let floatingTexts = [];
function createFloatingText(text, x, y, color = "#FFF") {
    floatingTexts.push({
        text, x, y, color, life: 40
    });
}

// --- 7. Renderer (Canvas Draw Loop) ---
function drawGame() {
    // Clear
    ctx.fillStyle = '#030712';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.save();
    ctx.translate(-cameraX, 0); // Side-scrolling

    // Draw Platforms & Spikes
    blocks.forEach(block => {
        if (block.isSpike) {
            ctx.fillStyle = '#EF4444';
            ctx.strokeStyle = '#FCA5A5';
            ctx.lineWidth = 1.5;
            
            if (block.isMoving && block.vx === 0) {
                // Draw a beautiful glowing 4-pointed star spike for floating hazards
                const cx = block.x + block.width / 2;
                const cy = block.y + block.height / 2;
                const r = Math.min(block.width, block.height) / 2;
                
                ctx.beginPath();
                ctx.moveTo(cx, cy - r);                 // top
                ctx.lineTo(cx + r * 0.3, cy - r * 0.3); // top-right inner
                ctx.lineTo(cx + r, cy);                 // right
                ctx.lineTo(cx + r * 0.3, cy + r * 0.3); // bottom-right inner
                ctx.lineTo(cx, cy + r);                 // bottom
                ctx.lineTo(cx - r * 0.3, cy + r * 0.3); // bottom-left inner
                ctx.lineTo(cx - r, cy);                 // left
                ctx.lineTo(cx - r * 0.3, cy - r * 0.3); // top-left inner
                ctx.closePath();
                ctx.fill();
                ctx.stroke();
            } else {
                // Draw red glowing Spikes
                ctx.beginPath();
                ctx.moveTo(block.x, block.y + block.height);
                ctx.lineTo(block.x + block.width / 2, block.y);
                ctx.lineTo(block.x + block.width, block.y + block.height);
                ctx.closePath();
                ctx.fill();
                ctx.stroke();
            }
        } else if (block.isRedDeathBlock) {
            // Draw glowing SOLID RED hazard block
            ctx.fillStyle = '#EF4444';
            ctx.strokeStyle = '#FCA5A5';
            ctx.lineWidth = 2.5;
            ctx.beginPath();
            ctx.roundRect(block.x, block.y, block.width, block.height, 8);
            ctx.fill();
            ctx.stroke();

            // Inner danger stripes
            ctx.fillStyle = '#991B1B';
            ctx.fillRect(block.x + 4, block.y + 4, block.width - 8, block.height - 8);

            // Danger skull marker inside
            ctx.fillStyle = '#FECACA';
            ctx.font = 'bold 10px sans-serif';
            ctx.textAlign = 'center';
            ctx.fillText('☠️ DANGER', block.x + block.width / 2, block.y + block.height / 2 + 4);

        } else if (block.isGreenBounceBlock) {
            // Draw glowing green bounce block
            const bounceGrad = ctx.createLinearGradient(block.x, block.y, block.x, block.y + block.height);
            bounceGrad.addColorStop(0, '#10B981');
            bounceGrad.addColorStop(1, '#064E3B');
            ctx.fillStyle = bounceGrad;
            ctx.strokeStyle = '#34D399';
            ctx.lineWidth = 2.5;
            ctx.beginPath();
            ctx.roundRect(block.x, block.y, block.width, block.height, 8);
            ctx.fill();
            ctx.stroke();

            // Bright green neon top strip
            ctx.fillStyle = '#A7F3D0';
            ctx.fillRect(block.x, block.y, block.width, 4);

            // Trampoline label inside
            ctx.fillStyle = '#ECFDF5';
            ctx.font = 'bold 10px sans-serif';
            ctx.textAlign = 'center';
            ctx.fillText('⚡ BOUNCE', block.x + block.width / 2, block.y + block.height / 2 + 4);

        } else {
            // Draw regular platform card
            const grad = ctx.createLinearGradient(block.x, block.y, block.x, block.y + block.height);
            grad.addColorStop(0, '#1E293B');
            grad.addColorStop(1, '#0F172A');
            ctx.fillStyle = grad;
            ctx.strokeStyle = '#334155';
            ctx.lineWidth = 2;

            ctx.beginPath();
            ctx.roundRect(block.x, block.y, block.width, block.height, 8);
            ctx.fill();
            ctx.stroke();

            // Nice sci-fi neon grid line
            ctx.fillStyle = '#6366F1';
            ctx.fillRect(block.x, block.y, block.width, 3);
        }
    });

    // Draw Coins
    coins.forEach(coin => {
        if (coin.collected) return;
        ctx.fillStyle = '#FBBF24';
        ctx.shadowColor = '#F59E0B';
        ctx.shadowBlur = 10;
        
        ctx.beginPath();
        ctx.arc(coin.x, coin.y, coin.radius, 0, Math.PI * 2);
        ctx.fill();
        
        // Inner detail
        ctx.fillStyle = '#FFFBEB';
        ctx.beginPath();
        ctx.arc(coin.x, coin.y, coin.radius * 0.4, 0, Math.PI * 2);
        ctx.fill();
        
        ctx.shadowBlur = 0; // reset
    });

    // Draw End Goal
    ctx.strokeStyle = '#10B981';
    ctx.lineWidth = 3;
    ctx.shadowColor = '#10B981';
    ctx.shadowBlur = 15;
    ctx.fillStyle = 'rgba(16, 185, 129, 0.15)';
    ctx.beginPath();
    ctx.roundRect(goal.x, goal.y, goal.width, goal.height, 6);
    ctx.fill();
    ctx.stroke();
    ctx.shadowBlur = 0;

    // Draw Goal Flag text
    ctx.fillStyle = '#10B981';
    ctx.font = 'bold 11px Noto Sans KR';
    ctx.textAlign = 'center';
    ctx.fillText('GOAL', goal.x + goal.width/2, goal.y - 8);

    // Draw AI Teammates
    activeAiTeammates.forEach(ai => {
        ctx.save();
        ctx.translate(ai.x + ai.width / 2, ai.y + ai.height);
        
        // Body
        ctx.fillStyle = ai.color;
        ctx.beginPath();
        ctx.roundRect(-ai.width/2, -ai.height, ai.width, ai.height, 6);
        ctx.fill();
        
        // Eyes
        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(-5, -16, 4, 6);
        ctx.fillRect(1, -16, 4, 6);
        ctx.fillStyle = '#000000';
        ctx.fillRect(-4, -13, 2, 3);
        ctx.fillRect(2, -13, 2, 3);
        
        // Teammate icon (🤖, 👾, 🌌) on top of head
        ctx.fillStyle = '#FFF';
        ctx.font = '10px Arial';
        ctx.textAlign = 'center';
        ctx.fillText(ai.icon, 0, -ai.height - 4);
        
        ctx.restore();
    });

    // Draw Player (with Squash and Stretch!)
    ctx.save();
    // Move pivot to bottom center of player
    ctx.translate(player.x + player.width / 2, player.y + player.height);
    ctx.scale(player.squashX, player.squashY);

    // Rocket Jetpack pack physical rendering on back
    if (GameState.equipment.rocket_jetpack && GameState.equipment.rocket_jetpack.level > 0) {
        ctx.fillStyle = '#64748B'; // jetpack casing
        ctx.fillRect(-player.width/2 - 5, -player.height + 4, 5, player.height - 8);
        ctx.fillStyle = '#EF4444'; // thruster nozzle
        ctx.fillRect(-player.width/2 - 4, -4, 3, 3);
    }

    // Render body
    const pGrad = ctx.createLinearGradient(-player.width/2, -player.height, -player.width/2, 0);
    pGrad.addColorStop(0, '#818CF8'); // bright violet
    pGrad.addColorStop(1, '#4F46E5'); // indigo
    ctx.fillStyle = pGrad;
    ctx.beginPath();
    ctx.roundRect(-player.width/2, -player.height, player.width, player.height, 6);
    ctx.fill();

    // Eyes (direction based on velocity)
    ctx.fillStyle = '#FFFFFF';
    let eyeOffsetX = 0;
    if (player.vx > 0) eyeOffsetX = 3;
    if (player.vx < 0) eyeOffsetX = -3;
    ctx.fillRect(eyeOffsetX - 5, -16, 4, 6);
    ctx.fillRect(eyeOffsetX + 1, -16, 4, 6);
    ctx.fillStyle = '#000000';
    ctx.fillRect(eyeOffsetX - 4, -13, 2, 3);
    ctx.fillRect(eyeOffsetX + 2, -13, 2, 3);

    // Shoes rendering (Double Jump Shoes Level > 0)
    if (GameState.equipment.shoes_double_jump.level > 0) {
        ctx.fillStyle = '#F59E0B'; // Gold wing details
        ctx.fillRect(-player.width/2 - 2, -3, 3, 3);
        ctx.fillRect(player.width/2 - 1, -3, 3, 3);
    }

    ctx.restore();

    // Draw Particles
    particles.forEach(p => {
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
        ctx.fill();
    });

    // Draw Floating Texts
    floatingTexts.forEach((t, idx) => {
        ctx.fillStyle = t.color;
        ctx.font = 'bold 12px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(t.text, t.x, t.y);
        t.y -= 0.6;
        t.life--;
        if (t.life <= 0) floatingTexts.splice(idx, 1);
    });

    // Fever Coin Rain (Canvas Effect during Fever)
    if (GameState.isFeverActive && Math.random() < 0.25) {
        const dropX = cameraX + Math.random() * canvas.width;
        coins.push({
            x: dropX,
            y: -10,
            radius: 8,
            collected: false
        });
    }

    ctx.restore();
}

// --- 8. Tycoon Automation System (Alba Payouts) ---
let lastTime = Date.now();
function runTycoonEngine() {
    const now = Date.now();
    const dt = now - lastTime;
    lastTime = now;

    // 1. Potion timers countdown
    updatePotionTimers();

    // 2. Albas progress update
    let totalGps = 0;
    GameState.albas.forEach(alba => {
        if (alba.level > 0) {
            // Speed factor
            let intervalSpeed = alba.interval;
            if (GameState.isFeverActive) {
                intervalSpeed /= 10; // 10x speed!
            }

            alba.currentTimer += dt;
            
            // Calculate progress bar percent
            const barFill = Math.min(100, (alba.currentTimer / intervalSpeed) * 100);
            const progressBar = document.getElementById(`alba-fill-${alba.id}`);
            if (progressBar) {
                progressBar.style.width = `${barFill}%`;
            }

            // Pay check
            if (alba.currentTimer >= intervalSpeed) {
                alba.currentTimer = 0; // Reset
                
                // Income calculation (level scale)
                let multiplier = 1;
                // Auction custom reward (+50% profit if player won king-ker)
                if (GameState.auction.hasPlayerWon) {
                    multiplier += 0.50;
                }
                
                let payout = Math.floor(alba.baseIncome * alba.level * multiplier);
                GameState.gold += payout;
                
                // Fever charge chance
                if (Math.random() < 0.2) {
                    addFeverGauge(2);
                }

                // Flash animation effect
                const card = document.getElementById(`alba-card-${alba.id}`);
                if (card) {
                    card.style.borderColor = "var(--gold-color)";
                    setTimeout(() => { card.style.borderColor = "rgba(255, 255, 255, 0.04)"; }, 150);
                }
            }

            totalGps += (alba.baseIncome * alba.level) / (alba.interval / 1000);
        }
    });

    // 3. Auction timer ticking
    updateAuctionTimer(dt);

    // 4. Update UI numbers
    document.getElementById('gold-amount').innerText = Math.floor(GameState.gold).toLocaleString();
    document.getElementById('gps-display').innerText = `(+${Math.round(totalGps).toLocaleString()} G/s)`;
    document.getElementById('stage-num').innerText = GameState.stage;
    document.getElementById('fever-fill').style.width = `${GameState.feverGauge}%`;
    document.getElementById('fever-percent').innerText = `${GameState.feverGauge}%`;

    // Fever countdown
    if (GameState.isFeverActive) {
        GameState.feverTimeLeft -= dt / 1000;
        if (GameState.feverTimeLeft <= 0) {
            endFeverTime();
        }
    }

    // 5. Update purchase buttons based on current gold
    updateUpgradeButtons();
}

function updateUpgradeButtons() {
    // 1. Albas
    GameState.albas.forEach(alba => {
        const btn = document.getElementById(`btn-alba-${alba.id}`);
        if (btn) {
            const isHired = alba.level > 0;
            const cost = isHired ? Math.floor(alba.cost * alba.level * 1.5) : alba.cost;
            btn.disabled = GameState.gold < cost;
        }
    });

    // 2. Equipment
    Object.keys(GameState.equipment).forEach(id => {
        const btn = document.getElementById(`btn-equip-${id}`);
        if (btn) {
            const item = GameState.equipment[id];
            const isMax = item.level >= item.maxLevel;
            btn.disabled = isMax || GameState.gold < item.cost;
        }
    });

    // 3. Potions
    Object.keys(GameState.potions).forEach(id => {
        const btn = document.getElementById(`btn-potion-${id}`);
        if (btn) {
            const item = GameState.potions[id];
            btn.disabled = GameState.gold < item.cost;
        }
    });

    // 4. Enchantment
    const enchantBtn = document.getElementById('enchant-btn');
    if (enchantBtn) {
        const hasSelected = !!GameState.selectedEquipId;
        enchantBtn.disabled = !hasSelected || GameState.gold < 5000;
    }

    // 5. Stocks (current selected stock)
    const activeStock = GameState.stocks[GameState.selectedStockTicker];
    if (activeStock) {
        const buyBtn = document.getElementById('buy-stock-btn');
        if (buyBtn) buyBtn.disabled = GameState.gold < activeStock.currentPrice;
        const buyAllBtn = document.getElementById('buy-all-stock-btn');
        if (buyAllBtn) buyAllBtn.disabled = GameState.gold < activeStock.currentPrice;
        const sellBtn = document.getElementById('sell-stock-btn');
        if (sellBtn) sellBtn.disabled = activeStock.owned <= 0;
        const sellAllBtn = document.getElementById('sell-all-stock-btn');
        if (sellAllBtn) sellAllBtn.disabled = activeStock.owned <= 0;
    }

    // 6. Auction
    const bidBtn = document.getElementById('place-bid-btn');
    if (bidBtn) {
        const auc = GameState.auction;
        const bidCost = Math.floor(auc.highestBid * 1.1);
        bidBtn.disabled = auc.ended || GameState.gold < bidCost;
    }
}

function updatePotionTimers() {
    const now = Date.now();
    
    // Jump potion
    const jumpLeft = Math.max(0, GameState.potions.potion_jump.activeUntil - now);
    const jumpLabel = document.getElementById('potion-status-jump');
    if (jumpLabel) {
        if (jumpLeft > 0) {
            jumpLabel.innerText = `적용 중 (${Math.ceil(jumpLeft/1000)}초)`;
            jumpLabel.style.color = 'var(--success-color)';
        } else {
            jumpLabel.innerText = '미적용';
            jumpLabel.style.color = 'var(--text-secondary)';
        }
    }

    // Fever potion
    const feverLeft = Math.max(0, GameState.potions.potion_fever.activeUntil - now);
    const feverLabel = document.getElementById('potion-status-fever');
    if (feverLabel) {
        if (feverLeft > 0) {
            feverLabel.innerText = `적용 중 (${Math.ceil(feverLeft/1000)}초)`;
            feverLabel.style.color = 'var(--success-color)';
        } else {
            feverLabel.innerText = '미적용';
            feverLabel.style.color = 'var(--text-secondary)';
        }
    }
}

// --- 9. Dynamic UI Renderers ---

// 1. Tab Menu Switching
const tabs = document.querySelectorAll('.tab-btn');
const panels = document.querySelectorAll('.tab-panel');

tabs.forEach(tab => {
    tab.addEventListener('click', () => {
        tabs.forEach(t => t.classList.remove('active'));
        panels.forEach(p => p.classList.remove('active'));
        
        tab.classList.add('active');
        const target = tab.getAttribute('data-tab');
        document.getElementById(target).classList.add('active');
        
        // Custom draw trigger if chart tab is clicked
        if (target === 'stock-panel') {
            setTimeout(drawStockChart, 50);
        }
    });
});

// 2. Render Alba List
function renderAlbas() {
    const list = document.getElementById('alba-list');
    list.innerHTML = '';

    GameState.albas.forEach(alba => {
        const isHired = alba.level > 0;
        const speedText = isHired ? `${(alba.interval/1000).toFixed(1)}초마다` : `${(alba.interval/1000).toFixed(1)}초`;
        const costText = isHired ? `${(alba.cost * alba.level * 1.5).toFixed(0)} G` : `${alba.cost} G`;
        const profit = alba.baseIncome * (alba.level + 1);

        const card = document.createElement('div');
        card.className = 'card';
        card.id = `alba-card-${alba.id}`;
        card.innerHTML = `
            <div class="card-icon">${alba.icon}</div>
            <div class="card-info">
                <div class="card-title-row">
                    <span class="card-title">${alba.name} <span class="card-badge">Lv.${alba.level}</span></span>
                </div>
                <div class="card-desc">${alba.desc}</div>
                
                <!-- Progress bar (only if hired) -->
                <div class="card-progress-bar" style="display: ${isHired ? 'block' : 'none'};">
                    <div id="alba-fill-${alba.id}" class="card-progress-fill"></div>
                </div>

                <div class="card-stats-row">
                    <span>수익: <strong style="color:var(--gold-color)">+${alba.baseIncome * Math.max(1, alba.level)}G</strong> / ${speedText}</span>
                    <span>다음 효과: +${profit}G</span>
                </div>
            </div>
            <button id="btn-alba-${alba.id}" class="card-action-btn" onclick="buyAlba('${alba.id}')" ${GameState.gold < (isHired ? alba.cost * alba.level * 1.5 : alba.cost) ? 'disabled' : ''}>
                ${isHired ? '레벨업' : '고용'}<br><small>${costText}</small>
            </button>
        `;
        list.appendChild(card);
    });
}

window.buyAlba = function(id) {
    const alba = GameState.albas.find(a => a.id === id);
    const isHired = alba.level > 0;
    const cost = isHired ? Math.floor(alba.cost * alba.level * 1.5) : alba.cost;

    if (GameState.gold >= cost) {
        GameState.gold -= cost;
        alba.level++;
        AudioFX.playCoin();
        GameState.showToast(`${alba.name} 고용/레벨업 성공!`, "success");
        renderAlbas();
    }
};

// 3. Render Equipment & Potions
function renderShop() {
    // Render Equips
    const equipList = document.getElementById('equipment-list');
    equipList.innerHTML = '';

    Object.keys(GameState.equipment).forEach(id => {
        const item = GameState.equipment[id];
        const isBought = item.level > 0;
        const isMax = item.level >= item.maxLevel;
        const enchant = GameState.enchantments[id];

        let statsText = item.desc;
        if (enchant.option) {
            statsText += ` <span style="color:var(--success-color);font-weight:700;">[인챈트: ${getEnchantName(enchant.option)} +${enchant.value}%]</span>`;
        }

        const isSelected = GameState.selectedEquipId === id;

        const card = document.createElement('div');
        card.className = `card ${isSelected ? 'selected' : ''}`;
        card.style.cursor = 'pointer';
        card.onclick = () => selectEquip(id);
        
        let equipIcon = '🧤';
        if (id === 'shoes_double_jump') equipIcon = '👟';
        else if (id === 'shoes_swift') equipIcon = '⚡';
        else if (id === 'magnet_goggles') equipIcon = '👓';

        card.innerHTML = `
            <div class="card-icon">${equipIcon}</div>
            <div class="card-info">
                <div class="card-title-row">
                    <span class="card-title">${item.name} <span class="card-badge">Lv.${item.level}/${item.maxLevel}</span></span>
                </div>
                <div class="card-desc" style="font-size:0.75rem;">${statsText}</div>
            </div>
            <button id="btn-equip-${id}" class="card-action-btn" onclick="buyEquip(event, '${id}')" ${isMax || GameState.gold < item.cost ? 'disabled' : ''}>
                ${isMax ? '최대 레벨' : '구매/강화'}<br><small>${isMax ? '-' : item.cost.toLocaleString() + ' G'}</small>
            </button>
        `;
        equipList.appendChild(card);
    });

    // Render Potions
    const potionList = document.getElementById('potion-list');
    potionList.innerHTML = '';

    Object.keys(GameState.potions).forEach(id => {
        const item = GameState.potions[id];
        const card = document.createElement('div');
        card.className = 'card';
        card.innerHTML = `
            <div class="card-icon">${id === 'potion_jump' ? '🧪' : '🔥'}</div>
            <div class="card-info">
                <div class="card-title-row">
                    <span class="card-title">${item.name}</span>
                </div>
                <div class="card-desc" style="font-size:0.75rem;">${item.desc}</div>
                <div class="card-stats-row">
                    <span id="potion-status-${id.split('_')[1]}">미적용</span>
                </div>
            </div>
            <button id="btn-potion-${id}" class="card-action-btn" onclick="buyPotion('${id}')" ${GameState.gold < item.cost ? 'disabled' : ''}>
                복용<br><small>${item.cost} G</small>
            </button>
        `;
        potionList.appendChild(card);
    });
}

function selectEquip(id) {
    if (GameState.equipment[id].level === 0) {
        GameState.showToast("보유하지 않은 장비는 인챈트할 수 없습니다.", "danger");
        return;
    }
    GameState.selectedEquipId = id;
    const item = GameState.equipment[id];
    const enchant = GameState.enchantments[id];

    document.getElementById('enchant-item-name').innerText = `${item.name} ✨`;
    document.getElementById('enchant-item-stats').innerText = enchant.option 
        ? `${getEnchantName(enchant.option)} +${enchant.value}% 적용 중`
        : "적용된 인챈트 옵션 없음";

    const btn = document.getElementById('enchant-btn');
    btn.disabled = false;
    renderShop(); // Refresh highlights
}

window.buyEquip = function(e, id) {
    e.stopPropagation(); // Stop parent select click
    const item = GameState.equipment[id];
    if (GameState.gold >= item.cost && item.level < item.maxLevel) {
        GameState.gold -= item.cost;
        item.level++;
        item.cost = Math.floor(item.cost * 2.2); // Price hike
        AudioFX.playCoin();
        GameState.showToast(`${item.name} 업그레이드 완료!`, "success");
        renderShop();
    }
};

window.buyPotion = function(id) {
    const item = GameState.potions[id];
    if (GameState.gold >= item.cost) {
        GameState.gold -= item.cost;
        const now = Date.now();
        
        // Stack or overwrite potion effect
        const currentActive = item.activeUntil > now ? item.activeUntil : now;
        item.activeUntil = currentActive + item.duration;

        AudioFX.playCoin();
        GameState.showToast(`${item.name} 복용 완료! 버프 활성화!`, "success");
        renderShop();
    }
};

// Enchant system execution
const enchantOptions = [
    { key: 'gold_gain', name: '풍요 (골드 획득량)', min: 10, max: 35 },
    { key: 'fever_gain', name: '열정 (피버 게이지 획득)', min: 15, max: 50 },
    { key: 'worker_profit', name: '황금빛 (전체 알바 속도)', min: 5, max: 20 }
];

function getEnchantName(key) {
    const opt = enchantOptions.find(o => o.key === key);
    return opt ? opt.name : key;
}

document.getElementById('enchant-btn').addEventListener('click', () => {
    const id = GameState.selectedEquipId;
    if (!id) return;

    const enchantCost = 5000;
    if (GameState.gold >= enchantCost) {
        GameState.gold -= enchantCost;
        
        // Random pick option & percentage
        const opt = enchantOptions[Math.floor(Math.random() * enchantOptions.length)];
        const val = Math.floor(opt.min + Math.random() * (opt.max - opt.min));

        GameState.enchantments[id] = { option: opt.key, value: val };
        
        AudioFX.playClear();
        GameState.showToast(`✨ 인챈트 성공! [${opt.name} +${val}%] 부여!`, "success");
        selectEquip(id); // reload slot
    } else {
        GameState.showToast("골드가 부족합니다! (필요: 5,000 G)", "danger");
    }
});


// 4. Render Stock Market & Custom Canvas Line Chart
const stockChart = document.getElementById('stockChart');
const sCtx = stockChart.getContext('2d');

function renderStocks() {
    const list = document.getElementById('stock-list');
    list.innerHTML = '';

    Object.keys(GameState.stocks).forEach(ticker => {
        const stock = GameState.stocks[ticker];
        const prevPrice = stock.history[stock.history.length - 2] || stock.currentPrice;
        const changePercent = ((stock.currentPrice - prevPrice) / prevPrice * 100).toFixed(1);
        const isUp = stock.currentPrice >= prevPrice;

        const card = document.createElement('div');
        card.className = `stock-card ${GameState.selectedStockTicker === ticker ? 'selected' : ''}`;
        card.onclick = () => selectStock(ticker);
        card.innerHTML = `
            <div class="stock-main-info">
                <span class="stock-ticker">${ticker}</span>
                <span class="stock-name">${stock.name}</span>
            </div>
            <div class="stock-price-info">
                <div class="stock-price">${Math.round(stock.currentPrice)} G</div>
                <div class="stock-change ${isUp ? 'up' : 'down'}">${isUp ? '▲' : '▼'} ${changePercent}%</div>
            </div>
        `;
        list.appendChild(card);
    });

    // Update active trade panel buttons
    const activeStock = GameState.stocks[GameState.selectedStockTicker];
    document.getElementById('chart-title').innerText = `선택된 주식: ${activeStock.name} (${activeStock.ticker})`;
    document.getElementById('owned-shares').innerText = activeStock.owned;
    document.getElementById('stock-value').innerText = (activeStock.owned * Math.round(activeStock.currentPrice)).toLocaleString();

    document.getElementById('buy-stock-btn').disabled = GameState.gold < activeStock.currentPrice;
    document.getElementById('sell-stock-btn').disabled = activeStock.owned <= 0;
    document.getElementById('buy-all-stock-btn').disabled = GameState.gold < activeStock.currentPrice;
    document.getElementById('sell-all-stock-btn').disabled = activeStock.owned <= 0;
}

function selectStock(ticker) {
    GameState.selectedStockTicker = ticker;
    renderStocks();
    drawStockChart();
}

// Draw line graph manually
function drawStockChart() {
    const stock = GameState.stocks[GameState.selectedStockTicker];
    const history = stock.history;

    sCtx.clearRect(0, 0, stockChart.width, stockChart.height);

    // Background gradient
    sCtx.fillStyle = '#111827';
    sCtx.fillRect(0, 0, stockChart.width, stockChart.height);

    // Gridlines
    sCtx.strokeStyle = 'rgba(255, 255, 255, 0.05)';
    sCtx.lineWidth = 1;
    for (let i = 1; i <= 3; i++) {
        const y = (stockChart.height / 4) * i;
        sCtx.beginPath();
        sCtx.moveTo(0, y);
        sCtx.lineTo(stockChart.width, y);
        sCtx.stroke();
    }

    if (history.length < 2) return;

    // Draw price path
    const maxVal = Math.max(...history) * 1.1;
    const minVal = Math.min(...history) * 0.9;
    const valRange = maxVal - minVal;

    const points = history.map((val, idx) => {
        const x = (stockChart.width / (history.length - 1)) * idx;
        const y = stockChart.height - ((val - minVal) / valRange) * (stockChart.height - 20) - 10;
        return { x, y };
    });

    // Draw Line
    sCtx.beginPath();
    sCtx.moveTo(points[0].x, points[0].y);
    for (let i = 1; i < points.length; i++) {
        sCtx.lineTo(points[i].x, points[i].y);
    }
    sCtx.lineWidth = 2.5;
    const isUp = history[history.length - 1] >= history[0];
    sCtx.strokeStyle = isUp ? '#10B981' : '#EF4444';
    sCtx.stroke();

    // Area fill gradient
    sCtx.lineTo(points[points.length - 1].x, stockChart.height);
    sCtx.lineTo(points[0].x, stockChart.height);
    sCtx.closePath();
    const areaGrad = sCtx.createLinearGradient(0, 0, 0, stockChart.height);
    areaGrad.addColorStop(0, isUp ? 'rgba(16, 185, 129, 0.15)' : 'rgba(239, 68, 68, 0.15)');
    areaGrad.addColorStop(1, 'transparent');
    sCtx.fillStyle = areaGrad;
    sCtx.fill();
}

// Trade Triggers
document.getElementById('buy-stock-btn').addEventListener('click', () => {
    const stock = GameState.stocks[GameState.selectedStockTicker];
    if (GameState.gold >= stock.currentPrice) {
        GameState.gold -= stock.currentPrice;
        stock.owned++;
        AudioFX.playCoin();
        renderStocks();
    }
});

document.getElementById('sell-stock-btn').addEventListener('click', () => {
    const stock = GameState.stocks[GameState.selectedStockTicker];
    if (stock.owned > 0) {
        GameState.gold += stock.currentPrice;
        stock.owned--;
        AudioFX.playCoin();
        renderStocks();
    }
});

document.getElementById('buy-all-stock-btn').addEventListener('click', () => {
    const stock = GameState.stocks[GameState.selectedStockTicker];
    const sharesToBuy = Math.floor(GameState.gold / stock.currentPrice);
    if (sharesToBuy > 0) {
        GameState.gold -= sharesToBuy * stock.currentPrice;
        stock.owned += sharesToBuy;
        AudioFX.playCoin();
        renderStocks();
    }
});

document.getElementById('sell-all-stock-btn').addEventListener('click', () => {
    const stock = GameState.stocks[GameState.selectedStockTicker];
    if (stock.owned > 0) {
        GameState.gold += stock.owned * stock.currentPrice;
        GameState.showToast(`주식 전량 매도 완료: +${(stock.owned * Math.round(stock.currentPrice)).toLocaleString()} G`, "success");
        stock.owned = 0;
        AudioFX.playCoin();
        renderStocks();
    }
});

// Periodic Stock Price Fluctuation (every 3 seconds)
setInterval(() => {
    Object.keys(GameState.stocks).forEach(ticker => {
        const stock = GameState.stocks[ticker];
        // Fluctuate price (-8% to +8%)
        let scale = 1 + (Math.random() - 0.49) * 0.15;
        
        // Active News Event influence
        if (stock.activeNewsMultiplier) {
            scale *= stock.activeNewsMultiplier;
            stock.activeNewsMultiplier = null; // consume
        }

        stock.currentPrice = Math.max(10, stock.currentPrice * scale);
        stock.history.push(stock.currentPrice);
        if (stock.history.length > 20) stock.history.shift(); // Max 20 data points
    });

    // Spawn random stock news 15% chance
    if (Math.random() < 0.25) {
        spawnNewsEvent();
    }

    renderStocks();
}, 3000);

function spawnNewsEvent() {
    const news = GameState.newsEvents[Math.floor(Math.random() * GameState.newsEvents.length)];
    const stock = GameState.stocks[news.ticker];
    stock.activeNewsMultiplier = news.multiplier;
    
    const tickerEl = document.getElementById('news-ticker');
    tickerEl.innerText = `[속보] ${news.text}`;
    
    // Play subtle news alert sound
    AudioFX.init();
    if (AudioFX.ctx) {
        const osc = AudioFX.ctx.createOscillator();
        const gain = AudioFX.ctx.createGain();
        osc.connect(gain);
        gain.connect(AudioFX.ctx.destination);
        osc.frequency.setValueAtTime(600, AudioFX.ctx.currentTime);
        osc.frequency.setValueAtTime(450, AudioFX.ctx.currentTime + 0.15);
        gain.gain.setValueAtTime(0.05, AudioFX.ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, AudioFX.ctx.currentTime + 0.3);
        osc.start();
        osc.stop(AudioFX.ctx.currentTime + 0.3);
    }

    GameState.showToast("📰 새로운 경제 찌라시 뉴스 발행!", "info");
}


// 5. Render Auction House System
function renderAuction() {
    const auc = GameState.auction;
    document.getElementById('auction-item-name').innerText = auc.itemName;
    document.getElementById('auction-item-desc').innerText = auc.itemDesc;
    document.getElementById('highest-bidder').innerText = auc.highestBidder;
    document.getElementById('highest-bid-price').innerText = `${Math.floor(auc.highestBid).toLocaleString()} G`;
    
    const logsList = document.getElementById('auction-logs');
    logsList.innerHTML = '';
    auc.logs.slice(-4).reverse().forEach(log => {
        const li = document.createElement('li');
        li.innerHTML = log;
        logsList.appendChild(li);
    });

    const bidBtn = document.getElementById('place-bid-btn');
    const bidCost = Math.floor(auc.highestBid * 1.1);
    bidBtn.innerText = auc.ended 
        ? "경매 완결됨" 
        : `입찰하기 (비용: ${bidCost.toLocaleString()} G)`;
    bidBtn.disabled = auc.ended || GameState.gold < bidCost;
}

function updateAuctionTimer(dt) {
    const auc = GameState.auction;
    if (auc.ended) return;

    auc.timeLeft -= dt / 1000;
    
    if (auc.timeLeft <= 0) {
        triggerAuctionEnd();
    } else {
        // Humanized countdown format
        const sec = Math.ceil(auc.timeLeft);
        document.getElementById('auction-timer').innerText = `00:${sec < 10 ? '0' : ''}${sec}`;

        // Simulated NPC bids (randomly every few seconds)
        if (Math.random() < 0.04 && auc.timeLeft > 2) {
            npcMakeBid();
        }
    }
}

function npcMakeBid() {
    const auc = GameState.auction;
    const bidCost = Math.floor(auc.highestBid * (1.1 + Math.random() * 0.1));
    const bidder = auc.baseBids[Math.floor(Math.random() * auc.baseBids.length)];
    
    if (bidCost <= bidder.max) {
        auc.highestBid = bidCost;
        auc.highestBidder = bidder.name;
        auc.logs.push(`📢 <span>[${bidder.name}]</span> 님이 ${bidCost.toLocaleString()} G로 상향 입찰!`);
        AudioFX.playJump(); // subtle ping
        renderAuction();
    }
}

document.getElementById('place-bid-btn').addEventListener('click', () => {
    const auc = GameState.auction;
    const bidCost = Math.floor(auc.highestBid * 1.1);

    if (GameState.gold >= bidCost) {
        GameState.gold -= bidCost;
        auc.highestBid = bidCost;
        auc.highestBidder = "플레이어 (나)";
        auc.hasBid = true;
        auc.logs.push(`⭐ <span>[플레이어]</span> 님이 ${bidCost.toLocaleString()} G로 최고가 입찰!!`);
        AudioFX.playCoin();
        renderAuction();
    }
});

function triggerAuctionEnd() {
    const auc = GameState.auction;
    auc.ended = true;

    if (auc.highestBidder === "플레이어 (나)") {
        auc.hasPlayerWon = true;
        AudioFX.playClear();
        auc.itemEffect(); // trigger buff
        GameState.showToast(`🎉 축하합니다! 경매 입찰 낙찰에 성공했습니다!`, "gold");
    } else {
        GameState.showToast(`⚠️ 경매 유찰... 낙찰인: ${auc.highestBidder}`, "danger");
    }

    renderAuction();

    // Reset with new auction after 10 seconds
    setTimeout(resetAuctionItem, 10000);
}

const rareAuctionItems = [
    { name: "전설 마우스 [지무선 PRO]", desc: "플레이어 점프 대기 시간 제거 및 더블점프 속도 +30%", effect: () => {
        GameState.equipment.shoes_double_jump.jumpForce *= 1.1;
        GameState.showToast("💎 [전설 마우스] 낙찰 효과! 점프력 +10% 영구 상승!", "success");
    }},
    { name: "지하 사설 카지노 증서", desc: "매 5초마다 주식 한 주 무작위 증여 (고정 수익 자산)", effect: () => {
        setInterval(() => {
            const stockKeys = Object.keys(GameState.stocks);
            const rStock = GameState.stocks[stockKeys[Math.floor(Math.random() * stockKeys.length)]];
            rStock.owned++;
            GameState.showToast(`🎰 사설 카지노 수입: ${rStock.name} 주식 1주 배당!`, "info");
            renderStocks();
        }, 8000);
    }},
    { name: "황금 스프링 블록 권한", desc: "코인 수확 보너스 보상 배율 1.5배 상승", effect: () => {
        GameState.showToast("💎 [황금 스프링] 효과 발동! 모든 직접 플레이 골드 수확량 1.5배 상승!", "success");
    }}
];

// --- 10. Global Account Data & Slot Manager ---

function loadGlobalAccountData() {
    GameState.credits = parseInt(localStorage.getItem('jump_map_tycoon_credits') || '0');
    GameState.highStageRecord = parseInt(localStorage.getItem('jump_map_tycoon_high_stage') || '1');
    
    // Load unlocked companions
    const unlockedStr = localStorage.getItem('jump_map_tycoon_unlocked_ais');
    if (unlockedStr) {
        try {
            unlockedAiCompanions = JSON.parse(unlockedStr);
        } catch (e) {
            unlockedAiCompanions = ['team_rookie'];
        }
    } else {
        unlockedAiCompanions = ['team_rookie'];
    }

    // Update account displays in Title
    const creditsDisp = document.getElementById('global-credits-display');
    if (creditsDisp) creditsDisp.innerText = `${GameState.credits} CR`;
    const recordDisp = document.getElementById('global-high-record');
    if (recordDisp) recordDisp.innerText = `STAGE ${GameState.highStageRecord}`;

    // Update in-game top badge
    const creditAmt = document.getElementById('credit-amount');
    if (creditAmt) creditAmt.innerText = GameState.credits;
}

function saveGlobalAccountData() {
    localStorage.setItem('jump_map_tycoon_credits', GameState.credits);
    localStorage.setItem('jump_map_tycoon_high_stage', GameState.highStageRecord);
    localStorage.setItem('jump_map_tycoon_unlocked_ais', JSON.stringify(unlockedAiCompanions));
}

// Generate slot profiles HTML in the Single Player Menu
function renderSaveSlots() {
    const container = document.getElementById('slot-list-container');
    if (!container) return;
    container.innerHTML = '';

    for (let slot = 1; slot <= 3; slot++) {
        const key = `jump_map_tycoon_slot_${slot}`;
        const dataStr = localStorage.getItem(key);
        const slotCard = document.createElement('div');
        slotCard.style.background = 'rgba(255, 255, 255, 0.04)';
        slotCard.style.border = '1px solid rgba(255, 255, 255, 0.08)';
        slotCard.style.padding = '14px';
        slotCard.style.borderRadius = '12px';
        slotCard.style.display = 'flex';
        slotCard.style.justifyContent = 'space-between';
        slotCard.style.alignItems = 'center';

        if (dataStr) {
            try {
                const data = JSON.parse(dataStr);
                const stage = data.stage ?? 1;
                const gold = data.gold ?? 0;
                
                slotCard.innerHTML = `
                    <div style="display:flex; flex-direction:column; gap:4px;">
                        <span style="font-weight:bold; color:#6366f1; font-size:1.05rem;">💾 기록 슬롯 ${slot}</span>
                        <span style="font-size:0.85rem; color:#cbd5e1;">최종 도달: <strong>STAGE ${stage}</strong></span>
                        <span style="font-size:0.85rem; color:#f59e0b;">보유 재화: <strong>${gold.toLocaleString()} G</strong></span>
                    </div>
                    <div style="display:flex; gap:8px;">
                        <button onclick="selectSaveSlot(${slot}, 'load')" class="start-btn primary" style="padding: 8px 14px; font-size: 0.85rem; cursor: pointer; border-radius: 8px;">이어서 하기</button>
                        <button onclick="selectSaveSlot(${slot}, 'delete')" class="start-btn danger" style="padding: 8px 14px; font-size: 0.85rem; cursor: pointer; background:#ef4444; border-radius: 8px; border:none; font-weight:bold; color:white;">삭제</button>
                    </div>
                `;
            } catch (e) {
                slotCard.innerHTML = `<span style="color:#ef4444;">기록 손상됨 (슬롯 ${slot})</span>`;
            }
        } else {
            slotCard.innerHTML = `
                <div style="display:flex; flex-direction:column; gap:4px;">
                    <span style="font-weight:bold; color:#94a3b8; font-size:1.05rem;">EMPTY 슬롯 ${slot}</span>
                    <span style="font-size:0.85rem; color:#64748b;">기록이 없습니다.</span>
                </div>
                <button onclick="selectSaveSlot(${slot}, 'new')" class="start-btn success" style="padding: 10px 16px; font-size: 0.85rem; cursor: pointer; border-radius: 8px; border:none; font-weight:bold; color:white;">새로운 게임</button>
            `;
        }
        container.appendChild(slotCard);
    }
}

// Handler for Slot Actions
window.selectSaveSlot = function(slot, action) {
    const key = `jump_map_tycoon_slot_${slot}`;
    
    if (action === 'new') {
        // Reset local game state to start a fresh game
        GameState.gold = 500;
        GameState.stage = 1;
        GameState.currentSaveSlot = slot;
        GameState.isMultiplayerMode = false;
        
        Object.keys(GameState.equipment).forEach(id => {
            GameState.equipment[id].level = 0;
        });
        Object.keys(GameState.enchantments).forEach(id => {
            GameState.enchantments[id] = { option: null, value: 0 };
        });
        GameState.albas.forEach(a => { a.level = 0; a.currentTimer = 0; });
        
        // Save initial state instantly
        saveGame(slot);
        
        loadStage(1);
        renderAlbas();
        renderShop();
        
        document.getElementById('start-screen-overlay').classList.add('hidden');
        GameState.isPaused = false;
        GameState.showToast(`슬롯 ${slot}에 새로운 점프 제국 기록이 생성되었습니다!`, "success");
        
    } else if (action === 'load') {
        GameState.currentSaveSlot = slot;
        GameState.isMultiplayerMode = false;
        loadGame(slot);
        
        document.getElementById('start-screen-overlay').classList.add('hidden');
        GameState.isPaused = false;
        
    } else if (action === 'delete') {
        if (confirm(`정말로 슬롯 ${slot}의 모든 데이터를 영구 삭제하시겠습니까?`)) {
            localStorage.removeItem(key);
            GameState.showToast(`슬롯 ${slot} 기록이 완전히 삭제되었습니다.`, "danger");
            renderSaveSlots();
        }
    }
};

// Slot Specific Save / Load
function saveGame(slot) {
    const slotKey = `jump_map_tycoon_slot_${slot}`;
    const saveData = {
        gold: GameState.gold,
        stage: GameState.stage,
        equipment: GameState.equipment,
        enchantments: GameState.enchantments,
        albas: GameState.albas.map(a => ({ id: a.id, level: a.level }))
    };
    localStorage.setItem(slotKey, JSON.stringify(saveData));
    GameState.showToast(`💾 슬롯 ${slot}에 플레이가 자동 저장되었습니다!`, "success");
}

function loadGame(slot) {
    const slotKey = `jump_map_tycoon_slot_${slot}`;
    const dataStr = localStorage.getItem(slotKey);
    if (dataStr) {
        try {
            const data = JSON.parse(dataStr);
            GameState.gold = data.gold ?? GameState.gold;
            GameState.stage = data.stage ?? GameState.stage;
            
            if (data.equipment) {
                Object.keys(data.equipment).forEach(id => {
                    if (GameState.equipment[id]) {
                        GameState.equipment[id].level = data.equipment[id].level;
                        if (data.equipment[id].cost) GameState.equipment[id].cost = data.equipment[id].cost;
                    }
                });
            }
            if (data.enchantments) {
                Object.keys(data.enchantments).forEach(id => {
                    if (GameState.enchantments[id]) {
                        GameState.enchantments[id] = data.enchantments[id];
                    }
                });
            }
            if (data.albas) {
                data.albas.forEach(savedAlba => {
                    const alba = GameState.albas.find(a => a.id === savedAlba.id);
                    if (alba) alba.level = savedAlba.level;
                });
            }
            
            loadStage(GameState.stage);
            renderAlbas();
            renderShop();
            
            GameState.showToast(`📂 슬롯 ${slot} 저장 데이터를 불러왔습니다!`, "success");
        } catch (e) {
            console.error("Save load failed", e);
            GameState.showToast("저장 파일 로딩에 실패했습니다.", "danger");
        }
    }
}


// --- 11. Multi-Menu Interface and Lobby Navigation ---

function renderMultiplayerAiRoster() {
    const list = document.getElementById('multi-ai-roster');
    if (!list) return;
    list.innerHTML = '';

    companionStore.forEach(ai => {
        const isUnlocked = unlockedAiCompanions.includes(ai.id);
        const isSelected = selectedAiCompanions.includes(ai.id);
        
        const card = document.createElement('div');
        card.style.display = 'flex';
        card.style.justifyContent = 'space-between';
        card.style.alignItems = 'center';
        card.style.padding = '12px 14px';
        card.style.background = isSelected ? 'rgba(99, 102, 241, 0.12)' : 'rgba(255, 255, 255, 0.03)';
        card.style.border = isSelected ? '1px solid #6366f1' : '1px solid rgba(255, 255, 255, 0.08)';
        card.style.borderRadius = '10px';
        card.style.transition = 'all 0.2s';

        let actionHtml = '';
        if (isUnlocked) {
            actionHtml = `
                <button onclick="toggleSelectCompanion('${ai.id}')" class="start-btn ${isSelected ? 'success' : 'primary'}" style="padding: 6px 12px; font-size: 0.8rem; cursor: pointer; border: none; border-radius: 6px; font-weight: bold; background: ${isSelected ? '#10b981' : '#4f46e5'}; color: white;">
                    ${isSelected ? '✅ 대동됨' : '팀원 배치'}
                </button>
            `;
        } else {
            actionHtml = `
                <button onclick="purchaseCompanion('${ai.id}', ${ai.cost})" class="start-btn" style="padding: 6px 12px; font-size: 0.8rem; cursor: pointer; background: #f59e0b; border: none; border-radius: 6px; font-weight: bold; color: white;">
                    💎 영입: ${ai.cost} CR
                </button>
            `;
        }

        card.innerHTML = `
            <div style="display:flex; align-items:center; gap:10px;">
                <span style="font-size: 1.6rem; filter: drop-shadow(0 0 5px ${ai.color});">${ai.icon}</span>
                <div style="display:flex; flex-direction:column; gap:2px;">
                    <span style="font-weight:bold; color: ${ai.color}; font-size:0.9rem;">${ai.name}</span>
                    <span style="font-size:0.75rem; color:#cbd5e1; line-height:1.2;">속도: ${ai.speed.toFixed(1)} | ${ai.desc}</span>
                </div>
            </div>
            <div>${actionHtml}</div>
        `;
        list.appendChild(card);
    });
}

window.purchaseCompanion = function(id, cost) {
    if (GameState.credits >= cost) {
        GameState.credits -= cost;
        unlockedAiCompanions.push(id);
        saveGlobalAccountData();
        AudioFX.playClear();
        GameState.showToast("🎉 새로운 AI 팀원 영입에 성공했습니다!", "success");
        renderMultiplayerAiRoster();
        loadGlobalAccountData(); // Refresh UI Displays
    } else {
        GameState.showToast(`크레딧이 부족합니다! (필요: ${cost} CR / 보유: ${GameState.credits} CR)`, "danger");
    }
};

window.toggleSelectCompanion = function(id) {
    const idx = selectedAiCompanions.indexOf(id);
    if (idx !== -1) {
        selectedAiCompanions.splice(idx, 1);
        AudioFX.playJump();
        GameState.showToast("팀원에서 제외되었습니다.", "info");
    } else {
        // Enforce max 3 AIs limit
        if (selectedAiCompanions.length >= 3) {
            GameState.showToast("AI 팀원은 한 팀에 최대 3명까지만 선택할 수 있습니다!", "danger");
            return;
        }
        selectedAiCompanions.push(id);
        AudioFX.playCoin();
        GameState.showToast("AI 팀원에 추가 배치되었습니다!", "success");
    }
    renderMultiplayerAiRoster();
};

// Nav Toggles in Title
document.getElementById('menu-btn-single').addEventListener('click', () => {
    document.getElementById('start-main-menu').style.display = 'none';
    document.getElementById('start-single-menu').style.display = 'block';
    renderSaveSlots();
});

document.getElementById('single-back-btn').addEventListener('click', () => {
    document.getElementById('start-single-menu').style.display = 'none';
    document.getElementById('start-main-menu').style.display = 'block';
    loadGlobalAccountData();
});

document.getElementById('menu-btn-multi').addEventListener('click', () => {
    document.getElementById('start-main-menu').style.display = 'none';
    document.getElementById('start-multi-menu').style.display = 'block';
    renderMultiplayerAiRoster();
});

document.getElementById('multi-back-btn').addEventListener('click', () => {
    document.getElementById('start-multi-menu').style.display = 'none';
    document.getElementById('start-main-menu').style.display = 'block';
    loadGlobalAccountData();
});

// Multiplayer Lobby Actions
document.getElementById('multi-start-ai-btn').addEventListener('click', () => {
    if (selectedAiCompanions.length === 0) {
        GameState.showToast("대결할 AI 팀원을 최소 한 명 이상 선택하세요!", "danger");
        return;
    }

    GameState.isMultiplayerMode = true;
    
    // Fresh stats for multiplayer race
    GameState.gold = 0; 
    GameState.stage = 1;

    loadStage(1);
    
    // Spawn all selected AI companions simultaneously
    activeAiTeammates = [];
    selectedAiCompanions.forEach((id, index) => {
        const spec = companionStore.find(c => c.id === id);
        if (spec) {
            activeAiTeammates.push({
                x: 50 + index * 15, // slightly staggered
                y: 300,
                vx: 0,
                vy: 0,
                width: 24,
                height: 24,
                speed: spec.speed,
                color: spec.color,
                name: spec.name,
                icon: spec.icon,
                isGrounded: false,
                jumpCount: 0
            });
        }
    });

    renderAlbas();
    renderShop();

    document.getElementById('start-screen-overlay').classList.add('hidden');
    GameState.isPaused = false;
    
    GameState.showToast(`👥 AI ${activeAiTeammates.length}인 협동 대결 매치가 성사되었습니다!`, "success");
});

// Simulated real user matchmaking lobby search
document.getElementById('multi-match-real-btn').addEventListener('click', () => {
    const btn = document.getElementById('multi-match-real-btn');
    btn.disabled = true;
    btn.innerText = "🔍 대기실 유저 검색 중...";
    
    setTimeout(() => {
        btn.innerText = "👥 대기 유저 연결 중 (1/2)...";
        setTimeout(() => {
            alert("🔒 멀티플레이 베타 버전 알림\n\n현재 실제 유저 멀티플레이 연결 대기열이 작동 중이나, 보안 소켓 서버 점검으로 인해 임시 차단되었습니다.\n\n이 기능은 차기 글로벌 업데이트에서 정식 오픈될 예정입니다! 현재 제공되는 'AI 팀 대결 매치'는 완벽히 즐기실 수 있습니다.");
            btn.disabled = false;
            btn.innerText = "👥 실시간 유저 대기열 진입";
        }, 1500);
    }, 1500);
});


// ESC Pause management
function pauseGame() {
    GameState.isPaused = true;
    document.getElementById('esc-menu-overlay').classList.remove('hidden');
}

function resumeGame() {
    GameState.isPaused = false;
    document.getElementById('esc-menu-overlay').classList.add('hidden');
}

function togglePauseMenu() {
    const startOverlay = document.getElementById('start-screen-overlay');
    if (!startOverlay.classList.contains('hidden')) return; // No pause in Start Screen

    const tycoon = document.querySelector('.tycoon-section');
    if (tycoon.classList.contains('full-screen-menu')) {
        // Pressing ESC inside fullscreen Tycoon menu goes back to ESC menu
        tycoon.classList.remove('full-screen-menu');
        document.getElementById('esc-menu-overlay').classList.remove('hidden');
    } else {
        if (GameState.isPaused) {
            resumeGame();
        } else {
            pauseGame();
        }
    }
}

// Global Keylistener for ESC
window.addEventListener('keydown', (e) => {
    if (e.code === 'Escape') {
        e.preventDefault();
        togglePauseMenu();
    }
});

// ESC menu action bindings
document.getElementById('esc-btn-continue').addEventListener('click', () => {
    resumeGame();
});

document.getElementById('esc-btn-menu').addEventListener('click', () => {
    // Hide pause box and expand tycoon section to fullscreen
    document.getElementById('esc-menu-overlay').classList.add('hidden');
    
    const tycoon = document.querySelector('.tycoon-section');
    tycoon.classList.add('full-screen-menu');
    
    // Refresh Stock chart if needed
    const stockTab = document.querySelector('[data-tab="stock-panel"]');
    if (stockTab.classList.contains('active')) {
        setTimeout(drawStockChart, 50);
    }
});

function closeFullscreenMenu() {
    const tycoon = document.querySelector('.tycoon-section');
    tycoon.classList.remove('full-screen-menu');
    // Return back to paused ESC overlay menu
    document.getElementById('esc-menu-overlay').classList.remove('hidden');
}

document.getElementById('close-menu-btn').addEventListener('click', () => {
    closeFullscreenMenu();
});

// Options Menu toggles
document.getElementById('esc-btn-options').addEventListener('click', () => {
    document.getElementById('esc-menu-overlay').classList.add('hidden');
    document.getElementById('options-modal-overlay').classList.remove('hidden');
});

document.getElementById('options-btn-close').addEventListener('click', () => {
    document.getElementById('options-modal-overlay').classList.add('hidden');
    document.getElementById('esc-menu-overlay').classList.remove('hidden');
});

// Sound Volume slider handler
const volSlider = document.getElementById('sound-volume-slider');
volSlider.addEventListener('input', (e) => {
    GameState.soundVolume = parseInt(e.target.value);
});

// Screen Brightness slider handler (Applies CSS filter to app container)
const brightnessSlider = document.getElementById('brightness-slider');
brightnessSlider.addEventListener('input', (e) => {
    const val = e.target.value;
    document.querySelector('.main-container').style.filter = `brightness(${val}%)`;
});

// Save & Exit game triggers
document.getElementById('esc-btn-exit').addEventListener('click', () => {
    if (!GameState.isMultiplayerMode) {
        saveGame(GameState.currentSaveSlot);
    } else {
        GameState.showToast("멀티플레이 매치 기록은 싱글 플레이 슬롯에 저장되지 않습니다.", "info");
    }
    
    // Save overall global account properties
    saveGlobalAccountData();

    // Return back to Start Screen overlay
    document.getElementById('esc-menu-overlay').classList.add('hidden');
    document.getElementById('start-screen-overlay').classList.remove('hidden');
    
    // Reset Start screen sections
    document.getElementById('start-main-menu').style.display = 'block';
    document.getElementById('start-single-menu').style.display = 'none';
    document.getElementById('start-multi-menu').style.display = 'none';
    
    loadGlobalAccountData();
});


// Override triggerStageClear to support global high records and credits
function triggerStageClear() {
    AudioFX.playClear();
    
    // Local Gold Reward
    const clearBonus = 200 * GameState.stage;
    GameState.gold += clearBonus;
    
    // GLOBAL CURRENCY AWARD: 300 Credits every stage clear!
    GameState.credits += 300;
    
    GameState.showToast(`✨ STAGE ${GameState.stage} 클리어! (+${clearBonus}G | +300 CR 💎)`, "success");
    createStageClearEffect();

    // New high stage record check
    if (GameState.stage > GameState.highStageRecord) {
        GameState.highStageRecord = GameState.stage;
        createFloatingText("🏆 최대 신기록 달성!!! 🏆", player.x, player.y - 45, "#F59E0B");
        GameState.showToast(`👑 신기록 갱신! 최대 도달 기록이 STAGE ${GameState.stage}로 늘어났습니다!`, "gold");
    }

    // Save progress instantly (if single player mode)
    if (!GameState.isMultiplayerMode) {
        saveGame(GameState.currentSaveSlot);
    }
    saveGlobalAccountData();

    // Move to next stage
    GameState.stage++;
    
    // If multiplayer mode, respawn AI companion at start coordinates as well
    loadStage(GameState.stage);
    if (GameState.isMultiplayerMode && GameState.selectedMultiplayerAi) {
        const spec = GameState.selectedMultiplayerAi;
        activeAiTeammates = [{
            x: 50,
            y: 300,
            vx: 0,
            vy: 0,
            width: 24,
            height: 24,
            speed: spec.speed,
            color: spec.color,
            name: spec.name,
            icon: spec.icon,
            isGrounded: false,
            jumpCount: 0
        }];
    }
}


// --- 12. Initialization & Loop Drivers ---
function initGame() {
    // Load Global Account Data (Credits, High Stage Record)
    loadGlobalAccountData();
    
    // Pause game at startup (forces user to click start buttons)
    GameState.isPaused = true;

    // Stage Generation
    loadStage(1);

    // Initial Renders
    renderAlbas();
    renderShop();
    renderStocks();
    renderAuction();

    // Kick off animation and simulation loops
    requestAnimationFrame(mainGameLoop);
}

// 60FPS Game physics and rendering loop
function mainGameLoop() {
    updatePhysics();
    drawGame();
    if (!GameState.isPaused) {
        runTycoonEngine(); // Fast async timer integration
    }
    
    requestAnimationFrame(mainGameLoop);
}

// Start everything up!
initGame();
