import * as L from 'leaflet'

declare module 'leaflet' {
  namespace Symbol {
    function arrowHead(options?: { pixelSize?: number; polygon?: boolean; pathOptions?: L.PathOptions }): L.Polyline
  }

  function polylineDecorator(
    polyline: L.Polyline,
    options?: { patterns: Array<{ offset?: number | string; repeat?: number | string; symbol?: any }> },
  ): L.Layer
}
