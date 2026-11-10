const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const deathCounterEl = document.getElementById('death-counter');

// 게임 설정
const GRAVITY = 0.6;
const WALK_SPEED = 4;
const JUMP_FORCE = -12;
const MAP_WIDTH = 2800; // 3.5 화면 분량의 가로 길이
const VIEW_WIDTH = 800;
const VIEW_HEIGHT = 600;

// 오디오 컨텍스트 (브라우저 정책 상 첫 상호작용 시 활성화)
let audioCtx = null;

function initAudio() {
    if (!audioCtx) {
        audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    }
}

// 엄청 짜증나는 레트로 "콰-콰-콰-콰아아아" (사망 실패음) 재생
function playDeathSound() {
    initAudio();
    if (!audioCtx) return;

    // 혹시 정지 상태라면 재개
    if (audioCtx.state === 'suspended') {
        audioCtx.resume();
    }

    const now = audioCtx.currentTime;
    
    // 4단계 하강 불협화음 (사우투스 파형으로 시끄럽고 거슬리게)
    const notes = [
        { freq: 330, dur: 0.15, delay: 0 },      // E4
        { freq: 294, dur: 0.15, delay: 0.15 },   // D4
        { freq: 262, dur: 0.15, delay: 0.3 },    // C4
        { freq: 220, dur: 0.6, delay: 0.45, slide: 120 } // A3 -> 하강 슬라이드
    ];

    notes.forEach(note => {
        const osc = audioCtx.createOscillator();
        const gainNode = audioCtx.createGain();
        
        // 거슬리는 톱니파 또는 사각파 사용
        osc.type = Math.random() > 0.5 ? 'sawtooth' : 'square';
        
        const noteTime = now + note.delay;
        osc.frequency.setValueAtTime(note.freq, noteTime);
        
        if (note.slide) {
            osc.frequency.exponentialRampToValueAtTime(note.slide, noteTime + note.dur);
        }
        
        // 불협화음 볼륨 설정
        gainNode.gain.setValueAtTime(0.2, noteTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, noteTime + note.dur);
        
        osc.connect(gainNode);
        gainNode.connect(audioCtx.destination);
        
        osc.start(noteTime);
        osc.stop(noteTime + note.dur);
    });

    // 불협화음 화음 비프음 (동시에 재생해서 기분 나쁜 소리 만들기)
    const oscHarm = audioCtx.createOscillator();
    const gainHarm = audioCtx.createGain();
    oscHarm.type = 'sawtooth';
    oscHarm.frequency.setValueAtTime(145, now); // 베이스의 징그러운 저음
    oscHarm.frequency.linearRampToValueAtTime(60, now + 0.8);
    gainHarm.gain.setValueAtTime(0.15, now);
    gainHarm.gain.linearRampToValueAtTime(0.01, now + 0.8);
    oscHarm.connect(gainHarm);
    gainHarm.connect(audioCtx.destination);
    oscHarm.start(now);
    oscHarm.stop(now + 0.8);
}

// 점프 시 뿅 하는 기분 나쁜 고주파 효과음
function playJumpSound() {
    initAudio();
    if (!audioCtx) return;
    if (audioCtx.state === 'suspended') audioCtx.resume();

    const now = audioCtx.currentTime;
    const osc = audioCtx.createOscillator();
    const gainNode = audioCtx.createGain();
    
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(150, now);
    osc.frequency.exponentialRampToValueAtTime(600, now + 0.15); // 급격하게 치솟는 기분 나쁜 피치
    
    gainNode.gain.setValueAtTime(0.15, now);
    gainNode.gain.exponentialRampToValueAtTime(0.01, now + 0.15);
    
    osc.connect(gainNode);
    gainNode.connect(audioCtx.destination);
    osc.start(now);
    osc.stop(now + 0.15);
}

// 키 입력 상태
const keys = {
    left: false,
    right: false,
    up: false,
    r: false
};

