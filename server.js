
async function allowedBusinessesForEmail(email){
 email=normalizeEmail(email);
 if(!email)return 1;
 let e=await get('SELECT * FROM google_play_entitlements WHERE email=?',[email]);
 if(e&&e.google_play_active&&Number(e.allowed_businesses)>1)return Number(e.allowed_businesses);
 return 1;
}
async function ownerBusinessCountByEmail(email){
 email=normalizeEmail(email);
 let row=await get('SELECT COUNT(*) total FROM users WHERE email=? AND role=?',[email,'owner']);
 return row?Number(row.total||0):0;
}


require('dotenv').config();
const path=require('path'),crypto=require('crypto'),express=require('express'),cors=require('cors'),helmet=require('helmet'),rateLimit=require('express-rate-limit'),sqlite3=require('sqlite3').verbose(),bcrypt=require('bcryptjs'),jwt=require('jsonwebtoken'),QRCode=require('qrcode'),nodemailer=require('nodemailer');
const fs=require('fs');
const app=express(),PORT=process.env.PORT||3000,JWT_SECRET=process.env.JWT_SECRET||'secret',PLATFORM_NAME=process.env.PLATFORM_NAME||'Termini Pro Platforma';

function ensureWritableDir(dir){
 if(!dir)return '';
 try{
  fs.mkdirSync(dir,{recursive:true});
  fs.accessSync(dir,fs.constants.W_OK);
  return dir;
 }catch(e){
  console.warn('Data folder is not writable, trying fallback:',dir,e.code||e.message);
  return '';
 }
}

let DB_PATH=process.env.DB_PATH||'';
let DATA_DIR='';
if(DB_PATH){
 const dbDir=path.dirname(DB_PATH);
 if(ensureWritableDir(dbDir))DATA_DIR=dbDir;
 else DB_PATH='';
}
if(!DB_PATH){
 DATA_DIR=
  ensureWritableDir(process.env.DATA_DIR) ||
  ensureWritableDir(process.env.RENDER_DISK_PATH) ||
  ensureWritableDir(path.join(__dirname,'data')) ||
  ensureWritableDir('/tmp/termini-pro-data');
 DB_PATH=path.join(DATA_DIR,'termini-platforma-pro.db');
}
console.log('Using database:',DB_PATH);

