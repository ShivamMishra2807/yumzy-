// ─── STATE ────────────────────────────────────────────────
let cart        = [];
let total       = 0;
let currentUser = null; // { username, userId }

// ─── NAVIGATION ───────────────────────────────────────────
function showSection(id) {
    document.querySelectorAll('.section').forEach(s => s.classList.remove('active'));
    document.getElementById(id).classList.add('active');
    if (id === 'tracking') {
        setTimeout(() => { if (leafletMap) leafletMap.invalidateSize(); }, 300);
    }
}

function setActiveTab(el) {
    document.querySelectorAll('.navbar li').forEach(li => li.classList.remove('active'));
    el.classList.add('active');
}

// ─── ACCOUNT MESSAGE ──────────────────────────────────────
function showAccountMessage(msg, success = true) {
    const el = document.getElementById('account-message');
    el.innerText = msg;
    el.style.color = success ? '#7cff7c' : '#ff7c7c';
}

// ─── REGISTER (localStorage - no server needed) ───────────
function registerUser() {
    const username = document.getElementById('username').value.trim();
    const password = document.getElementById('password').value;
    const confirm  = document.getElementById('confirm-password').value;

    if (!username || !password || !confirm) {
        showAccountMessage('Fill all fields to register.', false); return;
    }
    if (password !== confirm) {
        showAccountMessage('Passwords do not match.', false); return;
    }
    if (password.length < 4) {
        showAccountMessage('Password must be at least 4 characters.', false); return;
    }

    const users = JSON.parse(localStorage.getItem('yumzy_users') || '{}');
    if (users[username.toLowerCase()]) {
        showAccountMessage('Username already exists. Please login.', false); return;
    }

    users[username.toLowerCase()] = { username, password };
    localStorage.setItem('yumzy_users', JSON.stringify(users));

    showAccountMessage('Account created! Welcome, ' + username + '!', true);
    setLoggedIn(username, username);
    setTimeout(() => showSection('menu'), 1200);
}

// ─── LOGIN (localStorage - no server needed) ──────────────
function loginUser() {
    const username = document.getElementById('username').value.trim();
    const password = document.getElementById('password').value;

    if (!username || !password) {
        showAccountMessage('Enter username and password.', false);
        return;
    }

    const users = JSON.parse(localStorage.getItem('yumzy_users') || '{}');
    const user  = users[username.toLowerCase()];

    if (!user) {
        showAccountMessage('Account not found. Please register.', false);
        return;
    }
    if (user.password !== password) {
        showAccountMessage('Incorrect password.', false);
        return;
    }

    showAccountMessage('Welcome back, ' + username + '!', true);
    setLoggedIn(username, username);
    setTimeout(() => showSection('menu'), 1200);
}

// ─── SET LOGGED IN STATE ──────────────────────────────────
function setLoggedIn(username, userId) {
    currentUser = { username, userId };
    document.getElementById('formFields').style.display    = 'none';
    document.getElementById('logoutBox').style.display     = 'block';
    const loggedInAs = document.getElementById('loggedInAs');
    loggedInAs.style.display = 'block';
    loggedInAs.innerText = `✅ Logged in as: ${username}`;
    document.getElementById('formTitle').innerText = 'Account';
    document.getElementById('userDisplay').innerText = `🚴 Delivering for: ${username}`;
    document.getElementById('loginTab').innerText = `👤 ${username}`;
}

// ─── LOGOUT ───────────────────────────────────────────────
function logoutUser() {
    currentUser = null;
    document.getElementById('formFields').style.display    = 'flex';
    document.getElementById('logoutBox').style.display     = 'none';
    document.getElementById('loggedInAs').style.display    = 'none';
    document.getElementById('formTitle').innerText  = 'Login / Register';
    document.getElementById('loginTab').innerText   = 'Login';
    document.getElementById('username').value       = '';
    document.getElementById('password').value       = '';
    document.getElementById('confirm-password').value = '';
    showAccountMessage('Logged out successfully.', true);
}

// ─── ADD TO CART ──────────────────────────────────────────
function addToCart(item, price) {
    const found = cart.find(i => i.name === item);
    if (found) { found.qty++; }
    else { cart.push({ name: item, price, qty: 1 }); }
    total += price;
    renderCart();
    updateCartBadge();
    showToast();
}

function increaseQty(index) {
    cart[index].qty++;
    total += cart[index].price;
    renderCart(); updateCartBadge();
}

function decreaseQty(index) {
    if (cart[index].qty > 1) {
        cart[index].qty--;
        total -= cart[index].price;
    } else {
        total -= cart[index].price;
        cart.splice(index, 1);
    }
    renderCart(); updateCartBadge();
}

function renderCart() {
    const list = document.getElementById('cart-items');
    list.innerHTML = '';
    if (cart.length === 0) {
        list.innerHTML = '<li style="text-align:center;opacity:0.6;padding:20px;">Your cart is empty 🍽️</li>';
    }
    cart.forEach((item, i) => {
        const li = document.createElement('li');
        li.innerHTML = `
          <span>${item.name} — ₹${item.price} × ${item.qty} = <strong>₹${item.price * item.qty}</strong></span>
          <div class="qty-box">
            <button onclick="decreaseQty(${i})">−</button>
            <span>${item.qty}</span>
            <button onclick="increaseQty(${i})">+</button>
          </div>`;
        list.appendChild(li);
    });
    document.getElementById('total').innerText = 'Total: ₹' + total;
}

function updateCartBadge() {
    const badge = document.getElementById('cartBadge');
    const count = cart.reduce((s, i) => s + i.qty, 0);
    badge.textContent = count > 0 ? count : '';
}

