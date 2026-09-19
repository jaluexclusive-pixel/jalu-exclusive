const C = window.JALU_CONFIG;
let products = [];
let cart = JSON.parse(localStorage.getItem("jalu_cart") || "[]");
const $ = (s) => document.querySelector(s);
const money = (n) => `S/ ${Number(n || 0).toFixed(2)}`;

function saveCart(){ localStorage.setItem("jalu_cart", JSON.stringify(cart)); }

async function loadProducts(){
  try{
    const res = await fetch(`${C.SHEETS_API}?action=productos`, { cache: "no-store" });
    if(!res.ok) throw new Error(`HTTP ${res.status}`);
    const json = await res.json();
    if(!json.success) throw new Error(json.error || "No se pudo cargar el catálogo");
    products = Array.isArray(json.products) ? json.products.filter(p => p.active) : [];
    renderProducts();
    renderCart();
  }catch(err){
    console.error(err);
    $("#products").innerHTML = `<div class="error-box"><b>No se pudo cargar el catálogo.</b><br>Verifica que la URL de Apps Script esté publicada como "Cualquier persona".</div>`;
  }
}

function renderProducts(){
  const search = $("#search").value.toLowerCase().trim();
  const category = $("#category").value;
  const list = products.filter(p =>
    (`${p.name || ""} ${p.brand || ""}`).toLowerCase().includes(search) &&
    (!category || String(p.category || "").toLowerCase() === category.toLowerCase())
  );
  $("#products").innerHTML = list.length ? list.map(p => `
    <article class="product">
      <div class="product-img">${p.image_url ? `<img src="${escapeHtml(p.image_url)}" alt="${escapeHtml(p.name)}">` : `<div class="bottle"><span>JE</span></div>`}</div>
      <div class="product-info">
        <small>${escapeHtml(p.brand || "")} · ${escapeHtml(p.category || "")}</small>
        <h3>${escapeHtml(p.name || "Perfume")}</h3>
        <p>${escapeHtml(p.description || "")}</p>
        <div class="price">${money(p.price)}</div>
        <div class="stock">${Number(p.stock) > 0 ? `Disponible · ${Number(p.stock)}` : "Agotado"}</div>
        <button class="add" ${Number(p.stock) < 1 ? "disabled" : ""} onclick="addToCart(${JSON.stringify(String(p.id))})">Agregar al carrito</button>
      </div>
    </article>`).join("") : `<p>No encontramos perfumes.</p>`;
}

