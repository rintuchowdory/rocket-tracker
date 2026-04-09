
const map = L.map("map", {
  center: [20, 0], zoom: 2,
  zoomControl: false, attributionControl: false,
});
L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", { maxZoom: 10 }).addTo(map);
L.control.zoom({ position: "bottomright" }).addTo(map);
L.control.attribution({ position: "bottomleft", prefix: "OrbitWatch" }).addTo(map);

let issMarker = null, orbitLine = null, issHistory = [];

const issIcon = L.divIcon({
  html: '<div class="iss-marker">\u{1F6F8}</div>',
  className: "", iconSize: [32,32], iconAnchor: [16,16],
});

async function fetchISS() {
  try {
    const res = await fetch("https://api.wheretheiss.at/v1/satellites/25544");
    const d = await res.json();
    const lat = parseFloat(d.latitude);
    const lon = parseFloat(d.longitude);
    const alt = parseFloat(d.altitude).toFixed(1);
    const vel = parseInt(d.velocity).toLocaleString();

    document.getElementById("iss-speed").textContent = vel + " km/h";
    document.getElementById("iss-alt").textContent   = alt + " km";
    document.getElementById("iss-lat").textContent   = lat.toFixed(4) + "°";
    document.getElementById("iss-lon").textContent   = lon.toFixed(4) + "°";
    document.getElementById("iss-alt2").textContent  = alt + " km";
    document.getElementById("iss-vel").textContent   = vel + " km/h";
    document.getElementById("iss-vis").textContent   = d.visibility || "—";
    document.getElementById("iss-day").textContent   = d.footprint > 0 ? "Day" : "Night";

    const now = new Date();
    document.getElementById("update-time").textContent = "Updated: " + now.toLocaleTimeString();

    if (!issMarker) {
      issMarker = L.marker([lat, lon], { icon: issIcon }).addTo(map);
      issMarker.bindPopup("<b>ISS</b><br>International Space Station");
      map.flyTo([lat, lon], 2, { duration: 2 });
    } else {
      issMarker.setLatLng([lat, lon]);
    }

    issHistory.push([lat, lon]);
    if (issHistory.length > 60) issHistory.shift();
    if (orbitLine) map.removeLayer(orbitLine);
    if (issHistory.length > 1) {
      orbitLine = L.polyline(issHistory, {
        color: "#00ffcc", weight: 1.5, opacity: 0.4, dashArray: "4,4"
      }).addTo(map);
    }
  } catch(e) { console.error("ISS error:", e); }
}

async function fetchCrew() {
  try {
    const res = await fetch("https://corsproxy.io/?https://api.open-notify.org/astros.json");
    const d = await res.json();
    document.getElementById("iss-crew").textContent = d.number;
    const flags = { "NASA":"US", "Roscosmos":"RU", "ESA":"EU", "JAXA":"JP", "CSA":"CA", "CNSA":"CN" };
    let html = '<div class="crew-grid">';
    d.people.forEach(function(p) {
      const flag = flags[p.agency] || "?";
      html += '<div class="crew-card">';
      html += '<div class="crew-avatar">' + flag + '</div>';
      html += '<div>';
      html += '<div class="crew-name">' + p.name + '</div>';
      html += '<div class="crew-agency">' + (p.agency || "Unknown") + '</div>';
      html += '<div class="crew-role">' + p.craft + '</div>';
      html += '</div></div>';
    });
    html += '</div>';
    document.getElementById("crew-list").innerHTML = html;
  } catch(e) {
    document.getElementById("crew-list").innerHTML = '<div class="loading-text">Could not load crew data</div>';
  }
}

async function fetchLaunches() {
  try {
    const res = await fetch("https://ll.thespacedevs.com/2.2.0/launch/upcoming/?limit=8&format=json");
    const d = await res.json();
    let html = "";
    d.results.forEach(function(launch) {
      const date   = launch.net ? new Date(launch.net).toLocaleDateString("en",{month:"short",day:"numeric",year:"numeric"}) : "TBD";
      const status = launch.status ? launch.status.name : "TBD";
      const cls    = status === "Go for Launch" ? "go" : status.includes("Hold") ? "hold" : "tbd";
      const rocket = launch.rocket && launch.rocket.configuration ? launch.rocket.configuration.name : "Unknown";
      const name   = launch.name || "Unknown";
      const pad    = launch.pad && launch.pad.location ? launch.pad.location.name : "";
      html += '<div class="launch-card">';
      html += '<div style="flex:1"><div class="launch-name">\u{1F680} ' + name + '</div>';
      html += '<div class="launch-rocket">' + rocket + ' · ' + pad + '</div></div>';
      html += '<div style="text-align:right"><div class="launch-date">' + date + '</div>';
      html += '<span class="launch-status status-' + cls + '">' + status + '</span></div>';
      html += '</div>';
    });
    document.getElementById("launches-list").innerHTML = html || '<div class="loading-text">No launches found</div>';
  } catch(e) {
    document.getElementById("launches-list").innerHTML = '<div class="loading-text">Could not load launches. Try again in 1 min.</div>';
  }
}

document.querySelectorAll(".tab").forEach(function(tab) {
  tab.addEventListener("click", function() {
    document.querySelectorAll(".tab").forEach(function(t) { t.classList.remove("active"); });
    document.querySelectorAll(".tab-content").forEach(function(c) { c.classList.remove("active"); });
    tab.classList.add("active");
    document.getElementById("tab-" + tab.dataset.tab).classList.add("active");
  });
});

fetchISS();
fetchCrew();
fetchLaunches();
setInterval(fetchISS, 5000);
setInterval(fetchCrew, 60000);
