(() => {
  const buttons = [...document.querySelectorAll('[data-copy-prompt]')];
  const status = document.querySelector('#copy-status');
  const labels = buttons.map(button => button.textContent);
  let resetTimer;
  function fallbackCopy(text) {
    const focused = document.activeElement;
    const input = document.createElement('textarea');
    input.value = text;
    input.setAttribute('readonly', '');
    input.style.cssText = 'position:fixed;left:-10000px;top:0;opacity:0';
    document.body.append(input);
    input.select();
    let copied = false;
    try { copied = document.execCommand('copy'); }
    finally { input.remove(); focused?.focus({preventScroll:true}); }
    if (!copied) throw new Error('Clipboard unavailable');
  }
  for (const button of buttons) button.addEventListener('click', async () => {
    const text = document.querySelector('#full-prompt pre').textContent;
    buttons.forEach(item => { item.disabled = true; });
    clearTimeout(resetTimer);
    try {
      try {
        if (!navigator.clipboard?.writeText) throw new Error('Clipboard unavailable');
        await navigator.clipboard.writeText(text);
      } catch { fallbackCopy(text); }
      buttons.forEach(item => { item.textContent = '已复制 ✓'; });
      status.classList.add('sr-only');
      status.textContent = '完整提示词已复制到剪贴板。';
    } catch {
      status.classList.remove('sr-only');
      status.textContent = '复制未成功，请展开选中文本，或下载提示词文件。';
    } finally {
      buttons.forEach(item => { item.disabled = false; });
      resetTimer = setTimeout(() => buttons.forEach((item,index) => { item.textContent = labels[index]; }), 2200);
    }
  });
})();
