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



const scene = new THREE.Scene()

const width = window.innerWidth
const height = 400

const camera = new THREE.PerspectiveCamera(60, width / height, 0.1, 1000)
camera.position.z = 5

const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true })
renderer.setSize(width, height)
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
document.querySelector(".visual").appendChild(renderer.domElement)

scene.add(
  new THREE.AmbientLight(0xffffff, 0.5),
  (() => {
    const l = new THREE.DirectionalLight(0xffffff, 1.2)
    l.position.set(5, 5, 5)
    return l
  })()
)

const material = new THREE.MeshStandardMaterial({
  color: "#22A9C9",
  roughness: 0.6,
  metalness: 0.3
})

const geometry = new THREE.BoxGeometry(2.6, 2.6, 2.6)
const cube = new THREE.Mesh(geometry, material)
scene.add(cube)

function animate() {
  cube.rotation.x += 0.017
  cube.rotation.y += 0.011
  cube.rotation.z += 0.0029
  renderer.render(scene, camera)
  requestAnimationFrame(animate)
}

animate()

window.addEventListener("resize", () => {
  const w = window.innerWidth
  renderer.setSize(w, height)
  camera.aspect = w / height
  camera.updateProjectionMatrix()
})