// 키 이벤트 리스너
window.addEventListener('keydown', (e) => {
    initAudio(); // 첫 키 입력 시 오디오 활성화
    if (e.code === 'ArrowLeft' || e.code === 'KeyA') keys.left = true;
    if (e.code === 'ArrowRight' || e.code === 'KeyD') keys.right = true;
    if (e.code === 'Space' || e.code === 'ArrowUp' || e.code === 'KeyW') keys.up = true;
    if (e.code === 'KeyR') {
        if (!keys.r) {
            keys.r = true;
            player.die("R키 자진 리스폰");
        }
    }
});

window.addEventListener('keyup', (e) => {
    if (e.code === 'ArrowLeft' || e.code === 'KeyA') keys.left = false;
    if (e.code === 'ArrowRight' || e.code === 'KeyD') keys.right = false;
    if (e.code === 'Space' || e.code === 'ArrowUp' || e.code === 'KeyW') keys.up = false;
    if (e.code === 'KeyR') keys.r = false;
});

// 카메라 정보
const camera = {
    x: 0,
    update: function(targetX) {
        // 플레이어가 화면 중심 부근에 도달하면 스크롤
        let targetCamX = targetX - VIEW_WIDTH / 2;
        if (targetCamX < 0) targetCamX = 0;
        if (targetCamX > MAP_WIDTH - VIEW_WIDTH) targetCamX = MAP_WIDTH - VIEW_WIDTH;
        // 자연스러운 카메라 움직임
        this.x += (targetCamX - this.x) * 0.1;
    }
};

// 억까 문구 모음
const deathMessages = [
    "님 ㅋ 개못하네요",
    "아 그걸 맞네;",
    "설마 이걸 모름?",
    "여기 함정인 거 전 세계가 다 앎",
    "키보드 샷건 금지!",
    "응 또 죽었쥬? 킹받쥬?",
    "일부러 죽어준 거 맞죠?",
    "여기가 당신 무덤입니다."
];
let currentDeathMessage = "";

// 플레이어 클래스 (졸라맨)
class Player {
    constructor() {
        this.reset();
        this.deathCount = 0;
    }

    reset() {
        this.x = 80;
        this.y = 350;
        this.width = 24;
        this.height = 48;
        this.vx = 0;
        this.vy = 0;
        this.isGrounded = false;
        this.facingRight = true;
        this.isDead = false;
        this.deathTimer = 0;
        this.walkCycle = 0; // 졸라맨 다리 꼬기 애니메이션용
    }

    die(reason) {
        if (this.isDead) return;
        this.isDead = true;
        this.deathTimer = 90; // 약 1.5초간 시체 유지 및 화면 정지
        this.deathCount++;
        deathCounterEl.textContent = `사망 횟수: ${this.deathCount}`;
        
        // 랜덤 짜증나는 사망 메시지 선택
        currentDeathMessage = deathMessages[Math.floor(Math.random() * deathMessages.length)];
        console.log(`사망 원인: ${reason}`);
        
        // 짜증나는 불협화음 사망 사운드 재생
        playDeathSound();
    }

    update() {
        if (this.isDead) {
            this.deathTimer--;
            // 천천히 낙하하면서 소멸하는 효과
            this.vy += 0.3;
            this.y += this.vy;
            if (this.deathTimer <= 0) {
                respawn();
            }
            return;
        }

        // 좌우 이동 처리
        if (keys.left) {
            this.vx = -WALK_SPEED;
            this.facingRight = false;
            this.walkCycle += 0.15;
        } else if (keys.right) {
            this.vx = WALK_SPEED;
            this.facingRight = true;
            this.walkCycle += 0.15;
        } else {
            this.vx = 0;
            this.walkCycle = 0;
        }

        // 점프 처리
        if (keys.up && this.isGrounded) {
            this.vy = JUMP_FORCE;
            this.isGrounded = false;
            playJumpSound();
        }

        // 중력 적용
        this.vy += GRAVITY;
        if (this.vy > 12) this.vy = 12; // 최대 하강 속도 제한

        // 물리 업데이트
        this.x += this.vx;
        this.handleCollisions('horizontal');

        this.y += this.vy;
        this.isGrounded = false;
        this.handleCollisions('vertical');

        // 낙사 판정
        if (this.y > VIEW_HEIGHT + 100) {
            this.die("낙사");
        }

        // 맵 좌측 제한
        if (this.x < 0) this.x = 0;
    }

