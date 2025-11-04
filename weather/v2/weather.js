// Global variables
let cities = [];
let addCityDialog;
let editCityDialog;
let cancelEditButton;
let saveEditButton;
let mobileMenu;
let mobileMenuOverlay;
let hamburgerMenu;
let closeMobileMenuBtn;

async function main() {
  // Initialize dialog elements
  addCityDialog = document.getElementById("addCityDialog");
  editCityDialog = document.getElementById("editCityDialog");
  cancelEditButton = document.getElementById("cancelEditButton");
  saveEditButton = document.getElementById("saveEditButton");

  // Initialize mobile menu elements
  mobileMenu = document.getElementById("mobileMenu");
  hamburgerMenu = document.getElementById("hamburgerMenu");
  closeMobileMenuBtn = document.getElementById("closeMobileMenu");

  // Create overlay element
  mobileMenuOverlay = document.createElement("div");
  mobileMenuOverlay.className = "mobile-menu-overlay";
  document.body.appendChild(mobileMenuOverlay);

  // Mobile menu event listeners
  hamburgerMenu.addEventListener("click", () => {
    mobileMenu.classList.add("active");
    mobileMenuOverlay.classList.add("active");
    document.body.style.overflow = "hidden";
  });

  closeMobileMenuBtn.addEventListener("click", () => {
    mobileMenu.classList.remove("active");
    mobileMenuOverlay.classList.remove("active");
    document.body.style.overflow = "";
  });

  mobileMenuOverlay.addEventListener("click", () => {
    mobileMenu.classList.remove("active");
    mobileMenuOverlay.classList.remove("active");
    document.body.style.overflow = "";
  });

  // Function to close mobile menu
  const closeMobileMenu = () => {
    mobileMenu.classList.remove("active");
    mobileMenuOverlay.classList.remove("active");
    document.body.style.overflow = "";
  };

  // Mobile menu button event handlers
  document.getElementById("mobileLoadSample").addEventListener("click", () => {
    loadSample();
    closeMobileMenu();
  });

  document.getElementById("mobileClearAll").addEventListener("click", () => {
    clearAll();
    closeMobileMenu();
  });

  document.getElementById("mobileToggleExtraDays").addEventListener("click", () => {
    toggleLowlight();
    closeMobileMenu();
  });

  document.getElementById("mobileCopyLink").addEventListener("click", () => {
    copyToClipboard();
    closeMobileMenu();
  });

  document.getElementById("mobileShareButton").addEventListener("click", () => {
    shareLink();
    closeMobileMenu();
  });

  // Check for cities in URL parameters first
  if (!loadCitiesFromURL()) {
    // If no cities in URL, check local storage
    loadFromLocalStorage();
  }
  await fetchUrls();
  drawTable();

  // Add event listeners
  addCityDialog.addEventListener("click", (e) => {
    if (e.target === addCityDialog) {
      addCityDialog.close();
    }
  });

  editCityDialog.addEventListener("click", (e) => {
    if (e.target === editCityDialog) {
      editCityDialog.close();
    }
  });

  cancelEditButton.addEventListener("click", () => {
    editCityDialog.close();
  });

  saveEditButton.addEventListener("click", () => {
    const cityId = document.getElementById("editCityId").value;
    const cityIndex = cities.findIndex(c => c.id === cityId);
    if (cityIndex !== -1) {
      cities[cityIndex].name = document.getElementById("editCityName").value;
      cities[cityIndex].lat = parseFloat(document.getElementById("editLat").value).toFixed(3);
      cities[cityIndex].lon = parseFloat(document.getElementById("editLon").value).toFixed(3);
      cities[cityIndex].from = document.getElementById("editFrom").value;
      cities[cityIndex].to = document.getElementById("editTo").value;
      cities[cityIndex].id = `${cities[cityIndex].name}.${cities[cityIndex].from}.${cities[cityIndex].to}`;

      saveToLocalStorage();
      fetchAndDraw();
      generateShareableLink();
      editCityDialog.close();
    }
  });

  // Add event listener for the Add Location button
  const openAddCityButton = document.getElementById("openAddCityDialog");
  openAddCityButton.addEventListener("click", () => {
    addCityDialog.showModal();
  });

  const useMapLocationButton = document.getElementById("useMapLocation");
  useMapLocationButton.addEventListener("click", () => {
    // Update the form fields with the selected coordinates
    load(mapFoundCity || "", mapFoundLatLng.lat.toFixed(4), mapFoundLatLng.lng.toFixed(4));
    mapDialog.close();
  });
}

