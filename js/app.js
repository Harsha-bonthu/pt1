const STATE = {data:null,chart:null,statusChart:null,topChart:null,itemsPage:1,pageSize:6,sort:{key:'id',dir:1},searchQ:'',settings:{animations:true,expiryMinutes:60,pageSize:6},cart:{},favorites:{},currency:'INR'}

async function loadData(){
  const res = await fetch('data/mock-data.json');
  STATE.data = await res.json();
  // apply any saved status overrides from localStorage
  applyStatusOverrides()
}

function loadStatusOverrides(){
  try{ return JSON.parse(localStorage.getItem('item_status_overrides')||'{}') }catch(e){return {}}
}

function saveStatusOverride(id,status){
  const cur = loadStatusOverrides()
  cur[id] = status
  localStorage.setItem('item_status_overrides', JSON.stringify(cur))
}

function applyStatusOverrides(){
  const ov = loadStatusOverrides()
  if(!STATE.data || !STATE.data.items) return
  STATE.data.items.forEach(it=>{ if(ov[it.id]) it.status = ov[it.id] })
}

function $(sel){return document.querySelector(sel)}

function show(el){el.classList.remove('hidden')}
function hide(el){el.classList.add('hidden')}

function init(){
  // theme from storage
  if(localStorage.getItem('theme')==='dark') document.documentElement.classList.add('dark')
  // load settings
  loadSettings()
  document.getElementById('themeToggle').addEventListener('click',toggleTheme)
  document.getElementById('demoBtn').addEventListener('click',()=>{
    $('#loginForm').username.value='demo';
    $('#loginForm').password.value='password123';
  })
  document.getElementById('loginForm').addEventListener('submit',onLogin)
  document.getElementById('logoutBtn').addEventListener('click',logout)
  document.getElementById('searchInput').addEventListener('input',debounce(onSearch,250))
  // modal close handlers
  const closeBtn = document.getElementById('closeModal')
  if(closeBtn) closeBtn.addEventListener('click', closeModalHandler)
  const detailModalEl = document.getElementById('detailModal')
  if(detailModalEl){
    // click outside modal-card closes
    detailModalEl.addEventListener('click', (e)=>{ if(e.target === detailModalEl) closeModalHandler() })
  }
  document.getElementById('togglePass').addEventListener('click',togglePass)
  document.getElementById('exportCsv').addEventListener('click',exportCsv)
  document.getElementById('prevPage').addEventListener('click',()=>changePage(-1))
  document.getElementById('nextPage').addEventListener('click',()=>changePage(1))
  document.querySelectorAll('th[data-key]').forEach(th=>th.addEventListener('click',()=>onSort(th)))
  document.getElementById('settingsBtn').addEventListener('click',openSettings)
  document.getElementById('saveSettings').addEventListener('click',saveSettings)
  document.getElementById('cancelSettings').addEventListener('click',closeSettings)
  const resetBtn = document.getElementById('resetOverrides')
  if(resetBtn) resetBtn.addEventListener('click', ()=>{
    if(!confirm('Clear all status overrides for this browser?')) return
    localStorage.removeItem('item_status_overrides')
    // reload data and re-render
    loadData().then(()=>{ renderProductGrid(); renderSummary(); renderStatusChart(); renderTopItemsChart(); renderTablePage(); alert('Overrides cleared for this browser') })
  })
  // keyboard shortcuts
  window.addEventListener('keydown',onKeyDown)
  // filter chips
  document.querySelectorAll('.chip').forEach(c=>c.addEventListener('click',onFilter))
  // currency & sort
  document.getElementById('currencySelect').addEventListener('change',onCurrencyChange)
  document.getElementById('sortSelect').addEventListener('change',onSortChange)
  // cart/favorites
  document.getElementById('cartCount').addEventListener('click',toggleCart)
  document.getElementById('favoritesCount').addEventListener('click',showFavorites)
  loadCartFromStorage()
  loadFavoritesFromStorage()

  // modal action buttons (bind once)
  const copyBtn = document.getElementById('copyLink')
  if(copyBtn) copyBtn.addEventListener('click', copyCurrentLink)
  const openBtn = document.getElementById('openInNew')
  if(openBtn) openBtn.addEventListener('click', ()=>{ const id = getCurrentModalId(); if(!id) return; window.open(window.location.href.split('#')[0] + '#item-' + id,'_blank') })

  loadData().then(()=>{
    if(checkAuth()){
      enterApp()
    } else {
      show($('#loginSection'))
    }
  }).catch(err=>{
    console.error(err)
    document.body.innerHTML = '<div style="padding:40px">Error loading data. See console.</div>'
  })
}

