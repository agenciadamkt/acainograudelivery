'use client';

import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
    Play, 
    Trophy, 
    Zap, 
    RotateCcw, 
    ArrowLeft, 
    Shield, 
    Magnet, 
    Wind,
    Star,
    Award,
    ShoppingBag,
    Target,
    CheckCircle2
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

/* ─── Configurações do Jogo ─── */
const PERSISTENCE_KEY = 'grauzinho_runner_high_score_v2';
const LANES = [-1.5, 0, 1.5]; // Unidades de pista (perspectiva)
const ROAD_WIDTH = 4;
const INITIAL_SPEED = 0.05; // Velocidade base original
const SPEED_INCREMENT = 0.0001; // Progressão original
const PERSPECTIVE = 300;
const MAX_Z = 1000;

/* ─── Tipos ─── */
type EntityType = 'acai' | 'banana' | 'cone' | 'magnet' | 'shield' | 'turbo';

interface Entity {
    id: number;
    laneX: number;
    z: number;
    type: EntityType;
}

interface Scenery {
    id: number;
    side: 'L' | 'R';
    z: number;
    type: 'tree' | 'light';
}

export default function GrauzinhoPage() {
    const navigate = useNavigate();
    const { user } = useAuth();
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const [view, setView] = useState<'start' | 'instructions' | 'playing' | 'result' | 'ranking' | 'shop' | 'missions'>('start');
    const [score, setScore] = useState(0);
    const [highScore, setHighScore] = useState(0);
    const [acaiCoins, setAcaiCoins] = useState(0);
    const [inventory, setInventory] = useState<any[]>([]);
    const [activeMissions, setActiveMissions] = useState<any[]>([]);
    const [equippedSkin, setEquippedSkin] = useState<string>('default');
    const [realRanking, setRealRanking] = useState<any[]>([]);
    const [isLoadingRanking, setIsLoadingRanking] = useState(false);

    useEffect(() => {
        const local = localStorage.getItem(PERSISTENCE_KEY);
        let maxLocal = 0;
        if (local) {
            maxLocal = parseInt(local);
            setHighScore(maxLocal);
        }

        if (user) {
            supabase.from('game_scores').select('score').eq('user_id', user.id).maybeSingle()
                .then(({data}) => {
                    if (data && data.score > maxLocal) {
                        setHighScore(data.score);
                        localStorage.setItem(PERSISTENCE_KEY, data.score.toString());
                    }
                });

            // Busca Perfil Econômico (Açaí Coins)
            supabase.from('game_profiles').select('*').eq('user_id', user.id).maybeSingle()
                .then(({data, error}) => {
                    if (data && !error) {
                        setAcaiCoins(data.acai_coins);
                    } else if (!data && !error) {
                        supabase.from('game_profiles').insert({ user_id: user.id, acai_coins: 0 }).then(() => setAcaiCoins(0));
                    }
                });

            // Busca Inventário
            supabase.from('game_inventory').select('*').eq('user_id', user.id)
                .then(({data}) => {
                    if (data) {
                        setInventory(data);
                        const equipped = data.find(i => i.is_equipped && i.item_type === 'skin');
                        if (equipped) setEquippedSkin(equipped.item_id);
                    }
                });
            
            // Busca Missões
            supabase.from('game_missions').select('*').eq('user_id', user.id)
                .then(({data}) => {
                    if (data) setActiveMissions(data);
                });
        }
    }, [user]);

    useEffect(() => {
        if (view === 'ranking') {
            setIsLoadingRanking(true);
            supabase
                .from('game_scores')
                .select(`
                    user_id,
                    score,
                    profiles (full_name)
                `)
                .order('score', { ascending: false })
                .limit(10)
                .then(({data, error}) => {
                    setIsLoadingRanking(false);
                    if (data && !error) {
                        const defaultAvatars = ['👑','😎','🚀','🔥','⚡','✨', '🌟', '💥', '👻', '🤖'];
                        setRealRanking(data.map((row: any, i) => ({
                            id: row.user_id,
                            name: row.user_id === user?.id ? 'Você' : (row.profiles?.full_name || 'Desconhecido'),
                            score: row.score,
                            avatar: row.user_id === user?.id ? '🏍️' : defaultAvatars[i % defaultAvatars.length]
                        })));
                    } else if (error) {
                        console.error("Error fetching ranking:", error);
                        // Fallback temporário se a tabela ainda não tiver subido pro Supabase online
                        setRealRanking([{ id: 'error', name: 'Sincronizando Banco...', score: 0, avatar: '🚧' }]);
                    }
                });
        }
    }, [view, user]);

    // 📱 Mobile setup
    const touchStartRef = useRef<number>(0);
    const distanceRef = useRef<HTMLSpanElement>(null);

    // 🎵 Audio Engine
    const audioCtxRef = useRef<AudioContext | null>(null);
    const bgmAudioRef = useRef<HTMLAudioElement>(null);
    const bananaAudioRef = useRef<HTMLAudioElement>(null);
    const acaiAudioRef = useRef<HTMLAudioElement>(null);

    // 🧮 Acai HUD Tracker (Sem renders)
    const localAcaiCountRef = useRef(0);
    const acaiCountTextRef = useRef<HTMLSpanElement>(null);
    const acaiIconContainerRef = useRef<HTMLDivElement>(null);

    const stopBGM = useCallback(() => {
        if (bgmAudioRef.current) {
            bgmAudioRef.current.pause();
            bgmAudioRef.current.currentTime = 0;
        }
    }, []);

    const playBGM = useCallback(() => {
        if (bgmAudioRef.current) {
            bgmAudioRef.current.volume = 0.3;
            bgmAudioRef.current.play().catch(e => console.log('Audio autoplay blocked', e));
        }
    }, []);

    const playSound = useCallback((type: 'coin' | 'crash' | 'powerup' | 'move' | 'banana' | 'acai') => {
        if (type === 'banana' && bananaAudioRef.current) {
            bananaAudioRef.current.currentTime = 0;
            bananaAudioRef.current.play().catch(e => {});
            return;
        }
        if (type === 'acai' && acaiAudioRef.current) {
            acaiAudioRef.current.currentTime = 0;
            acaiAudioRef.current.play().catch(e => {});
            return;
        }
        if (!audioCtxRef.current) return;
        try {
            const ctx = audioCtxRef.current;
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.connect(gain);
            gain.connect(ctx.destination);
            const now = ctx.currentTime;
            
            if (type === 'coin') {
                osc.type = 'sine'; osc.frequency.setValueAtTime(800, now); osc.frequency.setValueAtTime(1200, now + 0.1);
                gain.gain.setValueAtTime(0.1, now); gain.gain.exponentialRampToValueAtTime(0.01, now + 0.2);
                osc.start(now); osc.stop(now + 0.2);
            } else if (type === 'crash') {
                osc.type = 'sawtooth'; osc.frequency.setValueAtTime(150, now); osc.frequency.exponentialRampToValueAtTime(10, now + 0.3);
                gain.gain.setValueAtTime(0.2, now); gain.gain.exponentialRampToValueAtTime(0.01, now + 0.3);
                osc.start(now); osc.stop(now + 0.3);
            } else if (type === 'powerup') {
                osc.type = 'square'; osc.frequency.setValueAtTime(300, now); osc.frequency.linearRampToValueAtTime(800, now + 0.2);
                gain.gain.setValueAtTime(0.05, now); gain.gain.exponentialRampToValueAtTime(0.01, now + 0.3);
                osc.start(now); osc.stop(now + 0.3);
            } else if (type === 'move') {
                osc.type = 'triangle'; osc.frequency.setValueAtTime(400, now); osc.frequency.exponentialRampToValueAtTime(200, now + 0.1);
                gain.gain.setValueAtTime(0.02, now); gain.gain.exponentialRampToValueAtTime(0.01, now + 0.1);
                osc.start(now); osc.stop(now + 0.1);
            }
        } catch(e) {}
    }, []);
    
    // 🖼️ Assets
    const assets = useRef<{
        player: HTMLImageElement | null;
        bg: HTMLImageElement | null;
        acai: HTMLImageElement | null;
        banana: HTMLImageElement | null;
        cone: HTMLImageElement | null;
    }>({
        player: null,
        bg: null,
        acai: null,
        banana: null,
        cone: null
    });

    // 🎮 Game State (Refs)
    const gameState = useRef({
        player: { 
            lane: 1, 
            targetLane: 1,
            x: 0, 
            yOffset: 0, // Altura atual do pulo
            isJumping: false,
            jumpVelocity: 0,
            laneOffset: 0,
            lean: 0,
            hasShield: false,
            hasMagnet: false,
            hasTurbo: false,
            powerUpTimer: 0
        },
        entities: [] as Entity[],
        scenery: [] as Scenery[],
        speed: INITIAL_SPEED,
        distance: 0,
        lastSpawn: 0,
        lastScenerySpawn: 0,
        gameOver: false,
        frame: 0
    });

    // 🧩 Load Assets
    useEffect(() => {
        const load = (src: string, key: keyof typeof assets.current) => {
            const img = new Image();
            img.src = src;
            img.onload = () => { assets.current[key] = img; };
        };
        
        // Define a imagem do jogador baseado na skin
        const playerImage = equippedSkin === 'neon' ? '/game/grauzinho.png?v=neon' : 
                          equippedSkin === 'gold' ? '/game/grauzinho.png?v=gold' : 
                          '/game/grauzinho.png?v=2';
        
        load(playerImage, 'player');
        load('/game/cenario.png?v=2', 'bg');
        
        load('/game/acai.png?v=2', 'acai');
        load('/game/banana.png?v=2', 'banana');
        load('/game/cone.png?v=2', 'cone');

        const saved = localStorage.getItem(PERSISTENCE_KEY);
        if (saved) setHighScore(parseInt(saved));
    }, [user, equippedSkin]);

    // 🥤 Acai Collection System (Plug-in)
    const updateAcaiCounter = useCallback(() => {
        localAcaiCountRef.current += 1;
        if (acaiCountTextRef.current) {
            acaiCountTextRef.current.innerText = `${localAcaiCountRef.current}`;
        }
        if (acaiIconContainerRef.current) {
            const el = acaiIconContainerRef.current;
            el.animate([
                { transform: 'scale(1)' },
                { transform: 'scale(1.4)' },
                { transform: 'scale(1)' }
            ], { duration: 300, easing: 'ease-out' });
        }
    }, []);

    const animateCollectToHUD = useCallback((startX: number, startY: number) => {
        if (!acaiIconContainerRef.current || !canvasRef.current) return;
        
        const targetRect = acaiIconContainerRef.current.getBoundingClientRect();
        
        const img = document.createElement('img');
        img.src = '/game/acai.png?v=2';
        img.style.position = 'fixed';
        img.style.width = '80px'; // Um pouco maior no início para destaque
        img.style.height = '80px';
        img.style.pointerEvents = 'none';
        img.style.zIndex = '9999';
        img.style.left = `${startX - 40}px`;
        img.style.top = `${startY - 40}px`;
        document.body.appendChild(img);

        const deltaX = targetRect.left + (targetRect.width/2) - startX;
        const deltaY = targetRect.top + (targetRect.height/2) - startY;

        const anim = img.animate([
            { transform: 'translate(0, 0) scale(1.2)', opacity: 1 },
            { transform: `translate(${deltaX * 0.3}px, ${deltaY - 80}px) scale(1.1)`, opacity: 0.9 },
            { transform: `translate(${deltaX}px, ${deltaY}px) scale(0.2)`, opacity: 0 }
        ], {
            duration: 900,
            easing: 'ease-out' // Suave no final conforme pedido
        });

        anim.onfinish = () => {
            img.remove();
            updateAcaiCounter();
        };
    }, [updateAcaiCounter]);

    const onCollectAcai = useCallback((x: number, y: number) => {
        animateCollectToHUD(x, y);
    }, [animateCollectToHUD]);

    // 🏆 Game Over Logic
    const handleGameOver = useCallback((skipSound = false) => {
        stopBGM();
        if (!skipSound) playSound('crash');
        const state = gameState.current;
        state.gameOver = true;
        setView('result');
        
        const currentScore = Math.floor(state.distance * 10);
        setScore(currentScore);
        
        const bestScoreToSync = Math.max(currentScore, highScore);
        
        if (currentScore > highScore) {
            setHighScore(currentScore);
            localStorage.setItem(PERSISTENCE_KEY, currentScore.toString());
            toast.success('🎉 Novo Recorde!');
        }
        
        // Grava no banco de dados na nuvem FORA do if, para forçar sincronização
        // do recorde local antigo caso a tabela na nuvem tenha acabado de ser criada!
        if (user) {
            // Sincroniza Score
            supabase
                .from('game_scores')
                .upsert({ user_id: user.id, score: bestScoreToSync, updated_at: new Date().toISOString() })
                .then(({ error }) => {
                    if (error) console.error("Falha ao sincronizar recorde na nuvem:", error);
                });

            // Sincroniza Economia (Novos Açaís coletados)
            const newTotalCoins = acaiCoins + localAcaiCountRef.current;
            setAcaiCoins(newTotalCoins);
            
            supabase
                .from('game_profiles')
                .upsert({ 
                    user_id: user.id, 
                    acai_coins: newTotalCoins,
                    last_played_at: new Date().toISOString()
                })
                .then(({ error }) => {
                    if (error) console.error("Falha ao sincronizar moedas na nuvem:", error);
                });

            // Lógica de Missões Diárias (Exemplo simples)
            if (activeMissions.length > 0) {
                activeMissions.forEach(m => {
                    if (m.status === 'pending') {
                        let progress = m.progress || 0;
                        if (m.mission_id === 'daily_distance') progress += Math.floor(state.distance);
                        if (m.mission_id === 'daily_acai') progress += localAcaiCountRef.current;
                        
                        const newStatus = progress >= m.target ? 'completed' : 'pending';
                        
                        supabase.from('game_missions').update({ 
                            progress, 
                            status: newStatus,
                            updated_at: new Date().toISOString()
                        }).eq('id', m.id).then(() => {
                            if (newStatus === 'completed') toast.success(`🎯 Missão Concluída: ${m.mission_id}!`);
                        });
                    }
                });
            }
        }
    }, [highScore, playSound, stopBGM, user, acaiCoins, activeMissions]);

    // 📐 Projection Helper (Pseudo 3D)
    const project = (x: number, y: number, z: number, canvas: HTMLCanvasElement) => {
        const scale = PERSPECTIVE / (PERSPECTIVE + z);
        const resScale = Math.min(canvas.width / 800, 1);
        const xDivider = 200 * resScale;
        const centerX = canvas.width / 2;
        const horizonY = canvas.height * 0.45;
        return {
            x: centerX + x * scale * xDivider,
            y: horizonY + y * scale * 200,
            scale: scale
        };
    };

    // 🎮 Main Loop
    useEffect(() => {
        if (view !== 'playing') return;

        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        let animationId: number;

        const update = (time: number) => {
            const state = gameState.current;
            if (state.gameOver) return;

            // Physics Update (Modo pseudo-3D)
            state.speed += SPEED_INCREMENT;
            state.distance += state.speed;
            state.frame++;

            if (distanceRef.current) {
                distanceRef.current.innerText = `${Math.floor(state.distance * 10).toLocaleString()}m`;
            }

            // Player movement lateral
            state.player.x += (LANES[state.player.lane] - state.player.x) * 0.2;
            state.player.lean = (state.player.x - LANES[state.player.lane]) * 5;

            // Player jumping physics
            if (state.player.isJumping) {
                state.player.yOffset += state.player.jumpVelocity;
                state.player.jumpVelocity -= 0.01; // Gravidade ainda mais curta
                
                if (state.player.yOffset <= 0) {
                    state.player.yOffset = 0;
                    state.player.isJumping = false;
                    state.player.jumpVelocity = 0;
                }
            }

            // Power up timer
            if (state.player.powerUpTimer > 0) {
                state.player.powerUpTimer--;
                if (state.player.powerUpTimer <= 0) {
                    state.player.hasMagnet = false;
                    state.player.hasShield = false;
                    state.player.hasTurbo = false;
                    state.speed = Math.max(INITIAL_SPEED, state.speed - 0.05); // Turbo slow down
                }
            }

            // Spawn Obstáculos e Bônus na pista
            if (time - state.lastSpawn > 1000 / (state.speed * 20)) {
                const laneIdx = Math.floor(Math.random() * 3);
                const typeRand = Math.random();
                let type: EntityType = 'acai';
                
                if (typeRand > 0.95) type = 'turbo';
                else if (typeRand > 0.90) type = 'magnet';
                else if (typeRand > 0.85) type = 'shield';
                else if (typeRand > 0.5) type = 'banana';
                else if (typeRand > 0.2) type = 'cone';

                state.entities.push({ id: Date.now(), laneX: LANES[laneIdx], z: MAX_Z, type });
                state.lastSpawn = time;
            }

            // Update & Detecção de Colisão das Entidades
            state.entities = state.entities.filter(ent => {
                ent.z -= state.speed * 100; // Velocidade original das entidades
                
                // Magnet atrai o açaí
                if (state.player.hasMagnet && ent.type === 'acai' && ent.z < 300) {
                    ent.laneX += (state.player.x - ent.laneX) * 0.2;
                }

                // Check de Colisão (quando z está bem perto e x está alinhado)
                if (ent.z < 20 && ent.z > -20 && Math.abs(ent.laneX - state.player.x) < 0.5) {
                    if (ent.type === 'banana' || ent.type === 'cone') {
                        // Se estiver pulando (mesmo que pouco), ignora o obstáculo de chão
                        if (state.player.yOffset > 0.1) {
                             return true; 
                        }

                        if (state.player.hasShield) {
                            state.player.hasShield = false;
                            state.player.powerUpTimer = 0;
                            toast.info('🛡️ Escudo quebrou a colisão!');
                            return false;
                        }
                        if (ent.type === 'banana') {
                            playSound('banana');
                            toast.error('🍌 Ops, escorregou na banana!');
                            handleGameOver(true);
                        } else {
                            handleGameOver(false);
                        }
                        } else if (ent.type === 'acai') {
                        playSound('acai');
                        // Coleta a posição na tela para a animação
                        if (canvasRef.current) {
                            const pos = project(ent.laneX, 2, ent.z, canvasRef.current);
                            const canvasRect = canvasRef.current.getBoundingClientRect();
                            onCollectAcai(canvasRect.left + pos.x, canvasRect.top + pos.y);
                        } else {
                            onCollectAcai(window.innerWidth / 2, window.innerHeight * 0.8);
                        }
                        state.distance += 5;
                        return false;
                    } else {
                        playSound('powerup');
                        state.player.powerUpTimer = 300;
                        if (ent.type === 'shield') state.player.hasShield = true;
                        if (ent.type === 'magnet') state.player.hasMagnet = true;
                        if (ent.type === 'turbo') { state.player.hasTurbo = true; state.speed += 0.05; }
                        toast.success(`⚡ ${ent.type.toUpperCase()}!`);
                        return false;
                    }
                }
                return ent.z > -PERSPECTIVE;
            });

            draw(ctx, canvas);
            ctx.restore();
            animationId = requestAnimationFrame(update);
        };

        const draw = (ctx: CanvasRenderingContext2D, canvas: HTMLCanvasElement) => {
            const state = gameState.current;
            ctx.save();

            // 📳 CAMERA SHAKE (Sensation of speed)
            const speedFactor = state.speed / 0.1;
            const shake = state.gameOver ? 0 : Math.sin(state.frame * 0.5) * speedFactor * 0.5;
            
            ctx.translate(shake, shake);

            ctx.clearRect(-100, -100, canvas.width + 200, canvas.height + 200);

            // 1. FUNDO UNIFICADO ESTÁTICA
            if (assets.current.bg) {
                ctx.save();
                // 🌆 Cenário Estático (Filtros removidos para performance)
                ctx.drawImage(assets.current.bg, 0, 0, canvas.width, canvas.height);
                
                // Overlay de Brilho Neon extra
                // Overlay simplificado sem filtros
                if (equippedSkin === 'neon') {
                    const grad = ctx.createLinearGradient(0, 0, 0, canvas.height);
                    grad.addColorStop(0, 'rgba(44, 16, 68, 0.4)');
                    grad.addColorStop(0.5, 'rgba(139, 92, 246, 0.1)');
                    grad.addColorStop(1, 'rgba(6, 182, 212, 0.2)');
                    ctx.fillStyle = grad;
                    ctx.fillRect(0, 0, canvas.width, canvas.height);
                }
                ctx.restore();
            } else {
                ctx.fillStyle = '#2c1044';
                ctx.fillRect(0, 0, canvas.width, canvas.height);
            }

            // 🌍 DESENHANDO A PISTA COM MOVIMENTO (SEGMENTOS)
            const segmentLength = 150;
            const dashOffset = (gameState.current.distance * 1200) % (segmentLength * 2);

            // -- BARRAS HORIZONTAIS DE VELOCIDADE (ALTO IMPACTO) --
            ctx.lineWidth = 1;
            for (let z = MAX_Z; z > 0; z -= 100) {
                const zPos = (z - (gameState.current.distance * 1500) % 100);
                if (zPos < 0) continue;
                
                const pL = project(-ROAD_WIDTH/2, 2, zPos, canvas);
                const pR = project(ROAD_WIDTH/2, 2, zPos, canvas);
                
                const alpha = Math.max(0, 1 - zPos / MAX_Z);
                ctx.strokeStyle = `rgba(255, 255, 255, ${alpha * 0.15})`;
                ctx.beginPath();
                ctx.moveTo(pL.x, pL.y);
                ctx.lineTo(pR.x, pR.y);
                ctx.stroke();
            }

            LANES.forEach((l) => {
                // Cores dinâmicas das faixas
                let stroke = 'rgba(224, 64, 251, 0.6)';
                let shadow = '#e040fb';
                
                if (equippedSkin === 'neon') {
                    stroke = 'rgba(6, 182, 212, 0.8)';
                    shadow = '#06b6d4';
                } else if (equippedSkin === 'gold') {
                    stroke = 'rgba(251, 191, 36, 0.8)';
                    shadow = '#fbbf24';
                }

                ctx.strokeStyle = stroke;
                ctx.lineWidth = 3;

                // Desenha segmentos de linha para criar efeito de movimento
                for (let z = MAX_Z; z > 0; z -= segmentLength) {
                    const currentZ = z - dashOffset;
                    if (currentZ < 0) continue;
                    
                    const nextZ = Math.max(0, currentZ - segmentLength / 0.8);
                    
                    const p1 = project(l, 2, currentZ, canvas);
                    const p2 = project(l, 2, nextZ, canvas);
                    
                    ctx.beginPath();
                    ctx.moveTo(p1.x, p1.y);
                    ctx.lineTo(p2.x, p2.y);
                    ctx.stroke();
                }
            });

            // 3. ENTIDADES NA PISTA
            state.entities.sort((a,b) => b.z - a.z).forEach(ent => {
                const pos = project(ent.laneX, 2, ent.z, canvas);
                
                ctx.save();
                ctx.translate(pos.x, pos.y);
                ctx.scale(pos.scale, pos.scale);
                
                // Desenhando os Sprites Independentes
                const resBasis = Math.min(canvas.width / 800, 1);
                let imgToDraw = null;
                let w = 80 * resBasis; let h = 80 * resBasis;

                if (ent.type === 'acai') { imgToDraw = assets.current.acai; w = 120 * resBasis; h = 150 * resBasis; }
                else if (ent.type === 'cone') { imgToDraw = assets.current.cone; w = 120 * resBasis; h = 140 * resBasis; }
                else if (ent.type === 'banana') { imgToDraw = assets.current.banana; w = 100 * resBasis; h = 100 * resBasis; }

                if (imgToDraw) {
                    ctx.drawImage(imgToDraw, -w/2, -h, w, h);
                } else {
                    // Itens especiais e power-ups (Glow + Emoji)
                    ctx.save();
                    ctx.translate(0, -h/2);
                    
                    ctx.beginPath();
                    ctx.arc(0, 0, w/2, 0, Math.PI*2);
                    
                    ctx.lineWidth = 4;

                    if (ent.type === 'turbo') {
                        ctx.fill();
                        ctx.stroke();
                        ctx.font = '30px sans-serif';
                        ctx.textAlign = 'center';
                        ctx.textBaseline = 'middle';
                        ctx.fillText('⚡', 0, 0);
                    } else if (ent.type === 'shield') {
                        ctx.fill();
                        ctx.stroke();
                        ctx.shadowBlur = 0;
                        ctx.font = '30px sans-serif';
                        ctx.textAlign = 'center';
                        ctx.textBaseline = 'middle';
                        ctx.fillText('🛡️', 0, 0);
                    } else if (ent.type === 'magnet') {
                        ctx.fill();
                        ctx.stroke();
                        ctx.shadowBlur = 0;
                        ctx.font = '30px sans-serif';
                        ctx.textAlign = 'center';
                        ctx.textBaseline = 'middle';
                        ctx.fillText('🧲', 0, 0);
                    } else {
                        // Fallback genérico para açaí caso não carregue a imagem
                        ctx.shadowBlur = 0;
                        ctx.fillStyle = 'purple';
                        ctx.fill();
                        ctx.fillStyle = 'white';
                        ctx.font = '15px sans-serif';
                        ctx.textAlign = 'center';
                        ctx.textBaseline = 'middle';
                        ctx.fillText('Açaí', 0, 0);
                    }
                    
                    ctx.restore();
                }

                ctx.restore();
            });

            // 4. JOGADOR MOTO (A âncora fixa na tela com leves giros laterais)
            const pPos = project(state.player.x, 2 - state.player.yOffset, 0, canvas);
            if (assets.current.player) {
                const resBasis = Math.min(canvas.width / 800, 1);
                const pw = 250 * resBasis;
                const ph = 250 * resBasis;
                ctx.save();
                ctx.translate(pPos.x, pPos.y - 120);
                // Moto inclina nas laterais com a curva
                ctx.rotate(state.player.lean * 0.1);

                // Efeito do Shield
                if (state.player.hasShield) {
                    ctx.strokeStyle = '#4fc3f7';
                    ctx.lineWidth = 5;
                    ctx.beginPath();
                    ctx.ellipse(0, 50, 100, 120, 0, 0, Math.PI * 2);
                    ctx.stroke();
                }

                // Personagem
                ctx.save();

                ctx.drawImage(assets.current.player, -pw/2, -ph/2, pw, ph);
                ctx.restore();
                ctx.restore();
            }

            // 5. EFEITO TURBO
            if (state.player.hasTurbo) {
                ctx.fillStyle = 'rgba(255, 215, 0, 0.15)';
                ctx.fillRect(0, 0, canvas.width, canvas.height);
                ctx.font = 'bold 80px sans-serif';
                ctx.fillStyle = '#FFD700';
                ctx.textAlign = 'center';
                ctx.fillText('TURBO!', canvas.width/2, canvas.height/2);
            }
        };

        animationId = requestAnimationFrame(update);
        return () => cancelAnimationFrame(animationId);
    }, [view, handleGameOver]);

    // 🎹 Controles
    const moveJump = useCallback(() => {
        const state = gameState.current;
        if (state.gameOver || state.player.isJumping) return;
        playSound('move');
        state.player.isJumping = true;
        state.player.jumpVelocity = 0.15; // Pulo bem curto e rente ao chão
    }, [playSound]);

    const move = useCallback((dir: 'L' | 'R') => {
        const state = gameState.current;
        if (state.gameOver) return;
        playSound('move');
        if (dir === 'L') state.player.lane = Math.max(0, state.player.lane - 1);
        if (dir === 'R') state.player.lane = Math.min(2, state.player.lane + 1);
    }, [playSound]);

    const startGame = useCallback(() => {
        playBGM(); // Liga a música real
        if (!audioCtxRef.current) {
            audioCtxRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
        }
        if (audioCtxRef.current.state === 'suspended') {
            audioCtxRef.current.resume();
        }
        localAcaiCountRef.current = 0;
        if (acaiCountTextRef.current) acaiCountTextRef.current.innerText = '0';
        gameState.current = {
            ...gameState.current,
            player: { 
                ...gameState.current.player, 
                lane: 1, 
                x: 0, 
                yOffset: 0,
                isJumping: false,
                jumpVelocity: 0,
                hasShield: false, 
                hasMagnet: false, 
                hasTurbo: false, 
                powerUpTimer: 0 
            },
            entities: [],
            scenery: [],
            speed: INITIAL_SPEED,
            distance: 0,
            lastSpawn: performance.now(),
            lastScenerySpawn: performance.now(),
            gameOver: false,
            frame: 0
        };
        setScore(0);
        setView('playing');
    }, [playBGM]);

    const showInstructions = useCallback(() => {
        playBGM();
        setView('instructions');
    }, [playBGM]);

    const showMissions = useCallback(() => {
        playBGM();
        setView('missions');
    }, [playBGM]);
    
    const showShop = useCallback(() => {
        playBGM();
        setView('shop');
    }, [playBGM]);

    useEffect(() => {
        const handleKeys = (e: KeyboardEvent) => {
            if (e.key === 'ArrowLeft' || e.key === 'a' || e.key === 'A') move('L');
            if (e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D') move('R');
            if (e.key === 'ArrowUp' || e.key === 'w' || e.key === 'W' || e.key === ' ') {
                if (view === 'playing') moveJump();
            }
            
            if (e.key === 'Enter') {
                if (view === 'result' || view === 'instructions') {
                    startGame();
                } else if (view === 'start') {
                    showInstructions();
                }
            }
        };
        window.addEventListener('keydown', handleKeys);
        return () => window.removeEventListener('keydown', handleKeys);
    }, [move, startGame, showInstructions, view]);

    // 📱 Resize handler
    useEffect(() => {
        const res = () => {
             if (canvasRef.current) {
                 canvasRef.current.width = window.innerWidth;
                 canvasRef.current.height = window.innerHeight;
             }
        };
        window.addEventListener('resize', res);
        res();
        return () => window.removeEventListener('resize', res);
    }, []);

    return (
        <div className="fixed inset-0 bg-[#2c1044] text-white flex flex-col font-sans overflow-hidden select-none touch-none">
            {/* 🎵 Audio Tags */}
            <audio ref={bgmAudioRef} loop src="/game/musica.mp3" preload="auto" />
            <audio ref={bananaAudioRef} src="/game/banana-som.mp3" preload="auto" />
            <audio ref={acaiAudioRef} src="/game/copo-som.mp3" preload="auto" />

            <AnimatePresence mode="wait">
                {view === 'start' && (
                    <motion.div 
                        key="start"
                        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                        className="absolute inset-0 z-50 flex flex-col items-center justify-center p-8 bg-black/60 backdrop-blur-md"
                    >
                        {/* Botão para sair do jogo e voltar para o dashboard principal */}
                        <div className="absolute top-6 left-6 z-50">
                            <Button onClick={() => navigate('/admin/hub')} variant="ghost" className="text-white hover:bg-white/10 rounded-full w-12 h-12 p-0">
                                <ArrowLeft className="h-6 w-6" />
                            </Button>
                        </div>
                        <div className="relative mb-8">
                             <div className="absolute inset-0 bg-yellow-400 blur-3xl opacity-20 animate-pulse" />
                             <img src="/game/grauzinho.png?v=2" className="w-40 h-40 md:w-56 md:h-56 object-contain relative z-10" alt="Mascote" />
                        </div>

                        <h1 className="text-5xl md:text-7xl font-black italic tracking-tighter mb-2 uppercase text-white drop-shadow-2xl">
                            Grau<span className="text-yellow-400">Runner</span>
                        </h1>
                        <div className="flex items-center gap-2 mb-10 bg-purple-500/20 px-4 py-2 rounded-full border border-white/10 backdrop-blur-md">
                             <div className="w-6 h-6 flex items-center justify-center">
                                 <img src="/game/acai.png?v=2" className="w-full h-full object-contain" alt="Açaí Coins" />
                             </div>
                             <span className="text-yellow-400 font-black text-lg">{acaiCoins.toLocaleString()}</span>
                             <span className="text-[10px] text-purple-300 font-bold uppercase tracking-widest pt-0.5">Açaí Coins</span>
                        </div>

                        <div className="flex flex-col gap-6 w-full max-w-xs">
                            <Button onClick={showInstructions} className="h-24 rounded-[2.5rem] bg-yellow-400 hover:bg-yellow-500 text-[#532089] font-black text-3xl shadow-[0_20px_0_#c38d00] active:translate-y-2 active:shadow-none transition-all">
                                <Play className="mr-3 h-8 w-8 fill-current" />
                                JOGAR
                            </Button>
                            
                            <div className="grid grid-cols-2 gap-4">
                                <Button onClick={showShop} className="h-full rounded-[1.5rem] bg-indigo-500/20 hover:bg-indigo-500/30 text-white font-bold text-sm border border-indigo-500/20 transition-all flex flex-col items-center justify-center py-4 gap-1">
                                    <ShoppingBag className="h-6 w-6 text-indigo-400" />
                                    LOJA
                                </Button>
                                <Button onClick={showMissions} className="h-full rounded-[1.5rem] bg-emerald-500/20 hover:bg-emerald-500/30 text-white font-bold text-sm border border-emerald-500/20 transition-all flex flex-col items-center justify-center py-4 gap-1">
                                    <Target className="h-6 w-6 text-emerald-400" />
                                    MISSÕES
                                </Button>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="text-center p-4 bg-white/5 rounded-[1.5rem] backdrop-blur-xl border border-white/10 flex flex-col justify-center">
                                    <p className="text-[9px] uppercase font-black tracking-[0.2em] text-purple-300 mb-1">MÁXIMA</p>
                                    <p className="text-2xl font-black text-white">{highScore.toLocaleString()}m</p>
                                </div>
                                <Button onClick={() => setView('ranking')} className="h-full rounded-[1.5rem] bg-white/10 hover:bg-white/20 text-white font-bold text-sm border border-white/20 transition-all flex flex-col items-center justify-center gap-1">
                                    <Trophy className="h-6 w-6 text-yellow-400" />
                                    RANKING
                                </Button>
                            </div>
                        </div>
                    </motion.div>
                )}

                {view === 'shop' && (
                    <motion.div 
                        key="shop"
                        initial={{ opacity: 0, x: 100 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -100 }}
                        className="absolute inset-0 z-50 flex flex-col bg-[#2c1044] p-6"
                    >
                        <div className="flex items-center justify-between mb-8">
                            <Button onClick={() => { setView('start'); navigate('/admin/grauzinho'); }} variant="ghost" className="text-white hover:bg-white/10">
                                <ArrowLeft className="h-6 w-6" />
                            </Button>
                            <h2 className="text-2xl font-black italic tracking-tighter uppercase">Loja de <span className="text-yellow-400">Skins</span></h2>
                            <div className="flex items-center gap-2 bg-yellow-400/20 px-3 py-1 rounded-full border border-yellow-400/30">
                                <span className="text-yellow-400 font-black text-sm">{acaiCoins}</span>
                                <img src="/game/acai.png?v=2" className="w-4 h-4 object-contain" alt="Açaí Coins" />
                            </div>
                        </div>

                        <div className="grid grid-cols-1 gap-4 overflow-y-auto pb-20">
                            {[
                                { id: 'default', name: 'Original', price: 0, desc: 'A clássica moto do Açaí no Grau.' },
                                { id: 'neon', name: 'Neon Runner', price: 50, desc: 'Brilha intensamente nas noites de Grau.' },
                                { id: 'gold', name: 'Mestre Dourado', price: 200, desc: 'Apenas para lendas do asfalto.' }
                            ].map((item) => {
                                const isOwned = inventory.some(i => i.item_id === item.id) || item.id === 'default';
                                const isEquipped = equippedSkin === item.id;
                                
                                const handleAction = async () => {
                                    if (isOwned) {
                                        // Equipar
                                        if (user) {
                                            await supabase.from('game_inventory').update({ is_equipped: false }).eq('user_id', user.id).eq('item_type', 'skin');
                                            if (item.id !== 'default') {
                                                await supabase.from('game_inventory').update({ is_equipped: true }).eq('user_id', user.id).eq('item_id', item.id);
                                            }
                                            setEquippedSkin(item.id);
                                            toast.success(`${item.name} equipada!`);
                                        }
                                    } else {
                                        // Comprar
                                        if (acaiCoins >= item.price && user) {
                                            const newBalance = acaiCoins - item.price;
                                            const { error } = await supabase.from('game_inventory').insert({
                                                user_id: user.id,
                                                item_id: item.id,
                                                item_type: 'skin',
                                                is_equipped: false
                                            });
                                            if (!error) {
                                                await supabase.from('game_profiles').update({ acai_coins: newBalance }).eq('user_id', user.id);
                                                setAcaiCoins(newBalance);
                                                setInventory([...inventory, { item_id: item.id, item_type: 'skin' }]);
                                                toast.success(`${item.name} desbloqueada!`);
                                            }
                                        } else {
                                            toast.error('Saldo insuficiente!');
                                        }
                                    }
                                };

                                return (
                                    <div key={item.id} className="p-4 rounded-3xl bg-white/5 border border-white/10 flex items-center gap-4">
                                        <div className={`w-16 h-16 rounded-2xl flex items-center justify-center ${isEquipped ? 'bg-yellow-400' : 'bg-white/10'}`}>
                                            <img src="/game/grauzinho.png" className={`w-10 h-10 object-contain ${item.id === 'neon' ? 'hue-rotate-90 saturate-200' : item.id === 'gold' ? 'sepia saturate-200 brightness-125' : ''}`} alt={item.name} />
                                        </div>
                                        <div className="flex-1">
                                            <h3 className="font-bold text-white text-lg">{item.name}</h3>
                                            <p className="text-xs text-purple-300">{item.desc}</p>
                                        </div>
                                        <Button 
                                            onClick={handleAction}
                                            disabled={!isOwned && acaiCoins < item.price}
                                            className={`rounded-2xl font-black px-6 ${isEquipped ? 'bg-emerald-500 text-white' : isOwned ? 'bg-white/20 text-white' : 'bg-yellow-400 text-[#532089]'}`}
                                        >
                                            {isEquipped ? 'EM USO' : isOwned ? 'EQUIPAR' : `${item.price} 🥤`}
                                        </Button>
                                    </div>
                                );
                            })}
                        </div>
                    </motion.div>
                )}

                {view === 'missions' && (
                    <motion.div 
                        key="missions"
                        initial={{ opacity: 0, x: -100 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 100 }}
                        className="absolute inset-0 z-50 flex flex-col bg-[#2c1044] p-6"
                    >
                        <div className="flex items-center justify-between mb-8">
                            <Button onClick={() => { setView('start'); navigate('/admin/grauzinho'); }} variant="ghost" className="text-white hover:bg-white/10">
                                <ArrowLeft className="h-6 w-6" />
                            </Button>
                            <h2 className="text-2xl font-black italic tracking-tighter uppercase">Missões <span className="text-emerald-400">Ativas</span></h2>
                            <div className="w-10 h-10" />
                        </div>

                        <div className="space-y-4">
                            {activeMissions.length === 0 ? (
                                <div className="text-center py-20 bg-white/5 rounded-3xl border border-dashed border-white/20">
                                    <Target className="h-12 w-12 text-white/20 mx-auto mb-4" />
                                    <p className="text-purple-300 font-medium">Nenhuma missão no momento.</p>
                                    <Button onClick={async () => {
                                        if (user) {
                                            const missions = [
                                                { user_id: user.id, mission_id: 'daily_distance', target: 500, status: 'pending', progress: 0 },
                                                { user_id: user.id, mission_id: 'daily_acai', target: 20, status: 'pending', progress: 0 }
                                            ];
                                            await supabase.from('game_missions').insert(missions);
                                            const { data } = await supabase.from('game_missions').select('*').eq('user_id', user.id);
                                            if (data) setActiveMissions(data);
                                        }
                                    }} className="mt-4 bg-emerald-500 hover:bg-emerald-600 text-white font-bold">GERAR MISSÕES DIÁRIAS</Button>
                                </div>
                            ) : (
                                activeMissions.map((m) => (
                                    <div key={m.id} className="p-5 rounded-3xl bg-white/5 border border-white/10">
                                        <div className="flex items-center justify-between mb-3">
                                            <h3 className="font-bold text-white uppercase tracking-tight text-sm">
                                                {m.mission_id === 'daily_distance' ? '🏁 Correr 500 Metros' : '🥤 Coletar 20 Açaís'}
                                            </h3>
                                            {m.status === 'completed' ? (
                                                <CheckCircle2 className="h-5 w-5 text-emerald-400" />
                                            ) : (
                                                <span className="text-[10px] font-black p-1 bg-white/10 rounded-md text-purple-300">{Math.floor((m.progress / m.target) * 100)}%</span>
                                            )}
                                        </div>
                                        <div className="w-full h-2 bg-white/10 rounded-full overflow-hidden">
                                            <motion.div 
                                                initial={{ width: 0 }} animate={{ width: `${Math.min(100, (m.progress / m.target) * 100)}%` }}
                                                className={`h-full ${m.status === 'completed' ? 'bg-emerald-500 shadow-[0_0_10px_#10b981]' : 'bg-yellow-400'}`}
                                            />
                                        </div>
                                        <p className="text-right text-[10px] mt-2 font-bold text-purple-200">{m.progress} / {m.target}</p>
                                    </div>
                                ))
                            )}
                        </div>
                    </motion.div>
                )}

                {view === 'instructions' && (
                    <motion.div 
                        initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}
                        className="absolute inset-0 z-50 flex flex-col items-center justify-center p-8 bg-black/80 backdrop-blur-xl"
                    >
                        {/* Botão de Voltar para Instruções */}
                        <div className="absolute top-6 left-6">
                            <Button onClick={() => { setView('start'); navigate('/admin/grauzinho'); }} variant="ghost" className="text-white hover:bg-white/10 rounded-full w-12 h-12 p-0">
                                <ArrowLeft className="h-6 w-6" />
                            </Button>
                        </div>
                        <h2 className="text-2xl md:text-4xl font-black italic tracking-tight mb-8 text-white text-center">Como Jogar <span className="text-yellow-400">Grauzinho!</span></h2>
                        
                        <div className="bg-white/10 p-6 rounded-3xl border border-white/20 max-w-sm w-full space-y-6 mb-8 backdrop-blur-md">
                            <div className="flex items-center gap-4">
                                <div className="p-3 bg-purple-500/30 rounded-xl"><Zap className="text-yellow-400 h-6 w-6" /></div>
                                <p className="text-sm font-medium">Toque nas <span className="text-yellow-400 font-bold">laterais da tela</span> ou use as <span className="text-yellow-400 font-bold">setas do teclado</span> para desviar.</p>
                            </div>
                            <div className="flex items-center gap-4">
                                <div className="p-3 bg-purple-500/30 rounded-xl"><span className="text-2xl">🥤</span></div>
                                <p className="text-sm font-medium">Colete muito <span className="text-purple-400 font-bold">Açaí</span> para ganhar pontos extras!</p>
                            </div>
                            <div className="flex items-center gap-4">
                                <div className="p-3 bg-purple-500/30 rounded-xl"><span className="text-2xl">⚠️</span></div>
                                <p className="text-sm font-medium">Fuja dos <span className="text-orange-400 font-bold">Cones</span> e não escorregue nas <span className="text-yellow-400 font-bold">Bananas</span>.</p>
                            </div>
                            <div className="flex items-center gap-4">
                                <div className="p-3 bg-purple-500/30 rounded-xl"><span className="text-2xl">⚡</span></div>
                                <p className="text-sm font-medium">Pegue Orbes de Neon para ganhar <span className="text-blue-400 font-bold">Poderes Especiais!</span> (Ímã, Escudo e Turbo)</p>
                            </div>
                        </div>

                        <Button onClick={startGame} className="w-full max-w-sm h-16 rounded-2xl bg-yellow-400 hover:bg-yellow-500 text-[#532089] font-black text-xl shadow-[0_8px_0_#c38d00] active:translate-y-2 active:shadow-none transition-all">
                            INICIAR CORRIDA
                        </Button>
                    </motion.div>
                )}

                {view === 'playing' && (
                    <motion.div 
                        initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                        className="absolute top-0 left-0 right-0 z-40 p-6 pointer-events-none"
                    >
                        <div className="flex justify-between items-center w-full">
                            {/* Esquerda: Distância */}
                            <div className="flex items-center px-4 md:px-6 py-3 md:py-4 bg-black/40 backdrop-blur-2xl rounded-3xl md:rounded-[2rem] border border-white/10 shadow-2xl gap-3 md:gap-4">
                                <div className="h-10 w-10 md:h-12 md:w-12 bg-yellow-400 rounded-[1rem] flex items-center justify-center text-[#532089] shadow-lg">
                                    <Zap className="h-5 w-5 md:h-6 md:w-6 fill-current" />
                                </div>
                                <div className="flex flex-col">
                                    <span className="text-[9px] md:text-[10px] font-black uppercase tracking-widest text-purple-300 leading-tight">Distância</span>
                                    <span ref={distanceRef} className="text-xl md:text-2xl font-black tracking-tight leading-none text-white whitespace-nowrap">
                                        {Math.floor(gameState.current.distance * 10).toLocaleString()}m
                                    </span>
                                </div>
                            </div>
                            
                            {/* Direita: Açaí Counter */}
                            <div className="flex items-center px-4 md:px-5 py-3 md:py-4 bg-black/40 backdrop-blur-2xl rounded-3xl md:rounded-[2rem] border border-white/10 shadow-2xl gap-3 md:gap-3">
                                <div className="flex flex-col text-right">
                                    <span className="text-[9px] md:text-[10px] font-black uppercase tracking-widest text-purple-300 leading-tight">Açaís</span>
                                    <span className="text-xl md:text-2xl font-black tracking-tight leading-none text-yellow-400 whitespace-nowrap drop-shadow-[0_0_8px_rgba(250,204,21,0.5)]">
                                        x<span ref={acaiCountTextRef}>{localAcaiCountRef.current}</span>
                                    </span>
                                </div>
                                <div ref={acaiIconContainerRef} className="h-10 w-10 md:h-12 md:w-12 bg-purple-500/20 rounded-[1rem] flex items-center justify-center shadow-inner border border-white/5 relative origin-center">
                                    <img src="/game/acai.png?v=2" className="w-6 h-6 md:w-8 md:h-8 object-contain drop-shadow-md" alt="Acai" />
                                </div>
                            </div>
                        </div>
                    </motion.div>
                )}

                {view === 'result' && (
                    <motion.div 
                        key="result"
                        initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}
                        className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-[#532089]/98 p-8 backdrop-blur-3xl"
                    >
                        <Award className="h-32 w-32 text-yellow-400 mb-6 drop-shadow-glow" />
                        <h2 className="text-sm font-black uppercase tracking-[0.5em] text-purple-300 mb-2">Fim da Entrega</h2>
                        <span className="text-6xl md:text-9xl font-black text-yellow-400 tracking-titer mb-12">{score.toLocaleString()}<span className="text-3xl ml-2">m</span></span>
                        
                        <div className="w-full max-w-sm space-y-4">
                            <Button onClick={startGame} className="w-full h-24 rounded-[2.5rem] bg-yellow-400 hover:bg-yellow-500 text-[#532089] font-black text-2xl shadow-[0_15px_0_#c38d00] active:translate-y-2 active:shadow-none transition-all">
                                <RotateCcw className="mr-3 h-8 w-8" />
                                TENTAR NOVAMENTE
                            </Button>
                            <Button onClick={() => { setView('start'); navigate('/admin/grauzinho'); }} variant="ghost" className="w-full text-white/40 hover:text-white font-black uppercase tracking-widest text-xs mt-4">
                                VOLTAR AO PAINEL
                            </Button>
                        </div>
                    </motion.div>
                )}

                {view === 'ranking' && (
                    <motion.div 
                        key="ranking"
                        initial={{ opacity: 0, x: 50 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -50 }}
                        className="absolute inset-0 z-50 flex flex-col items-center justify-start py-12 px-6 bg-[#2c1044]/95 backdrop-blur-3xl"
                    >
                        <h2 className="text-3xl md:text-5xl font-black italic tracking-tighter text-white mb-8 drop-shadow-lg text-center">
                            <Trophy className="inline mb-2 mr-3 text-yellow-400 h-8 w-8 md:h-10 md:w-10" />
                            TOP <span className="text-yellow-400">FRANQUEADOS</span>
                        </h2>

                        <div className="w-full max-w-md bg-white/5 rounded-[2rem] border border-white/10 overflow-hidden shadow-2xl flex-1 max-h-[60vh] overflow-y-auto no-scrollbar">
                            {isLoadingRanking ? (
                                <div className="p-8 text-center text-white/50 text-xl font-bold animate-pulse">Carregando Banco...</div>
                            ) : realRanking.length === 0 ? (
                                <div className="p-8 text-center text-white/50 text-xl font-bold">Ninguém jogou ainda. Seja o primeiro! 🏆</div>
                            ) : (
                                realRanking.map((player, index) => (
                                    <div key={player.id} className={`flex items-center justify-between p-4 px-6 border-b border-white/5 ${player.id === user?.id ? 'bg-yellow-400/20' : 'hover:bg-white/5'} transition-colors`}>
                                        <div className="flex items-center gap-4">
                                            <div className="w-6 font-black text-xl text-white/50 text-center">{index + 1}</div>
                                            <div className="w-12 h-12 bg-white/10 rounded-2xl flex items-center justify-center text-2xl shadow-inner border border-white/10">
                                                {player.avatar}
                                            </div>
                                            <span className={`font-bold text-lg md:text-xl tracking-tight ${player.id === user?.id ? 'text-yellow-400' : 'text-white'}`}>
                                                {player.name}
                                            </span>
                                        </div>
                                        <div className={`font-black text-xl tracking-widest ${player.id === user?.id ? 'text-yellow-400' : 'text-white'}`}>
                                            {player.score.toLocaleString()}
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>

                        <div className="mt-8 w-full max-w-md">
                            <Button onClick={() => { setView('start'); navigate('/admin/grauzinho'); }} className="w-full h-16 rounded-[2rem] bg-white/10 hover:bg-white/20 text-white font-bold text-lg border border-white/20 transition-all">
                                <ArrowLeft className="mr-3 h-6 w-6" />
                                VOLTAR AO MENU
                            </Button>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* 🎮 CANVAS AREA */}
            <canvas 
                ref={canvasRef}
                className="w-full h-full"
                onMouseDown={(e) => {
                    const x = e.clientX;
                    if (x < window.innerWidth / 2) move('L');
                    else move('R');
                }}
                onTouchStart={(e) => {
                    touchStartRef.current = e.touches[0].clientX;
                }}
                onTouchEnd={(e) => {
                    const deltaX = e.changedTouches[0].clientX - touchStartRef.current;
                    if (deltaX > 30) move('R');
                    else if (deltaX < -30) move('L');
                    else {
                        const x = e.changedTouches[0].clientX;
                        if (x < window.innerWidth / 2) move('L');
                        else move('R');
                    }
                }}
            />

            <div className="absolute top-6 left-6 z-[60]">
               <Button onClick={() => { 
                   stopBGM(); 
                   if (view === 'start') {
                       navigate('/admin/hub');
                   } else {
                       setView('start'); 
                       navigate('/admin/grauzinho'); 
                   }
               }} variant="ghost" className="text-white hover:bg-white/10 rounded-full h-12 w-12 p-0 backdrop-blur-md">
                   <ArrowLeft className="h-6 w-6" />
               </Button>
            </div>
        </div>
    );
}
