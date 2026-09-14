
const KEY='sz_billing_v3';
const UNITS=['PCS','FT / Feet','Meter','Box','Set','Hour','Other'];
let db={customers:[],products:[],quotations:[],invoices:[],history:[],settings:{name:'SZ Billing',phone:'',address:'',terms:'All prices are subject to final site confirmation. Installation/workmanship terms as agreed with customer.',logo:'logo-master.png',theme:'slate'}};
let qEdit=null,iEdit=null;

function load(){try{const x=JSON.parse(localStorage.getItem(KEY)||'null');if(x)db=x}catch(e){};db.settings=db.settings||{};db.settings.theme=db.settings.theme||'slate';applyTheme();try{renderAll()}catch(e){console.error(e);toast('App loaded with saved data')}setTimeout(()=>{const s=document.getElementById('splash');if(s)s.classList.add('hide')},850)}
function save(){localStorage.setItem(KEY,JSON.stringify(db));renderAll()}
function applyTheme(){document.body.classList.remove('theme-slate','theme-blue','theme-green','theme-purple','theme-gold');document.body.classList.add('theme-'+(db.settings.theme||'slate'))}
function setTheme(t){db.settings.theme=t;applyTheme();save();toast('Theme changed')}
function money(n){return 'Rs. '+Number(n||0).toLocaleString('en-PK',{maximumFractionDigits:2})}
function esc(s){return String(s??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]))}
function toast(t){let e=document.getElementById('toast');e.textContent=t;e.style.display='block';setTimeout(()=>e.style.display='none',1800)}
function openBilling(){document.querySelectorAll('.page').forEach(p=>p.classList.remove('active','printing'));let page=document.getElementById('billing');if(!page)return;page.classList.add('active');document.querySelectorAll('.navbtn').forEach(b=>b.classList.toggle('active',b.dataset.page==='billing'));billingMode='invoice';qEdit=null;if(!iEdit||!iEdit.id&&!iEdit.items.length){newInvoice();}else{renderBilling();}window.scrollTo(0,0);}
function openPage(id){if(id==='billing'){openBilling();return}document.querySelectorAll('.page').forEach(p=>p.classList.remove('active','printing'));let page=document.getElementById(id);if(!page)return;page.classList.add('active');document.querySelectorAll('.navbtn').forEach(b=>b.classList.toggle('active',b.dataset.page===id));window.scrollTo(0,0);if(id==='whatsapp')renderWA();if(id==='settings')loadSettings();}
function openModal(html){document.getElementById('modalBody').innerHTML=html;document.getElementById('modal').classList.add('show')}
function closeModal(){document.getElementById('modal').classList.remove('show')}

function renderAll(){const top=document.getElementById('topLogo');if(top)top.src=db.settings.logo||'logo-master.png';renderDashboard();renderCustomers();renderProducts();renderBilling();renderWA()}
function renderDashboard(){let pending=db.invoices.reduce((a,x)=>a+Math.max(0,Number(x.total)-Number(x.paid)),0);document.getElementById('sCustomers').textContent=db.customers.length;document.getElementById('sInvoices').textContent=db.invoices.length;document.getElementById('sPending').textContent=money(pending);let h=db.history.slice(-6).reverse();document.getElementById('recent').innerHTML=h.length?h.map(x=>`<div class="item"><div><b>${esc(x.type)}</b><div class="muted small">${esc(x.customer)} • ${esc(x.date)}</div></div><b>${money(x.amount)}</b></div>`).join(''):'<div class="empty">No activity yet.</div>'}

function openCustomer(id=null){let c=db.customers.find(x=>x.id===id)||{name:'',wa:'',address:''};openModal(`<h2>${id?'Edit':'Add'} Customer</h2><div class="row"><div><label>Name</label><input id="mName" value="${esc(c.name)}"></div><div><label>WhatsApp Number</label><input id="mWa" value="${esc(c.wa)}" placeholder="923001234567"></div></div><div class="actions"><button type="button" class="btn secondary" onclick="pickCustomerContact()">📱 Add from Contacts</button><span class="muted small">Select a saved contact to fill name & phone.</span></div><div style="margin-top:10px"><label>Address</label><textarea id="mAddr">${esc(c.address)}</textarea></div><div class="actions"><button type="button" class="btn" onclick="saveCustomer('${id||''}')">Save Customer</button></div>`)}
async function pickCustomerContact(){
  if(!('contacts' in navigator) || !navigator.contacts?.select){return toast('Contacts selection is not supported on this browser. Use Add Customer manually.')}
  try{
    const contacts=await navigator.contacts.select(['name','tel'],{multiple:false});
    const x=contacts&&contacts[0];
    if(!x)return;
    const name=Array.isArray(x.name)?x.name[0]||'':(x.name||'');
    const tel=Array.isArray(x.tel)?x.tel[0]||'':(x.tel||'');
    if(name){const e=document.getElementById('mName');if(e)e.value=name;}
    if(tel){const e=document.getElementById('mWa');if(e)e.value=tel.replace(/[^0-9+]/g,'');}
    toast('Contact selected');
  }catch(e){if(e&&e.name==='AbortError')return;toast('Could not access contacts. Please allow contact access.')}
}
function saveCustomer(id){let name=document.getElementById('mName').value.trim();if(!name)return toast('Customer name required');let c={id:id||crypto.randomUUID(),name,wa:document.getElementById('mWa').value.trim(),address:document.getElementById('mAddr').value.trim()};if(id)db.customers=db.customers.map(x=>x.id===id?c:x);else db.customers.push(c);closeModal();save();toast('Customer saved')}
function renderCustomers(){let q=(document.getElementById('customerSearch')?.value||'').toLowerCase();let a=db.customers.filter(c=>(c.name+c.wa+c.address).toLowerCase().includes(q));document.getElementById('customerList').innerHTML=a.length?a.map(c=>`<div class="item"><div><b>${esc(c.name)}</b><div class="muted small">${esc(c.wa||'No WhatsApp')}<br>${esc(c.address||'No address')}</div></div><div class="actions" style="margin:0"><button class="btn secondary" onclick="openCustomer('${c.id}')">Edit</button><button class="btn danger" onclick="delCustomer('${c.id}')">Delete</button></div></div>`).join(''):'<div class="empty">No customers.</div>'}
function delCustomer(id){if(confirm('Delete customer?')){db.customers=db.customers.filter(x=>x.id!==id);save()}}

