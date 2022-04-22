let map = new ol.Map({
  target: "map",
  view: new ol.View({
    center: [0, 0],
    zoom: 2,
  }),
});

// Defining layers and adding them to map
let osm = new ol.layer.Tile({
  source: new ol.source.OSM(),
  title: "osm",
  visible: false,
});
let watercolor = new ol.layer.Tile({
  source: new ol.source.XYZ({
    url: "https://stamen-tiles.a.ssl.fastly.net/watercolor/{z}/{x}/{y}.jpg",
  }),
  title: "watercolor",
  visible: false,
});
let dark = new ol.layer.Tile({
  source: new ol.source.XYZ({
    url: "https://tiles.stadiamaps.com/tiles/alidade_smooth_dark/{z}/{x}/{y}.png",
  }),
  title: "dark",
  visible: true,
});

let basemapGroup = new ol.layer.Group({
  layers: [osm, watercolor, dark],
});

map.addLayer(basemapGroup);

// Getting the list
let basemapElements = document.getElementById("whichLayer");

// Setting basemap to user's choice
basemapElements.addEventListener("change", function (e) {
  let layerTitle = e.target.value;
  basemapGroup.getLayers().forEach((basemap) => {
    let title = basemap.get("title");
    if (title === layerTitle) {
      basemap.setVisible(true);
    } else {
      basemap.setVisible(false);
    }
  });
});

// Adding location of Covid 19 from URL
let promise = fetch("https://corona.lmao.ninja/v2/countries");
promise
  .then(function (obj) {
    obj
      .json()
      .then((data) => {
        console.log(data[1]);
        let features = createFeatures(data);

        const source = new ol.source.Vector({
          features: features,
        });

        // Calculating maximum and minimum number of confirmed to apply suitable style
        const maxConfirmed = calcMaxConfirmed(features);
        const minConfirmed = calcMinConfirmed(features);

        const vectorLayer = new ol.layer.Vector({
          source: source,
          title: "covidLayer",
          style: (circle) => {
            let percent = calcPercent(circle, minConfirmed, maxConfirmed);
            return new ol.style.Style({
              image: new ol.style.Circle({
                radius: 10,
                fill: new ol.style.Fill({
                  color: `rgba(255,0,0, ${percent})`,
                }),
              }),
            });
          },
        });
        map.addLayer(vectorLayer);

        // Creating overlay
        let popup = new ol.Overlay({
          element: document.getElementById("popup"),
        });

        map.addOverlay(popup);

        const name = document.getElementById("name");
        const recovered = document.getElementById("recovered");
        const deaths = document.getElementById("deaths");
        const confirmed = document.getElementById("confirmed");
        const imageee = document.getElementById("countryLogo");

        map.on("click", (e) => {
          popup.setPosition(undefined);
          map.forEachFeatureAtPixel(e.pixel, function (feature) {
            popup.setPosition(e.coordinate);
            name.innerHTML = `Country: ${feature.get("countryName")}`;
            confirmed.innerHTML = `Confirmed: ${feature
              .get("confirmedNumbers")
              .toLocaleString()}`;
            deaths.innerHTML = `Deaths: ${feature
              .get("deadNumbers")
              .toLocaleString()}`;
            recovered.innerHTML = `Recovered: ${feature
              .get("recoveredNumbers")
              .toLocaleString()}`;
            imageee.src = feature.get("flag");
          });
        });

        // Left Panel
        const leftPanel = document.getElementById("leftPanel");
        fillLeftPanel(features, leftPanel);

        //footer
        counterAnimation(features);

        // Search bar
        const search = document.getElementById("search");
        const countries = document.getElementsByClassName("countries");
        search.addEventListener("keyup", (e) => {
          console.log(search.value);
          let filter = search.value.toUpperCase();
          for (let i = 0; i < countries.length; i++) {
            const country = countries[i];
            if (country.innerHTML.toUpperCase().indexOf(filter) > -1) {
              country.style.display = "";
            } else {
              country.style.display = "none";
            }
          }
        });
      })
      .catch(function (error) {
        console.log(error);
      });
  })
  .catch(function (error) {
    console.log(error);
  });