    handleCollisions(direction) {
        // 레벨 전체 오브젝트와 충돌 검사
        for (let obj of mapObjects) {
            if (!obj.active) continue;

            // 충돌 체크 (AABB)
            if (this.x < obj.x + obj.w &&
                this.x + this.width > obj.x &&
                this.y < obj.y + obj.h &&
                this.y + this.height > obj.y) {

                // 1. 치명적인 함정 (가시 등)
                if (obj.isLethal) {
                    this.die("가시/함정에 부딪힘");
                    return;
                }

                // 2. 가짜 골인 깃발 충돌
                if (obj.isGoal) {
                    if (!obj.triggered) {
                        obj.triggered = true;
                        obj.triggerAction();
                    }
                    continue;
                }

                // 3. 페이크 바닥 (스위치형 가짜)
                if (obj.isFakeFloor) {
                    if (!obj.triggered) {
                        obj.triggered = true;
                        obj.vy = 4; // 아래로 뚝 떨어짐
                    }
                }

                // 4. 일반 블록/머리 위 투명 블록 충돌 처리
                if (direction === 'horizontal') {
                    // 벽 충돌 (가짜 블록이 아직 트리거 안 되었다면 비활성)
                    if (obj.isInvisible && !obj.revealed) continue;

                    if (this.vx > 0) {
                        this.x = obj.x - this.width;
                    } else if (this.vx < 0) {
                        this.x = obj.x + obj.w;
                    }
                } else if (direction === 'vertical') {
                    // 투명 블록 처리
                    if (obj.isInvisible) {
                        // 머리 위 충돌만 감지해서 트리거
                        if (this.vy < 0 && (this.y + 5 > obj.y + obj.h) && !obj.revealed) {
                            obj.revealed = true;
                            obj.color = "#8b4513"; // 갈색 단단한 블록으로 변함
                            this.vy = 0; // 머리 부딪히고 수직 속도 리셋 (밑으로 떨어짐)
                            this.y = obj.y + obj.h;
                            playBlockRevealSound();
                        }
                        if (!obj.revealed) continue; // 투명 블록이 아직 안 깨졌으면 위로 통과
                    }

                    // 수직 충돌 해결 (바닥 밟기 / 천장 박기)
                    if (this.vy > 0) { // 하강 중 (바닥 안착)
                        this.y = obj.y - this.height;
                        this.vy = 0;
                        this.isGrounded = true;
                    } else if (this.vy < 0) { // 상승 중 (머리 박음)
                        this.y = obj.y + obj.h;
                        this.vy = 0;
                    }
                }
            }
        }
    }

    draw() {
        ctx.save();
        ctx.translate(-camera.x, 0);

        if (this.isDead) {
            // 죽었을 때 킹받게 뱅글뱅글 돌며 붉은색으로 그리기
            ctx.translate(this.x + this.width / 2, this.y + this.height / 2);
            ctx.rotate(this.deathTimer * 0.1);
            ctx.strokeStyle = '#ff0000';
            ctx.fillStyle = '#ff0000';
            this.drawStickman(0, 0, true);
        } else {
            ctx.strokeStyle = '#000000';
            ctx.fillStyle = '#000000';
            this.drawStickman(this.x, this.y, false);
        }

        ctx.restore();
    }

