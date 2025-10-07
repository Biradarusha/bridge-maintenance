document.addEventListener('DOMContentLoaded', () => {
  document.body.addEventListener('click', async (ev) => {
    if (!ev.target || !ev.target.classList.contains('open-camera-btn')) return;

    const btn = ev.target;
    const inline = btn.closest('.inline-related') || btn.closest('tr');
    if (!inline) return alert("Inline row not found");

    const fileInput = inline.querySelector('input[type="file"][name$="image"]') 
                      || inline.querySelector('input[type="file"]');
    const latInput = inline.querySelector('input[name$="latitude"]');
    const lngInput = inline.querySelector('input[name$="longitude"]');
    const timestampInput = inline.querySelector('input[name$="timestamp"]');

    if (!fileInput) return alert("File input not found");

    // Remove old camera box
    inline.querySelectorAll('.camera-box').forEach(n => n.remove());

    // Camera container
    const cameraBox = document.createElement('div');
    cameraBox.className = 'camera-box';
    cameraBox.style.cssText = 'margin-top:8px;padding:8px;border:1px solid #ddd;background:#fff;display:inline-block;position:relative;';
    inline.appendChild(cameraBox);

    const video = document.createElement('video');
    video.autoplay = true;
    video.playsInline = true;
    video.style.width = '360px';
    video.style.height = '270px';
    video.style.background = '#000';
    cameraBox.appendChild(video);

    // Info overlay
    const infoDiv = document.createElement('div');
    infoDiv.style.cssText = 'position:absolute;top:8px;right:8px;background:rgba(255,255,255,0.85);padding:4px 6px;border-radius:5px;';
    cameraBox.appendChild(infoDiv);

    // Map preview
    const mapDiv = document.createElement('div');
    mapDiv.style.cssText = 'position:absolute;top:8px;left:8px;width:150px;height:150px;border:2px solid #fff;box-shadow:0 2px 6px rgba(0,0,0,0.3);';
    cameraBox.appendChild(mapDiv);

    // Buttons row
    const btnRow = document.createElement('div');
    btnRow.style.cssText = 'margin-top:8px;display:flex;gap:6px;';
    cameraBox.appendChild(btnRow);

    const captureBtn = document.createElement('button'); captureBtn.textContent='📸 Capture'; captureBtn.type='button';
    const retakeBtn = document.createElement('button'); retakeBtn.textContent='🔄 Retake'; retakeBtn.type='button'; retakeBtn.disabled=true;
    const uploadBtn = document.createElement('button'); uploadBtn.textContent='⬆️ Upload'; uploadBtn.type='button'; uploadBtn.disabled=true;
    const closeBtn = document.createElement('button'); closeBtn.textContent='❌ Close'; closeBtn.type='button';
    [captureBtn, retakeBtn, uploadBtn, closeBtn].forEach(b => btnRow.appendChild(b));

    const previewWrapper = document.createElement('div'); previewWrapper.style.marginTop='8px';
    cameraBox.appendChild(previewWrapper);

    // Variables
    let lat=null, lng=null, lastDataURL=null, stream=null, map=null, marker=null, watchId=null;

    function setInfo() {
      const ts = new Date().toLocaleString();
      infoDiv.textContent = `${ts}\n${lat && lng ? lat.toFixed(6)+','+lng.toFixed(6) : 'Location unavailable'}`;
    }

    // Start camera
    try {
      stream = await navigator.mediaDevices.getUserMedia({video:{facingMode:'environment'},audio:false});
      video.srcObject = stream;
      await video.play();
    } catch(e){ alert('Camera access failed: '+e.message); cameraBox.remove(); return; }

    // Initialize Leaflet map
    try {
      map = L.map(mapDiv, {zoomControl:false, attributionControl:false}).setView([0,0], 2);
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',{maxZoom:19}).addTo(map);
      marker = L.marker([0,0]).addTo(map);
    } catch(e){ console.warn('Leaflet init failed', e); }

    // Get location
    if(navigator.geolocation){
      try{
        const pos = await new Promise((res,rej)=>navigator.geolocation.getCurrentPosition(res,rej));
        lat = pos.coords.latitude; lng = pos.coords.longitude;
        if(map && marker){ marker.setLatLng([lat,lng]); map.setView([lat,lng],15); }
        setInfo();

        watchId = navigator.geolocation.watchPosition(p=>{
          lat = p.coords.latitude; lng = p.coords.longitude;
          if(map && marker){ marker.setLatLng([lat,lng]); map.setView([lat,lng],15); }
          setInfo();
        });
      } catch(e){ console.warn('Geolocation error', e); }
    }

    // Capture
    captureBtn.addEventListener('click', async ()=>{
      if(!video.videoWidth || !video.videoHeight) return alert('Video not ready');

      const canvas = document.createElement('canvas');
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const ctx = canvas.getContext('2d');

      // Draw video
      ctx.drawImage(video,0,0,canvas.width,canvas.height);

      // Draw map overlay snapshot
      try{
        const mapCanvas = await html2canvas(mapDiv,{useCORS:true});
        const scale = 0.3;
        ctx.drawImage(mapCanvas,10,10,mapCanvas.width*scale,mapCanvas.height*scale);
      } catch(e){ console.warn('Map overlay capture failed', e); }

      // Timestamp & coordinates
      const ts = new Date().toLocaleString();
      const infoText = lat && lng ? lat.toFixed(6)+','+lng.toFixed(6) : 'Location unavailable';
      ctx.fillStyle='rgba(255,255,255,0.8)';
      ctx.fillRect(canvas.width-220,10,210,50);
      ctx.fillStyle='#000'; ctx.font='18px Arial'; ctx.textAlign='left';
      ctx.fillText(ts,canvas.width-216,32);
      ctx.fillText(infoText,canvas.width-216,55);

      lastDataURL = canvas.toDataURL('image/png');

      previewWrapper.innerHTML='';
      const img = document.createElement('img'); img.src=lastDataURL; img.style.maxWidth='320px';
      previewWrapper.appendChild(img);

      retakeBtn.disabled=false; uploadBtn.disabled=false;
    });

    // Retake
    retakeBtn.addEventListener('click', async ()=>{
      previewWrapper.innerHTML=''; lastDataURL=null; retakeBtn.disabled=true; uploadBtn.disabled=true;
      if(stream) stream.getTracks().forEach(t=>t.stop());
      try{
        stream = await navigator.mediaDevices.getUserMedia({video:{facingMode:'environment'},audio:false});
        video.srcObject = stream; await video.play();
      } catch(e){ alert('Cannot restart camera: '+e.message);}
    });

    // Upload
    uploadBtn.addEventListener('click', ()=>{
      if(!lastDataURL) return alert('No captured image');
      fetch(lastDataURL).then(r=>r.blob()).then(blob=>{
        const file = new File([blob],'capture_'+Date.now()+'.png',{type:blob.type});
        const dt = new DataTransfer(); dt.items.add(file); fileInput.files = dt.files;
        if(latInput) latInput.value = lat!=null?lat.toFixed(6):'';
        if(lngInput) lngInput.value = lng!=null?lng.toFixed(6):'';
        if(timestampInput) timestampInput.value = (new Date()).toISOString();

        let existing=inline.querySelector('.inline-capture-preview'); if(existing) existing.remove();
        const perm=document.createElement('div'); perm.className='inline-capture-preview'; perm.style.marginTop='6px';
        const pimg=document.createElement('img'); pimg.src=lastDataURL; pimg.style.height='100px'; perm.appendChild(pimg);
        fileInput.parentElement.appendChild(perm);

        if(stream) stream.getTracks().forEach(t=>t.stop());
        if(watchId) navigator.geolocation.clearWatch(watchId);
        cameraBox.remove();
        alert('Image ready! Click Save in admin.');
      });
    });

    // Close
    closeBtn.addEventListener('click', ()=>{
      if(stream) stream.getTracks().forEach(t=>t.stop());
      if(watchId) navigator.geolocation.clearWatch(watchId);
      cameraBox.remove();
    });

  });
});
