import { Map as MapLibreMap } from 'maplibre-gl';

/**
 * Style configuration interfaces
 */
export interface InterpolateStyleConfig {
  styleType: 'interpolate';
  geometryType: 'polygon' | 'line' | 'point';
  attribute: string;
  interpolation: 'linear' | 'exponential' | 'cubic-bezier';
  stops: Array<{ value: number; color: string }>;
  fillOpacity?: number;
  strokeColor?: string;
  strokeWidth?: number;
}

export interface CategoricalStyleConfig {
  styleType: 'categorical';
  geometryType: 'polygon' | 'line' | 'point';
  attribute: string;
  categories: Array<{ value: string; color: string }>;
  defaultColor: string;
  fillOpacity?: number;
  strokeColor?: string;
  strokeWidth?: number;
}

export interface SimpleStyleConfig {
  styleType: 'simple';
  geometryType: 'polygon' | 'line' | 'point';
  attribute?: string;
  fillColor?: string;
  fillOpacity?: number;
  lineColor?: string;
  lineWidth?: number;
  lineOpacity?: number;
  strokeColor?: string;
  strokeWidth?: number;
}

export interface AttributeColorStyleConfig {
  styleType: 'attributeColor';
  geometryType: 'line' | 'polygon';
  colorAttribute: string;
  labelAttribute?: string;
  lineWidth?: number;
  lineOpacity?: number;
  fillOpacity?: number;
}

export type StyleConfig =
  | InterpolateStyleConfig
  | CategoricalStyleConfig
  | SimpleStyleConfig
  | AttributeColorStyleConfig;

/**
 * LayerStyleParser - Dynamically applies MapLibre styles based on configuration
 */
export class LayerStyleParser {
  /**
   * Apply style configuration to a map layer
   * @param map - MapLibre map instance
   * @param layerId - Numeric layer ID
   * @param sourceId - Source ID for the layer
   * @param styleConfig - Style configuration object
   * @returns true if style was applied successfully
   */
  static applyStyle(
    map: MapLibreMap,
    layerId: number,
    sourceId: string,
    styleConfig: StyleConfig
  ): boolean {
    try {
      switch (styleConfig.styleType) {
        case 'interpolate':
          this.applyInterpolateStyle(map, layerId, sourceId, styleConfig);
          return true;

        case 'categorical':
          this.applyCategoricalStyle(map, layerId, sourceId, styleConfig);
          return true;

        case 'simple':
          this.applySimpleStyle(map, layerId, sourceId, styleConfig);
          return true;

        case 'attributeColor':
          this.applyAttributeColorStyle(map, layerId, sourceId, styleConfig);
          return true;

        default:
          console.warn('Unknown style type:', (styleConfig as any).styleType);
          return false;
      }
    } catch (error) {
      console.error('Failed to apply style:', error);
      return false;
    }
  }

  /**
   * Apply interpolated color style (for numeric attributes)
   */
  private static applyInterpolateStyle(
    map: MapLibreMap,
    layerId: number,
    sourceId: string,
    config: InterpolateStyleConfig
  ): void {
    // Build interpolation expression
    const colorExpression: any[] = [
      'interpolate',
      ['linear'],
      ['get', config.attribute]
    ];

    // Add stops
    config.stops.forEach(stop => {
      colorExpression.push(stop.value, stop.color);
    });

    if (config.geometryType === 'polygon') {
      // Add fill layer
      map.addLayer({
        id: `layer-${layerId}-fill`,
        type: 'fill',
        source: sourceId,
        paint: {
          'fill-color': colorExpression as any,
          'fill-opacity': config.fillOpacity ?? 0.6
        }
      });

      // Add stroke layer
      if (config.strokeColor) {
        map.addLayer({
          id: `layer-${layerId}-stroke`,
          type: 'line',
          source: sourceId,
          paint: {
            'line-color': config.strokeColor,
            'line-width': config.strokeWidth ?? 1
          }
        });
      }
    } else if (config.geometryType === 'line') {
      map.addLayer({
        id: `layer-${layerId}-line`,
        type: 'line',
        source: sourceId,
        paint: {
          'line-color': colorExpression as any,
          'line-width': config.strokeWidth ?? 2
        }
      });
    }
  }