app.set('trust proxy',1);app.use(helmet({contentSecurityPolicy:false}));app.use(cors());app.use(express.json({limit:'500kb'}));app.use(express.static(path.join(__dirname,'public')));
app.use('/api/',rateLimit({windowMs:15*60*1000,limit:900,standardHeaders:true,legacyHeaders:false}));
const db=new sqlite3.Database(DB_PATH);
const PLANS={basic:{name:'Basic',price:29,max_staff:1,max_month:100,sms:false},standard:{name:'Standard',price:49,max_staff:5,max_month:1000,sms:false},premium:{name:'Premium',price:99,max_staff:30,max_month:10000,sms:true}};
const run=(s,p=[])=>new Promise((res,rej)=>db.run(s,p,function(e){e?rej(e):res(this)}));
async function addColumnIfMissing(table,column,definition){try{await run(`ALTER TABLE ${table} ADD COLUMN ${column} ${definition}`)}catch(e){if(!String(e.message||'').toLowerCase().includes('duplicate column'))throw e}}
const get=(s,p=[])=>new Promise((res,rej)=>db.get(s,p,(e,r)=>e?rej(e):res(r)));
const all=(s,p=[])=>new Promise((res,rej)=>db.all(s,p,(e,r)=>e?rej(e):res(r)));
const clean=(v,n=255)=>String(v||'').trim().slice(0,n),email=v=>clean(v,255).toLowerCase(),normalizeEmail=email,phone=v=>String(v||'').split(/[\n,;]+/).map(x=>x.trim().replace(/[^0-9+()\-\s\/]/g,'').replace(/\s+/g,' ')).filter(Boolean).filter((x,i,a)=>a.indexOf(x)===i).slice(0,10).join('\n'),now=()=>new Date().toISOString(),token=()=>crypto.randomBytes(24).toString('hex');
function today(){let d=new Date();return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`}
function addDays(ds,n){let d=new Date(`${ds}T12:00:00`);d.setDate(d.getDate()+n);return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`}
const validDate=d=>/^\d{4}-\d{2}-\d{2}$/.test(String(d||'')),validTime=t=>/^\d{2}:\d{2}$/.test(String(t||'')),tm=t=>{let [h,m]=t.split(':').map(Number);return h*60+m},mt=m=>`${String(Math.floor(m/60)).padStart(2,'0')}:${String(m%60).padStart(2,'0')}`,dow=d=>new Date(`${d}T12:00:00`).getDay(),over=(a,b,c,d)=>a<d&&c<b;
const phone4=v=>String(v||'').split(/[\n,;|/]+/).map(x=>x.trim().replace(/[^0-9+()\-\s/]/g,'').replace(/\s+/g,' ')).filter(Boolean).filter((x,i,a)=>a.indexOf(x)===i).slice(0,4).join('\n');
function slugify(t){const map={'š':'s','đ':'dj','č':'c','ć':'c','ž':'z','Š':'s','Đ':'dj','Č':'c','Ć':'c','Ž':'z'};return String(t||'firma').replace(/[šđčćžŠĐČĆŽ]/g,c=>map[c]||c).toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-+|-+$/g,'').slice(0,60)||'firma'}
async function uniqueSlug(n){let b=slugify(n),s=b,i=2;while(await get('SELECT id FROM businesses WHERE slug=?',[s]))s=`${b}-${i++}`;return s}
const abs=(req,p)=>`${req.protocol}://${req.get('host')}${p}`,bookUrl=(req,s)=>abs(req,`/b/${s}`),bookUrlLoc=(req,s,lid)=>abs(req,`/b/${s}${lid?`?loc=${lid}`:''}`),manageUrl=(req,t)=>abs(req,`/m/${t}`);
function pubLoc(l,b,req){return {id:l.id,business_id:l.business_id,name:l.name||'Lokacija',city:l.city||'',address:l.address||'',phone:l.phone||'',email:l.email||'',active:l.active,sort_order:l.sort_order||0,booking_url:b&&req?bookUrlLoc(req,b.slug,l.id):''}}
async function ensureDefaultLocation(bid){
 let cnt=await get('SELECT COUNT(*) total FROM business_locations WHERE business_id=?',[bid]);
 if(cnt&&Number(cnt.total)>0)return;
 let b=await get('SELECT * FROM businesses WHERE id=?',[bid]);
 if(!b)return;
 let own=await get("SELECT email FROM users WHERE business_id=? AND role='owner' LIMIT 1",[bid])||{};
 await run('INSERT INTO business_locations(business_id,name,city,address,phone,email,active,sort_order,created_at,updated_at) VALUES(?,?,?,?,?, ?,1,1,?,?)',[bid,'Lokacija 1',b.city||'',b.address||'',phone4(b.phone||''),own.email||'',now(),now()]);
}
function pubBiz(b){return {id:b.id,name:b.name,slug:b.slug,type:b.type||'',city:b.city||'',phone:b.phone||'',instagram:b.instagram||'',address:b.address||'',website:b.website||'',logo_url:b.logo_url||'',cover_url:b.cover_url||'',description:b.description||'',active:b.active,subscription_plan:b.subscription_plan||'basic',subscription_status:b.subscription_status||'trial',subscription_expires_at:b.subscription_expires_at||''}}
function sign(u){return jwt.sign({id:u.id,business_id:u.business_id,name:u.name,email:u.email,role:u.role},JWT_SECRET,{expiresIn:'12h'})}
function auth(req,res,next){let h=req.headers.authorization||'',t=h.startsWith('Bearer ')?h.slice(7):'';if(!t)return res.status(401).json({error:'Moraš biti prijavljen.'});try{req.user=jwt.verify(t,JWT_SECRET);next()}catch{return res.status(401).json({error:'Sesija je istekla.'})}}
const owner=(req,res,next)=>req.user&&req.user.role==='owner'&&req.user.business_id?next():res.status(403).json({error:'Nemaš dozvolu.'});
const superadmin=(req,res,next)=>req.user&&req.user.role==='superadmin'?next():res.status(403).json({error:'Nemaš dozvolu.'});
async function init(){await run('PRAGMA foreign_keys=ON');
 await run(`CREATE TABLE IF NOT EXISTS businesses(id INTEGER PRIMARY KEY AUTOINCREMENT,name TEXT,slug TEXT UNIQUE,type TEXT,city TEXT,phone TEXT,instagram TEXT,address TEXT,website TEXT,logo_url TEXT,cover_url TEXT,description TEXT,active INTEGER DEFAULT 1,subscription_plan TEXT DEFAULT 'basic',subscription_status TEXT DEFAULT 'trial',subscription_expires_at TEXT,google_play_product_id TEXT,google_play_purchase_token TEXT,google_play_order_id TEXT,google_play_state TEXT,google_play_last_check TEXT,created_at TEXT,updated_at TEXT)`);
 await run(`CREATE TABLE IF NOT EXISTS business_locations(id INTEGER PRIMARY KEY AUTOINCREMENT,business_id INTEGER,name TEXT,city TEXT,address TEXT,phone TEXT,email TEXT,active INTEGER DEFAULT 1,sort_order INTEGER DEFAULT 0,created_at TEXT,updated_at TEXT)`);
 await run(`CREATE TABLE IF NOT EXISTS users(id INTEGER PRIMARY KEY AUTOINCREMENT,business_id INTEGER,name TEXT,email TEXT UNIQUE,password_hash TEXT,role TEXT,created_at TEXT)`);
 await run(`CREATE TABLE IF NOT EXISTS settings(business_id INTEGER PRIMARY KEY,interval INTEGER DEFAULT 15,min_notice INTEGER DEFAULT 2,max_days INTEGER DEFAULT 45,notify_customer_email INTEGER DEFAULT 1,notify_owner_email INTEGER DEFAULT 1,notify_sms INTEGER DEFAULT 0,notify_viber INTEGER DEFAULT 0,msg_booking TEXT DEFAULT 'Hvala, vaš termin je uspešno zakazan.',msg_cancel TEXT DEFAULT 'Vaš termin je otkazan.',customer_note TEXT DEFAULT 'Molimo vas da dođete 5 minuta ranije.',updated_at TEXT)`);
 await run(`CREATE TABLE IF NOT EXISTS staff(id INTEGER PRIMARY KEY AUTOINCREMENT,business_id INTEGER,name TEXT,title TEXT,phone TEXT,email TEXT,active INTEGER DEFAULT 1,sort_order INTEGER DEFAULT 0,created_at TEXT,updated_at TEXT)`);
 await run(`CREATE TABLE IF NOT EXISTS services(id INTEGER PRIMARY KEY AUTOINCREMENT,business_id INTEGER,name TEXT,description TEXT,duration INTEGER,price INTEGER DEFAULT 0,active INTEGER DEFAULT 1,sort_order INTEGER DEFAULT 0,created_at TEXT,updated_at TEXT)`);
 await run(`CREATE TABLE IF NOT EXISTS hours(business_id INTEGER,day INTEGER,is_open INTEGER,open_time TEXT,close_time TEXT,break_start TEXT,break_end TEXT,PRIMARY KEY(business_id,day))`);
 await run(`CREATE TABLE IF NOT EXISTS location_hours(business_id INTEGER,location_id INTEGER,day INTEGER,is_open INTEGER,open_time TEXT,close_time TEXT,break_start TEXT,break_end TEXT,updated_at TEXT,PRIMARY KEY(business_id,location_id,day))`);
 await run(`CREATE TABLE IF NOT EXISTS blocked(business_id INTEGER,date TEXT,reason TEXT,created_at TEXT,PRIMARY KEY(business_id,date))`);
 await run(`CREATE TABLE IF NOT EXISTS blocked_periods(id INTEGER PRIMARY KEY AUTOINCREMENT,business_id INTEGER,date TEXT,start_time TEXT DEFAULT '',end_time TEXT DEFAULT '',reason TEXT DEFAULT '',created_at TEXT)`);
 await run(`CREATE TABLE IF NOT EXISTS appointments(id INTEGER PRIMARY KEY AUTOINCREMENT,business_id INTEGER,service_id INTEGER,staff_id INTEGER,appt_token TEXT UNIQUE,customer_name TEXT,phone TEXT,email TEXT,date TEXT,start_time TEXT,end_time TEXT,status TEXT DEFAULT 'booked',notes TEXT,created_at TEXT,updated_at TEXT)`);
 await run(`CREATE TABLE IF NOT EXISTS notifications(id INTEGER PRIMARY KEY AUTOINCREMENT,business_id INTEGER,appointment_id INTEGER,channel TEXT,recipient TEXT,subject TEXT,body TEXT,status TEXT,provider TEXT,error TEXT,created_at TEXT)`);
 await addColumnIfMissing('settings','msg_booking',`TEXT DEFAULT 'Hvala, vaš termin je uspešno zakazan.'`);
 await addColumnIfMissing('settings','msg_cancel',`TEXT DEFAULT 'Vaš termin je otkazan.'`);
 await addColumnIfMissing('settings','customer_note',`TEXT DEFAULT 'Molimo vas da dođete 5 minuta ranije.'`);
 await addColumnIfMissing('appointments','location_id',`INTEGER`);
 await addColumnIfMissing('blocked_periods','location_id',`INTEGER`);

 await run(`CREATE TABLE IF NOT EXISTS google_play_entitlements(
  email TEXT PRIMARY KEY,
  allowed_businesses INTEGER DEFAULT 1,
  google_play_active INTEGER DEFAULT 0,
  product_id TEXT DEFAULT '',
  purchase_token TEXT DEFAULT '',
  order_id TEXT DEFAULT '',
  updated_at TEXT
 )`);
await run('CREATE INDEX IF NOT EXISTS idx_biz_slug ON businesses(slug)');await run('CREATE INDEX IF NOT EXISTS idx_location_business ON business_locations(business_id,sort_order,id)');await run('CREATE INDEX IF NOT EXISTS idx_location_hours ON location_hours(business_id,location_id,day)');await run('CREATE INDEX IF NOT EXISTS idx_blocked_periods_scope ON blocked_periods(business_id,location_id,date)');await run('CREATE INDEX IF NOT EXISTS idx_appt_token ON appointments(appt_token)');
 let se=email(process.env.SUPERADMIN_EMAIL||'admin@platform.local');if(!await get('SELECT id FROM users WHERE email=?',[se])){let h=await bcrypt.hash(process.env.SUPERADMIN_PASSWORD||'platform123',12);await run("INSERT INTO users(business_id,name,email,password_hash,role,created_at) VALUES(NULL,'Super Admin',?,?,'superadmin',?)",[se,h,now()])}}
async function defaults(bid,ownerName){await run('INSERT INTO settings(business_id,updated_at) VALUES(?,?)',[bid,now()]);for(let r of [[0,0,'09:00','17:00'],[1,1,'09:00','17:00'],[2,1,'09:00','17:00'],[3,1,'09:00','17:00'],[4,1,'09:00','17:00'],[5,1,'09:00','17:00'],[6,1,'09:00','14:00']])await run('INSERT INTO hours(business_id,day,is_open,open_time,close_time,break_start,break_end) VALUES(?,?,?,?,?,?,?)',[bid,...r,'','']);await run("INSERT INTO staff(business_id,name,title,active,sort_order,created_at,updated_at) VALUES(?,?,'Majstor',1,1,?,?)",[bid,ownerName||'Glavni majstor',now(),now()]);await run("INSERT INTO services(business_id,name,description,duration,price,active,sort_order,created_at,updated_at) VALUES(?,'Osnovna usluga','Promeni naziv i cenu u panelu.',30,1000,1,1,?,?)",[bid,now(),now()])}