function checkAuth(){
  const t = localStorage.getItem('mock_token');
  if(!t) return false
  try{
    const meta = JSON.parse(localStorage.getItem('mock_meta')||'{}')
    if(meta.exp && Date.now()>meta.exp){
      // expired
      localStorage.removeItem('mock_token');localStorage.removeItem('mock_meta');localStorage.removeItem('mock_user')
      return false
    }
  }catch(e){return true}
  return !!t
}

function onLogin(e){
  e.preventDefault();
  const u = e.target.username.value.trim();
  const p = e.target.password.value;
  const user = STATE.data.users.find(x=>x.username===u && x.password===p)
  if(user){
    localStorage.setItem('mock_token', btoa(u+':'+Date.now()))
    localStorage.setItem('mock_user', user.name)
    const expires = Date.now() + (1000*60*STATE.settings.expiryMinutes)
    localStorage.setItem('mock_meta', JSON.stringify({exp:expires}))
    enterApp()
  } else {
    alert('Invalid credentials for demo. Use demo/password123')
  }
}

function logout(){
  localStorage.removeItem('mock_token');localStorage.removeItem('mock_user')
  location.reload()
}

function enterApp(){
  hide($('#loginSection'))
  show($('#dashboard'))
  show($('#logoutBtn'))
  $('#logoutBtn').hidden = false
  $('#profileName').textContent = localStorage.getItem('mock_user') || 'User'
  renderSummary()
  renderChart()
  renderStatusChart()
  renderTopItemsChart()
  renderTablePage()
  renderProductGrid()
}

function renderSummary(){
  const container = $('#summaryCards'); container.innerHTML=''
  const items = STATE.data.items
  const total = items.reduce((s,i)=>s+i.value,0)
  const active = items.filter(i=>i.status==='active').length
  const pending = items.filter(i=>i.status==='pending').length
  const cards = [
    {title:'Total Value', value:`$${total}`},
    {title:'Active Items', value:active},
    {title:'Pending', value:pending},
    {title:'Item Count', value:items.length}
  ]
  cards.forEach(c=>{
    const el = document.createElement('div'); el.className='summary-card card'
    el.innerHTML = `<div class="muted">${c.title}</div><div class="value">${c.value}</div><canvas data-spark="true"></canvas>`
    container.appendChild(el)
    // render small sparkline
    setTimeout(()=>{ renderCardSparkline(el) }, 30)
  })
}

function renderCardSparkline(cardEl){
  const canvas = cardEl.querySelector('canvas[data-spark]')
  if(!canvas) return
  const ctx = canvas.getContext('2d')
  const data = STATE.data.metrics.values.slice(-8)
  new Chart(ctx,{type:'line',data:{labels:data.map((_,i)=>i),datasets:[{data, borderColor:'rgba(37,99,235,0.9)', tension:0.3, fill:false, pointRadius:0}]},options:{responsive:true,plugins:{legend:{display:false}},scales:{x:{display:false},y:{display:false}},elements:{line:{borderWidth:2}}}})
}

function renderChart(){
  const ctx = document.getElementById('metricsChart').getContext('2d')
  if(STATE.chart) STATE.chart.destroy()
  STATE.chart = new Chart(ctx,{type:'line',data:{labels:STATE.data.metrics.months,datasets:[{label:'Sales',data:STATE.data.metrics.values,fill:true,backgroundColor:'rgba(37,99,235,0.12)',borderColor:'rgba(37,99,235,0.9)',tension:0.3}]},options:{responsive:true,plugins:{legend:{display:false}},animations:{tension:{duration:1000,easing:'easeOutQuart'}}}})
  document.getElementById('metricsChart').classList.add('fade-in')
}

