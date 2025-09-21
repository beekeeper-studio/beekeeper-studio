// UI-only enhancer: adds a dot-menu inside the search panel and toggles the replace row from there
(function () {
  function enhancePanel(panel: HTMLElement) {
    if (panel.classList.contains('bks-enhanced')) return;
    panel.classList.add('bks-enhanced');

    const container = panel.closest('.json-viewer') as HTMLElement | null;
    if (!container) return;

    // Default: hide replace row on initial enhance
    panel.classList.add('bks-hide-replace');
    const isHidden = panel.classList.contains('bks-hide-replace');
    const toggleReplaceLabel = isHidden ? 'Show Replace Row' : 'Hide Replace Row';

    const menuBtn = document.createElement('button');
    menuBtn.type = 'button';
    menuBtn.className = 'bks-json-menu cm-button';
    menuBtn.setAttribute('aria-label', 'More');
    menuBtn.setAttribute('title', 'More');

    const menu = document.createElement('div');
    menu.className = 'bks-json-menu-popover';
    menu.innerHTML = `
      <button class="bks-json-menu-item" data-action="toggle-replace-row">${toggleReplaceLabel}</button>
      <button class="bks-json-menu-item" data-action="copy-visible">Copy Visible</button>
      <button class="bks-json-menu-item" data-action="collapse-all">Collapse all</button>
      <button class="bks-json-menu-item" data-action="expand-all">Expand all</button>
      <button class="bks-json-menu-item" data-action="toggle-expand-fk">Always Expand Foreign Keys</button>
      <button class="bks-json-menu-item" data-action="toggle-wrap-text">Wrap Text</button>
    `;

    const dispatch = (type: string) => {
      const ev = new CustomEvent(type, { bubbles: true, cancelable: true });
      container.dispatchEvent(ev);
    };

    menu.addEventListener('click', (e) => {
      const target = e.target as HTMLElement;
      if (!target || !target.matches('.bks-json-menu-item')) return;
      const action = target.getAttribute('data-action');
      switch (action) {
        case 'toggle-replace-row': {
          panel.classList.toggle('bks-hide-replace');
          const hidden = panel.classList.contains('bks-hide-replace');
          const item = menu.querySelector('.bks-json-menu-item[data-action="toggle-replace-row"]') as HTMLButtonElement | null;
          if (item) item.textContent = hidden ? 'Show Replace Row' : 'Hide Replace Row';
          break;
        }
        case 'copy-visible': dispatch('bks-json-menu:copy-visible'); break;
        case 'collapse-all': dispatch('bks-json-menu:collapse-all'); break;
        case 'expand-all': dispatch('bks-json-menu:expand-all'); break;
        case 'toggle-expand-fk': dispatch('bks-json-menu:toggle-expand-fk'); break;
        case 'toggle-wrap-text': dispatch('bks-json-menu:toggle-wrap-text'); break;
      }
      menuBtn.classList.remove('open');
    });

    menuBtn.addEventListener('click', (e) => {
      e.preventDefault();
      menuBtn.classList.toggle('open');
    });

    document.addEventListener('click', (e) => {
      if (!(e.target instanceof Node)) return;
      if (menuBtn.contains(e.target) || menu.contains(e.target)) return;
      menuBtn.classList.remove('open');
    });

    menuBtn.appendChild(menu);
    panel.appendChild(menuBtn);
  }

  function scan() {
    document.querySelectorAll<HTMLElement>('.cm-panel.cm-search').forEach(enhancePanel);
    // For existing JSON viewers, open find only if they are currently visible
    document.querySelectorAll<HTMLElement>('.json-viewer').forEach((el) => maybeOpenFindOnVisible(el));
  }

  function isVisible(el: HTMLElement): boolean {
    const style = window.getComputedStyle(el);
    return style.display !== 'none' && style.visibility !== 'hidden' && style.opacity !== '0';
  }

  function dispatchModF(target: HTMLElement) {
    const isMac = /Mac|iPod|iPhone|iPad/.test(navigator.platform);
    const ev = new KeyboardEvent('keydown', {
      key: 'f',
      code: 'KeyF',
      metaKey: isMac,
      ctrlKey: !isMac,
      altKey: false,
      shiftKey: false,
      bubbles: true,
      cancelable: true,
    });
    target.dispatchEvent(ev);
  }

  function openFindWhenReady(container: HTMLElement, tries = 20) {
    if (!isVisible(container)) return;
    const editor = container.querySelector('.cm-editor');
    const content = editor?.querySelector('.cm-content') as HTMLElement | null;
    if (content) {
      try {
        content.focus();
        dispatchModF(content);
        container.dataset.bksFindOpenState = 'opened';
      } catch {
        // ignore
      }
      return;
    }
    if (tries <= 0) return;
    setTimeout(() => openFindWhenReady(container, tries - 1), 100);
  }

  function maybeOpenFindOnVisible(container: HTMLElement) {
    // Only act on visibility transitions to visible
    const visible = isVisible(container);
    const state = container.dataset.bksFindOpenState; // 'opened' during current visible session
    if (visible && state !== 'opened') {
      container.dataset.bksFindOpenState = 'pending';
      openFindWhenReady(container);
    } else if (!visible && state) {
      // reset when hidden so we open again on next show
      delete container.dataset.bksFindOpenState;
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', scan);
  } else {
    scan();
  }

  const observer = new MutationObserver((mutations) => {
    for (const m of mutations) {
      m.addedNodes.forEach((node) => {
        if (!(node instanceof HTMLElement)) return;
        if (node.matches && node.matches('.cm-panel.cm-search')) {
          enhancePanel(node as HTMLElement);
        } else {
          node.querySelectorAll && node.querySelectorAll('.cm-panel.cm-search').forEach((el) => enhancePanel(el as HTMLElement));
        }
        // Respond to JSON viewer additions (open find if visible)
        if (node.matches && node.matches('.json-viewer')) {
          maybeOpenFindOnVisible(node);
        } else if (node.querySelector) {
          node.querySelectorAll('.json-viewer').forEach((el) => maybeOpenFindOnVisible(el as HTMLElement));
        }
      });
    }
  });

  observer.observe(document.documentElement, { childList: true, subtree: true, attributes: true, attributeFilter: ['style', 'class'] });

  // Watch for json-viewer visibility changes (v-show toggles display)
  document.addEventListener('transitionend', (e) => {
    if (!(e.target instanceof HTMLElement)) return;
    const container = e.target.closest('.json-viewer') as HTMLElement | null;
    if (container) maybeOpenFindOnVisible(container);
  }, true);
})();