async function ensureLocationHours(bid,locationId){
 locationId=Number(locationId||0);
 if(!locationId)return[];
 let loc=await get('SELECT id FROM business_locations WHERE business_id=? AND id=?',[bid,locationId]);
 if(!loc)return[];
 let base=await all('SELECT * FROM hours WHERE business_id=? ORDER BY day',[bid]);
 for(let h of base){
  await run('INSERT OR IGNORE INTO location_hours(business_id,location_id,day,is_open,open_time,close_time,break_start,break_end,updated_at) VALUES(?,?,?,?,?,?,?,?,?)',[bid,locationId,Number(h.day),h.is_open?1:0,clean(h.open_time,10),clean(h.close_time,10),clean(h.break_start,10),clean(h.break_end,10),now()]);
 }
 return await all('SELECT * FROM location_hours WHERE business_id=? AND location_id=? ORDER BY day',[bid,locationId]);
}
async function upsertLocationHour(bid,locationId,r){
 locationId=Number(locationId||0);
 let dayNum=Number(r.day);
 let params=[r.is_open?1:0,clean(r.open_time,10),clean(r.close_time,10),clean(r.break_start,10),clean(r.break_end,10),now(),bid,locationId,dayNum];
 let u=await run('UPDATE location_hours SET is_open=?,open_time=?,close_time=?,break_start=?,break_end=?,updated_at=? WHERE business_id=? AND location_id=? AND day=?',params);
 if(!u.changes)await run('INSERT INTO location_hours(is_open,open_time,close_time,break_start,break_end,updated_at,business_id,location_id,day) VALUES(?,?,?,?,?,?,?,?,?)',params);
}

/* Owner No Registration Test v81 */
async function ensureTestOwner(){
 const testEmail=normalizeEmail(process.env.TEST_OWNER_EMAIL||'test@termini.local');
 const testName=clean(process.env.TEST_OWNER_NAME||'Test vlasnik',120);
 const businessName=clean(process.env.TEST_BUSINESS_NAME||'PREMIUM',160);

 let u=await get("SELECT * FROM users WHERE email=? AND role='owner'",[testEmail]);

 if(u&&u.business_id){
  let b=await get('SELECT * FROM businesses WHERE id=?',[u.business_id]);
  if(b)return {user:u,business:b};
 }

 let b=null;
 if(u&&u.business_id){
  b=await get('SELECT * FROM businesses WHERE id=?',[u.business_id]);
 }

 if(!b){
  let slug=await uniqueSlug(businessName);
  let r=await run(
   "INSERT INTO businesses(name,slug,type,city,phone,subscription_plan,subscription_status,subscription_expires_at,active,created_at,updated_at) VALUES(?,?,?,?,?,?,?,?,1,?,?)",
   [businessName,slug,'','','','basic','trial','2099-01-01',now(),now()]
  );
  await defaults(r.lastID,testName);
  b=await get('SELECT * FROM businesses WHERE id=?',[r.lastID]);

  if(u){
   await run('UPDATE users SET business_id=?,name=? WHERE id=?',[b.id,testName,u.id]);
   u=await get('SELECT * FROM users WHERE id=?',[u.id]);
   return {user:u,business:b};
  }
 }

 let h=await bcrypt.hash(crypto.randomBytes(18).toString('hex'),10);
 let created=await run(
  "INSERT INTO users(business_id,name,email,password_hash,role,created_at) VALUES(?,?,?,?,?,?)",
  [b.id,testName,testEmail,h,'owner',now()]
 );
 u=await get('SELECT * FROM users WHERE id=?',[created.lastID]);
 return {user:u,business:b};
}

async function bizPlanOk(bid){let b=await get('SELECT * FROM businesses WHERE id=?',[bid]);if(!b)return {ok:false,reason:'Firma nije pronađena.'};let st=b.subscription_status||'trial';if(!['trial','active','manual_active'].includes(st))return {ok:false,reason:'Pretplata nije aktivna.'};if(b.subscription_expires_at&&b.subscription_expires_at<today())return {ok:false,reason:'Pretplata je istekla.'};return {ok:true,plan:b.subscription_plan||'basic'}}
async function slots(bid,date,service,staffId=null,opts={}){
 if(!(await bizPlanOk(bid)).ok)return[];
 let s=await get('SELECT * FROM settings WHERE business_id=?',[bid]);
 let t=today(),max=addDays(t,Number(s.max_days||45));
 if(!validDate(date)||date<t||date>max)return[];

 if(await get('SELECT 1 FROM blocked WHERE business_id=? AND date=?',[bid,date]))return[];
 let locationId=Number(opts.locationId||0)||0;
 let blockedSql='SELECT * FROM blocked_periods WHERE business_id=? AND date=? AND (location_id IS NULL OR location_id=0';
 let blockedParams=[bid,date];
 if(locationId){blockedSql+=' OR location_id=?';blockedParams.push(locationId)}
 blockedSql+=') ORDER BY start_time,end_time';
 let blockedPeriods=await all(blockedSql,blockedParams);
 if(blockedPeriods.some(x=>!x.start_time||!x.end_time))return[];

 let h=null;
 if(locationId)h=await get('SELECT * FROM location_hours WHERE business_id=? AND location_id=? AND day=?',[bid,locationId,dow(date)]);
 if(!h)h=await get('SELECT * FROM hours WHERE business_id=? AND day=?',[bid,dow(date)]);
 if(!h||!h.is_open)return[];

 let staff=staffId?[await get('SELECT * FROM staff WHERE business_id=? AND id=? AND active=1',[bid,staffId])]:await all('SELECT * FROM staff WHERE business_id=? AND active=1 ORDER BY sort_order,id',[bid]);
 staff=staff.filter(Boolean);
 if(!staff.length)return[];

 let dur=Number(service.duration),int=Number(s.interval||15),open=tm(h.open_time),close=tm(h.close_time),bs=h.break_start?tm(h.break_start):null,be=h.break_end?tm(h.break_end):null;
 let minDate=opts.ignoreMinNotice?new Date():new Date(Date.now()+Number(s.min_notice||0)*3600000);
 let out=[],busy={};
 for(let st of staff)busy[st.id]=await all("SELECT start_time,end_time FROM appointments WHERE business_id=? AND date=? AND staff_id=? AND status='booked'",[bid,date,st.id]);

 for(let start=open;start+dur<=close;start+=int){
  let end=start+dur,stt=mt(start),ett=mt(end);
  if(new Date(`${date}T${stt}:00`)<minDate)continue;
  if(bs!==null&&be!==null&&over(start,end,bs,be))continue;
  if(blockedPeriods.some(x=>validTime(x.start_time)&&validTime(x.end_time)&&over(start,end,tm(x.start_time),tm(x.end_time))))continue;

  for(let p of staff){
   let c=busy[p.id].some(x=>over(start,end,tm(x.start_time),tm(x.end_time)));
   if(!c){out.push({start_time:stt,end_time:ett,staff_id:p.id,staff_name:p.name});break}
  }
 }
 return out
}
async function nextSlots(bid,from,service,staffId=null,opts={}){let out=[],st=validDate(from)?from:today();if(st<today())st=today();for(let i=0;i<45&&out.length<5;i++){let d=addDays(st,i);for(let sl of await slots(bid,d,service,staffId,opts)){out.push({date:d,...sl});if(out.length>=5)break}}return out}
async function logN(o){await run('INSERT INTO notifications(business_id,appointment_id,channel,recipient,subject,body,status,provider,error,created_at) VALUES(?,?,?,?,?,?,?,?,?,?)',[o.business_id,o.appointment_id||null,o.channel,o.recipient||'',o.subject||'',o.body||'',o.status||'logged',o.provider||'demo',o.error||'',now()])}
async function sendEmail(o){if(!(process.env.SMTP_HOST&&process.env.SMTP_USER&&process.env.SMTP_PASS))return logN({...o,channel:'email',status:'logged',provider:'smtp-not-configured'});try{let tr=nodemailer.createTransport({host:process.env.SMTP_HOST,port:Number(process.env.SMTP_PORT||587),secure:String(process.env.SMTP_SECURE)==='true',auth:{user:process.env.SMTP_USER,pass:process.env.SMTP_PASS}});await tr.sendMail({from:process.env.SMTP_FROM||'no-reply@termini.local',to:o.recipient,subject:o.subject,text:o.body});await logN({...o,channel:'email',status:'sent',provider:'smtp'})}catch(e){await logN({...o,channel:'email',status:'failed',provider:'smtp',error:e.message})}}
async function notify(req,a,ctx){
 let s=await get('SELECT * FROM settings WHERE business_id=?',[a.business_id])||{};
 let own=await get("SELECT email FROM users WHERE business_id=? AND role='owner' LIMIT 1",[a.business_id]);
 let m=manageUrl(req,a.appt_token);
 let intro=s.msg_booking||'Hvala, vaš termin je uspešno zakazan.';
 let note=s.customer_note?`\nNapomena: ${s.customer_note}`:'';
 let body=`${intro}\nFirma: ${ctx.biz.name}\nUsluga: ${ctx.service.name}\nRadnik: ${ctx.staff.name}\nDatum: ${a.date}\nVreme: ${a.start_time}${note}\nPromena/otkazivanje: ${m}`;
 let obody=`Novi termin: ${a.customer_name}, ${a.phone}, ${a.date} ${a.start_time}, ${ctx.service.name}, ${ctx.staff.name}`;
 if(s.notify_customer_email&&a.email)await sendEmail({business_id:a.business_id,appointment_id:a.id,recipient:a.email,subject:'Potvrda termina',body});
 if(s.notify_owner_email&&own)await sendEmail({business_id:a.business_id,appointment_id:a.id,recipient:own.email,subject:'Novi termin',body:obody});
 if(s.notify_sms)await logN({business_id:a.business_id,appointment_id:a.id,channel:'sms',recipient:a.phone,subject:'SMS termin',body,status:'logged',provider:process.env.SMS_PROVIDER||'demo'});
 if(s.notify_viber)await logN({business_id:a.business_id,appointment_id:a.id,channel:'viber',recipient:a.phone,subject:'Viber termin',body,status:'logged',provider:process.env.VIBER_PROVIDER||'demo'})
}
app.get('/b/:slug',(req,res)=>res.sendFile(path.join(__dirname,'public','business.html')));app.get('/m/:tok',(req,res)=>res.sendFile(path.join(__dirname,'public','manage.html')));app.get('/api/health',(req,res)=>res.json({ok:true}));app.get('/api/platform',(req,res)=>res.json({name:PLATFORM_NAME,plans:PLANS}));
app.post('/api/auth/register-business',async(req,res)=>{
 res.status(403).json({error:'Registracija firme nije dostupna preko web sajta. Registracija se radi kroz Android aplikaciju preko Google Play-a.'});
});

