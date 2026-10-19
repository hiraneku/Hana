import { Game } from './Game.js';

// Boot. Kept in its own file so the tests can import the Game class without
// also starting a renderer.
const boot = () => {
  window.HANA = new Game();
};

if (document.readyState === 'loading') {
  window.addEventListener('DOMContentLoaded', boot);
} else {
  boot();
}