function openProduct(id=null){let p=db.products.find(x=>x.id===id)||{name:'',unit:'PCS',rate:0};openModal(`<h2>${id?'Edit':'Add'} Product</h2><div><label>Product / Item Name</label><input id="pName" value="${esc(p.name)}"></div><div class="row" style="margin-top:10px"><div><label>Unit</label><select id="pUnit">${UNITS.map(u=>`<option ${u===p.unit?'selected':''}>${u}</option>`).join('')}</select></div><div><label>Rate</label><input id="pRate" type="number" step="0.01" value="${p.rate}"></div></div><div class="actions"><button class="btn" onclick="saveProduct('${id||''}')">Save Product</button></div>`)}
function saveProduct(id){let name=document.getElementById('pName').value.trim();if(!name)return toast('Product name required');let p={id:id||crypto.randomUUID(),name,unit:document.getElementById('pUnit').value,rate:Number(document.getElementById('pRate').value)||0};if(id)db.products=db.products.map(x=>x.id===id?p:x);else db.products.push(p);closeModal();save();toast('Product saved')}
function renderProducts(){let q=(document.getElementById('productSearch')?.value||'').toLowerCase();let a=db.products.filter(p=>(p.name+p.unit).toLowerCase().includes(q));document.getElementById('productList').innerHTML=a.length?a.map(p=>`<div class="item"><div><b>${esc(p.name)}</b><div class="muted small">${esc(p.unit)} • ${money(p.rate)}</div></div><div class="actions" style="margin:0"><button class="btn secondary" onclick="openProduct('${p.id}')">Edit</button><button class="btn danger" onclick="delProduct('${p.id}')">Delete</button></div></div>`).join(''):'<div class="empty">No products. Add your CCTV cameras, DVR/NVR, cable, connectors, installation etc.</div>'}
function delProduct(id){if(confirm('Delete product?')){db.products=db.products.filter(x=>x.id!==id);save()}}

function blankItem(){return{id:crypto.randomUUID(),name:'',unit:'PCS',qty:1,rate:0}}
function newQuotation(){qEdit={id:null,no:'Q-'+Date.now().toString().slice(-7),date:new Date().toISOString().slice(0,10),customerId:'',items:[],discount:0,terms:db.settings.terms};renderQuoteEditor()}
function newInvoice(){iEdit={id:null,no:'INV-'+Date.now().toString().slice(-7),date:new Date().toISOString().slice(0,10),due:'',customerId:'',items:[],discount:0,paid:0,terms:db.settings.terms,shareAs:'invoice'};renderInvoiceEditor()}

