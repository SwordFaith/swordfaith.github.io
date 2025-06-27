// AstroWind-style Intersection Observer Animation System
export interface IntersectionObserverOptions {
  threshold?: number;
  rootMargin?: string;
  once?: boolean;
}

export class AnimationObserver {
  private observer: IntersectionObserver | null = null;
  private elements: Map<Element, () => void> = new Map();

  constructor(options: IntersectionObserverOptions = {}) {
    const {
      threshold = 0.25,
      rootMargin = '0px 0px -100px 0px',
      once = true
    } = options;

    if (typeof window !== 'undefined' && 'IntersectionObserver' in window) {
      this.observer = new IntersectionObserver((entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const element = entry.target;
            const callback = this.elements.get(element);
            
            if (callback) {
              callback();
              
              if (once) {
                this.unobserve(element);
              }
            }
          }
        });
      }, {
        threshold,
        rootMargin
      });
    }
  }

  observe(element: Element, callback: () => void): void {
    if (this.observer) {
      this.elements.set(element, callback);
      this.observer.observe(element);
    } else {
      // Fallback for environments without IntersectionObserver
      callback();
    }
  }

  unobserve(element: Element): void {
    if (this.observer) {
      this.observer.unobserve(element);
      this.elements.delete(element);
    }
  }

  disconnect(): void {
    if (this.observer) {
      this.observer.disconnect();
      this.elements.clear();
    }
  }
}

// Default animation functions
export const fadeInUp = (element: Element) => {
  element.classList.add('intersect');
};

export const fadeIn = (element: Element) => {
  element.classList.add('opacity-100');
  element.classList.remove('opacity-0');
};

export const slideInLeft = (element: Element) => {
  element.classList.add('translate-x-0', 'opacity-100');
  element.classList.remove('-translate-x-8', 'opacity-0');
};

export const slideInRight = (element: Element) => {
  element.classList.add('translate-x-0', 'opacity-100');
  element.classList.remove('translate-x-8', 'opacity-0');
};

// Initialize animations when DOM is ready
export const initAnimations = () => {
  if (typeof window === 'undefined') return;

  const observer = new AnimationObserver({
    threshold: 0.25,
    rootMargin: '0px 0px -100px 0px',
    once: true
  });

  // Fade in up animations
  const fadeInUpElements = document.querySelectorAll('.fade-in-up');
  fadeInUpElements.forEach((element) => {
    observer.observe(element, () => fadeInUp(element));
  });

  // Fade in animations
  const fadeInElements = document.querySelectorAll('.animate-fade-in');
  fadeInElements.forEach((element) => {
    observer.observe(element, () => fadeIn(element));
  });

  // Slide in left animations
  const slideLeftElements = document.querySelectorAll('.animate-slide-left');
  slideLeftElements.forEach((element) => {
    observer.observe(element, () => slideInLeft(element));
  });

  // Slide in right animations
  const slideRightElements = document.querySelectorAll('.animate-slide-right');
  slideRightElements.forEach((element) => {
    observer.observe(element, () => slideInRight(element));
  });

  // Cleanup on page unload
  window.addEventListener('beforeunload', () => {
    observer.disconnect();
  });
};

// Auto-initialize when script loads
if (typeof window !== 'undefined') {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initAnimations);
  } else {
    initAnimations();
  }
}