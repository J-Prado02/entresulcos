// ---------- ESTADO GLOBAL ----------
let cart = [];
let todosProdutos = [];

// ---------- ELEMENTOS DOM ----------
const cartSection        = document.getElementById('cart');
const cartItemsContainer = document.querySelector('.cart-items-list');
const totalPriceElement  = document.querySelector('.total-price');
const cartLink           = document.getElementById('cart-icon-link');
const closeCartBtn       = document.querySelector('.close-cart-btn');
const checkoutSuccessPage = document.getElementById('checkout-success');
const closeSuccessBtn     = document.querySelector('.close-success-btn');
const continueShoppingBtn = document.querySelector('.continue-shopping-btn');
const orderItemsContainer = document.querySelector('.order-items');
const orderTotalElement   = document.querySelector('.order-total');

// ---------- INICIALIZAÇÃO ----------
function init() {
    const savedCart = localStorage.getItem('entresulcos_cart');
    if (savedCart) {
        try {
            cart = JSON.parse(savedCart);
        } catch {
            cart = [];
            localStorage.removeItem('entresulcos_cart');
        }
        updateCartBadge();
    }

    if (cartSection) cartSection.style.display = 'none';

    configurarListeners();
    carregarProdutos();
}

// ---------- EVENTOS ----------
function configurarListeners() {
    const salesSection = document.querySelector('.sales');

    if (salesSection) {
        salesSection.addEventListener('click', (e) => {
            const btn = e.target.closest('button.card-btn');
            if (!btn) return;
            const card = btn.closest('.card');
            if (!card) return;
            try {
                const produto = JSON.parse(card.getAttribute('data-produto'));
                adicionarAoCarrinho(produto);
                animarBotao(btn);
            } catch (err) {
                console.error('Erro ao ler produto:', err);
            }
        });
    }

    if (cartLink) {
        cartLink.addEventListener('click', (e) => {
            e.preventDefault();
            showCart();
        });
    }

    if (closeCartBtn) closeCartBtn.addEventListener('click', hideCart);

    if (cartSection) {
        cartSection.addEventListener('click', (e) => {
            if (e.target === cartSection) hideCart();
        });
    }

    // Listener para o botão "Finalizar Compra"
    if (cartSection) {
        cartSection.addEventListener('click', (e) => {
            if (e.target.classList.contains('checkout-btn')) {
                e.preventDefault();
                if (!requireAuth()) return;
                finalizarCompra();
            }
        });
    }

    window.addEventListener('popstate', handlePopState);
}

// 🆕 Função para finalizar a compra
function finalizarCompra() {
    if (cart.length === 0) return; // não finaliza com carrinho vazio

    const pedidoFinal = [...cart];
    const totalPedido = pedidoFinal.reduce((sum, item) => sum + (item.preco * item.quantity), 0);

    // Limpa o carrinho
    cart = [];
    saveCart();
    updateCartBadge();

    // Renderiza o resumo na página de sucesso
    if (orderItemsContainer && orderTotalElement) {
        let itemsHtml = '';
        pedidoFinal.forEach(item => {
            itemsHtml += `
                <div class="order-item">
                    <span>${item.titulo} (${item.quantity}x)</span>
                    <span>R$ ${(item.preco * item.quantity).toFixed(2).replace('.', ',')}</span>
                </div>
            `;
        });
        orderItemsContainer.innerHTML = itemsHtml;
        orderTotalElement.innerHTML = `
            <span>Total:</span>
            <span>R$ ${totalPedido.toFixed(2).replace('.', ',')}</span>
        `;
    }

    hideCart();
    hideAllPages();
    checkoutSuccessPage.classList.remove('hidden');
}

// ---------- PRODUTOS ----------
async function carregarProdutos() {
    const salesSection = document.querySelector('.sales');
    try {
        const res = await fetch('data/produtos.json');
        if (!res.ok) throw new Error('Falha ao buscar produtos');
        todosProdutos = await res.json();
        renderizarCards(todosProdutos);
    } catch (err) {
        console.error(err);
        if (salesSection)
            salesSection.innerHTML =
                '<p style="color:white;text-align:center">Erro ao carregar produtos.</p>';
    }
}