function customerOptions(sel=''){return '<option value="">Select customer</option>'+db.customers.map(c=>`<option value="${c.id}" ${c.id===sel?'selected':''}>${esc(c.name)}${c.wa?' • '+esc(c.wa):''}</option>`).join('')}
function productOptions(sel=''){return '<option value="">Custom item</option>'+db.products.map(p=>`<option value="${p.id}" ${p.id===sel?'selected':''}>${esc(p.name)} • ${esc(p.unit)}</option>`).join('')}
function itemRows(obj,prefix){return obj.items.map((it,idx)=>`<tr><td><button class="btn secondary" onclick="editDocItem('${prefix}',${idx})" style="margin-bottom:5px">Edit</button><div><b>${esc(it.name||'Custom item')}</b></div></td><td><span class="badge">${esc(it.unit)}</span></td><td>${it.qty}</td><td>${money(it.rate)}</td><td class="lineTotal">${money(it.qty*it.rate)}</td><td><button class="btn danger" onclick="${prefix}Remove(${idx})">×</button></td></tr>`).join('')}
function calc(obj){let sub=obj.items.reduce((a,i)=>a+Number(i.qty||0)*Number(i.rate||0),0);return{sub,disc:Number(obj.discount||0),total:Math.max(0,sub-Number(obj.discount||0))}}
function updateQuoteTotals(){if(!qEdit)return;let c=calc(qEdit);document.getElementById('qSubtotal').textContent=money(c.sub);document.getElementById('qDisc').textContent=money(c.disc);document.getElementById('qTotal').textContent=money(c.total);document.querySelectorAll('#quotationEditor .lineTotal').forEach((e,idx)=>{let it=qEdit.items[idx];if(it)e.textContent=money(Number(it.qty||0)*Number(it.rate||0))})}
function updateInvoiceTotals(){if(!iEdit)return;let c=calc(iEdit),p=Math.max(0,c.total-Number(iEdit.paid||0));document.getElementById('iTotal').textContent=money(c.total);document.getElementById('iPaid').textContent=money(iEdit.paid);document.getElementById('iPending').textContent=money(p);document.querySelectorAll('#invoiceEditor .lineTotal').forEach((e,idx)=>{let it=iEdit.items[idx];if(it)e.textContent=money(Number(it.qty||0)*Number(it.rate||0))})}
function renderQuoteEditor(){let e=document.getElementById('quotationEditor');if(!qEdit){e.innerHTML='';return}let c=calc(qEdit);e.innerHTML=`<div class="card"><h3>Quotation ${esc(qEdit.no)}</h3><div class="row"><div><label>Customer</label><select onchange="qEdit.customerId=this.value">${customerOptions(qEdit.customerId)}</select></div><div><label>Date</label><input type="date" value="${qEdit.date}" onchange="qEdit.date=this.value"></div></div><div class="table-wrap"><table class="table"><thead><tr><th>Item</th><th>Unit</th><th>Qty</th><th>Rate</th><th>Total</th><th></th></tr></thead><tbody>${itemRows(qEdit,'q')}</tbody></table></div><div class="actions"><button class="btn secondary" onclick="addDocItem('quote')">+ Add Item</button></div><div class="row"><div><label>Discount</label><input id="qDiscount" type="number" inputmode="decimal" step="0.01" value="${qEdit.discount}" oninput="qEdit.discount=Number(this.value)||0;updateQuoteTotals()"></div><div><label>Terms</label><textarea oninput="qEdit.terms=this.value">${esc(qEdit.terms)}</textarea></div></div><div class="editor-summary"><b>Subtotal:</b> <span id="qSubtotal">${money(c.sub)}</span> &nbsp; <b>Discount:</b> <span id="qDisc">${money(c.disc)}</span> &nbsp; <b>Total:</b> <span id="qTotal">${money(c.total)}</span></div><div class="actions"><button class="btn" onclick="saveQuote()">Save Quotation</button><button class="btn secondary" onclick="viewCurrent('quote')">View</button><button class="btn accent" onclick="printDoc('quote')">Print / PDF</button><button class="btn ok" onclick="quoteWA()">WhatsApp</button></div></div>`}
function qPick(i,v){let p=db.products.find(x=>x.id===v);if(p){Object.assign(qEdit.items[i],{productId:p.id,name:p.name,unit:p.unit,rate:p.rate});renderQuoteEditor()}}
function qSet(i,k,v){qEdit.items[i][k]=(k==='qty'||k==='rate')?Number(v)||0:v;updateQuoteTotals()}
function qRemove(i){qEdit.items.splice(i,1);if(!qEdit.items.length)qEdit.items.push(blankItem());renderQuoteEditor()}
function renderInvoiceEditor(){renderBilling();}
function iPick(i,v){let p=db.products.find(x=>x.id===v);if(p){Object.assign(iEdit.items[i],{productId:p.id,name:p.name,unit:p.unit,rate:p.rate});renderInvoiceEditor()}}
function iSet(i,k,v){iEdit.items[i][k]=(k==='qty'||k==='rate')?Number(v)||0:v;updateInvoiceTotals()}
function iRemove(i){iEdit.items.splice(i,1);if(!iEdit.items.length)iEdit.items.push(blankItem());renderInvoiceEditor()}
function addDocItem(type){
  type=type==='quote'?'quote':'invoice';
  showSavedItemPicker(type);
}
function editDocItem(prefix,idx){openItemEditor(prefix==='q'?'quote':'invoice',idx)}
function showSavedItemPicker(type){
  let products=db.products||[];
  let rows=products.length?products.map(p=>`<button class="pick-item" onclick="selectSavedItem('${type}','${p.id}')"><span><b>${esc(p.name)}</b><small>${esc(p.unit)} • ${money(p.rate)}</small></span><strong>Use</strong></button>`).join(''):`<div class="empty">No saved products yet. Add a product in Products first, or use Custom Item below.</div>`;
  openModal(`<h2>Select Item / Product</h2><p class="muted">Pehle saved item select karein. Phir aglay step mein name, unit, quantity aur price edit kar sakte hain.</p><div class="pick-list">${rows}</div><div class="actions"><button class="btn" onclick="openItemEditor('${type}',null)">＋ Custom Item</button><button class="btn secondary" onclick="closeModal()">Cancel</button></div>`);
}
function selectSavedItem(type,productId){
  let obj=type==='quote'?qEdit:iEdit;
  let p=db.products.find(x=>x.id===productId);
  if(!obj||!p)return;
  let item={id:crypto.randomUUID(),productId:p.id,name:p.name,unit:p.unit,qty:1,rate:Number(p.rate)||0};
  obj.items.push(item);
  openItemEditor(type,obj.items.length-1);
}
function openItemEditor(type,idx){
  let obj=type==='quote'?qEdit:iEdit;if(!obj)return;
  let it=idx===null?blankItem():obj.items[idx];
  openModal(`<h2>${idx===null?'Add':'Edit'} Item</h2>
  <div class="item-editor-note">Selected item ki details yahan change karein:</div>
  <div><label>Item / Product Name</label><input id="docItemName" value="${esc(it.name)}" autocomplete="off"></div>
  <div class="row" style="margin-top:10px"><div><label>Unit</label><select id="docItemUnit">${UNITS.map(u=>`<option ${u===it.unit?'selected':''}>${u}</option>`).join('')}</select></div><div><label>Quantity</label><input id="docItemQty" type="number" inputmode="decimal" step="0.01" value="${it.qty}" autocomplete="off"></div></div>
  <div style="margin-top:10px"><label>Rate / Price</label><input id="docItemRate" type="number" inputmode="decimal" step="0.01" value="${it.rate}" autocomplete="off"></div>
  <div class="actions"><button class="btn" onclick="saveDocItem('${type}',${idx===null?'null':idx})">Save Item</button><button class="btn secondary" onclick="closeModal()">Cancel</button></div>`);
  setTimeout(()=>document.getElementById('docItemName')?.focus(),120);
}
function saveDocItem(type,idx){let obj=type==='quote'?qEdit:iEdit;if(!obj)return;let name=document.getElementById('docItemName').value.trim();if(!name)return toast('Item name required');let it={id:idx===null?crypto.randomUUID():obj.items[idx].id,name,unit:document.getElementById('docItemUnit').value,qty:Number(document.getElementById('docItemQty').value)||0,rate:Number(document.getElementById('docItemRate').value)||0};if(idx===null)obj.items.push(it);else obj.items[idx]=it;closeModal();renderBilling()}
function saveQuote(){let c=calc(qEdit),cu=db.customers.find(x=>x.id===qEdit.customerId);if(!cu)return toast('Select customer');let obj={...qEdit,total:c.total,customer:cu.name};if(qEdit.id)db.quotations=db.quotations.map(x=>x.id===qEdit.id?obj:x);else{obj.id=crypto.randomUUID();db.quotations.push(obj)}db.history.push({type:'Quotation',customer:cu.name,amount:c.total,date:new Date().toLocaleString()});qEdit=null;save();toast('Quotation saved');renderBilling()}
function renderQuotes(){document.getElementById('quotationList').innerHTML=db.quotations.length?db.quotations.slice().reverse().map(q=>`<div class="item"><div><b>${esc(q.no)}</b><div class="muted small">${esc(q.customer)} • ${esc(q.date)}</div></div><div><b>${money(q.total)}</b><div class="actions" style="margin:4px 0 0"><button class="btn secondary" onclick="editQuote('${q.id}')">Open</button><button class="btn secondary" onclick="viewSaved('quote','${q.id}')">View</button><button class="btn accent" onclick="printSaved('quote','${q.id}')">PDF</button></div></div></div>`).join(''):'<div class="empty">No quotations yet.</div>'}
function editQuote(id){qEdit=db.quotations.find(x=>x.id===id);renderQuoteEditor();openPage('quotations');window.scrollTo(0,document.body.scrollHeight)}
function quoteWA(){if(!qEdit)return toast('Open quotation first');let cu=db.customers.find(x=>x.id===qEdit.customerId),c=calc(qEdit);if(!cu)return toast('Select customer');if(!cu.wa)return toast('Customer WhatsApp number missing');let msg='Assalam-o-Alaikum '+cu.name+',%0A%0AQuotation '+qEdit.no+'%0ATotal: '+money(c.total)+'%0A%0AThank you.%0A'+(db.settings.name||'SZ Billing');window.location.href='https://wa.me/'+cu.wa.replace(/\D/g,'')+'?text='+msg;db.history.push({type:'WhatsApp',waAction:'Quotation',detail:'WhatsApp chat opened • '+cu.name,customer:cu.name,amount:c.total,date:new Date().toLocaleString()});save();renderWA();}