function renderStatusChart(){
  const ctx = document.getElementById('statusChart').getContext('2d')
  if(STATE.statusChart) STATE.statusChart.destroy()
  const counts = STATE.data.items.reduce((acc,i)=>{acc[i.status]=(acc[i.status]||0)+1;return acc},{})
  const labels = Object.keys(counts)
  const values = labels.map(l=>counts[l])
  STATE.statusChart = new Chart(ctx,{type:'doughnut',data:{labels, datasets:[{data:values, backgroundColor:['#10b981','#f59e0b','#94a3b8']}]},options:{plugins:{legend:{position:'bottom'}}}})
}

function renderTopItemsChart(){
  // create a small bar chart of top 6 items by value and append under metrics
  if(!STATE.data) return
  const top = STATE.data.items.slice().sort((a,b)=>b.value-a.value).slice(0,6)
  const elId = 'topItemsChart'
  let el = document.getElementById(elId)
  if(!el){
    const parent = document.querySelector('.panel.split > div')
    const wrapper = document.createElement('div'); wrapper.style.marginTop='12px';
    wrapper.innerHTML = `<h3>Top Items</h3><canvas id="${elId}" height="120"></canvas>`
    parent.appendChild(wrapper)
    el = document.getElementById(elId)
  }
  const ctx = el.getContext('2d')
  if(STATE.topChart) STATE.topChart.destroy()
  STATE.topChart = new Chart(ctx,{type:'bar',data:{labels:top.map(t=>t.name),datasets:[{data:top.map(t=>t.value),backgroundColor:'rgba(99,102,241,0.8)'}]},options:{plugins:{legend:{display:false}},responsive:true}})
}

function formatPrice(amount, currency){
  currency = currency || STATE.currency || 'INR'
  if(currency === 'INR'){
    return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(amount)
  }
  if(currency === 'USD') return new Intl.NumberFormat('en-US',{style:'currency',currency:'USD'}).format(amount)
  if(currency === 'EUR') return new Intl.NumberFormat('de-DE',{style:'currency',currency:'EUR'}).format(amount)
  return amount
}

function renderProductGrid(){
  const grid = document.getElementById('productGrid')
  grid.innerHTML = ''
  let items = STATE.data.items.slice()
  // apply search filter and chips
  const q = STATE.searchQ
  if(q) items = items.filter(it=>it.name.toLowerCase().includes(q) || it.status.toLowerCase().includes(q) || (it.desc||'').toLowerCase().includes(q))
  // sort by current sortSelect
  const sortVal = document.getElementById('sortSelect').value
  if(sortVal==='price-asc') items.sort((a,b)=>a.price_inr-b.price_inr)
  if(sortVal==='price-desc') items.sort((a,b)=>b.price_inr-a.price_inr)
  if(sortVal==='rating') items.sort((a,b)=>b.rating-a.rating)

  items.forEach(it=>{
    const el = document.createElement('div'); el.className='product-card card'
    // status badge
    const statusClass = it.status==='active'? 'status-active' : (it.status==='pending'? 'status-pending' : 'status-archived')
    el.innerHTML = `<img loading="lazy" src="${it.image}" alt="${it.name}" />
      <div class="title">${it.name}</div>
      <div class="desc">${it.desc}</div>
      <div style="display:flex;justify-content:space-between;align-items:center;margin-top:8px">
        <div class="meta-left"><span class="rating">${renderStars(it.rating)}</span><small class="muted"> ${it.rating} (${it.reviews})</small></div>
        <div class="price">${formatPrice(it.price_inr, STATE.currency)}</div>
      </div>
      <div class="meta">
        <div class="actions">
          <button class="fav-btn" data-id="${it.id}" title="Toggle favorite">${isFavorite(it.id)?'❤️':'♡'}</button>
          <button class="add-btn" data-id="${it.id}">Add</button>
        </div>
      </div>`
    // add status badge and quick view badge overlay
    el.style.position='relative'
    const sBadge = document.createElement('div'); sBadge.className = `status-badge ${statusClass}`; sBadge.textContent = it.status.toUpperCase(); el.appendChild(sBadge)
    const qBadge = document.createElement('div'); qBadge.className='quick-badge'; qBadge.style.position='absolute'; qBadge.style.margin='8px'; qBadge.style.padding='6px 8px'; qBadge.style.background='rgba(0,0,0,0.6)'; qBadge.style.color='#fff'; qBadge.style.borderRadius='8px'; qBadge.textContent='Quick view'; qBadge.style.right='10px'; qBadge.style.top='10px'
    el.appendChild(qBadge)
    grid.appendChild(el)
    // wire up buttons safely
    const addBtn = el.querySelector('.add-btn')
    const favBtn = el.querySelector('.fav-btn')
    if(it.status !== 'active'){
      if(addBtn){ addBtn.disabled = true; addBtn.textContent = 'Unavailable'; addBtn.title = 'Item not available' ; addBtn.style.opacity = 0.7 }
    } else {
      if(addBtn) addBtn.addEventListener('click', (ev)=>{ ev.stopPropagation(); addToCart(it.id) })
    }
    if(favBtn) favBtn.addEventListener('click', (ev)=>{ ev.stopPropagation(); toggleFavorite(it.id, favBtn) })
    el.addEventListener('click', (e)=>{ if(e.target.tagName!=='BUTTON' && !e.target.closest('.actions')){ showDetail(it) } })
  })
  updateCartBadge()
  updateFavoritesBadge()
}