function loadSample() {
  cities = [
    {
      "name": "Guatemala City",
      "lat": "14.641",
      "lon": "-90.513",
      "from": "2025-03-21",
      "to": "2025-03-21",
      "id": "Guatemala City.2025-03-21.2025-03-21"
    },
    {
      "name": "Antigua Guatemala",
      "lat": "14.561",
      "lon": "-90.734",
      "from": "2025-03-21",
      "to": "2025-03-22",
      "id": "Antigua Guatemala.2025-03-21.2025-03-22"
    },
    {
      "name": "Lake Atitlan",
      "lat": "14.744",
      "lon": "-91.207",
      "from": "2025-03-23",
      "to": "2025-03-24",
      "id": "Lake Atitlan.2025-03-23.2025-03-24"
    },
    {
      "name": "Tikal",
      "lat": "17.225",
      "lon": "-89.612",
      "from": "2025-03-25",
      "to": "2025-03-25",
      "id": "Tikal.2025-03-25.2025-03-25"
    },
    {
      "name": "San Ignacio",
      "lat": "17.159",
      "lon": "-89.070",
      "from": "2025-03-26",
      "to": "2025-03-28",
      "id": "San Ignacio.2025-03-26.2025-03-28"
    },
    {
      "name": "Caye Caulker",
      "lat": "17.737",
      "lon": "-88.028",
      "from": "2025-03-29",
      "to": "2025-04-02",
      "id": "Caye Caulker.2025-03-29.2025-04-02"
    }
  ];

  fetchAndDraw();
}

function load(p_name, p_lat, p_lon) {
  // console.log("load", p_name, p_lat, p_lon);

  document.getElementById("city").value = p_name;
  document.getElementById("lat").value = parseFloat(p_lat).toFixed(3); // Round to 3 places
  document.getElementById("lon").value = parseFloat(p_lon).toFixed(3); // Round to 3 places

  // dialog.close();
}

