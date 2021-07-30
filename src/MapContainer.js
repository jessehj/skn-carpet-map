import React, { useCallback, useEffect, useRef, useState } from "react";
import { get } from "lodash";
import activeMarker from "./assets/ic_marker_active.png";
import inactiveMarker from "./assets/ic_marker_inactive.png";
import { useDebounce } from "./hooks/useDebounce";

const { kakao } = window;

const MapContainer = () => {
  const [map, setMap] = useState();
  const [location, setLocation] = useState({
    latitude: 35.489541,
    longitude: 129.4214483
  });
  const [mapCenter, setMapCenter] = useDebounce();
  const [message, setMessage] = useState("MESSAGE");
  const [event, setEvent] = useState();
  const [existMarkers, setExistMarkers] = useState();
  const selectedMarker = useRef();

  useEffect(() => {
    const container = document.getElementById("map");
    const { latitude, longitude } = location;
    const options = {
      center: new kakao.maps.LatLng(latitude, longitude),
      level: 8,
    };
    setMap(new kakao.maps.Map(container, options));

    postMessage(true, "map_load_complete");

    if (window.ReactNativeWebView) {
      // window.ReactNativeWebView.postMessage("from web -> map loaded");
      document.addEventListener("message", handleNativeEvent);
      window.addEventListener("message", handleNativeEvent);
    }

    return () => {
      document.removeEventListener("message", handleNativeEvent);
      window.removeEventListener("message", handleNativeEvent);
    };
  }, []);

  useEffect(() => {
    if (!!map) {
      kakao.maps.event.addListener(map, "click", (event) => {
        if (!!selectedMarker?.current) {
          selectedMarker?.current?.setImage(
            selectedMarker?.current?.normalImage
          );
        }
        postMessage(true, "on_map_click");
      });
      kakao.maps.event.addListener(map, "center_changed", (event) => {
        const latlng = map.getCenter();
        setMapCenter({
          latitude: latlng.getLat(),
          longitude: latlng.getLng(),
        });
      });
    }
  }, [map]);

  useEffect(() => {
    const geocoder = new kakao.maps.services.Geocoder();
    const coord = new kakao.maps.LatLng(location.latitude, location.longitude);
    const addressCallback = function(result, status) {
      if (status === kakao.maps.services.Status.OK) {
        postMessage(`${result[0].address.address_name}`, "fetch_get_direction");
      }
    };

    geocoder.coord2Address(coord.getLng(), coord.getLat(), addressCallback);
  }, [location])

  useEffect(() => {
    if (!!map && !!event) {
      const type = get(event, "type");

      switch (type) {
        case "move_to":
          const latitude = parseFloat(get(event, "payload.latitude"), 10);
          const longitude = parseFloat(get(event, "payload.longitude"), 10);
          // setMessage(`lat: ${latitude}, lng: ${longitude}`);
          const moveLatLng = new kakao.maps.LatLng(latitude, longitude);
          map.panTo(moveLatLng);
          break;
        case "render_repair_shop_marker":
          const repairShops = get(event, "payload.repairShops");
          postMessage(
            `* render repair shop marker: ${JSON.stringify(repairShops)}`
          );
          const markers = repairShops.map(createMarker);

          renderMarkers(markers);
          break;
        default:
          break;
      }
    }
  }, [map, event]);

  useEffect(() => {
    if (!!mapCenter) {
      postMessage(
        {
          latitude: get(mapCenter, "latitude"),
          longitude: get(mapCenter, "longitude"),
        },
        "current_map_center"
      );
    }
  }, [mapCenter]);

  const handleNativeEvent = useCallback((event) => {
    const dataString = get(event, "data");
    if (!!dataString) {
      const data = JSON.parse(get(event, "data"));
      setEvent(data);
    }
  }, []);

  const postMessage = (data, type = "message") => {
    const message = JSON.stringify({
      type,
      payload: {
        data,
      },
    });
    if (!!window.ReactNativeWebView) {
      window.ReactNativeWebView.postMessage(message);
    }
  };

  const renderMarkers = (markers) => {
    try {
      if (!!existMarkers) {
        existMarkers.map((exist) => {
          exist.setMap(null);
        });
      }
      if (!!markers) {
        const activeMarkerImage = createMarkerImage(false);
        markers.map((marker) => {
          marker.setMap(map);

          kakao.maps.event.addListener(marker, "click", () => {
            if (
              !selectedMarker?.current ||
              selectedMarker?.current !== marker
            ) {
              if (!!selectedMarker?.current) {
                selectedMarker?.current?.setImage(
                  selectedMarker?.current?.normalImage
                );
              }
              marker.setImage(activeMarkerImage);
              postMessage(marker.repairShop, "on_repair_shop_click");
            }
            selectedMarker.current = marker;
          });
        });

        setExistMarkers(markers);
      }
    } catch (e) {
      postMessage(e);
    }
  };

  const createMarker = (repairShop) => {
    const { latitude, longitude } = repairShop;
    postMessage(`* createMarker: lat: ${latitude} / lng: ${longitude}`);
    const position = new kakao.maps.LatLng(latitude, longitude);
    const image = createMarkerImage();
    const marker = new kakao.maps.Marker({
      position,
      image,
      clickable: true,
    });
    marker.normalImage = image;
    marker.repairShop = repairShop;
    return marker;
  };

  const createMarkerImage = (inactive = true) => {
    const size = new kakao.maps.Size(32, 32);
    const options = { offset: new kakao.maps.Point(16, 16) };
    return new kakao.maps.MarkerImage(
      inactive ? inactiveMarker : activeMarker,
      size,
      options
    );
  };

  return (
    <>
      <div
        id={"map"}
        style={{
          width: "100vw",
          height: "100vh",
          userSelect: "none",
        }}
      />
      <div
        style={{
          position: "absolute",
          zIndex: 1,
          bottom: 100,
        }}
      >
        <text
          style={{
            fontSize: 10,
            whiteSpace: "pre-wrap",
          }}
        >
          {message}
        </text>
      </div>
    </>
  );
};

export default MapContainer;