function saveInvoice(){
  if(!iEdit)return toast('Open Invoice first');
  let c=calc(iEdit),cu=db.customers.find(x=>x.id===iEdit.customerId);
  if(!cu)return toast('Select customer');
  let obj={...iEdit,total:c.total,paid:Number(iEdit.paid||0),pending:Math.max(0,c.total-Number(iEdit.paid||0)),customer:cu.name,date:iEdit.date||new Date().toISOString().slice(0,10)};
  if(iEdit.id){db.invoices=db.invoices.map(x=>x.id===iEdit.id?obj:x)}else{obj.id=crypto.randomUUID();db.invoices.push(obj)}
  db.history.push({type:'Invoice Saved',customer:cu.name,amount:c.total,date:new Date().toLocaleString()});
  iEdit={...obj};save();toast('Invoice saved');renderBilling();
}
function invoiceWA(){
  if(!iEdit)return toast('Open Invoice first');
  const cu=db.customers.find(x=>x.id===iEdit.customerId);
  if(!cu)return toast('Select customer');
  const phone=String(cu.wa||'').replace(/\D/g,'');
  if(!phone)return toast('Customer WhatsApp number missing');
  const kind=iEdit.shareAs==='quotation'?'quotation':'invoice';
  const title=kind==='quotation'?'Quotation':'Invoice';
  const c=calc(iEdit),paid=Number(iEdit.paid||0),pending=Math.max(0,c.total-paid);
  const msg=`Assalam-o-Alaikum ${cu.name},\n\nPlease find your ${title.toLowerCase()} ${iEdit.no}.\nTotal: ${money(c.total)}${kind==='invoice'?`\nReceived: ${money(paid)}\nPending: ${money(pending)}`:''}\n\nThank you for choosing ${db.settings.name||'SZ Billing'}.`;
  // Always prepare the PDF first, then open this customer's WhatsApp chat directly.
  try{
    const blob=makeInvoicePdf(iEdit,kind);
    const a=document.createElement('a');
    a.href=URL.createObjectURL(blob);
    a.download=`${title}-${iEdit.no}.pdf`;
    a.style.display='none';
    document.body.appendChild(a); a.click(); a.remove();
    iEdit.shareAs=kind;
    db.history.push({type:title+' WhatsApp PDF',customer:cu.name,amount:c.total,date:new Date().toLocaleString()});
    save();
  }catch(e){ console.warn('PDF prepare failed',e); }
  const waUrl='https://wa.me/'+phone+'?text='+encodeURIComponent(msg);
  // Direct navigation is intentional: this makes the WhatsApp option open the saved customer's chat reliably.
  window.location.href=waUrl;
}
function pdfEsc(s){return String(s??'').replace(/\\/g,'\\\\').replace(/\(/g,'\\(').replace(/\)/g,'\\)').replace(/\r?\n/g,' ')}
function makeInvoicePdf(obj,kind){
  const cu=db.customers.find(x=>x.id===obj.customerId)||{name:obj.customer||'',wa:'',address:''};
  const c=calc(obj), paid=kind==='invoice'?Number(obj.paid||0):0, pending=kind==='invoice'?Math.max(0,c.total-paid):0;
  const title=kind==='quotation'?'QUOTATION':'INVOICE';
  let lines=[]; const add=(y,t,size=10)=>lines.push(`BT /F1 ${size} Tf 50 ${y} Td (${pdfEsc(t)}) Tj ET`);
  add(800, title, 22); add(770, db.settings.name||'SZ Billing', 13); add(748, `No: ${obj.no}   Date: ${obj.date}`, 10);
  if(kind==='invoice') add(730, `Due: ${obj.due||'—'}`, 10);
  add(700, `Customer: ${cu.name}`, 11); if(cu.wa)add(682, `WhatsApp: ${cu.wa}`, 9); if(cu.address)add(664, `Address: ${cu.address}`, 9);
  add(630, 'Item                         Unit       Qty        Rate        Amount', 9);
  lines.push('0.5 w 50 615 m 545 615 l S');
  let y=595;
  obj.items.forEach((it,i)=>{if(y<120){return} add(y, `${i+1}. ${String(it.name).slice(0,28)}   ${it.unit}   ${it.qty}   ${money(it.rate)}   ${money(it.qty*it.rate)}`, 8); y-=20});
  y=Math.max(y,180);
  add(y, `Subtotal: ${money(c.sub)}`, 10); y-=20; add(y, `Discount: ${money(c.disc)}`, 10); y-=22; add(y, `TOTAL: ${money(c.total)}`, 13);
  if(kind==='invoice'){y-=22;add(y,`Received: ${money(paid)}`,10);y-=20;add(y,`Pending: ${money(pending)}`,10)}
  y-=30; add(y, `Terms: ${String(obj.terms||db.settings.terms||'').slice(0,140)}`, 8);
  y-=28; add(y, db.settings.phone||'', 9);
  const content=lines.join('\n'); const contentLen=new TextEncoder().encode(content).length;
  const objs=[]; const offsets=[0];
  function obj(n,body){return `${n} 0 obj\n${body}\nendobj\n`}
  objs[1]=obj(1,'<< /Type /Catalog /Pages 2 0 R >>');
  objs[2]=obj(2,'<< /Type /Pages /Kids [3 0 R] /Count 1 >>');
  objs[3]=obj(3,'<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>');
  objs[4]=obj(4,'<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>');
  objs[5]=obj(5,`<< /Length ${contentLen} >>\nstream\n${content}\nendstream`);
  let pdf='%PDF-1.4\n'; let offs=[];
  for(let i=1;i<=5;i++){offs[i]=pdf.length;pdf+=objs[i]}
  const xref=pdf.length; pdf+=`xref\n0 6\n0000000000 65535 f \n`;
  for(let i=1;i<=5;i++)pdf+=String(offs[i]).padStart(10,'0')+' 00000 n \n';
  pdf+=`trailer\n<< /Size 6 /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF`;
  return new Blob([pdf],{type:'application/pdf'});
}
async function shareInvoiceAs(kind){
  const obj=iEdit;if(!obj)return toast('Open Invoice first');
  const cu=db.customers.find(x=>x.id===obj.customerId);if(!cu)return toast('Select customer');
  if(!cu.wa)return toast('Customer WhatsApp number missing');
  const title=kind==='quotation'?'Quotation':'Invoice';
  const c=calc(obj),paid=Number(obj.paid||0),pending=Math.max(0,c.total-paid);
  const msg=`Assalam-o-Alaikum ${cu.name},\n\nPlease find attached your ${title.toLowerCase()} ${obj.no}.\nTotal: ${money(c.total)}${kind==='invoice'?`\nReceived: ${money(paid)}\nPending: ${money(pending)}`:''}\n\nThank you for choosing ${db.settings.name||'SZ Billing'}.`;
  const blob=makeInvoicePdf(obj,kind),fileName=`${title}-${obj.no}.pdf`;
  let file=null;try{file=new File([blob],fileName,{type:'application/pdf'});}catch(e){}

  // IMPORTANT: keep this call directly inside the user's click chain.
  // If the installed browser supports file sharing, Android's share sheet can send the PDF to WhatsApp.
  if(file && typeof navigator.share==='function'){
    try{
      if(typeof navigator.canShare!=='function' || navigator.canShare({files:[file]})){
        await navigator.share({files:[file],title:`${title} ${obj.no}`,text:msg});
        obj.shareAs=kind;db.history.push({type:'WhatsApp',waAction:title+' Bill PDF',detail:'Shared to WhatsApp • '+cu.name,customer:cu.name,amount:c.total,date:new Date().toLocaleString()});save();renderWA();
        return;
      }
    }catch(e){
      if(e&&e.name==='AbortError')return;
    }
  }

  // WebView/older Android fallback: create the PDF first, then open the WhatsApp chat.
  // A web page cannot programmatically attach a local file to wa.me; the PDF is therefore saved for manual attachment.
  try{
    const url=URL.createObjectURL(blob),a=document.createElement('a');
    a.href=url;a.download=fileName;a.rel='noopener';document.body.appendChild(a);a.click();a.remove();
    obj.shareAs=kind;db.history.push({type:'WhatsApp',waAction:title+' Bill PDF',detail:'Shared to WhatsApp • '+cu.name,customer:cu.name,amount:c.total,date:new Date().toLocaleString()});save();renderWA();
    const phone=String(cu.wa).replace(/\D/g,'');
    setTimeout(()=>{
      URL.revokeObjectURL(url);
      // Prefer the WhatsApp app intent; fall back to wa.me if the app is unavailable.
      const intent='intent://send?phone='+phone+'&text='+encodeURIComponent(msg)+'#Intent;scheme=whatsapp;package=com.whatsapp;end';
      try{window.location.href=intent;}catch(e){window.location.href='https://wa.me/'+phone+'?text='+encodeURIComponent(msg)}
      setTimeout(()=>{if(document.visibilityState==='visible')window.location.href='https://wa.me/'+phone+'?text='+encodeURIComponent(msg)},900);
    },250);
  }catch(e){toast('Could not prepare PDF for WhatsApp');}
}
function waHistoryRows(){return db.history.filter(x=>x.waAction||String(x.type||'').includes('WhatsApp')).slice().reverse().map(x=>{let action=x.waAction||x.type||'WhatsApp';let detail=x.detail||'';return `<div class="item"><div><b>${esc(action)}</b><div class="muted small">Customer: ${esc(x.customer||'—')} • ${esc(x.date||'')}</div>${detail?`<div class="muted small">${esc(detail)}</div>`:''}</div><b>${x.amount!=null?money(x.amount):''}</b></div>`}).join('')||'<div class="empty">No WhatsApp history.</div>'}
function renderWA(){let s=document.getElementById('waCustomer');if(!s)return;s.innerHTML=customerOptions(window.waCustomer||'');if(!window.waCustomer&&db.customers[0]){window.waCustomer=db.customers[0].id;s.value=window.waCustomer}waLoad();let h=document.getElementById('waHistory');if(h)h.innerHTML=waHistoryRows()}
function showAllWAHistory(){openModal(`<h2>WhatsApp History — All Customers</h2><div class="card" style="max-height:60vh;overflow:auto">${waHistoryRows()}</div>`)}
function waLoad(){let s=document.getElementById('waCustomer');window.waCustomer=s?s.value:'';let cu=db.customers.find(x=>x.id===window.waCustomer),el=document.getElementById('waInfo');if(!el)return;if(!cu){el.innerHTML='<div class="empty">Select customer.</div>';return}let inv=db.invoices.filter(x=>x.customerId===cu.id).slice(-1)[0];el.innerHTML=`<b>${esc(cu.name)}</b><div class="muted small">${esc(cu.wa||'No WhatsApp')}</div>${inv?`<div style="margin-top:8px">Latest Invoice <b>${esc(inv.no)}</b><br>Total: <b>${money(inv.total)}</b> • Paid: <b>${money(inv.paid)}</b> • Pending: <b>${money(inv.pending)}</b></div>`:''}`}
function openWA(){let cu=db.customers.find(x=>x.id===window.waCustomer);if(!cu)return toast('Select customer');if(!cu.wa)return toast('Customer WhatsApp number missing');window.location.href='https://wa.me/'+cu.wa.replace(/\D/g,'')}
function pendingPost(){
  let cu=iEdit?db.customers.find(x=>x.id===iEdit.customerId):db.customers.find(x=>x.id===window.waCustomer);
  let inv=iEdit||(cu?db.invoices.filter(x=>x.customerId===cu.id).slice(-1)[0]:null);
  if(!cu||!inv)return toast('Select customer and invoice first');
  if(!cu.wa)return toast('Customer WhatsApp number missing');
  let c=calc(inv),paid=Number(inv.paid||0),pending=Math.max(0,c.total-paid);
  if(pending<=0)return toast('This invoice has no pending payment');
  openModal(`<h2>Pending Payment Post</h2><p class="muted">${esc(cu.name)} • Invoice ${esc(inv.no)}</p><div class="card" style="margin:12px 0;padding:14px"><b>What do you want to send?</b><div class="actions" style="margin-top:14px"><button class="btn accent" onclick="pendingPostSend(false)">🖼️ Pending Post Only</button><button class="btn ok" onclick="pendingPostSend(true)">🖼️ + 📄 Post & Bill PDF</button></div></div>`);
}