async function search() {
  let str = "";

  let strCity = document.getElementById("city").value;
  let url = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(
    strCity
  )}`;

  let response = await fetch(url, {
    method: "GET",
    mode: "cors",
  });

  if (response.ok) {
    let payload = await response.json();

    if (payload && payload.results && payload.results.length > 0) {
      for (const result of payload.results) {
        str += `<div onclick='load("${result.name}",${result.latitude},${result.longitude}); showMainSection();'>`;
        str += `${result.name}`;
        str += `<br/>${result.admin1}, ${result.country}`;
        str += `</div>`;
        str += "<hr />";
      }
    } else {
      str = "No results";
    }
  } else {
    str = `Failed to fetch ${url}: ${response.status} ${response.statusText}`;
  }

  document.getElementById("searchResults").innerHTML = str;
}

async function fetchAndDraw() {
  await fetchUrls();
  drawTable();
}

const _strKeyStorageCities = "cities";

if (typeof btoa === 'undefined') {
  function btoa(str) {
    return Buffer.from(str, 'binary').toString('base64');
  }
}

if (typeof atob === 'undefined') {
  function atob(base64) {
    return Buffer.from(base64, 'base64').toString('binary');
  }
}

function loadFromLocalStorage() {
  let str = localStorage.getItem(_strKeyStorageCities);

  if (str) {
    cities = JSON.parse(str);
  }
}

function saveToLocalStorage() {
  if (cities) {
    localStorage.setItem(_strKeyStorageCities, JSON.stringify(cities));
  }
}

function removeCity(p_id) {
  // delete from main object
  const index = cities.findIndex((obj) => obj.id === p_id);
  if (index !== -1) {
    cities.splice(index, 1);
  }
  // save object to Local Storage
  saveToLocalStorage();

  //redraw
  fetchAndDraw();
  generateShareableLink();
}

function getCurrentPosition() {
  return new Promise((resolve, reject) => {
    if ("geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition(
        // Success callback
        function (position) {
          resolve(position.coords);
        },
        // Error callback
        function (error) {
          reject(error);
        }
      );
    } else {
      reject(new Error("Geolocation is not supported by this browser."));
    }
  });
}

// Usage with async/await
async function addCurrentLocation() {
  try {
    const position = await getCurrentPosition();

    cities.push({
      name: `Your location`,
      lat: position.latitude,
      lon: position.longitude,
      id: `Current ${position.latitude}, ${position.longitude}`,
      from: "",
      to: "",
    });
  } catch (error) {
    console.error("Error getting location:", error);
  }
}

function addCity() {
  // grab values

  let strCity = document.getElementById("city").value;
  let strLat = parseFloat(document.getElementById("lat").value).toFixed(3); //Round to 4
  let strLon = parseFloat(document.getElementById("lon").value).toFixed(3); //Round to 4
  let strFrom = document.getElementById("from").value;
  let strTo = document.getElementById("to").value;
  let strId = `${strCity}.${strFrom}.${strTo}`;

  // add to main object

  cities.push({
    name: strCity,
    lat: strLat,
    lon: strLon,
    from: strFrom,
    to: strTo,
    id: strId,
  });

  // save object to Local Storage
  saveToLocalStorage();

  //redraw
  fetchAndDraw();
  generateShareableLink();
}

// Custom sorting function
function customSort(a, b) {
  // Compare 'from' fields first
  if (a.from < b.from) return -1;
  if (a.from > b.from) return 1;

  // If 'from' fields are equal, compare 'to' fields
  if (a.to < b.to) return -1;
  if (a.to > b.to) return 1;

  return 0; // If both 'from' and 'to' fields are equal
}

let results = {};

async function fetchUrls() {
  for (const city of cities) {
    let url = "";
    try {
      // seen this city before?
      if (results[city.name]) {
        continue;
      }


      // TODO - add Humidity - relative_humidity_2m
      // TODO - make the Number of Days variable

      url = `https://api.open-meteo.com/v1/forecast?latitude=${city.lat}&longitude=${city.lon}&current=apparent_temperature,weather_code,relative_humidity_2m&daily=weather_code,apparent_temperature_max,apparent_temperature_min,precipitation_probability_max&temperature_unit=fahrenheit&precipitation_unit=inch&timezone=auto&forecast_days=16`;

      // console.log("trying", url);

      let response = await fetch(url, {
        method: "GET",
        mode: "cors", // This option is used to enable CORS
      });

      if (response.ok) {
        results[city.name] = await response.json(); // Store the result in the object using the URL as key
      } else {
        console.error(
          `Failed to fetch ${url}: ${response.status} ${response.statusText}`
        );
      }
    } catch (error) {
      console.error(`Error fetching ${url}: ${error}`);
    }
  }

  return results;
}

