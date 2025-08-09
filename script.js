// script.js

// --- UTILITY ---
function generateRef() {
  const t = Date.now().toString().slice(-6);
  const r = Math.floor(Math.random()*9000)+1000;
  return 'WF-'+t+'-'+r;
}

function addHeirRow(name='', age='', rel='', note=''){
  const tbody = document.querySelector('#heirsTable tbody');
  const tr = document.createElement('tr');
  tr.innerHTML = `
    <td><input type="text" class="h-name" value="${name}"></td>
    <td><input type="text" class="h-age" value="${age}"></td>
    <td><input type="text" class="h-rel" value="${rel}"></td>
    <td><input type="text" class="h-note" value="${note}"></td>
    <td><button class="removeRow">X</button></td>
  `;
  tbody.appendChild(tr);
  tr.querySelector('.removeRow').addEventListener('click', ()=> tr.remove());
}

// --- INDEX (Customer) ---
if(document.getElementById('warishForm')){
  const form = document.getElementById('warishForm');
  const addBtn = document.getElementById('addHeirBtn');
  const pendingArea = document.getElementById('pendingArea');
  const refEl = document.getElementById('refCode');
  const msgArea = document.getElementById('msgToSend');
  const copyMsgBtn = document.getElementById('copyMsgBtn');
  const tgLink = document.getElementById('tgLink');

  // initial one heir
  addHeirRow();

  addBtn.addEventListener('click', ()=> addHeirRow());

  form.addEventListener('submit', function(e){
    e.preventDefault();

    // collect form
    const data = {};
    const fd = new FormData(form);
    for(const [k,v] of fd.entries()) data[k]=v.trim();

    // heirs
    data.heirs = [];
    document.querySelectorAll('#heirsTable tbody tr').forEach(tr=>{
      const name = tr.querySelector('.h-name').value.trim();
      const age = tr.querySelector('.h-age').value.trim();
      const rel = tr.querySelector('.h-rel').value.trim();
      const note = tr.querySelector('.h-note').value.trim();
      if(name) data.heirs.push({name,age,rel,note});
    });

    // create ref
    const ref = generateRef();
    data.ref = ref;

    // save to session (so customer can keep data if they stay on the page)
    sessionStorage.setItem('warish_'+ref, JSON.stringify(data));

    // show pending area
    form.style.display='none';
    pendingArea.style.display='block';
    refEl.textContent = ref;

    // prepare message
    let msg = ওয়ারিশন সনদ অনুরোধ\nরেফারেন্স: ${ref}\n\nমৃত ব্যক্তির নাম: ${data.deceasedName}\nপিতার নাম: ${data.fatherName}\nমহল্লা: ${data.mohalla}\nডাকঘর: ${data.postOffice}\nউপজেলা/জেলা: ${data.upazila}\nথানা: ${data.thana}\nওয়ার্ড: ${data.ward}\n\nওয়ারিশদের তালিকা:\n;
    data.heirs.forEach((h,i)=> {
      msg += ${i+1}. ${h.name} | বয়স: ${h.age} | সম্পর্ক: ${h.rel} ${h.note?('| '+h.note):''}\n;
    });
    msg += \nআমি ৪০০ টাকা পরিশোধ করেছি। অনুগ্রহ করে যাচাই করে আমাকে পিডিএফ দিন।;

    msgArea.value = msg;

    // Telegram share link (opens share dialog)
    // Replace YourTelegramID with your username or keep plain and instruct user.
    const yourTg = 'YourTelegramID'; // <<== REPLACE this with your telegram username (without @) before uploading
    const shareUrl = 'https://t.me/' + yourTg;
    // also prepare tg share link with text via t.me/share/url
    const shareWithText = 'https://t.me/share/url?url=&text=' + encodeURIComponent(msg);
    tgLink.href = shareWithText;
  });

  copyMsgBtn.addEventListener('click', ()=>{
    const t = document.getElementById('msgToSend');
    t.select();
    navigator.clipboard.writeText(t.value).then(()=> alert('Message copied. Open Telegram and paste.'));
  });
}