app.get('/api/android/registration-info',(req,res)=>{
 res.json({
  message:'Registracija firme se radi kroz Android aplikaciju. Posle aktivacije isti nalog radi i na desktopu.',
  first_business:'Prva firma može biti besplatna kroz Android aplikaciju.',
  extra_business:'Dodatna firma zahteva Google Play otključavanje.',
  desktop:'Desktop/web služi za prijavu i korišćenje panela.'
 });
});

app.post('/api/android/register-business',async(req,res)=>{
 try{
  let email=normalizeEmail(req.body.email);
  let existing=await ownerBusinessCountByEmail(email),allowed=await allowedBusinessesForEmail(email);

  if(existing>=allowed){
   return res.status(403).json({error:'Već imate registrovanu firmu. Za dodatnu firmu aktivirajte kupovinu u Android aplikaciji preko Google Play-a, pa zatim pokušajte ponovo sa istim emailom.'});
  }

  let name=clean(req.body.business_name,160);
  if(!name||!email||!req.body.password){
   return res.status(400).json({error:'Unesite naziv firme, email i lozinku.'});
  }

  let slug=slugify(name),base=slug,i=2;
  while(await get('SELECT id FROM businesses WHERE slug=?',[slug]))slug=base+'-'+i++;

  let h=await bcrypt.hash(req.body.password,10);
  let r=await run(
   'INSERT INTO businesses(name,slug,type,city,phone,subscription_plan,subscription_status,subscription_expires_at,active,created_at,updated_at) VALUES(?,?,?,?,?,?,?,?,1,?,?)',
   [name,slug,clean(req.body.type,120),clean(req.body.city,120),phone(req.body.phone),'basic','trial','2099-01-01',now(),now()]
  );

  let u=await run(
   'INSERT INTO users(business_id,role,name,email,password_hash,created_at) VALUES(?,?,?,?,?,?)',
   [r.lastID,'owner',clean(req.body.owner_name,120)||name,email,h,now()]
  );

  await defaults(r.lastID, clean(req.body.owner_name,120)||name);
  res.status(201).json({
   token:sign({id:u.lastID,role:'owner',business_id:r.lastID,email}),
   business:{id:r.lastID,slug},
   message:'Firma je registrovana. Ovaj nalog sada možete koristiti i na desktopu.'
  });
 }catch(e){
  res.status(500).json({error:'Greška pri registraciji kroz Android aplikaciju.'});
 }
});

app.post('/api/google-play/confirm',async(req,res)=>{
 try{
  let email=normalizeEmail(req.body.email);
  let token=clean(req.body.purchase_token||req.body.purchaseToken,500);
  let product=clean(req.body.product_id||req.body.productId||'extra_business_1',120);
  let order=clean(req.body.order_id||req.body.orderId,160);
  if(!email||!token)return res.status(400).json({error:'Nedostaje email ili Google Play purchaseToken.'});

  // VAŽNO: ovo je priprema servera za Android aplikaciju.
  // U produkciji ovde Android app šalje purchaseToken, a server ga proverava preko Google Play Developer API-ja.
  // Dok nema Android aplikacije i service account verifikacije, automatsko otključavanje je blokirano.
  if(process.env.ALLOW_UNVERIFIED_GOOGLE_PLAY!=='true'){
   return res.status(402).json({error:'Google Play kupovina mora prvo da se verifikuje u Android aplikaciji. Server je spreman, ali automatsko otključavanje nije uključeno bez verifikacije.'});
  }

  await run(
   'INSERT OR REPLACE INTO google_play_entitlements(email,allowed_businesses,google_play_active,product_id,purchase_token,order_id,updated_at) VALUES(?,?,?,?,?,?,?)',
   [email,2,1,product,token,order,now()]
  );
  res.json({message:'Google Play kupovina je evidentirana. Možete registrovati dodatnu firmu sa istim emailom.',allowed_businesses:2});
 }catch(e){res.status(500).json({error:'Greška pri obradi Google Play kupovine.'})}
});

app.get('/api/google-play/status',async(req,res)=>{
 try{
  let email=normalizeEmail(req.query.email);
  if(!email)return res.status(400).json({error:'Nedostaje email.'});
  let allowed=await allowedBusinessesForEmail(email);
  let used=await ownerBusinessCountByEmail(email);
  res.json({email,allowed_businesses:allowed,used_businesses:used,can_create_more:used<allowed});
 }catch(e){res.status(500).json({error:'Greška pri proveri statusa.'})}
});


app.post('/api/auth/test-owner-login',async(req,res)=>{
 try{
  let data=await ensureTestOwner();
  let u=data.user;
  res.json({
   token:sign(u),
   user:{id:u.id,business_id:u.business_id,name:u.name,email:u.email,role:u.role},
   business:{...pubBiz(data.business),booking_url:bookUrl(req,data.business.slug)},
   message:'Test ulaz bez registracije je aktivan.'
  });
 }catch(e){
  console.error('test-owner-login error', e);
  res.status(500).json({error:'Greška pri test ulazu bez registracije: '+(e.message||'nepoznata greška')});
 }
});

