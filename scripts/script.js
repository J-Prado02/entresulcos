// ---------- ESTADO GLOBAL ----------
let cart = [];
let todosProdutos = [];

// ---------- ELEMENTOS DOM ----------
const cartSection        = document.getElementById('cart');
const cartItemsContainer = document.querySelector('.cart-items-list');
const totalPriceElement  = document.querySelector('.total-price');
const cartLink           = document.getElementById('cart-icon-link');
const closeCartBtn       = document.querySelector('.close-cart-btn');

// ---------- INICIALIZAÇÃO ----------
function init() {
    const saved = localStorage.getItem('entresulcos_cart');
    if (saved) {
        try {
            cart = JSON.parse(saved);
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

    window.addEventListener('popstate', handlePopState);
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
function showCart() {
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
    totalPriceElement.textContent =
        `R$ ${total.toFixed(2).replace('.', ',')}`;

    // ✅ Um único listener via delegation — sem acúmulo
    cartItemsContainer.onclick = (e) => {
        const cartItem = e.target.closest('.cart-item');
        if (!cartItem) return;
        const id = cartItem.dataset.id;

        if (e.target.classList.contains('decrease-qty')) updateQuantity(id, -1);
        else if (e.target.classList.contains('increase-qty')) updateQuantity(id, 1);
        else if (e.target.classList.contains('remove-item')) removeItem(id);
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

document.addEventListener('DOMContentLoaded', init);