function buildPendingPostBlob(cu,inv,pending,paid,total){
  return new Promise(resolve=>{
    let canvas=document.createElement('canvas');canvas.width=1200;canvas.height=1500;let g=canvas.getContext('2d');
    const grad=g.createLinearGradient(0,0,1200,1500);grad.addColorStop(0,'#f7faff');grad.addColorStop(.55,'#ffffff');grad.addColorStop(1,'#eef3f8');g.fillStyle=grad;g.fillRect(0,0,1200,1500);
    g.fillStyle='#0b1f3a';g.fillRect(0,0,1200,300);g.fillStyle='#1d70d6';g.fillRect(0,292,1200,8);
    g.fillStyle='#ffffff';g.font='bold 24px Arial';g.fillText(String(db.settings.name||'SZ BILLING').slice(0,32).toUpperCase(),78,82);
    g.fillStyle='#a9c7e8';g.font='18px Arial';g.fillText('CUSTOMER ACCOUNTS • PAYMENT NOTICE',78,115);
    g.fillStyle='#ffffff';g.font='bold 50px Arial';g.fillText('Payment Reminder',78,205);
    g.fillStyle='#c9d8e9';g.font='20px Arial';g.fillText('A professional courtesy regarding your outstanding balance',78,242);
    g.fillStyle='#ffffff';g.beginPath();g.roundRect(60,345,1080,185,26);g.fill();g.strokeStyle='#dbe4ee';g.lineWidth=2;g.stroke();
    g.fillStyle='#1d70d6';g.beginPath();g.arc(125,437,42,0,Math.PI*2);g.fill();g.fillStyle='#ffffff';g.font='bold 30px Arial';g.textAlign='center';g.fillText(String(cu.name||'C').trim().charAt(0).toUpperCase(),125,447);g.textAlign='left';
    g.fillStyle='#718096';g.font='16px Arial';g.fillText('ACCOUNT HOLDER',195,408);g.fillStyle='#0b1f3a';g.font='bold 31px Arial';g.fillText(String(cu.name||'Valued Customer').slice(0,32),195,450);g.fillStyle='#718096';g.font='18px Arial';g.fillText('Invoice #'+String(inv.no||''),195,485);
    g.fillStyle='#f3f8ff';g.beginPath();g.roundRect(60,565,1080,270,26);g.fill();g.strokeStyle='#cfe0f4';g.stroke();g.fillStyle='#52657b';g.font='bold 17px Arial';g.fillText('OUTSTANDING BALANCE',100,625);g.fillStyle='#0b1f3a';g.font='bold 67px Arial';g.fillText(money(pending),100,715);g.fillStyle='#718096';g.font='18px Arial';g.fillText('Amount currently due',100,755);g.fillStyle='#d8e3ef';g.fillRect(600,605,1,175);g.fillStyle='#66788e';g.font='17px Arial';g.fillText('TOTAL BILL',655,635);g.fillStyle='#0b1f3a';g.font='bold 26px Arial';g.fillText(money(total),655,680);g.fillStyle='#66788e';g.font='17px Arial';g.fillText('RECEIVED',655,725);g.fillStyle='#0b1f3a';g.font='bold 26px Arial';g.fillText(money(paid),655,770);if(inv.due){g.fillStyle='#1d70d6';g.font='bold 17px Arial';g.fillText('DUE DATE  '+inv.due,100,805)}
    g.fillStyle='#0b1f3a';g.font='bold 27px Arial';g.fillText('Dear Customer,',75,910);g.fillStyle='#3f5065';g.font='21px Arial';['We appreciate your trust and continued business.','When convenient, please arrange the outstanding payment.','If payment has already been made, kindly share the confirmation','so our accounts record can be updated. Thank you.'].forEach((t,i)=>g.fillText(t,75,955+i*38));
    g.fillStyle='#0b1f3a';g.beginPath();g.roundRect(60,1165,1080,220,24);g.fill();g.fillStyle='#ffffff';g.font='bold 26px Arial';g.fillText(String(db.settings.name||'SZ BILLING').slice(0,36),100,1225);g.fillStyle='#b8c9dc';g.font='18px Arial';g.fillText('For payment confirmation or account assistance',100,1262);if(db.settings.phone){g.fillStyle='#ffffff';g.font='bold 20px Arial';g.fillText('Contact  '+String(db.settings.phone).slice(0,42),100,1310)}if(db.settings.address){g.fillStyle='#b8c9dc';g.font='17px Arial';g.fillText(String(db.settings.address).slice(0,78),100,1347)}g.fillStyle='#7f93aa';g.font='15px Arial';g.fillText('This notice is a friendly courtesy and not a demand notice.',75,1435);
    canvas.toBlob(resolve,'image/png');
  });
}

