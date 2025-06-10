/**
 * Plugin Name: Geospacial
 * Description: A SurveyJS custom widget for capturing geospatial data in multiple formats (current location, manual point, trace/path, and area/polygon) using Leaflet maps.
 * Author: Abdulbasit Rubeya <github.com/ibnsultan>
 * Last update: May 6, 2025
 * Dependencies: LeafletJS, LeafletJs.Draw
 */

function init(Survey) {
  const iconId = "icon-geopoint";
  const componentName = "geopoint";

  Survey.SvgRegistry && Survey.SvgRegistry.registerIconFromSvg(iconId, `<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24'><path d='M12 2C8.1 2 5 5.1 5 9c0 5.3 7 13 7 13s7-7.7 7-13c0-3.9-3.1-7-7-7zm0 9.5c-1.4 0-2.5-1.1-2.5-2.5S10.6 6.5 12 6.5s2.5 1.1 2.5 2.5S13.4 11.5 12 11.5z'/></svg>`, "");

  const widget = {
    name: componentName,
    title: "Geopoint",
    iconName: iconId,
    widgetIsLoaded: () => typeof L !== "undefined",
    isFit: question => question.getType() === componentName,

    htmlTemplate: "<div class='geopoint-widget' style='height: 300px; width: 100%;'></div>",

    activatedByChanged(activatedBy) {
      Survey.Serializer.addClass(componentName, [
        { name: "geoFormat", default: "current", category: "general", type: "dropdown", choices: [
                { value: "current", text: "Current Location" },
                { value: "manual", text: "Manual Point Selection" },
                { value: "trace", text: "Path tracing (Polyline)" },
                { value: "area", text: "Area Mapping (Polygon)" },
              //   { value: "both", text: "Tracing and Polygon" },
              //  { value: "full", text: "Full Geospatial Capture" }
            ]
        } // current | manual | trace | area
      ], null, "empty");
      let registerQuestion = Survey.ElementFactory.Instance.registerCustomQuestion;
      if (registerQuestion) registerQuestion(componentName);
    },

    afterRender(question, el) {
      const map = L.map(el).setView([0, 0], 2);
      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: '&copy; OpenStreetMap contributors'
      }).addTo(map);

      let drawnItems = new L.FeatureGroup();
      map.addLayer(drawnItems);

      let drawControl;
      const updateValue = geo => {
        question.value = geo;
      };

      const geoFormat = question.geoFormat || "current";
      if (geoFormat === "current") {
        navigator.geolocation.getCurrentPosition(pos => {
          const latlng = [pos.coords.latitude, pos.coords.longitude];
          L.marker(latlng).addTo(map);
          map.setView(latlng, 15);
          updateValue({ lat: latlng[0], lng: latlng[1] });
        }, err => alert("Unable to retrieve location"));

      } else if (geoFormat === "manual") {
        map.on("click", e => {
          drawnItems.clearLayers();
          L.marker(e.latlng).addTo(drawnItems);
          updateValue({ lat: e.latlng.lat, lng: e.latlng.lng });
        });

      } else if (geoFormat === "trace" || geoFormat === "area" || geoFormat === "both" || geoFormat === "full") {
        drawControl = new L.Control.Draw({
          edit: { featureGroup: drawnItems },
          draw: {
            polyline: geoFormat === "trace" || geoFormat === "both" || geoFormat === "full",
            polygon: geoFormat === "area" || geoFormat === "both" || geoFormat === "full",
            marker: geoFormat === "full",
            circle: false,
            rectangle: false,
            circlemarker: false
          }
        });
        map.addControl(drawControl);

        map.on(L.Draw.Event.CREATED, function (e) {
          drawnItems.clearLayers();
          drawnItems.addLayer(e.layer);
          let value;
          if (e.layer instanceof L.Marker) {
            const latlng = e.layer.getLatLng();
            value = { lat: latlng.lat, lng: latlng.lng };
          } else if (e.layer instanceof L.Polyline && !(e.layer instanceof L.Polygon)) {
            const latlngs = e.layer.getLatLngs();
            value = latlngs.map(pt => ({ lat: pt.lat, lng: pt.lng }));
          } else if (e.layer instanceof L.Polygon) {
            const latlngs = e.layer.getLatLngs();
            value = latlngs[0].map(pt => ({ lat: pt.lat, lng: pt.lng }));
          }
          updateValue(value);
        });
      }

      // Load saved value
      if (question.value) {
        if (geoFormat === "current" || geoFormat === "manual") {
          const { lat, lng } = question.value;
          if (lat != null && lng != null) {
            const marker = L.marker([lat, lng]).addTo(map);
            map.setView([lat, lng], 15);
          }
        } else if (geoFormat === "trace" && Array.isArray(question.value)) {
          const polyline = L.polyline(question.value.map(p => [p.lat, p.lng])).addTo(map);
          drawnItems.addLayer(polyline);
          map.fitBounds(polyline.getBounds());
        } else if (geoFormat === "area" && Array.isArray(question.value)) {
          const polygon = L.polygon(question.value.map(p => [p.lat, p.lng])).addTo(map);
          drawnItems.addLayer(polygon);
          map.fitBounds(polygon.getBounds());
        } else if (geoFormat === "both") {
          const trace = Array.isArray(question.value.trace) ? question.value.trace : [];
          const area = Array.isArray(question.value.area) ? question.value.area : [];

          const polyline = L.polyline(trace.map(p => [p.lat, p.lng])).addTo(map);
          const polygon = L.polygon(area.map(p => [p.lat, p.lng])).addTo(map);
          drawnItems.addLayer(polyline);
          drawnItems.addLayer(polygon);
          map.fitBounds(polyline.getBounds().extend(polygon.getBounds()));
        } else if (geoFormat === "full") {
          const { lat, lng, trace, area } = question.value;

          if (lat != null && lng != null) {
            const marker = L.marker([lat, lng]).addTo(map);
            drawnItems.addLayer(marker);

            const bounds = marker.getBounds();

            if (Array.isArray(trace)) {
              const polyline = L.polyline(trace.map(p => [p.lat, p.lng])).addTo(map);
              drawnItems.addLayer(polyline);
              bounds.extend(polyline.getBounds());
            }

            if (Array.isArray(area)) {
              const polygon = L.polygon(area.map(p => [p.lat, p.lng])).addTo(map);
              drawnItems.addLayer(polygon);
              bounds.extend(polygon.getBounds());
            }

            map.fitBounds(bounds);
          }
        }
      }


      question.valueChangedCallback = () => {};
    },

    willUnmount(question, el) {
      if (el && el._leaflet_id) {
        el._leaflet_map && el._leaflet_map.remove();
      }
    }
  };

  Survey.CustomWidgetCollection.Instance.addCustomWidget(widget, "customtype");

}

if (typeof Survey !== "undefined") {
  init(Survey);
}

export default init;