let createFeatures = (countries) => {
  let features = countries.map((countryObj) => {
    let lon = countryObj.countryInfo.long;
    let lat = countryObj.countryInfo.lat;
    let flag = countryObj.countryInfo.flag;
    let countryName = countryObj.country;
    let deadNumbers = countryObj.deaths;
    let recoveredNumbers = countryObj.recovered;
    let confirmedNumbers = countryObj.cases;

    let feature = new ol.Feature({
      geometry: new ol.geom.Point(
        ol.proj.transform([lon, lat], "EPSG:4326", "EPSG:3857")
      ),
      lon: lon,
      lat: lat,
      flag: flag,
      countryName: countryName,
      deadNumbers: deadNumbers,
      recoveredNumbers: recoveredNumbers,
      confirmedNumbers: confirmedNumbers,
    });
    return feature;
  });
  return features;
};

function centerMap(long, lat) {
  map
    .getView()
    .setCenter(ol.proj.transform([long, lat], "EPSG:4326", "EPSG:3857"));
  map.getView().setZoom(5);
}

function calcMaxConfirmed(features) {
  let maxConfirmed = 0;
  for (let i = 0; i < features.length; i++) {
    let confirmedNumbers = features[i].get("confirmedNumbers");
    if (confirmedNumbers > maxConfirmed) {
      maxConfirmed = confirmedNumbers;
    }
  }
  return maxConfirmed;
}

function calcMinConfirmed(features) {
  let minConfirmed = features[0].get("confirmedNumbers");
  for (let i = 0; i < features.length; i++) {
    let confirmedNumbers = features[i].get("confirmedNumbers");
    if (confirmedNumbers < minConfirmed) {
      minConfirmed = confirmedNumbers;
    }
  }
  return minConfirmed;
}

function calcPercent(circle, minConfirmed, maxConfirmed) {
  percent =
    (circle.get("confirmedNumbers") - minConfirmed) /
    (maxConfirmed - minConfirmed);
  if (percent > 0.75) {
    percent = 1;
  } else if (percent > 0.5) {
    percent = 0.75;
  } else if (percent > 0.25) {
    percent = 0.5;
  } else {
    percent = 0.25;
  }
  return percent;
}

function counterAnimation(features) {
  var countrecovered = 0;
  var countconfirmed = 0;
  var countdeaths = 0;
  const counters = document.getElementById("rec");
  const counters2 = document.getElementById("confirm");
  const counters3 = document.getElementById("death");
  // const speed = 1000;
  for (let i = 0; i < features.length; i++) {
    countrecovered += features[i].get("recoveredNumbers");
    countconfirmed += features[i].get("confirmedNumbers");
    countdeaths += features[i].get("deadNumbers");
  }
  const updateCounter = () => {
    const count = +counters.innerText;
    const count2 = +counters2.innerText;
    const count3 = +counters3.innerText;

    const increment = countrecovered / 2000; // faster
    const increment2 = countconfirmed / 2000; // slow
    const increment3 = countdeaths / 2000; // fastest

    if (count < countrecovered) {
      counters.innerText = Math.floor(count + increment);
      setTimeout(updateCounter, 1);
    } else {
      counters.innerText = countrecovered.toLocaleString();
    }

    if (count2 < countconfirmed) {
      counters2.innerText = Math.floor(count2 + increment2);
      setTimeout(updateCounter, 1);
    } else {
      counters2.innerText = countconfirmed.toLocaleString();
    }

    if (count3 < countdeaths) {
      counters3.innerText = Math.floor(count3 + increment3);
      setTimeout(updateCounter, 1);
    } else {
      counters3.innerText = countdeaths.toLocaleString();
    }
  };
  updateCounter();
}

function fillLeftPanel(features, leftPanel) {
  for (let i = 0; i < features.length; i++) {
    const element = document.createElement("div");
    const image = document.createElement("img");
    const deathPer = document.createElement("div");
    const recoveredPer = document.createElement("div");

    element.className = "countries";
    image.className = "imgcountries";
    deathPer.className = "countryDeath";
    image.src = features[i].get("flag");
    element.innerHTML = features[i].get("countryName");
    deathPer.innerHTML = `Deaths: ${(
      (features[i].get("deadNumbers") / features[i].get("confirmedNumbers")) *
      100
    ).toFixed(2)} %`;
    recoveredPer.innerHTML = `Recovered: ${(
      (features[i].get("recoveredNumbers") /
        features[i].get("confirmedNumbers")) *
      100
    ).toFixed(2)}`;

    leftPanel.appendChild(element);
    element.appendChild(image);
    element.appendChild(deathPer);
    element.appendChild(recoveredPer);

    // Adding event listener to zoom to the country on click
    element.addEventListener("click", (e) => {
      centerMap(features[i].get("lon"), features[i].get("lat"));
    });
  }
}