async function pendingPostSend(includePdf){
  closeModal();
  let cu=iEdit?db.customers.find(x=>x.id===iEdit.customerId):db.customers.find(x=>x.id===window.waCustomer);
  let inv=iEdit||(cu?db.invoices.filter(x=>x.customerId===cu.id).slice(-1)[0]:null);
  if(!cu||!inv)return toast('Select customer and invoice first');
  if(!cu.wa)return toast('Customer WhatsApp number missing');
  let c=calc(inv),paid=Number(inv.paid||0),pending=Math.max(0,c.total-paid);
  if(pending<=0)return toast('This invoice has no pending payment');
  const action=includePdf?'Pending Post + Bill PDF':'Pending Post Only';
  const msg=`Assalam-o-Alaikum ${cu.name},\n\nPayment reminder for invoice ${inv.no}.\nPending: ${money(pending)}\n\nThank you for your cooperation.`;
  try{
    const blob=await buildPendingPostBlob(cu,inv,pending,paid,c.total);
    if(!blob)throw new Error('post blob unavailable');
    const postName='Payment-Pending-'+inv.no+'.png';
    const pdfName='Invoice-'+inv.no+'.pdf';
    const postFile=(typeof File==='function')?new File([blob],postName,{type:'image/png'}):null;
    let pdfBlob=null,pdfFile=null;
    if(includePdf){
      pdfBlob=makeInvoicePdf(inv,'invoice');
      if(!pdfBlob)throw new Error('pdf blob unavailable');
      pdfFile=(typeof File==='function')?new File([pdfBlob],pdfName,{type:'application/pdf'}):null;
    }

    // Best case: Android/browser supports sharing both files together.
    if(typeof navigator.share==='function' && postFile && (!includePdf || pdfFile)){
      const files=includePdf?[postFile,pdfFile]:[postFile];
      let supported=true;
      try{supported=typeof navigator.canShare!=='function'||navigator.canShare({files});}catch(e){supported=false;}
      if(supported){
        try{
          await navigator.share({title:'Payment Reminder',text:msg,files});
          db.history.push({type:'WhatsApp',waAction:action,detail:'Shared to WhatsApp • '+cu.name,customer:cu.name,amount:pending,date:new Date().toLocaleString()});
          save();renderWA();toast(action+' shared');return;
        }catch(e){if(e&&e.name==='AbortError')return;console.warn('File share not available',e);}
      }
    }

    // Reliable browser/PWA fallback: prepare every requested file and open the exact customer chat.
    // wa.me cannot attach local files, so the files are downloaded instead of showing an error.
    const downloadBlob=(b,name)=>{const u=URL.createObjectURL(b),a=document.createElement('a');a.href=u;a.download=name;document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(u),8000);};
    downloadBlob(blob,postName);
    if(includePdf)downloadBlob(pdfBlob,pdfName);
    db.history.push({type:'WhatsApp',waAction:action,detail:'Files prepared • WhatsApp chat opened (browser requires manual attachment)',customer:cu.name,amount:pending,date:new Date().toLocaleString()});
    save();renderWA();
    const phone=String(cu.wa).replace(/\D/g,'');
    setTimeout(()=>{window.location.href='https://wa.me/'+phone+'?text='+encodeURIComponent(msg);},300);
    toast(includePdf?'Post + bill PDF prepared; WhatsApp chat opened':'Pending post prepared; WhatsApp chat opened');
  }catch(e){
    console.error('pendingPostSend error',e);
    // Last-resort: never fail the requested action because of file-share API support.
    try{
      const post=await buildPendingPostBlob(cu,inv,pending,paid,c.total);
      const u=URL.createObjectURL(post),a=document.createElement('a');a.href=u;a.download='Payment-Pending-'+inv.no+'.png';document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(u),8000);
      if(includePdf){const pb=makeInvoicePdf(inv,'invoice');const pu=URL.createObjectURL(pb),pa=document.createElement('a');pa.href=pu;pa.download='Invoice-'+inv.no+'.pdf';document.body.appendChild(pa);pa.click();pa.remove();setTimeout(()=>URL.revokeObjectURL(pu),8000);}
      db.history.push({type:'WhatsApp',waAction:action,detail:'Files prepared • WhatsApp chat opened',customer:cu.name,amount:pending,date:new Date().toLocaleString()});save();renderWA();
      const phone=String(cu.wa).replace(/\D/g,'');setTimeout(()=>{window.location.href='https://wa.me/'+phone+'?text='+encodeURIComponent(msg)},300);
      toast(includePdf?'Post + bill PDF prepared; WhatsApp chat opened':'Pending post prepared; WhatsApp chat opened');
    }catch(e2){console.error(e2);toast('Could not create pending post');}
  }
}

