/** Lively desktop forwards mouse moves without normal pressed-button state and omits wheel input. */
export class SettingsInteraction {
  private removers: (() => void)[] = [];
  private drag: ((x: number, y: number) => void) | null = null;
  private finish: (() => void) | null = null;
  private popup: HTMLElement | null = null;
  private select: HTMLSelectElement | null = null;
  constructor(panel: HTMLElement) {
    const listen = (element: EventTarget, type: string, fn: EventListener, capture = false) => {
      element.addEventListener(type, fn, capture); this.removers.push(() => element.removeEventListener(type, fn, capture));
    };
    const content = panel.querySelector<HTMLElement>('.settings-content')!;
    const navigation = document.createElement('div'); navigation.className = 'settings-scroll-buttons';
    for (const [direction, label] of [[-1, 'Scroll settings up'], [1, 'Scroll settings down']] as const) {
      const button = document.createElement('button'); button.type = 'button'; button.className = 'icon-button';
      button.textContent = direction < 0 ? '↑' : '↓'; button.setAttribute('aria-label', label);
      listen(button, 'click', () => { content.scrollTop += direction * content.clientHeight * .75; }); navigation.append(button);
    }
    panel.querySelector('.panel-title')!.append(navigation);
    const rail = document.createElement('div'), thumb = document.createElement('div');
    rail.className = 'settings-scroll-rail'; thumb.className = 'settings-scroll-thumb'; rail.append(thumb); panel.append(rail);
    content.id ||= 'settings-scroll-content'; rail.setAttribute('aria-controls', content.id);
    rail.role = 'scrollbar'; rail.tabIndex = 0; rail.setAttribute('aria-label', 'Scroll settings'); rail.setAttribute('aria-orientation', 'vertical');
    rail.setAttribute('aria-valuemin', '0');
    const refresh = () => {
      const max = Math.max(0, content.scrollHeight - content.clientHeight);
      const height = Math.max(24, rail.clientHeight * content.clientHeight / Math.max(1, content.scrollHeight));
      thumb.style.height = `${height}px`; thumb.style.transform = `translateY(${max ? content.scrollTop / max * (rail.clientHeight - height) : 0}px)`;
      rail.setAttribute('aria-valuemax', String(max)); rail.setAttribute('aria-valuenow', String(Math.round(content.scrollTop)));
    };
    const begin = (event: PointerEvent, move: (x: number, y: number) => void, finish: (() => void) | null = null) => {
      if (event.button !== 0) return;
      event.preventDefault(); this.closeMenu(); this.finish = finish; this.drag = move; move(event.clientX, event.clientY);
    };
    listen(rail, 'pointerdown', raw => {
      const event = raw as PointerEvent; refresh();
      const start = rail.getBoundingClientRect(), height = thumb.getBoundingClientRect().height;
      const offset = event.target === thumb ? event.clientY - thumb.getBoundingClientRect().top : height / 2;
      begin(event, (_x, y) => { content.scrollTop = (y - start.top - offset) / Math.max(1, start.height - height) * (content.scrollHeight - content.clientHeight); refresh(); });
    });
    listen(rail, 'keydown', raw => {
      const event = raw as KeyboardEvent;
      if (['ArrowDown', 'ArrowUp', 'PageDown', 'PageUp', 'Home', 'End'].includes(event.key)) {
        event.preventDefault();
        content.scrollTop = event.key === 'Home' ? 0 : event.key === 'End' ? content.scrollHeight : content.scrollTop + (['ArrowDown', 'PageDown'].includes(event.key) ? 1 : -1) * (event.key.startsWith('Page') ? content.clientHeight : 40);
      }
    });
    listen(content, 'scroll', () => { refresh(); this.closeMenu(); });
    for (const slider of panel.querySelectorAll<HTMLInputElement>('input[type=range]')) {
      slider.style.touchAction = 'none';
      listen(slider, 'pointerdown', raw => {
        const event = raw as PointerEvent, bounds = slider.getBoundingClientRect(); slider.focus({ preventScroll: true });
        begin(event, x => {
          const min = Number(slider.min || 0), max = Number(slider.max || 100), step = Number(slider.step || 1);
          const fraction = Math.max(0, Math.min(1, (x - bounds.left - 7) / Math.max(1, bounds.width - 14)));
          slider.value = String(min + Math.round(fraction * (max - min) / step) * step);
          slider.dispatchEvent(new Event('input', { bubbles: true }));
        }, () => slider.dispatchEvent(new Event('change', { bubbles: true })));
      });
    }
    listen(document, 'pointermove', raw => {
      if (panel.hidden) { this.drag = null; this.closeMenu(); return; }
      const event = raw as PointerEvent; this.drag?.(event.clientX, event.clientY);
    }, true);
    listen(document, 'pointerup', () => { if (this.drag) this.finish?.(); this.finish = null; this.drag = null; }, true);
    listen(document, 'pointercancel', () => { this.drag = null; }, true);
    listen(window, 'blur', () => { this.drag = null; this.closeMenu(); });
    for (const select of panel.querySelectorAll<HTMLSelectElement>('select')) {
      listen(select, 'pointerdown', raw => {
        const event = raw as PointerEvent; if (event.button !== 0) return;
        event.preventDefault(); select.focus({ preventScroll: true });
        if (this.select === select) { this.closeMenu(); return; }
        this.closeMenu(); this.select = select;
        const popup = document.createElement('div'); popup.className = `settings-options${select.options.length > 8 ? ' settings-options-grid' : ''}`; popup.role = 'listbox';
        popup.setAttribute('aria-label', select.closest('label')?.childNodes[0]?.textContent || 'Choose an option');
        const bounds = select.getBoundingClientRect();
        popup.style.left = `${bounds.left}px`; popup.style.width = `${bounds.width}px`;
        popup.style.maxHeight = `${Math.max(100, window.innerHeight - 40)}px`;
        for (const option of select.options) {
          const button = document.createElement('button'); button.type = 'button'; button.role = 'option'; button.textContent = option.text;
          button.disabled = option.disabled; button.setAttribute('aria-selected', String(option.selected));
          button.onclick = () => { select.value = option.value; select.dispatchEvent(new Event('input', { bubbles: true })); select.dispatchEvent(new Event('change', { bubbles: true })); this.closeMenu(); select.focus({ preventScroll: true }); };
          popup.append(button);
        }
        document.body.append(popup); this.popup = popup;
        popup.style.top = `${Math.max(10, Math.min(bounds.bottom + 3, window.innerHeight - popup.offsetHeight - 10))}px`;
        popup.querySelector<HTMLElement>('[aria-selected=true]')?.scrollIntoView({ block: 'nearest' });
      });
      listen(select, 'click', event => event.preventDefault());
    }
    listen(document, 'pointerdown', event => { this.drag = null; this.finish = null; if (!this.popup?.contains(event.target as Node) && event.target !== this.select) this.closeMenu(); }, true);
    listen(document, 'keydown', raw => { if (['Escape', 'Tab'].includes((raw as KeyboardEvent).key)) this.closeMenu(); }, true);
    const resize = new ResizeObserver(refresh); resize.observe(content); this.removers.push(() => resize.disconnect());
    const hidden = new MutationObserver(() => { if (panel.hidden) { this.drag = null; this.closeMenu(); } refresh(); });
    hidden.observe(panel, { attributes: true, attributeFilter: ['hidden'] }); this.removers.push(() => hidden.disconnect());
    refresh();
  }
  private closeMenu(): void { this.popup?.remove(); this.popup = null; this.select = null; }
  dispose(): void { this.closeMenu(); this.removers.forEach(remove => remove()); }
}