function escapeHtml(v){
  return String(v ?? "").replace(/[&<>'"]/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;","'":"&#39;","\"":"&quot;"}[c]));
}

function addToCart(id){
  const p = products.find(x => String(x.id) === String(id));
  if(!p || Number(p.stock) < 1) return;
  const row = cart.find(x => String(x.id) === String(id));
  if(row){ if(row.qty < Number(p.stock)) row.qty++; }
  else cart.push({id: String(id), qty: 1});
  saveCart(); renderCart(); openCart();
}

function changeQty(id, delta){
  const row = cart.find(x => String(x.id) === String(id));
  const p = products.find(x => String(x.id) === String(id));
  if(!row || !p) return;
  row.qty = Math.max(0, Math.min(Number(p.stock), row.qty + delta));
  if(!row.qty) cart = cart.filter(x => String(x.id) !== String(id));
  saveCart(); renderCart();
}

function total(){
  return cart.reduce((sum, r) => {
    const p = products.find(x => String(x.id) === String(r.id));
    return sum + (p ? Number(p.price) * Number(r.qty) : 0);
  }, 0);
}

function renderCart(){
  cart = cart.filter(r => products.some(p => String(p.id) === String(r.id)));
  saveCart();
  $("#cartItems").innerHTML = cart.length ? cart.map(r => {
    const p = products.find(x => String(x.id) === String(r.id));
    return `<div class="cart-row"><div><h4>${escapeHtml(p.name)}</h4><small>${escapeHtml(p.brand || "")} · ${money(p.price)}</small><br><button class="remove" onclick="changeQty('${String(p.id)}',-${r.qty})">Eliminar</button></div><div class="qty"><button onclick="changeQty('${String(p.id)}',-1)">−</button><b>${r.qty}</b><button onclick="changeQty('${String(p.id)}',1)">+</button></div></div>`;
  }).join("") : `<p class="empty">Tu carrito está vacío.</p>`;
  $("#cartTotal").textContent = money(total());
  $("#cartCount").textContent = cart.reduce((a,r)=>a+r.qty,0);
}

function openCart(){ $("#cart").classList.add("open"); $("#overlay").classList.add("show"); }
function closeCart(){ $("#cart").classList.remove("open"); $("#overlay").classList.remove("show"); }

function orderMessage(){
  const name = $("#customerName").value || "Por completar";
  const phone = $("#customerPhone").value || "Por completar";
  const district = $("#customerDistrict").value || "Por completar";
  const address = $("#customerAddress").value || "Por confirmar";
  const pay = $("#payment").value;
  const notes = $("#notes").value || "Ninguna";
  const lines = cart.map(r => { const p = products.find(x => String(x.id) === String(r.id)); return `• ${p.brand || ""} ${p.name} x${r.qty} — ${money(Number(p.price)*r.qty)}`; }).join("\n");
  return `Hola, quiero realizar este pedido en Jalu Exclusive:\n\n${lines}\n\nTOTAL: ${money(total())}\n\nCliente: ${name}\nTeléfono: ${phone}\nDistrito: ${district}\nDirección: ${address}\nPago: ${pay}\nObservaciones: ${notes}`;
}

async function registerOrder(){
  if(!cart.length) return;
  const payload = {
    customer_name: $("#customerName").value,
    phone: $("#customerPhone").value,
    district: $("#customerDistrict").value,
    address: $("#customerAddress").value,
    payment_method: $("#payment").value,
    notes: $("#notes").value,
    total: total(),
    items: cart.map(r => { const p = products.find(x => String(x.id) === String(r.id)); return { product_id:p.id, product_name:p.name, brand:p.brand, quantity:r.qty, unit_price:p.price }; })
  };
  $("#formMsg").textContent = "Registrando pedido...";
  try{
    await fetch(C.SHEETS_API, { method:"POST", mode:"no-cors", headers:{"Content-Type":"text/plain;charset=utf-8"}, body:JSON.stringify(payload) });
    $("#formMsg").textContent = "Pedido enviado correctamente. Te confirmaremos por WhatsApp.";
    cart=[]; saveCart(); renderCart();
    setTimeout(()=>{ $("#checkoutModal").classList.remove("show"); closeCart(); $("#orderForm").reset(); $("#formMsg").textContent=""; }, 1600);
  }catch(err){
    console.error(err);
    $("#formMsg").textContent = "No se pudo enviar el pedido. Intenta nuevamente.";
  }
}

$("#search").oninput = renderProducts;
$("#category").onchange = renderProducts;
$("#cartBtn").onclick = openCart;
$("#closeCart").onclick = closeCart;
$("#keepShopping").onclick = closeCart;
$("#overlay").onclick = closeCart;
$("#continue").onclick = ()=>{ if(cart.length) $("#checkoutModal").classList.add("show"); else alert("Agrega un perfume al carrito."); };
$("#closeModal").onclick = ()=>$("#checkoutModal").classList.remove("show");
$("#orderForm").onsubmit = e => { e.preventDefault(); registerOrder(); };
document.querySelectorAll(".wa").forEach(b => b.onclick = ()=>{
  if(!cart.length) return alert("Tu carrito está vacío.");
  const n = b.dataset.wa === "1" ? C.WHATSAPP_1 : C.WHATSAPP_2;
  window.open(`https://wa.me/${n}?text=${encodeURIComponent(orderMessage())}`, "_blank");
});
$("#year").textContent = new Date().getFullYear();
loadProducts();
