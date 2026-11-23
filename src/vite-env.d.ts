/// <reference types="vite/client" />

declare module "gsap-trial/SplitText" {
  export class SplitText {
    chars: HTMLElement[];
    words: HTMLElement[];
    lines: HTMLElement[];
    constructor(target: unknown, vars?: unknown);
    revert(): void;
  }
}

declare module "gsap-trial/ScrollSmoother" {
  export class ScrollSmoother {
    static create(vars: unknown): ScrollSmoother;
    static get(): ScrollSmoother;
    static refresh(soft?: boolean): void;
    scrollTop(value?: number): number;
    paused(state?: boolean): boolean;
    scrollTo(target: unknown, smooth?: boolean, position?: string): void;
    kill(): void;
  }
}