// ─── TOAST ────────────────────────────────────────────────
function showToast() {
    const t = document.getElementById('toast');
    t.style.display = 'block';
    setTimeout(() => t.style.display = 'none', 1500);
}

// ─── SEARCH & FILTER ──────────────────────────────────────
function searchFood() {
    const q = document.getElementById('search').value.toLowerCase();
    document.querySelectorAll('.card').forEach(c => {
        c.style.display = c.querySelector('h3').innerText.toLowerCase().includes(q) ? 'block' : 'none';
    });
}

function filterFood(cat) {
    document.querySelectorAll('.card').forEach(c => {
        c.style.display = (cat === 'all' || c.classList.contains(cat)) ? 'block' : 'none';
    });
}

// ─── PAYMENT FLOW ─────────────────────────────────────────
function goToPayment() {
    if (cart.length === 0) {
        showNotification('⚠️ Your cart is empty!'); return;
    }
    const addr = document.getElementById('location').value.trim();
    if (!addr) {
        showNotification('⚠️ Please enter delivery address!'); return;
    }
    showSection('payment');
}

function payNow(method) {
    showLoader();
    setTimeout(async () => {
        hideLoader();
        document.getElementById('payment-status').innerText = '✅ Payment Successful via ' + method;
        showSection('tracking');
        startTracking();
        setTimeout(() => {
            initMapLeaflet();
            updateDestination();
        }, 600);
    }, 2000);
}

// ─── TRACKING ─────────────────────────────────────────────
function startTracking() {
    const progress = document.getElementById('progress');
    const eta      = document.getElementById('eta');
    const status   = document.getElementById('status');
    let pos = 0, time = 60;
    progress.style.width = '0%';
    status.innerText = '';
    const iv = setInterval(() => {
        pos += 1.5; time--;
        progress.style.width = Math.min(pos, 100) + '%';
        eta.innerText = 'Estimated Delivery: ' + Math.max(time, 0) + ' sec';
        if (pos >= 100) {
            clearInterval(iv);
            status.innerText = '🎉 Order Delivered!';
            eta.innerText = 'Delivered ✅';
        }
    }, 1000);
}

// ─── FEEDBACK ─────────────────────────────────────────────
function submitFeedback() {
    const rating   = document.getElementById('rating').value;
    const feedback = document.getElementById('feedback').value.trim();
    if (!feedback) { showNotification('Please write feedback first!'); return; }
    showNotification('Thanks for your feedback! ' + rating);
    document.getElementById('feedback').value = '';
}

// ─── LOADER ───────────────────────────────────────────────
function showLoader() { document.getElementById('loader').style.display = 'flex'; }
function hideLoader() { document.getElementById('loader').style.display = 'none'; }

// ─── NOTIFICATION ─────────────────────────────────────────
function showNotification(msg) {
    const n = document.getElementById('notify');
    n.innerText = msg;
    n.style.display = 'block';
    setTimeout(() => n.style.display = 'none', 2500);
}

// ─── SCROLL TO TOP ────────────────────────────────────────
function scrollToTop() { window.scrollTo({ top: 0, behavior: 'smooth' }); }
window.addEventListener('scroll', () => {
    const btn = document.getElementById('topBtn');
    if (btn) btn.classList.toggle('show', window.scrollY > 200);
});

// ─── MAP ──────────────────────────────────────────────────
let leafletMap    = null;
let movingMarker  = null;

function initMapLeaflet() {
    const start = [19.0760, 72.8777];
    if (leafletMap) { leafletMap.invalidateSize(); return; }

    const bikeIcon = L.icon({
        iconUrl: 'https://cdn-icons-png.flaticon.com/512/1046/1046784.png',
        iconSize: [40, 40]
    });

    leafletMap = L.map('map').setView(start, 13);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap'
    }).addTo(leafletMap);

    movingMarker = L.marker(start, { icon: bikeIcon }).addTo(leafletMap);
    setTimeout(() => leafletMap.invalidateSize(), 500);
}

function updateDestination() {
    if (!document.getElementById('tracking').classList.contains('active')) return;
    const address = document.getElementById('location').value.trim();
    if (!address) return;
    if (!leafletMap) { setTimeout(updateDestination, 600); return; }

    fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(address)}`)
        .then(r => r.json())
        .then(data => {
            if (!data.length) return;
            const lat = parseFloat(data[0].lat);
            const lon = parseFloat(data[0].lon);
            const start = [19.0760, 72.8777];
            const end   = [lat, lon];

            if (window.currentRoute) leafletMap.removeLayer(window.currentRoute);

            const path = [];
            for (let i = 0; i <= 1; i += 0.02) {
                path.push([
                    start[0] + (end[0] - start[0]) * i,
                    start[1] + (end[1] - start[1]) * i
                ]);
            }

            window.currentRoute = L.polyline(path, { color: 'orange', weight: 5 }).addTo(leafletMap);
            leafletMap.fitBounds(path);
            animateDelivery(path);
        })
        .catch(() => {});
}

function animateDelivery(path) {
    const delay = (60 * 1000) / path.length;
    let i = 0;
    const iv = setInterval(() => {
        if (i >= path.length) { clearInterval(iv); return; }
        movingMarker.setLatLng(path[i++]);
    }, delay);
}

// ─── PARTICLES ────────────────────────────────────────────
if (typeof particlesJS !== 'undefined') {
    particlesJS('particles-js', {
        particles: {
            number: { value: 60 },
            size: { value: 3 },
            move: { speed: 2 },
            line_linked: { enable: true, distance: 120 }
        }
    });
}

// ─── THEME ────────────────────────────────────────────────
function toggleTheme() {
    document.body.classList.toggle('dark');
}