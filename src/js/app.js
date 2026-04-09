
// OrbitWatch — Rocket & Satellite Tracker
// APIs used: wheretheiss.at (ISS), open-notify.org (crew), ll.thespacedevs.com (launches)

// ─── MAP INIT ─────────────────────────────────────────────────────────────────
const map = L.map("map", {
  center: [20, 0],
  zoom: 2,
  zoomControl: false,
  attributionControl: false,
});

L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
  maxZoom: 10,
}).addTo(map);

L.control.zoom({ position: "bottomright" }).addTo(map);
L.control.attribution({ position: "bottomleft", prefix: "© OpenStreetMap | wheretheiss.at | thespacedevs.com" }).addTo(map);

// ─── ISS TRACKER ──────────────────────────────────────────────────────────────
let issMarker = null;
let orbitLine = null;
let issHistory = [];
const MAX_TRAIL = 60;

const issIcon = L.divIcon({
  html: '<div class="iss-marker">🛸</div>',
  className: "",
  iconSize: [32, 32],
  iconAnchor: [16, 16],
});

async function fetchISS() {
  try {
    const res  = await fetch("https://api.wheretheiss.at/v1/satellites/25544");
    const data = await res.json();

    const lat  = parseFloat(data.latitude);
    const lon  = parseFloat(data.longitude);
    const alt  = parseFloat(data.altitude).toFixed(1);
    const vel  = parseFloat(data.velocity).toFixed(0);
    const vis  = data.visibility || "—";
    const day  = data.daynum ? (data.footprint > 0 ? "☀️ Day" : "🌑 Night") : "—";

    // Update header stats
    document.getElementById("iss-speed").textContent = vel + " km/h";
    document.getElementById("iss-alt").textContent   = alt + " km";

    // Update panel
    document.getElementById("iss-lat").textContent  = lat.toFixed(4) + "°";
    document.getElementById("iss-lon").textContent  = lon.toFixed(4) + "°";
    document.getElementById("iss-alt2").textContent = alt + " km";
    document.getElementById("iss-vel").textContent  = parseInt(vel).toLocaleString() + " km/h";
    document.getElementById("iss-vis").textContent  = vis;
    document.getElementById("iss-day").textContent  = day;

    const now = new Date();
    document.getElementById("update-time").textContent =
      "Last updated: " + now.toLocaleTimeString();

    // Move/create marker
    if (!issMarker) {
      issMarker = L.marker([lat, lon], { icon: issIcon }).addTo(map);
      issMarker.bindPopup("<b>🛸 ISS</b><br>International Space Station");
      map.flyTo([lat, lon], 2, { duration: 2 });
    } else {
      issMarker.setLatLng([lat, lon]);
    }

    // Orbit trail
    issHistory.push([lat, lon]);
    if (issHistory.length > MAX_TRAIL) issHistory.shift();
    if (orbitLine) map.removeLayer(orbitLine);
    if (issHistory.length > 1) {
      orbitLine = L.polyline(issHistory, {
        color: "#00ffcc",
        weight: 1.5,
        opacity: 0.4,
        dashArray: "4,4",
        className: "orbit-path",
      }).addTo(map);
    }

  } catch (err) {
    console.error("ISS fetch error:", err);
  }
}

// ─── CREW ─────────────────────────────────────────────────────────────────────
async function fetchCrew() {
  try {
    const res  = await fetch("http://api.open-notify.org/astros.json");
    const data = await res.json();

    document.getElementById("iss-crew").textContent = data.number;

    const flags = { "NASA": "🇺🇸", "Roscosmos": "🇷🇺", "ESA": "🇪🇺", "JAXA": "🇯🇵", "CSA": "🇨🇦", "CNSA": "🇨🇳" };

    const html = '<div class="crew-grid">' +
      data.people.map(p => {
        const flag = flags[p.agency] || "🧑‍🚀";
        return \`
          <div class="crew-card">
            <div class="crew-avatar">\${flag}</div>
            <div>
              <div class="crew-name">\${p.name}</div>
              <div class="crew-agency">\${p.agency || "Unknown"}</div>
              <div class="crew-role">\${p.craft}</div>
            </div>
          </div>
        \`;
      }).join("") +
    "</div>";

    document.getElementById("crew-list").innerHTML = html;
  } catch (err) {
    document.getElementById("crew-list").innerHTML =
      '<div class="loading-text">⚠️ Could not load crew data</div>';
  }
}

// ─── LAUNCHES ─────────────────────────────────────────────────────────────────
async function fetchLaunches() {
  try {
    const res  = await fetch("https://ll.thespacedevs.com/2.2.0/launch/upcoming/?limit=10&format=json");
    const data = await res.json();

    const statusMap = {
      "Go for Launch": "go",
      "To Be Determined": "tbd",
      "To Be Confirmed": "tbd",
      "Hold": "hold",
      "Success": "go",
      "Failure": "hold",
    };

    const html = data.results.map(launch => {
      const date   = launch.net ? new Date(launch.net).toLocaleDateString("en", { month: "short", day: "numeric", year: "numeric" }) : "TBD";
      const time   = launch.net ? new Date(launch.net).toLocaleTimeString("en", { hour: "2-digit", minute: "2-digit" }) : "";
      const status = launch.status?.name || "TBD";
      const cls    = statusMap[status] || "tbd";
      const rocket = launch.rocket?.configuration?.name || "Unknown rocket";
      const name   = launch.name || "Unknown mission";
      const pad    = launch.pad?.location?.name || "";

      return \`
        <div class="launch-card">
          <div style="flex:1">
            <div class="launch-name">🚀 \${name}</div>
            <div class="launch-rocket">\${rocket} · \${pad}</div>
          </div>
          <div style="text-align:right">
            <div class="launch-date">\${date}<br>\${time}</div>
            <span class="launch-status status-\${cls}">\${status}</span>
          </div>
        </div>
      \`;
    }).join("");

    document.getElementById("launches-list").innerHTML = html || '<div class="loading-text">No upcoming launches found</div>';

  } catch (err) {
    document.getElementById("launches-list").innerHTML =
      '<div class="loading-text">⚠️ Could not load launch data.<br>API rate limit may apply — try again in 1 min.</div>';
  }
}

// ─── TABS ─────────────────────────────────────────────────────────────────────
document.querySelectorAll(".tab").forEach(tab => {
  tab.addEventListener("click", () => {
    document.querySelectorAll(".tab").forEach(t => t.classList.remove("active"));
    document.querySelectorAll(".tab-content").forEach(c => c.classList.remove("active"));
    tab.classList.add("active");
    document.getElementById("tab-" + tab.dataset.tab).classList.add("active");
  });
});

// ─── BOOT ─────────────────────────────────────────────────────────────────────
fetchISS();
fetchCrew();
fetchLaunches();
setInterval(fetchISS, 5000);   // ISS every 5s
setInterval(fetchCrew, 60000); // Crew every 1min
