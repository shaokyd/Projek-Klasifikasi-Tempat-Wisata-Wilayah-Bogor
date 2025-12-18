const API_URL = "https://peta-backend.vercel.app/api/locations";

const streetLayer = L.tileLayer(
  "https://tile.openstreetmap.org/{z}/{x}/{y}.png",
  {
    maxZoom: 19,
    attribution: "&copy; OpenStreetMap",
  }
);

const satelliteLayer = L.tileLayer(
  "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
  {
    attribution: "Tiles &copy; Esri",
  }
);

var map = L.map("map", {
  center: [-2.5489, 118.0149],
  zoom: 5,
  layers: [streetLayer],
});

const baseMaps = {
  "Peta Jalan": streetLayer,
  Satelit: satelliteLayer,
};
L.control.layers(baseMaps).addTo(map);

L.control.scale().addTo(map);

let markers = [];
let tempMarker = null;
let isAddingMode = false;

function loadLocations() {
  fetch(API_URL)
    .then((res) => res.json())
    .then((data) => {
      markers.forEach((m) => map.removeLayer(m));
      markers = [];
      const listContainer = document.getElementById("locationList");
      listContainer.innerHTML = "";

      data.forEach((loc) => {
        addMarkerToMap(loc);
        addToList(loc);
      });
    })
    .catch((err) => console.error("Error:", err));
}

function getIcon(category) {
  let color = "#3498db";
  let iconClass = "fa-map-marker-alt";

  if (category === "wisata") {
    color = "#e74c3c";
    iconClass = "fa-umbrella-beach";
  } // Merah
  else if (category === "kuliner") {
    color = "#f39c12";
    iconClass = "fa-utensils";
  } // Orange
  else if (category === "kantor") {
    color = "#8e44ad";
    iconClass = "fa-building";
  } // Ungu
  else if (category === "pendidikan") {
    color = "#27ae60";
    iconClass = "fa-graduation-cap";
  } // Hijau

  const iconHtml = `
        <div class="marker-pin" style="background-color:${color}"></div>
        <i class="fa-solid ${iconClass} marker-icon-fa"></i>
    `;

  return L.divIcon({
    className: "custom-div-icon",
    html: iconHtml,
    iconSize: [30, 42],
    iconAnchor: [15, 42],
  });
}

function addMarkerToMap(loc) {
  var marker = L.marker([loc.lat, loc.lng], {
    icon: getIcon(loc.category),
  }).addTo(map);

  const popupContent = `
        <div style="text-align:center">
            <h3>${loc.name}</h3>
            <span style="background:#eee; padding:2px 5px; border-radius:3px; font-size:10px;">${
              loc.category || "Umum"
            }</span>
            <p>${loc.desc}</p>
            <button onclick="editLocation('${loc.id}', '${loc.name}', '${
    loc.desc
  }', '${loc.category}')" class="btn-edit-popup">Edit</button>
            <button onclick="deleteLocation('${
              loc.id
            }')" class="btn-del-popup">Hapus</button>
        </div>
    `;

  marker.bindPopup(popupContent);
  markers.push(marker);
}

function addToList(loc) {
  const listContainer = document.getElementById("locationList");
  const item = document.createElement("div");
  item.className = "location-item";
  item.innerHTML = `<b>${loc.name}</b><br><small>${
    loc.category || "-"
  }</small>`;

  item.onclick = () => {
    map.flyTo([loc.lat, loc.lng], 16);

    if (window.innerWidth <= 768) {
      toggleSidebar();
    }
  };
  listContainer.appendChild(item);
}

function startAddMode() {
  isAddingMode = true;
  document.getElementById("instruction-box").style.display = "block"; // Munculkan instruksi
  document.getElementById("map").classList.add("map-add-mode"); // Ubah kursor

  if (window.innerWidth <= 768) {
    toggleSidebar();
  }
}

function cancelAddMode() {
  isAddingMode = false;
  document.getElementById("instruction-box").style.display = "none";
  document.getElementById("map").classList.remove("map-add-mode");
  if (tempMarker) {
    map.removeLayer(tempMarker);
    tempMarker = null;
  }
}

