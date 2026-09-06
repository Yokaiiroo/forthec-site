'use strict';
const softwareTabs = [...document.querySelectorAll('[data-software]')];
function selectSoftware(tab, focus = false) {
  softwareTabs.forEach(item => {
    const selected = item === tab;
    item.setAttribute('aria-selected', String(selected));
    item.tabIndex = selected ? 0 : -1;
    document.getElementById(item.getAttribute('aria-controls')).hidden = !selected;
  });
  if (focus) tab.focus();
}
softwareTabs.forEach((tab, index) => {
  tab.addEventListener('click', () => selectSoftware(tab));
  tab.addEventListener('keydown', event => {
    let next;
    if (event.key === 'ArrowRight') next = (index + 1) % softwareTabs.length;
    if (event.key === 'ArrowLeft') next = (index + softwareTabs.length - 1) % softwareTabs.length;
    if (event.key === 'Home') next = 0;
    if (event.key === 'End') next = softwareTabs.length - 1;
    if (next !== undefined) { event.preventDefault(); selectSoftware(softwareTabs[next], true); }
  });
});
const scanDemo = document.getElementById('scan-demo');
const scanButton = document.getElementById('scan-button');
const scanLabel = document.getElementById('scan-button-label');
const scanFields = document.getElementById('extracted-fields');
const fieldRows = [...scanFields.querySelectorAll('dl > div')];
const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
const pause = ms => new Promise(resolve => setTimeout(resolve, ms));
let scanStarted = false;
async function runScan() {
  if (scanButton.disabled) return;
  scanStarted = true;
  scanDemo.classList.remove('is-complete');
  scanButton.disabled = true;
  scanLabel.textContent = 'Lecture de la plaque…';
  scanFields.hidden = true;
  fieldRows.forEach(row => row.classList.remove('filled'));
  document.getElementById('scan-placeholder').hidden = false;
  document.getElementById('scan-step-number').textContent = '02';
  document.getElementById('scan-step-label').textContent = 'EXTRAIRE';
  document.getElementById('scan-title').textContent = 'Lecture de la plaque.';
  document.getElementById('scan-description').textContent = 'Le scan repère les caractéristiques du moteur sur la photo.';
  scanDemo.classList.add('is-scanning');
  if (!reduceMotion.matches) await pause(2100);
  scanDemo.classList.remove('is-scanning');
  scanFields.hidden = false;
  document.getElementById('scan-placeholder').hidden = true;
  document.getElementById('scan-step-number').textContent = '03';
  document.getElementById('scan-step-label').textContent = 'VÉRIFIER';
  document.getElementById('scan-title').textContent = 'Votre fiche se remplit.';
  document.getElementById('scan-description').textContent = 'Les informations extraites restent liées à la photo d’origine.';
  scanLabel.textContent = 'Extraction des champs…';
  for (const row of fieldRows) {
    if (!reduceMotion.matches) await pause(240);
    row.classList.add('filled');
  }
  document.getElementById('scan-title').textContent = 'Une fiche prête à vérifier.';
  document.getElementById('scan-description').textContent = '6 caractéristiques reprises de la plaque. Vous contrôlez les valeurs avant de les utiliser.';
  scanLabel.textContent = 'Rejouer le scan';
  scanButton.disabled = false;
  scanDemo.classList.add('is-complete');
}
scanButton.addEventListener('click', runScan);
if ('IntersectionObserver' in window && !reduceMotion.matches) {
  const observer = new IntersectionObserver(entries => {
    if (entries.some(entry => entry.isIntersecting)) {
      if (!scanStarted) runScan();
      observer.disconnect();
    }
  }, { threshold: 0.35 });
  observer.observe(scanDemo);
}
const menu = document.querySelector('.menu-toggle');
const navigation = document.getElementById('navigation');
function closeMenu() { menu.setAttribute('aria-expanded', 'false'); navigation.classList.remove('is-open'); }
menu.addEventListener('click', () => {
  const opened = menu.getAttribute('aria-expanded') !== 'true';
  menu.setAttribute('aria-expanded', String(opened)); navigation.classList.toggle('is-open', opened);
});
navigation.querySelectorAll('a').forEach(link => link.addEventListener('click', closeMenu));
document.addEventListener('keydown', event => { if (event.key === 'Escape' && navigation.classList.contains('is-open')) { closeMenu(); menu.focus(); } });
window.matchMedia('(min-width: 601px)').addEventListener('change', closeMenu);
const details = {
  inventory: { kicker: '02 / INVENTORY / APPLICATION MOBILE', title: 'Les équipements réels enrichissent l’audit.', copy: 'Inventory permet de constituer l’inventaire du client audité, puis de l’importer dans Energy pour personnaliser le rapport et les plans d’actions.', points: ['Scanner les plaques des moteurs et équipements CVC avec l’OCR Mistral.', 'Vérifier les champs extraits et compléter les données.', 'Saisir manuellement les luminaires et les autres équipements.', 'Rattacher les équipements aux zones et travailler hors connexion.', 'Transmettre à Energy les caractéristiques précises pour contextualiser les actions générées par l’IA.'], href: 'inventory.html' },
  energy: { kicker: '01 / ENERGY / APPLICATION WEB', title: 'L’audit NF EN 16247 en accéléré.', copy: 'Energy est le premier logiciel FortHeC. Il prend en charge les traitements de l’audit et la génération du rapport pour gagner du temps sans compromis sur la qualité.', points: ['Importer les consommations, la production et les sous-comptages.', 'Réaliser les traitements, les IPE et les régressions ISO 50006.', 'Préparer les plans d’actions avec Mistral ou manuellement.', 'Enrichir les actions avec les équipements inventoriés dans Inventory.', 'Générer le rapport Word complet en un clic, puis le modifier librement.'], href: 'energy.html' },
  console: { kicker: '03 / CONSOLE / ESPACE ORGANISATION', title: 'Le hub de votre organisation.', copy: 'Chaque organisation cliente retrouve son équipe et un espace de partage de rapports dans la Console FortHeC.', points: ['Consulter et gérer les membres de votre organisation.', 'Retrouver vos produits et votre licence FortHeC.', 'Déposer les rapports que vous choisissez de partager.', 'Permettre aux membres de la même organisation de consulter les rapports déposés.'], href: 'console.html' }
};
const dialog = document.getElementById('product-dialog');
document.querySelectorAll('[data-detail]').forEach(button => button.addEventListener('click', () => {
  const detail = details[button.dataset.detail];
  document.getElementById('dialog-kicker').textContent = detail.kicker;
  document.getElementById('dialog-title').textContent = detail.title;
  document.getElementById('dialog-copy').textContent = detail.copy;
  document.getElementById('dialog-list').replaceChildren(...detail.points.map(point => { const li = document.createElement('li'); li.textContent = point; return li; }));
  document.getElementById('dialog-link').href = detail.href;
  dialog.showModal();
}));
document.querySelector('.dialog-close').addEventListener('click', () => dialog.close());
dialog.addEventListener('click', event => { const rect = dialog.getBoundingClientRect(); if (event.target === dialog && (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom)) dialog.close(); });
