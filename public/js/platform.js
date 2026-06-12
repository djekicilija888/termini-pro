const T='terminiOwnerToken';
const $=s=>document.querySelector(s);

async function api(u,o={}){
  const r=await fetch(u,o);
  const d=await r.json();
  if(!r.ok) throw Error(d.error||'Greška');
  return d;
}

function msg(el,t,c=''){
  if(!el) return;
  el.textContent=t;
  el.className='msg '+c;
}

async function loadName(){
  try{
    const data=await api('/api/platform');
    const el=$('#platformName');
    if(el) el.textContent=data.name;
  }catch{}
}

if(typeof registerForm!=='undefined'){
  registerForm.onsubmit=async e=>{
    e.preventDefault();
    try{
      msg(regMsg,'Registracija...');
      const d=await api('/api/auth/register-business',{
        method:'POST',
        headers:{'Content-Type':'application/json'},
        body:JSON.stringify({
          business_name:regName.value,
          type:regType.value,
          city:regCity.value,
          phone:regPhone.value,
          owner_name:regOwner.value,
          email:regEmail.value,
          password:regPass.value
        })
      });
      localStorage.setItem(T,d.token);
      msg(regMsg,'Firma napravljena. Otvaram panel.','ok');
      setTimeout(()=>location='/owner.html',700);
    }catch(er){
      msg(regMsg,er.message,'err');
    }
  };
}

if(typeof loginForm!=='undefined'){
  loginForm.onsubmit=async e=>{
    e.preventDefault();
    try{
      const d=await api('/api/auth/login',{
        method:'POST',
        headers:{'Content-Type':'application/json'},
        body:JSON.stringify({
          email:loginEmail.value,
          password:loginPass.value
        })
      });
      if(d.user.role!=='owner') throw Error('Ovo nije nalog firme.');
      localStorage.setItem(T,d.token);
      location='/owner.html';
    }catch(er){
      msg(loginMsg,er.message,'err');
    }
  };
}

loadName();