function renderStars(rating){
  const full = Math.floor(rating)
  let s = ''
  for(let i=0;i<5;i++) s += i<full? '★':'☆'
  return `<span style="color:#f59e0b">${s}</span>`
}

function addToCart(id){
  const item = STATE.data.items.find(i=>i.id===id)
  if(!item) return
  STATE.cart[id] = STATE.cart[id] ? STATE.cart[id]+1 : 1
  saveCartToStorage()
  updateCartBadge()
  openCart()
}

function saveCartToStorage(){ localStorage.setItem('mock_cart', JSON.stringify(STATE.cart)) }
function loadCartFromStorage(){ try{ STATE.cart = JSON.parse(localStorage.getItem('mock_cart')||'{}') }catch(e){STATE.cart={}} updateCartBadge() }
function updateCartBadge(){ const count = Object.values(STATE.cart).reduce((s,n)=>s+n,0); document.getElementById('cartCount').textContent = `🛒 ${count}` }

function toggleCart(){ const drawer = getCartDrawer(); drawer.classList.toggle('open') }
function openCart(){ const drawer = getCartDrawer(); drawer.classList.add('open'); renderCart() }
function getCartDrawer(){ let el = document.getElementById('cartDrawer'); if(!el){ el = document.createElement('div'); el.id='cartDrawer'; el.className='cart-drawer'; el.innerHTML = `<h3>Your Cart</h3><div id="cartItems"></div><div id="cartTotal" style="margin-top:12px;font-weight:700"></div><div style="margin-top:12px"><button id="checkoutBtn" class="btn primary">Checkout</button><button id="closeCart" class="btn">Close</button></div>`; document.body.appendChild(el); document.getElementById('closeCart').addEventListener('click',()=>el.classList.remove('open')); document.getElementById('checkoutBtn').addEventListener('click',checkout) } return el }