    drawStickman(x, y, deadState) {
        ctx.lineWidth = 3;
        ctx.lineCap = 'round';

        let offsetX = deadState ? 0 : x;
        let offsetY = deadState ? 0 : y;

        // 1. 머리 (반지름 7)
        let headR = 7;
        let headX = offsetX + this.width / 2;
        let headY = offsetY + headR + 2;
        
        ctx.beginPath();
        ctx.arc(headX, headY, headR, 0, Math.PI * 2);
        ctx.stroke();
        
        // 죽었으면 눈을 X X 로 표시
        if (deadState) {
            ctx.lineWidth = 1.5;
            ctx.beginPath();
            ctx.moveTo(headX - 3, headY - 3); ctx.lineTo(headX - 1, headY - 1);
            ctx.moveTo(headX - 1, headY - 3); ctx.lineTo(headX - 3, headY - 1);
            ctx.moveTo(headX + 1, headY - 3); ctx.lineTo(headX + 3, headY - 1);
            ctx.moveTo(headX + 3, headY - 3); ctx.lineTo(headX + 1, headY - 1);
            ctx.stroke();
            ctx.lineWidth = 3;
        } else {
            // 방향에 따른 눈점 찍기
            ctx.fillStyle = '#000000';
            ctx.beginPath();
            let eyeX = this.facingRight ? headX + 3 : headX - 3;
            ctx.arc(eyeX, headY - 1, 1.5, 0, Math.PI * 2);
            ctx.fill();
        }

        // 2. 몸통 (목에서 골반까지)
        let neckY = headY + headR;
        let pelvisY = offsetY + this.height * 0.6;
        ctx.beginPath();
        ctx.moveTo(headX, neckY);
        ctx.lineTo(headX, pelvisY);
        ctx.stroke();

        // 3. 팔 (달리기 애니메이션 적용)
        ctx.beginPath();
        let armY = neckY + 4;
        if (deadState) {
            // 무기력하게 벌려진 팔
            ctx.moveTo(headX, armY); ctx.lineTo(headX - 12, armY - 5);
            ctx.moveTo(headX, armY); ctx.lineTo(headX + 12, armY - 5);
        } else if (!this.isGrounded) {
            // 만세 형태 (점프/공중)
            ctx.moveTo(headX, armY); ctx.lineTo(headX - 10, armY - 10);
            ctx.moveTo(headX, armY); ctx.lineTo(headX + 10, armY - 10);
        } else if (this.vx !== 0) {
            // 뛰는 애니메이션 (walkCycle 기반 흔들림)
            let swing = Math.sin(this.walkCycle) * 10;
            ctx.moveTo(headX, armY); ctx.lineTo(headX - 8, armY + swing);
            ctx.moveTo(headX, armY); ctx.lineTo(headX + 8, armY - swing);
        } else {
            // 차렷 자세
            ctx.moveTo(headX, armY); ctx.lineTo(headX - 6, armY + 12);
            ctx.moveTo(headX, armY); ctx.lineTo(headX + 6, armY + 12);
        }
        ctx.stroke();

        // 4. 다리
        ctx.beginPath();
        let legEndY = offsetY + this.height;
        if (deadState) {
            ctx.moveTo(headX, pelvisY); ctx.lineTo(headX - 8, legEndY - 10);
            ctx.moveTo(headX, pelvisY); ctx.lineTo(headX + 8, legEndY - 10);
        } else if (!this.isGrounded) {
            // 오므린 점프 다리
            ctx.moveTo(headX, pelvisY); ctx.lineTo(headX - 5, legEndY - 4);
            ctx.moveTo(headX, pelvisY); ctx.lineTo(headX + 5, legEndY - 4);
        } else if (this.vx !== 0) {
            // 달리는 다리 교차
            let swingLeg = Math.sin(this.walkCycle) * 12;
            ctx.moveTo(headX, pelvisY); ctx.lineTo(headX + swingLeg, legEndY);
            ctx.moveTo(headX, pelvisY); ctx.lineTo(headX - swingLeg, legEndY);
        } else {
            // 가만히 서있기
            ctx.moveTo(headX, pelvisY); ctx.lineTo(headX - 6, legEndY);
            ctx.moveTo(headX, pelvisY); ctx.lineTo(headX + 6, legEndY);
        }
        ctx.stroke();
    }
}

// 투명블록 팅하는 소리 (Web Audio API)
function playBlockRevealSound() {
    initAudio();
    if (!audioCtx) return;
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(440, audioCtx.currentTime); // 맑은 도 소리
    gain.gain.setValueAtTime(0.1, audioCtx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.1);
    osc.connect(gain);
    gain.connect(audioCtx.destination);
    osc.start();
    osc.stop(audioCtx.currentTime + 0.1);
}