// Event Listener: Klik Peta
map.on("click", function (e) {
  if (isAddingMode) {
    const lat = e.latlng.lat;
    const lng = e.latlng.lng;

    // 1. Buat marker di titik klik
    createTempMarker(lat, lng);

    // 2. Buka form modal
    openModal("add");

    // 3. Matikan mode tambah
    document.getElementById("instruction-box").style.display = "none";
    document.getElementById("map").classList.remove("map-add-mode");
    isAddingMode = false;
  }
});

const modal = document.getElementById("locationModal");

function openModal(mode, id, name, desc, category) {
  modal.style.display = "block";

  if (mode === "add") {
    document.getElementById("modalTitle").innerText = "Simpan Lokasi Ini?";
    document.getElementById("dataForm").reset();
    document.getElementById("locId").value = "";

    // Kita TIDAK lagi membuat marker di tengah otomatis (karena sudah dibuat lewat klik)
    // Tapi kita pastikan input form terisi koordinat dari tempMarker
    if (tempMarker) {
      const coord = tempMarker.getLatLng();
      document.getElementById("locLat").value = coord.lat;
      document.getElementById("locLng").value = coord.lng;
      document.getElementById("coordDisplay").innerText = `${coord.lat.toFixed(
        5
      )}, ${coord.lng.toFixed(5)}`;
    }
  } else {
    // Mode EDIT
    document.getElementById("modalTitle").innerText = "Edit Lokasi";
    document.getElementById("locId").value = id;
    document.getElementById("locName").value = name;
    document.getElementById("locDesc").value = desc;
    document.getElementById("locCategory").value = category;
  }
}

function closeModal() {
  modal.style.display = "none";
  if (tempMarker) {
    map.removeLayer(tempMarker);
    tempMarker = null;
  }
}

// Marker Draggable untuk input lokasi
function createTempMarker(lat, lng) {
  if (tempMarker) map.removeLayer(tempMarker);

  tempMarker = L.marker([lat, lng], { draggable: true }).addTo(map);

  // Update text koordinat saat digeser
  tempMarker.on("dragend", function (e) {
    const coord = e.target.getLatLng();
    document.getElementById("locLat").value = coord.lat;
    document.getElementById("locLng").value = coord.lng;
    document.getElementById("coordDisplay").innerText = `${coord.lat.toFixed(
      5
    )}, ${coord.lng.toFixed(5)}`;
  });

  // Set nilai awal ke form
  document.getElementById("locLat").value = lat;
  document.getElementById("locLng").value = lng;
  document.getElementById("coordDisplay").innerText = `${lat.toFixed(
    5
  )}, ${lng.toFixed(5)}`;
}

// 5. SIMPAN DATA (CREATE / UPDATE)
function saveLocation() {
  const id = document.getElementById("locId").value;
  const name = document.getElementById("locName").value;
  const category = document.getElementById("locCategory").value;
  const desc = document.getElementById("locDesc").value;
  const lat = parseFloat(document.getElementById("locLat").value);
  const lng = parseFloat(document.getElementById("locLng").value);

  const payload = { name, category, desc, lat, lng };

  let url = API_URL;
  let method = "POST";

  if (id) {
    // Jika ada ID, berarti mode EDIT
    url = `${API_URL}/${id}`;
    method = "PUT";
  }

  fetch(url, {
    method: method,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  }).then((res) => {
    if (res.ok) {
      closeModal();
      loadLocations();
      alert("Data berhasil disimpan!");
    }
  });
}

window.editLocation = function (id, name, desc, category) {
  openModal("edit", id, name, desc, category);
};

window.deleteLocation = function (id) {
  if (confirm("Hapus data ini?")) {
    fetch(`${API_URL}/${id}`, { method: "DELETE" }).then(() => loadLocations());
  }
};

// Filter Pencarian
window.filterLocations = function () {
  const input = document.getElementById("searchInput").value.toLowerCase();
  const items = document.getElementsByClassName("location-item");

  Array.from(items).forEach((item) => {
    const text = item.innerText.toLowerCase();
    item.style.display = text.includes(input) ? "block" : "none";
  });
};

// FUNGSI BARU: Toggle Sidebar (Dipanggil tombol Burger & Close)
function toggleSidebar() {
  const sidebar = document.querySelector(".sidebar");
  sidebar.classList.toggle("active");
}

loadLocations();