function renderCart(){ const el = getCartDrawer(); const list = el.querySelector('#cartItems'); list.innerHTML=''; let total=0; Object.keys(STATE.cart).forEach(k=>{ const id = parseInt(k,10); const qty = STATE.cart[k]; const item = STATE.data.items.find(x=>x.id===id); if(!item) return; const row = document.createElement('div'); row.className='cart-item'; row.innerHTML = `<img src="${item.image}"/><div style="flex:1"><div>${item.name}</div><div style="color:var(--muted)">${formatPrice(item.price_inr,STATE.currency)} x ${qty}</div></div><div><button class="btn small" data-id="${id}" data-action="dec">-</button><button class="btn small" data-id="${id}" data-action="inc">+</button><button class="btn small" data-id="${id}" data-action="rm">Remove</button></div>`; list.appendChild(row); total += item.price_inr * qty }); el.querySelector('#cartTotal').textContent = 'Total: ' + formatPrice(total,STATE.currency); // attach handlers
  list.querySelectorAll('button[data-action]').forEach(b=>b.addEventListener('click', (e)=>{ const id = b.getAttribute('data-id'); const act = b.getAttribute('data-action'); if(act==='inc'){ STATE.cart[id] = (STATE.cart[id]||0)+1 } else if(act==='dec'){ STATE.cart[id] = Math.max(0,(STATE.cart[id]||0)-1); if(STATE.cart[id]===0) delete STATE.cart[id] } else if(act==='rm'){ delete STATE.cart[id] } saveCartToStorage(); renderCart(); updateCartBadge(); })) }

function checkout(){ alert('Checkout is mocked. Order placed.'); STATE.cart={}; saveCartToStorage(); renderCart(); updateCartBadge(); getCartDrawer().classList.remove('open') }

function toggleFavorite(id, btnEl){ if(STATE.favorites[id]){ delete STATE.favorites[id]; if(btnEl) btnEl.textContent='♡' } else { STATE.favorites[id]=true; if(btnEl) btnEl.textContent='❤️' } saveFavoritesToStorage(); updateFavoritesBadge() }
function saveFavoritesToStorage(){ localStorage.setItem('mock_favs', JSON.stringify(STATE.favorites)) }
function loadFavoritesFromStorage(){ try{ STATE.favorites = JSON.parse(localStorage.getItem('mock_favs')||'{}') }catch(e){ STATE.favorites={} } updateFavoritesBadge() }
function updateFavoritesBadge(){ const count = Object.keys(STATE.favorites).length; document.getElementById('favoritesCount').textContent = `❤ ${count}` }
function isFavorite(id){ return !!STATE.favorites[id] }

function showFavorites(){ const favs = Object.keys(STATE.favorites).map(id=>STATE.data.items.find(x=>x.id==id)).filter(Boolean); if(!favs.length) return alert('No favorites yet'); // open simple modal listing
  const modal = document.getElementById('detailModal'); modal.querySelector('#modalTitle').textContent = 'Favorites'; modal.querySelector('#modalBody').innerHTML = favs.map(f=>`<div style="margin-bottom:8px"><strong>${f.name}</strong><div class="muted">${formatPrice(f.price_inr,STATE.currency)}</div></div>`).join(''); openModal(modal)
}

function onCurrencyChange(e){ STATE.currency = e.target.value; renderProductGrid(); renderCart(); renderTopItemsChart(); renderChart(); }
function onSortChange(e){ renderProductGrid() }

function renderTable(items){
  const tbody = document.querySelector('#itemsTable tbody'); tbody.innerHTML=''
  items.forEach(it=>{
    const tr = document.createElement('tr')
    tr.innerHTML = `<td>${it.id}</td><td>${it.name}</td><td>${it.status}</td><td>$${it.value}</td><td>${it.date}</td>`
    tr.addEventListener('click',()=>showDetail(it))
    tbody.appendChild(tr)
  })
}

function renderTablePage(){
  const q = STATE.searchQ
  let items = STATE.data.items.slice()
  if(q) items = items.filter(it=>it.name.toLowerCase().includes(q) || it.status.toLowerCase().includes(q) || (it.desc||'').toLowerCase().includes(q))
  // sort
  items.sort((a,b)=>{
    const k = STATE.sort.key
    if(a[k]===b[k]) return 0
    return (a[k]>b[k]?1:-1)*STATE.sort.dir
  })
  const pageSize = STATE.settings.pageSize || STATE.pageSize
  const totalPages = Math.max(1,Math.ceil(items.length/pageSize))
  if(STATE.itemsPage>totalPages) STATE.itemsPage = totalPages
  const start = (STATE.itemsPage-1)*pageSize
  const pageItems = items.slice(start,start+pageSize)
  document.getElementById('pageInfo').textContent = `${STATE.itemsPage} / ${totalPages}`
  renderTable(pageItems)
}