function criarCard(produto) {
    const article = document.createElement('article');
    article.className = 'card';
    article.setAttribute('data-produto', JSON.stringify(produto));
    article.innerHTML = `
        <span class="card-genre">${produto.genero}</span>
        <div class="card-img-wrap">
            <img src="${produto.imagem}" alt="${produto.titulo}">
            <div class="card-overlay">
                <span class="card-overlay-price">
                    R$ ${produto.preco.toFixed(2).replace('.', ',')}
                </span>
                <button class="card-btn">+ Carrinho</button>
            </div>
        </div>
        <div class="card-info">
            <div class="card-title">${produto.titulo}</div>
            <div class="card-artist">${produto.artista}</div>
        </div>
    `;
    return article;
}

function renderizarCards(produtos) {
    const salesSection = document.querySelector('.sales');
    if (!salesSection) return;
    salesSection.innerHTML = '';
    produtos.forEach(p => salesSection.appendChild(criarCard(p)));
}

// ---------- CARRINHO ----------
function adicionarAoCarrinho(produto) {
    const existente = cart.find(i => i.id === produto.id);
    if (existente) {
        existente.quantity += 1;
    } else {
        cart.push({ ...produto, quantity: 1 });
    }
    updateCartBadge();
    saveCart();
}

function animarBotao(btn) {
    const original = btn.textContent;
    btn.textContent = '✓ Adicionado';
    btn.style.background = '#4CAF50';
    setTimeout(() => {
        btn.textContent = original;
        btn.style.background = '';
    }, 1000);
}

function updateCartBadge() {
    if (!cartLink) return;
    const total = cart.reduce((s, i) => s + i.quantity, 0);
    let badge = cartLink.querySelector('.cart-count');
    if (!badge) {
        badge = document.createElement('span');
        badge.className = 'cart-count';
        cartLink.style.position = 'relative';
        cartLink.appendChild(badge);
    }
    badge.textContent = total;
    badge.style.display = total > 0 ? 'flex' : 'none';
}

function saveCart() {
    localStorage.setItem('entresulcos_cart', JSON.stringify(cart));
}

// ---------- EXIBIÇÃO ----------
function requireAuth() {
    if (currentUser) {
        return true;
    } else {
        sessionStorage.setItem('redirectAfterLogin', 'cart');
        hideAllPages();
        loginPage.classList.remove('hidden');
        return false;
    }
}

function showCart() {
    if (!requireAuth()) return;

    if (cartSection) {
        cartSection.style.display = 'flex';
        cartSection.classList.remove('hidden');
    }
    renderCart();
}

function hideCart() {
    if (cartSection) cartSection.style.display = 'none';
}

function renderCart() {
    if (!cartItemsContainer || !totalPriceElement) return;

    if (cart.length === 0) {
        cartItemsContainer.innerHTML =
            '<p style="text-align:center;">Seu carrinho está vazio.</p>';
        totalPriceElement.textContent = 'R$ 0,00';
        return;
    }

    let html = '';
    let total = 0;

    cart.forEach(item => {
        total += item.preco * item.quantity;
        html += `
            <div class="cart-item" data-id="${item.id}">
                <img src="${item.imagem}" class="cart-item-img" alt="${item.titulo}">
                <div class="cart-item-info">
                    <div class="cart-item-title">${item.titulo}</div>
                    <div class="cart-item-artist">${item.artista}</div>
                    <div class="cart-item-price">R$ ${item.preco.toFixed(2).replace('.', ',')}</div>
                </div>
                <div class="cart-item-quantity">
                    <button class="decrease-qty" aria-label="Diminuir quantidade">−</button>
                    <span class="quantity-value">${item.quantity}</span>
                    <button class="increase-qty" aria-label="Aumentar quantidade">+</button>
                </div>
                <button class="cart-item-remove">Remover</button>
            </div>
        `;
    });

    cartItemsContainer.innerHTML = html;
    totalPriceElement.textContent = `R$ ${total.toFixed(2).replace('.', ',')}`;

    cartItemsContainer.onclick = (e) => {
        const cartItem = e.target.closest('.cart-item');
        if (!cartItem) return;
        const id = cartItem.dataset.id;

        if (e.target.classList.contains('decrease-qty')) updateQuantity(id, -1);
        else if (e.target.classList.contains('increase-qty')) updateQuantity(id, 1);
        else if (e.target.classList.contains('cart-item-remove')) removeItem(id);
    };
}