function docHtml(obj,type){let cu=db.customers.find(x=>x.id===obj.customerId)||{name:obj.customer||'',wa:'',address:''};let c=calc(obj);let paid=type==='invoice'?Number(obj.paid||0):null;let pending=type==='invoice'?Math.max(0,c.total-paid):null;return `<div class="doc"><div class="doc-head"><div><img class="doc-logo" src="${db.settings.logo||'logo-master.png'}"><h1>${type==='invoice'?'INVOICE':'QUOTATION'}</h1></div><div class="doc-meta"><b>${esc(obj.no)}</b><br>Date: ${esc(obj.date)}${type==='invoice'?'<br>Due: '+esc(obj.due||'—'):''}<br><br><b>${esc(db.settings.name)}</b><br>${esc(db.settings.phone)}<br>${esc(db.settings.address)}</div></div><div style="margin-top:15px;font-size:12px"><b>Customer:</b> ${esc(cu.name)}<br>${esc(cu.wa)}<br>${esc(cu.address)}</div><table><thead><tr><th>#</th><th>Item</th><th>Unit</th><th>Qty</th><th>Rate</th><th>Amount</th></tr></thead><tbody>${obj.items.map((it,n)=>`<tr><td>${n+1}</td><td>${esc(it.name)}</td><td>${esc(it.unit)}</td><td>${it.qty}</td><td>${money(it.rate)}</td><td>${money(it.qty*it.rate)}</td></tr>`).join('')}</tbody></table><div class="total"><div><span>Subtotal</span><b>${money(c.sub)}</b></div><div><span>Discount</span><b>${money(c.disc)}</b></div><div class="grand"><span>Total</span><b>${money(c.total)}</b></div>${type==='invoice'?`<div><span>Paid</span><b>${money(paid)}</b></div><div><span>Pending</span><b>${money(pending)}</b></div>`:''}</div><div class="terms"><b>Terms & Conditions</b><br>${esc(obj.terms||db.settings.terms)}</div></div>`}
let billingMode='invoice';
function activeDoc(){return iEdit}
function setBillingMode(type){billingMode='invoice';if(!iEdit||iEdit.id){newInvoice()}renderBilling()}
function newBilling(type){billingMode='invoice';qEdit=null;newInvoice();openPage('billing');renderBilling();setTimeout(()=>window.scrollTo(0,document.body.scrollHeight),80)}
function renderBilling(){let el=document.getElementById('billingEditor');if(!el)return;billingMode='invoice';let obj=iEdit;if(obj){renderBillingEditor()}else{el.innerHTML='<div class="card"><div class="empty">Tap + New Invoice to create an invoice.</div></div>'}renderBillingList()}

function renderBillingEditor(){
  let e=document.getElementById('billingEditor'),obj=iEdit;
  if(!obj){e.innerHTML='';return}
  let c=calc(obj),pending=Math.max(0,c.total-Number(obj.paid||0));
  let rows=obj.items.length?obj.items.map((it,idx)=>`<div class="bill-item-row"><div><b>${esc(it.name||'Custom item')}</b><small>${esc(it.unit)} • Qty ${it.qty} • ${money(it.rate)} each</small></div><strong>${money(it.qty*it.rate)}</strong><div class="actions"><button class="btn secondary" onclick="editDocItem('i',${idx})">Edit</button><button class="btn danger" onclick="iRemove(${idx})">×</button></div></div>`).join(''):`<div class="empty">No item added yet. Tap <b>+ Add Item</b> and select your product.</div>`;
  e.innerHTML=`<div class="card">
  <div class="actions" style="margin-top:0"><span class="badge">INVOICE</span><span class="muted">${esc(obj.no)}</span></div>
  <div class="row" style="margin-top:12px"><div><label>Customer</label><select onchange="iEdit.customerId=this.value">${customerOptions(obj.customerId)}</select></div><div><label>Date</label><input type="date" value="${obj.date}" onchange="iEdit.date=this.value"></div></div>
  <div class="row" style="margin-top:10px"><div><label>Due Date</label><input type="date" value="${obj.due||''}" onchange="iEdit.due=this.value"></div><div><label>Received / Paid</label><input id="billPaid" type="number" inputmode="decimal" step="0.01" value="${obj.paid||0}" oninput="iEdit.paid=Number(this.value)||0;updateBillingTotals()"></div></div>
  <div style="margin-top:10px"><label>Share as:</label><select onchange="iEdit.shareAs=this.value"><option value="invoice" ${obj.shareAs!=='quotation'?'selected':''}>Invoice</option><option value="quotation" ${obj.shareAs==='quotation'?'selected':''}>Quotation</option></select></div>
  <div class="bill-items" id="billingLiveItems"><div class="bill-items-head"><b>Added Items</b><span>${obj.items.length} item${obj.items.length===1?'':'s'}</span></div>${rows}</div>
  <div class="actions"><button class="btn secondary" onclick="addDocItem('invoice')">+ Add Item</button></div>
  <div class="row"><div><label>Discount</label><input id="billDiscount" type="number" inputmode="decimal" step="0.01" value="${obj.discount||0}" oninput="iEdit.discount=Number(this.value)||0;updateBillingTotals()"></div><div><label>Terms & Conditions</label><textarea oninput="iEdit.terms=this.value">${esc(obj.terms||'')}</textarea></div></div>
  <div class="editor-summary"><b>Subtotal:</b> <span id="billSubtotal">${money(c.sub)}</span> &nbsp; <b>Discount:</b> <span id="billDisc">${money(c.disc)}</span> &nbsp; <b>Total:</b> <span id="billTotal">${money(c.total)}</span> &nbsp; <b>Received:</b> <span id="billPaidShow">${money(obj.paid)}</span> &nbsp; <b>Pending:</b> <span id="billPending">${money(pending)}</span></div>
  <div class="actions"><button class="btn" onclick="saveBilling()">Save Invoice</button><button class="btn secondary" onclick="viewCurrentBilling()">View</button><button class="btn accent" onclick="printDoc('invoice')">Print / PDF</button><button class="btn ok" onclick="invoiceWA()">WhatsApp</button><button class="btn secondary" onclick="pendingPost()">Pending Post</button></div>
  </div>`;
}

