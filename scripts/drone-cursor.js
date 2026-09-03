const DRONE_MARKUP = `
    <span class="cursor-drone__trail"></span>
    <span class="cursor-drone__pulse"></span>
    <div class="cursor-drone__inner">
        <svg class="cursor-drone__icon" viewBox="0 0 64 40" fill="none" xmlns="http://www.w3.org/2000/svg">
            <rect x="26" y="15" width="12" height="8" rx="2" fill="currentColor" opacity="0.95"/>
            <circle cx="32" cy="24" r="3" fill="#05081C"/>
            <path d="M26 18L10 9" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/>
            <path d="M38 18L54 9" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/>
            <path d="M26 21L10 31" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/>
            <path d="M38 21L54 31" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/>
            <circle cx="10" cy="9" r="5.5" stroke="currentColor" stroke-width="2" opacity="0.9"/>
            <circle cx="54" cy="9" r="5.5" stroke="currentColor" stroke-width="2" opacity="0.9"/>
            <circle cx="10" cy="31" r="5.5" stroke="currentColor" stroke-width="2" opacity="0.9"/>
            <circle cx="54" cy="31" r="5.5" stroke="currentColor" stroke-width="2" opacity="0.9"/>
            <path d="M7 9H13M10 6V12" stroke="currentColor" stroke-width="1.3" stroke-linecap="round"/>
            <path d="M51 9H57M54 6V12" stroke="currentColor" stroke-width="1.3" stroke-linecap="round"/>
            <path d="M7 31H13M10 28V34" stroke="currentColor" stroke-width="1.3" stroke-linecap="round"/>
            <path d="M51 31H57M54 28V34" stroke="currentColor" stroke-width="1.3" stroke-linecap="round"/>
        </svg>
    </div>
`;

// How far the drone hovers from the raw pointer position (up-and-right of the
// cursor, so it reads as "escorting" the pointer rather than sitting on it).
const DRONE_OFFSET_X = 52;
const DRONE_OFFSET_Y = -46;

// Half-width/height of the drone's visual center within its `.cursor-drone`
// box (56x42), used to anchor the spotlight beam on the drone body rather
// than its top-left corner.
const DRONE_CENTER_X = 28;
const DRONE_CENTER_Y = 21;

function shouldDisableDroneCursor() {
    if (typeof window === 'undefined') {
        return true;
    }

    const supportsMatchMedia = typeof window.matchMedia === 'function';

    if (!supportsMatchMedia) {
        return false;
    }

    return window.matchMedia('(prefers-reduced-motion: reduce)').matches ||
        window.matchMedia('(pointer: coarse)').matches;
}

export function initDroneCursor() {
    if (shouldDisableDroneCursor()) {
        return null;
    }

    const existingDrone = document.querySelector('.cursor-drone');
    if (existingDrone) {
        return existingDrone;
    }

    const drone = document.createElement('div');
    drone.className = 'cursor-drone';
    drone.setAttribute('aria-hidden', 'true');
    drone.innerHTML = DRONE_MARKUP;
    document.body.appendChild(drone);

    // Transparent spotlight/laser line rendered from the drone body to the
    // real pointer position, so the drone reads as "watching" the cursor
    // even while it hovers offset from it.
    const beam = document.createElement('div');
    beam.className = 'cursor-drone__beam';
    beam.setAttribute('aria-hidden', 'true');
    document.body.appendChild(beam);

    let currentX = window.innerWidth * 0.72;
    let currentY = Math.max(120, window.innerHeight * 0.2);
    let targetX = currentX;
    let targetY = currentY;
    let pointerX = currentX;
    let pointerY = currentY;
    let frameId = null;

    const requestFrame = window.requestAnimationFrame?.bind(window) || ((callback) => window.setTimeout(callback, 16));
    const cancelFrame = window.cancelAnimationFrame?.bind(window) || window.clearTimeout.bind(window);

    const render = () => {
        const dx = targetX - currentX;
        const dy = targetY - currentY;

        currentX += dx * 0.16;
        currentY += dy * 0.16;

        const tilt = Math.max(-16, Math.min(16, dx * 0.12));
        drone.style.setProperty('--drone-tilt', `${tilt.toFixed(2)}deg`);
        drone.style.transform = `translate3d(${currentX.toFixed(2)}px, ${currentY.toFixed(2)}px, 0)`;
        drone.classList.add('is-visible');

        const droneCenterX = currentX + DRONE_CENTER_X;
        const droneCenterY = currentY + DRONE_CENTER_Y;
        const beamDx = pointerX - droneCenterX;
        const beamDy = pointerY - droneCenterY;
        const beamLength = Math.hypot(beamDx, beamDy);
        const beamAngle = Math.atan2(beamDy, beamDx) * (180 / Math.PI);

        beam.style.width = `${beamLength.toFixed(2)}px`;
        beam.style.transform = `translate3d(${droneCenterX.toFixed(2)}px, ${droneCenterY.toFixed(2)}px, 0) rotate(${beamAngle.toFixed(2)}deg)`;
        beam.classList.add('is-visible');

        if (Math.abs(dx) > 0.3 || Math.abs(dy) > 0.3) {
            frameId = requestFrame(render);
            return;
        }

        frameId = null;
    };

    const moveDrone = (event) => {
        targetX = event.clientX + DRONE_OFFSET_X;
        targetY = event.clientY + DRONE_OFFSET_Y;
        pointerX = event.clientX;
        pointerY = event.clientY;

        document.documentElement.style.setProperty('--pointer-x', `${event.clientX}px`);
        document.documentElement.style.setProperty('--pointer-y', `${event.clientY}px`);

        if (!frameId) {
            frameId = requestFrame(render);
        }
    };

    const boostDrone = () => drone.classList.add('cursor-drone--boost');
    const settleDrone = () => drone.classList.remove('cursor-drone--boost');
    const hideDrone = () => {
        if (frameId !== null) {
            cancelFrame(frameId);
            frameId = null;
        }
        drone.classList.remove('is-visible');
        beam.classList.remove('is-visible');
    };

    drone.style.transform = `translate3d(${currentX.toFixed(2)}px, ${currentY.toFixed(2)}px, 0)`;

    window.addEventListener('pointermove', moveDrone, { passive: true });
    window.addEventListener('pointerdown', boostDrone, { passive: true });
    window.addEventListener('pointerup', settleDrone, { passive: true });
    window.addEventListener('blur', settleDrone);
    document.addEventListener('mouseleave', hideDrone);
    document.addEventListener('visibilitychange', () => {
        if (document.hidden && frameId) {
            cancelFrame(frameId);
            frameId = null;
        }
    });

    return drone;
}