function updateQuantity(id, change) {
    const item = cart.find(i => i.id === id);
    if (!item) return;
    item.quantity += change;
    if (item.quantity <= 0) {
        removeItem(id);
    } else {
        renderCart();
        updateCartBadge();
        saveCart();
    }
}

function removeItem(id) {
    cart = cart.filter(i => i.id !== id);
    renderCart();
    updateCartBadge();
    saveCart();
}

// ---------- HISTÓRICO ----------
function handlePopState(e) {
    if (e.state?.page === 'cart') showCart();
    else hideCart();
}

// ========== AUTENTICAÇÃO SIMPLES (LOCALSTORAGE + JSON INICIAL) ==========

const loginPage = document.getElementById('login-page');
const signupPage = document.getElementById('signup-page');
const loginForm = document.getElementById('login-form');
const signupForm = document.getElementById('signup-form');
const loginError = document.getElementById('login-error');
const signupError = document.getElementById('signup-error');
const showSignupLink = document.getElementById('show-signup');
const showLoginLink = document.getElementById('show-login');
const closeAuthBtns = document.querySelectorAll('.close-auth-btn');
const loginMenuBtn = document.getElementById('login-menu-btn');

let currentUser = null;
const STORAGE_USERS_KEY = 'entresulcos_users';
const STORAGE_CURRENT_USER_KEY = 'entresulcos_current_user';

async function initUsers() {
    if (localStorage.getItem(STORAGE_USERS_KEY)) return;

    try {
        const res = await fetch('data/usuarios.json');
        if (!res.ok) throw new Error('Arquivo não encontrado');
        const usuariosPreCadastrados = await res.json();
        localStorage.setItem(STORAGE_USERS_KEY, JSON.stringify(usuariosPreCadastrados));
        console.log('✅ Usuários iniciais carregados do JSON.');
    } catch (err) {
        console.warn('⚠️ Criando lista vazia de usuários.');
        localStorage.setItem(STORAGE_USERS_KEY, JSON.stringify([]));
    }
}

function loadCurrentUser() {
    const savedUser = localStorage.getItem(STORAGE_CURRENT_USER_KEY);
    if (savedUser) {
        try {
            currentUser = JSON.parse(savedUser);
        } catch {
            currentUser = null;
            localStorage.removeItem(STORAGE_CURRENT_USER_KEY);
        }
    }
    updateUIForAuthState(currentUser);
}

function saveCurrentUser(user) {
    currentUser = user;
    if (user) {
        localStorage.setItem(STORAGE_CURRENT_USER_KEY, JSON.stringify(user));
    } else {
        localStorage.removeItem(STORAGE_CURRENT_USER_KEY);
    }
    updateUIForAuthState(user);
}

function updateUIForAuthState(user) {
    if (loginMenuBtn) {
        if (user) {
            loginMenuBtn.innerHTML = '<i class="fa-solid fa-user-check"></i> Minha Conta';
        } else {
            loginMenuBtn.innerHTML = '<i class="fa-solid fa-user"></i> Entrar';
        }
    }
}

function hideAllPages() {
    document.querySelectorAll('.page').forEach(p => p.classList.add('hidden'));
}