app.post('/api/auth/login',async(req,res)=>{try{let u=await get('SELECT * FROM users WHERE email=?',[email(req.body.email)]);if(!u||!await bcrypt.compare(String(req.body.password||''),u.password_hash))return res.status(401).json({error:'Pogrešan email ili lozinka.'});res.json({token:sign(u),user:{id:u.id,business_id:u.business_id,name:u.name,email:u.email,role:u.role}})}catch{res.status(500).json({error:'Greška pri prijavi.'})}});
app.get('/api/auth/me',auth,async(req,res)=>{let b=req.user.business_id?await get('SELECT * FROM businesses WHERE id=?',[req.user.business_id]):null;res.json({user:req.user,business:b?{...pubBiz(b),booking_url:bookUrl(req,b.slug)}:null})});
app.get('/api/businesses',async(req,res)=>{let q=clean(req.query.q,100).toLowerCase(),city=clean(req.query.city,80).toLowerCase(),type=clean(req.query.type,80).toLowerCase(),p=[],w='WHERE active=1';if(q){w+=' AND (LOWER(name) LIKE ? OR LOWER(description) LIKE ? OR LOWER(city) LIKE ? OR LOWER(type) LIKE ?)';p.push(`%${q}%`,`%${q}%`,`%${q}%`,`%${q}%`)}if(city){w+=' AND LOWER(city) LIKE ?';p.push(`%${city}%`)}if(type){w+=' AND LOWER(type) LIKE ?';p.push(`%${type}%`)}let rows=await all(`SELECT * FROM businesses ${w} ORDER BY created_at DESC LIMIT 200`,p);res.json(rows.map(b=>({...pubBiz(b),booking_url:bookUrl(req,b.slug)})))});
// CUSTOMER_GALLERY_EXCLUDES_PROFILE_AND_COVER
app.get('/api/businesses/:slug',async(req,res)=>{
 let b=await get('SELECT * FROM businesses WHERE slug=? AND active=1',[clean(req.params.slug,100)]);
 if(!b)return res.status(404).json({error:'Firma nije pronađena.'});
 await ensureDefaultLocation(b.id);
 let locs=await all('SELECT * FROM business_locations WHERE business_id=? AND active=1 ORDER BY sort_order,id',[b.id]);
 let ok=await bizPlanOk(b.id);
 let pb=pubBiz(b);
 pb.logo_url='';
 pb.cover_url='';
 res.json({
  business:{...pb,booking_url:bookUrl(req,b.slug)},
  locations:locs.map(l=>pubLoc(l,b,req)),
  services:await all('SELECT * FROM services WHERE business_id=? AND active=1 ORDER BY sort_order,id',[b.id]),
  staff:await all('SELECT id,name,title,phone FROM staff WHERE business_id=? AND active=1 ORDER BY sort_order,id',[b.id]),
  settings:await get('SELECT * FROM settings WHERE business_id=?',[b.id]),
  booking_enabled:ok.ok,
  booking_disabled_reason:ok.reason||''
 });
});
app.get('/api/businesses/:slug/available-slots',async(req,res)=>{let b=await get('SELECT * FROM businesses WHERE slug=? AND active=1',[clean(req.params.slug,100)]);if(!b)return res.status(404).json({error:'Firma nije pronađena.'});let srv=await get('SELECT * FROM services WHERE business_id=? AND id=? AND active=1',[b.id,Number(req.query.service_id)]);if(!srv)return res.status(404).json({error:'Usluga nije dostupna.'});let locationId=Number(req.query.location_id||0)||null;if(locationId){let l=await get('SELECT id FROM business_locations WHERE business_id=? AND id=? AND active=1',[b.id,locationId]);if(!l)return res.status(400).json({error:'Lokacija nije pronađena.'});}res.json(await slots(b.id,clean(req.query.date,20),srv,req.query.staff_id?Number(req.query.staff_id):null,{locationId}))});
app.get('/api/businesses/:slug/next-available',async(req,res)=>{let b=await get('SELECT * FROM businesses WHERE slug=? AND active=1',[clean(req.params.slug,100)]);if(!b)return res.status(404).json({error:'Firma nije pronađena.'});let srv=await get('SELECT * FROM services WHERE business_id=? AND id=? AND active=1',[b.id,Number(req.query.service_id)]);if(!srv)return res.status(404).json({error:'Usluga nije dostupna.'});let locationId=Number(req.query.location_id||0)||null;if(locationId){let l=await get('SELECT id FROM business_locations WHERE business_id=? AND id=? AND active=1',[b.id,locationId]);if(!l)return res.status(400).json({error:'Lokacija nije pronađena.'});}let s=await nextSlots(b.id,clean(req.query.from_date||req.query.date,20),srv,req.query.staff_id?Number(req.query.staff_id):null,{locationId});res.json({suggestions:s,first_available:s[0]||null})});
app.post('/api/businesses/:slug/appointments',async(req,res)=>{try{
 let b=await get('SELECT * FROM businesses WHERE slug=? AND active=1',[clean(req.params.slug,100)]);
 if(!b)return res.status(404).json({error:'Firma nije pronađena.'});
 await ensureDefaultLocation(b.id);
 let ok=await bizPlanOk(b.id);if(!ok.ok)return res.status(403).json({error:ok.reason});
 let srv=await get('SELECT * FROM services WHERE business_id=? AND id=? AND active=1',[b.id,Number(req.body.service_id)]);
 if(!srv)return res.status(404).json({error:'Usluga nije dostupna.'});
 let locationId=Number(req.body.location_id||0)||null;
 let selectedLocation=null;
 if(locationId){selectedLocation=await get('SELECT * FROM business_locations WHERE business_id=? AND id=? AND active=1',[b.id,locationId]);if(!selectedLocation)return res.status(400).json({error:'Lokacija nije pronađena.'});}
 if(!selectedLocation){selectedLocation=await get('SELECT * FROM business_locations WHERE business_id=? AND active=1 ORDER BY sort_order,id LIMIT 1',[b.id]);locationId=selectedLocation?selectedLocation.id:null;}
 let ss=await slots(b.id,clean(req.body.date,20),srv,req.body.staff_id?Number(req.body.staff_id):null,{locationId}),sel=ss.find(x=>x.start_time===clean(req.body.start_time,10));
 if(!sel)return res.status(409).json({error:'Termin više nije slobodan.'});
 let st=await get('SELECT * FROM staff WHERE id=?',[sel.staff_id]),tok=token();
 let r=await run("INSERT INTO appointments(business_id,location_id,service_id,staff_id,appt_token,customer_name,phone,email,date,start_time,end_time,status,notes,created_at,updated_at) VALUES(?,?,?,?,?,?,?,?,?,?,?,'booked',?,?,?)",[b.id,locationId,srv.id,sel.staff_id,tok,clean(req.body.customer_name,120),phone(req.body.phone),email(req.body.email),clean(req.body.date,20),sel.start_time,sel.end_time,clean(req.body.notes,500),now(),now()]);
 let a={id:r.lastID,business_id:b.id,location_id:locationId,service_id:srv.id,staff_id:sel.staff_id,appt_token:tok,customer_name:clean(req.body.customer_name,120),phone:phone(req.body.phone),email:email(req.body.email),date:clean(req.body.date,20),start_time:sel.start_time,end_time:sel.end_time};
 await notify(req,a,{biz:b,service:srv,staff:st,location:selectedLocation});
 let set=await get('SELECT msg_booking,customer_note FROM settings WHERE business_id=?',[b.id])||{};
 res.status(201).json({message:set.msg_booking||'Termin je zakazan.',customer_note:set.customer_note||'',manage_url:manageUrl(req,tok),appointment:{...a,service_name:srv.name,staff_name:st.name,location_name:selectedLocation?selectedLocation.name:''}})
}catch(e){res.status(500).json({error:'Greška pri zakazivanju.'})}});
app.get('/api/manage/:tok',async(req,res)=>{let a=await get(`SELECT a.*,b.name business_name,b.slug business_slug,s.name service_name,s.duration,st.name staff_name FROM appointments a JOIN businesses b ON b.id=a.business_id JOIN services s ON s.id=a.service_id LEFT JOIN staff st ON st.id=a.staff_id WHERE a.appt_token=?`,[clean(req.params.tok,80)]);if(!a)return res.status(404).json({error:'Termin nije pronađen.'});res.json({appointment:a,booking_url:bookUrl(req,a.business_slug)})});
app.get('/api/manage/:tok/available-slots',async(req,res)=>{let a=await get('SELECT * FROM appointments WHERE appt_token=?',[clean(req.params.tok,80)]);if(!a)return res.status(404).json({error:'Termin nije pronađen.'});let srv=await get('SELECT * FROM services WHERE id=?',[a.service_id]);res.json(await slots(a.business_id,clean(req.query.date,20),srv,a.staff_id,{locationId:a.location_id}))});
app.patch('/api/manage/:tok/reschedule',async(req,res)=>{let a=await get('SELECT * FROM appointments WHERE appt_token=?',[clean(req.params.tok,80)]);if(!a||a.status!=='booked')return res.status(400).json({error:'Termin nije aktivan.'});let srv=await get('SELECT * FROM services WHERE id=?',[a.service_id]),ss=await slots(a.business_id,clean(req.body.date,20),srv,req.body.staff_id?Number(req.body.staff_id):a.staff_id,{locationId:a.location_id}),sel=ss.find(x=>x.start_time===clean(req.body.start_time,10));if(!sel)return res.status(409).json({error:'Termin nije slobodan.'});await run('UPDATE appointments SET date=?,start_time=?,end_time=?,staff_id=?,updated_at=? WHERE appt_token=?',[clean(req.body.date,20),sel.start_time,sel.end_time,sel.staff_id,now(),clean(req.params.tok,80)]);await logN({business_id:a.business_id,appointment_id:a.id,channel:'system',subject:'Promena termina',body:`Promenjeno na ${req.body.date} ${sel.start_time}`,status:'logged'});res.json({message:'Termin je promenjen.'})});
app.patch('/api/manage/:tok/cancel',async(req,res)=>{let a=await get('SELECT * FROM appointments WHERE appt_token=?',[clean(req.params.tok,80)]);if(!a||a.status!=='booked')return res.status(400).json({error:'Termin nije aktivan.'});await run("UPDATE appointments SET status='cancelled',notes=notes||?,updated_at=? WHERE appt_token=?",[`\nOtkazano: ${clean(req.body.reason,300)}`,now(),clean(req.params.tok,80)]);await logN({business_id:a.business_id,appointment_id:a.id,channel:'system',subject:'Otkazivanje termina',body:'Termin otkazan preko linka.',status:'logged'});let st=await get('SELECT msg_cancel FROM settings WHERE business_id=?',[a.business_id])||{};res.json({message:st.msg_cancel||'Termin je otkazan.'})});
app.get('/api/owner/dashboard',auth,owner,async(req,res)=>{let bid=req.user.business_id,b=await get('SELECT * FROM businesses WHERE id=?',[bid]);await ensureDefaultLocation(bid);let d=today(),w=addDays(d,7);let cards={today:(await get("SELECT COUNT(*) total FROM appointments WHERE business_id=? AND date=? AND status='booked'",[bid,d])).total,week:(await get("SELECT COUNT(*) total FROM appointments WHERE business_id=? AND date>=? AND date<=? AND status='booked'",[bid,d,w])).total,services:(await get('SELECT COUNT(*) total FROM services WHERE business_id=? AND active=1',[bid])).total,staff:(await get('SELECT COUNT(*) total FROM staff WHERE business_id=? AND active=1',[bid])).total};let upcoming=await all(`SELECT a.*,s.name service_name,st.name staff_name,bl.name location_name FROM appointments a JOIN services s ON s.id=a.service_id LEFT JOIN staff st ON st.id=a.staff_id LEFT JOIN business_locations bl ON bl.id=a.location_id WHERE a.business_id=? AND a.date>=? ORDER BY a.date,a.start_time LIMIT 10`,[bid,d]);res.json({business:{...pubBiz(b),booking_url:bookUrl(req,b.slug)},cards,upcoming})});
app.get('/api/owner/qr',auth,owner,async(req,res)=>{
 let b=await get('SELECT * FROM businesses WHERE id=?',[req.user.business_id]);
 await ensureDefaultLocation(req.user.business_id);
 let locationId=Number(req.query.location_id||0)||0;
 let url=bookUrl(req,b.slug);
 if(locationId){let l=await get('SELECT * FROM business_locations WHERE business_id=? AND id=? AND active=1',[req.user.business_id,locationId]);if(l)url=bookUrlLoc(req,b.slug,l.id)}
 res.type('image/svg+xml').send(await QRCode.toString(url,{type:'svg',margin:1,width:260}))
});

