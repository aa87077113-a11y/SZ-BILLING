/* SZ Billing AI Copilot - deterministic, safe, local-first assistant. */
(function(){
  function daysOld(date){const d=new Date(date||Date.now()); return Math.max(0,Math.floor((Date.now()-d.getTime())/86400000));}
  function invTotal(i){return Number(typeof calc==='function'?calc(i).total:(i.total||0));}
  function pending(i){return Math.max(0,invTotal(i)-Number(i.paid||0));}
  function analyze(){
    const issues=[], fixes=[]; const invoices=db.invoices||[], customers=db.customers||[], products=db.products||[];
    const seen=new Set(); invoices.forEach(i=>{if(!i.id||seen.has(i.id))issues.push('Duplicate or missing invoice ID'); seen.add(i.id); const t=invTotal(i); if(Number(i.paid||0)>t)issues.push(`Invoice ${i.no||''}: received exceeds total`); if(pending(i)>0 && !i.customerId)issues.push(`Invoice ${i.no||''}: customer is missing`);});
    customers.forEach(c=>{if(!c.name?.trim())issues.push('A customer has no name');});
    products.forEach(p=>{if(Number(p.rate)<0)issues.push(`Product ${p.name||''}: negative rate`);});
    if(!db.settings.name)fixes.push('Restore business name to SZ Billing');
    if(!db.settings.docTheme)fixes.push('Set a professional document theme');
    const overdue=invoices.filter(i=>pending(i)>0&&daysOld(i.date)>=Number(db.settings.reminderDays||3));
    if(overdue.length)fixes.push(`${overdue.length} pending invoices are ready for reminder review`);
    return {issues:[...new Set(issues)],fixes,overdue};
  }
  window.aiAnalyze=function(){const r=analyze();const el=document.getElementById('aiResult');if(!el)return;el.innerHTML=`<div class="ai-grid"><div><b>Health</b><div class="ai-score">${r.issues.length?'Needs attention':'Excellent'}</div><div class="muted small">${r.issues.length} issue(s) found</div></div><div><b>Recommendations</b><div class="ai-score">${r.fixes.length}</div><div class="muted small">safe actions available</div></div><div><b>Pending reminders</b><div class="ai-score">${r.overdue.length}</div><div class="muted small">past reminder threshold</div></div></div>`+(r.issues.length?`<div class="card" style="margin-top:12px"><b>Checks</b>${r.issues.map(x=>`<div class="item"><span>⚠️ ${esc(x)}</span></div>`).join('')}</div>`:'<div class="success-card">✓ No critical data consistency issues found.</div>')+(r.fixes.length?`<div class="card" style="margin-top:12px"><b>AI Recommendations</b>${r.fixes.map(x=>`<div class="item"><span>💡 ${esc(x)}</span></div>`).join('')}</div>`:'');};
  window.aiAutoRepair=function(){db.settings=db.settings||{};db.settings.name=db.settings.name||'SZ Billing';db.settings.docTheme=db.settings.docTheme||'modern';db.settings.reminderDays=Math.max(1,Number(db.settings.reminderDays||3));(db.invoices||[]).forEach(i=>{const t=invTotal(i);i.total=t;i.paid=Math.min(Math.max(0,Number(i.paid||0)),t);i.pending=Math.max(0,t-i.paid);});save();aiAnalyze();toast('AI safe-repair completed');};
  window.aiOptimizeTheme=function(){db.settings=db.settings||{};db.settings.docTheme='corporate';db.settings.theme='blue';save();toast('Professional theme optimized');};
  window.aiScanAndQueue=function(){const r=analyze();db.reminders=Array.isArray(db.reminders)?db.reminders:[];r.overdue.forEach(i=>{if(!db.reminders.some(x=>x.invoiceId===i.id&&x.status!=='sent'))db.reminders.push({id:crypto.randomUUID(),invoiceId:i.id,customerId:i.customerId,createdAt:new Date().toISOString(),status:'ready'});});save();renderReminderQueue();toast(`${r.overdue.length} reminder(s) checked`);};
  window.renderReminderQueue=function(){const el=document.getElementById('reminderQueue');if(!el)return;const q=(db.reminders||[]).filter(x=>x.status!=='sent');el.innerHTML=q.length?q.slice().reverse().map(x=>{const i=db.invoices.find(v=>v.id===x.invoiceId),c=db.customers.find(v=>v.id===x.customerId);return `<div class="item"><div><b>${esc(c?.name||i?.customer||'Customer')}</b><div class="muted small">${esc(i?.no||'')} • Pending ${money(i?.pending||0)}</div></div><button class="btn accent" onclick="sendReminderNow('${x.id}')">Share Post</button></div>`}).join(''):'<div class="empty">No reminder queue.</div>';};
  window.sendReminderNow=async function(id){const r=(db.reminders||[]).find(x=>x.id===id);if(!r)return;const i=db.invoices.find(v=>v.id===r.invoiceId);if(!i)return;try{if(typeof pendingPost==='function'){await pendingPost(i.id);r.status='sent';r.sentAt=new Date().toISOString();save();renderReminderQueue();}}catch(e){toast('WhatsApp share was not completed');}};
  window.aiInit=function(){db.reminders=Array.isArray(db.reminders)?db.reminders:[];db.settings=db.settings||{};db.settings.reminderDays=Number(db.settings.reminderDays||3);aiAnalyze();renderReminderQueue();};
})();
