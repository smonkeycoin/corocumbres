const {chromium}=require('playwright');
const fs=require('node:fs/promises');
const path=require('node:path');
const assert=require('node:assert/strict');
(async()=>{
 const baseURL='https://corocumbres.online';
 const out=path.join(__dirname,'production');await fs.mkdir(out,{recursive:true});
 const report={baseURL,runAt:new Date().toISOString(),checks:[],errors:[],oauthVerified:false,authorizedAdminVerified:false};
 const browser=await chromium.launch({headless:true});
 const context=await browser.newContext({baseURL,viewport:{width:1440,height:1000}});
 const page=await context.newPage();page.on('pageerror',e=>report.errors.push(e.message));
 const check=(name,ok,details)=>{report.checks.push({name,status:ok?'PASS':'FAIL',details});assert.ok(ok,name)};
 try{
  const response=await page.goto('/',{waitUntil:'networkidle'});check('Home pública HTTP200',response.status()===200);
  check('Exactamente cuatro misas',await page.locator('.v2-mass-card').count()===4);
  check('Hora nocturna no inventada',(await page.locator('.v2-mass-evening').innerText()).includes('pendiente'));
  await page.screenshot({path:path.join(out,'home-desktop.png'),fullPage:true});
  const scripts=await page.locator('script[src]').evaluateAll(nodes=>nodes.map(n=>n.src));
  for(const src of scripts){const r=await context.request.get(src);const body=await r.text();check('Bundle público sin semilla privada',!body.includes('desde-ahora-en-adelante')&&!body.includes('quiero-estar-senor-en-tu-presencia'));}
  for(const massId of ['ninos','dominical-12','dominical-1330','noche']){
   const r=await context.request.get('/api/public/masses/'+massId);const data=await r.json();check('API pública '+massId,r.status()===200&&!('songs' in data));
   if(data.playlist){check('Proyección pública '+massId,!JSON.stringify(data).includes('createdBy')&&!JSON.stringify(data).includes('source'));}
  }
  await page.goto('/misa/ninos',{waitUntil:'networkidle'});check('Playlist pública abre',await page.locator('h1').isVisible());
  report.publishedChildrenSongs=await page.locator('.v2-public-song-row').count();
  await page.screenshot({path:path.join(out,'playlist-publica.png'),fullPage:true});
  for(const route of ['/admin','/admin/repertorio','/admin/playlists','/presenter','/display']){await page.goto(route,{waitUntil:'networkidle'});check('Ruta privada protege '+route,new URL(page.url()).pathname==='/login');}
  const denied=await context.request.get('/api/admin/workspace');const deniedData=await denied.json();check('Repertorio anónimo denegado',[401,403,503].includes(denied.status())&&!('state' in deniedData));report.adminAPIStatus=denied.status();
  await page.goto('/login',{waitUntil:'networkidle'});
  report.googleConfigured=await page.getByRole('button',{name:'Iniciar sesión con Google'}).isEnabled();
  await page.screenshot({path:path.join(out,'login.png'),fullPage:true});
  await page.setViewportSize({width:390,height:844});await page.goto('/',{waitUntil:'networkidle'});
  check('Home móvil sin scroll horizontal',await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
  check('Primera misa visible en móvil',await page.locator('.v2-mass-card').first().evaluate(e=>e.getBoundingClientRect().bottom<=innerHeight));
  await page.screenshot({path:path.join(out,'home-mobile.png'),fullPage:true});
  check('Sin errores JavaScript',report.errors.length===0);
  report.status='PASS';
 }catch(e){report.status='FAIL';report.failure=e.message;process.exitCode=1;}
 finally{await browser.close();await fs.writeFile(path.join(out,'smoke.json'),JSON.stringify(report,null,2));console.log(JSON.stringify(report,null,2));}
})().catch(e=>{console.error(e.message);process.exitCode=1;});