  /**
   * Apply categorical/match style (for string attributes)
   */
  private static applyCategoricalStyle(
    map: MapLibreMap,
    layerId: number,
    sourceId: string,
    config: CategoricalStyleConfig
  ): void {
    // Build match expression
    const matchExpression: any[] = [
      'match',
      ['get', config.attribute]
    ];

    // Add categories
    config.categories.forEach(category => {
      matchExpression.push(category.value, category.color);
    });

    // Add default color
    matchExpression.push(config.defaultColor);

    if (config.geometryType === 'polygon') {
      // Add fill layer
      map.addLayer({
        id: `layer-${layerId}-fill`,
        type: 'fill',
        source: sourceId,
        paint: {
          'fill-color': matchExpression as any,
          'fill-opacity': config.fillOpacity ?? 0.6
        }
      });

      // Add stroke layer
      if (config.strokeColor) {
        map.addLayer({
          id: `layer-${layerId}-stroke`,
          type: 'line',
          source: sourceId,
          paint: {
            'line-color': config.strokeColor,
            'line-width': config.strokeWidth ?? 1
          }
        });
      }
    } else if (config.geometryType === 'line') {
      map.addLayer({
        id: `layer-${layerId}-line`,
        type: 'line',
        source: sourceId,
        paint: {
          'line-color': matchExpression as any,
          'line-width': config.strokeWidth ?? 2
        }
      });
    }
  }

  /**
   * Apply simple/static style (single color)
   */
  private static applySimpleStyle(
    map: MapLibreMap,
    layerId: number,
    sourceId: string,
    config: SimpleStyleConfig
  ): void {
    if (config.geometryType === 'polygon') {
      if (config.fillColor) {
        map.addLayer({
          id: `layer-${layerId}-fill`,
          type: 'fill',
          source: sourceId,
          paint: {
            'fill-color': config.fillColor,
            'fill-opacity': config.fillOpacity ?? 0.5
          }
        });
      }

      if (config.strokeColor) {
        map.addLayer({
          id: `layer-${layerId}-stroke`,
          type: 'line',
          source: sourceId,
          paint: {
            'line-color': config.strokeColor,
            'line-width': config.strokeWidth ?? 1
          }
        });
      }
    } else if (config.geometryType === 'line') {
      map.addLayer({
        id: `layer-${layerId}-line`,
        type: 'line',
        source: sourceId,
        paint: {
          'line-color': config.lineColor ?? '#3498db',
          'line-width': config.lineWidth ?? 2,
          'line-opacity': config.lineOpacity ?? 1
        }
      });
    } else if (config.geometryType === 'point') {
      map.addLayer({
        id: `layer-${layerId}-point`,
        type: 'circle',
        source: sourceId,
        paint: {
          'circle-color': config.fillColor ?? '#3498db',
          'circle-radius': 6,
          'circle-stroke-width': 2,
          'circle-stroke-color': config.strokeColor ?? '#fff'
        }
      });
    }
  }

  /**
   * Apply attribute-based color style (color from feature properties)
   */
  private static applyAttributeColorStyle(
    map: MapLibreMap,
    layerId: number,
    sourceId: string,
    config: AttributeColorStyleConfig
  ): void {
    if (config.geometryType === 'line') {
      map.addLayer({
        id: `layer-${layerId}-line`,
        type: 'line',
        source: sourceId,
        paint: {
          'line-color': ['get', config.colorAttribute],
          'line-width': config.lineWidth ?? 3,
          'line-opacity': config.lineOpacity ?? 1
        }
      });
    } else if (config.geometryType === 'polygon') {
      map.addLayer({
        id: `layer-${layerId}-fill`,
        type: 'fill',
        source: sourceId,
        paint: {
          'fill-color': ['get', config.colorAttribute],
          'fill-opacity': config.fillOpacity ?? 0.6
        }
      });
    }
  }

  /**
   * Apply generic fallback style based on geometry type
   */
  static applyGenericStyle(
    map: MapLibreMap,
    layerId: number,
    sourceId: string,
    geometryType: string,
    color: string
  ): void {
    switch (geometryType) {
      case 'Point':
      case 'MultiPoint':
        map.addLayer({
          id: `layer-${layerId}-point`,
          type: 'circle',
          source: sourceId,
          paint: {
            'circle-radius': 6,
            'circle-color': color,
            'circle-stroke-width': 2,
            'circle-stroke-color': '#fff'
          }
        });
        break;

      case 'LineString':
      case 'MultiLineString':
        map.addLayer({
          id: `layer-${layerId}-line`,
          type: 'line',
          source: sourceId,
          paint: {
            'line-color': color,
            'line-width': 2
          }
        });
        break;

      case 'Polygon':
      case 'MultiPolygon':
        map.addLayer({
          id: `layer-${layerId}-fill`,
          type: 'fill',
          source: sourceId,
          paint: {
            'fill-color': color,
            'fill-opacity': 0.5
          }
        });

        map.addLayer({
          id: `layer-${layerId}-stroke`,
          type: 'line',
          source: sourceId,
          paint: {
            'line-color': color,
            'line-width': 2
          }
        });
        break;

      default:
        console.warn(`Unsupported geometry type: ${geometryType}`);
        map.addLayer({
          id: `layer-${layerId}-line`,
          type: 'line',
          source: sourceId,
          paint: {
            'line-color': color,
            'line-width': 2
          }
        });
    }
  }
}