function updateBillingTotals(){let obj=activeDoc();if(!obj)return;let c=calc(obj),p=billingMode==='invoice'?Math.max(0,c.total-Number(obj.paid||0)):0;let set=(id,v)=>{let e=document.getElementById(id);if(e)e.textContent=v};set('billSubtotal',money(c.sub));set('billDisc',money(c.disc));set('billTotal',money(c.total));set('billPaidShow',money(obj.paid));set('billPending',money(p));document.querySelectorAll('#billingEditor .lineTotal').forEach((e,idx)=>{let it=obj.items[idx];if(it)e.textContent=money(Number(it.qty||0)*Number(it.rate||0))})}
function markFullPaidAndSave(){
  if(!iEdit)return toast('Open Invoice first');
  const c=calc(iEdit);
  iEdit.paid=Number(c.total||0);
  iEdit.pending=0;
  saveInvoice();
  toast('Payment marked as Fully Paid');
}
function saveBilling(){saveInvoice()}
function deleteInvoice(id){
  const inv=db.invoices.find(x=>x.id===id);if(!inv)return toast('Invoice not found');
  if(!confirm('Delete invoice '+(inv.no||'')+'? This cannot be undone.'))return;
  db.invoices=db.invoices.filter(x=>x.id!==id);
  if(iEdit&&iEdit.id===id){iEdit=null;}
  save();toast('Invoice deleted');renderBilling();
}
function renderBillingList(){let el=document.getElementById('billingList');if(!el)return;let arr=db.invoices||[];if(!arr.length){el.innerHTML='<div class="empty">No invoices saved yet.</div>';return}el.innerHTML=arr.slice().reverse().map(x=>`<div class="item"><div><b>${esc(x.no)}</b><div class="muted small">${esc(x.customer||'')} • ${esc(x.date||'')}</div></div><div><b>${money(x.total)}</b><div class="small">${x.pending?money(x.pending)+' pending':'Paid'}</div><div class="actions" style="margin:4px 0 0"><button class="btn secondary" onclick="openSavedBilling('invoice','${x.id}')">Open</button><button class="btn secondary" onclick="viewSaved('invoice','${x.id}')">View</button><button class="btn accent" onclick="printSaved('invoice','${x.id}')">PDF</button>${Number(x.pending||0)>0?`<button class="btn ok" onclick="markSavedInvoicePaid('${x.id}')">✓ Full Paid</button>`:''}<button class="btn danger" onclick="deleteInvoice('${x.id}')">Delete</button></div></div></div>`).join('')}
function markSavedInvoicePaid(id){
  const inv=db.invoices.find(x=>x.id===id);
  if(!inv)return toast('Invoice not found');
  const total=Number(inv.total||0);
  if(total<=0)return toast('Invoice total is zero');
  if(Number(inv.pending||0)<=0)return toast('Invoice is already fully paid');
  if(!confirm('Mark invoice '+(inv.no||'')+' as Fully Paid?'))return;
  inv.paid=total; inv.pending=0;
  db.history.push({type:'Invoice Fully Paid',customer:inv.customer||'',amount:total,date:new Date().toLocaleString()});
  save(); renderBilling(); renderDashboard(); toast('Invoice marked as Fully Paid');
}
function openSavedBilling(type,id){billingMode='invoice';qEdit=null;iEdit=db.invoices.find(x=>x.id===id)||null;openPage('billing');if(iEdit&&iEdit.id)renderBilling();setTimeout(()=>window.scrollTo(0,document.body.scrollHeight),80)}
function viewCurrentBilling(){let obj=activeDoc();if(obj)viewDocument(billingMode,obj)}
function viewSaved(type,id){let obj=(type==='quote'?db.quotations:db.invoices).find(x=>x.id===id);if(obj)viewDocument(type,obj)}
function viewDocument(type,obj){document.getElementById('printContent').innerHTML='<div class="no-print actions"><button class="btn secondary" onclick="openPage(\'billing\');setBillingMode(\''+type+'\')">← Back to Billing</button><button class="btn accent" onclick="printSaved(\''+type+'\',\''+(obj.id||'')+'\')">Print / PDF</button></div><div class="preview-doc-wrap">'+docHtml(obj,type)+'</div>';document.querySelectorAll('.page').forEach(p=>p.classList.remove('active','printing'));document.getElementById('printPage').classList.add('active');window.scrollTo(0,0)}
function printDoc(type){let obj=type==='quote'?qEdit:iEdit;if(!obj)return toast('Open a document first');document.getElementById('printContent').innerHTML=docHtml(obj,type);document.querySelectorAll('.page').forEach(p=>p.classList.remove('active'));document.getElementById('printPage').classList.add('printing');window.print();setTimeout(()=>{document.getElementById('printPage').classList.remove('printing');openPage('billing');setBillingMode(type)},500)}
function printSaved(type,id){let obj=(type==='quote'?db.quotations:db.invoices).find(x=>x.id===id);if(!obj)return;document.getElementById('printContent').innerHTML=docHtml(obj,type);document.querySelectorAll('.page').forEach(p=>p.classList.remove('active'));document.getElementById('printPage').classList.add('printing');window.print();setTimeout(()=>{document.getElementById('printPage').classList.remove('printing');openPage('billing');setBillingMode(type)},500)}

function loadSettings(){document.getElementById('setName').value=db.settings.name||'';document.getElementById('setPhone').value=db.settings.phone||'';document.getElementById('setAddress').value=db.settings.address||'';document.getElementById('setTerms').value=db.settings.terms||'';document.getElementById('logoPreview').src=db.settings.logo||'logo-master.png'}
function saveSettings(){db.settings.name=document.getElementById('setName').value.trim()||'SZ Billing';db.settings.phone=document.getElementById('setPhone').value.trim();db.settings.address=document.getElementById('setAddress').value.trim();db.settings.terms=document.getElementById('setTerms').value.trim();save();toast('Settings saved')}
function saveLogo(e){let f=e.target.files[0];if(!f)return;let r=new FileReader();r.onload=()=>{db.settings.logo=r.result;save();document.getElementById('logoPreview').src=r.result;toast('Logo updated')};r.readAsDataURL(f)}
function resetLogo(){db.settings.logo='logo-master.png';save();loadSettings();toast('SZ logo restored')}
function backup(){let blob=new Blob([JSON.stringify(db,null,2)],{type:'application/json'}),a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download='SZ-Billing-Backup-'+new Date().toISOString().slice(0,10)+'.json';a.click()}
function restore(e){let f=e.target.files[0];if(!f)return;let r=new FileReader();r.onload=()=>{try{db=JSON.parse(r.result);save();toast('Backup restored')}catch(x){toast('Invalid backup')}};r.readAsText(f)}

if('serviceWorker' in navigator){
  window.addEventListener('load',()=>navigator.serviceWorker.register('./sw.js').then(reg=>{reg.update();}).catch(()=>{}));
  navigator.serviceWorker.addEventListener('controllerchange',()=>{if(!window.__swReloaded){window.__swReloaded=true;window.location.reload();}});
}
load();