function changePage(delta){
  STATE.itemsPage += delta
  if(STATE.itemsPage<1) STATE.itemsPage=1
  renderTablePage()
}

function showDetail(it){
  const modal = $('#detailModal')
  $('#modalTitle').textContent = `${it.name} (ID ${it.id})`
  // build detail body with status editor
  const bodyHtml = `<p><strong>Status:</strong> <span class="status-line">${it.status}</span></p><p><strong>Value:</strong> ${formatPrice(it.price_inr, STATE.currency)}</p><p>${it.desc}</p>`
  modal.querySelector('#modalBody').innerHTML = bodyHtml
  // add status editor controls
  const ctrlWrap = document.createElement('div'); ctrlWrap.style.marginTop = '12px'
  const select = document.createElement('select'); select.id = 'modalStatusSelect';
  ['active','pending','archived'].forEach(s=>{ const opt = document.createElement('option'); opt.value = s; opt.textContent = s.charAt(0).toUpperCase()+s.slice(1); if(s===it.status) opt.selected=true; select.appendChild(opt) })
  const saveBtn = document.createElement('button'); saveBtn.className='btn primary'; saveBtn.textContent='Save status'; saveBtn.style.marginLeft='8px'
  ctrlWrap.appendChild(select); ctrlWrap.appendChild(saveBtn)
  modal.querySelector('#modalBody').appendChild(ctrlWrap)
  // Save handler: update STATE and persist override
  saveBtn.addEventListener('click', (e)=>{
    e.stopPropagation()
    const newStatus = select.value
    if(newStatus === it.status){ alert('Status unchanged'); return }
    // update in-memory item
    it.status = newStatus
    // persist override
    saveStatusOverride(it.id, newStatus)
    // update UI
    const statusLine = modal.querySelector('.status-line')
    if(statusLine) statusLine.textContent = newStatus
    renderProductGrid(); renderSummary(); renderStatusChart(); renderTopItemsChart(); renderTablePage()
    alert('Item status updated to ' + newStatus)
  })
  openModal(modal)
}

function openModal(modal){
  modal.setAttribute('aria-hidden','false')
  modal.classList.remove('hidden')
  // focus trap: focus the first focusable element
  const focusable = modal.querySelectorAll('button,a,input,select,textarea')
  if(focusable.length) focusable[0].focus()
  // set hash
  const id = modal.querySelector('#modalTitle').textContent.match(/ID (\d+)/)
  if(id) location.hash = 'item-'+id[1]
}

function closeModalHandler(){
  const modal = document.getElementById('detailModal')
  modal.setAttribute('aria-hidden','true')
  modal.classList.add('hidden')
  if(location.hash && location.hash.startsWith('#item-')) history.replaceState(null,'',location.pathname+location.search)
}

function getCurrentModalId(){
  const m = document.getElementById('modalTitle').textContent.match(/ID (\d+)/)
  return m? m[1]:null
}

function copyCurrentLink(){
  const id = getCurrentModalId(); if(!id) return
  const url = window.location.href.split('#')[0] + '#item-' + id
  navigator.clipboard?.writeText(url).then(()=>alert('Link copied'))
}

function onSearch(e){
  const q = e.target.value.toLowerCase().trim()
  STATE.searchQ = q
  STATE.itemsPage = 1
  renderTablePage()
}

function debounce(fn,ms){let t;return (...a)=>{clearTimeout(t);t=setTimeout(()=>fn(...a),ms)}}

function togglePass(){
  const p = document.getElementById('passwordInput')
  const btn = document.getElementById('togglePass')
  if(p.type==='password'){p.type='text';btn.textContent='Hide'}else{p.type='password';btn.textContent='Show'}
}

function onSort(th){
  const key = th.getAttribute('data-key')
  if(STATE.sort.key===key) STATE.sort.dir *= -1; else {STATE.sort.key=key;STATE.sort.dir=1}
  document.querySelectorAll('th').forEach(h=>h.classList.remove('sort-asc','sort-desc'))
  th.classList.add(STATE.sort.dir===1? 'sort-asc':'sort-desc')
  renderTablePage()
}