// 맵 오브젝트 클래스
class MapObject {
    constructor(x, y, w, h, options = {}) {
        this.x = x;
        this.y = y;
        this.w = w;
        this.h = h;
        
        // 기본 옵션
        this.color = options.color || '#333333';
        this.active = true;
        
        // 함정 유형
        this.isLethal = options.isLethal || false;       // 닿으면 사망 (가시)
        this.isInvisible = options.isInvisible || false; // 평소엔 투명했다가 아래에서 박으면 활성화
        this.revealed = options.revealed !== undefined ? options.revealed : !this.isInvisible;
        this.isFakeFloor = options.isFakeFloor || false; // 밟으면 아래로 낙하하는 페이크 블록
        this.triggered = false;
        this.vy = 0; // 페이크 블록의 낙하 속도용

        // 몬스터 및 갑툭튀 기믹 속성
        this.isMovingSpike = options.isMovingSpike || false;
        this.triggerX = options.triggerX || 0; // 발동 유도 X선
        this.targetY = options.targetY || 0;   // 도달 목표 Y
        this.speedY = options.speedY || 0;

        // 골인 깃발 관련
        this.isGoal = options.isGoal || false;
        this.goalAction = options.goalAction || null;
    }

    update() {
        if (!this.active) return;

        // 페이크 바닥 낙하 업데이트
        if (this.isFakeFloor && this.triggered) {
            this.vy += 0.5; // 중력 적용
            this.y += this.vy;
            if (this.y > VIEW_HEIGHT + 100) {
                this.active = false;
            }
        }

        // 갑툭튀 솟아오르는 가시 업데이트
        if (this.isMovingSpike) {
            // 플레이어가 특정 X좌표를 지나는 순간 발동
            if (!this.triggered && player.x > this.triggerX) {
                this.triggered = true;
                playTrapTriggerSound();
            }

            if (this.triggered && this.y > this.targetY) {
                this.y += this.speedY; // 위로 솟아오름 (예: speedY가 음수)
                if (this.y < this.targetY) {
                    this.y = this.targetY;
                }
            }
        }
    }

    triggerAction() {
        if (this.isGoal && this.goalAction) {
            this.goalAction(this);
        }
    }

    draw() {
        if (!this.active) return;
        if (this.isInvisible && !this.revealed) return; // 투명 블록은 노출 전까지 안 그림

        ctx.save();
        ctx.translate(-camera.x, 0);

        if (this.isLethal) {
            // 삼각 가시 그리기
            ctx.fillStyle = this.color;
            ctx.strokeStyle = '#000000';
            ctx.lineWidth = 1.5;
            
            // 너비 내에 촘촘한 가시 여러개 그리기 (기본 타일당 여러 가시 배치 가능)
            let spikeCount = Math.max(1, Math.floor(this.w / 20));
            let spikeW = this.w / spikeCount;

            for (let i = 0; i < spikeCount; i++) {
                let sX = this.x + i * spikeW;
                ctx.beginPath();
                ctx.moveTo(sX, this.y + this.h); // 왼쪽 아래
                ctx.lineTo(sX + spikeW / 2, this.y); // 정중앙 꼭대기
                ctx.lineTo(sX + spikeW, this.y + this.h); // 오른쪽 아래
                ctx.closePath();
                ctx.fill();
                ctx.stroke();
            }
        } else if (this.isGoal) {
            // 깃발 그리기
            ctx.strokeStyle = '#555555';
            ctx.lineWidth = 5;
            ctx.beginPath();
            ctx.moveTo(this.x + 10, this.y);
            ctx.lineTo(this.x + 10, this.y + this.h);
            ctx.stroke();

            ctx.fillStyle = '#ff3333';
            ctx.beginPath();
            ctx.moveTo(this.x + 10, this.y);
            ctx.lineTo(this.x + 45, this.y + 15);
            ctx.lineTo(this.x + 10, this.y + 30);
            ctx.closePath();
            ctx.fill();
        } else {
            // 일반 블록 그리기
            ctx.fillStyle = this.color;
            ctx.strokeStyle = '#000000';
            ctx.lineWidth = 2;
            ctx.fillRect(this.x, this.y, this.w, this.h);
            ctx.strokeRect(this.x, this.y, this.w, this.h);

            // 가로 줄무늬 디테일 (고전 벽돌 스타일)
            if (this.color === '#8b4513') {
                ctx.strokeStyle = 'rgba(255, 255, 255, 0.15)';
                ctx.beginPath();
                ctx.moveTo(this.x, this.y + this.h / 2);
                ctx.lineTo(this.x + this.w, this.y + this.h / 2);
                ctx.stroke();
            }
        }

        ctx.restore();
    }
}