// --- ADMIN (generate PDF) ---
if(document.getElementById('generatePdfBtn')){
  async function generatePDFfromObject(data){
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF('p','pt','a4');
    const margin = 40;
    let y = 60;

    // try load logo from /logo.png (optional)
    function addLogoThenText(){
      return new Promise((res)=>{
        const img = new Image();
        img.src = './logo.png';
        img.onload = function(){
          // add logo
          doc.addImage(img, 'PNG', margin, 20, 80, 50);
          res();
        }
        img.onerror = function(){ res(); }
      });
    }

    await addLogoThenText();

    doc.setFontSize(16);
    doc.text(data.formName || 'ওয়ারিশন সনদ', 300, 60, {align:'center'});

    doc.setFontSize(11);
    y = 110;
    doc.text(ফর্ম রেফারেন্স: ${data.ref || ''}, margin, y); y+=18;
    doc.text(মৃত ব্যক্তির নাম: ${data.deceasedName||''}, margin, y); y+=16;
    doc.text(পিতার নাম: ${data.fatherName||''}, margin, y); y+=16;
    doc.text(মহল্লা: ${data.mohalla||''}, margin, y); y+=16;
    doc.text(ডাকঘর: ${data.postOffice||''}, margin, y); y+=16;
    doc.text(উপজেলা/জেলা: ${data.upazila||''}, margin, y); y+=16;
    doc.text(থানা: ${data.thana||''}, margin, y); y+=16;
    doc.text(ওয়ার্ড: ${data.ward||''}, margin, y); y+=26;

    doc.setFontSize(12);
    doc.text('ওয়ারিশদের তালিকা:', margin, y); y+=16;

    // table-like list
    data.heirs = data.heirs || [];
    data.heirs.forEach((h, idx)=> {
      doc.text(${idx+1}. ${h.name} — বয়স: ${h.age} — সম্পর্ক: ${h.rel} ${h.note?('- '+h.note):''}, margin+6, y);
      y+=14;
      if(y > 750){ doc.addPage(); y = 40; }
    });

    y+=30;
    doc.text('স্বাক্ষর: ________', margin, y);

    // save
    const fileName = (data.ref ? data.ref+'_warish.pdf' : 'warish.pdf');
    doc.save(fileName);
  }

  document.getElementById('generatePdfBtn').addEventListener('click', ()=>{
    // preference: if rawData has content, try to parse it; else use admin form fields
    const raw = document.getElementById('rawData').value.trim();
    let obj = {};
    if(raw){
      // Try simple parsing: look for lines we know
      // This is basic: we expect the message format generated by index.html
      const lines = raw.split('\n').map(s=>s.trim()).filter(Boolean);
      obj = {heirs:[]};
      lines.forEach(l=>{
        if(l.startsWith('রেফারেন্স:')) obj.ref = l.split(':').slice(1).join(':').trim();
        else if(l.startsWith('মৃত ব্যক্তির নাম:')) obj.deceasedName = l.split(':').slice(1).join(':').trim();
        else if(l.startsWith('পিতার নাম:')) obj.fatherName = l.split(':').slice(1).join(':').trim();
        else if(l.startsWith('মহল্লা:')) obj.mohalla = l.split(':').slice(1).join(':').trim();
        else if(l.startsWith('ডাকঘর:')) obj.postOffice = l.split(':').slice(1).join(':').trim();
        else if(l.startsWith('উপজেলা')||l.startsWith('উপজেলা/জেলা:')) obj.upazila = l.split(':').slice(1).join(':').trim();
        else if(l.startsWith('থানা:')) obj.thana = l.split(':').slice(1).join(':').trim();
        else if(l.match(/^\d+\./)) {
          // heir line like "1. NAME | বয়স: 45 | সম্পর্ক: পুত্র"
          const parts = l.replace(/^\d+\.\s*/,'').split('|').map(s=>s.trim());
          const h = {name:'', age:'', rel:'', note:''};
          parts.forEach(p=>{
            if(p.includes('বয়স')||p.includes('বয়স')) {
              h.age = p.split(':').slice(1).join(':').trim();
            } else if(p.includes('সম্পর্ক')) {
              h.rel = p.split(':').slice(1).join(':').trim();
            } else {
              if(!h.name) h.name = p;
              else h.note += (h.note? ' ':'')+p;
            }
          });
          if(h.name) obj.heirs.push(h);
        }
      });
    } else {
      // use admin form
      const f = document.getElementById('adminForm');
      const fd = new FormData(f);
      obj.formName = fd.get('formName');
      obj.formNumber = fd.get('formNumber');
      obj.deceasedName = fd.get('deceasedName');
      obj.fatherName = fd.get('fatherName');
      obj.mohalla = fd.get('mohalla');
      obj.postOffice = fd.get('postOffice');
      obj.upazila = fd.get('upazila');
      obj.thana = fd.get('thana');
      obj.ward = fd.get('ward');
      // heirs
      const heirsRaw = document.getElementById('heirsRaw').value.trim();
      if(heirsRaw){
        heirsRaw.split('\n').forEach(line=>{
          const parts = line.split('|').map(s=>s.trim());
          const h = {name: parts[0]||'', age: parts[1]||'', rel: parts[2]||'', note: parts[3]||''};
          if(h.name) obj.heirs.push(h);
        });
      }
    }

    // generate
    generatePDFfromObject(obj);
  });
}