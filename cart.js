// Simple shopping cart for static pages
// Features: auto-add 'Agregar' buttons, add/remove/update items, localStorage persistence,
// floating cart button and cart panel UI.

(function(){
  const STORAGE_KEY = 'site_cart_v1';

  // Inject minimal styles for cart UI
  const style = document.createElement('style');
  style.textContent = `
    #cart-floating-btn{position:fixed;right:18px;bottom:18px;background:#0b79d0;color:#fff;border-radius:999px;padding:12px 16px;font-weight:700;z-index:9999;cursor:pointer;box-shadow:0 6px 18px rgba(0,0,0,.2)}
    #cart-count{background:#ff4d4f;border-radius:999px;padding:2px 6px;margin-left:8px;font-weight:700}
    #cart-panel{position:fixed;right:18px;bottom:70px;width:340px;max-height:70vh;background:#fff;border-radius:8px;box-shadow:0 8px 30px rgba(0,0,0,.25);z-index:10000;overflow:auto;padding:12px;display:none}
    #cart-panel h3{margin:0 0 8px}
    .cart-item{display:flex;justify-content:space-between;align-items:center;padding:6px 0;border-bottom:1px solid #eee}
    .cart-item .meta{flex:1}
    .cart-item .controls button{margin:0 4px}
    .cart-footer{margin-top:8px;display:flex;justify-content:space-between;align-items:center}
    .cart-empty{color:#666;text-align:center;padding:18px 0}
    .add-to-cart{display:inline-block;margin-top:8px;padding:6px 8px;background:#0b79d0;color:#fff;border:0;border-radius:4px;cursor:pointer}
  `;
  document.head.appendChild(style);

  // Utility
  const $ = s => document.querySelector(s);
  const $$ = s => Array.from(document.querySelectorAll(s));

  // Load/save
  function loadCart(){
    try{const raw = localStorage.getItem(STORAGE_KEY); return raw? JSON.parse(raw): {} }catch(e){return {}};
  }
  function saveCart(cart){ localStorage.setItem(STORAGE_KEY, JSON.stringify(cart)); renderFloating(); }

  // Cart state
  let cart = loadCart();

  // Helpers
  function formatPrice(n){ return '$' + Number(n).toLocaleString('es-MX'); }
  function slugify(s){ return String(s).toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/(^-|-$)/g,''); }

  // Render floating button
  function renderFloating(){
    const root = document.getElementById('cart-root');
    if(!root) return;
    let btn = document.getElementById('cart-floating-btn');
    if(!btn){ btn = document.createElement('button'); btn.id='cart-floating-btn'; btn.title='Ver carrito'; root.appendChild(btn); }
    const count = Object.values(cart).reduce((s,i)=>s + (i.qty||0),0);
    const total = Object.values(cart).reduce((s,i)=>s + (i.price * (i.qty||0)),0);
    btn.innerHTML = `Carrito <span id="cart-count">${count}</span> <span style="margin-left:6px;font-weight:600">${formatPrice(total)}</span>`;
    btn.onclick = ()=>{ togglePanel(true); };
  }

  // Render panel
  function renderPanel(){
    let panel = document.getElementById('cart-panel');
    const root = document.getElementById('cart-root');
    if(!root) return;
    if(!panel){ panel = document.createElement('div'); panel.id='cart-panel'; root.appendChild(panel); }
    // build content
    panel.innerHTML = '';
    const h = document.createElement('h3'); h.textContent = 'Tu carrito'; panel.appendChild(h);
    const close = document.createElement('button'); close.textContent = 'Cerrar'; close.style.float='right'; close.onclick=()=>togglePanel(false); panel.appendChild(close);

    const items = Object.values(cart);
    if(items.length === 0){ const e = document.createElement('div'); e.className='cart-empty'; e.textContent='El carrito está vacío.'; panel.appendChild(e); }
    else{
      items.forEach(it=>{
        const row = document.createElement('div'); row.className='cart-item';
        const meta = document.createElement('div'); meta.className='meta';
        meta.innerHTML = `<strong>${it.name}</strong><div style="color:#666;font-size:12px">${it.meta||''}</div>`;
        const right = document.createElement('div'); right.className='controls';
        const qty = document.createElement('span'); qty.textContent = `x${it.qty}`;
        const price = document.createElement('div'); price.style.marginTop='6px'; price.textContent = formatPrice(it.price * it.qty);
        const minus = document.createElement('button'); minus.textContent='-'; minus.onclick=()=>changeQty(it.id, it.qty-1);
        const plus = document.createElement('button'); plus.textContent='+'; plus.onclick=()=>changeQty(it.id, it.qty+1);
        const rm = document.createElement('button'); rm.textContent='Eliminar'; rm.onclick=()=>removeItem(it.id);
        right.appendChild(minus); right.appendChild(qty); right.appendChild(plus); right.appendChild(price); right.appendChild(rm);
        row.appendChild(meta); row.appendChild(right);
        panel.appendChild(row);
      });
      const total = Object.values(cart).reduce((s,i)=>s + i.price * i.qty,0);
      const footer = document.createElement('div'); footer.className='cart-footer';
      footer.innerHTML = `<strong>Total:</strong> <span style="font-weight:700">${formatPrice(total)}</span>`;
      panel.appendChild(footer);
    }
  }

  function togglePanel(show){ const panel = document.getElementById('cart-panel'); if(!panel) return; panel.style.display = show? 'block': 'none'; if(show) renderPanel(); }

  // Cart operations
  function addToCart(item){ // item: {id,name,price,meta,qty}
    if(!item || !item.id) return;
    const existing = cart[item.id];
    if(existing){ existing.qty = (existing.qty||0) + (item.qty||1); }
    else{ cart[item.id] = Object.assign({qty:1}, item); }
    saveCart(cart);
    renderPanel();
  }
  function changeQty(id, qty){ if(!cart[id]) return; if(qty <= 0){ delete cart[id]; } else { cart[id].qty = qty; } saveCart(cart); renderPanel(); }
  function removeItem(id){ if(cart[id]){ delete cart[id]; saveCart(cart); renderPanel(); } }

  // Attach add buttons to product-card elements and accessory articles
  function attachAutoButtons(){
    // Product cards inside .products-grid
    $$('.products-grid').forEach(grid=>{
      const category = grid.dataset.category || 'producto';
      grid.querySelectorAll('.product-card').forEach(pc=>{
        if(pc.querySelector('.add-to-cart')) return; // already has
        const price = Number(pc.dataset.price || pc.querySelector('.price')?.textContent.replace(/[^0-9.]/g,'') || 0);
        const gallons = pc.dataset.gallons || '';
        const dims = pc.dataset.dimensions || '';
        const id = slugify(`${category}-${gallons}`);
        const name = `${category} ${gallons? gallons + ' Gal':'Producto'}`;
        const btn = document.createElement('button'); btn.className='add-to-cart'; btn.textContent='Agregar al carrito';
        btn.dataset.id = id; btn.dataset.name = name; btn.dataset.price = price; btn.dataset.meta = dims;
        btn.onclick = onAddClick;
        pc.appendChild(btn);
      });
    });

    // Accessory articles
    document.querySelectorAll('article.accesorio-item').forEach(article=>{
      if(article.querySelector('.add-to-cart')) return;
      const title = article.querySelector('h3')?.textContent.trim() || 'Accesorio';
      const priceEl = article.querySelector('.price');
      const price = priceEl? Number(priceEl.textContent.replace(/[^0-9.]/g,'')) : 0;
      const id = slugify(title);
      const btn = document.createElement('button'); btn.className='add-to-cart'; btn.textContent='Agregar al carrito';
      btn.dataset.id = id; btn.dataset.name = title; btn.dataset.price = price; btn.dataset.meta = '';
      // insert after price
      if(priceEl) priceEl.parentNode.appendChild(btn); else article.appendChild(btn);
      btn.onclick = onAddClick;
    });

    // Products list (productos.html) - each .product may contain multiple images/prices
    document.querySelectorAll('.product').forEach(product=>{
      if(product.querySelector('.add-to-cart')) return;
      const productKey = product.dataset.product || product.querySelector('h3')?.textContent || 'producto';
      const title = product.querySelector('h3')?.textContent.trim() || productKey;
      const imagesWrap = product.querySelector('.product-images');
      if(imagesWrap){
        const imgs = imagesWrap.querySelectorAll('img');
        imgs.forEach((img, idx) => {
          // try to find a price next to the image
          let priceText = '';
          let priceEl = img.nextElementSibling;
          if(priceEl && priceEl.tagName && priceEl.tagName.toLowerCase() === 'p') priceText = priceEl.textContent;
          else {
            // look for adjacent text node or following p
            let ns = img.nextSibling;
            while(ns && (!ns.textContent || ns.textContent.trim() === '')) ns = ns.nextSibling;
            if(ns){
              if(ns.nodeType === 3) priceText = ns.textContent;
              else if(ns.nodeType === 1 && ns.tagName.toLowerCase() === 'p') priceText = ns.textContent;
            }
          }
          if(!priceText){ const anyP = imagesWrap.querySelector('p'); if(anyP) priceText = anyP.textContent; }
          const price = Number((priceText||'').replace(/[^0-9.]/g,'')) || 0;
          const id = slugify(`${productKey}-${idx+1}`);
          const name = `${title} ${idx+1}`;
          const btn = document.createElement('button'); btn.className='add-to-cart'; btn.textContent='Agregar al carrito';
          btn.dataset.id = id; btn.dataset.name = name; btn.dataset.price = price; btn.dataset.meta = '';
          if(priceEl && priceEl.parentNode) priceEl.parentNode.appendChild(btn); else imagesWrap.appendChild(btn);
          btn.onclick = onAddClick;
        });
      } else {
        // fallback: single price in product container
        const priceEl = product.querySelector('p');
        const price = priceEl? Number(priceEl.textContent.replace(/[^0-9.]/g,'')) : 0;
        const id = slugify(productKey);
        const name = title;
        const btn = document.createElement('button'); btn.className='add-to-cart'; btn.textContent='Agregar al carrito';
        btn.dataset.id = id; btn.dataset.name = name; btn.dataset.price = price; btn.dataset.meta = '';
        if(priceEl) priceEl.parentNode.appendChild(btn); else product.appendChild(btn);
        btn.onclick = onAddClick;
      }
    });
  }

  function onAddClick(e){
    const el = e.currentTarget;
    const id = el.dataset.id || slugify(el.dataset.name || 'item');
    const name = el.dataset.name || el.getAttribute('data-name') || el.closest('.product-card')?.querySelector('.gallons')?.textContent || 'Producto';
    const price = Number(el.dataset.price || el.getAttribute('data-price') || 0);
    const meta = el.dataset.meta || '';
    addToCart({id, name, price, meta, qty:1});
    // Brief feedback
    el.textContent = 'Añadido ✓'; setTimeout(()=> el.textContent = 'Agregar al carrito', 900);
  }

  // Initialize
  document.addEventListener('DOMContentLoaded', ()=>{
    // create root if missing
    if(!document.getElementById('cart-root')){
      const root = document.createElement('div'); root.id='cart-root'; document.body.appendChild(root);
    }
    attachAutoButtons();
    renderFloating();
    // click outside panel closes it
    document.addEventListener('click', (ev)=>{
      const panel = document.getElementById('cart-panel'); if(!panel) return;
      const btn = document.getElementById('cart-floating-btn');
      if(panel.style.display === 'block'){
        const target = ev.target;
        if(!panel.contains(target) && target !== btn) togglePanel(false);
      }
    });
  });

})();