// 덫 발동 소리
function playTrapTriggerSound() {
    initAudio();
    if (!audioCtx) return;
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(100, audioCtx.currentTime);
    osc.frequency.linearRampToValueAtTime(180, audioCtx.currentTime + 0.2);
    gain.gain.setValueAtTime(0.15, audioCtx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.2);
    osc.connect(gain);
    gain.connect(audioCtx.destination);
    osc.start();
    osc.stop(audioCtx.currentTime + 0.2);
}

// 싱글턴 플레이어 및 맵 변수
const player = new Player();
let mapObjects = [];
let gameWon = false;

// 맵 생성 함수
function generateMap() {
    mapObjects = [];
    gameWon = false;

    // === 기본 바닥 지대 ===
    // 1화면 (0 ~ 800)
    mapObjects.push(new MapObject(0, 500, 350, 100, { color: '#666666' }));
    mapObjects.push(new MapObject(470, 500, 330, 100, { color: '#666666' })); // 중간에 120px 절벽 (정상 점프로 건널 수 있음)

    // === 1화면 억까 1: 뜬금없는 투명 블록 ===
    // 절벽을 건너기 위해 중간 높이로 가뿐하게 뛰면 이 투명블록에 머리가 박혀 낭떠러지로 떨어진다!
    mapObjects.push(new MapObject(400, 360, 40, 40, { isInvisible: true }));

    // === 2화면 (800 ~ 1600) ===
    mapObjects.push(new MapObject(800, 500, 200, 100, { color: '#666666' }));
    // 1000 ~ 1150 절벽 구간
    mapObjects.push(new MapObject(1150, 500, 450, 100, { color: '#666666' }));

    // 공중 플랫폼들
    mapObjects.push(new MapObject(700, 380, 120, 30, { color: '#888888' }));
    
    // === 2화면 억까 2: 밟으면 떨어지는 페이크 바닥 ===
    // 920 위치에 있는 안전해 보이는 플랫폼... 밟으면 뚝 떨어져 낙사한다!
    mapObjects.push(new MapObject(920, 380, 80, 25, { color: '#888888', isFakeFloor: true }));

    // 1030 위치에 있는 플랫폼, 밟기 매우 유혹적이지만
    mapObjects.push(new MapObject(1050, 260, 100, 30, { color: '#888888' }));
    // 그 밑에 가시가 교묘하게 숨어있거나 튀어나옴
    
    // === 2화면 억까 3: 갑툭튀 가시 ===
    // 플레이어가 x=1250 을 넘어가는 순간 바닥에서 가시가 급작스럽게 튀어나온다!
    // 처음엔 땅 속에 처박혀 안 보임 (y = 530) -> 발동 시 y = 470 으로 솟아오름.
    mapObjects.push(new MapObject(1300, 530, 40, 30, {
        color: '#ff3333',
        isLethal: true,
        isMovingSpike: true,
        triggerX: 1220,
        targetY: 470,
        speedY: -6
    }));

    // 안전하게 가시를 우회하기 위해 올라갈 상자들
    mapObjects.push(new MapObject(1200, 420, 40, 80, { color: '#8b4513' }));
    
    // 이 상자 위에 올라섰을 때, 점프해서 앞으로 가려 하면 천장에 숨어있던 투명블록이 또 가로막는다!
    mapObjects.push(new MapObject(1250, 280, 40, 40, { isInvisible: true }));

    // === 3화면 (1600 ~ 2400) ===
    mapObjects.push(new MapObject(1600, 500, 300, 100, { color: '#666666' }));
    
    // 3화면 억까 4: 아이템인 줄 알았는데 지뢰/가시 상자
    // 안전해 보이는 박스 위에 황금색 "코인" 같은 게 동동 떠있는데, 닿으면 죽는다!
    mapObjects.push(new MapObject(1720, 420, 40, 40, { color: '#ffd700', isLethal: true })); // 완전 황금 보물처럼 위장한 살상 함정

    // 넓은 바닥 틈새 절벽 (1900 ~ 2150)
    mapObjects.push(new MapObject(2150, 500, 650, 100, { color: '#666666' }));

    // 절벽 사이 공중 다리
    mapObjects.push(new MapObject(1950, 380, 120, 30, { color: '#888888' }));
    // 이 공중 다리 한가운데에 가시 깃털 숨겨두기
    mapObjects.push(new MapObject(2010, 355, 20, 25, { color: '#ff3333', isLethal: true }));

    // === 4화면 및 대망의 페이크 골인 지점 (2400 ~ 2800) ===
    // 2500 지점에 그럴듯한 깃발이 우뚝 솟아있다.
    // 하지만 이 깃발은 가짜 골인 지점이다! 깃발에 거의 닿는 순간 (x=2460 돌파), 깃발 옆에서 붉은색 대왕 가시 기둥이 솟아올라 플레이어를 잔인하게 박살낸다!
    const fakeGoalSpike = new MapObject(2510, 530, 50, 100, {
        color: '#ff0000',
        isLethal: true,
        isMovingSpike: true,
        triggerX: 2420,
        targetY: 400,
        speedY: -10
    });
    mapObjects.push(fakeGoalSpike);

    // 가짜 깃발 그 자체
    mapObjects.push(new MapObject(2500, 350, 10, 150, {
        isGoal: true,
        goalAction: function(obj) {
            // 이 가짜 깃발에 닿으려 하면, 플레이어를 죽인다!
            player.die("가짜 골인 지점의 참사 ㅋ");
        }
    }));

    // 진짜 골인 지점은 가짜 깃발을 뛰어넘어 훨씬 뒤에 숨어있는 구덩이를 건너야만 나온다!
    // 가짜 깃발 뒷편에 안전해 보이는 바닥 (2550 ~ 2650)
    // 그러나 이 바닥도 가짜 깃발 트리거가 작동하면 갑자기 무너져 내리는 함정이 있다면?
    // 하지만 한 군데 정도는 숨겨진 진짜 길이 있어야 하므로...
    // 플레이어가 가짜 깃발을 '높은 점프'로 밟지 않고 위로 넘어간 뒤에,
    // x=2680에 위치한 매우 좁은 발판을 밟고 진짜 깃발(x=2750)로 도달해야 함.
    mapObjects.push(new MapObject(2650, 440, 50, 20, { color: '#888888' }));
    
    // 진짜 골인 깃발
    mapObjects.push(new MapObject(2740, 350, 10, 150, {
        isGoal: true,
        goalAction: function(obj) {
            if (!gameWon) {
                gameWon = true;
                playWinSound();
            }
        }
    }));
}

