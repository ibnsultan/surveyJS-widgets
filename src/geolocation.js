/**
 * 
 * Plugin Name: GeoLocation
 * Version: 1.0.0
 * Description: A SurveyJS custom widget for capturing geospatial data in multiple formats (current location, manual point, trace/path, and area/polygon) using Leaflet maps with native Leaflet.draw controls.
 * Author: Abdulbasit Rubeya <github.com/ibnsultan>
 * Last update: March 2026
 * 
 * Dependencies:
 * - Leaflet (required)
 * - Leaflet.draw (required for drawing controls)
 * - Leaflet.Control.Geocoder (optional for enhanced location search)
 * 
 * Include in your HTML:
 * <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
 * <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/leaflet.draw/1.0.4/leaflet.draw.css" />
 * <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
 * <script src="https://cdnjs.cloudflare.com/ajax/libs/leaflet.draw/1.0.4/leaflet.draw.js"></script>
 * <script src="https://unpkg.com/leaflet-control-geocoder/dist/Control.Geocoder.js"></script> <!-- Optional -->
 */

function init(Survey) {
  const componentName = "geolocation";
  const iconId = "icon-geolocation";
  
  // Register custom icon
  Survey.SvgRegistry && Survey.SvgRegistry.registerIconFromSvg(
    iconId, 
    '<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/></svg>', 
    ""
  );

  var widget = {
    name: componentName,
    title: "Geo Location",
    iconName: iconId,
    widgetIsLoaded: function () {
      return typeof window !== "undefined" && typeof L !== "undefined";
    },
    isFit: function (question) {
      return question.getType() === componentName;
    },
    htmlTemplate: "<div class='sv-geolocation-container'></div>",
    
    activatedByChanged: function (activatedBy) {
      Survey.Serializer.addClass(
        componentName,
        [],
        null,
        "empty"
      );
      
      let registerQuestion = Survey.ElementFactory.Instance.registerCustomQuestion;
      if (!!registerQuestion) registerQuestion(componentName);
      
      Survey.Serializer.addProperties(componentName, [
        {
          name: "mode",
          category: "general",
          default: "location",
          choices: ["location", "path", "shape", "multigeometry"],
          displayName: "Capture Mode",
        },
        {
          name: "shapeType",
          category: "general",
          default: "polygon",
          choices: ["polygon", "circle", "rectangle", "circlemarker"],
          visibleIf: function (obj) {
            return obj.mode === "shape";
          },
          displayName: "Shape Type",
        },
        {
          name: "enableAutomaticLocation",
          category: "general",
          default: true,
          type: "boolean",
          visibleIf: function (obj) {
            return obj.mode === "location";
          },
          displayName: "Enable Automatic Location",
        },
        {
          name: "enableManualPoint",
          category: "general",
          default: true,
          type: "boolean",
          visibleIf: function (obj) {
            return obj.mode === "location";
          },
          displayName: "Enable Manual Point",
        },
        {
          name: "enableLocationSearch",
          category: "general",
          default: true,
          type: "boolean",
          visibleIf: function (obj) {
            return obj.mode === "location";
          },
          displayName: "Enable Location Search",
        },
        {
          name: "enableManualTrace",
          category: "general",
          default: true,
          type: "boolean",
          visibleIf: function (obj) {
            return obj.mode === "path";
          },
          displayName: "Enable Manual Trace",
        },
        {
          name: "enableAutomaticTrace",
          category: "general",
          default: false,
          type: "boolean",
          visibleIf: function (obj) {
            return obj.mode === "path";
          },
          displayName: "Enable Automatic Trace",
        },
        {
          name: "allowedShapes:itemvalues",
          category: "general",
          default: ["marker", "polyline", "polygon", "circle", "rectangle", "circlemarker"],
          visibleIf: function (obj) {
            return obj.mode === "multigeometry";
          },
          displayName: "Allowed Shapes",
        },
        {
          name: "defaultZoom:number",
          category: "map",
          default: 13,
          displayName: "Default Zoom Level",
        },
        {
          name: "defaultLatitude:number",
          category: "map",
          default: 0,
          displayName: "Default Latitude",
        },
        {
          name: "defaultLongitude:number",
          category: "map",
          default: 0,
          displayName: "Default Longitude",
        },
        {
          name: "mapHeight:number",
          category: "map",
          default: 400,
          displayName: "Map Height (px)",
        },
        {
          name: "tileLayerUrl",
          category: "map",
          default: "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
          displayName: "Tile Layer URL",
        },
        {
          name: "tileLayerAttribution",
          category: "map",
          default: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
          displayName: "Tile Layer Attribution",
        },
      ]);
    },
    
    afterRender: function (question, el) {
      const container = el;
      container.style.width = "100%";
      container.style.height = question.mapHeight + "px";
      
      // Create map container
      const mapContainer = document.createElement("div");
      mapContainer.className = "sv-geolocation-map";
      mapContainer.style.width = "100%";
      mapContainer.style.height = "100%";
      mapContainer.style.position = "relative";
      container.appendChild(mapContainer);
      
      // Initialize map
      const map = L.map(mapContainer).setView(
        [question.defaultLatitude, question.defaultLongitude],
        question.defaultZoom
      );
      
      // Add tile layer
      L.tileLayer(question.tileLayerUrl, {
        attribution: question.tileLayerAttribution,
        maxZoom: 19,
      }).addTo(map);
      
      // Try to get current location and center map
      if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
          (position) => {
            const lat = position.coords.latitude;
            const lng = position.coords.longitude;
            map.setView([lat, lng], question.defaultZoom);
          },
          (error) => {
            console.log("Could not get current location:", error.message);
          },
          { timeout: 5000 }
        );
      }
      
      // Storage for drawn items (FeatureGroup for Leaflet.draw)
      const drawnItems = new L.FeatureGroup();
      map.addLayer(drawnItems);
      
      // Check if Leaflet.draw is available
      const hasLeafletDraw = typeof L.Control.Draw !== "undefined";
      
      // Question state
      let isTracking = false;
      let watchId = null;
      let trackingPolyline = null;
      
      // Helper: Update question value from drawn items
      const updateValue = () => {
        let value = null;
        const layers = drawnItems.getLayers();
        
        if (layers.length === 0) {
          question.value = null;
          return;
        }
        
        if (question.mode === "location" && layers.length === 1) {
          // Location mode: single point only
          value = layerToGeoJSON(layers[0]);
        } else if (layers.length === 1) {
          // Single item in other modes
          value = layerToGeoJSON(layers[0]);
        } else if (layers.length > 1) {
          // Multiple items: return as GeometryCollection
          const geometries = layers.map(layer => layerToGeoJSON(layer));
          value = {
            type: "GeometryCollection",
            geometries: geometries,
          };
        }
        
        question.value = value;
      };
      
      // Helper: Convert Leaflet layer to GeoJSON
      const layerToGeoJSON = (layer) => {
        if (layer instanceof L.Marker) {
          const latLng = layer.getLatLng();
          return {
            type: "Point",
            coordinates: [latLng.lng, latLng.lat],
          };
        } else if (layer instanceof L.Circle) {
          const latLng = layer.getLatLng();
          return {
            type: "Point",
            coordinates: [latLng.lng, latLng.lat],
            properties: {
              radius: layer.getRadius(),
              shapeType: "circle",
            },
          };
        } else if (layer instanceof L.CircleMarker) {
          const latLng = layer.getLatLng();
          return {
            type: "Point",
            coordinates: [latLng.lng, latLng.lat],
            properties: {
              radius: layer.getRadius(),
              shapeType: "circlemarker",
            },
          };
        } else if (layer instanceof L.Polyline && !(layer instanceof L.Polygon)) {
          const latLngs = layer.getLatLngs();
          return {
            type: "LineString",
            coordinates: latLngs.map(ll => [ll.lng, ll.lat]),
          };
        } else if (layer instanceof L.Rectangle || layer instanceof L.Polygon) {
          const latLngs = Array.isArray(layer.getLatLngs()[0]) ? layer.getLatLngs()[0] : layer.getLatLngs();
          const coordinates = latLngs.map(ll => [ll.lng, ll.lat]);
          coordinates.push(coordinates[0]); // Close the polygon
          return {
            type: "Polygon",
            coordinates: [coordinates],
            properties: {
              shapeType: layer instanceof L.Rectangle ? "rectangle" : "polygon",
            },
          };
        }
        return null;
      };
      
      // Helper: Stop GPS tracking
      const stopTracking = () => {
        if (watchId !== null) {
          navigator.geolocation.clearWatch(watchId);
          watchId = null;
        }
        if (trackingPolyline) {
          trackingPolyline = null;
        }
        isTracking = false;
      };
      
      // Use Leaflet.draw if available
      if (hasLeafletDraw) {
        // Handle draw events
        map.on(L.Draw.Event.CREATED, function (event) {
          const layer = event.layer;
          
          // For location mode only, clear existing items first (single point)
          if (question.mode === "location") {
            drawnItems.clearLayers();
            stopTracking();
          }
          
          drawnItems.addLayer(layer);
          updateValue();
        });
        
        map.on(L.Draw.Event.EDITED, function (event) {
          updateValue();
        });
        
        map.on(L.Draw.Event.DELETED, function (event) {
          updateValue();
        });
      }
      
      // Add custom controls for features not in Leaflet.draw (will be managed by updateCustomControls)
      // Add geocoding search control (will be managed by updateSearchControl)
      
      // Load existing value
      if (question.value) {
        try {
          const value = question.value;
          
          if (value.type === "Point") {
            const [lng, lat] = value.coordinates;
            const marker = L.marker([lat, lng], { draggable: question.enableManualPoint });
            drawnItems.addLayer(marker);
            map.setView([lat, lng], question.defaultZoom);
            
            if (question.enableManualPoint) {
              marker.on("dragend", updateValue);
            }
          } else if (value.type === "LineString") {
            const latLngs = value.coordinates.map(([lng, lat]) => L.latLng(lat, lng));
            const polyline = L.polyline(latLngs, { color: "blue" });
            drawnItems.addLayer(polyline);
            map.fitBounds(polyline.getBounds());
          } else if (value.type === "Polygon") {
            const coords = value.coordinates[0].map(([lng, lat]) => L.latLng(lat, lng));
            const polygon = L.polygon(coords);
            drawnItems.addLayer(polygon);
            map.fitBounds(polygon.getBounds());
          } else if (value.type === "GeometryCollection") {
            value.geometries.forEach(geom => {
              if (geom.type === "Point") {
                const [lng, lat] = geom.coordinates;
                const layer = geom.properties && geom.properties.shapeType === "circle" ?
                  L.circle([lat, lng], { radius: geom.properties.radius }) :
                  L.marker([lat, lng]);
                drawnItems.addLayer(layer);
              } else if (geom.type === "LineString") {
                const coords = geom.coordinates.map(([lng, lat]) => L.latLng(lat, lng));
                const polyline = L.polyline(coords);
                drawnItems.addLayer(polyline);
              } else if (geom.type === "Polygon") {
                const coords = geom.coordinates[0].map(([lng, lat]) => L.latLng(lat, lng));
                const polygon = L.polygon(coords);
                drawnItems.addLayer(polygon);
              }
            });
            if (drawnItems.getLayers().length > 0) {
              map.fitBounds(drawnItems.getBounds());
            }
          }
        } catch (e) {
          console.error("Error loading geolocation value:", e);
        }
      }
      
      // Ensure map renders correctly
      setTimeout(() => {
        map.invalidateSize();
      }, 100);
      
      // Store map instance for cleanup
      question._leafletMap = map;
      question._leafletDrawControl = null;
      question._leafletCustomControls = null;
      question._leafletSearchControl = null;
      
      // Function to update draw control based on current settings
      const updateDrawControl = () => {
        if (!hasLeafletDraw) return;
        
        // Remove existing draw control
        if (question._leafletDrawControl) {
          map.removeControl(question._leafletDrawControl);
        }
        
        // Configure drawing options based on mode
        let drawOptions = {};
        
        if (question.mode === "location") {
          drawOptions = {
            draw: {
              marker: question.enableManualPoint,
              polyline: false,
              polygon: false,
              rectangle: false,
              circle: false,
              circlemarker: false,
            },
            edit: {
              featureGroup: drawnItems,
              remove: true,
            },
          };
        } else if (question.mode === "path") {
          drawOptions = {
            draw: {
              marker: false,
              polyline: question.enableManualTrace,
              polygon: false,
              rectangle: false,
              circle: false,
              circlemarker: false,
            },
            edit: {
              featureGroup: drawnItems,
              remove: true,
            },
          };
        } else if (question.mode === "shape") {
          const shapeType = question.shapeType || "polygon";
          drawOptions = {
            draw: {
              marker: false,
              polyline: false,
              polygon: shapeType === "polygon",
              rectangle: shapeType === "rectangle",
              circle: shapeType === "circle",
              circlemarker: shapeType === "circlemarker",
            },
            edit: {
              featureGroup: drawnItems,
              remove: true,
            },
          };
        } else if (question.mode === "multigeometry") {
          // Get allowed shapes - could be string array or itemvalues array
          let allowedShapes = question.allowedShapes || ["marker", "polyline", "polygon", "circle", "rectangle", "circlemarker"];
          
          // If allowedShapes contains objects (itemvalues), extract the values
          if (allowedShapes.length > 0 && typeof allowedShapes[0] === "object") {
            allowedShapes = allowedShapes.map(item => item.value || item);
          }
          
          drawOptions = {
            draw: {
              marker: allowedShapes.includes("marker") || allowedShapes.includes("point"),
              polyline: allowedShapes.includes("polyline") || allowedShapes.includes("path"),
              polygon: allowedShapes.includes("polygon"),
              rectangle: allowedShapes.includes("rectangle"),
              circle: allowedShapes.includes("circle"),
              circlemarker: allowedShapes.includes("circlemarker"),
            },
            edit: {
              featureGroup: drawnItems,
              remove: true,
            },
          };
        }
        
        // Add new draw control
        question._leafletDrawControl = new L.Control.Draw(drawOptions);
        map.addControl(question._leafletDrawControl);
      };
      
      // Function to update custom controls
      const updateCustomControls = () => {
        // Remove existing custom controls
        if (question._leafletCustomControls) {
          map.removeControl(question._leafletCustomControls);
          question._leafletCustomControls = null;
        }
        
        // Re-add custom controls
        const customControlsContainer = L.control({ position: 'topleft' });
        customControlsContainer.onAdd = function () {
          const div = L.DomUtil.create('div', 'leaflet-bar leaflet-control');
          div.style.backgroundColor = 'white';
          
          // Get current location button (for location mode)
          if (question.mode === "location" && question.enableAutomaticLocation) {
            const locateBtn = L.DomUtil.create('a', 'leaflet-control-locate', div);
            locateBtn.href = '#';
            locateBtn.title = 'Get Current Location';
            locateBtn.innerHTML = `<svg style="width: 20px; height: 20px; display: block;" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path d="M12 8c-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4-1.79-4-4-4zm8.94 3c-.46-4.17-3.77-7.48-7.94-7.94V1h-2v2.06C6.83 3.52 3.52 6.83 3.06 11H1v2h2.06c.46 4.17 3.77 7.48 7.94 7.94V23h2v-2.06c4.17-.46 7.48-3.77 7.94-7.94H23v-2h-2.06zM12 19c-3.87 0-7-3.13-7-7s3.13-7 7-7 7 3.13 7 7-3.13 7-7 7z" fill="#000"/></svg>`;
            
            L.DomEvent.on(locateBtn, 'click', function (e) {
              L.DomEvent.preventDefault(e);
              L.DomEvent.stopPropagation(e);
              
              if (navigator.geolocation) {
                navigator.geolocation.getCurrentPosition(
                  (position) => {
                    const lat = position.coords.latitude;
                    const lng = position.coords.longitude;
                    
                    drawnItems.clearLayers();
                    stopTracking();
                    
                    const marker = L.marker([lat, lng], { draggable: question.enableManualPoint });
                    drawnItems.addLayer(marker);
                    map.setView([lat, lng], 15);
                    
                    if (question.enableManualPoint) {
                      marker.on('dragend', updateValue);
                    }
                    
                    updateValue();
                  },
                  (error) => {
                    alert("Error getting location: " + error.message);
                  }
                );
              } else {
                alert("Geolocation is not supported by this browser.");
              }
            });
          }
          
          // Start/Stop tracking button (for path mode with automatic trace)
          if (question.mode === "path" && question.enableAutomaticTrace) {
            const trackBtn = L.DomUtil.create('a', 'leaflet-control-track', div);
            trackBtn.href = '#';
            trackBtn.title = 'Start Tracking';
            trackBtn.innerHTML = `<svg style="width: 20px; height: 20px; display: block;" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path d="M13.5 5.5c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2zM9.8 8.9L7 23h2.1l1.8-8 2.1 2v6h2v-7.5l-2.1-2 .6-3C14.8 12 16.8 13 19 13v-2c-1.9 0-3.5-1-4.3-2.4l-1-1.6c-.4-.6-1-1-1.7-1-.3 0-.5.1-.8.1L6 8.3V13h2V9.6l1.8-.7" fill="#000"/></svg>`;
            
            L.DomEvent.on(trackBtn, 'click', function (e) {
              L.DomEvent.preventDefault(e);
              L.DomEvent.stopPropagation(e);
              
              if (!isTracking) {
                if (navigator.geolocation) {
                  drawnItems.clearLayers();
                  isTracking = true;
                  trackBtn.title = "Stop Tracking";
                  trackBtn.innerHTML = `<svg style="width: 20px; height: 20px; display: block;" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><rect x="6" y="6" width="12" height="12" fill="#000"/></svg>`;
                  
                  const pathCoords = [];
                  trackingPolyline = L.polyline(pathCoords, { color: 'red' });
                  drawnItems.addLayer(trackingPolyline);
                  
                  watchId = navigator.geolocation.watchPosition(
                    (position) => {
                      const lat = position.coords.latitude;
                      const lng = position.coords.longitude;
                      pathCoords.push([lat, lng]);
                      trackingPolyline.setLatLngs(pathCoords);
                      map.setView([lat, lng], map.getZoom());
                      updateValue();
                    },
                    (error) => {
                      alert("Error tracking location: " + error.message);
                      stopTracking();
                      trackBtn.title = "Start Tracking";
                      trackBtn.innerHTML = `<svg style="width: 20px; height: 20px; display: block;" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path d="M13.5 5.5c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2zM9.8 8.9L7 23h2.1l1.8-8 2.1 2v6h2v-7.5l-2.1-2 .6-3C14.8 12 16.8 13 19 13v-2c-1.9 0-3.5-1-4.3-2.4l-1-1.6c-.4-.6-1-1-1.7-1-.3 0-.5.1-.8.1L6 8.3V13h2V9.6l1.8-.7" fill="#000"/></svg>`;
                    },
                    { enableHighAccuracy: true, maximumAge: 0 }
                  );
                } else {
                  alert("Geolocation is not supported by this browser.");
                }
              } else {
                stopTracking();
                isTracking = false;
                trackBtn.title = "Start Tracking";
                trackBtn.innerHTML = `<svg style="width: 20px; height: 20px; display: block;" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path d="M13.5 5.5c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2zM9.8 8.9L7 23h2.1l1.8-8 2.1 2v6h2v-7.5l-2.1-2 .6-3C14.8 12 16.8 13 19 13v-2c-1.9 0-3.5-1-4.3-2.4l-1-1.6c-.4-.6-1-1-1.7-1-.3 0-.5.1-.8.1L6 8.3V13h2V9.6l1.8-.7" fill="#000"/></svg>`;
              }
            });
          }
          
          return div;
        };
        
        // Only add if there are controls to show
        if ((question.mode === "location" && question.enableAutomaticLocation) ||
            (question.mode === "path" && question.enableAutomaticTrace)) {
          question._leafletCustomControls = customControlsContainer;
          customControlsContainer.addTo(map);
        }
      };
      
      // Function to update search control
      const updateSearchControl = () => {
        // Remove existing search control
        if (question._leafletSearchControl) {
          map.removeControl(question._leafletSearchControl);
          question._leafletSearchControl = null;
        }
        
        // Re-add search control if needed
        if (question.mode === "location" && question.enableLocationSearch) {
          if (typeof L.Control.Geocoder !== "undefined") {
            // Use Leaflet.Control.Geocoder if available
            const geocoder = L.Control.geocoder({
              defaultMarkGeocode: false,
            }).on('markgeocode', function(e) {
              const latlng = e.geocode.center;
              drawnItems.clearLayers();
              stopTracking();
              
              const marker = L.marker(latlng, { draggable: question.enableManualPoint });
              drawnItems.addLayer(marker);
              map.setView(latlng, 15);
              
              if (question.enableManualPoint) {
                marker.on('dragend', updateValue);
              }
              
              updateValue();
            });
            question._leafletSearchControl = geocoder;
            geocoder.addTo(map);
          } else {
            // Fallback: Create a simple search control using Nominatim
            const searchControl = L.control({ position: 'topright' });
            searchControl.onAdd = function () {
              const container = L.DomUtil.create('div', 'leaflet-bar leaflet-control leaflet-control-custom-search');
              container.style.backgroundColor = 'white';
              container.style.padding = '5px';
              container.style.display = 'flex';
              container.style.gap = '5px';
              
              const searchInput = L.DomUtil.create('input', '', container);
              searchInput.type = 'text';
              searchInput.placeholder = 'Search location...';
              searchInput.style.padding = '5px';
              searchInput.style.border = '1px solid #ccc';
              searchInput.style.borderRadius = '2px';
              
              const searchBtn = L.DomUtil.create('button', '', container);
              searchBtn.innerHTML = `<svg style="width: 20px; height: 20px;" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path d="M15.5 14h-.79l-.28-.27C15.41 12.59 16 11.11 16 9.5 16 5.91 13.09 3 9.5 3S3 5.91 3 9.5 5.91 16 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z" fill="#000"/></svg>`;
              searchBtn.style.padding = '5px';
              searchBtn.style.cursor = 'pointer';
              searchBtn.style.border = 'none';
              searchBtn.style.background = 'transparent';
              
              const doSearch = async () => {
                const query = searchInput.value.trim();
                if (!query) return;
                
                try {
                  searchBtn.disabled = true;
                  const response = await fetch(
                    `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}`
                  );
                  const results = await response.json();
                  
                  if (results && results.length > 0) {
                    const result = results[0];
                    const lat = parseFloat(result.lat);
                    const lng = parseFloat(result.lon);
                    
                    drawnItems.clearLayers();
                    stopTracking();
                    
                    const marker = L.marker([lat, lng], { draggable: question.enableManualPoint });
                    drawnItems.addLayer(marker);
                    map.setView([lat, lng], 15);
                    
                    if (question.enableManualPoint) {
                      marker.on('dragend', updateValue);
                    }
                    
                    updateValue();
                  } else {
                    alert("Location not found. Please try a different search term.");
                  }
                  
                  searchBtn.disabled = false;
                } catch (error) {
                  alert("Error searching location: " + error.message);
                  searchBtn.disabled = false;
                }
              };
              
              L.DomEvent.on(searchBtn, 'click', function (e) {
                L.DomEvent.preventDefault(e);
                L.DomEvent.stopPropagation(e);
                doSearch();
              });
              
              L.DomEvent.on(searchInput, 'keypress', function (e) {
                if (e.keyCode === 13) {
                  L.DomEvent.preventDefault(e);
                  doSearch();
                }
              });
              
              // Prevent map interactions when typing
              L.DomEvent.disableClickPropagation(container);
              L.DomEvent.disableScrollPropagation(container);
              
              return container;
            };
            question._leafletSearchControl = searchControl;
            searchControl.addTo(map);
          }
        }
      };
      
      // Initialize all controls
      if (hasLeafletDraw) {
        updateDrawControl();
      }
      updateCustomControls();
      updateSearchControl();
      
      // Listen for property changes to update map in real-time
      const propertyChangedHandler = (sender, options) => {
        if (options.name === "mode" || 
            options.name === "shapeType" || 
            options.name === "allowedShapes" ||
            options.name === "enableManualPoint" ||
            options.name === "enableManualTrace" ||
            options.name === "enableAutomaticLocation" ||
            options.name === "enableLocationSearch" ||
            options.name === "enableAutomaticTrace") {
          
          // Stop any active tracking
          stopTracking();
          
          // Update all controls based on new settings
          updateDrawControl();
          updateCustomControls();
          updateSearchControl();
        } else if (options.name === "mapHeight") {
          // Update container height
          container.style.height = question.mapHeight + "px";
          setTimeout(() => map.invalidateSize(), 100);
        }
      };
      
      question.onPropertyChanged.add(propertyChangedHandler);
      
      // Store handler reference for cleanup
      question._propertyChangedHandler = propertyChangedHandler;
    },
    
    willUnmount: function (question, el) {
      // Remove property change listener
      if (question._propertyChangedHandler) {
        question.onPropertyChanged.remove(question._propertyChangedHandler);
        question._propertyChangedHandler = null;
      }
      
      // Clean up map and controls
      if (question._leafletMap) {
        question._leafletMap.remove();
        question._leafletMap = null;
      }
      
      question._leafletDrawControl = null;
      question._leafletCustomControls = null;
      question._leafletSearchControl = null;
    },
  };

  Survey.CustomWidgetCollection.Instance.addCustomWidget(widget, "customtype");
}

if (typeof Survey !== "undefined") {
  init(Survey);
}

export default init;