app.get('/api/owner/locations',auth,owner,async(req,res)=>{
 let b=await get('SELECT * FROM businesses WHERE id=?',[req.user.business_id]);
 await ensureDefaultLocation(req.user.business_id);
 let rows=await all('SELECT * FROM business_locations WHERE business_id=? ORDER BY sort_order,id',[req.user.business_id]);
 res.json(rows.map(l=>pubLoc(l,b,req)));
});
app.post('/api/owner/locations',auth,owner,async(req,res)=>{
 let sort=Number(req.body.sort_order||0)||0;
 if(!sort){let r=await get('SELECT COALESCE(MAX(sort_order),0)+1 n FROM business_locations WHERE business_id=?',[req.user.business_id]);sort=r.n||1;}
 let r=await run('INSERT INTO business_locations(business_id,name,city,address,phone,email,active,sort_order,created_at,updated_at) VALUES(?,?,?,?,?,?,?,?,?,?)',[req.user.business_id,clean(req.body.name,120)||'Lokacija',clean(req.body.city,80),clean(req.body.address,255),phone4(req.body.phone),email(req.body.email),req.body.active===false?0:1,sort,now(),now()]);
 await ensureLocationHours(req.user.business_id,r.lastID);
 res.status(201).json({id:r.lastID,message:'Lokacija je dodata.'});
});
app.put('/api/owner/locations/:id',auth,owner,async(req,res)=>{
 await run('UPDATE business_locations SET name=?,city=?,address=?,phone=?,email=?,active=?,sort_order=?,updated_at=? WHERE id=? AND business_id=?',[clean(req.body.name,120)||'Lokacija',clean(req.body.city,80),clean(req.body.address,255),phone4(req.body.phone),email(req.body.email),req.body.active===false?0:1,Number(req.body.sort_order||0),now(),Number(req.params.id),req.user.business_id]);
 res.json({message:'Lokacija je sačuvana.'});
});
app.delete('/api/owner/locations/:id',auth,owner,async(req,res)=>{
 let cnt=await get('SELECT COUNT(*) total FROM business_locations WHERE business_id=?',[req.user.business_id]);
 if(cnt&&Number(cnt.total)<=1)return res.status(400).json({error:'Mora ostati bar jedna lokacija.'});
 await run('DELETE FROM location_hours WHERE business_id=? AND location_id=?',[req.user.business_id,Number(req.params.id)]);
 await run('DELETE FROM blocked_periods WHERE business_id=? AND location_id=?',[req.user.business_id,Number(req.params.id)]);
 await run('DELETE FROM business_locations WHERE business_id=? AND id=?',[req.user.business_id,Number(req.params.id)]);
 res.json({message:'Lokacija je obrisana.'});
});