// 진짜 클리어 시 재생되는 나름 웅장하고 유쾌한 팡파레 효과음
function playWinSound() {
    initAudio();
    if (!audioCtx) return;
    const now = audioCtx.currentTime;

    const fanfare = [
        { freq: 262, dur: 0.15 }, // C4
        { freq: 330, dur: 0.15 }, // E4
        { freq: 392, dur: 0.15 }, // G4
        { freq: 523, dur: 0.4 }   // C5
    ];

    fanfare.forEach((note, index) => {
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(note.freq, now + index * 0.15);
        gain.gain.setValueAtTime(0.15, now + index * 0.15);
        gain.gain.exponentialRampToValueAtTime(0.01, now + index * 0.15 + note.dur);
        osc.connect(gain);
        gain.connect(audioCtx.destination);
        osc.start(now + index * 0.15);
        osc.stop(now + index * 0.15 + note.dur);
    });
}

// 플레이어 사망 시 부활 처리
function respawn() {
    player.reset();
    
    // 함정 상태들 원래대로 완전 복구!
    generateMap();
}

// 전체 완전히 처음부터 다시 시작 (사망 카운트 리셋 포함)
function resetGame() {
    initAudio();
    player.reset();
    player.deathCount = 0;
    deathCounterEl.textContent = `사망 횟수: 0`;
    currentDeathMessage = "";
    generateMap();
}