function drawTable() {
  if (!cities || cities.length <= 0) {
    document.getElementById("results").innerHTML = "";
    return;
  }

  let str = "";
  cities.sort(customSort);
  let firstResult = results[cities[0].name];
  var days = firstResult.daily.time;

  str += "<table>";

  // Header
  str += "<thead><tr><th></th>";
  for (const day of days) {
    const [iYear, iMonth, iDay] = day.split("-").map(Number);
    str += `<th>${formatHeaderDateString(new Date(iYear, iMonth - 1, iDay))}</th>`;
  }
  str += "<th></th></tr></thead>";

  // Body
  str += "<tbody>";
  for (const city of cities) {
    let cityData = results[city.name];
    str += "<tr><td>";

    // City info section
    str += `<span class="cityname">${city.name}</span>`;
    if (city.from && city.to) {
      const formattedFrom = formatDate(city.from);
      const formattedTo = formatDate(city.to);
      str += `${formattedFrom} - ${formattedTo}`;
    }

    // Action buttons
    str += `<div>
      <button title='Edit' onclick='editCity("${city.id}")' class='btn-edit btn-icon'><i class="fa-solid fa-pencil"></i></button>
      <button title='Remove' onclick='removeCity("${city.id}")' class='btn-delete btn-icon'><i class="fa-solid fa-trash"></i></button>
    </div>`;

    // Timezone info
    let intOffset = cityData.utc_offset_seconds / 3600;
    let strOffset = intOffset < 0 ? intOffset : "+" + intOffset;
    str += `${cityData.timezone}<br/><i class="fa-regular fa-clock"></i>${strOffset}h <i class="fa-solid fa-caret-up"></i>${cityData.elevation}m</td>`;

    // Weather data columns
    let dayCounter = 0;
    for (const day of days) {
      let showDay = true;
      let dayClass = "lowlightDay";
      let iconType = "night";
      let bgcolor = null;

      if ((city.from <= days[dayCounter] && days[dayCounter] <= city.to) || !city.from || !city.to) {
        dayClass = "highlightDay";
        iconType = "day";
        bgcolor = weatherIcons[cityData.daily.weather_code[dayCounter]][iconType].backgroundColor;
        showDay = true;
      }

      if (showDay) {
        str += `<td class="${dayClass}" ${bgcolor ? "style='background-color:" + bgcolor + ";'" : ""}>`;

        // Temperature
        str += `<span style="white-space:nowrap">${Math.round(cityData.daily.apparent_temperature_max[dayCounter])}&deg; / ${Math.round(cityData.daily.apparent_temperature_min[dayCounter])}&deg;</span>`;

        // Precipitation
        let precip = cityData.daily.precipitation_probability_max[dayCounter];
        str += `${precip ? precip + cityData.daily_units.precipitation_probability_max : ''}`;

        // Weather icon and description
        let url = weatherIcons[cityData.daily.weather_code[dayCounter]][iconType].image;
        let descr = weatherIcons[cityData.daily.weather_code[dayCounter]].day.description;
        str += `<br><img src="${url}" alt="${descr}">`;
        str += `<span style="white-space:nowrap;justify-content:center">${descr}</span>`;

        str += "</td>";
      } else {
        str += "<td></td>";
      }
      dayCounter++;
    }

    // Links column
    str += "<td>";
    str += `<a target="_blank" href="https://www.google.com/maps/place/${city.lat},${city.lon}">${city.lat}<br/>${city.lon} <i class="fa-solid fa-location-dot"></i></a>`;
    str += `<a target="_blank" href="https://www.visualcrossing.com/weather-forecast/${city.lat},${city.lon}">wx 1 <i class="fa-solid fa-arrow-up-right-from-square"></i></a>`;
    str += `<a target="_blank" href="https://www.timeanddate.com/weather/@${city.lat},${city.lon}/ext">wx 2 <i class="fa-solid fa-arrow-up-right-from-square"></i></a>`;
    str += `<a target="_blank" href="https://forecast.weather.gov/MapClick.php?textField1=${city.lat}&textField2=${city.lon}">wx US <i class="fa-solid fa-arrow-up-right-from-square"></i></a>`;
    str += "</td></tr>";
  }
  str += "</tbody>";

  // Footer
  str += "<tfoot><tr><th></th>";
  for (const day of days) {
    const [iYear, iMonth, iDay] = day.split("-").map(Number);
    str += `<th>${formatHeaderDateString(new Date(iYear, iMonth - 1, iDay))}</th>`;
  }
  str += "<th></th></tr></tfoot>";

  str += "</table>";
  document.getElementById("results").innerHTML = str;
  generateShareableLink();
}

function formatHeaderDateString(date) {
  const weekdayOptions = { weekday: "short" };
  const monthOptions = { month: "short" };
  const dayOptions = { day: "numeric" };

  const weekdayFormatter = new Intl.DateTimeFormat('en-US', weekdayOptions);
  const monthFormatter = new Intl.DateTimeFormat('en-US', monthOptions);
  const dayFormatter = new Intl.DateTimeFormat('en-US', dayOptions);

  const weekday = weekdayFormatter.format(date);
  const month = monthFormatter.format(date);
  const day = dayFormatter.format(date);

  // return `<b>${weekday}</b> ${month} ${day}`;
  return `${weekday} <b>${month} ${day}</b>`;
}

// Helper function to format date as "Month Day"
function formatDate(dateString) {
  if (!dateString) return "";
  const date = new Date(dateString);
  const options = { month: 'short', day: 'numeric' };

  const strDate = date.toLocaleDateString('en-US', options);
  // console.log(strDate)
  return strDate;
}

