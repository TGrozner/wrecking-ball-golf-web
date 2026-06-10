import { useCallback, useEffect, useRef, useState } from 'react';
import type * as Matter from 'matter-js';
import { Bodies, Body, Composite, Constraint, Engine, Events, Render, Runner, Vector } from 'matter-js';
import { levels, WORLD_HEIGHT, WORLD_WIDTH } from './game/levels';
import type { BreakableBlockDef, MovingObstacleDef, Vec2 } from './game/types';

type TaggedBody = Matter.Body & {
  gameType?: 'ball' | 'breakable' | 'bumper' | 'hole' | 'particle' | 'wall' | 'anchor' | 'moving';
  health?: number;
  maxHealth?: number;
  ttl?: number;
};

type MovingBody = {
  body: TaggedBody;
  definition: MovingObstacleDef;
  start: Vec2;
  phase: number;
};

type Metrics = {
  shots: number;
  score: number;
  broken: number;
  levelComplete: boolean;
  message: string;
};

const INITIAL_METRICS: Metrics = {
  shots: 0,
  score: 0,
  broken: 0,
  levelComplete: false,
  message: 'Tire la boule pour charger ton swing.',
};

const BALL_RADIUS = 28;
const MAX_LAUNCH_SPEED = 18;
const MIN_SHOT_PULL = 34;
const KEY_AIM_STEP = 20;
const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value));
const distance = (a: Vec2, b: Vec2) => Math.hypot(a.x - b.x, a.y - b.y);

const randomBetween = (min: number, max: number) => min + Math.random() * (max - min);

function blockOptions(definition: BreakableBlockDef, isBreakable: boolean): Matter.IChamferableBodyDefinition {
  return {
    isStatic: !isBreakable,
    angle: definition.angle ?? 0,
    restitution: isBreakable ? 0.32 : 0.15,
    friction: 0.72,
    frictionStatic: 0.8,
    density: isBreakable ? 0.0035 : undefined,
    render: {
      fillStyle: definition.color ?? (isBreakable ? '#61f4de' : '#17223d'),
      strokeStyle: isBreakable ? '#e9ffff' : '#253a66',
      lineWidth: 2,
    },
  };
}

function createBreakable(definition: BreakableBlockDef): TaggedBody {
  const body = Bodies.rectangle(
    definition.x,
    definition.y,
    definition.width,
    definition.height,
    blockOptions(definition, true),
  ) as TaggedBody;
  body.gameType = 'breakable';
  body.health = definition.health ?? 1;
  body.maxHealth = definition.health ?? 1;
  return body;
}

function createSolidWall(definition: BreakableBlockDef): TaggedBody {
  const body = Bodies.rectangle(
    definition.x,
    definition.y,
    definition.width,
    definition.height,
    blockOptions(definition, false),
  ) as TaggedBody;
  body.gameType = 'wall';
  return body;
}

function vectorToAnchor(point: Vec2, anchor: Vec2) {
  return Vector.create(anchor.x - point.x, anchor.y - point.y);
}

function pointFromPointer(event: PointerEvent, canvas: HTMLCanvasElement): Vec2 {
  const rect = canvas.getBoundingClientRect();
  return {
    x: ((event.clientX - rect.left) / rect.width) * WORLD_WIDTH,
    y: ((event.clientY - rect.top) / rect.height) * WORLD_HEIGHT,
  };
}

function clampToRope(point: Vec2, anchor: Vec2, ropeLength: number): Vec2 {
  const dx = point.x - anchor.x;
  const dy = point.y - anchor.y;
  const length = Math.hypot(dx, dy) || 1;
  const cappedLength = clamp(length, 75, ropeLength);
  return {
    x: anchor.x + (dx / length) * cappedLength,
    y: anchor.y + (dy / length) * cappedLength,
  };
}