// === 게임 메인 루프 ===
function update() {
    // 플레이어 업데이트 (물리 및 충돌 포함)
    player.update();

    // 맵 오브젝트(함정 등) 개별 기믹 업데이트
    for (let obj of mapObjects) {
        obj.update();
    }

    // 카메라 추적
    if (!player.isDead) {
        camera.update(player.x);
    }
}

function draw() {
    // 배경 지우기 (쾌적한 하늘색 느낌)
    ctx.fillStyle = '#b0e0e6';
    ctx.fillRect(0, 0, VIEW_WIDTH, VIEW_HEIGHT);

    // 맵 오브젝트 그리기
    for (let obj of mapObjects) {
        obj.draw();
    }

    // 플레이어 그리기
    player.draw();

    // === UI 및 안내 문구 오버레이 ===
    
    // 사망 연출 시 킹받는 문구 화면 출력
    if (player.isDead) {
        ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
        ctx.fillRect(0, 0, VIEW_WIDTH, VIEW_HEIGHT);

        ctx.fillStyle = '#ff3333';
        ctx.font = 'bold 36px "Malgun Gothic"';
        ctx.textAlign = 'center';
        ctx.fillText("YOU DIED", VIEW_WIDTH / 2, VIEW_HEIGHT / 2 - 30);

        ctx.fillStyle = '#ffffff';
        ctx.font = '20px "Malgun Gothic"';
        ctx.fillText(currentDeathMessage, VIEW_WIDTH / 2, VIEW_HEIGHT / 2 + 20);

        ctx.font = '14px "Malgun Gothic"';
        ctx.fillStyle = '#aaaaaa';
        ctx.fillText("부활을 기다리는 중...", VIEW_WIDTH / 2, VIEW_HEIGHT / 2 + 70);
    }

    // 게임 승리 시 연출
    if (gameWon) {
        ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
        ctx.fillRect(0, 0, VIEW_WIDTH, VIEW_HEIGHT);

        ctx.fillStyle = '#33ff33';
        ctx.font = 'bold 40px "Malgun Gothic"';
        ctx.textAlign = 'center';
        ctx.fillText("🎉 축  클 리 어 🎉", VIEW_WIDTH / 2, VIEW_HEIGHT / 2 - 40);

        ctx.fillStyle = '#ffffff';
        ctx.font = '22px "Malgun Gothic"';
        ctx.fillText(`당신의 총 사망 횟수: ${player.deathCount}회`, VIEW_WIDTH / 2, VIEW_HEIGHT / 2 + 10);

        ctx.font = '16px "Malgun Gothic"';
        ctx.fillStyle = '#ffdd00';
        ctx.fillText("인성맵을 기어코 클리어하셨군요! 대단합니다!", VIEW_WIDTH / 2, VIEW_HEIGHT / 2 + 50);

        ctx.font = '14px "Malgun Gothic"';
        ctx.fillStyle = '#aaaaaa';
        ctx.fillText("다시 하려면 우측 상단 '처음부터 다시' 버튼을 누르세요.", VIEW_WIDTH / 2, VIEW_HEIGHT / 2 + 90);
    }
}

function loop() {
    update();
    draw();
    requestAnimationFrame(loop);
}

// 게임 시작
generateMap();
loop();