async function loadCitiesFromURL() {
  const urlParams = new URLSearchParams(window.location.search);
  const jwt = urlParams.get('jwt');

  if (jwt) {
    try {
      // --- 1. Parse the JWT ---
      // console.log("JWT", jwt);
      const parsedJWT = KJUR.jws.JWS.parse(jwt);
      if (parsedJWT) {
        const payload = JSON.parse(parsedJWT.payloadPP);
        // console.log("payload", payload);

        // --- 2. Reconstruct the cities array ---
        const loadedCities = payload.map((item) => {
          const city = {
            name: item.n,
            lat: item.l,
            lon: item.o,
            from: item.f || "", // Use empty string if 'f' is not present
            to: item.t || "",   // Use empty string if 't' is not present
          };

          city.id = `${city.name}.${city.from}.${city.to}`;
          return city;
        });

        // --- 3. Update the cities array ---
        cities = loadedCities;

        // --- 4. Clear local storage ---
        localStorage.removeItem('cities');

        // --- 5. Fetch the new URLs ---
        await fetchUrls(); // Call fetchUrls() here

        // --- 6. Redraw the table ---
        drawTable();

        return true; // Indicate that cities were loaded
      } else {
        console.error("Error decoding or parsing JWT from URL: invalid JWT");
        return false;
      }
    } catch (error) {
      console.error("Error decoding or parsing JWT from URL:", error);
      return false;
    }
  }
  return false;
}

function editCity(p_id) {
  const city = cities.find((obj) => obj.id === p_id);
  if (city) {
    document.getElementById("editCityId").value = city.id;
    document.getElementById("editCityName").value = city.name;
    document.getElementById("editLat").value = city.lat;
    document.getElementById("editLon").value = city.lon;
    document.getElementById("editFrom").value = city.from;
    document.getElementById("editTo").value = city.to;
    editCityDialog.showModal();
  }
}

let map; // Global variable to hold the Leaflet map object
let mapFoundLatLng; // Global variable to hold selected lat/lng
let mapFoundCity;

function initializeMap() {
  // Initialize the map
  map = L.map('map').setView([0, 0], 2); // Start with a world view

  // Add OpenStreetMap tiles
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
  }).addTo(map);

  // Marker to show the selected location
  var marker = L.marker([0, 0]).addTo(map);
  marker.setOpacity(0); // Initially hidden

  var popup = L.popup();

  function onMapClick(e) {
    // Update the marker position
    marker.setLatLng(e.latlng);
    marker.setOpacity(1); // Show the marker
    marker.bindPopup("You clicked the map at " + e.latlng.toString()).openPopup();

    // Update the mapLocation div
    document.getElementById('mapLocation').textContent = "Selected: " + e.latlng.toString();
    document.getElementById('useMapLocation').disabled = false;

    mapFoundLatLng = e.latlng;

    // Get the nearest city (and handle the Promise)
    getNearestCity(e.latlng.lat, e.latlng.lng)
      .then((city) => {
        // // city will now hold the value returned by getNearestCity
        // if (city !== null) {
        //   document.getElementById('city').value = city;
        // }
      })
      .catch((error) => {
        // Handle errors from getNearestCity if needed
        console.error("Error in onMapClick after getNearestCity:", error);
        // Maybe set a default value or display an error message
        document.getElementById('city').value = "Error loading city";
      });
  }

  map.on('click', onMapClick);

  //set map to current location
  map.locate({ setView: true, maxZoom: 10 });

  //event on success and failure
  function onLocationFound(e) {
    console.log("onLocationFound");
    var radius = e.accuracy;

    L.circle(e.latlng, radius).addTo(map);
  }

  function onLocationError(e) {
    alert(e.message);
  }

  map.on('locationfound', onLocationFound);
  map.on('locationerror', onLocationError);

  // Store the map object for later use
  // window.map = map;
}

function openMapDialog() {
  showMapSection();
}

async function getNearestCity(lat, lon) {
  try {
    const apiUrl = `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lon}`;
    const response = await fetch(apiUrl);

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();

    if (data.address) {
      const city = data.address.city || data.address.town || data.address.village || data.address.hamlet || "Unknown City";

      //set city in city search box
      // document.getElementById("city").value = city;

      // Update the mapLocation div to show the nearest city
      document.getElementById('mapLocation').textContent = `Selected: ${parseFloat(lat).toFixed(3)}, ${parseFloat(lon).toFixed(3)} (Nearest City: ${city})`;

      mapFoundCity = city;
      // console.log("CITY", city);

    } else {
      document.getElementById('mapLocation').textContent = `Selected: ${lat}, ${lon} (No city found)`;
      // console.log('No address information found.');
    }
  } catch (error) {
    console.error('Error fetching nearest city:', error);
    document.getElementById('mapLocation').textContent = `Selected: ${lat}, ${lon} (Error finding city)`;
  }
}

