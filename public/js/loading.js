(function(){
  if(window.AppLoading)return;

  const SHOW_DELAY_MS = 350;
  const MIN_VISIBLE_MS = 250;
  let activeCount = 0;
  let showTimer = null;
  let hideTimer = null;
  let visibleSince = 0;
  let overlayEl = null;
  let textEl = null;

  function ensureOverlay(){
    if(overlayEl)return overlayEl;

    overlayEl = document.createElement('div');
    overlayEl.id = 'appLoadingOverlay';
    overlayEl.className = 'app-loading-overlay-v160';
    overlayEl.setAttribute('role','status');
    overlayEl.setAttribute('aria-live','polite');
    overlayEl.setAttribute('aria-hidden','true');
    overlayEl.innerHTML = '<div class="app-loading-box-v160"><div class="app-loading-spinner-v160"></div><div class="app-loading-text-v160">Učitavanje...</div></div>';
    textEl = overlayEl.querySelector('.app-loading-text-v160');
    document.body.appendChild(overlayEl);
    return overlayEl;
  }

  function showNow(message){
    if(hideTimer){clearTimeout(hideTimer);hideTimer=null;}
    const el = ensureOverlay();
    if(textEl)textEl.textContent = message || 'Učitavanje...';
    visibleSince = Date.now();
    el.classList.add('is-visible');
    el.setAttribute('aria-hidden','false');
  }

  function scheduleShow(message, immediate){
    if(showTimer){clearTimeout(showTimer);showTimer=null;}
    if(immediate){
      showNow(message);
      return;
    }
    showTimer = setTimeout(()=>{
      showTimer=null;
      if(activeCount>0)showNow(message);
    }, SHOW_DELAY_MS);
  }

  function scheduleHide(){
    if(showTimer){clearTimeout(showTimer);showTimer=null;}
    if(!overlayEl)return;

    const elapsed = visibleSince ? Date.now() - visibleSince : MIN_VISIBLE_MS;
    const wait = Math.max(0, MIN_VISIBLE_MS - elapsed);
    if(hideTimer){clearTimeout(hideTimer);hideTimer=null;}
    hideTimer = setTimeout(()=>{
      hideTimer=null;
      if(activeCount>0)return;
      overlayEl.classList.remove('is-visible');
      overlayEl.setAttribute('aria-hidden','true');
    }, wait);
  }

  function begin(message, options){
    options = options || {};
    activeCount += 1;
    scheduleShow(message || 'Učitavanje...', !!options.immediate);
    let doneCalled = false;
    return function done(){
      if(doneCalled)return;
      doneCalled = true;
      activeCount = Math.max(0, activeCount - 1);
      if(activeCount === 0)scheduleHide();
    };
  }

  window.AppLoading = {
    begin,
    show(message){ return begin(message || 'Učitavanje...', {immediate:true}); },
    hide(){ activeCount = 0; scheduleHide(); }
  };

  if(window.fetch){
    const originalFetch = window.fetch.bind(window);
    window.fetch = function(){
      const done = begin('Učitavanje...', {immediate:false});
      return originalFetch.apply(window, arguments).finally(done);
    };
  }
})();