app.get('/api/owner/staff',auth,owner,async(req,res)=>res.json(await all('SELECT * FROM staff WHERE business_id=? ORDER BY sort_order,id',[req.user.business_id])));
app.post('/api/owner/staff',auth,owner,async(req,res)=>{let b=await get('SELECT * FROM businesses WHERE id=?',[req.user.business_id]);let r=await run('INSERT INTO staff(business_id,name,title,phone,email,active,sort_order,created_at,updated_at) VALUES(?,?,?,?,?,1,?,?,?)',[b.id,clean(req.body.name,120),clean(req.body.title,120),phone(req.body.phone),email(req.body.email),Number(req.body.sort_order||0),now(),now()]);res.status(201).json({id:r.lastID,message:'Radnik je dodat.'})});
app.put('/api/owner/staff/:id',auth,owner,async(req,res)=>{await run('UPDATE staff SET name=?,title=?,phone=?,email=?,active=?,sort_order=?,updated_at=? WHERE id=? AND business_id=?',[clean(req.body.name,120),clean(req.body.title,120),phone(req.body.phone),email(req.body.email),req.body.active?1:0,Number(req.body.sort_order||0),now(),Number(req.params.id),req.user.business_id]);res.json({message:'Radnik je sačuvan.'})});
app.get('/api/owner/services',auth,owner,async(req,res)=>res.json(await all('SELECT * FROM services WHERE business_id=? ORDER BY sort_order,id',[req.user.business_id])));
app.post('/api/owner/services',auth,owner,async(req,res)=>{let r=await run('INSERT INTO services(business_id,name,description,duration,price,active,sort_order,created_at,updated_at) VALUES(?,?,?,?,?,1,?,?,?)',[req.user.business_id,clean(req.body.name,120),clean(req.body.description,500),Number(req.body.duration||req.body.duration_minutes||30),Number(req.body.price||0),Number(req.body.sort_order||0),now(),now()]);res.status(201).json({id:r.lastID,message:'Usluga je dodata.'})});
app.put('/api/owner/services/:id',auth,owner,async(req,res)=>{await run('UPDATE services SET name=?,description=?,duration=?,price=?,active=?,sort_order=?,updated_at=? WHERE id=? AND business_id=?',[clean(req.body.name,120),clean(req.body.description,500),Number(req.body.duration||req.body.duration_minutes||30),Number(req.body.price||0),req.body.active?1:0,Number(req.body.sort_order||0),now(),Number(req.params.id),req.user.business_id]);res.json({message:'Usluga je sačuvana.'})});
app.get('/api/owner/appointments',auth,owner,async(req,res)=>{let p=[req.user.business_id,clean(req.query.from,20)||today(),clean(req.query.to,20)||addDays(today(),30)],w='WHERE a.business_id=? AND a.date>=? AND a.date<=?';if(req.query.status){w+=' AND a.status=?';p.push(clean(req.query.status,30))}if(req.query.staff_id){w+=' AND a.staff_id=?';p.push(Number(req.query.staff_id))}res.json(await all(`SELECT a.*,s.name service_name,s.price,st.name staff_name,bl.name location_name FROM appointments a JOIN services s ON s.id=a.service_id LEFT JOIN staff st ON st.id=a.staff_id LEFT JOIN business_locations bl ON bl.id=a.location_id ${w} ORDER BY a.date,a.start_time`,p))});
app.get('/api/owner/available-slots',auth,owner,async(req,res)=>{
 try{
  let srv=await get('SELECT * FROM services WHERE business_id=? AND id=? AND active=1',[req.user.business_id,Number(req.query.service_id)]);
  if(!srv)return res.status(404).json({error:'Usluga nije pronađena.'});
  let rows=await slots(req.user.business_id,clean(req.query.date,20),srv,req.query.staff_id?Number(req.query.staff_id):null,{ignoreMinNotice:true});
  res.json(rows);
 }catch(e){res.status(500).json({error:'Greška pri učitavanju slobodnih termina.'})}
});
app.post('/api/owner/appointments',auth,owner,async(req,res)=>{
 try{
  let srv=await get('SELECT * FROM services WHERE business_id=? AND id=? AND active=1',[req.user.business_id,Number(req.body.service_id)]);
  if(!srv)return res.status(404).json({error:'Usluga nije pronađena.'});
  let date=clean(req.body.date,20),start=clean(req.body.start_time,10);
  let rows=await slots(req.user.business_id,date,srv,req.body.staff_id?Number(req.body.staff_id):null,{ignoreMinNotice:true});
  let sel=rows.find(x=>x.start_time===start);
  if(!sel)return res.status(409).json({error:'Termin nije slobodan.'});
  let tok=token();
  let r=await run("INSERT INTO appointments(business_id,service_id,staff_id,appt_token,customer_name,phone,email,date,start_time,end_time,status,notes,created_at,updated_at) VALUES(?,?,?,?,?,?,?,?,?,?,'booked',?,?,?)",[
   req.user.business_id,srv.id,sel.staff_id,tok,clean(req.body.customer_name,120),phone(req.body.phone),email(req.body.email),date,sel.start_time,sel.end_time,clean(req.body.notes,500),now(),now()
  ]);
  await logN({business_id:req.user.business_id,appointment_id:r.lastID,channel:'system',subject:'Ručno dodat termin',body:`Vlasnik je dodao termin: ${clean(req.body.customer_name,120)} ${date} ${sel.start_time}`,status:'logged'});
  res.status(201).json({id:r.lastID,message:'Termin je dodat.'});
 }catch(e){res.status(500).json({error:'Greška pri dodavanju termina.'})}
});

app.patch('/api/owner/appointments/:id/status',auth,owner,async(req,res)=>{await run('UPDATE appointments SET status=?,updated_at=? WHERE id=? AND business_id=?',[clean(req.body.status,30),now(),Number(req.params.id),req.user.business_id]);res.json({message:'Status je promenjen.'})});