function handleSignup(e) {
    e.preventDefault();
    const name = document.getElementById('signup-name').value.trim() || 'Usuário';
    const email = document.getElementById('signup-email').value.trim();
    const password = document.getElementById('signup-password').value;

    signupError.textContent = '';
    if (!email || !password) {
        signupError.textContent = 'Preencha todos os campos obrigatórios.';
        return;
    }
    if (password.length < 6) {
        signupError.textContent = 'A senha deve ter pelo menos 6 caracteres.';
        return;
    }

    const users = JSON.parse(localStorage.getItem(STORAGE_USERS_KEY)) || [];
    if (users.find(u => u.email === email)) {
        signupError.textContent = 'Este e-mail já está cadastrado.';
        return;
    }

    const newUser = { email, password, name };
    users.push(newUser);
    localStorage.setItem(STORAGE_USERS_KEY, JSON.stringify(users));

    saveCurrentUser({ email, name });
    hideAllPages();

    const redirect = sessionStorage.getItem('redirectAfterLogin');
    if (redirect === 'cart') {
        sessionStorage.removeItem('redirectAfterLogin');
        showCart();
    }
}

function handleLogin(e) {
    e.preventDefault();
    const email = document.getElementById('login-email').value.trim();
    const password = document.getElementById('login-password').value;

    loginError.textContent = '';
    if (!email || !password) {
        loginError.textContent = 'Preencha todos os campos.';
        return;
    }

    const users = JSON.parse(localStorage.getItem(STORAGE_USERS_KEY)) || [];
    const user = users.find(u => u.email === email && u.password === password);

    if (!user) {
        loginError.textContent = 'E-mail ou senha incorretos.';
        return;
    }

    saveCurrentUser({ email: user.email, name: user.name });
    hideAllPages();

    const redirect = sessionStorage.getItem('redirectAfterLogin');
    if (redirect === 'cart') {
        sessionStorage.removeItem('redirectAfterLogin');
        showCart();
    }
}

function handleLogout() {
    saveCurrentUser(null);
}

function initSuccessPage() {
    if (closeSuccessBtn) {
        closeSuccessBtn.addEventListener('click', () => {
            checkoutSuccessPage.classList.add('hidden');
        });
    }
    if (continueShoppingBtn) {
        continueShoppingBtn.addEventListener('click', () => {
            checkoutSuccessPage.classList.add('hidden');
            window.scrollTo({ top: 0, behavior: 'smooth' });
        });
    }
    if (checkoutSuccessPage) {
        checkoutSuccessPage.addEventListener('click', (e) => {
            if (e.target === checkoutSuccessPage) {
                checkoutSuccessPage.classList.add('hidden');
            }
        });
    }
}

async function initAuth() {
    await initUsers();
    loadCurrentUser();

    if (loginForm) loginForm.addEventListener('submit', handleLogin);
    if (signupForm) signupForm.addEventListener('submit', handleSignup);

    if (showSignupLink) {
        showSignupLink.addEventListener('click', (e) => {
            e.preventDefault();
            loginPage.classList.add('hidden');
            signupPage.classList.remove('hidden');
        });
    }

    if (showLoginLink) {
        showLoginLink.addEventListener('click', (e) => {
            e.preventDefault();
            signupPage.classList.add('hidden');
            loginPage.classList.remove('hidden');
        });
    }

    closeAuthBtns.forEach(btn => btn.addEventListener('click', hideAllPages));

    if (loginMenuBtn) {
        loginMenuBtn.addEventListener('click', (e) => {
            e.preventDefault();
            if (currentUser) {
                handleLogout();
            } else {
                hideAllPages();
                loginPage.classList.remove('hidden');
            }
        });
    }

    [loginPage, signupPage].forEach(page => {
        if (page) {
            page.addEventListener('click', (e) => {
                if (e.target === page) hideAllPages();
            });
        }
    });

    initSuccessPage();
}

document.addEventListener('DOMContentLoaded', () => {
    init();
    initAuth();
});