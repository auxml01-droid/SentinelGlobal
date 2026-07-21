export enum MapLayer {
  EARTHQUAKES = 'earthquakes',
  VOLCANOES = 'volcanoes',
  FIRES = 'fires',
  STORMS = 'storms',
  FLOODS = 'floods',
  CONFLICTS = 'conflicts',
  MILITARY_ZONES = 'military_zones',
  ALERTS = 'alerts',
  SATELLITES = 'satellites',
  SHIPS = 'ships',
  AIRCRAFT = 'aircraft',
  HEALTH = 'health',
  NUCLEAR = 'nuclear',
}

export interface MapViewState {
  latitude: number;
  longitude: number;
  zoom: number;
  pitch: number;
  bearing: number;
}

export interface MapMarker {
  id: string;
  layer: MapLayer;
  lat: number;
  lng: number;
  title: string;
  description?: string;
  severity: number;
  color: string;
  size: 'small' | 'medium' | 'large';
  pulse: boolean;
  popup?: string;
}