function generateShareableLink() {
  // --- 1. Prepare the payload ---
  // Create a compact payload with short property names and only necessary data
  const payload = cities.map((city) => ({
    n: city.name, // 'n' for name
    l: parseFloat(city.lat).toFixed(3), // 'l' for latitude (rounded to 4 places)
    o: parseFloat(city.lon).toFixed(3), // 'o' for longitude (rounded to 4 places)

    f: city.from, // 'f' for from (optional, will be removed if empty)
    t: city.to,   // 't' for to (optional, will be removed if empty)
  }));

  //remove empty strings.  
  for (let obj of payload) {
    if (obj.f == "") delete obj.f;
    if (obj.t == "") delete obj.t;
  }

  // --- 2. Create the JWT ---
  // Use the jsrsasign library to create the JWT
  const header = { alg: "none", typ: "JWT" }; // No signature for now
  const sHeader = JSON.stringify(header);
  const sPayload = JSON.stringify(payload);
  const jwt = KJUR.jws.JWS.sign(null, sHeader, sPayload); // Use null for no signature

  // --- 3. Construct the shareable URL ---
  const baseURL = window.location.origin + window.location.pathname;
  const shareableURL = `${baseURL}?jwt=${jwt}`; // Use 'jwt' as the query parameter

  // --- 4. Display the URL ---
  document.getElementById("shareableLink").value = shareableURL;

  // --- 5. Update the share button ---
  document.getElementById("shareButton").setAttribute("data-url", shareableURL);
}

function copyToClipboard() {
  const copyText = document.getElementById("shareableLink");
  if (copyText.value == "") {
    return;
  }
  navigator.clipboard.writeText(copyText.value);
}

async function shareLink() {
  const shareableLink = document.getElementById("shareableLink").value;

  if (!shareableLink) {
    console.error("No link to share.");
    return;
  }

  if (navigator.share) {
    try {
      await navigator.share({
        title: "Check out these weather destinations!", // Customizable title
        url: shareableLink,
      });
      console.log("Successfully shared.");
    } catch (error) {
      console.error("Error sharing:", error);
      // Fallback: copy to clipboard if sharing fails
      navigator.clipboard.writeText(shareableLink);
      alert("Sharing failed. Link copied to clipboard instead.");
    }
  } else {
    // Fallback: copy to clipboard if sharing is not supported
    navigator.clipboard.writeText(shareableLink);
    alert("Sharing not supported. Link copied to clipboard instead.");
  }
}

function clearAll() {
  cities = [];
  saveToLocalStorage();
  fetchAndDraw();
  generateShareableLink();
}

function toggleLowlight() {
  // get all lowlight days
  const lowlightDays = document.querySelectorAll(".lowlightDay");

  // loop through each one and add or remove the class
  lowlightDays.forEach((day) => {
    day.classList.toggle("lowlightHide");
  });
  generateShareableLink();
}

function showMainSection() {
  document.getElementById('mainSection').style.display = 'block';
  document.getElementById('searchSection').style.display = 'none';
  document.getElementById('mapSection').style.display = 'none';
  if (map) {
    map.invalidateSize();
  }
}

function showSearchSection() {
  search();
  document.getElementById('mainSection').style.display = 'none';
  document.getElementById('searchSection').style.display = 'block';
  document.getElementById('mapSection').style.display = 'none';
}

function showMapSection() {
  document.getElementById('mainSection').style.display = 'none';
  document.getElementById('searchSection').style.display = 'none';
  document.getElementById('mapSection').style.display = 'block';

  // Initialize or refresh map
  if (!map) {
    initializeMap();
  } else {
    map.invalidateSize();
  }
}

function addCityAndClose() {
  addCity();
  addCityDialog.close();
}

function useMapLocationAndReturn() {
  load(mapFoundCity || "", mapFoundLatLng.lat.toFixed(4), mapFoundLatLng.lng.toFixed(4));
  showMainSection();
}

