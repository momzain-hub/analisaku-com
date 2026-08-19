/* Analisaku Technical Monitor cache-busting loader */
(function(){
  const VERSION='20260819-1033';
  const base=document.currentScript?.src||location.href;

  function loadStyles(){
    document.querySelectorAll('link[href*="signal-monitor.css"],link[href*="signal-monitor-plus.css"],link[href*="signal-monitor-mobile.css"],link[href*="signal-monitor-actions.css"],link[href*="gc-candle-ui.css"],link[href*="market-strategy.css"],link[href*="style-entry-ui.css"],link[href*="action-radar-ui.css"]').forEach(el=>el.remove());

    ['../css/signal-monitor.css','../css/signal-monitor-plus.css','../css/signal-monitor-mobile.css','../css/signal-monitor-actions.css','../css/gc-candle-ui.css','../css/market-strategy.css','../css/style-entry-ui.css','../css/action-radar-ui.css'].forEach(path=>{
      const link=document.createElement('link');
      link.rel='stylesheet';
      link.href=new URL(path,base).href+'?v='+VERSION;
      document.head.appendChild(link);
    });
  }

  function loadDecisionPriceContext(){
    document.querySelectorAll('script[data-analisaku-decision-price]').forEach(el=>el.remove());
    delete document.documentElement.dataset.decisionPriceContextBound;
    const context=document.createElement('script');
    context.src=new URL('decision-price-context.js',base).href+'?v='+VERSION;
    context.async=true;
    context.dataset.analisakuDecisionPrice='true';
    document.head.appendChild(context);
  }

  function loadDecisionActionUi(){
    document.querySelectorAll('script[data-analisaku-decision-action]').forEach(el=>el.remove());
    delete document.documentElement.dataset.decisionActionUiBound;
    const action=document.createElement('script');
    action.src=new URL('decision-action-ui.js',base).href+'?v='+VERSION;
    action.async=true;
    action.dataset.analisakuDecisionAction='true';
    document.head.appendChild(action);
  }

  function loadActionRadarUi(){
    document.querySelectorAll('script[data-analisaku-action-radar]').forEach(el=>el.remove());
    delete document.documentElement.dataset.actionRadarUiBound;
    const actionRadar=document.createElement('script');
    actionRadar.src=new URL('action-radar-ui.js',base).href+'?v='+VERSION;
    actionRadar.async=true;
    actionRadar.dataset.analisakuActionRadar='true';
    document.head.appendChild(actionRadar);
  }

  function loadSignalHealthUi(){
    document.querySelectorAll('script[data-analisaku-signal-health]').forEach(el=>el.remove());
    delete document.documentElement.dataset.signalHealthUiBound;
    const health=document.createElement('script');
    health.src=new URL('signal-health-ui.js',base).href+'?v='+VERSION;
    health.async=true;
    health.dataset.analisakuSignalHealth='true';
    document.head.appendChild(health);
  }

  function loadGcCandleUi(){
    document.querySelectorAll('script[data-analisaku-gc-candles]').forEach(el=>el.remove());
    const gc=document.createElement('script');
    gc.src=new URL('gc-candle-ui.js',base).href+'?v='+VERSION;
    gc.async=true;
    gc.dataset.analisakuGcCandles='true';
    document.head.appendChild(gc);
  }

  function loadStyleEntryUi(){
    document.querySelectorAll('script[data-analisaku-style-entry]').forEach(el=>el.remove());
    delete document.documentElement.dataset.styleEntryUiBound;
    const styleEntry=document.createElement('script');
    styleEntry.src=new URL('style-entry-ui.js',base).href+'?v='+VERSION;
    styleEntry.async=true;
    styleEntry.dataset.analisakuStyleEntry='true';
    document.head.appendChild(styleEntry);
  }

  function loadEnhancer(){
    document.querySelectorAll('script[data-analisaku-radar-enhance]').forEach(el=>el.remove());
    delete document.documentElement.dataset.radarUxReady;
    const enhance=document.createElement('script');
    enhance.src=new URL('signal-monitor-enhance.js',base).href+'?v='+VERSION;
    enhance.async=true;
    enhance.dataset.analisakuRadarEnhance='true';
    enhance.onload=loadGcCandleUi;
    enhance.onerror=loadGcCandleUi;
    document.head.appendChild(enhance);
  }

  function loadV2(){
    const panel=document.getElementById('decisionPanel');
    if(!panel){setTimeout(loadV2,200);return;}

    document.getElementById('signalMonitor')?.remove();
    document.getElementById('goldenCrossRadar')?.remove();
    document.getElementById('actionRadar')?.remove();
    document.getElementById('topSetupNow')?.remove();
    document.getElementById('signalHealth')?.remove();
    document.querySelectorAll('script[data-analisaku-monitor-v2]').forEach(el=>el.remove());

    loadStyles();
    loadDecisionPriceContext();
    loadDecisionActionUi();

    const s=document.createElement('script');
    s.src=new URL('signal-monitor.js',base).href+'?v='+VERSION;
    s.async=true;
    s.dataset.analisakuMonitorV2='true';
    s.onload=()=>{loadEnhancer();loadStyleEntryUi();loadActionRadarUi();loadSignalHealthUi();};
    document.head.appendChild(s);
  }

  loadV2();
})();