import { describe, it, expect, vi, afterEach } from 'vitest';
import { throttle } from '../../scripts/utils.js';

describe('utils', () => {
    afterEach(() => {
        vi.useRealTimers();
    });

    describe('throttle', () => {
        it('should execute the function immediately', () => {
            const func = vi.fn();
            const throttledFunc = throttle(func, 1000);

            throttledFunc();
            expect(func).toHaveBeenCalledTimes(1);
        });

        it('should ignore calls within the time limit', () => {
            vi.useFakeTimers();
            const func = vi.fn();
            const throttledFunc = throttle(func, 1000);

            throttledFunc(); // 1st call (executes)
            throttledFunc(); // 2nd call (ignored)
            throttledFunc(); // 3rd call (ignored)

            expect(func).toHaveBeenCalledTimes(1);

            // Fast forward time
            vi.advanceTimersByTime(1001);

            throttledFunc(); // 4th call (executes)
            expect(func).toHaveBeenCalledTimes(2);
        });
    });
});
