document.addEventListener("DOMContentLoaded", function() {
    const mapDiv = document.getElementById('map');
    const coordsStr = mapDiv.dataset.coords;
    const title = mapDiv.dataset.title;
    const side = mapDiv.dataset.side;

    var map = L.map('map').setView([0, 0], 13);

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; OpenStreetMap contributors'
    }).addTo(map);

    if (coordsStr) {
        const coords = coordsStr.split(',');
        const lat = parseFloat(coords[0].trim());
        const lng = parseFloat(coords[1].trim());

        if (!isNaN(lat) && !isNaN(lng)) {
            map.setView([lat, lng], 16);
            L.marker([lat, lng])
             .addTo(map)
             .bindPopup("<b>" + title + "</b><br>" + side)
             .openPopup();
        }
    }
});
