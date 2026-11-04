const { chromium, webkit } = require('playwright');
const fs = require('node:fs/promises');
const path = require('node:path');
const baseURL = process.env.QA_BASE_URL || 'http://127.0.0.1:3100';
const screenshotDir = path.join(__dirname, 'screenshots');
const viewports = [
  {name:'iphone-small',width:320,height:568},
  {name:'iphone-modern',width:390,height:844},
  {name:'android',width:412,height:915},
  {name:'tablet',width:768,height:1024},
  {name:'desktop',width:1440,height:1000},
];
const report={baseURL,runAt:new Date().toISOString(),checks:[],pageErrors:[],consoleErrors:[]};
function check(name,passed,details={}){ report.checks.push({name,passed,...details}); }
(async()=>{
  await fs.mkdir(screenshotDir,{recursive:true});
  let connected=false;
  for(let i=0;i<40;i++){
    try { const response=await fetch(baseURL); if(response.ok){connected=true;break;} } catch {}
    await new Promise(resolve=>setTimeout(resolve,500));
  }
  if(!connected)throw new Error('QA server did not become available');
  for(const [engine,browserType] of [['chromium',chromium],['webkit',webkit]]){
    const browser=await browserType.launch({headless:true});
    try{
      for(const viewport of viewports){
        const context=await browser.newContext({viewport:{width:viewport.width,height:viewport.height},isMobile:viewport.width<600,hasTouch:viewport.width<900});
        const page=await context.newPage();
        page.on('pageerror',error=>report.pageErrors.push({engine,viewport:viewport.name,message:error.message}));
        page.on('console',message=>{if(message.type()==='error')report.consoleErrors.push({engine,viewport:viewport.name,message:message.text()});});
        const response=await page.goto(baseURL,{waitUntil:'networkidle'});
        // Hide the development-only Next.js launcher in evidence; app UI remains untouched.
        await page.addStyleTag({content:'nextjs-portal { display: none !important; }'});
        const cards=page.locator('.v2-mass-card');
        const massColors=await cards.evaluateAll(elements=>elements.map(e=>({tone:e.className,color:getComputedStyle(e).color})));
        check(`${engine}/${viewport.name}: mass contrast palette`,viewport.width<=600 ? massColors.slice(1).every(c=>c.color!=='rgb(255, 255, 255)') : massColors.slice(1).every(c=>c.color==='rgb(255, 255, 255)'),{colors:massColors});
        const measure=await page.evaluate(()=>({scrollWidth:document.documentElement.scrollWidth,innerWidth:window.innerWidth,firstCard:document.querySelector('.v2-mass-card').getBoundingClientRect().toJSON(),bodyText:document.body.innerText,hero:document.querySelector('.v2-hero').getBoundingClientRect().toJSON()}));
        check(`${engine}/${viewport.name}: home HTTP 200`,response.status()===200);
        check(`${engine}/${viewport.name}: exact four mass cards`,await cards.count()===4,{count:await cards.count()});
        check(`${engine}/${viewport.name}: no horizontal overflow`,measure.scrollWidth<=measure.innerWidth,{scrollWidth:measure.scrollWidth,viewportWidth:measure.innerWidth});
        check(`${engine}/${viewport.name}: first mass visible without scrolling`,measure.firstCard.bottom<=viewport.height,{cardBottom:measure.firstCard.bottom,viewportHeight:viewport.height,heroHeight:measure.hero.height});
        check(`${engine}/${viewport.name}: full cards are links`,await cards.evaluateAll(elements=>elements.every(e=>e.tagName==='A'&&e.getAttribute('href')?.startsWith('/misa/'))));
        check(`${engine}/${viewport.name}: night time not invented`,measure.bodyText.includes('Horario pendiente de confirmación.'));
        check(`${engine}/${viewport.name}: touch target height`,measure.firstCard.height>=44,{height:measure.firstCard.height});
        if(engine==='chromium'&&viewport.name==='desktop')await page.screenshot({path:path.join(screenshotDir,'home-desktop.png'),fullPage:true});
        if(engine==='chromium'&&viewport.name==='iphone-modern')await page.screenshot({path:path.join(screenshotDir,'home-mobile.png'),fullPage:true});
        if(engine==='webkit'&&viewport.name==='iphone-small')await page.screenshot({path:path.join(screenshotDir,'home-iphone-small-webkit.png'),fullPage:true});
        await cards.first().click();
        await page.waitForURL('**/misa/ninos');
        check(`${engine}/${viewport.name}: children card navigation`,page.url().endsWith('/misa/ninos'));
        check(`${engine}/${viewport.name}: playlist context`,await page.getByRole('heading',{level:1,name:'Misa de Niños'}).count()===1);
        const playlistMeasure=await page.evaluate(()=>({scrollWidth:document.documentElement.scrollWidth,innerWidth:window.innerWidth,songs:document.querySelectorAll('.v2-public-song-row').length,empty:document.body.innerText.includes('Estamos preparando las canciones')}));
        check(`${engine}/${viewport.name}: playlist no horizontal overflow`,playlistMeasure.scrollWidth<=playlistMeasure.innerWidth,playlistMeasure);
        if(engine==='chromium'&&viewport.name==='iphone-modern')await page.screenshot({path:path.join(screenshotDir,'playlist-public.png'),fullPage:true});
        if(!playlistMeasure.songs)report.readingScenario={status:'BLOCKED',reason:'No published songs exist for Misa de Niños; playlist honestly displays pending publication.'};
        await page.getByRole('link',{name:'Todas las misas'}).click();
        await page.waitForURL(baseURL+'/');
        check(`${engine}/${viewport.name}: return to portal`,page.url()===baseURL+'/');
        await page.goto(baseURL+'/login',{waitUntil:'networkidle'});
        await page.addStyleTag({content:'nextjs-portal { display: none !important; }'});
        const loginMeasure=await page.evaluate(()=>({scrollWidth:document.documentElement.scrollWidth,innerWidth:window.innerWidth,text:document.body.innerText}));
        check(`${engine}/${viewport.name}: login no horizontal overflow`,loginMeasure.scrollWidth<=loginMeasure.innerWidth,{scrollWidth:loginMeasure.scrollWidth,viewportWidth:loginMeasure.innerWidth});
        const google=page.getByRole('button',{name:'Iniciar sesión con Google'});
        const disabled=await google.isDisabled();
        check(`${engine}/${viewport.name}: Google unavailable state explicit`,!disabled||loginMeasure.text.includes('El acceso administrativo se está preparando.'),{googleDisabled:disabled});
        check(`${engine}/${viewport.name}: no environment details on login`,!/(AUTH_GOOGLE|AUTH_SECRET|CORO_ADMIN_EMAILS|NEXTAUTH_|CLIENT_SECRET)/.test(loginMeasure.text));
        if(engine==='chromium'&&viewport.name==='desktop')await page.screenshot({path:path.join(screenshotDir,'login.png'),fullPage:true});
        if(engine==='chromium'&&viewport.name==='iphone-modern')await page.screenshot({path:path.join(screenshotDir,'login-mobile.png'),fullPage:true});
        await context.close();
      }
      const page=await browser.newPage();
      await page.goto(baseURL+'/login?error=AccessDenied',{waitUntil:'networkidle'});
      check(`${engine}: account denied message`,(await page.locator('.v2-login-error').innerText()).includes('Esta cuenta no tiene acceso administrativo.'));
      const imageResponse=await page.request.get(baseURL+'/images/liturgia.jpg');
      check(`${engine}: liturgical photograph available`,imageResponse.ok()&&imageResponse.headers()['content-type']?.startsWith('image/'),{status:imageResponse.status(),contentType:imageResponse.headers()['content-type']});
      await page.close();
    }finally{await browser.close();}
  }
  report.summary={passed:report.checks.filter(c=>c.passed).length,failed:report.checks.filter(c=>!c.passed).length};
  await fs.writeFile(path.join(__dirname,'public-browser.json'),JSON.stringify(report,null,2));
  console.log(JSON.stringify({summary:report.summary,failures:report.checks.filter(c=>!c.passed),pageErrors:report.pageErrors,consoleErrors:report.consoleErrors,readingScenario:report.readingScenario},null,2));
  if(report.summary.failed||report.pageErrors.length)process.exitCode=1;
})().catch(async error=>{report.error=error.message;await fs.writeFile(path.join(__dirname,'public-browser.json'),JSON.stringify(report,null,2));console.error(error);process.exitCode=1;});
