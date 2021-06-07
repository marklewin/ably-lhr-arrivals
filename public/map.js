let flightMarkers = [];
let trackedFlights = [];
let flightChannel;
let flightDetailChannels = [];
let flightsLayer = new L.LayerGroup();

// Initialize the map
let lhr = L.latLng(52.288, -0.983);
let map = L.map("map", {
  scrollWheelZoom: true,
});
map.setView(lhr, 5);

flightsLayer.addTo(map);

// Map markers
const bluePlaneIcon = L.icon({
  iconUrl: "plane-blue.png",
  iconSize: [40, 40],
  iconAnchor: [20, 20],
  popupAnchor: [-3, -76],
});

const redPlaneIcon = L.icon({
  iconUrl: "plane-red.png",
  iconSize: [40, 40],
  iconAnchor: [20, 20],
  popupAnchor: [-3, -76],
});

const customMarker = L.Marker.extend({
  options: {
    iataId: "",
    color: "",
  },
});

// Initialize the base layer
let osm_mapnik = L.tileLayer(
  "http://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
  {
    maxZoom: 19,
    attribution:
      '&copy; OSM Mapnik <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a>',
  }
).addTo(map);

// Add the boundary circle to the map
let circle = L.circle(lhr, {
  color: "red",
  fillColor: "#f03",
  fillOpacity: 0.1,
  radius: 450000,
}).addTo(map);

// Menu bar button handlers
document.getElementById("shrink").addEventListener("click", (e) => {
  circle.setRadius(circle.getRadius() - 10000);
});

document.getElementById("embiggen").addEventListener("click", (e) => {
  circle.setRadius(circle.getRadius() + 10000);
});

document.getElementById("start").addEventListener("click", startTracking);
document.getElementById("stop").addEventListener("click", stopTracking);

// Initialize ably client
let ably = new Ably.Realtime({
  authUrl: "/auth?id=map-client",
});

// When user clicks the button to begin tracking
function startTracking() {
  document.getElementById("flightCount").innerHTML =
    "Retrieving flight data...";
  flightDetailChannels = [];
  let flightChannelName =
    "[product:ably-flightradar24/heathrow-flights]flights:airport:LHR:arrivals";
  flightChannel = ably.channels.get(flightChannelName, {
    //delta: "vcdiff",
  });
  flightChannel.subscribe((message) => {
    trackedFlights = message.data;

    //check if details channel of each flight is subscribed to and, if not, subscribes
    for (const flight of trackedFlights) {
      // Some flight IDs are empty strings - not sure why, but ignore them
      if (flight.iataId !== "" && !searchFlightDetailChannels(flight.iataId)) {
        subscribeToFlightDetails(flight.iataId);
      }
    }
  });
}

function subscribeToFlightDetails(flight) {
  let flightDetailChannelName = `[product:ably-flightradar24/heathrow-flights]flights:plane:${flight}`;
  let channel = ably.channels.get(flightDetailChannelName);
  flightDetailChannels.push(channel);
  document.getElementById(
    "flightCount"
  ).innerHTML = `${flightDetailChannels.length} incoming flights tracked`;
  channel.subscribe((message) => {
    let planeMarker = searchFlightMarkers(message.data.iataId);
    if (planeMarker !== undefined) {
      updateFlightMarker(planeMarker, message.data);
    } else {
      createFlightMarker(message.data);
    }
  });
}

function createFlightMarker(data) {
  let coords = L.latLng(data.lat, data.long);
  let planeIcon;
  let markerColor;

  if (isInsideCircle(coords)) {
    planeIcon = redPlaneIcon;
    markerColor = "red";
  } else {
    planeIcon = bluePlaneIcon;
    markerColor = "blue";
  }
  let flightMarker = new customMarker(coords, {
    rotationAngle: data.track,
    icon: planeIcon,
  });
  flightMarker.options.iataId = data.iataId;
  flightMarker.options.color = markerColor;
  setPopup(flightMarker, data);
  flightMarkers.push(flightMarker);
  flightMarker.addTo(flightsLayer);
}

function updateFlightMarker(marker, data) {
  let coords = L.latLng(data.lat, data.long);
  let planeIcon;
  if (isInsideCircle(coords)) {
    if (marker.options.color == "blue") {
      circle.setStyle({ color: "yellow", fill: "#eff542" });
      setTimeout(() => {
        circle.setStyle({ color: "red", fill: "#f03" });
      }, 1000);
    }
    marker.setIcon(redPlaneIcon);
    marker.options.color = "red";
  } else {
    marker.setIcon(bluePlaneIcon);
    marker.options.color = "blue";
  }
  marker.setLatLng(coords);
  setPopup(marker, data);
  marker.options.rotationAngle = data.track;
}

// When user clicks the button to stop tracking
function stopTracking() {
  flightChannel.detach(() => {
    console.log("Unsub from flight channel");
  });

  for (const flightDetailChannel of flightDetailChannels) {
    flightDetailChannel.detach(() => {
      console.log(`unsub from ${flightDetailChannel.name}`);
    });
  }

  flightsLayer.clearLayers();

  document.getElementById("flightCount").innerHTML = "Tracking paused.";
}

function setPopup(marker, data) {
  marker.bindPopup(
    `<strong>Flight: </strong>${data.iataId}<br/><strong>Origin: </strong>${data.origin}<br/><strong>Altitude: </strong>${data.altitude}<br/><strong>Speed: </strong>${data.speed}<br/><strong>Aircraft ID: </strong>${data.aircraftId}<br/><strong>Type: </strong>${data.type}<br/>`
  );
}
function searchFlightMarkers(id) {
  return flightMarkers.find(
    (flightMarker) => flightMarker.options.iataId == id
  );
}

function searchFlightDetailChannels(id) {
  if (flightDetailChannels.find((channel) => channel.name.includes(id))) {
    return true;
  } else {
    return false;
  }
}

function isInsideCircle(coords) {
  // distance between the current position of the marker and the center of the circle
  let d = map.distance(coords, circle.getLatLng());

  // the marker is inside the circle when the distance is inferior to the radius
  return (isInside = d < circle.getRadius());
}
