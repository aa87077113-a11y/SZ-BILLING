/* SZ Billing V26 - Appwrite cloud bridge. Existing V26 localStorage remains the primary local cache. */
(function(){
  const CFG={endpoint:'https://sgp.cloud.appwrite.io/v1',projectId:'6aa04f3d00392b39ad1e',databaseId:'6aa050e4003254df8561',bucketId:'6aa1a655002e54e67c19'};
  const TABLE_NAMES=['customers','products','invoices','history','settings','quotations'];
  let client,account,tablesDB,tableMap={},cloudReady=false,syncTimer=null,syncBusy=false;
  window.SZCloud={CFG};
  function status(t){const e=document.getElementById('cloudStatus');if(e)e.textContent='Cloud: '+t;}
  function initSdk(){
    if(client)return true;
    if(!window.Appwrite)return false;
    client=new Appwrite.Client().setEndpoint(CFG.endpoint).setProject(CFG.projectId);
    account=new Appwrite.Account(client);
    tablesDB=new Appwrite.TablesDB(client);
    return true;
  }
  async function refreshTables(){
    const r=await tablesDB.listTables({databaseId:CFG.databaseId});
    tableMap={};
    (r.tables||[]).forEach(t=>{if(TABLE_NAMES.includes(t.name))tableMap[t.name]=t.$id});
    const missing=TABLE_NAMES.filter(n=>!tableMap[n]);
    if(missing.length)throw new Error('Missing Appwrite tables: '+missing.join(', '));
  }
  async function activeSession(){try{return await account.getSession({sessionId:'current'})}catch(e){return null}}
  async function currentUser(){try{return await account.get()}catch(e){return null}}
  async function authState(){const session=await activeSession(); if(!session)return null; const user=await currentUser(); return {session,user};}
  async function init(){
    if(!initSdk()){status('SDK unavailable');return}
    const a=await authState();
    if(!a){status('Not logged in');return}
    try{await refreshTables();cloudReady=true;const u=a.user||{};status('Connected • '+(u.email||u.name||a.session.userId||'Active session'));await mergeFromCloud();await pushLocal();}
    catch(e){console.error(e);cloudReady=false;status('Connection error');}
  }
  function rowsFor(name){
    if(name==='settings')return [{id:'settings',data:{companyName:db.settings.name||'',phone:db.settings.phone||'',address:db.settings.address||'',terms:db.settings.terms||'',theme:db.settings.theme||'slate'}}];
    if(name==='customers')return db.customers.map(x=>({id:x.id,data:{name:x.name||'',whatsapp:x.wa||'',address:x.address||''}}));
    if(name==='products')return db.products.map(x=>({id:x.id,data:{name:x.name||'',rate:Number(x.rate)||0,unit:x.unit||'PCS'}}));
    if(name==='invoices')return db.invoices.map(x=>({id:x.id,data:{invoiceNo:x.no||'',customerId:x.customerId||'',customer:x.customer||'',date:x.date||'',due:x.due||'',items:JSON.stringify(x.items||[]),discount:Number(x.discount)||0,total:Number(x.total)||0,paid:Number(x.paid)||0,pending:Number(x.pending)||0,terms:x.terms||'',shareAs:x.shareAs||'invoice',createdAt:x.createdAt||new Date().toISOString()}}));
    if(name==='quotations')return db.quotations.map(x=>({id:x.id,data:{quotationNo:x.no||'',customerId:x.customerId||'',customer:x.customer||'',date:x.date||'',items:JSON.stringify(x.items||[]),discount:Number(x.discount)||0,total:Number(x.total)||0,terms:x.terms||''}}));
    if(name==='history')return db.history.map((x,i)=>({id:x.id||('h_'+i+'_'+String(x.date||'').replace(/\W/g,'')),data:{type:x.type||'',waAction:x.waAction||'',detail:x.detail||'',customer:x.customer||'',amount:Number(x.amount)||0,date:x.date||'',invoiceId:x.invoiceId||''}}));
    return [];
  }
  function fromRow(name,r){
    const d=r||{};
    if(name==='customers')return {id:r.$id,name:d.name||'',wa:d.whatsapp||'',address:d.address||''};
    if(name==='products')return {id:r.$id,name:d.name||'',unit:d.unit||'PCS',rate:Number(d.rate)||0};
    if(name==='invoices')return {id:r.$id,no:d.invoiceNo||'',customerId:d.customerId||'',customer:d.customer||'',date:d.date||'',due:d.due||'',items:JSON.parse(d.items||'[]'),discount:Number(d.discount)||0,total:Number(d.total)||0,paid:Number(d.paid)||0,pending:Number(d.pending)||0,terms:d.terms||'',shareAs:d.shareAs||'invoice',createdAt:d.createdAt||''};
    if(name==='quotations')return {id:r.$id,no:d.quotationNo||'',customerId:d.customerId||'',customer:d.customer||'',date:d.date||'',items:JSON.parse(d.items||'[]'),discount:Number(d.discount)||0,total:Number(d.total)||0,terms:d.terms||''};
    if(name==='history')return {id:r.$id,type:d.type||'',waAction:d.waAction||'',detail:d.detail||'',customer:d.customer||'',amount:Number(d.amount)||0,date:d.date||'',invoiceId:d.invoiceId||''};
    return null;
  }
  async function listRows(name){const r=await tablesDB.listRows({databaseId:CFG.databaseId,tableId:tableMap[name]});return r.rows||[]}
  async function pushLocal(){
    if(!cloudReady||syncBusy)return; syncBusy=true;
    try{
      for(const name of TABLE_NAMES){
        for(const x of rowsFor(name)) await tablesDB.upsertRow({databaseId:CFG.databaseId,tableId:tableMap[name],rowId:x.id,data:x.data});
      }
      status('Synced');
    }catch(e){console.error('Cloud push failed',e);status('Sync failed');}
    finally{syncBusy=false}
  }
  async function mergeFromCloud(){
    let anyCloud=false;
    for(const name of TABLE_NAMES){
      const rows=await listRows(name); if(rows.length)anyCloud=true;
      if(name==='settings'&&rows[0]){const d=rows[0];db.settings={...db.settings,name:d.companyName||db.settings.name,phone:d.phone||'',address:d.address||'',terms:d.terms||db.settings.terms,theme:d.theme||db.settings.theme,logo:db.settings.logo||'logo-master.png'};continue;}
      const incoming=rows.map(r=>fromRow(name,r)).filter(Boolean); if(!incoming.length)continue;
      const key=name==='customers'?'customers':name;
      if(!Array.isArray(db[key]))db[key]=[];
      const map=new Map(db[key].map(x=>[x.id,x])); incoming.forEach(x=>map.set(x.id,x)); db[key]=Array.from(map.values());
    }
    if(anyCloud){localStorage.setItem(KEY,JSON.stringify(db));renderAll();}
  }
  window.cloudInit=init;
  window.cloudQueueSave=function(){if(!cloudReady)return;clearTimeout(syncTimer);syncTimer=setTimeout(pushLocal,500)};
  window.cloudSyncNow=async function(){if(!initSdk())return toast('Cloud SDK unavailable');const u=await currentUser();if(!u){cloudLoginPrompt();return}try{await refreshTables();cloudReady=true;await pushLocal();await mergeFromCloud();toast('Cloud sync complete')}catch(e){console.error(e);toast('Cloud sync failed')}};
  window.cloudLoginPrompt=async function(){
    if(!initSdk())return toast('Cloud SDK unavailable');
    const email=prompt('Appwrite Email'); if(!email)return;
    const password=prompt('Appwrite Password'); if(!password)return;
    try{await account.createEmailPasswordSession({email,password});cloudReady=false;await init();toast('Cloud login successful')}catch(e){console.error(e);toast(e?.message||'Login failed')}
  };
  window.cloudRegisterPrompt=async function(){
    if(!initSdk())return toast('Cloud SDK unavailable');
    const name=prompt('Your name (optional)')||''; const email=prompt('New account email'); if(!email)return; const password=prompt('New password (8+ characters)'); if(!password)return;
    try{await account.create({userId:Appwrite.ID.unique(),email,password,name});await account.createEmailPasswordSession({email,password});cloudReady=false;await init();toast('Account created and logged in')}catch(e){console.error(e);toast(e?.message||'Account creation failed')}
  };
  window.cloudLogout=async function(){if(!initSdk())return;try{await account.deleteSession({sessionId:'current'});cloudReady=false;status('Not logged in');toast('Logged out')}catch(e){toast(e?.message||'Logout failed')}};
})();
