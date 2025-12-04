const PATH = "/toolset/images/";
const toggle = document.getElementById('theme-toggle');
const icon = document.getElementById('theme-icon');
const savedTheme = localStorage.getItem('theme');

if (savedTheme) {
  document.documentElement.setAttribute('data-theme', savedTheme);
  icon.src = savedTheme === 'dark' ? PATH + 'sun.png' : PATH + 'moon.png';
} else if (window.matchMedia('(prefers-color-scheme: dark)').matches) {
  document.documentElement.setAttribute('data-theme', 'dark');
  icon.src = PATH + 'sun.png';
}

toggle.addEventListener('click', () => {
  const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
  const newTheme = isDark ? 'light' : 'dark';

  document.documentElement.setAttribute('data-theme', newTheme);
  localStorage.setItem('theme', newTheme);
  icon.src = newTheme === 'dark' ? PATH + 'sun.png' : PATH + 'moon.png';
});
