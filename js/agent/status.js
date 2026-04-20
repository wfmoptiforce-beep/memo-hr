// ✅ MAGIC STATUS FILE
console.log('✅ STATUS.JS LOADED');

window.punchAux = function (aux) {
  console.log('Punch clicked:', aux);

  const status = document.getElementById('punch-status');
  const timer  = document.getElementById('aux-timer');

  if (status) {
    status.textContent = 'Status: ' + aux.toUpperCase();
    status.style.color =
      aux === 'online'   ? 'green'  :
      aux === 'break'    ? 'orange' :
      aux === 'meeting'  ? 'orange' :
      aux === 'training' ? 'blue'   :
      aux === 'coaching' ? 'purple' :
      'red';
  }

  if (timer) {
    timer.textContent = '00:00:01';
  }

  alert('✅ Punch works: ' + aux);
};