function App() {
  const gameHostRef = useRef<HTMLDivElement | null>(null);
  const [levelIndex, setLevelIndex] = useState(0);
  const [resetKey, setResetKey] = useState(0);
  const [metrics, setMetrics] = useState<Metrics>(INITIAL_METRICS);

  const level = levels[levelIndex];

  const resetLevel = useCallback(() => {
    setResetKey((value) => value + 1);
  }, []);

  const goToNextLevel = useCallback(() => {
    setLevelIndex((value) => (value + 1) % levels.length);
    setResetKey((value) => value + 1);
  }, []);

  useEffect(() => {
    const host = gameHostRef.current;
    if (!host) return;

    host.replaceChildren();
    setMetrics(INITIAL_METRICS);

    const engine = Engine.create({ gravity: { x: 0, y: 1.05 } });
    engine.positionIterations = 8;
    engine.velocityIterations = 7;

    const render = Render.create({
      element: host,
      engine,
      options: {
        width: WORLD_WIDTH,
        height: WORLD_HEIGHT,
        background: 'transparent',
        wireframes: false,
        showAngleIndicator: false,
        pixelRatio: Math.min(window.devicePixelRatio || 1, 2),
      },
    });

    const runner = Runner.create();
    const world = engine.world;
    const currentLevel = levels[levelIndex];
    const state = {
      shots: 0,
      score: 0,
      broken: 0,
      levelComplete: false,
      message: currentLevel.hint,
      aiming: false,
      aimPoint: currentLevel.ball,
      lastUiFrame: 0,
    };

    const publishMetrics = () => {
      setMetrics({
        shots: state.shots,
        score: state.score,
        broken: state.broken,
        levelComplete: state.levelComplete,
        message: state.message,
      });
    };

    const ball = Bodies.circle(currentLevel.ball.x, currentLevel.ball.y, BALL_RADIUS, {
      density: 0.009,
      friction: 0.72,
      frictionAir: 0.012,
      restitution: 0.52,
      slop: 0.02,
      render: {
        fillStyle: '#f8fbff',
        strokeStyle: '#7cf5ff',
        lineWidth: 4,
      },
    }) as TaggedBody;
    ball.gameType = 'ball';

    const anchor = Bodies.circle(currentLevel.anchor.x, currentLevel.anchor.y, 11, {
      isStatic: true,
      isSensor: true,
      render: { fillStyle: '#7cf5ff', strokeStyle: '#ffffff', lineWidth: 2 },
    }) as TaggedBody;
    anchor.gameType = 'anchor';

    const rope = Constraint.create({
      pointA: currentLevel.anchor,
      bodyB: ball,
      pointB: { x: 0, y: 0 },
      length: currentLevel.ropeLength,
      stiffness: 0.92,
      damping: 0.045,
      render: {
        visible: true,
        strokeStyle: '#7cf5ff',
        lineWidth: 4,
        type: 'line',
      },
    });

    const hole = Bodies.circle(currentLevel.hole.x, currentLevel.hole.y, currentLevel.hole.radius, {
      isStatic: true,
      isSensor: true,
      render: { fillStyle: '#070a18', strokeStyle: '#42e8b4', lineWidth: 4 },
    }) as TaggedBody;
    hole.gameType = 'hole';

    const defaultWalls: TaggedBody[] = [
      Bodies.rectangle(WORLD_WIDTH / 2, WORLD_HEIGHT + 28, WORLD_WIDTH + 120, 56, {
        isStatic: true,
        friction: 0.88,
        render: { fillStyle: '#10172b', strokeStyle: '#26385f', lineWidth: 2 },
      }) as TaggedBody,
      Bodies.rectangle(-28, WORLD_HEIGHT / 2, 56, WORLD_HEIGHT + 120, {
        isStatic: true,
        render: { fillStyle: '#10172b' },
      }) as TaggedBody,
      Bodies.rectangle(WORLD_WIDTH + 28, WORLD_HEIGHT / 2, 56, WORLD_HEIGHT + 120, {
        isStatic: true,
        render: { fillStyle: '#10172b' },
      }) as TaggedBody,
      Bodies.rectangle(WORLD_WIDTH / 2, -28, WORLD_WIDTH + 120, 56, {
        isStatic: true,
        render: { fillStyle: '#10172b' },
      }) as TaggedBody,
    ];
    defaultWalls.forEach((body) => {
      body.gameType = 'wall';
    });

    const breakables = currentLevel.blocks.map(createBreakable);
    const extraWalls = currentLevel.extraWalls?.map(createSolidWall) ?? [];
    const bumpers =
      currentLevel.bumpers?.map((bumper) => {
        const body = Bodies.circle(bumper.x, bumper.y, bumper.radius, {
          isStatic: true,
          restitution: 1.45,
          friction: 0.03,
          render: { fillStyle: bumper.color ?? '#ffce3a', strokeStyle: '#fff5a8', lineWidth: 3 },
        }) as TaggedBody;
        body.gameType = 'bumper';
        return body;
      }) ?? [];

    const movingBodies: MovingBody[] =
      currentLevel.moving?.map((definition, index) => {
        const body = Bodies.rectangle(definition.x, definition.y, definition.width, definition.height, {
          isStatic: true,
          restitution: 1.25,
          friction: 0.08,
          render: {
            fillStyle: definition.color ?? '#37d5ff',
            strokeStyle: '#e6fbff',
            lineWidth: 3,
          },
        }) as TaggedBody;
        body.gameType = 'moving';
        return { body, definition, start: { x: definition.x, y: definition.y }, phase: index * Math.PI * 0.7 };
      }) ?? [];

    Composite.add(world, [
      ...defaultWalls,
      ...extraWalls,
      ...breakables,
      ...bumpers,
      ...movingBodies.map(({ body }) => body),
      hole,
      anchor,
      ball,
      rope,
    ]);

    const particles = new Set<TaggedBody>();

    const addBurst = (position: Vec2, color = '#7cf5ff', count = 10) => {
      for (let index = 0; index < count; index += 1) {
        const shard = Bodies.circle(position.x, position.y, randomBetween(2.5, 5.5), {
          frictionAir: 0.04,
          restitution: 0.4,
          density: 0.0008,
          render: { fillStyle: color, strokeStyle: '#ffffff', lineWidth: 1 },
        }) as TaggedBody;
        shard.gameType = 'particle';
        shard.ttl = Math.round(randomBetween(35, 70));
        Body.setVelocity(shard, { x: randomBetween(-7, 7), y: randomBetween(-9, -1) });
        Body.setAngularVelocity(shard, randomBetween(-0.3, 0.3));
        particles.add(shard);
        Composite.add(world, shard);
      }
    };

    const damageBlock = (body: TaggedBody, impactSpeed: number, hitPoint: Vec2) => {
      if (body.gameType !== 'breakable' || body.health === undefined) return;
      if (impactSpeed < 3.35) return;

      body.health -= impactSpeed > 7.5 ? 2 : 1;
      body.render.opacity = clamp((body.health ?? 0) / (body.maxHealth ?? 1), 0.34, 1);
      Body.setAngularVelocity(body, body.angularVelocity + randomBetween(-0.08, 0.08));
      addBurst(hitPoint, body.render.fillStyle, impactSpeed > 7.5 ? 9 : 5);

      if (body.health <= 0) {
        state.score += Math.round(120 + impactSpeed * 14);
        state.broken += 1;
        state.message = impactSpeed > 7.5 ? 'Impact sale. Bloc pulvérisé.' : 'Bloc cassé.';
        Composite.remove(world, body);
        addBurst(body.position, body.render.fillStyle, 14);
      }
    };

    const scoreBumperHit = (hitPoint: Vec2) => {
      state.score += 25;
      state.message = 'Bumper ! Garde le contrôle.';
      addBurst(hitPoint, '#ffce3a', 7);
    };

    const finishLevel = () => {
      if (state.levelComplete) return;
      state.levelComplete = true;
      const parBonus = Math.max(0, currentLevel.par - state.shots + 1) * 250;
      const clearBonus = state.broken * 50;
      state.score += 600 + parBonus + clearBonus;
      state.message = state.shots <= currentLevel.par ? 'Dans le trou. Propre.' : 'Ça rentre. Pas académique, mais ça rentre.';
      addBurst(currentLevel.hole, '#42e8b4', 24);
      publishMetrics();
    };

    Events.on(engine, 'collisionStart', (event) => {
      for (const pair of event.pairs) {
        const bodyA = pair.bodyA as TaggedBody;
        const bodyB = pair.bodyB as TaggedBody;
        const relativeSpeed = Vector.magnitude(Vector.sub(bodyA.velocity, bodyB.velocity));
        const support = pair.collision.supports[0] ?? ball.position;
        const hitPoint = { x: support.x, y: support.y };

        damageBlock(bodyA, relativeSpeed, hitPoint);
        damageBlock(bodyB, relativeSpeed, hitPoint);

        const hitBall = bodyA.gameType === 'ball' || bodyB.gameType === 'ball';
        const hitBumper = bodyA.gameType === 'bumper' || bodyB.gameType === 'bumper' || bodyA.gameType === 'moving' || bodyB.gameType === 'moving';
        if (hitBall && hitBumper && relativeSpeed > 2.4) {
          scoreBumperHit(hitPoint);
        }
      }
    });

    Events.on(engine, 'beforeUpdate', (event) => {
      for (const moving of movingBodies) {
        const wave = Math.sin(event.timestamp * moving.definition.speed + moving.phase) * moving.definition.amplitude;
        Body.setPosition(moving.body, {
          x: moving.start.x + (moving.definition.axis === 'x' ? wave : 0),
          y: moving.start.y + (moving.definition.axis === 'y' ? wave : 0),
        });
      }
    });

    Events.on(engine, 'afterUpdate', (event) => {
      for (const particle of particles) {
        particle.ttl = (particle.ttl ?? 0) - 1;
        particle.render.opacity = clamp((particle.ttl ?? 0) / 60, 0, 1);
        if ((particle.ttl ?? 0) <= 0) {
          particles.delete(particle);
          Composite.remove(world, particle);
        }
      }

      const ballSpeed = Vector.magnitude(ball.velocity);
      const inHole = distance(ball.position, currentLevel.hole) < currentLevel.hole.radius * 0.72;
      if (inHole && ballSpeed < 3.2 && !state.aiming) {
        Body.setVelocity(ball, { x: 0, y: 0 });
        Body.setAngularVelocity(ball, 0);
        finishLevel();
      }

      if (event.timestamp - state.lastUiFrame > 120) {
        state.lastUiFrame = event.timestamp;
        publishMetrics();
      }
    });

    Events.on(render, 'afterRender', () => {
      const context = render.context;
      context.save();

      context.globalAlpha = 0.9;
      context.lineWidth = 2;
      context.strokeStyle = 'rgba(124, 245, 255, 0.22)';
      for (let x = 80; x < WORLD_WIDTH; x += 80) {
        context.beginPath();
        context.moveTo(x, 0);
        context.lineTo(x, WORLD_HEIGHT);
        context.stroke();
      }
      for (let y = 60; y < WORLD_HEIGHT; y += 60) {
        context.beginPath();
        context.moveTo(0, y);
        context.lineTo(WORLD_WIDTH, y);
        context.stroke();
      }

      context.globalAlpha = 1;
      context.strokeStyle = 'rgba(66, 232, 180, 0.85)';
      context.lineWidth = 5;
      context.beginPath();
      context.arc(currentLevel.hole.x, currentLevel.hole.y, currentLevel.hole.radius + 8, 0, Math.PI * 2);
      context.stroke();

      context.fillStyle = 'rgba(124, 245, 255, 0.18)';
      context.beginPath();
      context.arc(currentLevel.anchor.x, currentLevel.anchor.y, currentLevel.ropeLength, 0, Math.PI * 2);
      context.fill();

      if (state.aiming) {
        const pull = distance(ball.position, currentLevel.anchor);
        const charge = clamp((pull - 75) / Math.max(1, currentLevel.ropeLength - 75), 0, 1);
        context.strokeStyle = `rgba(255, 206, 58, ${0.35 + charge * 0.55})`;
        context.lineWidth = 7;
        context.beginPath();
        context.moveTo(ball.position.x, ball.position.y);
        context.lineTo(currentLevel.anchor.x, currentLevel.anchor.y);
        context.stroke();

        context.fillStyle = 'rgba(255, 206, 58, 0.92)';
        context.font = '700 18px Inter, system-ui, sans-serif';
        context.fillText(`charge ${Math.round(charge * 100)}%`, ball.position.x + 34, ball.position.y - 24);
      }

      context.restore();
    });

    const canvas = render.canvas;
    canvas.className = 'game-canvas';
    canvas.style.touchAction = 'none';
    canvas.tabIndex = 0;
    canvas.setAttribute('role', 'application');
    canvas.setAttribute('aria-label', 'Zone de jeu. Utilisez la souris, le doigt ou le clavier.');

    let activePointerId: number | null = null;
    const beginAimAt = (point: Vec2, pointerId?: number) => {
      if (state.levelComplete) return;

      const clampedPoint = clampToRope(point, currentLevel.anchor, currentLevel.ropeLength);
      activePointerId = pointerId ?? null;

      state.aiming = true;
      state.message = 'Relâche pour envoyer la boule.';
      state.aimPoint = clampedPoint;
      Body.setStatic(ball, true);
      Body.setAngularVelocity(ball, 0);
      Body.setVelocity(ball, { x: 0, y: 0 });
      Body.setPosition(ball, clampedPoint);
      if (pointerId !== undefined) {
        canvas.setPointerCapture(pointerId);
      }

      canvas.focus();
      publishMetrics();
    };

    const updateAim = (point: Vec2) => {
      if (!state.aiming) return;
      const clampedPoint = clampToRope(point, currentLevel.anchor, currentLevel.ropeLength);
      state.aimPoint = clampedPoint;
      Body.setPosition(ball, clampedPoint);
      Body.setVelocity(ball, { x: 0, y: 0 });
    };

    const launchAim = () => {
      if (!state.aiming) return;
      const pullDistance = distance(ball.position, currentLevel.anchor);
      state.aiming = false;
      if (activePointerId !== null) {
        canvas.releasePointerCapture(activePointerId);
        activePointerId = null;
      }

      Body.setStatic(ball, false);

      if (pullDistance < MIN_SHOT_PULL) {
        state.message = 'Pas assez tiré. Recommence plus fort.';
        publishMetrics();
        return;
      }

      const launchVector = vectorToAnchor(ball.position, currentLevel.anchor);
      const launchDirection = Vector.normalise(launchVector);
      const launchSpeed = clamp((pullDistance / currentLevel.ropeLength) * MAX_LAUNCH_SPEED, 4.5, MAX_LAUNCH_SPEED);
      Body.setVelocity(ball, Vector.mult(launchDirection, launchSpeed));
      Body.setAngularVelocity(ball, (currentLevel.anchor.x - ball.position.x) * 0.0018);

      state.shots += 1;
      state.score = Math.max(0, state.score - 15);
      state.message = launchSpeed > 14 ? 'Gros swing. Maintenant prie.' : 'Swing lancé.';
      publishMetrics();
    };

    const cancelCurrentAim = () => {
      if (!state.aiming) return;
      state.aiming = false;
      if (activePointerId !== null) {
        canvas.releasePointerCapture(activePointerId);
        activePointerId = null;
      }
      Body.setStatic(ball, false);
      publishMetrics();
    };

    const beginKeyboardAim = () => {
      beginAimAt({ x: ball.position.x - 28, y: ball.position.y });
    };

    const moveKeyboardAim = (dx: number, dy: number) => {
      if (!state.aiming) {
        beginKeyboardAim();
      }
      updateAim({ x: state.aimPoint.x + dx, y: state.aimPoint.y + dy });
    };

    const onCanvasKeyDown = (event: KeyboardEvent) => {
      const key = event.key.toLowerCase();
      if (key === ' ' || key === 'enter' || key === 'escape') {
        event.preventDefault();
      }

      if (key === ' ' || key === 'enter') {
        if (state.aiming) {
          launchAim();
          return;
        }

        beginKeyboardAim();
        return;
      }

      if (key === 'escape') {
        cancelCurrentAim();
        return;
      }

      if (key === 'arrowleft' || key === 'a') {
        moveKeyboardAim(-KEY_AIM_STEP, 0);
        return;
      }

      if (key === 'arrowright' || key === 'd') {
        moveKeyboardAim(KEY_AIM_STEP, 0);
        return;
      }

      if (key === 'arrowup' || key === 'w') {
        moveKeyboardAim(0, -KEY_AIM_STEP);
        return;
      }

      if (key === 'arrowdown' || key === 's') {
        moveKeyboardAim(0, KEY_AIM_STEP);
        return;
      }

      if (key === 'r' || key === 'f') {
        if (!state.aiming) {
          resetLevel();
        }
      }
    };

    const startAim = (event: PointerEvent) => {
      const point = pointFromPointer(event, canvas);
      if (distance(point, ball.position) > 105) return;
      beginAimAt(point, event.pointerId);
    };

    const moveAim = (event: PointerEvent) => {
      if (!state.aiming || activePointerId !== event.pointerId) return;
      const point = pointFromPointer(event, canvas);
      updateAim(point);
    };

    const releaseAim = (event: PointerEvent) => {
      if (!state.aiming || activePointerId !== event.pointerId) return;
      launchAim();
    };

    const cancelAimFromPointer = (event: PointerEvent) => {
      if (!state.aiming || activePointerId !== event.pointerId) return;
      cancelCurrentAim();
    };

    canvas.addEventListener('pointerdown', startAim);
    canvas.addEventListener('pointermove', moveAim);
    canvas.addEventListener('pointerup', releaseAim);
    canvas.addEventListener('pointercancel', cancelAimFromPointer);
    canvas.addEventListener('lostpointercapture', cancelAimFromPointer);
    canvas.addEventListener('keydown', onCanvasKeyDown);
    canvas.addEventListener('blur', cancelCurrentAim);

    Render.run(render);
    Runner.run(runner, engine);
    publishMetrics();

    return () => {
      canvas.removeEventListener('pointerdown', startAim);
      canvas.removeEventListener('pointermove', moveAim);
      canvas.removeEventListener('pointerup', releaseAim);
      canvas.removeEventListener('pointercancel', cancelAimFromPointer);
      canvas.removeEventListener('lostpointercapture', cancelAimFromPointer);
      canvas.removeEventListener('keydown', onCanvasKeyDown);
      canvas.removeEventListener('blur', cancelCurrentAim);
      Render.stop(render);
      Runner.stop(runner);
      Composite.clear(world, false);
      Engine.clear(engine);
      render.canvas.remove();
      render.textures = {};
    };
  }, [levelIndex, resetKey]);

  return (
    <main className="shell">
      <section className="hero" aria-labelledby="game-title">
        <div>
          <p className="eyebrow">Prototype physique</p>
          <h1 id="game-title">Wrecking Ball Golf</h1>
          <p className="tagline">Mini-golf au pendule : tire, relâche, casse les blocs, tombe dans le trou.</p>
        </div>
        <div className="level-card" aria-live="polite">
          <span>Niveau {levelIndex + 1}/3</span>
          <strong>{level.name}</strong>
          <small>Par {level.par}</small>
        </div>
      </section>

      <section className="hud" aria-label="Game stats">
        <div>
          <span>Score</span>
          <strong>{metrics.score}</strong>
        </div>
        <div>
          <span>Coups</span>
          <strong>{metrics.shots}</strong>
        </div>
        <div>
          <span>Blocs cassés</span>
          <strong>{metrics.broken}/{level.blocks.length}</strong>
        </div>
        <div className={metrics.levelComplete ? 'status won' : 'status'}>
          <span>État</span>
          <strong>{metrics.levelComplete ? 'Trou !' : 'En jeu'}</strong>
        </div>
      </section>

      <section className="game-panel">
        <div className="game-wrap" ref={gameHostRef} aria-label="Wrecking Ball Golf canvas" />
      </section>

      <section className="controls">
        <p>{metrics.message}</p>
        <p className="keyboard-help">
          Contrôles clavier: flèches ou WASD pour viser, Entrée/Espace pour charger puis lancer,
          Échap pour annuler, R/F pour recommencer le niveau.
        </p>
        <div className="button-row">
          <button type="button" onClick={resetLevel}>Reset</button>
          <button type="button" onClick={goToNextLevel}>{metrics.levelComplete ? 'Niveau suivant' : 'Skip niveau'}</button>
        </div>
      </section>
    </main>
  );
}

export default App;