app.get('/api/owner/location-working-hours',auth,owner,async(req,res)=>{
 await ensureDefaultLocation(req.user.business_id);
 let locs=await all('SELECT * FROM business_locations WHERE business_id=? ORDER BY sort_order,id',[req.user.business_id]);
 let out=[];
 for(let l of locs){
  let hrs=await ensureLocationHours(req.user.business_id,l.id);
  out.push({...pubLoc(l,null,null),hours:hrs});
 }
 res.json(out);
});
app.get('/api/owner/location-working-hours/:id',auth,owner,async(req,res)=>{
 let loc=await get('SELECT * FROM business_locations WHERE business_id=? AND id=?',[req.user.business_id,Number(req.params.id)]);
 if(!loc)return res.status(404).json({error:'Lokacija nije pronađena.'});
 res.json({location:pubLoc(loc,null,null),hours:await ensureLocationHours(req.user.business_id,loc.id)});
});
app.put('/api/owner/location-working-hours/:id',auth,owner,async(req,res)=>{
 let loc=await get('SELECT * FROM business_locations WHERE business_id=? AND id=?',[req.user.business_id,Number(req.params.id)]);
 if(!loc)return res.status(404).json({error:'Lokacija nije pronađena.'});
 for(let r of req.body.rows||[])await upsertLocationHour(req.user.business_id,loc.id,r);
 res.json({message:'Radno vreme lokacije je sačuvano.'});
});
app.get('/api/owner/working-hours',auth,owner,async(req,res)=>res.json(await all('SELECT * FROM hours WHERE business_id=? ORDER BY day',[req.user.business_id])));
app.put('/api/owner/working-hours',auth,owner,async(req,res)=>{for(let r of req.body.rows||[])await run('UPDATE hours SET is_open=?,open_time=?,close_time=?,break_start=?,break_end=? WHERE business_id=? AND day=?',[r.is_open?1:0,clean(r.open_time,10),clean(r.close_time,10),clean(r.break_start,10),clean(r.break_end,10),req.user.business_id,Number(r.day)]);res.json({message:'Radno vreme je sačuvano.'})});
app.get('/api/owner/blocked-dates',auth,owner,async(req,res)=>{
 let locationId=Number(req.query.location_id||0)||0;
 if(locationId){
  let loc=await get('SELECT id FROM business_locations WHERE business_id=? AND id=?',[req.user.business_id,locationId]);
  if(!loc)return res.status(404).json({error:'Lokacija nije pronađena.'});
 }
 let legacy=(await all('SELECT date,reason,created_at FROM blocked WHERE business_id=? ORDER BY date',[req.user.business_id])).map(x=>({...x,key:'legacy:'+x.date,start_time:'',end_time:'',location_id:null,scope:'global'}));
 let periodsSql='SELECT id,location_id,date,start_time,end_time,reason,created_at FROM blocked_periods WHERE business_id=?';
 let params=[req.user.business_id];
 if(locationId){periodsSql+=' AND (location_id=? OR location_id IS NULL OR location_id=0)';params.push(locationId)}
 periodsSql+=' ORDER BY date,start_time,id';
 let periods=(await all(periodsSql,params)).map(x=>({...x,key:'period:'+x.id,scope:x.location_id?'location':'global'}));
 res.json([...legacy,...periods].sort((a,b)=>(a.date+(a.start_time||'')).localeCompare(b.date+(b.start_time||''))));
});
app.post('/api/owner/blocked-dates',auth,owner,async(req,res)=>{
 let date=clean(req.body.date,20),st=clean(req.body.start_time,10),en=clean(req.body.end_time,10),locationId=Number(req.body.location_id||0)||null;
 if(locationId){
  let loc=await get('SELECT id FROM business_locations WHERE business_id=? AND id=?',[req.user.business_id,locationId]);
  if(!loc)return res.status(404).json({error:'Lokacija nije pronađena.'});
 }
 if(!validDate(date))return res.status(400).json({error:'Izaberi datum.'});
 if((st||en)&&!(validTime(st)&&validTime(en)&&tm(st)<tm(en)))return res.status(400).json({error:'Za period unesi ispravno vreme od/do.'});
 await run('INSERT INTO blocked_periods(business_id,location_id,date,start_time,end_time,reason,created_at) VALUES(?,?,?,?,?,?,?)',[req.user.business_id,locationId,date,st,en,clean(req.body.reason,255),now()]);
 res.status(201).json({message:st&&en?'Period je blokiran.':'Dan je blokiran.'});
});
app.delete('/api/owner/blocked-dates/:key',auth,owner,async(req,res)=>{
 let key=decodeURIComponent(clean(req.params.key,80));
 if(key.startsWith('legacy:')){
  await run('DELETE FROM blocked WHERE business_id=? AND date=?',[req.user.business_id,key.slice(7)]);
 }else{
  if(key.startsWith('period:'))key=key.slice(7);
  await run('DELETE FROM blocked_periods WHERE business_id=? AND id=?',[req.user.business_id,Number(key)]);
 }
 res.json({message:'Neradno vreme je obrisano.'});
});
app.get('/api/owner/settings',auth,owner,async(req,res)=>{let b=await get('SELECT * FROM businesses WHERE id=?',[req.user.business_id]);res.json({business:{...pubBiz(b),booking_url:bookUrl(req,b.slug)},settings:await get('SELECT * FROM settings WHERE business_id=?',[req.user.business_id]),plans:PLANS})});
app.put('/api/owner/settings',auth,owner,async(req,res)=>{
 let st=await get('SELECT * FROM settings WHERE business_id=?',[req.user.business_id])||{};
 let bool=(key,def)=>req.body[key]===undefined?Number(def||0):(req.body[key]?1:0);
 await run('UPDATE businesses SET name=?,type=?,city=?,phone=?,instagram=?,address=?,website=?,logo_url=?,cover_url=?,description=?,updated_at=? WHERE id=?',[
  clean(req.body.name,120),
  clean(req.body.type,80),
  clean(req.body.city,80),
  phone(req.body.phone),
  clean(req.body.instagram,255),
  clean(req.body.address,255),
  clean(req.body.website,255),
  clean(req.body.logo_url,500),
  clean(req.body.cover_url,500),
  clean(req.body.description,1000),
  now(),
  req.user.business_id
 ]);
 await run('UPDATE settings SET interval=?,min_notice=?,max_days=?,notify_customer_email=?,notify_owner_email=?,notify_sms=?,notify_viber=?,msg_booking=?,msg_cancel=?,customer_note=?,updated_at=? WHERE business_id=?',[
  Number(req.body.interval||req.body.booking_interval_minutes||st.interval||15),
  Number(req.body.min_notice||req.body.min_notice_hours||st.min_notice||2),
  Number(req.body.max_days||req.body.max_booking_days||st.max_days||45),
  bool('notify_customer_email',st.notify_customer_email),
  bool('notify_owner_email',st.notify_owner_email),
  bool('notify_sms',st.notify_sms),
  bool('notify_viber',st.notify_viber),
  clean(req.body.msg_booking||st.msg_booking||'Hvala, vaš termin je uspešno zakazan.',1000),
  clean(req.body.msg_cancel||st.msg_cancel||'Vaš termin je otkazan.',1000),
  clean(req.body.customer_note||st.customer_note||'Molimo vas da dođete 5 minuta ranije.',1000),
  now(),
  req.user.business_id
 ]);
 res.json({message:'Profil firme je sačuvan.'})
});
app.get('/api/owner/notifications',auth,owner,async(req,res)=>res.json(await all('SELECT * FROM notifications WHERE business_id=? ORDER BY created_at DESC LIMIT 100',[req.user.business_id])));



app.get('/api/superadmin/businesses',auth,superadmin,async(req,res)=>{let rows=await all(`SELECT b.*,(SELECT COUNT(*) FROM appointments a WHERE a.business_id=b.id) appointments_count,(SELECT COUNT(*) FROM services s WHERE s.business_id=b.id) services_count,(SELECT COUNT(*) FROM staff st WHERE st.business_id=b.id) staff_count FROM businesses b ORDER BY b.created_at DESC LIMIT 500`);res.json(rows.map(b=>({...pubBiz(b),appointments_count:b.appointments_count,services_count:b.services_count,staff_count:b.staff_count,booking_url:bookUrl(req,b.slug),google_play_product_id:b.google_play_product_id||'',google_play_order_id:b.google_play_order_id||'',google_play_state:b.google_play_state||'',google_play_last_check:b.google_play_last_check||''})))});
app.patch('/api/superadmin/businesses/:id/active',auth,superadmin,async(req,res)=>{await run('UPDATE businesses SET active=?,updated_at=? WHERE id=?',[req.body.active?1:0,now(),Number(req.params.id)]);res.json({message:req.body.active?'Firma je aktivirana.':'Firma je deaktivirana.'})});
app.patch('/api/superadmin/businesses/:id/subscription',auth,superadmin,async(req,res)=>{await run('UPDATE businesses SET subscription_plan=?,subscription_status=?,subscription_expires_at=?,google_play_product_id=?,google_play_order_id=?,google_play_state=?,google_play_last_check=?,updated_at=? WHERE id=?',[clean(req.body.subscription_plan,30),clean(req.body.subscription_status,30),clean(req.body.subscription_expires_at,20),clean(req.body.google_play_product_id,120),clean(req.body.google_play_order_id,120),clean(req.body.google_play_state,120),now(),now(),Number(req.params.id)]);res.json({message:'Pretplata je sačuvana.'})});
app.post('/api/google-play/purchase-token',auth,owner,async(req,res)=>{await run("UPDATE businesses SET google_play_product_id=?,google_play_purchase_token=?,google_play_order_id=?,google_play_state='token_received_pending_verification',google_play_last_check=?,updated_at=? WHERE id=?",[clean(req.body.product_id,120),clean(req.body.purchase_token,500),clean(req.body.order_id,120),now(),now(),req.user.business_id]);res.json({message:'Google Play token je sačuvan. Sledeći korak je verifikacija preko Google Play Developer API-ja.'})});
app.post('/api/google-play/webhook',(req,res)=>{console.log('Google Play RTDN placeholder',JSON.stringify(req.body).slice(0,1000));res.json({ok:true,message:'RTDN primljen. U produkciji se ovde zove Google Play Developer API.'})});

app.post('/api/superadmin/google-play/entitlement',auth,superadmin,async(req,res)=>{
 try{
  let email=normalizeEmail(req.body.email);
  let allowed=Number(req.body.allowed_businesses||2);
  if(!email||allowed<1)return res.status(400).json({error:'Unesi email i broj dozvoljenih firmi.'});
  await run(
   'INSERT OR REPLACE INTO google_play_entitlements(email,allowed_businesses,google_play_active,product_id,purchase_token,order_id,updated_at) VALUES(?,?,?,?,?,?,?)',
   [email,allowed,1,clean(req.body.product_id||'manual_google_play',120),clean(req.body.purchase_token||'',500),clean(req.body.order_id||'',160),now()]
  );
  res.json({message:'Dozvola je upisana. Korisnik sada može dodati još firmi sa istim emailom.',email,allowed_businesses:allowed});
 }catch(e){res.status(500).json({error:'Greška pri upisu dozvole.'})}
});
init().then(()=>app.listen(PORT,()=>console.log(`Radi na http://localhost:${PORT}`))).catch(e=>{console.error(e);process.exit(1)});
