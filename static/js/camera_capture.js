document.addEventListener('DOMContentLoaded', () => {
  document.body.addEventListener('click', async (ev) => {
    if (!ev.target.classList.contains('open-camera-btn')) return;

    const btn = ev.target;
    const inline = btn.closest('.inline-related') || btn.closest('tr');
    if (!inline) return alert("Inline row not found");

    const fileInput = inline.querySelector('input[type="file"][name$="image"]');
    const latInput = inline.querySelector('input[name$="latitude"]');
    const lngInput = inline.querySelector('input[name$="longitude"]');
    const timestampInput = inline.querySelector('input[name$="timestamp"]');
    const locationInput = inline.querySelector('input[name$="location_name"]');
    const titleInput = inline.querySelector('input[name$="caption"]');

    if (!fileInput) return alert("File input not found");

    // Store all captured files
    let capturedFiles = [];

    // Camera box
    const cameraBox = document.createElement('div');
    cameraBox.className = 'camera-box';
    cameraBox.style.cssText = 'margin-top:8px;padding:8px;border:1px solid #ddd;background:#fff;';
    inline.appendChild(cameraBox);

    // Video element
    const video = document.createElement('video');
    video.autoplay = true;
    video.playsInline = true;
    video.style.width = '360px';
    video.style.height = '270px';
    video.style.background = '#000';
    cameraBox.appendChild(video);

    // Buttons
    const btnRow = document.createElement('div');
    btnRow.style.cssText = 'margin-top:8px;display:flex;gap:6px;';
    cameraBox.appendChild(btnRow);

    const captureBtn = document.createElement('button'); captureBtn.textContent = '📸 Capture'; captureBtn.type = 'button';
    const retakeBtn = document.createElement('button'); retakeBtn.textContent = '🔄 Retake'; retakeBtn.type = 'button'; retakeBtn.disabled = true;
    const uploadBtn = document.createElement('button'); uploadBtn.textContent = '⬆️ Upload'; uploadBtn.type = 'button'; uploadBtn.disabled = true;
    const closeBtn = document.createElement('button'); closeBtn.textContent = '❌ Close'; closeBtn.type = 'button';
    [captureBtn, retakeBtn, uploadBtn, closeBtn].forEach(b => btnRow.appendChild(b));

    // Preview wrapper
    const previewWrapper = inline.querySelector('.inline-capture-preview') || document.createElement('div');
    previewWrapper.className = 'inline-capture-preview';
    previewWrapper.style.display = 'flex';
    previewWrapper.style.flexWrap = 'wrap';
    previewWrapper.style.gap = '6px';
    previewWrapper.style.marginTop = '8px';
    if (!inline.querySelector('.inline-capture-preview')) inline.appendChild(previewWrapper);

    let lat = null, lng = null, stream = null, watchId = null, locationName = 'Unknown', lastDataURL = null;

    // Start camera
    try {
      stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' }, audio: false });
      video.srcObject = stream;
      await video.play();
    } catch (e) {
      alert('Camera access failed: ' + e.message);
      cameraBox.remove();
      return;
    }

    // Get location
    async function getLocationName(lat, lng) {
      try {
        const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lng}`);
        const data = await res.json();
        return data.display_name || 'Unknown';
      } catch {
        return 'Unknown';
      }
    }

    if (navigator.geolocation) {
      try {
        const pos = await new Promise((res, rej) => navigator.geolocation.getCurrentPosition(res, rej));
        lat = pos.coords.latitude; lng = pos.coords.longitude;
        locationName = await getLocationName(lat, lng);
        watchId = navigator.geolocation.watchPosition(async p => {
          lat = p.coords.latitude; lng = p.coords.longitude;
          locationName = await getLocationName(lat, lng);
        });
      } catch (e) { console.warn('Geolocation error', e); }
    }

    // Mini map canvas generator
    async function generateMiniMap() {
      const mapDiv = document.createElement('div');
      mapDiv.style.width = '120px'; mapDiv.style.height = '120px';
      document.body.appendChild(mapDiv);
      const map = L.map(mapDiv, { zoomControl: false, attributionControl: false }).setView([lat || 0, lng || 0], 15);
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 19 }).addTo(map);
      L.marker([lat || 0, lng || 0]).addTo(map);
      await new Promise(res => setTimeout(res, 1000));
      const mapCanvas = await html2canvas(mapDiv, { useCORS: true });
      document.body.removeChild(mapDiv);
      return mapCanvas;
    }

    // Capture
    captureBtn.addEventListener('click', async () => {
      if (!video.videoWidth || !video.videoHeight) return alert('Video not ready');
      const canvas = document.createElement('canvas');
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

      // Overlay: timestamp, coordinates, location, caption
      const ts = new Date();
      const tagline = titleInput ? titleInput.value : '';

      // Mini-map
      try { 
        const mapCanvas = await generateMiniMap();
        ctx.drawImage(mapCanvas, 10, canvas.height - 130, 120, 120);
      } catch(e){ console.warn('Mini-map overlay failed', e); }

      const overlayPadding = 10, overlayWidth = 360, lineHeight = 20;
      const dateTime = `📅 ${ts.toLocaleString()}`;
      const latLng = `🧭 Lat: ${(lat||0).toFixed(6)}, Lng: ${(lng||0).toFixed(6)}`;

      // Address lines
      const addressWords = locationName.split(' '), addressLines = []; let currentLine = '';
      addressWords.forEach(word => {
        if((currentLine+word).length>36){ addressLines.push(currentLine.trim()); currentLine = word+' '; }
        else currentLine += word+' ';
      });
      if(currentLine.trim()!=='') addressLines.push(currentLine.trim());
      if(addressLines.length>0) addressLines[0] = '📍 '+addressLines[0];
      const taglineLine = `🏷 ${tagline}`;
      const overlayLines = [dateTime, latLng, ...addressLines, taglineLine];
      const overlayHeight = overlayLines.length*lineHeight + overlayPadding*2;
      const overlayX = canvas.width - overlayWidth - 20, overlayY = canvas.height - overlayHeight - 20;
      ctx.fillStyle = 'rgba(255,255,255,0.95)';
      ctx.fillRect(overlayX, overlayY, overlayWidth, overlayHeight);
      ctx.fillStyle = '#000'; ctx.font='16px Arial';
      let y = overlayY + overlayPadding + 16;
      overlayLines.forEach(line => {
        const textWidth = ctx.measureText(line).width;
        ctx.fillText(line, overlayX + overlayWidth - overlayPadding - textWidth, y);
        y += lineHeight;
      });

      lastDataURL = canvas.toDataURL('image/png');

      // Admin preview
      const imgPreview = document.createElement('img');
      imgPreview.src = lastDataURL;
      imgPreview.style.height='120px'; imgPreview.style.border='1px solid #ddd'; imgPreview.style.borderRadius='4px';
      previewWrapper.appendChild(imgPreview);

      retakeBtn.disabled=false; uploadBtn.disabled=false;
    });

    // Retake
    retakeBtn.addEventListener('click', async () => {
      lastDataURL = null;
      retakeBtn.disabled = true; uploadBtn.disabled = true;
      previewWrapper.innerHTML = '';
      if(stream) stream.getTracks().forEach(t=>t.stop());
      try {
        stream = await navigator.mediaDevices.getUserMedia({ video:{ facingMode:'environment' }, audio:false });
        video.srcObject = stream; await video.play();
      } catch(e){ alert('Cannot restart camera: '+e.message); }
    });

    // Upload
    uploadBtn.addEventListener('click', () => {
      if(!lastDataURL) return alert('No captured image');

      fetch(lastDataURL).then(r => r.blob()).then(blob => {
        const file = new File([blob], 'capture_'+Date.now()+'.png', {type:blob.type});
        capturedFiles.push(file);

        // Rebuild DataTransfer for file input
        const dt = new DataTransfer();
        capturedFiles.forEach(f => dt.items.add(f));
        fileInput.files = dt.files;

        if(latInput) latInput.value = lat!=null?lat.toFixed(6):'';
        if(lngInput) lngInput.value = lng!=null?lng.toFixed(6):'';
        if(timestampInput) timestampInput.value = (new Date()).toISOString();
        if(locationInput) locationInput.value = locationName;

        // Append to Lightbox gallery
        const galleryContainer = inline.querySelector('.observation-img-block[data-gallery-id]');
        if(galleryContainer){
          const link = document.createElement('a');
          link.href = lastDataURL;
          link.setAttribute('data-lightbox', galleryContainer.dataset.galleryId);
          link.setAttribute('data-title', titleInput ? titleInput.value : 'Captured Image');
          const thumb = document.createElement('img');
          thumb.src = lastDataURL;
          thumb.className = 'obs-img';
          thumb.style.height='120px'; thumb.style.border='1px solid #ddd'; thumb.style.borderRadius='4px';
          link.appendChild(thumb);
          galleryContainer.appendChild(link);
        }

        alert('✅ Image added to admin and Lightbox gallery.');
      });
    });

    // Close
    closeBtn.addEventListener('click', () => {
      if(stream) stream.getTracks().forEach(t=>t.stop());
      if(watchId) navigator.geolocation.clearWatch(watchId);
      cameraBox.remove();
    });
  });
});
