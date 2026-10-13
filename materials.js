// Keep the jukebox to one recording at a time; never start audio automatically.
const players = [...document.querySelectorAll('audio')];
for (const player of players) {
  player.addEventListener('playing', () => {
    for (const other of players) if (other !== player) other.pause();
  });
}
window.addEventListener('pagehide', () => {
  for (const player of players) player.pause();
});