function exportCsv(){
  const q = STATE.searchQ
  let items = STATE.data.items.slice()
  if(q) items = items.filter(it=>it.name.toLowerCase().includes(q) || it.status.toLowerCase().includes(q) || (it.desc||'').toLowerCase().includes(q))
  const rows = [Object.keys(items[0]||{}).join(',')]
  items.forEach(it=>rows.push([it.id,`"${it.name}"`,it.status,it.value,it.date].join(',')))
  const blob = new Blob([rows.join('\n')],{type:'text/csv'})
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a'); a.href=url; a.download='items.csv'; document.body.appendChild(a); a.click(); a.remove(); URL.revokeObjectURL(url)
}

function openSettings(){
  const modal = document.getElementById('settingsModal')
  modal.setAttribute('aria-hidden','false')
  modal.classList.remove('hidden')
  // populate
  document.getElementById('settingPageSize').value = STATE.settings.pageSize
  document.getElementById('settingExpiry').value = STATE.settings.expiryMinutes
  document.getElementById('settingAnimations').checked = STATE.settings.animations
}

function closeSettings(){
  const modal = document.getElementById('settingsModal')
  modal.setAttribute('aria-hidden','true')
  modal.classList.add('hidden')
}

function saveSettings(){
  const ps = parseInt(document.getElementById('settingPageSize').value,10) || STATE.pageSize
  const exp = parseInt(document.getElementById('settingExpiry').value,10) || STATE.settings.expiryMinutes
  const anim = !!document.getElementById('settingAnimations').checked
  STATE.settings.pageSize = ps; STATE.settings.expiryMinutes = exp; STATE.settings.animations = anim
  localStorage.setItem('app_settings', JSON.stringify(STATE.settings))
  closeSettings()
  renderTablePage()
}

function loadSettings(){
  const raw = localStorage.getItem('app_settings')
  if(raw){
    try{ STATE.settings = Object.assign(STATE.settings, JSON.parse(raw)) }catch(e){}
  }
}

function onKeyDown(e){
  // close modal on Escape
  if(e.key==='Escape'){
    const modal = document.getElementById('detailModal')
    if(modal && !modal.classList.contains('hidden')){ closeModalHandler(); return }
  }
  if(e.key==='/' && document.activeElement.tagName!=='INPUT'){
    e.preventDefault(); document.getElementById('searchInput').focus(); return
  }
  // simple go-to shortcuts: g then d or s
  if(e.key==='g'){ window._gPressed = true; setTimeout(()=>window._gPressed=false,800); return }
  if(window._gPressed){ if(e.key==='d'){ /* go dashboard */ document.getElementById('dashboard').scrollIntoView({behavior:'smooth'}); window._gPressed=false }
    if(e.key==='s'){ openSettings(); window._gPressed=false }
  }
}

function onFilter(e){
  document.querySelectorAll('.chip').forEach(c=>c.classList.remove('active'))
  e.currentTarget.classList.add('active')
  const f = e.currentTarget.getAttribute('data-filter')
  if(f==='all'){
    STATE.searchQ = ''
    renderTablePage()
    return
  }
  STATE.searchQ = f
  STATE.itemsPage = 1
  renderTablePage()
}

// hash handling: open item modal if hash present
window.addEventListener('hashchange',()=>{
  const h = location.hash.replace('#','')
  if(h.startsWith('item-')){
    const id = parseInt(h.split('-')[1],10)
    const item = STATE.data && STATE.data.items.find(x=>x.id===id)
    if(item) showDetail(item)
  }
})

// service worker registration for offline cache (best-effort)
if('serviceWorker' in navigator){
  try{navigator.serviceWorker.register('sw.js') }catch(e){console.warn('SW register failed',e)}
}


function toggleTheme(){
  const isDark = document.documentElement.classList.toggle('dark')
  $('#themeToggle').textContent = isDark ? 'Light' : 'Dark'
  localStorage.setItem('theme', isDark? 'dark':'light')
  document.getElementById('themeToggle').setAttribute('aria-pressed', isDark ? 'true' : 'false')
}

window.addEventListener('DOMContentLoaded',init)
