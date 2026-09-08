const $$ = (selector) => document.querySelectorAll(selector);
const navLinks = $$('nav a, [data-go]');
const views = $$('.view');
const title = document.querySelector('#page-title');
const titleMap = { dashboard: 'Good morning, Arun <span>✦</span>', alerts: 'Alert center', reports: 'Field reports', analytics: 'Analytics & history', simulation: 'What-if lab' };

function switchView(id) {
  views.forEach(v => v.classList.toggle('active', v.id === id));
  $$('nav a').forEach(a => a.classList.toggle('active', a.dataset.view === id));
  title.innerHTML = titleMap[id] || titleMap.dashboard;
  window.location.hash = id;
  window.scrollTo({ top: 0, behavior: 'smooth' });
}
navLinks.forEach(link => link.addEventListener('click', e => { e.preventDefault(); switchView(link.dataset.view || link.dataset.go); }));

const modal = document.querySelector('#modal');
function showModal(){ modal.classList.add('open'); }
document.querySelector('#ack-alert').addEventListener('click', showModal);
$$('.ack').forEach(b => b.addEventListener('click', showModal));
$$('.close-modal, .close-action').forEach(b => b.addEventListener('click', () => modal.classList.remove('open')));
modal.addEventListener('click', e => { if(e.target === modal) modal.classList.remove('open'); });

$$('.risk-pin').forEach(pin => pin.addEventListener('click', () => {
  const site = pin.dataset.site;
  const isCritical = site.includes('Bhalukpong');
  document.querySelector('#site-name').textContent = site;
  document.querySelector('#risk-probability').textContent = isCritical ? '88%' : site.includes('Bomdila') ? '72%' : '48%';
  document.querySelector('#risk-level').textContent = isCritical ? 'CRITICAL' : site.includes('Bomdila') ? 'HIGH' : 'MODERATE';
  document.querySelector('.priority').textContent = isCritical ? 'P1 · IMMEDIATE RESPONSE' : site.includes('Bomdila') ? 'P2 · INSPECTION REQUIRED' : 'P3 · MONITOR';
  document.querySelector('.risk-drawer').animate([{transform:'translateX(18px)',opacity:.35},{transform:'translateX(0)',opacity:1}],{duration:320,easing:'ease-out'});
}));

const slider = document.querySelector('#rain-slider');
slider.addEventListener('input', () => {
  const amount = +slider.value;
  document.querySelector('#rain-value').innerHTML = `+${amount} <small>mm</small>`;
  const risk = Math.min(99, 80 + Math.round(amount / 3.6));
  document.querySelector('#sim-result').textContent = `${risk >= 80 ? 'CRITICAL' : risk >= 60 ? 'HIGH' : 'MODERATE'} · ${risk}%`;
});
document.querySelector('#run-sim').addEventListener('click', e => { e.currentTarget.innerHTML = 'Simulation complete <span>✓</span>'; });
document.querySelector('#report-form').addEventListener('submit', e => { e.preventDefault(); const toast=document.querySelector('#report-toast'); toast.classList.add('show'); e.target.reset(); setTimeout(()=>toast.classList.remove('show'),4000); });
document.querySelector('#notify').addEventListener('click',()=>switchView('alerts'));
if(location.hash) switchView(location.hash.slice(1));
